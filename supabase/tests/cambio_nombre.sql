-- Solo en base descartable reconstruida. Se revierte todo al terminar.
-- Cambio de nombre desde el perfil: una sola vez, gratis, nombre viejo libre.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'cambio de nombre: %',detail; end if; end $$;

-- Intenta el cambio como el usuario p_user; devuelve el nombre o el error.
create function pg_temp.try_change(p_user uuid, p_name text, p_anon boolean default false) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub',p_user::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',p_user,'is_anonymous',p_anon)::text,true);
  set local role authenticated;
  begin
    v := public.change_username(p_name);
  exception when others then v := 'ERROR: ' || sqlerrm;
  end;
  reset role;
  return v;
end $$;

insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
  ('ca000000-0000-4000-a000-000000000001','nombre-a@test.invalid',false,'{"username":"viejoNombre"}'),
  ('ca000000-0000-4000-a000-000000000002','nombre-b@test.invalid',false,'{"username":"Ocupado"}'),
  ('ca000000-0000-4000-a000-000000000003','nombre-c@test.invalid',true,'{"username":"Invitado"}');
insert into public.profiles(id,username) values
  ('ca000000-0000-4000-a000-000000000001','viejoNombre'),
  ('ca000000-0000-4000-a000-000000000002','Ocupado'),
  ('ca000000-0000-4000-a000-000000000003','Invitado')
on conflict (id) do update set username=excluded.username;

-- Datos copiados con el nombre viejo.
insert into public.chat_messages(user_id,username,body) values
  ('ca000000-0000-4000-a000-000000000001','viejoNombre','hola');
insert into public.tables(name,creator_id,creator_username,bet) values
  ('Mesa de viejoNombre','ca000000-0000-4000-a000-000000000001','viejoNombre',10),
  ('Mesa del barrio','ca000000-0000-4000-a000-000000000001','viejoNombre',10);
insert into public.game_history(player_id,opponent_id,opponent_username,result,coins_change) values
  ('ca000000-0000-4000-a000-000000000002','ca000000-0000-4000-a000-000000000001','viejoNombre','win',10);

-- Rechazos antes de cambiar nada.
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000003','NuevoInvitado',true) like 'ERROR: Entrá con una cuenta registrada%', 'un invitado no puede cambiarse el nombre');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','ab') like 'ERROR: El nombre tiene que tener%', 'menos de 3 caracteres');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001',repeat('x',21)) like 'ERROR: El nombre tiene que tener%', 'más de 20 caracteres');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','Puto Amo') = 'ERROR: Ese nombre no está permitido', 'nombre con insulto');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','ocupado') = 'ERROR: Ese nombre de usuario ya está en uso', 'nombre ocupado, sin importar mayúsculas');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','viejoNombre') = 'ERROR: Ese ya es tu nombre', 'mismo nombre');
select pg_temp.check((select username_changed_at is null from public.profiles where id='ca000000-0000-4000-a000-000000000001'), 'los rechazos no gastan el cambio');

-- En medio de una partida 1v1 no se puede.
insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet) values
  ('ca000000-0000-4000-a000-0000000000aa','Mesa de Ocupado','ca000000-0000-4000-a000-000000000002','Ocupado','ca000000-0000-4000-a000-000000000001','viejoNombre',10);
insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,status) values
  ('ca000000-0000-4000-a000-0000000000aa','ca000000-0000-4000-a000-000000000001','ca000000-0000-4000-a000-000000000002','viejoNombre','Ocupado',
   'ca000000-0000-4000-a000-000000000001','ca000000-0000-4000-a000-000000000001',10,'playing');
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','Nuevo Nombre') = 'ERROR: Terminá tu partida antes de cambiar el nombre', 'partida en juego');
update public.games set status='finished' where id='ca000000-0000-4000-a000-0000000000aa';

-- El cambio, con espacios de más que se recortan.
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','  Nuevo Nombre  ') = 'Nuevo Nombre', 'el cambio devuelve el nombre nuevo');
select pg_temp.check((select username='Nuevo Nombre' and username_changed_at is not null from public.profiles where id='ca000000-0000-4000-a000-000000000001'), 'perfil actualizado y cambio registrado');
select pg_temp.check((select username from public.chat_messages where user_id='ca000000-0000-4000-a000-000000000001')='Nuevo Nombre', 'chat');
select pg_temp.check((select player1_username from public.games where id='ca000000-0000-4000-a000-0000000000aa')='Nuevo Nombre', 'partida terminada');
select pg_temp.check((select opponent_username from public.game_history where opponent_id='ca000000-0000-4000-a000-000000000001')='Nuevo Nombre', 'historial del rival');
select pg_temp.check((select count(*) from public.tables where creator_id='ca000000-0000-4000-a000-000000000001' and creator_username='Nuevo Nombre')=2, 'mesas propias');
select pg_temp.check((select opponent_username from public.tables where id='ca000000-0000-4000-a000-0000000000aa')='Nuevo Nombre', 'mesa como rival');
select pg_temp.check(exists(select 1 from public.tables where name='Mesa de Nuevo Nombre') and exists(select 1 from public.tables where name='Mesa del barrio'),
  'el nombre automático de la mesa se actualiza y el elegido a mano no');

-- Una sola vez.
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000001','Otro Nombre') like 'ERROR: Ya cambiaste tu nombre una vez%', 'segundo cambio');

-- El nombre viejo queda libre enseguida.
select pg_temp.check(pg_temp.try_change('ca000000-0000-4000-a000-000000000002','viejoNombre') = 'viejoNombre', 'otro jugador toma el nombre que quedó libre');

-- Un visitante sin cuenta no puede ni llamarla.
select pg_temp.check(not has_function_privilege('anon','public.change_username(text)','execute'), 'anon no ejecuta change_username');
select pg_temp.check(has_function_privilege('authenticated','public.change_username(text)','execute'), 'authenticated ejecuta change_username');

\echo 'OK: cambio de nombre'
rollback;
