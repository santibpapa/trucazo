-- ============================================================
-- TRUCAZO — Envido conversacional (diálogo de tantos por turnos)
-- Fecha: 2026-06-27
--
-- Antes el "quiero" del envido resolvía solo y mostraba el resultado. Ahora abre
-- un diálogo por turnos:
--   * respond_envido(accept=true) → status 'declaring', la MANO declara primero.
--   * envido_say(action): 'tengo' (declara su tanto real), 'son_buenas' (cede sin
--     revelar, gana la mano), 'mazo' (abandona la mano: el rival cobra envido + mano).
-- El tanto lo calcula el servidor desde las cartas (no se puede mentir).
-- play_card bloquea jugar carta mientras se está declarando.
-- "No quiero" queda igual. Idempotente.
-- ============================================================

begin;

-- respond_envido: aceptar abre la fase de declaración (la mano declara primero)
create or replace function public.respond_envido(p_game_id uuid, p_accept boolean)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid();
  singer uuid; val int; next_turn uuid; s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  if not (g.envido_state->>'status' in ('envido','real_envido','falta_envido')
          and (g.envido_state->>'last_singer') is distinct from uid::text) then
    raise exception 'no hay envido para responder';
  end if;

  if p_accept then
    -- Quiero: se abre el diálogo de tantos; la mano declara primero.
    update games set
      envido_state = g.envido_state || jsonb_build_object(
        'status','declaring','declare_turn', g.mano_player, 'mano_declared', null),
      updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  -- No quiero (igual que antes)
  next_turn := public._turn_after_envido(g);
  singer := (g.envido_state->>'last_singer')::uuid;
  val := public._envido_reject_value(g.envido_state->'chain', g.player1_score, g.player2_score, g.target_score);
  s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
  s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;
  update games set
    player1_score = s1, player2_score = s2,
    envido_state = g.envido_state || jsonb_build_object('status','rejected','winner_id',singer,'awarded',val),
    current_turn = next_turn, updated_at = now()
  where id = p_game_id returning * into g;
  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
  end if;
  return g;
end;
$function$;

-- envido_say: las acciones del diálogo de tantos (tengo / son_buenas / mazo)
create or replace function public.envido_say(p_game_id uuid, p_action text)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid();
  es jsonb; dturn uuid; mano uuid; pie uuid;
  my_tanto int; mano_tanto int; winner uuid; val int;
  next_turn uuid; s1 int; s2 int; stake int; oppid uuid;
  myhand jsonb; expose1 int; expose2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_action not in ('tengo','son_buenas','mazo') then raise exception 'accion invalida'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  es := g.envido_state;
  if es->>'status' <> 'declaring' then raise exception 'no hay envido para declarar'; end if;
  dturn := (es->>'declare_turn')::uuid;
  if dturn is distinct from uid then raise exception 'no es tu turno de declarar'; end if;

  mano := g.mano_player;
  pie := case when mano = g.player1_id then g.player2_id else g.player1_id end;
  val := coalesce((es->>'value')::int, 0);

  -- IR AL MAZO: abandona la mano. El rival cobra el envido aceptado + la mano.
  if p_action = 'mazo' then
    oppid := case when uid = g.player1_id then g.player2_id else g.player1_id end;
    stake := case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end;
    s1 := g.player1_score + case when oppid = g.player1_id then val + stake else 0 end;
    s2 := g.player2_score + case when oppid = g.player2_id then val + stake else 0 end;
    if s1 >= g.target_score or s2 >= g.target_score then
      update games set player1_score = s1, player2_score = s2,
        envido_state = es || jsonb_build_object('status','mazo','winner_id',oppid),
        updated_at = now() where id = p_game_id;
      perform public.finish_game(p_game_id, oppid, s1, s2);
    else
      update games set player1_score = s1, player2_score = s2,
        envido_state = es || jsonb_build_object('status','mazo','winner_id',oppid),
        awaiting_deal = true, updated_at = now() where id = p_game_id;
    end if;
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- TENGO: el tanto real lo calcula el server desde las cartas (no se puede mentir)
  if p_action = 'tengo' then
    select cards into myhand from game_hands where game_id = p_game_id and player_id = uid;
    myhand := coalesce(myhand,'[]'::jsonb) || coalesce(
      (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
       where pc->>'player_id' = uid::text), '[]'::jsonb);
    my_tanto := public._envido_points(myhand);
  end if;

  -- Turno de la MANO (primer declarante; todavía no declaró)
  if uid = mano and (es->>'mano_declared') is null then
    if p_action = 'son_buenas' then raise exception 'la mano no dice son buenas'; end if;
    update games set
      envido_state = es || jsonb_build_object('mano_declared', my_tanto, 'declare_turn', pie),
      updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  -- Turno del PIE (la mano ya declaró)
  mano_tanto := (es->>'mano_declared')::int;
  next_turn := public._turn_after_envido(g);

  if p_action = 'son_buenas' then
    winner := mano;
    if mano = g.player1_id then expose1 := mano_tanto; expose2 := null;
    else expose2 := mano_tanto; expose1 := null; end if;
  else
    -- tengo: gana el mayor; empate -> mano
    if my_tanto > mano_tanto then winner := pie; else winner := mano; end if;
    if mano = g.player1_id then expose1 := mano_tanto; expose2 := my_tanto;
    else expose2 := mano_tanto; expose1 := my_tanto; end if;
  end if;

  s1 := g.player1_score + case when winner = g.player1_id then val else 0 end;
  s2 := g.player2_score + case when winner = g.player2_id then val else 0 end;

  update games set
    player1_score = s1, player2_score = s2,
    envido_state = es || jsonb_build_object(
      'status','accepted','winner_id',winner,
      'player1_points',expose1,'player2_points',expose2,'awarded',val),
    current_turn = next_turn, updated_at = now()
  where id = p_game_id returning * into g;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
  end if;
  return g;
end;
$function$;

grant execute on function public.envido_say(uuid, text) to anon, authenticated;

-- play_card: bloquear jugar carta mientras se está declarando el envido
create or replace function public.play_card(p_game_id uuid, p_card jsonb)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid(); oppid uuid;
  myhand jsonb; newhand jsonb := '[]'::jsonb; matched jsonb; found_card boolean := false; elem jsonb;
  played jsonb; rcount int;
  results jsonb := '[]'::jsonb; r int; c1 jsonb; c2 jsonb; w uuid;
  w1 int := 0; w2 int := 0; ties int := 0; num_results int := 0; last_round_winner uuid;
  hand_done boolean := false; hand_winner uuid; truco_val int; s1 int; s2 int;
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

  update games set
    played_cards = played, round_results = results,
    player1_score = s1, player2_score = s2,
    awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
