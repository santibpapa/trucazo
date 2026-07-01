-- ============================================================
-- TRUCAZO — FOTO de la base: todas las funciones (snapshot)
-- Generado: 2026-06-29
--
-- Esto NO es una migración incremental: es una "foto" del estado actual de
-- TODAS las funciones de la base (security definer, helpers, triggers). Sirve
-- para reconstruir el backend de cero. El historial incremental vive en
-- supabase/migrations/. Orden de restauración: tables.sql → functions.sql →
-- policies.sql.
-- Definiciones tomadas en vivo con pg_get_functiondef, ordenadas por nombre.
-- ============================================================

CREATE OR REPLACE FUNCTION public._bot_hand_power(cards jsonb)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(sum(15 - (c->>'rank')::int), 0)::int
  from jsonb_array_elements(coalesce(cards, '[]'::jsonb)) c;
$function$;

CREATE OR REPLACE FUNCTION public._deal_hands(OUT h1 jsonb, OUT h2 jsonb)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
declare
  cards jsonb[];
begin
  select array_agg(elem order by random())
    into cards
  from jsonb_array_elements(public._truco_deck()) elem;

  h1 := to_jsonb(array[cards[1], cards[2], cards[3]]);
  h2 := to_jsonb(array[cards[4], cards[5], cards[6]]);
end;
$function$;

CREATE OR REPLACE FUNCTION public._envido_points(cards jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  best int := 0;
  r record;
begin
  for r in
    select cnt, digs from (
      select suit, count(*) as cnt, array_agg(dig order by dig desc) as digs
      from (
        select (c->>'suit') as suit,
               case when (c->>'value')::int <= 7 then (c->>'value')::int else 0 end as dig
        from jsonb_array_elements(cards) c
      ) x
      group by suit
    ) y
  loop
    if r.cnt >= 2 then
      best := greatest(best, coalesce(r.digs[1],0) + coalesce(r.digs[2],0) + 20);
    else
      best := greatest(best, coalesce(r.digs[1],0));
    end if;
  end loop;
  return best;
end;
$function$;

CREATE OR REPLACE FUNCTION public._envido_quiero_value(chain jsonb, p1 integer, p2 integer, p_target integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when chain ? 'falta_envido' then p_target - greatest(p1, p2)
    else coalesce((
      select sum(case when e.value #>> '{}' = 'envido' then 2
                      when e.value #>> '{}' = 'real_envido' then 3
                      else 0 end)
      from jsonb_array_elements(chain) e), 0)
  end::int;
$function$;

CREATE OR REPLACE FUNCTION public._envido_reject_value(chain jsonb, p1 integer, p2 integer, p_target integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when jsonb_array_length(coalesce(chain, '[]'::jsonb)) <= 1 then 1
    else greatest(public._envido_quiero_value(chain - (jsonb_array_length(chain) - 1), p1, p2, p_target), 1)
  end;
$function$;

CREATE OR REPLACE FUNCTION public._envido_reveal_for(g games, p_player uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public._envido_winning_cards(cards jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public._round_leader(g games, rnum integer)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select case when rnum = 1 then g.mano_player
    else coalesce(
      (select (e.value->>'winner_id')::uuid
       from jsonb_array_elements(g.round_results) e
       where (e.value->>'round')::int = rnum - 1 and e.value->>'winner_id' is not null
       limit 1),
      g.mano_player) end;
$function$;

CREATE OR REPLACE FUNCTION public._touch_turn_start()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.turn_started_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public._truco_deck()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select jsonb_agg(jsonb_build_object('suit', s, 'value', v, 'rank',
    case
      when v = 1  and s = 'espada'            then 1
      when v = 1  and s = 'basto'             then 2
      when v = 7  and s = 'espada'            then 3
      when v = 7  and s = 'oro'               then 4
      when v = 3                              then 5
      when v = 2                              then 6
      when v = 1  and s in ('copa','oro')     then 7
      when v = 12                             then 8
      when v = 11                             then 9
      when v = 10                             then 10
      when v = 7  and s in ('copa','basto')   then 11
      when v = 6                              then 12
      when v = 5                              then 13
      when v = 4                              then 14
      else 15
    end))
  from unnest(array['espada','basto','oro','copa']) s
  cross join unnest(array[1,2,3,4,5,6,7,10,11,12]) v;
$function$;

CREATE OR REPLACE FUNCTION public._turn_after_envido(g games)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
    then case when (g.truco_state->>'last_singer') = g.player1_id::text
              then g.player2_id else g.player1_id end
    else public._who_plays_next(g) end;
$function$;

CREATE OR REPLACE FUNCTION public._who_plays_next(g games)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when not exists (
      select 1 from jsonb_array_elements(g.played_cards) e
      where (e.value->>'round')::int = g.round_number)
    then public._round_leader(g, g.round_number)
    else case
      when (select e.value->>'player_id' from jsonb_array_elements(g.played_cards) e
            where (e.value->>'round')::int = g.round_number limit 1) = g.player1_id::text
      then g.player2_id else g.player1_id end
  end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_hand(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.bot_step(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid     uuid := auth.uid();
  g       games%rowtype;
  v_bot   uuid;
  d       int;
  acted_ok boolean;
  es_status text; tr_status text; last_env text; last_truco text; declare_turn text;
  cur_truco_val int; mano_declared int;
  bot_remaining jsonb; bot_full jsonb;
  et int; power int; standing int; eff int; bot_won int; opp_won int;
  opp_rank int; ncards int;
  rr numeric;
  act text; p_type text; chosen jsonb; esc_type text; can_env boolean;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if g.campaign_rival_id is null then raise exception 'no es un duelo de campaña'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  select id into v_bot from profiles where id in (g.player1_id, g.player2_id) and is_bot limit 1;
  if v_bot is null then raise exception 'esta partida no tiene bot'; end if;
  if uid = v_bot then raise exception 'el bot no juega solo'; end if;

  if g.status <> 'playing' or g.awaiting_deal then return g; end if;

  select coalesce(difficulty, 5) into d from campaign_rivals where id = g.campaign_rival_id;

  es_status    := g.envido_state->>'status';
  tr_status    := g.truco_state->>'status';
  last_env     := g.envido_state->>'last_singer';
  last_truco   := g.truco_state->>'last_singer';
  declare_turn := g.envido_state->>'declare_turn';
  cur_truco_val := coalesce((g.truco_state->>'value')::int, 1);
  act := null; p_type := null; chosen := null;

  select cards into bot_remaining from game_hands where game_id = p_game_id and player_id = v_bot;
  bot_full := coalesce(bot_remaining, '[]'::jsonb) || coalesce(
    (select jsonb_agg(pc.value->'card') from jsonb_array_elements(g.played_cards) pc
     where pc.value->>'player_id' = v_bot::text), '[]'::jsonb);

  et    := public._envido_points(bot_full);
  power := public._bot_hand_power(bot_remaining);
  select count(*) filter (where e.value->>'winner_id' = v_bot::text),
         count(*) filter (where e.value->>'winner_id' is not null and e.value->>'winner_id' <> v_bot::text)
    into bot_won, opp_won
    from jsonb_array_elements(g.round_results) e;
  standing := coalesce(bot_won, 0) - coalesce(opp_won, 0);
  eff := power + standing * 6;
  rr  := random();

  if es_status = 'declaring' and declare_turn = v_bot::text then
    if (g.envido_state->>'mano_declared') is null then
      act := 'envido_say'; p_type := 'tengo';
    else
      mano_declared := (g.envido_state->>'mano_declared')::int;
      if et > mano_declared then
        act := 'envido_say'; p_type := 'tengo';
      elsif rr < d::numeric / 10 then
        act := 'envido_say'; p_type := 'son_buenas';
      else
        act := 'envido_say'; p_type := 'tengo';
      end if;
    end if;

  elsif es_status in ('envido','real_envido','falta_envido') and last_env is distinct from v_bot::text then
    esc_type := case es_status when 'envido' then 'real_envido' when 'real_envido' then 'falta_envido' else null end;
    if et >= 31 and d >= 6 and esc_type is not null and rr < 0.45 then
      act := 'sing_envido'; p_type := esc_type;
    elsif et >= greatest(20, 27 - d) then
      act := 'respond_envido_yes';
    elsif d <= 3 and rr < 0.5 then
      act := 'respond_envido_yes';
    else
      act := 'respond_envido_no';
    end if;

  elsif tr_status in ('truco','retruco','vale_cuatro') and last_truco is distinct from v_bot::text then
    if eff >= 30 and d >= 6 and cur_truco_val < 4 and rr < 0.40 then
      act := 'sing_truco';
      p_type := case cur_truco_val when 2 then 'retruco' when 3 then 'vale_cuatro' else 'retruco' end;
    elsif eff >= greatest(12, 22 - d) then
      act := 'respond_truco_yes';
    elsif d <= 3 and rr < 0.6 then
      act := 'respond_truco_yes';
    else
      act := 'respond_truco_no';
    end if;

  elsif g.current_turn = v_bot then
    can_env := (es_status = 'none' and g.round_number = 1 and tr_status <> 'accepted'
                and not exists (select 1 from jsonb_array_elements(g.played_cards) pc
                                where pc.value->>'player_id' = v_bot::text));

    if can_env and ( et >= 27
                     or (et >= 23 and rr < d::numeric / 12)
                     or (et <= 20 and d >= 7 and rr < (d - 6) * 0.03) ) then
      act := 'sing_envido';
      p_type := case when et >= 32 and d >= 7 then 'real_envido' else 'envido' end;

    elsif tr_status = 'none' and ( (eff >= 24 and rr < 0.35 + 0.05 * d)
                                   or (eff <= 12 and d >= 6 and rr < (d - 5) * 0.035) ) then
      act := 'sing_truco'; p_type := 'truco';

    elsif tr_status = 'accepted' and last_truco is distinct from v_bot::text
          and cur_truco_val < 4 and eff >= 30 and d >= 7 and rr < 0.30 then
      act := 'sing_truco'; p_type := case cur_truco_val when 2 then 'retruco' else 'vale_cuatro' end;

    else
      act := 'play';
      select (e.value->'card'->>'rank')::int into opp_rank
        from jsonb_array_elements(g.played_cards) e
        where (e.value->>'round')::int = g.round_number and e.value->>'player_id' <> v_bot::text
        limit 1;
      select count(*) into ncards from jsonb_array_elements(coalesce(bot_remaining, '[]'::jsonb));

      if opp_rank is not null then
        if rr < d::numeric / 10 then
          select e.value into chosen from jsonb_array_elements(bot_remaining) e
            where (e.value->>'rank')::int < opp_rank
            order by (e.value->>'rank')::int desc limit 1;
          if chosen is null then
            select e.value into chosen from jsonb_array_elements(bot_remaining) e
              order by (e.value->>'rank')::int desc limit 1;
          end if;
        else
          select e.value into chosen from jsonb_array_elements(bot_remaining) e order by random() limit 1;
        end if;
      else
        if rr < d::numeric / 10 then
          if standing < 0 or g.round_number >= 2 then
            select e.value into chosen from jsonb_array_elements(bot_remaining) e
              order by (e.value->>'rank')::int asc limit 1;
          else
            select e.value into chosen from jsonb_array_elements(bot_remaining) e
              order by (e.value->>'rank')::int asc offset greatest(0, (ncards - 1) / 2) limit 1;
          end if;
        else
          select e.value into chosen from jsonb_array_elements(bot_remaining) e order by random() limit 1;
        end if;
      end if;

      if chosen is null then
        select e.value into chosen from jsonb_array_elements(bot_remaining) e limit 1;
      end if;
      if chosen is null then return g; end if;
    end if;

  else
    return g;
  end if;

  if act is null then return g; end if;

  perform set_config('request.jwt.claim.sub', v_bot::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_bot::text, 'role', 'authenticated')::text, true);
  acted_ok := true;
  begin
    case act
      when 'play'               then perform public.play_card(p_game_id, chosen);
      when 'sing_envido'        then perform public.sing_envido(p_game_id, p_type);
      when 'sing_truco'         then perform public.sing_truco(p_game_id, p_type);
      when 'respond_envido_yes' then perform public.respond_envido(p_game_id, true);
      when 'respond_envido_no'  then perform public.respond_envido(p_game_id, false);
      when 'respond_truco_yes'  then perform public.respond_truco(p_game_id, true);
      when 'respond_truco_no'   then perform public.respond_truco(p_game_id, false);
      when 'envido_say'         then perform public.envido_say(p_game_id, p_type);
    end case;
  exception when others then
    acted_ok := false;
  end;
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_table(p_table_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then return; end if;  -- idempotente: ya no existe

  if t.creator_id <> auth.uid() then
    raise exception 'solo el creador puede cancelar la mesa';
  end if;
  if t.status <> 'waiting' then
    raise exception 'la mesa ya no se puede cancelar';
  end if;

  -- Reembolsar la apuesta al creador
  update profiles set coins = coins + t.bet where id = t.creator_id;

  delete from tables where id = p_table_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_bonus()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_coins int;
  v_floor int := 100;   -- saldo al que se restablece
  v_threshold int := 10; -- apuesta mínima para jugar
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select coins into v_coins from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins >= v_threshold then
    raise exception 'todavia tenés monedas para jugar';
  end if;
  update profiles set coins = v_floor where id = auth.uid();
  return v_floor;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_victory(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g      games%rowtype;
  oppid  uuid;
  v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  oppid := case when auth.uid() = g.player1_id then g.player2_id else g.player1_id end;

  -- Última señal de vida del rival; si nunca marcó, usamos la creación de la partida.
  select last_seen_at into v_last from game_presence where game_id = p_game_id and player_id = oppid;
  v_last := coalesce(v_last, g.created_at);

  if now() - v_last <= interval '30 seconds' then
    raise exception 'el rival sigue conectado';
  end if;

  perform public.finish_game(p_game_id, auth.uid(), g.player1_score, g.player2_score);
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_table(p_name text, p_bet integer, p_is_private boolean, p_private_code text DEFAULT NULL::text, p_target_score integer DEFAULT 30, p_time_limit integer DEFAULT 30)
 RETURNS tables
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_coins int;
  v_username text;
  v_row tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if p_bet < 10 then raise exception 'la apuesta minima es 10'; end if;
  if p_target_score not in (15, 30) then raise exception 'puntaje objetivo invalido'; end if;
  if p_time_limit not in (15, 30) then raise exception 'tiempo invalido'; end if;

  select coins, username into v_coins, v_username from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins < p_bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - p_bet where id = auth.uid();

  insert into tables (name, creator_id, creator_username, bet, is_private, private_code, status, target_score, time_limit)
  values (p_name, auth.uid(), v_username, p_bet, p_is_private, p_private_code, 'waiting', p_target_score, p_time_limit)
  returning * into v_row;

  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.deal_new_hand(p_game_id uuid, p_p1_score integer, p_p2_score integer)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g        games%rowtype;
  new_mano uuid;
  h1       jsonb;
  h2       jsonb;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  new_mano := case when g.mano_player = g.player1_id then g.player2_id else g.player1_id end;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  update game_hands set cards = h1 where game_id = p_game_id and player_id = g.player1_id;
  update game_hands set cards = h2 where game_id = p_game_id and player_id = g.player2_id;

  update games set
    played_cards  = '[]'::jsonb,
    player1_score = p_p1_score,
    player2_score = p_p2_score,
    current_turn  = new_mano,
    mano_player   = new_mano,
    hand_number   = g.hand_number + 1,
    round_number  = 1,
    round_results = '[]'::jsonb,
    envido_state  = '{"value":0,"status":"none","last_singer":null,"chain":[]}'::jsonb,
    truco_state   = '{"value":1,"status":"none","last_singer":null}'::jsonb,
    updated_at    = now()
  where id = p_game_id
  returning * into g;

  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.envido_say(p_game_id uuid, p_action text)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g            games%rowtype;
  v_loser_id   uuid;
  v_winner_un  text;
  v_loser_un   text;
  v_net        numeric;
  v_human      uuid;
  v_reward     integer;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status = 'finished' then return; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;
  if p_winner_id <> g.player1_id and p_winner_id <> g.player2_id then
    raise exception 'winner is not a player of this game';
  end if;

  if g.campaign_rival_id is not null then
    update games
       set status = 'finished', winner_id = p_winner_id,
           player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
     where id = p_game_id;

    select id into v_human from profiles
     where id in (g.player1_id, g.player2_id) and not is_bot limit 1;

    if v_human is not null and p_winner_id = v_human then
      insert into campaign_progress (user_id, rival_id)
      values (v_human, g.campaign_rival_id)
      on conflict (user_id, rival_id) do nothing;
      if found then
        select reward_coins into v_reward from campaign_rivals where id = g.campaign_rival_id;
        update profiles set coins = coins + coalesce(v_reward, 0) where id = v_human;
        update games set campaign_reward = coalesce(v_reward, 0) where id = p_game_id;
      end if;
    end if;
    return;
  end if;

  v_loser_id  := case when p_winner_id = g.player1_id then g.player2_id else g.player1_id end;
  v_winner_un := case when p_winner_id = g.player1_id then g.player1_username else g.player2_username end;
  v_loser_un  := case when p_winner_id = g.player1_id then g.player2_username else g.player1_username end;
  v_net       := g.bet / 2.0;

  update games
     set status = 'finished', winner_id = p_winner_id,
         player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
   where id = p_game_id;

  update profiles set coins = coins + g.bet where id = p_winner_id;

  update profiles set games_played = games_played + 1, games_won = games_won + 1 where id = p_winner_id;
  update profiles set games_played = games_played + 1, games_lost = games_lost + 1 where id = v_loser_id;

  insert into game_history (player_id, opponent_id, opponent_username, result, coins_change)
  values
    (p_winner_id, v_loser_id,  v_loser_un,  'win',   v_net),
    (v_loser_id,  p_winner_id, v_winner_un, 'loss', -v_net);
end;
$function$;

CREATE OR REPLACE FUNCTION public.force_profile_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.coins        := 1000;
  new.games_played := 0;
  new.games_won    := 0;
  new.games_lost   := 0;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.forfeit(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g games%rowtype; oppid uuid;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  oppid := case when auth.uid() = g.player1_id then g.player2_id else g.player1_id end;
  perform public.finish_game(p_game_id, oppid, g.player1_score, g.player2_score);
  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_campaign()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); v_result jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select coalesce(jsonb_agg(row order by (row->>'order_index')::int), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', cr.id,
      'order_index', cr.order_index,
      'slug', cr.slug,
      'display_name', cr.display_name,
      'tagline', cr.tagline,
      'difficulty', cr.difficulty,
      'target_score', cr.target_score,
      'reward_coins', cr.reward_coins,
      'beaten', (cp.user_id is not null),
      'unlocked', (
        cr.order_index = (select min(order_index) from campaign_rivals)
        or exists (
          select 1 from campaign_progress p
          join campaign_rivals prev on prev.id = p.rival_id
          where p.user_id = uid and prev.order_index = cr.order_index - 1
        )
      )
    ) as row
    from campaign_rivals cr
    left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
  ) s;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_login_email(p_username text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
  return v_email;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.irse_al_mazo(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.join_table(p_table_id uuid)
 RETURNS tables
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t tables%rowtype;
  v_coins int;
  v_username text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.status <> 'waiting' then raise exception 'la mesa ya no esta disponible'; end if;
  if t.opponent_id is not null then raise exception 'la mesa ya esta llena'; end if;
  if t.creator_id = auth.uid() then raise exception 'no podes unirte a tu propia mesa'; end if;

  select coins, username into v_coins, v_username
  from profiles where id = auth.uid() for update;
  if v_coins < t.bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - t.bet where id = auth.uid();

  update tables
     set opponent_id = auth.uid(),
         opponent_username = v_username,
         status = 'playing'
   where id = p_table_id
   returning * into t;

  return t;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.request_rematch(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g          games%rowtype;
  uid        uuid := auth.uid();
  per_stake  int;
  new_id     uuid;
  h1 jsonb; h2 jsonb;
  c1 int; c2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'finished' then raise exception 'la partida todavia no terminó'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  -- la revancha ya está creada: devolvemos el estado (el cliente navega)
  if g.rematch_game_id is not null then return g; end if;

  -- registrar el voto del que llama
  if uid = g.player1_id then
    update games set rematch_p1 = true where id = p_game_id;
    g.rematch_p1 := true;
  else
    update games set rematch_p2 = true where id = p_game_id;
    g.rematch_p2 := true;
  end if;

  -- si ambos quieren, crear la nueva partida
  if g.rematch_p1 and g.rematch_p2 then
    per_stake := g.bet / 2;  -- g.bet es el pozo (apuesta * 2)

    select coins into c1 from profiles where id = g.player1_id for update;
    select coins into c2 from profiles where id = g.player2_id for update;
    if c1 < per_stake or c2 < per_stake then
      raise exception 'monedas insuficientes para la revancha';
    end if;

    update profiles set coins = coins - per_stake where id = g.player1_id;
    update profiles set coins = coins - per_stake where id = g.player2_id;

    new_id := gen_random_uuid();
    select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

    -- tabla asociada (privada y ya 'playing', no aparece en el lobby).
    -- Hereda puntos (target_score) Y tiempo (time_limit) de la partida anterior.
    insert into tables (id, name, creator_id, creator_username, opponent_id, opponent_username,
                        bet, is_private, private_code, status, target_score, time_limit)
    values (new_id, 'Revancha', g.player1_id, g.player1_username, g.player2_id, g.player2_username,
            per_stake, true, null, 'playing', g.target_score, g.time_limit);

    -- la nueva partida: alterna la mano (ahora arranca player2)
    insert into games (id, player1_id, player2_id, player1_username, player2_username,
                       current_turn, mano_player, bet, target_score, time_limit)
    values (new_id, g.player1_id, g.player2_id, g.player1_username, g.player2_username,
            g.player2_id, g.player2_id, g.bet, g.target_score, g.time_limit);

    insert into game_hands (game_id, player_id, cards) values
      (new_id, g.player1_id, h1),
      (new_id, g.player2_id, h2);

    update games set rematch_game_id = new_id where id = p_game_id;
    select * into g from games where id = p_game_id;
  end if;

  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_envido(p_game_id uuid, p_accept boolean)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.respond_truco(p_game_id uuid, p_accept boolean)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.sing_envido(p_game_id uuid, p_type text)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.sing_truco(p_game_id uuid, p_type text)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g       games%rowtype;
  uid     uuid := auth.uid();
  oppid   uuid;
  st      text;
  last_s  text;
  pending boolean;
  cur_val int;
  req_val int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_type not in ('truco','retruco','vale_cuatro') then raise exception 'tipo invalido'; end if;

  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  oppid  := case when uid = g.player1_id then g.player2_id else g.player1_id end;
  st     := g.truco_state->>'status';
  last_s := g.truco_state->>'last_singer';
  pending := st in ('truco','retruco','vale_cuatro');
  cur_val := case when st = 'none' then 1 else (g.truco_state->>'value')::int end;
  req_val := case p_type when 'truco' then 2 when 'retruco' then 3 else 4 end;

  -- no se puede cantar truco si debés responder un envido
  if g.envido_state->>'status' in ('envido','real_envido','falta_envido')
     and last_s is distinct from uid::text
     and (g.envido_state->>'last_singer') is distinct from uid::text then
    raise exception 'primero respondé el envido';
  end if;

  if pending and last_s is distinct from uid::text then
    -- respondés subiendo la apuesta
    if req_val <> cur_val + 1 then raise exception 'escalada de truco invalida'; end if;
  elsif st = 'none' then
    if p_type <> 'truco' then raise exception 'primero hay que cantar truco'; end if;
    if g.current_turn <> uid then raise exception 'no es tu turno'; end if;
  elsif st = 'accepted' and last_s is distinct from uid::text and cur_val < 4 then
    if req_val <> cur_val + 1 then raise exception 'escalada de truco invalida'; end if;
    if g.current_turn <> uid then raise exception 'no es tu turno'; end if;
  else
    raise exception 'no podes cantar truco ahora';
  end if;

  update games set
    truco_state = jsonb_build_object('status', p_type, 'last_singer', uid, 'value', req_val),
    current_turn = oppid,
    updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_campaign_duel(p_rival_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid        uuid := auth.uid();
  r          campaign_rivals%rowtype;
  v_min      integer;
  v_prev     uuid;
  v_username text;
  v_id       uuid := gen_random_uuid();
  h1 jsonb; h2 jsonb;
  g  games%rowtype;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into r from campaign_rivals where id = p_rival_id;
  if not found then raise exception 'rival no encontrado'; end if;

  select min(order_index) into v_min from campaign_rivals;
  if r.order_index > v_min then
    select id into v_prev from campaign_rivals where order_index = r.order_index - 1;
    if not exists (select 1 from campaign_progress where user_id = uid and rival_id = v_prev) then
      raise exception 'todavía no desbloqueaste este rival';
    end if;
  end if;

  select username into v_username from profiles where id = uid;
  if v_username is null then raise exception 'perfil no encontrado'; end if;

  delete from tables t
   where t.creator_id = uid
     and exists (select 1 from games gg
                 where gg.id = t.id and gg.campaign_rival_id is not null and gg.status = 'playing');

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into tables (id, name, creator_id, creator_username, opponent_id, opponent_username,
                      bet, is_private, status, target_score, time_limit)
  values (v_id, 'Modo historia', uid, v_username, r.bot_id, r.display_name,
          0, true, 'playing', r.target_score, 30);

  insert into games (id, player1_id, player2_id, player1_username, player2_username,
                     current_turn, mano_player, bet, target_score, time_limit, turn_started_at,
                     campaign_rival_id)
  values (v_id, uid, r.bot_id, v_username, r.display_name,
          uid, uid, 0, r.target_score, 30, now(), p_rival_id)
  returning * into g;

  insert into game_hands (game_id, player_id, cards) values
    (v_id, uid,      h1),
    (v_id, r.bot_id, h2);

  return g;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_game(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    current_turn, mano_player, bet, target_score, time_limit, turn_started_at
  ) values (
    p_game_id, t.creator_id, t.opponent_id, t.creator_username, t.opponent_username,
    t.creator_id, t.creator_id, t.bet * 2, t.target_score, t.time_limit, now()
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

CREATE OR REPLACE FUNCTION public.submit_feedback(p_rating_general integer, p_rating_aesthetics integer, p_understood boolean, p_had_problem boolean, p_comment text, p_image_paths text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_rating_general is not null and p_rating_general not between 1 and 5 then
    raise exception 'puntuacion general invalida';
  end if;
  if p_rating_aesthetics is not null and p_rating_aesthetics not between 1 and 5 then
    raise exception 'puntuacion de estetica invalida';
  end if;
  insert into public.feedback (user_id, rating_general, rating_aesthetics, understood, had_problem, comment, image_paths)
  values (auth.uid(), p_rating_general, p_rating_aesthetics, p_understood, p_had_problem,
          nullif(btrim(coalesce(p_comment,'')), ''), coalesce(p_image_paths, '{}'));
end;
$function$;

CREATE OR REPLACE FUNCTION public.sweep_stale_games(p_minutes integer DEFAULT 10)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g record;
  n int := 0;
  cutoff timestamptz := now() - make_interval(mins => p_minutes);
begin
  for g in
    select gm.* from games gm
    where gm.status = 'playing'
      and coalesce((select last_seen_at from game_presence where game_id = gm.id and player_id = gm.player1_id), gm.created_at) < cutoff
      and coalesce((select last_seen_at from game_presence where game_id = gm.id and player_id = gm.player2_id), gm.created_at) < cutoff
    for update
  loop
    -- reembolsar la apuesta a cada uno (g.bet = pozo = apuesta * 2)
    update profiles set coins = coins + (g.bet / 2) where id = g.player1_id;
    update profiles set coins = coins + (g.bet / 2) where id = g.player2_id;
    update games set status = 'finished', winner_id = null, updated_at = now() where id = g.id;
    n := n + 1;
  end loop;
  return n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.timeout_mazo(p_game_id uuid)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.touch_presence(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g games%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  insert into game_presence (game_id, player_id, last_seen_at)
  values (p_game_id, auth.uid(), now())
  on conflict (game_id, player_id) do update set last_seen_at = now();
end;
$function$;

