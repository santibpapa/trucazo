-- ============================================================
-- TRUCAZO — Etapa 5: cerrar la puerta 🔒
-- Fecha: 2026-06-20
--
-- Ahora TODAS las acciones del juego pasan por funciones SECURITY DEFINER
-- (start_game, play_card, sing/respond_envido, sing/respond_truco,
--  irse_al_mazo, deal_new_hand, forfeit, claim_victory, finish_game interno).
-- El cliente ya no escribe directo en games ni game_hands. Por lo tanto:
--
--   * se elimina el UPDATE/INSERT abierto de games  → no se pueden inflar scores,
--     robar turnos ni fabricar jugadas;
--   * se elimina el UPDATE de game_hands            → las cartas solo las mueve el server;
--   * se revoca finish_game al cliente              → no se puede autodeclarar ganador
--     (las RPCs lo siguen llamando internamente como definer).
--
-- Quedan vivas las policies de SELECT (los jugadores leen su partida / su mano).
-- Reversible recreando las policies y el grant. Idempotente.
-- ============================================================

begin;

-- games: el cliente ya no inserta ni actualiza directo (todo por RPCs definer)
drop policy if exists "Los jugadores pueden actualizar su partida" on public.games;
drop policy if exists "Los jugadores pueden crear partidas"       on public.games;

-- game_hands: las cartas solo las mutan las funciones definer
drop policy if exists "actualizar mi mano" on public.game_hands;

-- finish_game: no se puede llamar directo desde el cliente
revoke execute on function public.finish_game(uuid, uuid, integer, integer) from anon, authenticated;

-- limpieza: resolve_envido_accept quedó reemplazada por respond_envido
drop function if exists public.resolve_envido_accept(uuid, uuid);

commit;
