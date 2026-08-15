-- ============================================================
-- TRUCAZO — Seguridad (2 de 5): cerrar las funciones que el cliente no usa
-- Fecha: 2026-08-15
--
-- POR QUÉ HACÍA FALTA: Postgres, al crear una función, le da permiso de
-- ejecución a TODO EL MUNDO por defecto. La migración
-- 20260701_cerrar_funciones_internas.sql cerró una lista cerrada de nombres;
-- todo lo que se creó después quedó abierto sin que se notara. Por eso el
-- estado real hay que mirarlo en el catálogo (pg_proc), no en el historial de
-- migraciones.
--
-- LO QUE SE ENCONTRÓ ATACANDO LA BASE (todo reproducido, no inferido):
--
--   * finish_game(...)  ← EL MÁS GRAVE
--     Es la función que termina la partida y paga el pozo. El cliente NO la
--     llama nunca (la llaman advance_hand, forfeit y timeout_mazo por dentro),
--     pero estaba abierta. En la prueba, un jugador que no había tirado una sola
--     carta llamó a finish_game declarándose ganador 30 a 0 y se llevó el pozo:
--     500 monedas apostadas -> 1500 en la cuenta. Cualquiera podía ganar todas
--     las partidas que quisiera.
--
--   * sweep_stale_games(int) / sweep_stale_tables(int)
--     Son el barrido de limpieza que corre el cron. Estaban abiertas Y reciben
--     los minutos por parámetro: con un número NEGATIVO la ventana se da vuelta
--     y barre todo. En la prueba, un usuario cualquiera anuló la partida en
--     curso de otras dos personas y borró las mesas que estaban esperando rival.
--
--   * award_event_medals(uuid, boolean)
--     Recibe a quién premiar y si darle la Barrida. En la prueba, un usuario se
--     otorgó la medalla Barrida sin haberla ganado nunca.
--
--   * _record_style(uuid, text)
--     Ayudante interna que registra el estilo de juego del humano (lo usa el
--     cerebro del bot para leerte). Estaba abierta: se podía ensuciar el
--     registro a gusto.
--
--   * Funciones de trigger (award_medals_on_*): no las llama nadie a mano.
--
-- POR QUÉ ESTO NO ROMPE NADA: las funciones "security definer" corren como su
-- DUEÑO, que conserva el permiso. O sea que advance_hand puede seguir llamando a
-- finish_game por dentro, y los triggers siguen repartiendo medallas. Lo único
-- que se corta es que las llame un navegador. El cron corre como postgres, así
-- que el barrido automático sigue funcionando igual.
--
-- Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. CERRAR LO QUE NO ES PARA EL CLIENTE
--
-- Se recorre por firma real (regprocedure) para no escribir los tipos a mano y
-- para que no falle si alguna firma cambió. Si una función no existe, se saltea.
-- ------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        -- economía y fin de partida (las llaman otras funciones, nunca el cliente)
        'finish_game',
        -- mantenimiento (lo corre el cron, como postgres)
        'sweep_stale_games', 'sweep_stale_tables',
        -- premios y registro interno
        'award_event_medals', '_record_style',
        -- funciones de trigger
        'award_medals_on_profile_change', 'award_barrida_on_game_finish',
        'award_medals_on_history', 'handle_new_user', 'force_profile_defaults',
        '_touch_turn_start',
        -- ayudantes internas (por si alguna quedó afuera del cierre anterior)
        '_bot_hand_power', '_deal_hands', '_envido_points', '_envido_quiero_value',
        '_envido_reject_value', '_envido_reveal_for', '_envido_winning_cards',
        '_round_leader', '_truco_deck', '_turn_after_envido', '_who_plays_next',
        '_bot_topup', '_free_lobby_bot', '_rename_lobby_bot',
        'deal_new_hand'
      )
  loop
    execute format('revoke execute on function %s from anon, authenticated, public;', r.sig);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. DEJAR EXPLÍCITO LO QUE SÍ ES PARA EL CLIENTE
--
-- Hasta ahora estas funciones andaban "de prestado", por el permiso que Postgres
-- da por defecto a todo el mundo. Se las concedemos a mano para que el permiso
-- sea una decisión escrita y no un descuido: así, si mañana alguien endurece el
-- default, el juego sigue andando.
--
-- Las de administración (admin_stats, publish_news, delete_news, clear_chat,
-- delete_chat_message) quedan concedidas a propósito: cada una verifica por
-- dentro que quien llama sea administrador (verificado una por una).
-- ------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        -- partida
        'start_game', 'play_card', 'advance_hand', 'irse_al_mazo', 'timeout_mazo',
        'sing_envido', 'respond_envido', 'envido_say', 'sing_truco', 'respond_truco',
        'forfeit', 'request_rematch', 'touch_presence', 'touch_online',
        -- mesas
        'create_table', 'join_table', 'join_table_by_code', 'cancel_table',
        -- bots
        'bot_step', 'bot_join_table', 'ensure_lobby_tables',
        -- campaña
        'start_campaign_duel', 'get_campaign', 'get_campaign_map', 'get_campaign_ranking',
        -- perfil, tienda y medallas
        'claim_bonus', 'set_avatar_url', 'buy_salon', 'buy_frame', 'buy_accessory',
        'set_active_salon', 'set_active_frame', 'set_active_medal', 'set_active_accessory',
        'player_medals', 'active_medal_for', 'get_active_medals',
        -- comunidad
        'get_community', 'send_friend_request', 'respond_friend_request', 'remove_friend',
        'invite_friend', 'respond_game_invite', 'cancel_game_invite',
        'create_group', 'delete_group', 'leave_group', 'invite_to_group',
        'respond_group_invite', 'kick_group_member',
        'send_chat_message', 'delete_chat_message', 'clear_chat',
        -- reseñas y administración (validan por dentro)
        'submit_feedback', 'publish_news', 'delete_news', 'admin_stats'
      )
  loop
    execute format('grant execute on function %s to authenticated;', r.sig);
  end loop;
end $$;

commit;

-- ------------------------------------------------------------
-- CÓMO COMPROBAR QUE QUEDÓ CERRADO (pegar en el SQL Editor):
--
--   select p.oid::regprocedure as funcion,
--          case when p.proacl is null then 'ABIERTA A TODOS (default)'
--               else array_to_string(p.proacl, ' ') end as permisos
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('finish_game','sweep_stale_games','sweep_stale_tables',
--                       'award_event_medals','_record_style')
--   order by 1;
--
-- Ninguna de esas cinco tiene que decir "ABIERTA A TODOS", ni nombrar a
-- `anon` o `authenticated` en sus permisos.
-- ------------------------------------------------------------
