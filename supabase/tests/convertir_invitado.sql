-- Solo en base descartable reconstruida. Se revierte todo al terminar.
-- Invitado que se convierte en cuenta: monedas hasta 1.000 y nombre a elegir.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'convertir invitado: %',detail; end if; end $$;

-- Elige el nombre como el usuario p_user; devuelve el nombre o el error.
create function pg_temp.try_choose(p_user uuid, p_name text, p_anon boolean default false) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub',p_user::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',p_user,'is_anonymous',p_anon)::text,true);
  set local role authenticated;
  begin
    v := public.choose_guest_account_name(p_name);
  exception when others then v := 'ERROR: ' || sqlerrm;
  end;
  reset role;
  return v;
end $$;

-- 1: invitado que perdió (80 monedas). 2: invitado que ganó (3.000).
-- 3: invitado que eligió nombre al entrar por un enlace. 4: cuenta común.
-- 5: invitado que sigue siendo invitado.
insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
  ('c1000000-0000-4000-a000-000000000001',null,true,'{}'),
  ('c1000000-0000-4000-a000-000000000002',null,true,'{}'),
  ('c1000000-0000-4000-a000-000000000003',null,true,'{"username":"Pepe Mesa"}'),
  ('c1000000-0000-4000-a000-000000000004','comun@test.invalid',false,'{"username":"Comun"}'),
  ('c1000000-0000-4000-a000-000000000005',null,true,'{}');
insert into public.profiles(id,username) values
  ('c1000000-0000-4000-a000-000000000001','Invitado4821'),
  ('c1000000-0000-4000-a000-000000000002','Invitado5932'),
  ('c1000000-0000-4000-a000-000000000003','Pepe Mesa'),
  ('c1000000-0000-4000-a000-000000000004','Comun'),
  ('c1000000-0000-4000-a000-000000000005','Invitado7777')
on conflict (id) do update set username=excluded.username;
update public.profiles set coins = 80 where id='c1000000-0000-4000-a000-000000000001';
update public.profiles set coins = 3000 where id='c1000000-0000-4000-a000-000000000002';
update public.profiles set coins = 40 where id='c1000000-0000-4000-a000-000000000003';
update public.profiles set coins = 50 where id='c1000000-0000-4000-a000-000000000004';

-- Historial del invitado 1 con su nombre copiado.
insert into public.game_history(player_id,opponent_id,opponent_username,result,coins_change) values
  ('c1000000-0000-4000-a000-000000000004','c1000000-0000-4000-a000-000000000001','Invitado4821','win',10);
insert into public.chat_messages(user_id,username,body) values
  ('c1000000-0000-4000-a000-000000000001','Invitado4821','buenas');

-- Antes de convertirse no hay nada pendiente y no puede elegir nombre.
select pg_temp.check((select not guest_name_pending from public.profiles where id='c1000000-0000-4000-a000-000000000001'), 'arranca sin nombre pendiente');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','ElTruco',true) like 'ERROR: Entrá con una cuenta registrada%', 'un invitado no elige nombre');

-- La conversión: Supabase pone is_anonymous en false.
update auth.users set is_anonymous=false, email='perdio@test.invalid' where id='c1000000-0000-4000-a000-000000000001';
update auth.users set is_anonymous=false, email='gano@test.invalid' where id='c1000000-0000-4000-a000-000000000002';
update auth.users set is_anonymous=false, email='pepe@test.invalid' where id='c1000000-0000-4000-a000-000000000003';

select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000001')=1000, 'con menos de 1.000 se completa hasta 1.000');
select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000002')=3000, 'con más de 1.000 se respeta');
select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000003')=1000, 'el de nombre elegido también recibe las monedas');
select pg_temp.check((select guest_name_pending from public.profiles where id='c1000000-0000-4000-a000-000000000001'), 'Invitado#### queda con nombre pendiente');
select pg_temp.check((select not guest_name_pending from public.profiles where id='c1000000-0000-4000-a000-000000000003'), 'quien ya eligió nombre no queda pendiente');

-- Otros cambios en auth.users no regalan monedas.
update auth.users set email='comun2@test.invalid' where id='c1000000-0000-4000-a000-000000000004';
update auth.users set raw_user_meta_data='{"x":1}' where id='c1000000-0000-4000-a000-000000000005';
select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000004')=50, 'una cuenta común no recibe monedas');
select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000005')=1000 and
  (select not guest_name_pending from public.profiles where id='c1000000-0000-4000-a000-000000000005'), 'un invitado que sigue siendo invitado no cambia');
-- Volver a guardar is_anonymous=false (sin cambio) no vuelve a disparar.
update public.profiles set coins = 10 where id='c1000000-0000-4000-a000-000000000002';
update auth.users set is_anonymous=false where id='c1000000-0000-4000-a000-000000000002';
select pg_temp.check((select coins from public.profiles where id='c1000000-0000-4000-a000-000000000002')=10, 'el regalo es una sola vez');

-- Rechazos al elegir nombre (el token todavía dice invitado: igual pasa,
-- porque se mira la tabla; el resto de las reglas son las de change_username).
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','ab') like 'ERROR: El nombre tiene que tener%', 'menos de 3 caracteres');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','Puto Amo') = 'ERROR: Ese nombre no está permitido', 'nombre con insulto');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','comun') = 'ERROR: Ese nombre de usuario ya está en uso', 'nombre ocupado');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000004','OtroComun') like 'ERROR: Ya elegiste tu nombre%', 'una cuenta común no la usa');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000003','Pepito') like 'ERROR: Ya elegiste tu nombre%', 'quien ya eligió al entrar no la usa');

-- La elección: copia el nombre y no gasta el cambio gratis.
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','  ElTruco  ') = 'ElTruco', 'devuelve el nombre elegido');
select pg_temp.check((select username='ElTruco' and not guest_name_pending and username_changed_at is null
  from public.profiles where id='c1000000-0000-4000-a000-000000000001'), 'perfil actualizado sin gastar el cambio gratis');
select pg_temp.check((select opponent_username from public.game_history where opponent_id='c1000000-0000-4000-a000-000000000001')='ElTruco', 'historial del rival');
select pg_temp.check((select username from public.chat_messages where user_id='c1000000-0000-4000-a000-000000000001')='ElTruco', 'chat');
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000001','OtraVez') like 'ERROR: Ya elegiste tu nombre%', 'una sola vez');

-- Quedarse con el nombre de invitado también vale: sólo saca el pendiente.
select pg_temp.check(pg_temp.try_choose('c1000000-0000-4000-a000-000000000002','Invitado5932') = 'Invitado5932', 'puede quedarse con su nombre');
select pg_temp.check((select not guest_name_pending from public.profiles where id='c1000000-0000-4000-a000-000000000002'), 'ya no queda pendiente');

-- Permisos.
select pg_temp.check(not has_function_privilege('anon','public.choose_guest_account_name(text)','execute'), 'anon no ejecuta choose_guest_account_name');
select pg_temp.check(has_function_privilege('authenticated','public.choose_guest_account_name(text)','execute'), 'authenticated ejecuta choose_guest_account_name');
select pg_temp.check(not has_function_privilege('authenticated','public._guest_converted()','execute'), 'nadie llama al trigger a mano');

\echo 'OK: convertir invitado'
rollback;
