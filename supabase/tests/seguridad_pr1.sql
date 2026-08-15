-- ============================================================
-- TRUCAZO — Prueba de seguridad: los agujeros cerrados siguen cerrados
--
-- QUÉ ES ESTO: un archivo que INTENTA hacer trampa de nueve maneras distintas.
-- Si alguna le sale, corta con un error bien grande. Si ninguna le sale, imprime
-- "TODO CERRADO" al final.
--
-- Sirve para que estos agujeros no vuelvan sin que nos demos cuenta: cada vez
-- que se toque el backend, se corre esto y listo.
--
-- CÓMO SE CORRE (contra una base LOCAL de prueba, nunca contra producción):
--
--     psql -f supabase/tests/seguridad_pr1.sql
--
-- Se puede correr muchas veces seguidas: arma sus propios datos y limpia lo suyo.
--
-- ⚠️ NO correr contra la base de producción: crea usuarios y partidas de mentira.
-- ============================================================

\set ON_ERROR_STOP on
\pset footer off

begin;

-- ------------------------------------------------------------
-- Datos de prueba: dos jugadores y un "atacante"
-- ------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-a000-000000000001','authenticated','authenticated','test-ana@ejemplo.test',  now(), now()),
  ('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-a000-000000000002','authenticated','authenticated','test-juan@ejemplo.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-a000-000000000003','authenticated','authenticated','test-mala@ejemplo.test', now(), now())
on conflict (id) do nothing;

-- Ojo con el "on conflict": el trigger handle_new_user ya creó el perfil con el
-- nombre sacado del email, así que hay que pisar TAMBIÉN el username. Si no, los
-- perfiles quedan con otro nombre y las búsquedas de más abajo no encuentran
-- nada — con lo cual los ataques no se ejecutan y la prueba pasa en falso.
insert into public.profiles (id, username, coins) values
  ('ee000000-0000-4000-a000-000000000001','TestAna',  100000),
  ('ee000000-0000-4000-a000-000000000002','TestJuan', 100000),
  ('ee000000-0000-4000-a000-000000000003','TestMala', 100000)
on conflict (id) do update set username = excluded.username, coins = 100000;

-- Ana arma una mesa privada; Ana y Juan arrancan una partida pública aparte.
select set_config('request.jwt.claim.sub','ee000000-0000-4000-a000-000000000001',false) \gset
select id as t_priv from public.create_table('Privada de prueba', 100, true, 'ZZTEST', 30, 30) \gset
select id as t_pub  from public.create_table('Publica de prueba', 100, false, null, 30, 30) \gset
select set_config('request.jwt.claim.sub','ee000000-0000-4000-a000-000000000002',false) \gset
select id from public.join_table(:'t_pub') \gset
select id from public.start_game(:'t_pub') \gset

-- ------------------------------------------------------------
-- A partir de acá actúa el atacante, con el rol real del navegador.
-- ------------------------------------------------------------
select set_config('request.jwt.claim.sub','ee000000-0000-4000-a000-000000000003',false) \gset

do $$
declare
  -- Buscamos las mesas por su nombre (la partida tiene el mismo id que la mesa).
  -- Si alguno de los dos quedara en null, los ataques no se ejecutarían y la
  -- prueba pasaría en falso, así que abajo se verifica que no lo estén.
  v_priv uuid := (select id from tables where private_code = 'ZZTEST');
  v_pub  uuid := (select id from tables where name = 'Publica de prueba'
                   order by created_at desc limit 1);
  mala   uuid := 'ee000000-0000-4000-a000-000000000003';
  juan   uuid := 'ee000000-0000-4000-a000-000000000002';
  n      int;
  fallas text[] := '{}';
begin
  -- Red de seguridad de la propia prueba: si los datos no quedaron armados, los
  -- ataques no probarían nada y esto pasaría en verde sin haber intentado nada.
  if v_priv is null or v_pub is null
     or (select count(*) from games where id = v_pub) = 0 then
    raise exception 'la prueba no se armó bien (mesa privada=%, partida=%)', v_priv, v_pub;
  end if;

  perform set_config('request.jwt.claim.sub', mala::text, true);

  -- 1) Leer el código de una mesa privada ajena
  set local role authenticated;
  select count(*) into n from tables where is_private;
  if n > 0 then fallas := array_append(fallas, 'puede ver mesas privadas ajenas'); end if;
  reset role;

  -- 2) Entrar a una mesa privada sabiendo el UUID
  begin
    set local role authenticated;
    perform public.join_table(v_priv);
    fallas := array_append(fallas, 'entra a una mesa privada con el UUID');
  exception when others then null;
  end;
  reset role;

  -- 3) Entrar con un código inventado
  begin
    set local role authenticated;
    perform public.join_table_by_code('NOEXIS');
    fallas := array_append(fallas, 'entra con un codigo inventado');
  exception when others then null;
  end;
  reset role;

  -- 4) Terminar la partida y cobrar el pozo.
  --    OJO: esto hay que intentarlo como UN JUGADOR DE ESA PARTIDA, no como un
  --    tercero. A un tercero lo frena otra validación que ya existía ("no sos
  --    jugador"), así que probándolo con el atacante la prueba pasaría siempre
  --    aunque el agujero estuviera abierto. El exploit real es el jugador que se
  --    declara ganador sin jugar.
  begin
    perform set_config('request.jwt.claim.sub', juan::text, true);
    set local role authenticated;
    perform public.finish_game(v_pub, juan, 0, 30);
    fallas := array_append(fallas, 'un jugador puede declararse ganador con finish_game');
  exception when others then null;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', mala::text, true);
  -- Y por las dudas: la partida tiene que seguir en juego.
  if (select status from games where id = v_pub) <> 'playing' then
    fallas := array_append(fallas, 'la partida quedó terminada a dedo');
  end if;

  -- 5) Barrer partidas y mesas de todos
  begin
    set local role authenticated;
    perform public.sweep_stale_games(-60);
    fallas := array_append(fallas, 'puede llamar a sweep_stale_games');
  exception when others then null;
  end;
  reset role;
  begin
    set local role authenticated;
    perform public.sweep_stale_tables(-60);
    fallas := array_append(fallas, 'puede llamar a sweep_stale_tables');
  exception when others then null;
  end;
  reset role;

  -- 6) Darse una medalla
  begin
    set local role authenticated;
    perform public.award_event_medals(mala, true);
    fallas := array_append(fallas, 'puede darse medallas');
  exception when others then null;
  end;
  reset role;

  -- 7) Sacar el email a partir del nombre de usuario
  begin
    set local role authenticated;
    perform public.get_login_email('TestAna');
    fallas := array_append(fallas, 'puede sacar el email de un usuario');
  exception when others then null;
  end;
  reset role;

  -- 8) Leer la partida de otros dos
  begin
    set local role authenticated;
    perform public.start_game(v_pub);
    fallas := array_append(fallas, 'puede leer una partida ajena');
  exception when others then null;
  end;
  reset role;

  -- 9) Llamar al registro interno de estilo
  begin
    set local role authenticated;
    perform public._record_style(v_pub, 'hand_played');
    fallas := array_append(fallas, 'puede llamar a _record_style');
  exception when others then null;
  end;
  reset role;

  -- 10) LO MÁS IMPORTANTE: las cartas del rival
  set local role authenticated;
  select count(*) into n from game_hands;
  if n > 0 then fallas := array_append(fallas, 'VE LAS CARTAS DE OTROS'); end if;
  reset role;

  if array_length(fallas, 1) > 0 then
    raise exception E'HAY AGUJEROS ABIERTOS:\n  - %', array_to_string(fallas, E'\n  - ');
  end if;

  raise notice 'Los 10 intentos de trampa fueron rechazados.';
end $$;

-- ------------------------------------------------------------
-- Y que lo legítimo siga andando (si esto falla, rompimos el juego)
-- ------------------------------------------------------------
do $$
declare t tables%rowtype; c_antes int; c_despues int;
  juan uuid := 'ee000000-0000-4000-a000-000000000002';
begin
  perform set_config('request.jwt.claim.sub', juan::text, true);
  select coins into c_antes from profiles where id = juan;
  select * into t from public.join_table_by_code('  zztest  ');  -- con espacios y minúsculas
  select coins into c_despues from profiles where id = juan;

  if t.opponent_id is distinct from juan then
    raise exception 'el codigo correcto NO deja entrar';
  end if;
  if c_antes - c_despues <> t.bet then
    raise exception 'la apuesta no se descontó exactamente una vez (% -> %)', c_antes, c_despues;
  end if;
  raise notice 'El código correcto entra y descuenta una sola apuesta.';
end $$;

rollback;   -- no dejamos nada de la prueba en la base

\echo ''
\echo '  ================================'
\echo '   TODO CERRADO — la prueba pasó'
\echo '  ================================'
