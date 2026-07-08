-- ============================================================
-- TRUCAZO — Revelar el envido del GANADOR aunque el que se va al mazo sea el otro
-- Fecha: 2026-07-07
--
-- Bug: irse_al_mazo y timeout_mazo calculaban la revelación del envido para el
-- jugador que se iba al mazo (uid / loser). Si el ganador del envido era el
-- rival (p. ej. el bot cantó 33 y el jugador se fue al mazo), no se revelaba
-- nada. La regla dice que el ganador del envido siempre debe mostrar sus
-- cartas, así que la revelación se calcula para el ganador del envido, igual
-- que ya hace play_card (20260701_fix_fin_partida_por_cartas).
-- _envido_reveal_for ya tolera un winner_id nulo o sin envido aceptado
-- (devuelve null), así que no hace falta ningún chequeo extra. Idempotente.
-- ============================================================

begin;

create or replace function public.irse_al_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; uid uuid := auth.uid(); oppid uuid; stake int; s1 int; s2 int; v_reveal jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if g.awaiting_deal then raise exception 'esperando la proxima mano'; end if;
  if g.envido_state->>'status' = 'declaring' then raise exception 'estas en el envido'; end if;
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

  -- Revelación del envido: siempre la del ganador (haya sido el que se va o el otro)
  v_reveal := public._envido_reveal_for(g, (g.envido_state->>'winner_id')::uuid);

  update games set player1_score = s1, player2_score = s2, awaiting_deal = true,
    envido_reveal = v_reveal, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

create or replace function public.timeout_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; loser uuid; oppid uuid; stake int; s1 int; s2 int;
  new_count int; deadline timestamptz; extra int := 0; is_decl boolean; v_reveal jsonb;
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
    extra := coalesce((g.envido_state->>'value')::int, 0);
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

  -- Revelación del envido: siempre la del ganador (haya perdido el turno o no)
  v_reveal := public._envido_reveal_for(g, (g.envido_state->>'winner_id')::uuid);

  update games set player1_score = s1, player2_score = s2,
    mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
    mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
    envido_state = case when is_decl then envido_state || jsonb_build_object('status','mazo','winner_id',oppid) else envido_state end,
    envido_reveal = v_reveal, awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
