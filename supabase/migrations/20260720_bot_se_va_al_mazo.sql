-- ============================================================
-- TRUCAZO — Bot: aprende a irse al mazo
-- Fecha: 2026-07-20 (correr DESPUÉS de 20260720_bot_fuerza_por_ronda:
-- el nombre ordena después, así la reconstrucción desde cero también
-- las aplica en ese orden)
--
-- Hasta ahora el bot jamás se iba al mazo: pagaba hasta la última carta
-- con cualquier basura, algo que ningún jugador real hace. Ahora, cuando
-- le toca jugar, puede abandonar la mano — con reglas para no regalar
-- puntos:
--   * Solo en la RONDA 2 y respondiendo a una carta ya jugada: en la
--     ronda 1 nunca (no quema el envido), y en la ronda 3 tampoco (jugar
--     la última carta no cuesta nada). Ojo: abrir la ronda perdiendo es
--     imposible (abre el que ganó la anterior), así que el bot acá
--     siempre juega segundo.
--   * Perdió la 1ra y no puede SUPERAR la carta jugada (la parda tampoco
--     lo salva: mano matemáticamente perdida): se va ~55% de las veces.
--   * La 1ra fue PARDA y su mejor carta PIERDE contra la jugada (acá el
--     empate sí lo salva y lo lleva a la 3ra): se va ~55% de las veces.
--   * El rasgo AGRESIVO se emperra y se va un poco menos (-3% por punto).
--
-- La decisión queda registrada en bot_decisions como action = 'mazo'.
-- El resto del cerebro queda EXACTAMENTE igual que en la migración de
-- fuerza normalizada. Espejo en scripts/sim_bot.ts. Idempotente.
-- ============================================================

begin;

create or replace function public.bot_step(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  g       games%rowtype;
  v_bot   uuid;
  v_human uuid;
  d       int;
  tl      int; ta int;
  liar_n  numeric; aggr_n numeric;
  -- Reputación del humano:
  cs        campaign_style%rowtype;
  hp        int;
  fama_pts  int;
  fama      numeric;          -- 0..1
  read      numeric;          -- 0..1 fuerza de lectura
  liar_rate numeric; fold_rate numeric; aggr_rate numeric;
  r_call    numeric;          -- empujón a "quiero" (lectura 1)
  r_bluff   numeric;          -- empujón a farolear (lecturas 2 y 3 combinadas)
  fama_cap  constant int := 2000;
  acted_ok boolean;
  v_err    text;
  sit      text;
  es_status text; tr_status text; last_env text; last_truco text; declare_turn text;
  cur_truco_val int; mano_declared int;
  bot_remaining jsonb; bot_full jsonb;
  et int; power int; standing int; eff int; bot_won int; opp_won int;
  opp_rank int; best_rank int; ncards int;
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
  v_human := case when v_bot = g.player1_id then g.player2_id else g.player1_id end;

  if g.status <> 'playing' or g.awaiting_deal then return g; end if;

  select coalesce(difficulty, 5), coalesce(trait_liar, 5), coalesce(trait_aggressive, 5)
    into d, tl, ta
    from campaign_rivals where id = g.campaign_rival_id;
  liar_n := tl - 5;
  aggr_n := ta - 5;

  -- ===== Reputación: qué tanto "lee" este rival al humano =====
  select coalesce(campaign_points, 0) into fama_pts from profiles where id = v_human;
  fama := least(1.0, fama_pts::numeric / fama_cap);          -- 0..1 (progreso)
  select * into cs from campaign_style where user_id = v_human;
  hp := coalesce(cs.hands_played, 0);
  liar_rate := (coalesce(cs.envido_bluff,0) + coalesce(cs.truco_bluff,0))::numeric
               / greatest(1, coalesce(cs.envido_sung,0) + coalesce(cs.truco_sung,0));
  fold_rate := least(1.0, (coalesce(cs.envido_folded,0) + coalesce(cs.truco_folded,0))::numeric
               / greatest(1, hp) * 2);
  aggr_rate := least(1.0, (coalesce(cs.envido_sung,0) + coalesce(cs.truco_sung,0))::numeric
               / greatest(1, hp) / 1.5);
  -- read: solo si hay fama, el rival es difícil (d>5) y jugaste varias manos.
  read := fama * greatest(0, (d - 5) / 5.0) * least(1.0, hp / 20.0);
  -- Empujones (PERILLAS de intensidad: 0.45 y 0.40, moderados):
  r_call  := read * liar_rate * 0.45;                        -- lectura 1
  r_bluff := read * (fold_rate - aggr_rate) * 0.40;          -- lecturas 2 (fold+) y 3 (aggr-)

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
  select count(*) into ncards from jsonb_array_elements(coalesce(bot_remaining, '[]'::jsonb));
  select count(*) filter (where e.value->>'winner_id' = v_bot::text),
         count(*) filter (where e.value->>'winner_id' is not null and e.value->>'winner_id' <> v_bot::text)
    into bot_won, opp_won
    from jsonb_array_elements(g.round_results) e;
  standing := coalesce(bot_won, 0) - coalesce(opp_won, 0);
  -- La suma de cartas restantes se lleva a escala de 3 cartas, así las varas
  -- de abajo valen igual en cualquier ronda.
  eff := round(power * 3.0 / greatest(ncards, 1)) + standing * 6;
  rr  := random();

  if es_status = 'declaring' and declare_turn = v_bot::text then
    sit := 'declarar_tanto';
    if (g.envido_state->>'mano_declared') is null then
      act := 'envido_say'; p_type := 'tengo';
    else
      mano_declared := (g.envido_state->>'mano_declared')::int;
      if et > mano_declared then
        act := 'envido_say'; p_type := 'tengo';
      elsif rr < d::numeric / 10 + liar_n * 0.02 then
        act := 'envido_say'; p_type := 'son_buenas';
      else
        act := 'envido_say'; p_type := 'tengo';
      end if;
    end if;

  elsif es_status in ('envido','real_envido','falta_envido') and last_env is distinct from v_bot::text then
    sit := 'responder_envido';
    esc_type := case es_status when 'envido' then 'real_envido' when 'real_envido' then 'falta_envido' else null end;
    if et >= 31 and d >= 6 and esc_type is not null and rr < 0.45 then
      act := 'sing_envido'; p_type := esc_type;
    elsif et >= greatest(20, 27 - d) or rr < r_call then     -- lectura 1: al mentiroso lo quiero más
      act := 'respond_envido_yes';
    elsif d <= 3 and rr < 0.5 then
      act := 'respond_envido_yes';
    else
      act := 'respond_envido_no';
    end if;

  elsif tr_status in ('truco','retruco','vale_cuatro') and last_truco is distinct from v_bot::text then
    sit := 'responder_truco';
    if eff >= 30 and d >= 6 and cur_truco_val < 4 and rr < 0.40 + aggr_n * 0.015 then
      act := 'sing_truco';
      p_type := case cur_truco_val when 2 then 'retruco' when 3 then 'vale_cuatro' else 'retruco' end;
    elsif eff >= greatest(12, 22 - d) or rr < r_call then    -- lectura 1: al mentiroso lo quiero más
      act := 'respond_truco_yes';
    elsif d <= 3 and rr < 0.6 then
      act := 'respond_truco_yes';
    else
      act := 'respond_truco_no';
    end if;

  elsif g.current_turn = v_bot then
    sit := 'turno';
    can_env := (es_status = 'none' and g.round_number = 1 and tr_status <> 'accepted'
                and not exists (select 1 from jsonb_array_elements(g.played_cards) pc
                                where pc.value->>'player_id' = v_bot::text));

    if can_env and ( et >= 27
                     or (et >= 23 and rr < d::numeric / 12 + aggr_n * 0.01)
                     or (et <= 20 and d >= 5 and rr < (d - 4) * 0.02 + liar_n * 0.005 + greatest(0, r_bluff)) ) then
      act := 'sing_envido';                                  -- lecturas 2/3 en el farol de envido
      p_type := case when et >= 32 and d >= 7 then 'real_envido' else 'envido' end;

    elsif tr_status = 'none' and ( (eff >= 24 and rr < 0.35 + 0.05 * d + aggr_n * 0.02)
                                   or (eff <= 12 and d >= 6 and rr < (d - 5) * 0.035 + liar_n * 0.005 + greatest(0, r_bluff)) ) then
      act := 'sing_truco'; p_type := 'truco';                -- lecturas 2/3 en el farol de truco

    elsif tr_status = 'accepted' and last_truco is distinct from v_bot::text
          and cur_truco_val < 4 and eff >= 30 and d >= 7 and rr < 0.30 + aggr_n * 0.015 then
      act := 'sing_truco'; p_type := case cur_truco_val when 2 then 'retruco' else 'vale_cuatro' end;

    else
      act := 'play';
      select (e.value->'card'->>'rank')::int into opp_rank
        from jsonb_array_elements(g.played_cards) e
        where (e.value->>'round')::int = g.round_number and e.value->>'player_id' <> v_bot::text
        limit 1;

      -- ¿Se va al mazo? Solo en ronda 2, respondiendo a una carta que lo deja
      -- sin salida (perdiendo nunca le toca abrir: abre el que ganó la 1ra):
      --   * perdió la 1ra: condenado si no puede SUPERAR la carta (empatar
      --     tampoco lo salva);
      --   * la 1ra fue parda: condenado solo si su mejor carta PIERDE (con
      --     un empate sigue vivo hasta la 3ra).
      if g.round_number = 2 and opp_rank is not null then
        select min((e.value->>'rank')::int) into best_rank
          from jsonb_array_elements(coalesce(bot_remaining, '[]'::jsonb)) e;
        if best_rank is not null
           and ( (standing < 0 and best_rank >= opp_rank)
              or (standing = 0 and best_rank > opp_rank) )
           and random() < 0.55 - aggr_n * 0.03 then
          act := 'mazo';
        end if;
      end if;

      if act = 'play' then
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
      when 'mazo'               then perform public.irse_al_mazo(p_game_id);
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
    v_err := sqlerrm;
  end;
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);

  -- Registro de la decisión (y limpieza ocasional de lo viejo).
  insert into bot_decisions (game_id, rival_id, situation, action, detail, numbers, ok, error)
  values (p_game_id, g.campaign_rival_id, sit, act, p_type,
          jsonb_build_object('d', d, 'round', g.round_number, 'ncards', ncards,
                             'power', power, 'eff', eff, 'et', et,
                             'standing', standing, 'truco_val', cur_truco_val,
                             'rr', round(rr, 3), 'card', chosen, 'opp_rank', opp_rank),
          acted_ok, v_err);
  if rr < 0.02 then
    delete from bot_decisions where created_at < now() - interval '30 days';
  end if;

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

commit;
