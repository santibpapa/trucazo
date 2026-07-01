-- ============================================================
-- TRUCAZO — El "no quiero" del truco hace pausa (como los demás finales de mano)
-- Fecha: 2026-06-29
--
-- Antes respond_truco, al rechazar, repartía la mano nueva en el acto. Eso hacía
-- que el cartel "No quiero" naciera pegado a la mano nueva y la tapara unos
-- segundos. Ahora, igual que irse al mazo o terminar la mano por cartas, marca
-- awaiting_deal = true y deja el truco_state en 'rejected': la pantalla muestra el
-- "No quiero" durante la pausa (~1.8s) y el reparto de la mano nueva lo hace
-- advance_hand, momento en el que el cartel se descarta. Idempotente.
-- ============================================================

begin;

create or replace function public.respond_truco(p_game_id uuid, p_accept boolean)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; uid uuid := auth.uid(); singer uuid; val int; s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  if not (g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
          and (g.truco_state->>'last_singer') is distinct from uid::text) then
    raise exception 'no hay truco para responder';
  end if;

  if p_accept then
    update games set truco_state = g.truco_state || jsonb_build_object('status','accepted'),
      current_turn = public._who_plays_next(g), updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  -- No quiero: el que cantó gana el valor anterior.
  singer := (g.truco_state->>'last_singer')::uuid;
  val := (g.truco_state->>'value')::int - 1;
  s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
  s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
  else
    -- Pausa: marcamos el rechazo y dejamos que advance_hand reparta la próxima
    -- mano (igual que el mazo). Así el cartel "No quiero" se ve durante la pausa.
    update games set
      player1_score = s1, player2_score = s2,
      truco_state = g.truco_state || jsonb_build_object('status','rejected'),
      awaiting_deal = true, updated_at = now()
    where id = p_game_id;
  end if;

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

commit;
