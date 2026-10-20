-- Sólo PostgreSQL local reconstruido. Todo el fixture se revierte.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean,msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Eliminar cuenta: %',msg; end if; end $$;
create function pg_temp.player(i integer) returns uuid language sql immutable as $$
  select ('dd100000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid;
$$;
insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
select pg_temp.player(i),'delete-'||i||'@trucazo.com.ar',now(),false,
  jsonb_build_object('username','Eliminar'||i) from generate_series(0,60) i;
update public.profiles set is_admin=true where id=pg_temp.player(0);

-- Servidor exclusivamente: ni otra cuenta ni un invitado pueden iniciar el borrado.
do $$ begin
  perform pg_temp.check(not has_function_privilege('authenticated','public.prepare_account_deletion(uuid)','execute'),'RPC abierta');
  perform pg_temp.check(not has_function_privilege('anon','public.prepare_account_deletion(uuid)','execute'),'RPC anónima abierta');
  perform pg_temp.check(has_function_privilege('service_role','public.prepare_account_deletion(uuid)','execute'),'servidor sin permiso');
end $$;

-- Partida 1v1, historial ajeno, archivos antiguos/huérfanos, mensajes y analytics.
do $$ declare g uuid:=gen_random_uuid(); v_job uuid; v_again uuid; before_coins integer;
begin
  select coins into before_coins from public.profiles where id=pg_temp.player(2);
  insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
    values(g,'Mesa',pg_temp.player(1),'Eliminar1',pg_temp.player(2),'Eliminar2',100,'playing');
  insert into public.games(id,player1_id,player2_id,player1_username,player2_username,
    current_turn,mano_player,bet) values(g,pg_temp.player(1),pg_temp.player(2),'Eliminar1','Eliminar2',pg_temp.player(1),pg_temp.player(1),100);
  insert into public.game_presence(game_id,player_id) values(g,pg_temp.player(1));
  insert into public.game_hands(game_id,player_id,cards) values(g,pg_temp.player(1),'[]');
  insert into public.chat_messages(user_id,username,body) values(pg_temp.player(1),'Eliminar1','Mensaje privado');
  insert into public.feedback(user_id,comment,image_paths) values(pg_temp.player(1),'Datos personales',array['legacy-delete.jpg']);
  insert into storage.objects(bucket_id,name,owner) values
    ('avatars',pg_temp.player(1)::text||'/orphan.jpg',pg_temp.player(1)),
    ('feedback-images','legacy-delete.jpg',null),('avatars',pg_temp.player(2)::text||'/other.jpg',pg_temp.player(2));
  insert into public.analytics_visitors(visitor_id,first_source,first_medium,first_landing_path,last_user_id)
    values(g,'direct','none','/lobby',pg_temp.player(1));
  v_job:=public.prepare_account_deletion(pg_temp.player(1));
  v_again:=public.prepare_account_deletion(pg_temp.player(1));
  perform pg_temp.check(v_job=v_again,'reintento duplicó la solicitud');
  perform pg_temp.check(not exists(select 1 from public.profiles where id=pg_temp.player(1)),'perfil conservado');
  perform pg_temp.check(not exists(select 1 from public.games where id=g),'partida con UUID conservada');
  perform pg_temp.check((select coins=before_coins+100 from public.profiles where id=pg_temp.player(2)),'rival no cobró abandono');
  perform pg_temp.check(exists(select 1 from public.game_history where player_id=pg_temp.player(2)
    and opponent_id is null and opponent_username='Cuenta eliminada'),'se perdió historial ajeno o identidad no borrada');
  perform pg_temp.check(not exists(select 1 from public.feedback where user_id=pg_temp.player(1)),'reseña conservada');
  perform pg_temp.check(not exists(select 1 from public.analytics_visitors where visitor_id=g),'analytics conservada');
  perform pg_temp.check((select jsonb_array_length(objects)=2 from public.account_deletion_jobs where id=v_job),'inventario incompleto/archivo ajeno incluido');
  perform pg_temp.check(exists(select 1 from storage.objects where owner=pg_temp.player(1)),'SQL borró sólo metadata de Storage');
  perform pg_temp.check(exists(select 1 from auth.users where id=pg_temp.player(1)),'Auth se borró antes de archivos');
end $$;

-- Un evento recibido después de preparar el borrado no recrea analytics,
-- aunque el usuario de Auth todavía exista durante el reintento de Storage.
do $$ declare visitor uuid:=gen_random_uuid(); begin
  perform public.record_analytics_event(gen_random_uuid(),visitor,gen_random_uuid(),
    'page_view','/eliminar-cuenta',pg_temp.player(1),'direct','none',null,null,null,
    'AR','Celular','Chrome','Android','{}'::jsonb);
  perform pg_temp.check(not exists(select 1 from public.analytics_visitors
    where visitor_id=visitor),'visita tardía recreó analytics');
end $$;

-- Un token todavía válido no puede recrear el perfil ni subir archivos.
do $$ declare rejected boolean:=false; visible boolean;
begin
  perform set_config('request.jwt.claim.sub',pg_temp.player(1)::text,true);
  set local role authenticated;
  begin insert into public.profiles(id,username) values(pg_temp.player(1),'OtraVez');
    exception when insufficient_privilege then rejected:=true; end;
  reset role;
  perform pg_temp.check(rejected,'token viejo recreó el perfil');
  rejected:=false;
  set local role authenticated;
  begin insert into storage.objects(bucket_id,name,owner)
    values('avatars',pg_temp.player(1)::text||'/new.jpg',pg_temp.player(1));
    exception when insufficient_privilege then rejected:=true; end;
  reset role;
  perform pg_temp.check(rejected,'token viejo subió archivo');
  set local role authenticated;
  select exists(select 1 from public.account_deletion_jobs) into visible;
  reset role;
  perform pg_temp.check(not visible,'cola visible para cliente');
end $$;

-- Liderazgo y apuestas ajenas; una mesa 2v2 pendiente devuelve lo cobrado.
do $$ declare grp uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); before_coins integer;
begin
  insert into public.groups(id,name,leader_id) values(grp,'Grupo persistente',pg_temp.player(3));
  insert into public.group_members(user_id,group_id) values(pg_temp.player(3),grp),(pg_temp.player(4),grp);
  insert into public.team_tables(id,creator_id,name,bet,target_score,time_limit)
    values(t,pg_temp.player(3),'Sala',10,15,30);
  insert into public.team_seats(table_id,user_id,seat,username,paid)
    values(t,pg_temp.player(3),0,'Eliminar3',10),(t,pg_temp.player(4),2,'Eliminar4',10);
  select coins into before_coins from public.profiles where id=pg_temp.player(4);
  perform public.prepare_account_deletion(pg_temp.player(3));
  perform pg_temp.check((select leader_id=pg_temp.player(4) from public.groups where id=grp),'se disolvió grupo ajeno');
  perform pg_temp.check((select coins=before_coins+10 from public.profiles where id=pg_temp.player(4)),'no devolvió apuesta');
  perform pg_temp.check((select status='cancelled' and creator_id is null from public.team_tables where id=t),'sala pendiente viva');
  perform pg_temp.check(exists(select 1 from public.team_seats where table_id=t and user_id is null
    and username='Cuenta eliminada' and avatar_url is null),'asiento no anonimizado');
end $$;

-- 2v2 en curso, con bots, conserva asiento, paga al equipo contrario una vez.
do $$ declare t uuid:=gen_random_uuid(); before_coins integer; before_partner integer;
begin
  insert into public.team_tables(id,creator_id,name,bet,target_score,time_limit,status)
    values(t,pg_temp.player(5),'Equipo normal',10,15,30,'playing');
  insert into public.team_seats(table_id,user_id,seat,username,paid) values
    (t,pg_temp.player(5),0,'Eliminar5',10),(t,pg_temp.player(6),1,'Eliminar6',10),
    (t,null,2,'Bot',0),(t,pg_temp.player(7),3,'Eliminar7',10);
  insert into public.team_games(id) values(t);
  select coins into before_coins from public.profiles where id=pg_temp.player(6);
  perform public.prepare_account_deletion(pg_temp.player(5));
  perform public.prepare_account_deletion(pg_temp.player(5));
  perform pg_temp.check((select status='finished' from public.team_tables where id=t),'equipo quedó jugando');
  perform pg_temp.check((select winner_team=1 from public.team_games where id=t),'ganó equipo incorrecto');
  perform pg_temp.check((select coins=before_coins+20 from public.profiles where id=pg_temp.player(6)),'pago incorrecto/duplicado');
end $$;

create function pg_temp.add_entry(t uuid,i integer,team boolean default false,status text default 'active') returns uuid
language plpgsql as $$ declare e uuid; begin
  insert into public.tournament_entries(tournament_id,status,kind,created_by)
    values(t,status,case when team then 'team' else 'solo' end,pg_temp.player(i)) returning id into e;
  insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
    values(t,e,pg_temp.player(i),'captain','accepted',now());
  if team then insert into public.tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at)
    values(t,e,pg_temp.player(i+1),'invitee','accepted',now()); end if;
  if status='active' then insert into public.tournament_checkins(tournament_id,entry_id,confirmed_by)
    values(t,e,pg_temp.player(i)); end if;
  return e;
end $$;
create function pg_temp.make_tournament(name text,mode text,capacity integer) returns uuid
language plpgsql as $$ declare t uuid; begin
  insert into public.tournaments(name,mode,format,capacity,target_score,starts_at,status,published_at,created_by,updated_by)
    values(name,mode,'knockout',capacity,15,now()+interval '20 minutes','published',now(),pg_temp.player(0),pg_temp.player(0)) returning id into t;
  return t;
end $$;
create function pg_temp.start_tournament(t uuid) returns void language plpgsql as $$ begin
  alter table public.tournaments disable trigger tournaments_validate_future_start;
  update public.tournaments set starts_at=now()-interval '1 minute' where id=t;
  alter table public.tournaments enable trigger tournaments_validate_future_start;
  perform set_config('request.jwt.claim.sub',pg_temp.player(0)::text,true);
  perform public.tournament_admin_start(t);
end $$;

-- Eliminar después de apertura de check-in también libera cupo y asciende espera.
do $$ declare t uuid; e uuid; waitlisted uuid;
begin
  t:=pg_temp.make_tournament('Baja publicada','1v1',4);
  e:=pg_temp.add_entry(t,8); perform pg_temp.add_entry(t,9); perform pg_temp.add_entry(t,10); perform pg_temp.add_entry(t,11);
  waitlisted:=pg_temp.add_entry(t,12,false,'waitlisted');
  perform public.prepare_account_deletion(pg_temp.player(8));
  perform pg_temp.check((select status='withdrawn' from public.tournament_entries where id=e),'inscripción sigue activa');
  perform pg_temp.check((select status='active' from public.tournament_entries where id=waitlisted),'no ascendió lista de espera');
end $$;

-- Torneo 1v1 vivo: se puede seguir hasta entregar premios después del borrado.
do $$ declare t uuid; m record; g uuid; own_entry uuid; other_entry uuid; v_user uuid;
begin
  t:=pg_temp.make_tournament('Baja en 1v1','1v1',4);
  own_entry:=pg_temp.add_entry(t,13); perform pg_temp.add_entry(t,14); perform pg_temp.add_entry(t,15); perform pg_temp.add_entry(t,16);
  perform pg_temp.start_tournament(t);
  select * into m from public.tournament_matches where tournament_id=t and own_entry in (side_a_entry_id,side_b_entry_id);
  for v_user in select em.user_id from public.tournament_entry_members em
    where em.entry_id in (m.side_a_entry_id,m.side_b_entry_id) loop
    perform set_config('request.jwt.claim.sub',v_user::text,true); perform public.tournament_enter_match(m.id);
  end loop;
  perform public.prepare_account_deletion(pg_temp.player(13));
  perform pg_temp.check((select status in ('finished','forfeit') and game_id is null from public.tournament_matches where id=m.id),'cruce vivo quedó trabado');
  -- La otra semifinal, final y tercer puesto siguen avanzando.
  loop
    select * into m from public.tournament_matches where tournament_id=t and status in ('pending','ready')
      order by round_number,match_number limit 1;
    exit when not found;
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,15,5,'test');
  end loop;
  perform pg_temp.check((select status='completed' from public.tournaments where id=t),'torneo no finalizó');
  perform pg_temp.check(not exists(select 1 from public.tournament_awards where user_id=pg_temp.player(13)),'premio a cuenta borrada');
  perform pg_temp.check(not exists(select 1 from public.tournament_matches where tournament_id=t
    and (side_a_username like '%Eliminar13%' or side_b_username like '%Eliminar13%')),'nombre congelado conservado');
end $$;

-- Torneo 2v2 vivo: guardia de asientos permite limpiar identidad sólo al cerrar.
do $$ declare t uuid; own_entry uuid; m record; v_user uuid; v_table uuid;
begin
  t:=pg_temp.make_tournament('Baja en 2v2','2v2',8);
  own_entry:=pg_temp.add_entry(t,17,true); perform pg_temp.add_entry(t,19,true);
  perform pg_temp.add_entry(t,21,true); perform pg_temp.add_entry(t,23,true);
  perform pg_temp.start_tournament(t);
  select * into m from public.tournament_matches where tournament_id=t and own_entry in (side_a_entry_id,side_b_entry_id);
  for v_user in select em.user_id from public.tournament_entry_members em
    where em.entry_id in (m.side_a_entry_id,m.side_b_entry_id) loop
    perform set_config('request.jwt.claim.sub',v_user::text,true); perform public.tournament_enter_match(m.id);
  end loop;
  select team_game_id into v_table from public.tournament_matches where id=m.id;
  perform public.prepare_account_deletion(pg_temp.player(17));
  perform pg_temp.check((select status='finished' from public.team_tables where id=v_table),'mesa de torneo no cerró');
  perform pg_temp.check(exists(select 1 from public.team_seats where table_id=v_table and user_id is null
    and username='Cuenta eliminada'),'guardia impidió limpiar asiento');
  loop
    select * into m from public.tournament_matches where tournament_id=t and status in ('pending','ready')
      order by round_number,match_number limit 1; exit when not found;
    perform tournament_internal.settle_match(m.id,m.side_a_entry_id,15,5,'test');
  end loop;
  perform pg_temp.check((select status='completed' from public.tournaments where id=t),'torneo 2v2 no finalizó');
  perform pg_temp.check(not exists(select 1 from public.tournament_awards where user_id=pg_temp.player(17)),'premio nulo/ajeno');
end $$;

-- Grupo con tres cuentas eliminadas: clasifica sólo el lugar que queda vivo,
-- los cruces entre retirados no fabrican victorias ni bloquean la llave.
do $$ declare t uuid; grp uuid; member record; m public.tournament_matches; alive uuid;
begin
  t:=pg_temp.make_tournament('Grupo casi vacío','1v1',8);
  update public.tournaments set format='groups' where id=t;
  for i in 30..37 loop perform pg_temp.add_entry(t,i); end loop;
  perform pg_temp.start_tournament(t);
  select id into grp from public.tournament_groups where tournament_id=t order by group_number limit 1;
  for member in select em.user_id from public.tournament_group_members gm
    join public.tournament_entry_members em on em.entry_id=gm.entry_id
    where gm.group_id=grp order by em.user_id limit 3 loop
    perform public.prepare_account_deletion(member.user_id);
  end loop;
  perform pg_temp.check(not exists(select 1 from public.tournament_matches match
    join public.tournament_entries e on e.id=match.winner_entry_id
    where match.tournament_id=t and match.phase='group' and e.status='disqualified'
      and match.finish_reason='both_disqualified'),'se inventó un ganador retirado');
  loop
    select * into m from public.tournament_matches where tournament_id=t and status in ('ready','pending')
      order by round_number,match_number limit 1; exit when not found;
    select id into alive from public.tournament_entries where id in (m.side_a_entry_id,m.side_b_entry_id)
      and status='active' order by id limit 1;
    perform pg_temp.check(alive is not null,'cruce nuevo sin jugadores vivos');
    perform tournament_internal.settle_match(m.id,alive,15,5,'test');
  end loop;
  perform pg_temp.check((select status='completed' from public.tournaments where id=t),'grupo vacío trabó torneo');
  perform pg_temp.check(not exists(select 1 from public.tournament_entry_members em
    join public.tournament_awards award on award.entry_id=em.entry_id
    where em.tournament_id=t and em.identity_deleted),'premio a inscripción retirada');
end $$;

-- Dos lados borrados durante una pausa: al reanudar se propaga un lugar vacío
-- y el otro finalista recibe un bye. No necesita un administrador para resolverlo.
do $$ declare t uuid; m public.tournament_matches; member record;
begin
  t:=pg_temp.make_tournament('Bajas durante pausa','1v1',4);
  for i in 40..43 loop perform pg_temp.add_entry(t,i); end loop;
  perform pg_temp.start_tournament(t);
  update public.tournaments set paused_at=now() where id=t;
  select * into m from public.tournament_matches where tournament_id=t order by match_number limit 1;
  for member in select em.user_id from public.tournament_entry_members em
    where em.entry_id in (m.side_a_entry_id,m.side_b_entry_id) loop
    perform public.prepare_account_deletion(member.user_id);
  end loop;
  perform pg_temp.check((select paused_at is not null from public.tournaments where id=t),'borrado reanudó torneo');
  perform set_config('request.jwt.claim.sub',pg_temp.player(0)::text,true);
  perform public.tournament_admin_pause(t,false);
  perform pg_temp.check((select status='forfeit' and winner_entry_id is null
    from public.tournament_matches where id=m.id),'doble baja inventó ganador');
  select * into m from public.tournament_matches where tournament_id=t and status='ready';
  perform tournament_internal.settle_match(m.id,m.side_a_entry_id,15,5,'test');
  perform pg_temp.check((select status='completed' from public.tournaments where id=t),'bye nulo trabó final');
  perform pg_temp.check(exists(select 1 from public.tournament_matches where tournament_id=t
    and phase='final' and status='forfeit' and winner_entry_id=m.side_a_entry_id and loser_entry_id is null),'final no concedió lugar vacante');
end $$;

-- Admin histórico también puede borrarse, manteniendo torneos ajenos.
do $$ begin
  perform public.prepare_account_deletion(pg_temp.player(0));
  perform pg_temp.check(not exists(select 1 from public.profiles where id=pg_temp.player(0)),'admin bloqueado por FK');
  perform pg_temp.check(exists(select 1 from public.tournaments where name='Baja en 2v2' and created_by is null),'se borró torneo ajeno');
end $$;

-- Lease: dos ejecuciones no reclaman simultáneamente la misma solicitud.
do $$ declare a public.account_deletion_jobs; b public.account_deletion_jobs; j uuid;
begin
  select id into j from public.account_deletion_jobs where user_id=pg_temp.player(1);
  select * into a from public.claim_account_deletions(j);
  select * into b from public.claim_account_deletions(j);
  perform pg_temp.check(a.id=j and a.lease_id is not null,'no reclamó solicitud');
  perform pg_temp.check(b.id is null,'dos workers reclamaron el mismo trabajo');
  update public.account_deletion_jobs set locked_until=now()-interval '1 second' where id=j;
  select * into b from public.claim_account_deletions(j);
  perform pg_temp.check(b.lease_id<>a.lease_id,'no recuperó ejecución interrumpida');
end $$;
rollback;
