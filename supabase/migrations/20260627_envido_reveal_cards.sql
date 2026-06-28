-- ============================================================
-- TRUCAZO — Mostrar las cartas del envido ganador al irse al mazo
-- Fecha: 2026-06-27
--
-- Regla obligatoria del truco: el ganador del envido debe mostrar las cartas que
-- hicieron su tanto. Si se va al mazo (botón o por tiempo) sin haberlas jugado,
-- se revelan en la mesa unos segundos antes de repartir la mano siguiente.
-- Las cartas a mostrar se guardan en games.envido_reveal = { player_id, cards: [...] }.
-- El cliente las muestra durante awaiting_deal; advance_hand limpia el campo.
-- Idempotente.
-- ============================================================

begin;

alter table public.games add column if not exists envido_reveal jsonb;

-- Cartas (1 o 2) que forman el mejor envido de una mano completa
create or replace function public._envido_winning_cards(cards jsonb)
returns jsonb language plpgsql immutable as $$
declare
  best_val int := -1; v int; r record; result jsonb := '[]'::jsonb;
begin
  for r in
    select cnt, digs, cards_ordered from (
      select count(*) as cnt,
             array_agg(dig order by dig desc) as digs,
             jsonb_agg(card order by dig desc) as cards_ordered
      from (
        select (c->>'suit') as suit,
               case when (c->>'value')::int <= 7 then (c->>'value')::int else 0 end as dig,
               c as card
        from jsonb_array_elements(cards) c
      ) x
      group by suit
    ) y
  loop
    if r.cnt >= 2 then v := coalesce(r.digs[1],0) + coalesce(r.digs[2],0) + 20;
    else v := coalesce(r.digs[1],0); end if;
    if v > best_val then
      best_val := v;
      if r.cnt >= 2 then result := jsonb_build_array(r.cards_ordered->0, r.cards_ordered->1);
      else result := jsonb_build_array(r.cards_ordered->0); end if;
    end if;
  end loop;
  return result;
end $$;

-- Si p_player ganó el envido (aceptado) y todavía no jugó sus cartas ganadoras,
-- devuelve { player_id, cards: [las que faltan mostrar] }. Si no, NULL.
create or replace function public._envido_reveal_for(g public.games, p_player uuid)
returns jsonb language plpgsql stable as $$
declare full_hand jsonb; win_cards jsonb; played_by jsonb; unplayed jsonb := '[]'::jsonb; wc jsonb;
begin
  if g.envido_state->>'status' <> 'accepted' then return null; end if;
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

-- irse_al_mazo: si el que se va ganó el envido y no mostró las cartas, revelarlas
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

  v_reveal := public._envido_reveal_for(g, uid);

  update games set player1_score = s1, player2_score = s2, awaiting_deal = true,
    envido_reveal = v_reveal, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

-- timeout_mazo: idem, si el que se queda sin tiempo era el ganador del envido
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

  v_reveal := public._envido_reveal_for(g, loser);

  update games set player1_score = s1, player2_score = s2,
    mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
    mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
    envido_state = case when is_decl then envido_state || jsonb_build_object('status','mazo','winner_id',oppid) else envido_state end,
    envido_reveal = v_reveal, awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

-- advance_hand: al repartir la mano nueva, limpiar envido_reveal
create or replace function public.advance_hand(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare g games%rowtype; new_mano uuid; h1 jsonb; h2 jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then raise exception 'not a player of this game'; end if;
  if not g.awaiting_deal then return g; end if;

  if g.player1_score >= g.target_score or g.player2_score >= g.target_score then
    update games set awaiting_deal = false where id = p_game_id;
    perform public.finish_game(p_game_id,
      case when g.player1_score >= g.target_score then g.player1_id else g.player2_id end,
      g.player1_score, g.player2_score);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  new_mano := case when g.mano_player = g.player1_id then g.player2_id else g.player1_id end;
  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;
  update game_hands set cards = h1 where game_id = p_game_id and player_id = g.player1_id;
  update game_hands set cards = h2 where game_id = p_game_id and player_id = g.player2_id;

  update games set
    played_cards  = '[]'::jsonb,
    current_turn  = new_mano,
    mano_player   = new_mano,
    hand_number   = g.hand_number + 1,
    round_number  = 1,
    round_results = '[]'::jsonb,
    envido_state  = '{"value":0,"status":"none","last_singer":null,"chain":[]}'::jsonb,
    truco_state   = '{"value":1,"status":"none","last_singer":null}'::jsonb,
    envido_reveal = null,
    awaiting_deal = false,
    updated_at    = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

commit;
