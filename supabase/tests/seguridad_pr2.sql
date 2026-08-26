-- ============================================================
-- TRUCAZO — Prueba del PR 2: altas de usuario, reseñas y aviso de mesa
--
-- QUÉ ES ESTO: comprueba que las cuatro formas de darse de alta funcionan y
-- crean UN solo perfil, y después intenta abusar de las reseñas y del aviso de
-- Telegram de once maneras. Si algo le sale, corta con un error grande.
--
-- CÓMO SE CORRE (contra una base LOCAL, nunca contra producción):
--
--     psql -f supabase/tests/seguridad_pr2.sql
--
-- Termina en 0 si está todo bien. Deshace todo al final.
-- ============================================================

\set ON_ERROR_STOP on
\pset footer off

begin;

-- ------------------------------------------------------------
-- PARTE 1 — Las cuatro formas de darse de alta
-- ------------------------------------------------------------
do $$
declare
  fallas text[] := '{}';
  v_nombre text;
  v_monedas int;
  i int;
begin
  -- a) INVITADO: entra sin email y sin nombre. Antes esto reventaba el alta.
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-a000-000000000001',
          'authenticated','authenticated', null, '{}'::jsonb, now(), now());
  select username, coins into v_nombre, v_monedas
    from profiles where id = 'ff000000-0000-4000-a000-000000000001';
  if v_nombre is null then
    fallas := array_append(fallas, 'el invitado no recibió perfil');
  elsif v_nombre !~ '^Invitado[0-9]{4}$' then
    fallas := array_append(fallas, 'el invitado quedó con un nombre raro: ' || v_nombre);
  end if;
  if v_monedas <> 1000 then
    fallas := array_append(fallas, 'el invitado no arrancó con 1000 monedas');
  end if;

  -- b) REGISTRO con nombre elegido: se respeta tal cual.
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-a000-000000000002',
          'authenticated','authenticated','pp@ejemplo.test','{"username":"PruebaPedro"}'::jsonb, now(), now());
  select username into v_nombre from profiles where id = 'ff000000-0000-4000-a000-000000000002';
  if v_nombre is distinct from 'PruebaPedro' then
    fallas := array_append(fallas, 'no se respetó el nombre elegido: ' || coalesce(v_nombre,'(ninguno)'));
  end if;
  if not exists (
    select 1 from email_preferences
    where user_id = 'ff000000-0000-4000-a000-000000000002'
      and news_enabled and reengagement_enabled
  ) then
    fallas := array_append(fallas, 'el registro no creó las preferencias de email');
  end if;

  -- c) GOOGLE: sin nombre elegido, usa la parte de antes del arroba.
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-a000-000000000003',
          'authenticated','authenticated','pruebamaria@gmail.test','{"full_name":"Maria G"}'::jsonb, now(), now());
  select username into v_nombre from profiles where id = 'ff000000-0000-4000-a000-000000000003';
  if v_nombre is distinct from 'pruebamaria' then
    fallas := array_append(fallas, 'Google no usó el email: ' || coalesce(v_nombre,'(ninguno)'));
  end if;

  -- d) NOMBRE REPETIDO: no debe fallar el alta; se le agregan números.
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-a000-000000000004',
          'authenticated','authenticated','pp2@ejemplo.test','{"username":"pruebapedro"}'::jsonb, now(), now());
  select username into v_nombre from profiles where id = 'ff000000-0000-4000-a000-000000000004';
  if v_nombre is null then
    fallas := array_append(fallas, 'el alta con nombre repetido no creó perfil');
  elsif lower(v_nombre) = 'pruebapedro' then
    fallas := array_append(fallas, 'quedaron dos perfiles con el mismo nombre');
  end if;

  -- e) VARIOS INVITADOS SEGUIDOS: todos con nombre distinto.
  for i in 5..9 loop
    insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000',
            ('ff000000-0000-4000-a000-00000000000'||i)::uuid,
            'authenticated','authenticated', null, '{}'::jsonb, now(), now());
  end loop;
  if (select count(*) from profiles where id::text like 'ff0000%')
     <> (select count(distinct lower(username)) from profiles where id::text like 'ff0000%') then
    fallas := array_append(fallas, 'hay invitados con el mismo nombre');
  end if;

  -- f) UN SOLO PERFIL POR USUARIO.
  if exists (select 1 from profiles group by id having count(*) > 1) then
    fallas := array_append(fallas, 'hay usuarios con más de un perfil');
  end if;

  if array_length(fallas, 1) > 0 then
    raise exception E'ALTAS CON PROBLEMAS:\n  - %', array_to_string(fallas, E'\n  - ');
  end if;
  raise notice 'Altas: invitado, registro, Google y nombre repetido -> todas bien.';
end $$;

-- ------------------------------------------------------------
-- PARTE 2 — Abusos de las reseñas
-- ------------------------------------------------------------
do $$
declare
  yo   uuid := 'ff000000-0000-4000-a000-000000000002';
  otro uuid := 'ff000000-0000-4000-a000-000000000003';
  fallas text[] := '{}';
  entraron int := 0; i int;
begin
  perform set_config('request.jwt.claim.sub', yo::text, true);

  begin  -- adjuntar la imagen de otro
    perform public.submit_feedback(5,5,true,false,'x', array[otro::text||'/foto.jpg']);
    fallas := array_append(fallas, 'puede adjuntar la imagen de otro');
  exception when others then null; end;

  begin  -- salirse de la carpeta
    perform public.submit_feedback(5,5,true,false,'x', array[yo::text||'/../otro/f.jpg']);
    fallas := array_append(fallas, 'acepta rutas que se salen de la carpeta');
  exception when others then null; end;

  begin  -- comentario gigante
    perform public.submit_feedback(5,5,true,false, repeat('a', 5000), '{}');
    fallas := array_append(fallas, 'acepta un comentario gigante');
  exception when others then null; end;

  begin  -- demasiadas imágenes
    perform public.submit_feedback(5,5,true,false,'x',
      array[yo::text||'/a.jpg', yo::text||'/b.jpg', yo::text||'/c.jpg', yo::text||'/d.jpg']);
    fallas := array_append(fallas, 'acepta más imágenes de la cuenta');
  exception when others then null; end;

  begin  -- puntuación fuera de rango
    perform public.submit_feedback(9,5,true,false,'x','{}');
    fallas := array_append(fallas, 'acepta puntuaciones fuera de rango');
  exception when others then null; end;

  begin  -- sin sesión
    perform set_config('request.jwt.claim.sub', '', true);
    perform public.submit_feedback(5,5,true,false,'x','{}');
    fallas := array_append(fallas, 'acepta reseñas sin sesión');
  exception when others then null; end;
  perform set_config('request.jwt.claim.sub', yo::text, true);

  if array_length(fallas, 1) > 0 then
    raise exception E'RESEÑAS CON PROBLEMAS:\n  - %', array_to_string(fallas, E'\n  - ');
  end if;

  -- Y la reseña legítima tiene que entrar (si no, rompimos la función).
  perform public.submit_feedback(5,4,true,false,'Muy buen juego',
    array[yo::text||'/a1b2c3.jpg']);
  if not exists (select 1 from feedback where user_id = yo) then
    raise exception 'la reseña legítima no se guardó';
  end if;

  -- Freno anti-spam: unas pocas por hora.
  for i in 1..10 loop
    begin
      perform public.submit_feedback(5,5,true,false,'otra '||i,'{}');
      entraron := entraron + 1;
    exception when others then null; end;
  end loop;
  if entraron >= 10 then
    raise exception 'no hay ningún freno: entraron % reseñas seguidas', entraron;
  end if;

  raise notice 'Reseñas: 6 abusos rechazados, la legítima entra, y el freno corta el spam.';
end $$;

-- ------------------------------------------------------------
-- PARTE 3 — Abusos del aviso de mesa (Telegram)
-- ------------------------------------------------------------
do $$
declare
  yo   uuid := 'ff000000-0000-4000-a000-000000000002';
  otro uuid := 'ff000000-0000-4000-a000-000000000003';
  t tables%rowtype; v jsonb; fallas text[] := '{}';
begin
  update profiles set coins = 100000 where id in (yo, otro);
  perform set_config('request.jwt.claim.sub', yo::text, true);
  select * into t from public.create_table('Mesa de prueba PR2', 50, false, null, 30, 30);

  -- el primer aviso sale, y con datos de la BASE (no los que mande el navegador)
  v := public.claim_table_notification(t.id);
  if v is null then
    fallas := array_append(fallas, 'no deja avisar la primera vez');
  elsif v->>'creator' is distinct from (select username from profiles where id = yo) then
    fallas := array_append(fallas, 'el aviso no usa el nombre real del creador');
  end if;

  -- el segundo, no
  if public.claim_table_notification(t.id) is not null then
    fallas := array_append(fallas, 'avisa dos veces por la misma mesa');
  end if;

  -- la mesa de otro, no
  perform set_config('request.jwt.claim.sub', otro::text, true);
  if public.claim_table_notification(t.id) is not null then
    fallas := array_append(fallas, 'deja avisar por la mesa de otro');
  end if;

  -- una mesa privada, no
  select * into t from public.create_table('Privada PR2', 50, true, 'ZZPR2X', 30, 30);
  if public.claim_table_notification(t.id) is not null then
    fallas := array_append(fallas, 'avisa por mesas privadas');
  end if;

  -- una mesa inventada, no
  if public.claim_table_notification('00000000-0000-4000-a000-0000000000ff') is not null then
    fallas := array_append(fallas, 'avisa por una mesa que no existe');
  end if;

  if array_length(fallas, 1) > 0 then
    raise exception E'AVISO DE MESA CON PROBLEMAS:\n  - %', array_to_string(fallas, E'\n  - ');
  end if;
  raise notice 'Aviso de mesa: repetido, ajeno, privado e inventado -> todos rechazados.';
end $$;

rollback;

\echo ''
\echo '  ============================================'
\echo '   TODO BIEN — altas, reseñas y aviso de mesa'
\echo '  ============================================'
