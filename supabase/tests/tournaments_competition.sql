-- PR 3: ejecutar SOLO en PostgreSQL local reconstruido; todo se revierte.
\set ON_ERROR_STOP on
\pset footer off
begin;

do $$ begin
  if has_schema_privilege('authenticated','tournament_internal','USAGE') then
    raise exception 'Una ruta interna de torneo quedó expuesta';
  end if;
end $$;

do $$
declare
i integer;
v_id uuid;
begin
  for i in 0..8 loop
    v_id := ('bb100000-0000-4000-a000-' || lpad(i::text,12,'0'))::uuid;
    insert into auth.users(instance_id,id,aud,role,email,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,is_anonymous,created_at,updated_at)
    values('00000000-0000-0000-0000-000000000000',v_id,
      'authenticated','authenticated','competition-'||i||'@trucazo.com.ar',now(),
      '{}','{}',false,now(),now()) on conflict(id) do nothing;
    insert into public.profiles(id,username,is_admin,is_bot)
      values(v_id,'Competicion'||i,i=0,false)
      on conflict(id) do update set username=excluded.username,
        is_admin=excluded.is_admin,is_bot=false;
  end loop;
end $$;

-- El trigger exige fecha futura en producción. En esta transacción local se
-- adelanta el reloj del torneo, sin alterar el reloj del servidor.
insert into public.tournaments(name,description,mode,format,capacity,target_score,
  starts_at,status,published_at,created_by,updated_by)
select name,'Prueba local','1v1',format,capacity,15,now()+interval '20 minutes',
  'published',now(),'bb100000-0000-4000-a000-000000000000',
  'bb100000-0000-4000-a000-000000000000'
from (values ('Directa 4','knockout',4), ('Grupos 8','groups',8),
             ('Bye 5','knockout',8), ('Ausencia 4','knockout',4)) x(name,format,capacity);

do $$
declare
t record;
i integer;
v_entry uuid;
v_player uuid;
begin
  for t in select * from public.tournaments where description='Prueba local' loop
    for i in 1..case t.name when 'Grupos 8' then 8 when 'Bye 5' then 5 else 4 end loop
      v_player := ('bb100000-0000-4000-a000-' || lpad(i::text,12,'0'))::uuid;
      insert into public.tournament_entries(tournament_id,status,created_by)
        values(t.id,'active',v_player) returning id into v_entry;
      insert into public.tournament_entry_members(tournament_id,entry_id,user_id,
        role,status,accepted_at) values(t.id,v_entry,v_player,'captain','accepted',now());
      insert into public.tournament_checkins(tournament_id,entry_id,confirmed_by)
        values(t.id,v_entry,v_player);
    end loop;
  end loop;
end $$;

alter table public.tournaments disable trigger tournaments_validate_future_start;
update public.tournaments set starts_at=now()-interval '1 minute'
  where description='Prueba local';
alter table public.tournaments enable trigger tournaments_validate_future_start;

select set_config('request.jwt.claim.sub','bb100000-0000-4000-a000-000000000000',false);
do $$
declare
  v_ids uuid[];
  v_id uuid;
begin
  select array_agg(id) into v_ids from public.tournaments
    where description='Prueba local';
  foreach v_id in array v_ids loop
    set local role authenticated;
    perform public.tournament_admin_start(v_id);
    reset role;
  end loop;
end $$;

do $$ begin
  perform set_config('request.jwt.claim.sub',
    'bb100000-0000-4000-a000-000000000000',true);
  set local role authenticated;
  begin
    insert into public.tables(name,creator_id,creator_username,bet,is_private,status)
    values('Mesa sin apuesta','bb100000-0000-4000-a000-000000000000',
      'Competicion0',0,false,'waiting');
    raise exception 'El cliente creó una mesa directa sin apuesta';
  exception when others then
    if sqlerrm='El cliente creó una mesa directa sin apuesta' then raise; end if;
  end;
  reset role;
end $$;

do $$
declare
v_id uuid;
begin
  select id into v_id from public.tournaments where name='Directa 4';
  if (select count(*) from public.tournament_matches
      where tournament_id=v_id and phase='semifinal' and status='ready') <> 2 then
    raise exception 'No se sortearon las dos semifinales';
  end if;
  if (select count(*) from public.tournament_matches
      where tournament_id=(select id from public.tournaments where name='Grupos 8')) <> 12 then
    raise exception 'Dos grupos de cuatro necesitan doce partidas';
  end if;
  if (select count(*) from public.tournament_matches
      where tournament_id=(select id from public.tournaments where name='Bye 5')
        and finish_reason='bye') <> 3 then
    raise exception 'Cinco jugadores en llave de ocho necesitan tres byes';
  end if;
end $$;

-- Entradas, apuesta cero y bloqueo de mesas normales. La última entrada
-- crea la partida una sola vez, también al repetir ambos RPC.
do $$
declare
m public.tournament_matches;
v_a uuid;
v_b uuid;
v_coins integer;
v_game uuid;
begin
  select * into m from public.tournament_matches
    where tournament_id=(select id from public.tournaments where name='Directa 4')
      and phase='semifinal' order by match_number limit 1;
  select user_id into v_a from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted';
  select user_id into v_b from public.tournament_entry_members
    where entry_id=m.side_b_entry_id and status='accepted';
  select coins into v_coins from public.profiles where id=v_a;
  perform set_config('request.jwt.claim.sub',v_a::text,true);
  set local role authenticated;
  begin
    perform public.create_table('Prohibida',10,false,null,15,30);
    raise exception 'Se pudo abrir una mesa normal con cruce listo';
  exception when others then
    if sqlerrm='Se pudo abrir una mesa normal con cruce listo' then raise; end if;
  end;
  if (public.tournament_enter_match(m.id)->>'game_id') is not null then
    raise exception 'La partida empezó antes de que llegara el rival'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub',v_b::text,true);
  set local role authenticated;
  v_game := (public.tournament_enter_match(m.id)->>'game_id')::uuid;
  perform public.tournament_enter_match(m.id);
  reset role;
  if v_game is null or (select game_id from public.tournament_matches where id=m.id) <> v_game then
    raise exception 'No se creó la partida al llegar ambos'; end if;
  if (select coins from public.profiles where id=v_a) <> v_coins
     or (select bet from public.games where id=v_game) <> 0
     or (select count(*) from public.game_hands where game_id=v_game) <> 2 then
    raise exception 'La entrada cobró monedas, creó apuesta o duplicó manos';
  end if;
end $$;

-- Completar dos semis, final y tercer puesto mediante el cierre real; el
-- callback duplicado no suma dos victorias ni mueve monedas.
do $$
declare
m public.tournament_matches;
v_winner uuid;
v_id uuid;
v_before integer;
v_coins integer;
v_game uuid;
begin
  select id into v_id from public.tournaments where name='Directa 4';
  for m in select * from public.tournament_matches
    where tournament_id=v_id and phase='semifinal' order by match_number loop
    if m.game_id is null then
      perform set_config('request.jwt.claim.sub',(
        select user_id from public.tournament_entry_members
        where entry_id=m.side_a_entry_id and status='accepted')::text,true);
      perform public.tournament_enter_match(m.id);
      perform set_config('request.jwt.claim.sub',(
        select user_id from public.tournament_entry_members
        where entry_id=m.side_b_entry_id and status='accepted')::text,true);
      perform public.tournament_enter_match(m.id);
    end if;
    select game_id into v_game from public.tournament_matches where id=m.id;
    select user_id into v_winner from public.tournament_entry_members
      where entry_id=m.side_a_entry_id and status='accepted';
    select games_won,coins into v_before,v_coins from public.profiles where id=v_winner;
    perform set_config('request.jwt.claim.sub',v_winner::text,true);
    perform public.finish_game(v_game,v_winner,15,5);
    perform public.finish_game(v_game,v_winner,15,5);
    set local role authenticated;
    begin
      perform public.request_rematch(v_game);
      raise exception 'Una partida de torneo permitió revancha';
    exception when others then
      if sqlerrm not like '%no tienen revancha%' then raise; end if;
    end;
    reset role;
    if (select games_won from public.profiles where id=v_winner) <> v_before+1
       or (select coins from public.profiles where id=v_winner) <> v_coins
       or (select count(*) from public.objective_game_events where game_id=v_game) <> 2 then
      raise exception 'Resultado/misiones repetidos o apuesta pagada'; end if;
  end loop;
  if (select count(*) from public.tournament_matches
    where tournament_id=v_id and phase in ('final','third_place') and status='ready') <> 2 then
    raise exception 'No se abrieron final y tercer puesto tras las semis'; end if;
  for m in select * from public.tournament_matches
    where tournament_id=v_id and phase in ('final','third_place') loop
    perform set_config('request.jwt.claim.sub',(
      select user_id from public.tournament_entry_members
      where entry_id=m.side_a_entry_id and status='accepted')::text,true);
    perform public.tournament_enter_match(m.id);
    perform set_config('request.jwt.claim.sub',(
      select user_id from public.tournament_entry_members
      where entry_id=m.side_b_entry_id and status='accepted')::text,true);
    perform public.tournament_enter_match(m.id);
    select game_id into v_game from public.tournament_matches where id=m.id;
    select user_id into v_winner from public.tournament_entry_members
      where entry_id=m.side_a_entry_id and status='accepted';
    perform set_config('request.jwt.claim.sub',v_winner::text,true);
    perform public.finish_game(v_game,v_winner,15,3);
  end loop;
  if (select status from public.tournaments where id=v_id) <> 'completed' then
    raise exception 'No terminó después de final y tercer puesto'; end if;
end $$;

-- Grupos: seis cruces por grupo, luego dos semifinales cruzadas. Repetir un
-- resultado no altera la tabla y la semilla mantiene estable el orden.
do $$
declare
t uuid;
m public.tournament_matches;
v_group uuid;
v_order uuid[];
begin
  select id into t from public.tournaments where name='Grupos 8';
  for m in select * from public.tournament_matches
    where tournament_id=t and phase='group' order by round_number,match_number loop
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,null,null,'absence');
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,null,null,'absence');
  end loop;
  if (select count(*) from public.tournament_matches
      where tournament_id=t and phase='semifinal' and status='ready') <> 2 then
    raise exception 'No clasificaron dos por grupo'; end if;
  for v_group in select id from public.tournament_groups where tournament_id=t loop
    v_order := tournament_internal.group_order(v_group);
    if v_order is distinct from tournament_internal.group_order(v_group)
       or (select sum(wins) from public.tournament_group_members
           where group_id=v_group) <> 6 then
      raise exception 'Tabla de grupo no es determinista/idempotente'; end if;
  end loop;

  perform set_config('request.jwt.claim.sub',
    'bb100000-0000-4000-a000-000000000000',true);
  perform public.tournament_admin_pause(t,true);
  for m in select * from public.tournament_matches
    where tournament_id=t and phase='semifinal' loop
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,null,null,'absence');
  end loop;
  if exists(select 1 from public.tournament_matches
       where tournament_id=t and phase='final') then
    raise exception 'La pausa abrió otra ronda'; end if;
  perform public.tournament_admin_pause(t,false);
  if (select count(*) from public.tournament_matches
      where tournament_id=t and phase in ('final','third_place') and status='ready') <> 2 then
    raise exception 'La reanudación no abrió final y tercer puesto'; end if;
  for m in select * from public.tournament_matches
    where tournament_id=t and phase in ('final','third_place') loop
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,null,null,'absence');
  end loop;
  if (select status from public.tournaments where id=t) <> 'completed' then
    raise exception 'El torneo de grupos no se completó'; end if;
end $$;

do $$
declare
  t uuid;
  m public.tournament_matches;
begin
  select id into t from public.tournaments where name='Bye 5';
  select * into m from public.tournament_matches
    where tournament_id=t and status='ready' order by match_number limit 1;
  perform tournament_internal.settle_match(m.id,m.side_a_entry_id,null,null,'absence');
  if (select count(*) from public.tournament_matches
      where tournament_id=t and phase='semifinal' and status='ready') <> 2 then
    raise exception 'Los byes no avanzaron a semifinales'; end if;
end $$;

-- Expiración: un lado presente gana; ambos ausentes requieren revisión.
do $$
declare
t uuid;
m public.tournament_matches;
v_user uuid;
v_other uuid;
v_old_game uuid;
v_new_game uuid;
begin
  select id into t from public.tournaments where name='Ausencia 4';
  select * into m from public.tournament_matches where tournament_id=t
    and phase='semifinal' order by match_number limit 1;
  select user_id into v_user from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted';
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform public.tournament_enter_match(m.id);
  update public.tournament_matches set entry_deadline=now()-interval '1 second'
    where tournament_id=t;
  perform tournament_internal.advance_due();
  if (select status from public.tournament_matches where id=m.id) <> 'forfeit'
     or not exists(select 1 from public.tournament_matches
       where tournament_id=t and finish_reason='attendance_review') then
    raise exception 'Ausencias no se resolvieron correctamente'; end if;
  perform set_config('request.jwt.claim.sub',
    'bb100000-0000-4000-a000-000000000000',true);
  perform public.tournament_admin_retry_match((select id
    from public.tournament_matches where tournament_id=t
      and finish_reason='attendance_review' limit 1));
  if (select count(*) from public.tournament_matches
      where tournament_id=t and status='ready') <> 1 then
    raise exception 'No se reabrió el cruce detenido'; end if;

  select * into m from public.tournament_matches where tournament_id=t and status='ready';
  select user_id into v_user from public.tournament_entry_members
    where entry_id=m.side_a_entry_id and status='accepted';
  select user_id into v_other from public.tournament_entry_members
    where entry_id=m.side_b_entry_id and status='accepted';
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform public.tournament_enter_match(m.id);
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_old_game := (public.tournament_enter_match(m.id)->>'game_id')::uuid;
  update public.games set status='finished' where id=v_old_game;
  if (select finish_reason from public.tournament_matches where id=m.id) <> 'attendance_review' then
    raise exception 'La partida anulada no quedó detenida'; end if;
  perform set_config('request.jwt.claim.sub',
    'bb100000-0000-4000-a000-000000000000',true);
  perform public.tournament_admin_retry_match(m.id);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform public.tournament_enter_match(m.id);
  perform set_config('request.jwt.claim.sub',v_other::text,true);
  v_new_game := (public.tournament_enter_match(m.id)->>'game_id')::uuid;
  if v_new_game is null or v_new_game = v_old_game
     or (select count(*) from public.games where id in (v_old_game,v_new_game)) <> 2
     or (select count(*) from public.tables where id in (v_old_game,v_new_game)) <> 2 then
    raise exception 'La reapertura pisó la partida anulada: anterior %, nueva %, cantidad partidas %',
      v_old_game, v_new_game,
      (select count(*) from public.games where id in (v_old_game,v_new_game)); end if;
  set local role authenticated;
  begin
    perform public.request_rematch(v_old_game);
    raise exception 'Una partida anulada de torneo permitió revancha';
  exception when others then
    if sqlerrm not like '%no tienen revancha%' then raise; end if;
  end;
  reset role;
end $$;

rollback;
