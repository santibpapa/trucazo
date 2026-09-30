-- Reprogramación y límite diario: base local, sin red; todo se revierte.
\set ON_ERROR_STOP on
begin;
create temporary table email_http_calls(job_id uuid);
-- Sustituye pg_net sólo en esta transacción local para contar pedidos reales.
create or replace function net.http_post(
 url text,body jsonb default '{}'::jsonb,params jsonb default '{}'::jsonb,
 headers jsonb default '{"Content-Type":"application/json"}'::jsonb,
 timeout_milliseconds integer default 2000) returns bigint language plpgsql as $$
begin
 insert into pg_temp.email_http_calls values(split_part(url,'id=',2)::uuid);
 return 1;
end $$;
create function pg_temp.check(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Anuncios: %',msg; end if; end $$;
create function pg_temp.uid(i integer) returns uuid language sql immutable as $$
 select ('dd200000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid $$;
insert into auth.users(instance_id,id,aud,role,email,email_confirmed_at,
 raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',pg_temp.uid(i),
 'authenticated','authenticated','announcement-'||i||'@trucazo.com.ar',now(),
 '{}','{}',false,now(),now() from generate_series(0,8) i;
insert into public.profiles(id,username,is_admin,is_bot)
select pg_temp.uid(i),'Anuncio'||i,i=0,false from generate_series(0,8) i
on conflict(id) do update set username=excluded.username,is_admin=excluded.is_admin,is_bot=false;

do $$
declare t uuid; processing_id uuid; old_token uuid; old_key text; changed integer; match_job uuid;
 daily_due timestamptz;
begin
 insert into public.tournaments(name,mode,format,capacity,target_score,
  starts_at,status,published_at,created_by,updated_by)
 values('Anuncios reprogramados','1v1','knockout',4,15,now()+interval '2 days',
  'published',now(),pg_temp.uid(0),pg_temp.uid(0)) returning id into t;
 perform pg_temp.check((select count(*)=9 from public.tournament_email_jobs
  where tournament_id=t),'no se generaron los nueve anuncios');
 insert into public.tournament_email_jobs(tournament_id,user_id,job_type,due_at,
  schedule_version,dedupe_key) values(t,pg_temp.uid(7),'match',now(),1,t::text||':match-priority')
  returning id into match_job;
 update tournament_internal.email_settings set enabled=true,next_dispatch_at='-infinity';
 perform tournament_internal.dispatch_emails();
 perform pg_temp.check((select count(*)=5 from pg_temp.email_http_calls),
  'se despacharon más de cinco solicitudes');
 perform pg_temp.check(exists(select 1 from pg_temp.email_http_calls where job_id=match_job),
  'los anuncios postergaron un aviso de partida');
 perform tournament_internal.dispatch_emails();
 perform pg_temp.check((select count(*)=5 from pg_temp.email_http_calls),
  'un segundo despacho superó el límite del minuto');
 update tournament_internal.email_settings set next_dispatch_at='-infinity';
 perform tournament_internal.dispatch_emails();
 perform pg_temp.check((select count(*)=10 from pg_temp.email_http_calls),
  'el despacho no volvió a habilitarse');
 delete from public.tournament_email_jobs where id=match_job;
 update public.tournament_email_jobs set status='sent',sent_at=now()
  where tournament_id=t and user_id=pg_temp.uid(0);
 update public.tournament_email_jobs set status='failed',attempts=3,last_error='Error temporal'
  where tournament_id=t and user_id=pg_temp.uid(1);
 update public.tournament_email_jobs set status='processing',attempts=1,
  next_attempt_at=now()+interval '2 minutes',locked_at=now()
  where tournament_id=t and user_id=pg_temp.uid(2)
  returning id,token,dedupe_key into processing_id,old_token,old_key;
 update public.tournament_email_jobs set status='cancelled',last_error='Destinatario inválido.'
  where tournament_id=t and user_id=pg_temp.uid(3);
 insert into public.email_deliveries(user_id,kind,dedupe_key,status,sent_at)
 select user_id,'tournament',dedupe_key,'sent',now() from public.tournament_email_jobs
  where tournament_id=t and user_id=pg_temp.uid(4);
 update public.email_preferences set tournaments_enabled=false where user_id=pg_temp.uid(5);
 update public.tournaments set starts_at=now()+interval '3 days',schedule_version=2 where id=t;
 perform pg_temp.check((select count(*)=5 from public.tournament_email_jobs
  where tournament_id=t and job_type='announcement' and schedule_version=2 and status='pending'),
  'se perdieron anuncios pendientes al reprogramar');
 perform pg_temp.check((select count(*)=9 from public.tournament_email_jobs where tournament_id=t),
  'se duplicaron anuncios');
 perform pg_temp.check((select status='sent' and schedule_version=1 from public.tournament_email_jobs
  where tournament_id=t and user_id=pg_temp.uid(0)),'se reabrió un anuncio enviado');
 perform pg_temp.check((select status='cancelled' from public.tournament_email_jobs
  where tournament_id=t and user_id=pg_temp.uid(4)),'se reabrió una entrega ya enviada');
 perform pg_temp.check((select status='cancelled' and last_error='Destinatario inválido.'
  from public.tournament_email_jobs where tournament_id=t and user_id=pg_temp.uid(3)),
  'se rehabilitó un destinatario descartado');
 perform pg_temp.check((select status='cancelled' from public.tournament_email_jobs
  where tournament_id=t and user_id=pg_temp.uid(5)),'se ignoró una baja');
 perform pg_temp.check((select token<>old_token and dedupe_key=old_key
  and next_attempt_at>=now()+interval '2 minutes' from public.tournament_email_jobs
  where id=processing_id),'se perdió la deduplicación o se pisó una tanda en curso');
 update public.tournament_email_jobs set status='cancelled'
  where id=processing_id and token=old_token;
 get diagnostics changed=row_count;
 perform pg_temp.check(changed=0,'un intento anterior canceló el anuncio recuperado');

 -- Simula el incidente anterior y la recuperación de la migración.
 update public.tournament_email_jobs set status='cancelled',last_error=null,schedule_version=1
  where id=processing_id;
 perform tournament_internal.resume_announcements(t,2);
 perform tournament_internal.resume_announcements(t,2);
 perform pg_temp.check((select status='pending' and schedule_version=2 and dedupe_key=old_key
  from public.tournament_email_jobs where id=processing_id),'recuperación incorrecta');
 update public.tournaments set starts_at=now()+interval '4 days',schedule_version=3 where id=t;
 perform pg_temp.check((select count(*)=5 from public.tournament_email_jobs
  where tournament_id=t and schedule_version=3 and status='pending'),
  'una segunda reprogramación perdió anuncios');

 -- El límite diario conserva el presupuesto previo al intento y espera UTC.
 update public.tournament_email_jobs set status='processing',attempts=5,next_attempt_at=now()
  where id=processing_id;
 update public.tournament_email_jobs set status='failed',
  last_error='You have exceeded your daily email sending quota.',
  next_attempt_at=now()+interval '15 minutes' where id=processing_id;
 daily_due:=(date_trunc('day',now() at time zone 'UTC')+interval '1 day 1 minute') at time zone 'UTC';
 perform pg_temp.check((select attempts=4 and next_attempt_at>=daily_due
  from public.tournament_email_jobs where id=processing_id),'la cuota diaria agotó intentos');
 update public.tournament_email_jobs set status='processing',attempts=5,next_attempt_at=now()
  where id=processing_id;
 update public.tournament_email_jobs set status='failed',
  last_error='You have exceeded your daily email sending quota.' where id=processing_id;
 perform pg_temp.check((select attempts=4 from public.tournament_email_jobs where id=processing_id),
  'dos días de cuota diaria agotaron los intentos');
 update public.tournament_email_jobs set status='processing',attempts=5,next_attempt_at=now()
  where id=processing_id;
 update public.tournament_email_jobs set status='failed',last_error='Too many requests. 10 requests per second.',
  next_attempt_at=now()+interval '15 minutes' where id=processing_id;
 perform pg_temp.check((select status='pending' and attempts=4 and next_attempt_at=now()+interval '1 minute'
  from public.tournament_email_jobs where id=processing_id),
  'un rechazo temporal por segundo agotó intentos o esperó quince minutos');
 update public.tournament_email_jobs set status='failed',attempts=6,
  last_error='You have exceeded your monthly email sending quota.',next_attempt_at=now()
  where id=processing_id;
 perform pg_temp.check((select attempts=6 and next_attempt_at=now()
  from public.tournament_email_jobs where id=processing_id),'se ocultó un fallo distinto del cupo diario');

 update public.tournaments set status='cancelled',cancelled_at=now() where id=t;
 perform tournament_internal.resume_announcements(t,4);
 perform pg_temp.check((select count(*)=0 from public.tournament_email_jobs
  where tournament_id=t and status in ('pending','processing','failed')),
  'se reactivó un torneo cancelado');
 perform pg_temp.check(not has_function_privilege('anon',
  'tournament_internal.resume_announcements(uuid,integer)','execute')
  and not has_function_privilege('authenticated',
  'tournament_internal.resume_announcements(uuid,integer)','execute'),
  'la recuperación quedó expuesta al cliente');
end $$;
rollback;
