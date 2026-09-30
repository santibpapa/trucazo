-- Los anuncios pendientes sobreviven a una reprogramación. Los recordatorios
-- mantienen su cancelación por versión de agenda. Conservamos id y dedupe_key
-- para que el endpoint y Resend reconozcan cualquier entrega ya realizada.
begin;

create or replace function tournament_internal.resume_announcements(
 p_tournament_id uuid,p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update public.tournament_email_jobs j set
  schedule_version=p_version, status='pending', attempts=0,
  token=gen_random_uuid(), locked_at=null, last_error=null, updated_at=now(),
  next_attempt_at=case when j.status='processing'
    then greatest(j.next_attempt_at,now()+interval '2 minutes')
    else greatest(j.next_attempt_at,now()) end
 where j.tournament_id=p_tournament_id and j.job_type='announcement'
  and j.schedule_version<p_version
  and (j.status in ('pending','failed','processing')
    or (j.status='cancelled' and j.last_error is null))
  and exists(select 1 from public.tournaments t where t.id=j.tournament_id
    and t.status='published' and t.schedule_version=p_version and t.starts_at>now())
  and tournament_internal.is_eligible_participant(j.user_id)
  and exists(select 1 from public.email_preferences ep where ep.user_id=j.user_id
    and ep.tournaments_enabled)
  and not exists(select 1 from public.email_deliveries d
    where d.dedupe_key=j.dedupe_key and d.status='sent')
  and not exists(select 1 from public.tournament_email_jobs sent
    where sent.tournament_id=j.tournament_id and sent.user_id=j.user_id
      and sent.job_type='announcement' and sent.status='sent');
end; $$;
revoke all on function tournament_internal.resume_announcements(uuid,integer)
 from public,anon,authenticated;

create or replace function tournament_internal.tournament_communications() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient record;
begin
 if tg_op='INSERT' then
  if new.status='published' then
   for recipient in select p.id from public.profiles p join auth.users u on u.id=p.id
    where not p.is_bot and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous,false) loop
    perform tournament_internal.queue_email(new.id,recipient.id,'announcement',now(),new.schedule_version);
   end loop;
  end if;
  return new;
 end if;
 if new.status='completed' and old.status is distinct from 'completed' then
  perform tournament_internal.award_podium(new.id);
 end if;
 if new.status='published' and old.status is distinct from 'published' then
  -- Anuncio a las cuentas registradas y confirmadas. El endpoint vuelve a
  -- comprobar correo, preferencias, cuenta anonima y direcciones de prueba.
  for recipient in select p.id from public.profiles p join auth.users u on u.id=p.id
   where not p.is_bot and u.email_confirmed_at is not null
     and not coalesce(u.is_anonymous,false) loop
   perform tournament_internal.queue_email(new.id,recipient.id,'announcement',now(),new.schedule_version);
  end loop;
  for recipient in select distinct em.user_id from public.tournament_entry_members em
   where em.tournament_id=new.id and em.status='accepted' loop
   perform tournament_internal.schedule_member(new.id,recipient.user_id);
  end loop;
 end if;
 if new.status='published' and new.schedule_version<>old.schedule_version then
  perform tournament_internal.resume_announcements(new.id,new.schedule_version);
  update public.tournament_email_jobs set status='cancelled',updated_at=now()
   where tournament_id=new.id and schedule_version<>new.schedule_version
     and status in ('pending','failed','processing');
  for recipient in select distinct em.user_id from public.tournament_entry_members em
   where em.tournament_id=new.id and em.status='accepted' loop
   perform tournament_internal.queue_email(new.id,recipient.user_id,'rescheduled',now(),new.schedule_version);
   perform tournament_internal.notify(new.id,recipient.user_id,'rescheduled',
    new.id::text||':rescheduled:'||new.schedule_version||':'||recipient.user_id::text,
    jsonb_build_object('starts_at',new.starts_at));
   perform tournament_internal.schedule_member(new.id,recipient.user_id);
  end loop;
 end if;
 if new.status='cancelled' and old.status is distinct from 'cancelled' then
  update public.tournament_email_jobs set status='cancelled',updated_at=now()
   where tournament_id=new.id and status in ('pending','failed','processing');
  if old.published_at is not null then
   for recipient in select distinct em.user_id from public.tournament_entry_members em
    where em.tournament_id=new.id and em.status='accepted' loop
    perform tournament_internal.queue_email(new.id,recipient.user_id,'cancelled',now(),new.schedule_version);
    perform tournament_internal.notify(new.id,recipient.user_id,'cancelled',
      new.id::text||':cancelled:'||recipient.user_id::text);
   end loop;
  end if;
 end if;
 return new;
end; $$;
revoke all on function tournament_internal.tournament_communications()
 from public,anon,authenticated;

-- El límite diario no es un fallo definitivo: no consume los seis intentos.
-- Resend renueva este cupo a medianoche UTC. El cron existente reanuda la cola.
create or replace function tournament_internal.defer_daily_email_quota()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status='failed' and new.last_error ~* 'daily.*(quota|limit)' then
  new.attempts:=greatest(new.attempts-1,0);
  new.next_attempt_at:=greatest(new.next_attempt_at,
    (date_trunc('day',now() at time zone 'UTC')+interval '1 day 1 minute') at time zone 'UTC');
 end if;
 return new;
end; $$;
revoke all on function tournament_internal.defer_daily_email_quota()
 from public,anon,authenticated;
drop trigger if exists tournament_email_daily_quota on public.tournament_email_jobs;
create trigger tournament_email_daily_quota before update of status
 on public.tournament_email_jobs for each row
 execute function tournament_internal.defer_daily_email_quota();

-- Recupera sólo anuncios de torneos futuros publicados que una agenda anterior
-- canceló sin error de destinatario. No toca torneos cancelados ni envíos hechos.
do $$
declare t record;
begin
 for t in select id,schedule_version from public.tournaments
  where status='published' and starts_at>now()
 loop
  perform tournament_internal.resume_announcements(t.id,t.schedule_version);
 end loop;
end; $$;
commit;
