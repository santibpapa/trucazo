-- PR 4: PostgreSQL local reconstruido; los fixtures y resultados se revierten.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Torneo 2v2: %',msg; end if; end $$;

insert into auth.users(instance_id,id,aud,role,email,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',
  ('cc100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid,
  'authenticated','authenticated','team-tournament-'||i||'@trucazo.com.ar',now(),
  '{}','{}',false,now(),now() from generate_series(0,40) i on conflict(id) do nothing;
insert into public.profiles(id,username,is_admin,is_bot)
select ('cc100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid,
  'Equipo'||i,i=0,false from generate_series(0,40) i
on conflict(id) do update set username=excluded.username,is_bot=false,is_admin=excluded.is_admin;

insert into public.tournaments(name,description,mode,format,capacity,target_score,
  starts_at,status,published_at,created_by,updated_by)
select name,'PR4 local','2v2',format,capacity,15,now()+interval '20 minutes',
  'published',now(),'cc100000-0000-4000-a000-000000000000',
  'cc100000-0000-4000-a000-000000000000'
from (values ('Directa equipos','knockout',8),('Grupos equipos','groups',16),
  ('Solo impar','knockout',16),('Ausencia integrante','knockout',8)) x(name,format,capacity);

create function pg_temp.player(i integer) returns uuid language sql immutable as $$
  select ('cc100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid;
$$;
create function pg_temp.add_player(t uuid,i integer,kind text default 'solo',
  current_status text default 'active') returns uuid language plpgsql as $$
declare e uuid;
begin
  insert into public.tournament_entries(tournament_id,status,kind,created_by)
    values(t,current_status,kind,pg_temp.player(i)) returning id into e;
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
    values(t,e,pg_temp.player(i),'captain','accepted',now());
  if current_status='active' then
    insert into public.tournament_checkins(entry_id,tournament_id,confirmed_by)
      values(e,t,pg_temp.player(i));
  end if;
  return e;
end $$;
create function pg_temp.add_pair(t uuid,i integer) returns uuid language plpgsql as $$
declare e uuid;
begin
  e:=pg_temp.add_player(t,i,'team');
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
    values(t,e,pg_temp.player(i+1),'invitee','accepted',now());
  return e;
end $$;

do $$
declare t uuid; i integer;
begin
  select id into t from public.tournaments where name='Directa equipos';
  for i in 1..8 loop perform pg_temp.add_player(t,i); end loop;
  select id into t from public.tournaments where name='Grupos equipos';
  for i in 1..16 by 2 loop perform pg_temp.add_pair(t,i); end loop;
  select id into t from public.tournaments where name='Solo impar';
  for i in 1..9 loop perform pg_temp.add_player(t,i); end loop;
  select id into t from public.tournaments where name='Ausencia integrante';
  for i in 1..8 by 2 loop perform pg_temp.add_pair(t,i); end loop;
  perform pg_temp.add_player(t,20,'solo','waitlisted');
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
  select t,pg_temp.add_player(t,22,'team','waitlisted'),pg_temp.player(23),
    'invitee','accepted',now();
end $$;

-- Fuerza los disparadores diferidos sin confirmar ni persistir el fixture.
set constraints tournament_freeze_full_roster immediate;
set constraints tournament_freeze_full_roster deferred;

-- Solo tests: adelantar fecha en esta transacción. La validación de fecha
-- futura y sus permisos permanecen vigentes fuera de esta transacción.
alter table public.tournaments disable trigger tournaments_validate_future_start;
update public.tournaments set starts_at=now()-interval '1 minute' where description='PR4 local';
alter table public.tournaments enable trigger tournaments_validate_future_start;

do $$
declare t record;
begin
  perform set_config('request.jwt.claim.sub',pg_temp.player(0)::text,true);
  for t in select id from public.tournaments where description='PR4 local' loop
    set local role authenticated;
    perform public.tournament_admin_start(t.id);
    reset role;
  end loop;
end $$;

do $$
declare t uuid; e uuid; n integer;
begin
  select id into t from public.tournaments where name='Directa equipos';
  select count(*) into n from public.tournament_entries where tournament_id=t
    and status='active' and kind='team';
  perform pg_temp.check(n=4,'ocho solos no formaron cuatro parejas');
  select id into t from public.tournaments where name='Solo impar';
  select count(*) into n from public.tournament_entries where tournament_id=t
    and status='waitlisted' and kind='solo';
  perform pg_temp.check(n=1,'el noveno solo no quedó primero en espera');
  select id into e from public.tournament_entries where tournament_id=t
    and status='waitlisted' and kind='solo';
  perform pg_temp.check(e=(select id from public.tournament_entries
    where tournament_id=t and status='waitlisted'
    order by priority_at,sequence_no limit 1),'el solo impar perdió prioridad');
  select id into t from public.tournaments where name='Grupos equipos';
  perform pg_temp.check((select count(*) from public.tournament_groups where tournament_id=t)=2,
    'dieciséis jugadores no formaron dos grupos');
  perform pg_temp.check((select count(*) from public.tournament_matches
    where tournament_id=t and phase='group')=12,'faltan partidos de grupos');
end $$;

-- El torneo usa una mesa privada: cuenta como partida humana terminada,
-- pero jamás como partida pública para las misiones diarias.
insert into public.daily_mission_assignments(profile_id,local_date,template_slug,
  reward_amount_snapshot)
select pg_temp.player(i), (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  template.slug,template.reward_amount
from generate_series(1,8) i
cross join public.daily_mission_templates template
where template.slug in ('finish_1','public_human_1')
on conflict (profile_id,local_date,template_slug) do update set progress=0,completed_at=null;

create function pg_temp.enter(m uuid,u uuid) returns jsonb language plpgsql as $$
declare j jsonb;
begin
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  j:=public.tournament_enter_match(m);
  reset role;
  return j;
end $$;
create function pg_temp.play(m uuid) returns void language plpgsql as $$
declare v_match public.tournament_matches; v_member record; v_table uuid; v_coins integer;
  v_result jsonb; v_first integer:=0;
begin
  select * into v_match from public.tournament_matches where id=m;
  select coins into v_coins from public.profiles where id=pg_temp.player(1);
  for v_member in select member.user_id from public.tournament_entry_members member
    where member.entry_id in (v_match.side_a_entry_id,v_match.side_b_entry_id)
      and member.status='accepted' order by member.user_id loop
    v_result:=pg_temp.enter(m,v_member.user_id);
    v_first:=v_first+1;
    if v_first<4 then perform pg_temp.check(v_result->>'team_game_id' is null,
      'la mesa se creó antes de llegar cuatro personas'); end if;
  end loop;
  v_table:=(v_result->>'team_game_id')::uuid;
  perform pg_temp.check(v_table is not null,'faltó crear la partida');
  perform pg_temp.check((select bet=0 and status='playing' from public.team_tables where id=v_table),
    'apuesta cero o estado inválido');
  perform pg_temp.check((select count(*)=4 from public.team_hands where table_id=v_table),
    'faltan cuatro manos');
  perform pg_temp.check((select count(distinct user_id)=4 and count(distinct seat)=4
    from public.team_seats where table_id=v_table),'asientos duplicados');
  -- Se termina el juego por el mismo helper interno que usa team_action.
  perform team_internal.finish(v_table,0,'points');
  perform team_internal.finish(v_table,0,'points');
  perform pg_temp.check((select result_applied_at is not null
    from public.tournament_matches where id=m),'el resultado no progresó');
  perform pg_temp.check((select count(*)=4 from tournament_internal.team_objective_events
    where team_game_id=v_table),'misiones ausentes o duplicadas');
  perform pg_temp.check((select coins=v_coins from public.profiles where id=pg_temp.player(1)),
    'el torneo movió monedas de apuesta');
  for v_member in select seat.user_id,seat.seat from public.team_seats seat
    where seat.table_id=v_table loop
    perform pg_temp.check((select games_played =
      (select count(*) from tournament_internal.team_objective_events events
        join public.team_seats s on s.table_id=events.team_game_id
          and s.user_id=events.profile_id
        where events.profile_id=v_member.user_id)
      from public.profiles where id=v_member.user_id),
      'un jugador no sumó una sola partida por cruce');
  end loop;
end $$;

-- Recorrido completo: las rondas se abren al terminar todos sus partidos.
do $$
declare t record; m record; i integer; n integer;
begin
  for t in select id from public.tournaments where name in ('Directa equipos','Grupos equipos') loop
    for i in 1..40 loop
      for m in select id from public.tournament_matches
        where tournament_id=t.id and status='ready' order by round_number,match_number loop
        perform pg_temp.play(m.id);
      end loop;
      exit when (select status from public.tournaments where id=t.id)='completed';
    end loop;
    perform pg_temp.check((select status from public.tournaments where id=t.id)='completed',
      'no se completaron eliminación, grupos, final y tercer puesto');
    perform pg_temp.check((select count(*) from public.tournament_matches
      where tournament_id=t.id and phase in ('final','third_place')
      and status='finished')=2,'faltó final o tercer puesto');
    if (select name from public.tournaments where id=t.id)='Directa equipos' then
      perform pg_temp.check((select count(*)=8 from public.daily_mission_assignments
        where template_slug='finish_1' and profile_id in
          (select pg_temp.player(players.idx) from generate_series(1,8) as players(idx))
          and progress=1),'no avanzó la misión de partida terminada');
      perform pg_temp.check((select count(*)=8 from public.daily_mission_assignments
        where template_slug='public_human_1' and profile_id in
          (select pg_temp.player(players.idx) from generate_series(1,8) as players(idx))
          and progress=0),'la mesa privada avanzó una misión pública');
    end if;
  end loop;
end $$;

-- Un solo ausente se reemplaza con el primer solo en espera, quien gana
-- cinco minutos para entrar. Los tres presentes mantienen su confirmación.
do $$
declare t uuid; m public.tournament_matches; v_missing uuid; v_present record;
  v_old_deadline timestamptz;
begin
  select id into t from public.tournaments where name='Ausencia integrante';
  select * into m from public.tournament_matches where tournament_id=t and status='ready'
    order by match_number limit 1;
  select user_id into v_missing from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted' order by user_id limit 1;
  for v_present in select user_id from public.tournament_entry_members
    where entry_id in (m.side_a_entry_id,m.side_b_entry_id) and status='accepted'
      and user_id<>v_missing loop perform pg_temp.enter(m.id,v_present.user_id); end loop;
  update public.tournament_matches set entry_deadline=now()-interval '1 second' where id=m.id;
  perform pg_temp.check(tournament_internal.replace_absent_member(m.id),
    'no sustituyó al único ausente');
  perform pg_temp.check(not tournament_internal.replace_absent_member(m.id),
    'un reintento duplicó el reemplazo');
  perform pg_temp.check((select count(*) from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted')=2,
    'el equipo sustituto quedó incompleto');
  perform pg_temp.check((select count(*) from public.tournament_match_presence
    where match_id=m.id)=3,'se perdieron presencias confirmadas');
  perform pg_temp.check((select entry_deadline>now() from public.tournament_matches
    where id=m.id),'el reemplazo no recibió plazo nuevo');
end $$;

-- El administrador puede cambiar una persona sola o una pareja completa
-- conservando la plaza competitiva y el check-in del cruce.
do $$
declare t uuid; e uuid; incoming uuid; old_user uuid; new_user uuid; n integer;
begin
  perform set_config('request.jwt.claim.sub',pg_temp.player(0)::text,true);
  select id into t from public.tournaments where name='Solo impar';
  select id into e from public.tournament_entries where tournament_id=t
    and status='active' and kind='team' limit 1;
  select user_id into old_user from public.tournament_entry_members
    where entry_id=e and status='accepted' limit 1;
  select id into incoming from public.tournament_entries where tournament_id=t
    and status='waitlisted' and kind='solo' limit 1;
  select user_id into new_user from public.tournament_entry_members
    where entry_id=incoming and status='accepted';
  set local role authenticated;
  perform public.tournament_admin_replace_team_member(t,e,old_user,incoming);
  reset role;
  select count(*) into n from public.tournament_entry_members where entry_id=e
    and status='accepted';
  perform pg_temp.check(n=2 and exists(select 1 from public.tournament_entry_members
    where entry_id=e and user_id=new_user and status='accepted'),
    'el reemplazo manual de integrante no mantuvo la pareja');

  select id into t from public.tournaments where name='Ausencia integrante';
  select id into e from public.tournament_entries where tournament_id=t
    and status='active' and kind='team' limit 1;
  select id into incoming from public.tournament_entries where tournament_id=t
    and status='waitlisted' and kind='team' limit 1;
  set local role authenticated;
  perform public.tournament_admin_replace(t,e,incoming);
  reset role;
  perform pg_temp.check((select count(*)=2 from public.tournament_entry_members
    where entry_id=e and status='accepted' and user_id in
      (pg_temp.player(22),pg_temp.player(23))),
    'el reemplazo manual de pareja no mantuvo ambos integrantes');
end $$;

do $$
declare t uuid; m uuid; u uuid; blocked boolean:=false; n integer;
begin
  select id into t from public.tournaments where name='Directa equipos';
  select team_game_id into m from public.tournament_matches
    where tournament_id=t and team_game_id is not null limit 1;
  select user_id into u from public.team_seats where table_id=m order by seat limit 1;
  perform set_config('request.jwt.claim.sub',u::text,true);
  begin
    set local role authenticated;
    update public.team_seats set seat=3 where table_id=m and user_id=u;
  exception when others then blocked:=true; end;
  reset role;
  perform pg_temp.check(blocked,'un cliente cambió asientos');
  perform set_config('request.jwt.claim.sub',pg_temp.player(40)::text,true);
  set local role authenticated;
  select count(*) into n from public.team_hands where table_id=m;
  reset role;
  perform pg_temp.check(n=0,'se filtraron manos a un tercero');
  perform pg_temp.check(not has_schema_privilege('authenticated','tournament_internal','USAGE'),
    'los helpers de torneos quedaron expuestos');
end $$;
rollback;
