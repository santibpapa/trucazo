-- ============================================================
-- TRUCAZO — Cierre de seguridad (parte 2): funciones internas + huérfanas
-- Fecha: 2026-07-01
--
-- Cierra las puertas viejas que quedaron abiertas de etapas anteriores. Todo es
-- idempotente (se puede correr más de una vez sin efecto extra).
--
-- 0) REGISTRO de los cierres críticos que ya se aplicaron a mano en el panel de
--    Supabase, para que el historial de migraciones los reproduzca en un rebuild
--    desde cero:
--      - deal_new_hand: función vieja que dejaba pisar el puntaje (ya sin uso;
--        el juego reparte con advance_hand, que calcula los puntos sola).
--      - policy de INSERT en game_history: el cliente podía inventarse partidas
--        en su historial. El historial lo escribe finish_game (security definer),
--        que no necesita esa policy.
--
-- 1) Quitarle al cliente (anon/authenticated) el permiso de ejecutar las
--    funciones INTERNAS: las ayudantes que empiezan con "_" y los disparadores
--    (triggers). Hoy NO son un agujero: no son "security definer", así que corren
--    con los permisos de quien las llama y la RLS igual protege las tablas. Pero
--    el cliente no tiene por qué poder llamarlas. Defensa en profundidad.
--    NO rompe el juego: las funciones "security definer" (play_card, sing_truco,
--    etc.) corren como su DUEÑO, que conserva el permiso, así que pueden seguir
--    usando estas ayudantes por dentro. Los triggers tampoco necesitan este
--    permiso (se disparan solos, no los llama nadie).
--
-- 2) Dar de baja claim_victory: quedó huérfana cuando el mazo por tiempo
--    (timeout_mazo) reemplazó al viejo "reclamar victoria por desconexión".
--    Ningún archivo del frontend la usa. Se elimina para dejar un solo camino de
--    fin de partida por inactividad.
-- ============================================================

begin;

-- 0) Cierres críticos (ya aplicados a mano; se registran acá por reproducibilidad).
revoke execute on function public.deal_new_hand(uuid, integer, integer) from anon, authenticated, public;
drop policy if exists "El sistema puede insertar historial" on public.game_history;

-- 1) Revocar execute a las internas. Recorremos por FIRMA REAL (regprocedure),
--    así no hay que escribir a mano los tipos de cada una y no se rompe si alguna
--    firma cambió.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        '_bot_hand_power','_deal_hands','_envido_points','_envido_quiero_value',
        '_envido_reject_value','_envido_reveal_for','_envido_winning_cards',
        '_round_leader','_touch_turn_start','_truco_deck','_turn_after_envido',
        '_who_plays_next','force_profile_defaults','handle_new_user'
      )
  loop
    execute format('revoke execute on function %s from anon, authenticated, public;', r.sig);
  end loop;
end $$;

-- 2) Baja de la función huérfana (reemplazada por timeout_mazo).
drop function if exists public.claim_victory(uuid);

commit;
