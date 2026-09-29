-- Reduce el pico de solicitudes de torneos y conserva los rechazos temporales.
begin;
alter table tournament_internal.email_settings
 add column if not exists next_dispatch_at timestamptz not null default '-infinity';

create or replace function tournament_internal.dispatch_emails() returns void
language plpgsql security definer set search_path = '' as $$
declare job record;
begin
 -- Una única tanda pequeña por minuto, incluso si dos despachos coinciden.
 update tournament_internal.email_settings set next_dispatch_at=now()+interval '1 minute'
  where singleton and enabled and next_dispatch_at<=now();
 if not found then return; end if;
 for job in select t.id,t.schedule_version,em.user_id from public.tournaments t
  join public.tournament_entry_members em on em.tournament_id=t.id and em.status='accepted'
  join public.tournament_entries e on e.id=em.entry_id and e.status='active'
  where t.status='published' and t.starts_at-interval '30 minutes'<=now()
    and t.starts_at>now()
 loop
  perform tournament_internal.notify(job.id,job.user_id,'checkin',
    job.id::text||':checkin:'||job.schedule_version||':'||job.user_id::text);
 end loop;
 for job in select j.id,j.token from public.tournament_email_jobs j
  join public.tournaments t on t.id=j.tournament_id
  where j.status in ('pending','failed','processing') and j.attempts<6
   and j.next_attempt_at<=now() and j.due_at<=now()
   and (j.job_type='cancelled' or (t.status<>'cancelled' and j.schedule_version=t.schedule_version))
  -- Un anuncio masivo nunca debe retrasar el aviso de un cruce de cinco minutos.
  order by case j.job_type when 'match' then 0 when 'checkin' then 1
    when 'cancelled' then 2 when 'rescheduled' then 2
    when 'registration' then 3 when 'reminder' then 4 else 5 end,
    j.due_at limit 5 for update of j skip locked
 loop
  perform net.http_post(url:='https://www.trucazo.com.ar/api/email/tournament?id='||job.id::text,
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||job.token::text),
   body:='{}'::jsonb,timeout_milliseconds:=65000);
 end loop;
end; $$;
revoke all on function tournament_internal.dispatch_emails() from public,anon,authenticated;

create or replace function tournament_internal.defer_daily_email_quota()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status='failed' and new.last_error ~* 'daily.*(quota|limit)' then
  new.attempts:=greatest(new.attempts-1,0);
  new.next_attempt_at:=greatest(new.next_attempt_at,
    (date_trunc('day',now() at time zone 'UTC')+interval '1 day 1 minute') at time zone 'UTC');
 elsif new.status='failed' and new.last_error ~* '^Too many requests' then
  new.status:='pending';
  -- Es un rechazo temporal por segundo, no consume el presupuesto de fallos.
  new.attempts:=greatest(new.attempts-1,0);
  new.next_attempt_at:=now()+interval '1 minute';
 end if;
 return new;
end; $$;
revoke all on function tournament_internal.defer_daily_email_quota()
 from public,anon,authenticated;

-- Reabre sólo rechazos por segundo aún válidos; conserva la clave de entrega.
update public.tournament_email_jobs j set status='pending',
 attempts=greatest(j.attempts-1,0),next_attempt_at=now(),last_error=null,
 token=gen_random_uuid(),updated_at=now()
from public.tournaments t where t.id=j.tournament_id
 and j.status='failed' and j.last_error ~* '^Too many requests'
 and j.schedule_version=t.schedule_version
 and (j.job_type='cancelled' or t.status in ('published','running'))
 and not exists(select 1 from public.email_deliveries d
  where d.dedupe_key=j.dedupe_key and d.status='sent');
commit;
