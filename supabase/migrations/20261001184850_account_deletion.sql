-- Eliminación permanente: datos de juego en una transacción; Storage/Auth por
-- sus APIs con una cola durable. Aplicar ANTES de publicar el frontend.
begin;
create schema if not exists account_internal;
revoke all on schema account_internal from public, anon, authenticated;

create table public.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  next_attempt_at timestamptz not null default now(),
  user_id uuid not null unique, -- sin FK: sobrevive al borrado de Auth para reintentar
  objects jsonb not null default '[]',
  created_at timestamptz not null default now(),
  locked_until timestamptz,
  lease_id uuid,
  attempts integer not null default 0,
  last_error text
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;
grant select, update, delete on public.account_deletion_jobs to service_role;

-- Los tokens emitidos antes del borrado pueden durar hasta su expiración.
-- Impedir que recreen el perfil o suban archivos mientras se termina de borrar Auth.
create function account_internal.active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=auth.uid())
    and not exists(select 1 from public.account_deletion_jobs where user_id=auth.uid());
$$;
grant usage on schema account_internal to authenticated;
revoke all on function account_internal.active_account() from public, anon, authenticated;
grant execute on function account_internal.active_account() to authenticated;
create policy account_can_create_profile on public.profiles as restrictive
  for insert to authenticated with check (account_internal.active_account());
create policy account_can_upload on storage.objects as restrictive
  for insert to authenticated with check (account_internal.active_account());
create policy account_can_update_files on storage.objects as restrictive
  for update to authenticated using (account_internal.active_account())
  with check (account_internal.active_account());

-- Una visita que llega tarde tampoco puede recrear los datos de navegación.
-- Compartir el bloqueo con el borrado evita la carrera entre ambas transacciones.
alter function public.record_analytics_event(uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,jsonb)
  set schema account_internal;
create function public.record_analytics_event(
  p_event_id uuid, p_visitor_id uuid, p_session_id uuid, p_event_name text,
  p_path text, p_user_id uuid, p_source text, p_medium text, p_campaign text,
  p_content text, p_referrer_host text, p_country_code text, p_device_type text,
  p_browser text, p_operating_system text, p_properties jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
    if not exists(select 1 from public.profiles where id=p_user_id) then return; end if;
  end if;
  perform account_internal.record_analytics_event(p_event_id,p_visitor_id,p_session_id,
    p_event_name,p_path,p_user_id,p_source,p_medium,p_campaign,p_content,p_referrer_host,
    p_country_code,p_device_type,p_browser,p_operating_system,p_properties);
end; $$;
revoke all on function public.record_analytics_event(uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.record_analytics_event(uuid,uuid,uuid,text,text,uuid,text,text,text,text,text,text,text,text,text,jsonb)
  to service_role;

-- Marca los integrantes que realmente ocuparon el lugar, distinguiéndolos de
-- invitaciones rechazadas o sustitutos históricos al mostrar resultados.
alter table public.tournament_entry_members add column identity_deleted boolean not null default false;

-- Referencias de resultados compartidos pierden la identidad, no el resultado.
-- Descubrir el nombre real de la FK: la foto local y producción usan algunos
-- nombres diferentes. No cambia ninguna FK fuera de esta lista explícita.
do $$ declare r record; fk record; begin
  for r in select * from (values
    ('public','game_history','opponent_id','public','profiles'),
    ('public','team_tables','creator_id','public','profiles'),
    ('public','team_seats','user_id','public','profiles'),
    ('public','tournaments','created_by','public','profiles'),
    ('public','tournaments','updated_by','public','profiles'),
    ('public','tournament_entries','created_by','public','profiles'),
    ('public','tournament_entry_members','user_id','public','profiles'),
    ('public','tournament_entry_members','invited_by','public','profiles'),
    ('public','tournament_entry_members','replaced_by','public','profiles'),
    ('public','tournament_checkins','confirmed_by','public','profiles'),
    ('public','tournament_matches','game_id','public','games')
  ) as x(s,t,c,rs,rt) loop
    execute format('alter table %I.%I alter column %I drop not null',r.s,r.t,r.c);
    for fk in select con.conname from pg_catalog.pg_constraint con
      join pg_catalog.pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
      where con.contype='f' and con.conrelid=format('%I.%I',r.s,r.t)::regclass
        and a.attname=r.c and cardinality(con.conkey)=1 loop
      execute format('alter table %I.%I drop constraint %I',r.s,r.t,fk.conname);
      execute format('alter table %I.%I add constraint %I foreign key (%I) references %I.%I(id) on delete set null',
        r.s,r.t,fk.conname,r.c,r.rs,r.rt);
    end loop;
  end loop;
end $$;

-- Borrar una identidad de un asiento CERRADO es la única excepción nueva.
-- No se permite mover jugadores de torneos vivos, ni siquiera por esta vía.
create or replace function tournament_internal.lock_tournament_seats() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.team_tables t where t.id=old.table_id
    and t.tournament_match_id is not null) then
    if tg_op='UPDATE' and new.user_id is null and old.user_id is not null
      and new.seat is not distinct from old.seat and new.paid=old.paid
      and new.table_id=old.table_id and exists (
        select 1 from public.team_tables where id=old.table_id and status in ('finished','cancelled')
      ) and exists(select 1 from public.account_deletion_jobs where user_id=old.user_id) then
      return new;
    end if;
    if tg_op='DELETE' then raise exception 'Los asientos del torneo no se pueden cambiar'; end if;
    if new.user_id is distinct from old.user_id or new.seat is distinct from old.seat
      or new.paid is distinct from old.paid or new.table_id is distinct from old.table_id then
      raise exception 'Los asientos del torneo no se pueden cambiar';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create or replace function tournament_internal.current_name(p_entry_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select string_agg(coalesce(p.username,'Cuenta eliminada'),' + ' order by member.accepted_at,member.user_id nulls last,member.id)
  from public.tournament_entry_members member left join public.profiles p on p.id=member.user_id
  where member.entry_id=p_entry_id and (member.status='accepted' or member.identity_deleted);
$$;

create or replace function tournament_internal.group_order(p_group_id uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  with tied as (
    select gm.*, e.status = 'disqualified' as disqualified,
      count(*) over (partition by e.status = 'disqualified', gm.wins) as tied_count
    from public.tournament_group_members gm
    join public.tournament_entries e on e.id = gm.entry_id
    where gm.group_id = p_group_id
      and not (e.status = 'disqualified' and exists (
        select 1 from public.tournament_entry_members deleted
        where deleted.entry_id=e.id and deleted.identity_deleted
      ))
  ), ordered as (
    select gm.entry_id, gm.wins, gm.disqualified,
      gm.points_for - gm.points_against as difference,
      gm.tie_break_seed,
      case when gm.tied_count = 2 then coalesce((
        select case when m.winner_entry_id = gm.entry_id then 1 else 0 end
        from public.tournament_matches m
        join tied other on other.group_id = gm.group_id
          and other.wins = gm.wins and other.disqualified = gm.disqualified
          and other.entry_id <> gm.entry_id
        where m.group_id = gm.group_id
          and m.status in ('finished', 'forfeit')
          and m.side_a_entry_id in (gm.entry_id, other.entry_id)
          and m.side_b_entry_id in (gm.entry_id, other.entry_id)
        limit 1
      ), 0) else 0 end as head_to_head
    from tied gm
  )
  select array_agg(entry_id order by disqualified, wins desc, head_to_head desc,
                    difference desc, tie_break_seed)
  from ordered;
$$;

-- Un lugar de una cuenta borrada queda vacante, también en rondas que se
-- creen más adelante o al reanudar un torneo. No inventar un ganador cuando
-- ambos lugares están vacantes. El motor existente propaga el NULL como bye.
alter function tournament_internal.advance_bracket(uuid) rename to advance_bracket_before_account_deletion;
create function tournament_internal.advance_bracket(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.tournament_matches; a boolean; b boolean;
begin
  perform tournament_internal.advance_bracket_before_account_deletion(p_tournament_id);
  if not exists(select 1 from public.tournaments where id=p_tournament_id
    and status='running' and paused_at is null) then return; end if;
  loop
    select * into m from public.tournament_matches candidate
      where candidate.tournament_id=p_tournament_id and candidate.status in ('ready','pending')
        and (candidate.side_a_entry_id is null or candidate.side_b_entry_id is null
          or exists(select 1 from public.tournament_entries e
            join public.tournament_entry_members em on em.entry_id=e.id
            where e.id in (candidate.side_a_entry_id,candidate.side_b_entry_id)
              and e.status='disqualified' and em.identity_deleted))
      order by candidate.round_number,candidate.match_number limit 1 for update;
    exit when not found;
    a:=coalesce((select status='active' from public.tournament_entries where id=m.side_a_entry_id),false);
    b:=coalesce((select status='active' from public.tournament_entries where id=m.side_b_entry_id),false);
    if a or b then
      perform tournament_internal.settle_match(m.id,
        case when a then m.side_a_entry_id else m.side_b_entry_id end,null,null,'account_deleted');
    else
      update public.tournament_matches set status='forfeit',finish_reason='both_disqualified',
        winner_entry_id=null,loser_entry_id=null,finished_at=now(),result_applied_at=now(),updated_at=now(),
        side_a_username=tournament_internal.current_name(m.side_a_entry_id),
        side_b_username=tournament_internal.current_name(m.side_b_entry_id)
        where id=m.id;
      if m.phase='group' then
        update public.tournament_group_members set losses=losses+1
          where group_id=m.group_id and entry_id in (m.side_a_entry_id,m.side_b_entry_id);
      end if;
      perform tournament_internal.advance_bracket(p_tournament_id);
    end if;
  end loop;
end; $$;
revoke all on function tournament_internal.advance_bracket(uuid) from public,anon,authenticated;

-- Inventario por dueño/carpeta, incluidos archivos antiguos y uploads huérfanos.
-- No se borra storage.objects con SQL: la API borra también el archivo real.
create function public.account_deletion_objects(p_user_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'name',o.name)),'[]'::jsonb)
  from storage.objects o where o.owner=p_user_id
    or to_jsonb(o)->>'owner_id'=p_user_id::text
    or split_part(o.name,'/',1)=p_user_id::text
    or (o.bucket_id='feedback-images' and o.owner is null
      and coalesce(to_jsonb(o)->>'owner_id','')='' and exists (
        select 1 from public.feedback f where f.user_id=p_user_id and o.name=any(f.image_paths)
      ));
$$;

create function public.prepare_account_deletion(p_user_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare j uuid; u public.profiles; r record; g public.games;
  v_next uuid; v_entries uuid[];
  v_old_sub text := current_setting('request.jwt.claim.sub',true);
  v_old_claims text := current_setting('request.jwt.claims',true);
begin
  -- Serializar con acciones normales/inscripciones del mismo jugador.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,7202));
  select id into j from public.account_deletion_jobs where user_id=p_user_id;
  if found then return j; end if;
  if not exists(select 1 from auth.users where id=p_user_id and is_anonymous is false) then
    raise exception 'Cuenta no disponible'; end if;
  select * into u from public.profiles where id=p_user_id;
  if u.is_bot then raise exception 'Cuenta no disponible'; end if;
  insert into public.account_deletion_jobs(user_id,objects)
    values(p_user_id,public.account_deletion_objects(p_user_id)) returning id into j;

  -- Las RPC existentes toman la identidad del token. El servidor ya comprobó
  -- al dueño; fijarla sólo dentro de esta transacción permite reutilizar las
  -- reglas de abandono, monedas, estadísticas y avance de torneos.
  perform set_config('request.jwt.claim.sub',p_user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_user_id,'role','authenticated')::text,true);

  -- Mismo orden del motor: primero torneos, después mesas, después perfiles.
  perform 1 from public.tournaments t where t.id in (
    select tournament_id from public.tournament_entry_members where user_id=p_user_id
  ) order by t.id for update;
  update public.tournament_entry_members set identity_deleted=true
    where user_id=p_user_id and status='accepted';
  select array_agg(distinct entry_id) into v_entries from public.tournament_entry_members
    where user_id=p_user_id;
  for g in select * from public.games where status='playing'
    and p_user_id in (player1_id,player2_id) order by id for update loop
    perform public.forfeit(g.id);
  end loop;
  for r in select t.id,t.status,s.seat from public.team_tables t
    join public.team_seats s on s.table_id=t.id where s.user_id=p_user_id
    and t.status in ('playing','waiting') order by t.id for update of t loop
    if r.status='playing' then
      perform team_internal.finish(r.id,1-r.seat%2,'forfeit');
    else
      perform team_internal.cancel(r.id);
    end if;
  end loop;

  -- El retiro por eliminación no depende del horario de check-in ni de admin.
  -- Una pareja activa se retira entera, igual que una baja del equipo.
  for r in select e.id,e.tournament_id,t.status as tournament_status
    from public.tournament_entries e join public.tournaments t on t.id=e.tournament_id
    where e.id=any(v_entries) and e.status in ('active','waitlisted')
      and exists(select 1 from public.tournament_entry_members m
        where m.entry_id=e.id and m.user_id=p_user_id and m.status='accepted') loop
    update public.tournament_entries set status=case when r.tournament_status='running'
      then 'disqualified' else 'withdrawn' end,updated_at=now() where id=r.id;
    delete from public.tournament_checkins where entry_id=r.id;
    if r.tournament_status='running' then
      perform tournament_internal.advance_bracket(r.tournament_id);
    elsif r.tournament_status='published' then
      update public.tournament_entry_members set status='withdrawn',withdrawn_at=now()
        where entry_id=r.id and status in ('pending','accepted');
      perform tournament_internal.promote_waitlist(r.tournament_id,null);
    end if;
  end loop;
  update public.tournament_entry_members set status='withdrawn',withdrawn_at=now()
    where user_id=p_user_id and status in ('pending','accepted');
  -- Invitaciones realizadas por esa identidad tampoco pueden quedar pendientes.
  update public.tournament_entry_members set status='rejected',rejected_at=now()
    where invited_by=p_user_id and status='pending';

  -- Conservar los grupos de terceros y transferir liderazgo al miembro más antiguo.
  for r in select id from public.groups where leader_id=p_user_id for update loop
    select user_id into v_next from public.group_members where group_id=r.id
      and user_id<>p_user_id order by joined_at,user_id limit 1;
    if v_next is null then delete from public.groups where id=r.id;
    else update public.groups set leader_id=v_next where id=r.id; end if;
  end loop;

  -- Mesas normales pendientes: devolver las monedas al otro jugador antes de borrar.
  for r in select * from public.tables where status='waiting'
    and p_user_id in (creator_id,opponent_id) for update loop
    if r.creator_id<>p_user_id then
      update public.profiles set coins=coins+r.bet where id=r.creator_id;
    end if;
  end loop;
  update public.game_history set opponent_username='Cuenta eliminada' where opponent_id=p_user_id;
  -- El 1v1 contiene UUIDs también en JSON; se borra el registro del motor entero.
  -- Los resultados del oponente y del cuadro de torneo se conservan separados.
  delete from public.bot_decisions where rival_id=p_user_id or game_id in (
    select id from public.games where p_user_id in (player1_id,player2_id));
  delete from public.games where p_user_id in (player1_id,player2_id);
  delete from public.tables where p_user_id in (creator_id,opponent_id);
  delete from public.game_presence where player_id=p_user_id;
  delete from public.game_hands where player_id=p_user_id;
  delete from public.feedback where user_id=p_user_id;
  delete from tournament_internal.team_objective_events where profile_id=p_user_id;
  delete from public.tournament_awards where user_id=p_user_id;
  delete from public.tournament_match_presence where user_id=p_user_id;
  delete from team_internal.requests where actor=p_user_id or position(p_user_id::text in payload::text)>0;
  delete from tournament_internal.mutation_requests where actor_id=p_user_id
    or position(p_user_id::text in payload::text)>0;
  delete from tournament_internal.audit_log where actor_id=p_user_id
    or position(p_user_id::text in details::text)>0;
  -- Notificaciones ajenas pueden contener el nombre/UUID del jugador que invita.
  delete from public.tournament_notifications where user_id=p_user_id
    or position(p_user_id::text in payload::text)>0;
  delete from public.analytics_visitors where last_user_id=p_user_id or visitor_id in (
    select visitor_id from public.analytics_sessions where user_id=p_user_id
    union select visitor_id from public.analytics_events where user_id=p_user_id);
  update public.ranking_email_jobs set passed_by_username='Cuenta eliminada'
    where passed_by_username=u.username;
  update public.news set author_username='Cuenta eliminada' where author_username=u.username;
  update public.team_seats set username='Cuenta eliminada',avatar_url=null
    where user_id=p_user_id;
  -- Un miembro sin asiento no forma parte del resultado de una partida.
  delete from public.team_seats where user_id=p_user_id and seat is null;
  update public.team_tables set name='Mesa cerrada' where creator_id=p_user_id;
  delete from public.profiles where id=p_user_id;
  -- Actualizar nombres congelados después de que las FK hayan quitado la identidad.
  update public.tournament_matches set
    side_a_username=tournament_internal.current_name(side_a_entry_id),
    side_b_username=tournament_internal.current_name(side_b_entry_id)
    where side_a_entry_id=any(v_entries) or side_b_entry_id=any(v_entries);
  perform set_config('request.jwt.claim.sub',coalesce(v_old_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_old_claims,''),true);
  return j;
end; $$;

create function public.claim_account_deletions(p_job_id uuid default null)
returns setof public.account_deletion_jobs language sql security definer set search_path = '' as $$
  update public.account_deletion_jobs j set locked_until=now()+interval '5 minutes',
    lease_id=gen_random_uuid(),attempts=attempts+1
  where j.id in (select q.id from public.account_deletion_jobs q
    where (p_job_id is null or q.id=p_job_id) and (locked_until is null or locked_until<now())
    order by created_at limit 10 for update skip locked)
  returning j.*;
$$;
revoke all on function public.prepare_account_deletion(uuid),
  public.account_deletion_objects(uuid), public.claim_account_deletions(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid),
  public.account_deletion_objects(uuid), public.claim_account_deletions(uuid) to service_role;
-- Reintentos por solicitud con token secreto, igual que los correos de torneos.
create function account_internal.dispatch_deletions() returns void
language plpgsql security definer set search_path = '' as $$
declare job record;
begin
  for job in select id,token from public.account_deletion_jobs
    where next_attempt_at<=now() and (locked_until is null or locked_until<now())
    order by created_at limit 10 for update skip locked loop
    perform net.http_post(url:='https://www.trucazo.com.ar/api/account/cleanup?id='||job.id::text,
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||job.token::text),
      body:='{}'::jsonb,timeout_milliseconds:=65000);
    update public.account_deletion_jobs set next_attempt_at=now()+interval '10 minutes' where id=job.id;
  end loop;
end; $$;
revoke all on function account_internal.dispatch_deletions() from public,anon,authenticated;
select cron.schedule('trucazo-account-deletion-retry','*/10 * * * *',
  'select account_internal.dispatch_deletions()');
commit;
