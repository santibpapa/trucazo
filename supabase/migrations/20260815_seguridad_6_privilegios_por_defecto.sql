-- ============================================================
-- TRUCAZO — Seguridad (6): las funciones nuevas nacen cerradas
-- Fecha: 2026-08-15
--
-- Las cinco migraciones de seguridad anteriores cerraron los agujeros conocidos,
-- pero PostgreSQL seguía otorgando EXECUTE a PUBLIC al crear una función. Eso
-- permitía que un helper futuro volviera a quedar expuesto por omisión.
--
-- Esta migración:
--   1. cierra los defaults de todos los roles que hoy poseen funciones en public;
--   2. revoca la ejecución de todas las funciones actuales al navegador;
--   3. reabre únicamente las RPC que el código cliente usa;
--   4. deja get_login_email disponible sólo para service_role;
--   5. hace que los barridos rechacen intervalos peligrosos aun siendo internos.
--
-- No modifica ninguna migración ya aplicada. Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. DEFAULTS SEGUROS PARA FUNCIONES FUTURAS
--
-- ALTER DEFAULT PRIVILEGES aplica por rol creador. No suponemos que todo sea
-- propiedad de postgres: tomamos los dueños reales del catálogo y sumamos al rol
-- que ejecuta esta migración, por si todavía no posee ninguna función.
--
-- El revoke es GLOBAL para las funciones creadas por cada dueño. PostgreSQL
-- documenta que un REVOKE limitado con "in schema public" no puede quitar el
-- EXECUTE global que PUBLIC recibe por defecto; sólo desharía un GRANT específico
-- de ese schema y dejaría la puerta original abierta.
-- ------------------------------------------------------------

do $block$
declare
  v_owner    record;
  v_saltados text[] := '{}';
begin
  for v_owner in
    select distinct r.oid, r.rolname
    from (
      select p.proowner as role_oid
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace
      union
      select current_user::regrole::oid
    ) owners
    join pg_roles r on r.oid = owners.role_oid
  loop
    -- Solo se pueden tocar los defaults de un rol del que uno es miembro. En
    -- Supabase, el SQL Editor corre como `postgres`, que NO es superusuario: si
    -- alguna función de `public` pertenece a otro rol (pasa cuando hay una
    -- extensión instalada en ese schema), el ALTER falla con "permission denied
    -- to change default privileges" y, como todo esto va en una transacción, se
    -- caería la migración ENTERA sin explicar por qué.
    --
    -- Verificado en Postgres: corriendo como un rol no superusuario y con una
    -- función de otro dueño en `public`, el bloque abortaba. Por eso se saltean
    -- los dueños que no se pueden tocar y se avisa al final.
    if not pg_has_role(current_user, v_owner.oid, 'USAGE') then
      v_saltados := array_append(v_saltados, v_owner.rolname);
      continue;
    end if;

    execute format(
      'alter default privileges for role %I '
      'revoke execute on functions from public, anon, authenticated',
      v_owner.rolname
    );
  end loop;

  if array_length(v_saltados, 1) > 0 then
    raise notice
      'Aviso: no se pudieron cerrar los permisos por defecto de estos dueños: %. '
      'Son roles ajenos (normalmente de extensiones). Las funciones del juego SÍ '
      'quedaron cerradas; esto solo significa que, si ESE rol creara una función '
      'nueva en public, nacería abierta.',
      array_to_string(v_saltados, ', ');
  end if;
end;
$block$;

-- ------------------------------------------------------------
-- 2. DEFENSA EN PROFUNDIDAD PARA LOS BARRIDOS
--
-- Aunque estas funciones quedan inaccesibles para el cliente, un intervalo
-- negativo no debe poder transformar el mantenimiento en "borrar todo" si un
-- permiso se concede mal en el futuro. El máximo de siete días es muy superior
-- a los 10/15 minutos usados por los cron actuales.
-- ------------------------------------------------------------

create or replace function public.sweep_stale_games(p_minutes int default 10)
 returns int
 language plpgsql
 security definer
 set search_path = ''
as $function$
declare
  g record;
  n int := 0;
  cutoff timestamptz;
begin
  if p_minutes is null or p_minutes < 1 or p_minutes > 10080 then
    raise exception 'p_minutes debe estar entre 1 y 10080';
  end if;

  cutoff := now() - make_interval(mins => p_minutes);

  for g in
    select gm.*
    from public.games gm
    where gm.status = 'playing'
      and coalesce((
        select gp.last_seen_at
        from public.game_presence gp
        where gp.game_id = gm.id and gp.player_id = gm.player1_id
      ), gm.created_at) < cutoff
      and coalesce((
        select gp.last_seen_at
        from public.game_presence gp
        where gp.game_id = gm.id and gp.player_id = gm.player2_id
      ), gm.created_at) < cutoff
    for update
  loop
    update public.profiles
       set coins = coins + (g.bet / 2)
     where id = g.player1_id;

    update public.profiles
       set coins = coins + (g.bet / 2)
     where id = g.player2_id;

    update public.games
       set status = 'finished', winner_id = null, updated_at = now()
     where id = g.id;

    n := n + 1;
  end loop;

  return n;
end;
$function$;

create or replace function public.sweep_stale_tables(p_minutes int default 15)
 returns int
 language plpgsql
 security definer
 set search_path = ''
as $function$
declare
  t record;
  n int := 0;
  cutoff timestamptz;
begin
  if p_minutes is null or p_minutes < 1 or p_minutes > 10080 then
    raise exception 'p_minutes debe estar entre 1 y 10080';
  end if;

  cutoff := now() - make_interval(mins => p_minutes);

  for t in
    select tb.*
    from public.tables tb
    where tb.status = 'waiting'
      and tb.created_at < cutoff
    for update
  loop
    update public.profiles
       set coins = coins + t.bet
     where id = t.creator_id;

    delete from public.tables where id = t.id;
    n := n + 1;
  end loop;

  return n;
end;
$function$;

-- ------------------------------------------------------------
-- 3. CERRAR TODO LO ACTUAL Y REABRIR SÓLO LA API DEL CLIENTE
--
-- Los invitados creados con Supabase Auth usan el rol authenticated, por lo que
-- no se necesita conceder ninguna RPC a anon.
-- ------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

do $block$
declare
  -- CLIENT_RPC_ALLOWLIST_BEGIN
  v_client_functions constant text[] := array[
    'active_medal_for',
    'admin_stats',
    'advance_hand',
    'bot_join_table',
    'bot_step',
    'buy_accessory',
    'buy_frame',
    'buy_salon',
    'cancel_game_invite',
    'cancel_table',
    'claim_bonus',
    'clear_chat',
    'create_group',
    'create_table',
    'delete_chat_message',
    'delete_group',
    'delete_news',
    'ensure_lobby_tables',
    'envido_say',
    'forfeit',
    'get_active_medals',
    'get_campaign_map',
    'get_campaign_ranking',
    'get_community',
    'invite_friend',
    'invite_to_group',
    'irse_al_mazo',
    'join_table',
    'join_table_by_code',
    'kick_group_member',
    'leave_group',
    'play_card',
    'player_medals',
    'publish_news',
    'remove_friend',
    'request_rematch',
    'respond_envido',
    'respond_friend_request',
    'respond_game_invite',
    'respond_group_invite',
    'respond_truco',
    'send_chat_message',
    'send_friend_request',
    'set_active_accessory',
    'set_active_frame',
    'set_active_medal',
    'set_active_salon',
    'set_avatar_url',
    'sing_envido',
    'sing_truco',
    'start_campaign_duel',
    'start_game',
    'submit_feedback',
    'timeout_mazo',
    'touch_online',
    'touch_presence'
  ];
  -- CLIENT_RPC_ALLOWLIST_END
  v_missing text[];
  r record;
begin
  select array_agg(name order by name)
    into v_missing
    from unnest(v_client_functions) as wanted(name)
   where not exists (
     select 1
       from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname = wanted.name
   );

  if v_missing is not null then
    raise exception 'faltan RPC de la allowlist: %', array_to_string(v_missing, ', ');
  end if;

  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = any(v_client_functions)
  loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end;
$block$;

-- Única RPC usada con privilegios de servidor. La clave service_role permanece
-- exclusivamente en Vercel y nunca se expone al navegador.
grant execute on function public.get_login_email(text) to service_role;

commit;

-- Comprobaciones automatizadas: supabase/tests/seguridad_privilegios_funciones.sql
