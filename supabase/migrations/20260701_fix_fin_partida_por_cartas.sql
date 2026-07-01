-- Fix: al ganar la ÚLTIMA mano por CARTAS (no por "no quiero"), faltaba el
-- chequeo de fin de partida. Resultado: si con esos puntos llegabas al objetivo,
-- en vez de terminar la partida repartía una mano nueva (y mostraba el revelado
-- del envido sobre la mesa nueva, con la carta cayendo cerca del puntaje).
--
-- Se agrega el mismo chequeo `s1/s2 >= target_score -> finish_game` que ya tienen
-- respond_truco y respond_envido, en la rama "hand_done" de play_card.

CREATE OR REPLACE FUNCTION public.play_card(p_game_id uuid, p_card jsonb)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g games%rowtype; uid uuid := auth.uid(); oppid uuid;
  myhand jsonb; newhand jsonb := '[]'::jsonb; matched jsonb; found_card boolean := false; elem jsonb;
  played jsonb; rcount int;
  results jsonb := '[]'::jsonb; r int; c1 jsonb; c2 jsonb; w uuid;
  w1 int := 0; w2 int := 0; ties int := 0; num_results int := 0; last_round_winner uuid;
  hand_done boolean := false; hand_winner uuid; truco_val int; s1 int; s2 int; v_reveal jsonb;
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
    raise exception 'hay un envido pendiente';
  end if;
  if g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
     and (g.truco_state->>'last_singer') is distinct from uid::text then
    raise exception 'hay un truco pendiente';
  end if;

  oppid := case when uid = g.player1_id then g.player2_id else g.player1_id end;

  if exists (select 1 from jsonb_array_elements(g.played_cards) e
             where e.value->>'player_id' = uid::text and (e.value->>'round')::int = g.round_number) then
    raise exception 'ya jugaste esta ronda';
  end if;

  select cards into myhand from game_hands where game_id = p_game_id and player_id = uid for update;
  for elem in select e.value from jsonb_array_elements(coalesce(myhand,'[]'::jsonb)) e loop
    if not found_card and elem->>'suit' = p_card->>'suit' and (elem->>'value')::int = (p_card->>'value')::int then
      found_card := true; matched := elem;
    else
      newhand := newhand || jsonb_build_array(elem);
    end if;
  end loop;
  if not found_card then raise exception 'no tenes esa carta'; end if;

  update game_hands set cards = newhand where game_id = p_game_id and player_id = uid;
  played := g.played_cards || jsonb_build_array(jsonb_build_object('player_id', uid, 'card', matched, 'round', g.round_number));

  select count(*) into rcount from jsonb_array_elements(played) e where (e.value->>'round')::int = g.round_number;

  if rcount < 2 then
    update games set played_cards = played, current_turn = oppid, updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  for r in 1..3 loop
    c1 := null; c2 := null;
    select e.value->'card' into c1 from jsonb_array_elements(played) e
      where (e.value->>'round')::int = r and e.value->>'player_id' = g.player1_id::text limit 1;
    select e.value->'card' into c2 from jsonb_array_elements(played) e
      where (e.value->>'round')::int = r and e.value->>'player_id' = g.player2_id::text limit 1;
    exit when c1 is null or c2 is null;
    if    (c1->>'rank')::int < (c2->>'rank')::int then w := g.player1_id;
    elsif (c2->>'rank')::int < (c1->>'rank')::int then w := g.player2_id;
    else  w := null; end if;
    results := results || jsonb_build_array(jsonb_build_object('round', r, 'winner_id', w));
    num_results := num_results + 1; last_round_winner := w;
    if    w = g.player1_id then w1 := w1 + 1;
    elsif w = g.player2_id then w2 := w2 + 1;
    else  ties := ties + 1; end if;
  end loop;

  if w1 >= 2 then hand_winner := g.player1_id; hand_done := true;
  elsif w2 >= 2 then hand_winner := g.player2_id; hand_done := true;
  elsif num_results = 3 then
    if    w1 > w2 then hand_winner := g.player1_id;
    elsif w2 > w1 then hand_winner := g.player2_id;
    else  hand_winner := g.mano_player; end if;
    hand_done := true;
  elsif ties = 1 and num_results = 2 then
    select (e.value->>'winner_id')::uuid into hand_winner
    from jsonb_array_elements(results) e where e.value->>'winner_id' is not null limit 1;
    if hand_winner is not null then hand_done := true; end if;
  end if;

  if not hand_done then
    update games set played_cards = played, round_number = g.round_number + 1, round_results = results,
      current_turn = coalesce(last_round_winner, g.mano_player), updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  truco_val := case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end;
  s1 := g.player1_score; s2 := g.player2_score;
  if    hand_winner = g.player1_id then s1 := s1 + truco_val;
  elsif hand_winner = g.player2_id then s2 := s2 + truco_val; end if;

  -- Fin de partida: si con estos puntos alguien llegó al objetivo, la partida
  -- TERMINA acá (no se reparte otra mano ni se muestra revelado). Este chequeo
  -- faltaba en la rama "ganar la mano por cartas".
  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- Regla del envido: si el ganador del envido no llegó a mostrar sus cartas
  -- ganadoras, se revelan en la mesa antes de repartir (caso "termina por cartas").
  g.played_cards := played;  -- para que el cálculo vea todas las cartas de la mano
  v_reveal := public._envido_reveal_for(g, (g.envido_state->>'winner_id')::uuid);

  update games set
    played_cards = played, round_results = results,
    player1_score = s1, player2_score = s2,
    awaiting_deal = true, envido_reveal = v_reveal, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;
