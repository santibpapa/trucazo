-- ============================================================
-- TRUCAZO — "Irse al mazo" con delay (para que se entienda la acción)
-- Fecha: 2026-06-25
--
-- Igual que el fin de mano por carta: al irse al mazo, se otorgan los puntos al
-- rival y se marca awaiting_deal en vez de repartir al instante. El cliente
-- muestra un cartelito "Me voy al mazo" del que se fue y, tras el delay,
-- advance_hand reparte la próxima mano (o termina la partida). Idempotente.
-- ============================================================

begin;

create or replace function public.irse_al_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; uid uuid := auth.uid(); oppid uuid; stake int; s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if g.awaiting_deal then raise exception 'esperando la proxima mano'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;
  if g.current_turn <> uid then raise exception 'no es tu turno'; end if;
  if g.envido_state->>'status' in ('envido','real_envido','falta_envido')
     and (g.envido_state->>'last_singer') is distinct from uid::text then
    raise exception 'respondé el envido pendiente';
  end if;
  if g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
     and (g.truco_state->>'last_singer') is distinct from uid::text then
    raise exception 'respondé el truco pendiente';
  end if;

  oppid := case when uid = g.player1_id then g.player2_id else g.player1_id end;
  stake := case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end;
  s1 := g.player1_score + case when oppid = g.player1_id then stake else 0 end;
  s2 := g.player2_score + case when oppid = g.player2_id then stake else 0 end;

  -- deja la mano cerrada y marca awaiting_deal (el cliente muestra el cartel y,
  -- tras el delay, advance_hand reparte/termina)
  update games set player1_score = s1, player2_score = s2, awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
