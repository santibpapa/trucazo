-- ============================================================
-- TRUCAZO — Partidas a 15 o 30 puntos (target_score configurable)
-- Fecha: 2026-06-22
--
-- El puntaje objetivo deja de estar fijo en 30. Se elige al crear la mesa
-- (15 o 30), se guarda en tables.target_score y start_game lo copia a games.
-- Todas las funciones que comparaban contra 30 ahora usan g.target_score,
-- y la falta envido vale "lo que le falta al que va ganando" hasta el objetivo.
-- Idempotente.
-- ============================================================

begin;

-- ---- Columnas ----
alter table public.tables add column if not exists target_score int not null default 30;
alter table public.games  add column if not exists target_score int not null default 30;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tables_target_score_chk') then
    alter table public.tables add constraint tables_target_score_chk check (target_score in (15, 30));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'games_target_score_chk') then
    alter table public.games add constraint games_target_score_chk check (target_score in (15, 30));
  end if;
end $$;

-- ---- Helpers de envido con objetivo parametrizado ----
drop function if exists public._envido_reject_value(jsonb, int, int);
drop function if exists public._envido_quiero_value(jsonb, int, int);

create function public._envido_quiero_value(chain jsonb, p1 int, p2 int, p_target int)
returns int language sql immutable as $$
  select case
    when chain ? 'falta_envido' then p_target - greatest(p1, p2)
    else coalesce((
      select sum(case when e.value #>> '{}' = 'envido' then 2
                      when e.value #>> '{}' = 'real_envido' then 3
                      else 0 end)
      from jsonb_array_elements(chain) e), 0)
  end::int;
$$;

create function public._envido_reject_value(chain jsonb, p1 int, p2 int, p_target int)
returns int language sql immutable as $$
  select case
    when jsonb_array_length(coalesce(chain, '[]'::jsonb)) <= 1 then 1
    else greatest(public._envido_quiero_value(chain - (jsonb_array_length(chain) - 1), p1, p2, p_target), 1)
  end;
$$;

-- ---- create_table: acepta el objetivo ----
drop function if exists public.create_table(text, integer, boolean, text);

create function public.create_table(p_name text, p_bet integer, p_is_private boolean,
                                    p_private_code text default null, p_target_score int default 30)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_coins int;
  v_username text;
  v_row tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if p_bet < 10 then raise exception 'la apuesta minima es 10'; end if;
  if p_target_score not in (15, 30) then raise exception 'puntaje objetivo invalido'; end if;

  select coins, username into v_coins, v_username from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins < p_bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - p_bet where id = auth.uid();

  insert into tables (name, creator_id, creator_username, bet, is_private, private_code, status, target_score)
  values (p_name, auth.uid(), v_username, p_bet, p_is_private, p_private_code, 'waiting', p_target_score)
  returning * into v_row;

  return v_row;
end;
$function$;

grant execute on function public.create_table(text, integer, boolean, text, int) to anon, authenticated;

-- ---- start_game: copia el objetivo de la mesa a la partida ----
create or replace function public.start_game(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  t tables%rowtype; g games%rowtype; h1 jsonb; h2 jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if found then return g; end if;

  select * into t from tables where id = p_game_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.opponent_id is null then raise exception 'la mesa todavia no tiene rival'; end if;
  if auth.uid() <> t.creator_id and auth.uid() <> t.opponent_id then
    raise exception 'no sos jugador de esta mesa';
  end if;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into games (
    id, player1_id, player2_id, player1_username, player2_username,
    current_turn, mano_player, bet, target_score
  ) values (
    p_game_id, t.creator_id, t.opponent_id, t.creator_username, t.opponent_username,
    t.creator_id, t.creator_id, t.bet * 2, t.target_score
  )
  on conflict (id) do nothing
  returning * into g;

  if g.id is null then
    select * into g from games where id = p_game_id;
    return g;
  end if;

  insert into game_hands (game_id, player_id, cards) values
    (p_game_id, t.creator_id,  h1),
    (p_game_id, t.opponent_id, h2)
  on conflict (game_id, player_id) do nothing;

  return g;
end;
$function$;

-- ---- sing_envido: usa el objetivo para el valor ----
create or replace function public.sing_envido(p_game_id uuid, p_type text)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid(); oppid uuid;
  is_escalation boolean; is_my_turn boolean; truco_pending_on_me boolean;
  cur_status text; envido_count int; new_chain jsonb; val int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_type not in ('envido','real_envido','falta_envido') then raise exception 'tipo invalido'; end if;

  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  oppid := case when uid = g.player1_id then g.player2_id else g.player1_id end;
  cur_status := g.envido_state->>'status';
  is_escalation := cur_status in ('envido','real_envido','falta_envido')
                   and (g.envido_state->>'last_singer') is distinct from uid::text;

  if is_escalation then
    envido_count := (select count(*) from jsonb_array_elements_text(coalesce(g.envido_state->'chain','[]'::jsonb)) c where c = 'envido');
    if p_type = 'envido' then
      if not (cur_status = 'envido' and envido_count < 2) then raise exception 'no podes cantar envido de nuevo'; end if;
    elsif p_type = 'real_envido' then
      if cur_status <> 'envido' then raise exception 'no podes cantar real envido aca'; end if;
    elsif p_type = 'falta_envido' then
      if cur_status not in ('envido','real_envido') then raise exception 'no podes cantar falta envido aca'; end if;
    end if;
  else
    if cur_status <> 'none' then raise exception 'el envido ya fue cantado'; end if;
    if g.round_number <> 1 then raise exception 'el envido solo se canta en la primera ronda'; end if;
    if g.truco_state->>'status' = 'accepted' then raise exception 'el truco ya esta en juego'; end if;
    if exists (select 1 from jsonb_array_elements(g.played_cards) e where e.value->>'player_id' = uid::text)
      then raise exception 'ya jugaste una carta'; end if;
    is_my_turn := g.current_turn = uid;
    truco_pending_on_me := g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
                           and (g.truco_state->>'last_singer') is distinct from uid::text;
    if not (is_my_turn or truco_pending_on_me) then raise exception 'no podes cantar ahora'; end if;
  end if;

  new_chain := coalesce(g.envido_state->'chain', '[]'::jsonb) || to_jsonb(p_type);
  val := public._envido_quiero_value(new_chain, g.player1_score, g.player2_score, g.target_score);

  update games set
    envido_state = jsonb_build_object('status', p_type, 'last_singer', uid, 'value', val, 'chain', new_chain),
    current_turn = oppid, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

-- ---- respond_envido: objetivo en reject value y en el chequeo de fin ----
create or replace function public.respond_envido(p_game_id uuid, p_accept boolean)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid();
  h1 jsonb; h2 jsonb; pts1 int; pts2 int; winner uuid; val int; singer uuid; next_turn uuid; s1 int; s2 int;
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

  next_turn := public._turn_after_envido(g);
  val := coalesce((g.envido_state->>'value')::int, 0);

  if p_accept then
    select cards into h1 from game_hands where game_id = p_game_id and player_id = g.player1_id;
    select cards into h2 from game_hands where game_id = p_game_id and player_id = g.player2_id;
    h1 := coalesce(h1,'[]'::jsonb) || coalesce(
      (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
       where pc->>'player_id' = g.player1_id::text), '[]'::jsonb);
    h2 := coalesce(h2,'[]'::jsonb) || coalesce(
      (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
       where pc->>'player_id' = g.player2_id::text), '[]'::jsonb);
    pts1 := public._envido_points(h1);
    pts2 := public._envido_points(h2);
    if    pts1 > pts2 then winner := g.player1_id;
    elsif pts2 > pts1 then winner := g.player2_id;
    else                   winner := g.mano_player; end if;

    s1 := g.player1_score + case when winner = g.player1_id then val else 0 end;
    s2 := g.player2_score + case when winner = g.player2_id then val else 0 end;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object(
        'status','accepted','winner_id',winner,'player1_points',pts1,'player2_points',pts2,'awarded',val),
      current_turn = next_turn, updated_at = now()
    where id = p_game_id returning * into g;
  else
    singer := (g.envido_state->>'last_singer')::uuid;
    val := public._envido_reject_value(g.envido_state->'chain', g.player1_score, g.player2_score, g.target_score);
    s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
    s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object('status','rejected','winner_id',singer,'awarded',val),
      current_turn = next_turn, updated_at = now()
    where id = p_game_id returning * into g;
  end if;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
  end if;
  return g;
end;
$function$;

-- ---- play_card: objetivo en el chequeo de fin de partida ----
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

  if s1 >= g.target_score or s2 >= g.target_score then
    update games set played_cards = played, round_results = results, updated_at = now() where id = p_game_id;
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
  else
    perform public.deal_new_hand(p_game_id, s1, s2);
  end if;
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

-- ---- respond_truco: objetivo en el chequeo de fin ----
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

  singer := (g.truco_state->>'last_singer')::uuid;
  val := (g.truco_state->>'value')::int - 1;
  s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
  s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
  else
    perform public.deal_new_hand(p_game_id, s1, s2);
  end if;
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

-- ---- irse_al_mazo: objetivo en el chequeo de fin ----
create or replace function public.irse_al_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; uid uuid := auth.uid(); oppid uuid; stake int; s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
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

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, oppid, s1, s2);
  else
    perform public.deal_new_hand(p_game_id, s1, s2);
  end if;
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

commit;
