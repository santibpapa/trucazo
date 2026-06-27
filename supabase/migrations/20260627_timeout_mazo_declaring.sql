-- ============================================================
-- TRUCAZO — timeout_mazo durante el diálogo de tantos
-- Fecha: 2026-06-27
--
-- Durante el diálogo del envido ('declaring'), el que se queda sin tiempo es el
-- que debe declarar (envido_state.declare_turn), no el current_turn (que está
-- congelado en el que respondió). Si abandona por tiempo, el rival cobra el envido
-- en juego + la mano. Fuera del diálogo, todo igual que antes. Idempotente.
-- ============================================================

begin;

create or replace function public.timeout_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; loser uuid; oppid uuid; stake int; s1 int; s2 int;
  new_count int; deadline timestamptz; extra int := 0; is_decl boolean;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if g.awaiting_deal then raise exception 'esperando la proxima mano'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then raise exception 'not a player of this game'; end if;

  is_decl := g.envido_state->>'status' = 'declaring';
  if is_decl then
    loser := (g.envido_state->>'declare_turn')::uuid;
    extra := coalesce((g.envido_state->>'value')::int, 0);  -- envido aceptado en juego
  else
    loser := g.current_turn;
  end if;
  oppid := case when loser = g.player1_id then g.player2_id else g.player1_id end;

  deadline := g.turn_started_at + make_interval(secs => g.time_limit);
  if now() < deadline then raise exception 'todavia hay tiempo'; end if;

  stake := (case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end) + extra;
  s1 := g.player1_score + case when oppid = g.player1_id then stake else 0 end;
  s2 := g.player2_score + case when oppid = g.player2_id then stake else 0 end;

  new_count := case when loser = g.player1_id then g.mazo_count_p1 + 1 else g.mazo_count_p2 + 1 end;

  -- 3er mazo automático: pierde la partida
  if new_count >= 3 then
    update games set
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      envido_state = case when is_decl then envido_state || jsonb_build_object('status','mazo','winner_id',oppid) else envido_state end,
      updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, g.player1_score, g.player2_score);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- ¿el rival llega al objetivo con este punto? termina
  if s1 >= g.target_score or s2 >= g.target_score then
    update games set player1_score = s1, player2_score = s2,
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      envido_state = case when is_decl then envido_state || jsonb_build_object('status','mazo','winner_id',oppid) else envido_state end,
      updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, s1, s2);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- si no, deja la mano cerrada (awaiting_deal) y el cliente muestra el cartel
  update games set player1_score = s1, player2_score = s2,
    mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
    mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
    envido_state = case when is_decl then envido_state || jsonb_build_object('status','mazo','winner_id',oppid) else envido_state end,
    awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
