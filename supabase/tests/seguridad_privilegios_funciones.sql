-- ============================================================
-- TRUCAZO — Prueba de permisos de funciones actuales y futuras
--
-- Ejecutar sólo contra una base LOCAL que ya tenga aplicada la migración
-- 20260815_seguridad_6_privilegios_por_defecto.sql.
-- ============================================================

\set ON_ERROR_STOP on
\pset footer off

begin;

do $test$
declare
  v_client_functions constant text[] := array[
    'active_medal_for', 'admin_player', 'admin_stats', 'advance_hand',
    'bot_join_table',
    'bot_step', 'buy_accessory', 'buy_frame', 'buy_salon',
    'cancel_game_invite', 'cancel_table', 'claim_bonus', 'claim_table_notification',
    'clear_chat',
    'create_group', 'create_table', 'delete_chat_message', 'delete_group',
    'delete_news', 'ensure_lobby_tables', 'envido_say', 'forfeit',
    'get_active_medals', 'get_campaign_map', 'get_campaign_ranking',
    'get_community', 'invite_friend', 'invite_to_group', 'irse_al_mazo',
    'join_table', 'join_table_by_code', 'kick_group_member', 'leave_group',
    'play_card', 'player_medals', 'publish_news', 'remove_friend',
    'request_rematch', 'respond_envido', 'respond_friend_request',
    'respond_game_invite', 'respond_group_invite', 'respond_truco',
    'send_chat_message', 'send_friend_request', 'set_active_accessory',
    'set_active_frame', 'set_active_medal', 'set_active_salon',
    'set_avatar_url', 'sing_envido', 'sing_truco', 'start_campaign_duel',
    'start_game', 'submit_feedback', 'timeout_mazo', 'touch_online',
    'touch_presence'
  ];
  v_bad text[];
  v_owner record;
  v_bad_minutes int;
  v_rejected boolean;
begin
  -- Toda función usada por el cliente debe existir, estar abierta para
  -- authenticated y cerrada para anon.
  select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
    into v_bad
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname = any(v_client_functions)
     and (
       not has_function_privilege('authenticated', p.oid, 'execute')
       or has_function_privilege('anon', p.oid, 'execute')
     );

  if v_bad is not null then
    raise exception 'RPC cliente con permisos incorrectos: %', array_to_string(v_bad, ', ');
  end if;

  select array_agg(name order by name)
    into v_bad
    from unnest(v_client_functions) as wanted(name)
   where not exists (
     select 1 from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.proname = wanted.name
   );

  if v_bad is not null then
    raise exception 'RPC cliente inexistentes: %', array_to_string(v_bad, ', ');
  end if;

  -- Todo lo que no es API cliente queda cerrado para ambos roles del navegador.
  select array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
    into v_bad
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not (p.proname = any(v_client_functions))
     and (
       has_function_privilege('authenticated', p.oid, 'execute')
       or has_function_privilege('anon', p.oid, 'execute')
       or p.proacl is null
       or exists (
         select 1
           from aclexplode(p.proacl) acl
          where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
       )
     );

  if v_bad is not null then
    raise exception 'funciones internas expuestas: %', array_to_string(v_bad, ', ');
  end if;

  -- El lookup de email es sólo servidor.
  if has_function_privilege('anon', 'public.get_login_email(text)', 'execute')
     or has_function_privilege('authenticated', 'public.get_login_email(text)', 'execute')
     or not has_function_privilege('service_role', 'public.get_login_email(text)', 'execute') then
    raise exception 'get_login_email no quedó exclusivo de service_role';
  end if;

  -- La actividad y la cola de email contienen datos internos. El navegador no
  -- puede llamarlas; el cron del servidor sí.
  if has_function_privilege('anon', 'public.email_recipient_activity(uuid[])', 'execute')
     or has_function_privilege('authenticated', 'public.email_recipient_activity(uuid[])', 'execute')
     or not has_function_privilege('service_role', 'public.email_recipient_activity(uuid[])', 'execute') then
    raise exception 'email_recipient_activity no quedó exclusiva de service_role';
  end if;
  if has_function_privilege('anon', 'public.claim_email_deliveries(jsonb,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_email_deliveries(jsonb,integer)', 'execute')
     or not has_function_privilege('service_role', 'public.claim_email_deliveries(jsonb,integer)', 'execute') then
    raise exception 'claim_email_deliveries no quedó exclusiva de service_role';
  end if;

  -- Cada dueño actual debe tener una entrada GLOBAL de default ACL sin EXECUTE
  -- para los roles del navegador ni para PUBLIC (grantee 0). Un revoke limitado
  -- al schema public no anula el grant global incorporado de PostgreSQL.
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
    -- Los dueños ajenos (roles de los que no somos miembros, típicamente de
    -- extensiones) no se pueden cerrar ni acá ni en la migración: PostgreSQL no
    -- deja cambiarles los defaults. Se avisan, pero no se toman como falla,
    -- porque si no la prueba quedaría en rojo para siempre sin nada que hacer.
    if not pg_has_role(current_user, v_owner.oid, 'USAGE') then
      raise notice 'Aviso: el rol % es ajeno y no se le pueden cerrar los defaults (no es una falla).',
        v_owner.rolname;
      continue;
    end if;

    if not exists (
      select 1
        from pg_default_acl d
       where d.defaclrole = v_owner.oid
         and d.defaclnamespace = 0
         and d.defaclobjtype = 'f'
    ) then
      raise exception 'el rol % no tiene default ACL cerrado para funciones', v_owner.rolname;
    end if;

    if exists (
      select 1
        from pg_default_acl d
        cross join lateral aclexplode(d.defaclacl) acl
       where d.defaclrole = v_owner.oid
         and d.defaclnamespace = 0
         and d.defaclobjtype = 'f'
         and acl.privilege_type = 'EXECUTE'
         and acl.grantee in (0, 'anon'::regrole::oid, 'authenticated'::regrole::oid)
    ) then
      raise exception 'el rol % todavía concede EXECUTE por defecto', v_owner.rolname;
    end if;
  end loop;

  -- Prueba conductual del default del rol que ejecuta la migración/test.
  execute $sql$
    create function public.__trucazo_default_acl_probe()
    returns integer language sql as 'select 1'
  $sql$;

  if has_function_privilege('anon', 'public.__trucazo_default_acl_probe()', 'execute')
     or has_function_privilege('authenticated', 'public.__trucazo_default_acl_probe()', 'execute') then
    raise exception 'una función nueva todavía nace abierta al navegador';
  end if;

  execute 'drop function public.__trucazo_default_acl_probe()';

  -- Incluso ejecutados por el dueño, los barridos deben rechazar valores que
  -- anteriormente convertían la limpieza en un borrado global.
  foreach v_bad_minutes in array array[null::int, -1, 0, 10081]
  loop
    v_rejected := false;
    begin
      perform public.sweep_stale_games(v_bad_minutes);
    exception when others then
      v_rejected := sqlerrm like 'p_minutes debe estar entre%';
    end;
    if not v_rejected then
      raise exception 'sweep_stale_games acepta p_minutes=%', v_bad_minutes;
    end if;

    v_rejected := false;
    begin
      perform public.sweep_stale_tables(v_bad_minutes);
    exception when others then
      v_rejected := sqlerrm like 'p_minutes debe estar entre%';
    end;
    if not v_rejected then
      raise exception 'sweep_stale_tables acepta p_minutes=%', v_bad_minutes;
    end if;
  end loop;

  raise notice 'Permisos actuales, defaults futuros y barridos: TODO CERRADO.';
end;
$test$;

rollback;

\echo ''
\echo '  =============================================='
\echo '   TODO CERRADO — permisos de funciones correctos'
\echo '  =============================================='
