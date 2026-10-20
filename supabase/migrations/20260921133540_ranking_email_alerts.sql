-- ============================================================
-- TRUCAZO — Alertas por movimientos del top 3 online
--
-- Mantiene una foto privada del podio, detecta cambios al cerrar la
-- transacción y encola un único correo por jugador cada 24 horas. La foto se
-- inicializa antes de crear el trigger para no notificar el ranking histórico.
-- ============================================================

begin;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  elsif to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    raise exception 'Se requiere pg_net para las alertas inmediatas del ranking';
  end if;
end
$$;

create schema if not exists email_internal;
revoke all on schema email_internal from public, anon, authenticated;

-- La baja del ranking es independiente de novedades y reactivación.
alter table public.email_preferences
  add column ranking_enabled boolean not null default true;

create table public.ranking_email_campaign (
  id boolean primary key default true check (id),
  name text not null default 'Ranking' check (name = 'Ranking'),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ranking_email_campaign (id) values (true);

-- No lleva FK a profiles: si se elimina un perfil necesitamos conservar la
-- foto anterior hasta comparar el podio nuevo al final de la transacción.
create table public.ranking_top3_state (
  rank smallint primary key check (rank between 1 and 3),
  user_id uuid not null unique,
  updated_at timestamptz not null default now()
);

create table public.ranking_email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_rank smallint check (old_rank between 1 and 3),
  new_rank smallint check (new_rank between 1 and 3),
  passed_by_username text,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_id text,
  triggered_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz not null default '-infinity',
  completed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  last_request_id bigint,
  constraint ranking_email_job_movement_check check (
    (old_rank is not null or new_rank is not null)
    and old_rank is distinct from new_rank
  )
);

create index ranking_email_jobs_pending_idx
  on public.ranking_email_jobs (next_attempt_at)
  where completed_at is null;
create index ranking_email_jobs_user_time_idx
  on public.ranking_email_jobs (user_id, triggered_at desc);
create unique index ranking_email_jobs_one_unfinished_per_user_idx
  on public.ranking_email_jobs (user_id)
  where completed_at is null;

alter table public.ranking_email_campaign enable row level security;
alter table public.ranking_top3_state enable row level security;
alter table public.ranking_email_jobs enable row level security;

revoke all on public.ranking_email_campaign from public, anon, authenticated;
revoke all on public.ranking_top3_state from public, anon, authenticated;
revoke all on public.ranking_email_jobs from public, anon, authenticated;
grant select, update on public.ranking_email_campaign to service_role;
grant select on public.ranking_top3_state to service_role;
grant select, update on public.ranking_email_jobs to service_role;

-- Foto inicial: instalar la campaña no manda correos a quienes ya están en el
-- podio. El mismo desempate se usa en /ranking y en cada comparación futura.
insert into public.ranking_top3_state (rank, user_id)
select (row_number() over (
    order by p.games_won desc, p.games_played asc, p.id asc
  ))::smallint,
  p.id
from public.profiles p
where not p.is_bot and p.games_won > 0
order by p.games_won desc, p.games_played asc, p.id asc
limit 3;

create function email_internal.dispatch_ranking_emails(p_job_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  job record;
begin
  if not exists (
    select 1 from public.ranking_email_campaign where id and is_active
  ) then
    return;
  end if;

  for job in
    select j.id, j.token
    from public.ranking_email_jobs j
    where j.completed_at is null
      and j.status in ('pending', 'failed', 'sending')
      and (p_job_id is null or j.id = p_job_id)
      and j.next_attempt_at <= now()
      and j.locked_until <= now()
    order by j.triggered_at
    limit 10
    for update skip locked
  loop
    update public.ranking_email_jobs
    set
      last_request_id = net.http_post(
        url := 'https://www.trucazo.com.ar/api/email/ranking?id=' || job.id::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || job.token::text
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 65000
      ),
      next_attempt_at = now() + interval '2 minutes'
    where id = job.id;
  end loop;
end;
$$;

revoke all on function email_internal.dispatch_ranking_emails(uuid)
  from public, anon, authenticated;

create function email_internal.refresh_ranking_top3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_ids uuid[];
  new_ids uuid[];
  affected_user uuid;
  old_position integer;
  new_position integer;
  passed_by text;
  pending_job_id uuid;
  created_job_id uuid;
begin
  -- Serializa las comparaciones para que dos partidas simultáneas no lean la
  -- misma foto anterior ni dupliquen movimientos.
  perform pg_advisory_xact_lock(hashtextextended('trucazo:ranking-top3-email', 0));

  select coalesce(array_agg(s.user_id order by s.rank), array[]::uuid[])
  into old_ids
  from public.ranking_top3_state s;

  select coalesce(array_agg(r.id order by r.games_won desc, r.games_played asc, r.id asc), array[]::uuid[])
  into new_ids
  from (
    select p.id, p.games_won, p.games_played
    from public.profiles p
    where not p.is_bot and p.games_won > 0
    order by p.games_won desc, p.games_played asc, p.id asc
    limit 3
  ) r;

  if old_ids = new_ids then
    return null;
  end if;

  for affected_user in
    select distinct candidate.user_id
    from unnest(old_ids || new_ids) as candidate(user_id)
  loop
    old_position := array_position(old_ids, affected_user);
    new_position := array_position(new_ids, affected_user);
    if old_position is not distinct from new_position then
      continue;
    end if;

    passed_by := null;
    if old_position is not null
      and (new_position is null or new_position > old_position) then
      select p.username
      into passed_by
      from unnest(new_ids) with ordinality as candidate(user_id, new_rank)
      join public.profiles p on p.id = candidate.user_id
      where candidate.new_rank < coalesce(new_position, 4)
        and (
          array_position(old_ids, candidate.user_id) is null
          or array_position(old_ids, candidate.user_id) > old_position
        )
      order by candidate.new_rank
      limit 1;
    end if;

    if not exists (
      select 1 from public.ranking_email_campaign where id and is_active
    ) or not exists (
      select 1
      from public.email_preferences ep
      where ep.user_id = affected_user and ep.ranking_enabled
    ) then
      continue;
    end if;

    -- Un fallo pendiente conserva un solo trabajo y toma el movimiento más
    -- reciente. Si ya se está enviando, no se crea otro correo detrás suyo.
    select j.id
    into pending_job_id
    from public.ranking_email_jobs j
    where j.user_id = affected_user and j.completed_at is null
    order by j.triggered_at desc
    limit 1
    for update;

    if pending_job_id is not null then
      update public.ranking_email_jobs
      set
        old_rank = old_position,
        new_rank = new_position,
        passed_by_username = passed_by,
        token = gen_random_uuid(),
        status = 'pending',
        triggered_at = now(),
        next_attempt_at = now(),
        locked_until = '-infinity',
        last_error = null
      where id = pending_job_id and status in ('pending', 'failed');

      if found then
        begin
          perform email_internal.dispatch_ranking_emails(pending_job_id);
        exception when others then
          update public.ranking_email_jobs
          set last_error = 'Pendiente de reintento automático.'
          where id = pending_job_id;
        end;
      end if;
      continue;
    end if;

    -- El límite es por destinatario, no por puesto: ningún movimiento crea un
    -- segundo correo si ya tuvo otro aviso de ranking en las últimas 24 horas.
    if exists (
      select 1
      from public.ranking_email_jobs j
      where j.user_id = affected_user
        and coalesce(j.sent_at, j.completed_at, j.triggered_at) > now() - interval '24 hours'
    ) then
      continue;
    end if;

    insert into public.ranking_email_jobs (
      user_id, old_rank, new_rank, passed_by_username
    ) values (
      affected_user, old_position, new_position, passed_by
    )
    returning id into created_job_id;

    begin
      perform email_internal.dispatch_ranking_emails(created_job_id);
    exception when others then
      update public.ranking_email_jobs
      set last_error = 'Pendiente de reintento automático.'
      where id = created_job_id;
    end;
  end loop;

  delete from public.ranking_top3_state;
  insert into public.ranking_top3_state (rank, user_id)
  select candidate.rank::smallint, candidate.user_id
  from unnest(new_ids) with ordinality as candidate(user_id, rank);

  return null;
end;
$$;

revoke all on function email_internal.refresh_ranking_top3()
  from public, anon, authenticated;

create constraint trigger refresh_ranking_top3_after_stats
after update of games_won, games_played, is_bot on public.profiles
deferrable initially deferred
for each row
when (
  old.games_won is distinct from new.games_won
  or old.games_played is distinct from new.games_played
  or old.is_bot is distinct from new.is_bot
)
execute function email_internal.refresh_ranking_top3();

create constraint trigger refresh_ranking_top3_after_delete
after delete on public.profiles
deferrable initially deferred
for each row execute function email_internal.refresh_ranking_top3();

select cron.schedule(
  'trucazo-ranking-email-retry',
  '* * * * *',
  'select email_internal.dispatch_ranking_emails()'
);

commit;
