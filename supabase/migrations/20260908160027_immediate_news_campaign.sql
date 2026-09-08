-- Novedades: dispara al INSERT y continúa las tandas sin adelantar recordatorios.
begin;
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  elsif to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    raise exception 'Se requiere pg_net para el envío inmediato de novedades';
  end if;
end $$;
create schema if not exists email_internal;
revoke all on schema email_internal from public, anon, authenticated;

create table public.news_email_campaign (
  id boolean primary key default true check (id),
  name text not null default 'Novedades' check (name = 'Novedades'),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.news_email_campaign (id) values (true);
alter table public.news_email_campaign enable row level security;
revoke all on public.news_email_campaign from public, anon, authenticated;
grant select, update on public.news_email_campaign to service_role;

create table public.news_email_jobs (
  news_id uuid primary key references public.news(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz not null,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz not null default '-infinity',
  completed_at timestamptz,
  last_error text,
  last_request_id bigint
);
alter table public.news_email_jobs enable row level security;
revoke all on public.news_email_jobs from public, anon, authenticated;
grant select, update on public.news_email_jobs to service_role;
create index news_email_jobs_pending on public.news_email_jobs(next_attempt_at)
  where completed_at is null;

create function email_internal.dispatch_news_emails(p_news_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare job record;
begin
  if not exists (select 1 from public.news_email_campaign where id and is_active) then return; end if;
  for job in
    select j.news_id, j.token from public.news_email_jobs j
    join public.news n on n.id = j.news_id
    where j.completed_at is null and n.email_enabled
      and (p_news_id is null or j.news_id = p_news_id)
      and j.published_at <= now() and j.next_attempt_at <= now() and j.locked_until <= now()
    order by j.published_at limit 1 for update of j skip locked
  loop
    update public.news_email_jobs set
      last_request_id = net.http_post(
        url := 'https://www.trucazo.com.ar/api/email/news?id=' || job.news_id::text,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || job.token::text),
        body := '{}'::jsonb, timeout_milliseconds := 65000
      ),
      next_attempt_at = now() + interval '2 minutes'
    where news_id = job.news_id;
  end loop;
end;
$$;
revoke all on function email_internal.dispatch_news_emails(uuid) from public, anon, authenticated;

create function email_internal.queue_news_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_enabled and new.email_completed_at is null and exists (select 1 from public.news_email_campaign where id and is_active) then
    insert into public.news_email_jobs(news_id, title, body, published_at)
      values(new.id, new.title, new.body, new.created_at) on conflict (news_id) do nothing;
    -- HTTP starts only after commit. A network issue must never lose the publication.
    begin
      perform email_internal.dispatch_news_emails(new.id);
    exception when others then
      update public.news_email_jobs set last_error = 'Pendiente de reintento automático.' where news_id = new.id;
    end;
  end if;
  return new;
end;
$$;
revoke all on function email_internal.queue_news_email() from public, anon, authenticated;
create trigger queue_news_email after insert on public.news
  for each row execute function email_internal.queue_news_email();

-- Recupera la última novedad autorizada si todavía tiene envíos pendientes.
-- Nunca duplica publicaciones ni reactiva una novedad ya completada.
insert into public.news_email_jobs(news_id, title, body, published_at)
select id, title, body, created_at from (
  select * from public.news order by created_at desc limit 1
) latest where email_enabled and email_completed_at is null
on conflict (news_id) do nothing;

select cron.schedule('trucazo-news-email-retry', '* * * * *',
  'select email_internal.dispatch_news_emails()');
select email_internal.dispatch_news_emails();
commit;
