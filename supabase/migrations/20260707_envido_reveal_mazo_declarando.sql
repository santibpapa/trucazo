-- ============================================================
-- TRUCAZO — Revelar el envido también cuando se abandona DURANTE la declaración
-- Fecha: 2026-07-07 (correr DESPUÉS de 20260707_envido_reveal_ganador_al_mazo)
--
-- Bug: si en el diálogo de tantos (después del "quiero") el que debía responder
-- se va al mazo (envido_say 'mazo') o se queda sin tiempo (timeout_mazo), el
-- rival gana el envido pero no se revelaban sus cartas. Ejemplo: me cantan
-- envido, lo quiero, la mano canta 27 y me voy al mazo sin declarar mi tanto:
-- el rival debe mostrar las cartas que forman su 27.
--
-- Regla aplicada: se revela solo si el ganador YA había declarado su tanto (es
-- la mano y mano_declared no es null). Si nadie declaró nada (la mano abandonó
-- antes de cantar su tanto), no hay tanto que probar y no se muestra nada.
--
-- Cambios:
--  * _envido_reveal_for: acepta también envidos resueltos por mazo (status
--    'mazo'), no solo 'accepted'.
--  * envido_say (acción 'mazo'): expone el tanto declarado de la mano en
--    envido_state (para el cartel "27 en mesa") y guarda envido_reveal.
--  * timeout_mazo: ídem cuando el timeout ocurre declarando.
-- Idempotente.
-- ============================================================

begin;

create or replace function public._envido_reveal_for(g public.games, p_player uuid)
returns jsonb language plpgsql stable as $$
declare full_hand jsonb; win_cards jsonb; played_by jsonb; unplayed jsonb := '[]'::jsonb; wc jsonb;
begin
  -- 'accepted' = resuelto declarando; 'mazo' = el rival abandonó y ganó el declarante
  if g.envido_state->>'status' not in ('accepted','mazo') then return null; end if;
  if (g.envido_state->>'winner_id') is distinct from p_player::text then return null; end if;

  select cards into full_hand from game_hands where game_id = g.id and player_id = p_player;
  full_hand := coalesce(full_hand,'[]'::jsonb) || coalesce(
    (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
     where pc->>'player_id' = p_player::text), '[]'::jsonb);

  win_cards := public._envido_winning_cards(full_hand);

  played_by := coalesce(
    (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
     where pc->>'player_id' = p_player::text), '[]'::jsonb);

  for wc in select value from jsonb_array_elements(win_cards) loop
    if not exists (
      select 1 from jsonb_array_elements(played_by) pj
      where pj->>'suit' = wc->>'suit' and (pj->>'value')::int = (wc->>'value')::int
    ) then
      unplayed := unplayed || jsonb_build_array(wc);
    end if;
  end loop;

  if jsonb_array_length(unplayed) = 0 then return null; end if;
  return jsonb_build_object('player_id', p_player, 'cards', unplayed);
end $$;

create or replace function public.envido_say(p_game_id uuid, p_action text)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid();
  es jsonb; dturn uuid; mano uuid; pie uuid;
  my_tanto int; mano_tanto int; winner uuid; val int;
  next_turn uuid; s1 int; s2 int; stake int; oppid uuid;
  myhand jsonb; expose1 int; expose2 int; v_reveal jsonb;
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

    es := es || jsonb_build_object('status','mazo','winner_id',oppid);
    -- Si el rival (la mano) ya había declarado su tanto, queda expuesto y debe
    -- mostrar las cartas que lo forman. Si nadie declaró, no hay nada que probar.
    if oppid = mano and (es->>'mano_declared') is not null then
      es := es || (case when mano = g.player1_id
        then jsonb_build_object('player1_points',(es->>'mano_declared')::int)
        else jsonb_build_object('player2_points',(es->>'mano_declared')::int) end);
      g.envido_state := es;
      v_reveal := public._envido_reveal_for(g, oppid);
    end if;

    if s1 >= g.target_score or s2 >= g.target_score then
      update games set player1_score = s1, player2_score = s2,
        envido_state = es, updated_at = now() where id = p_game_id;
      perform public.finish_game(p_game_id, oppid, s1, s2);
    else
      update games set player1_score = s1, player2_score = s2,
        envido_state = es, envido_reveal = v_reveal,
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

create or replace function public.timeout_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; loser uuid; oppid uuid; stake int; s1 int; s2 int;
  new_count int; deadline timestamptz; extra int := 0; is_decl boolean; v_reveal jsonb;
  es2 jsonb;
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

  -- Estado final del envido: si el timeout fue declarando, lo gana el rival por
  -- mazo. Si el rival (la mano) ya había declarado su tanto, queda expuesto y
  -- debe mostrar las cartas que lo forman.
  es2 := g.envido_state;
  if is_decl then
    es2 := es2 || jsonb_build_object('status','mazo','winner_id',oppid);
    if oppid = g.mano_player and (es2->>'mano_declared') is not null then
      es2 := es2 || (case when g.mano_player = g.player1_id
        then jsonb_build_object('player1_points',(es2->>'mano_declared')::int)
        else jsonb_build_object('player2_points',(es2->>'mano_declared')::int) end);
    end if;
  end if;

  stake := (case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end) + extra;
  s1 := g.player1_score + case when oppid = g.player1_id then stake else 0 end;
  s2 := g.player2_score + case when oppid = g.player2_id then stake else 0 end;

  new_count := case when loser = g.player1_id then g.mazo_count_p1 + 1 else g.mazo_count_p2 + 1 end;

  if new_count >= 3 then
    update games set
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      envido_state = es2, updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, g.player1_score, g.player2_score);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  if s1 >= g.target_score or s2 >= g.target_score then
    update games set player1_score = s1, player2_score = s2,
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      envido_state = es2, updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, s1, s2);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- Revelación del envido: siempre la del ganador (resuelto declarando o por mazo)
  g.envido_state := es2;
  v_reveal := public._envido_reveal_for(g, (es2->>'winner_id')::uuid);

  update games set player1_score = s1, player2_score = s2,
    mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
    mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
    envido_state = es2, envido_reveal = v_reveal, awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
