-- ============================================================
-- TRUCAZO — Campaña: los rasgos entran al cerebro del bot
-- Fecha: 2026-07-06
--
-- Dos cambios pedidos por el dueño:
--   1. Mentir el envido (cantar con tanto <= 20) se habilita desde dificultad
--      5 (antes 7). La probabilidad arranca en 2% y sube 2% por punto de
--      dificultad (tope 12% en dif 10, igual que antes).
--   2. Las barras de personalidad (trait_liar / trait_aggressive, 1..10)
--      ahora INFLUYEN APENAS en el comportamiento (5 = neutro):
--        MENTIROSO: + un poquito de prob. de mentir el envido (±0,5% por
--          punto), de farolear el truco (±0,5% por punto) y de ocultar el
--          tanto con "son buenas" (±2% por punto).
--        AGRESIVO: + un poquito de prob. de cantar truco con mano buena
--          (±2% por punto), de redoblar (retruco/vale cuatro, ±1,5% por
--          punto) y de cantar envido con tanto decente (±1% por punto).
--      La dificultad sigue siendo la que manda; los rasgos solo matizan.
--
-- El resto del cerebro queda EXACTAMENTE igual (versión "una acción por
-- llamada" del pacing). Idempotente.
-- ============================================================

begin;

create or replace function public.bot_step(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid     uuid := auth.uid();
  g       games%rowtype;
  v_bot   uuid;
  d       int;
  tl      int;              -- trait_liar (1..10, 5 = neutro)
  ta      int;              -- trait_aggressive (1..10, 5 = neutro)
  liar_n  numeric;          -- desvío del neutro: -4..+5
  aggr_n  numeric;
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

  select coalesce(difficulty, 5), coalesce(trait_liar, 5), coalesce(trait_aggressive, 5)
    into d, tl, ta
    from campaign_rivals where id = g.campaign_rival_id;
  liar_n := tl - 5;
  aggr_n := ta - 5;

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
      elsif rr < d::numeric / 10 + liar_n * 0.02 then
        act := 'envido_say'; p_type := 'son_buenas';   -- el mentiroso oculta un poco más
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
    if eff >= 30 and d >= 6 and cur_truco_val < 4 and rr < 0.40 + aggr_n * 0.015 then
      act := 'sing_truco';                              -- el agresivo redobla un poco más
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
                     or (et >= 23 and rr < d::numeric / 12 + aggr_n * 0.01)
                     or (et <= 20 and d >= 5 and rr < (d - 4) * 0.02 + liar_n * 0.005) ) then
      act := 'sing_envido';                             -- mentir el envido: desde dif 5
      p_type := case when et >= 32 and d >= 7 then 'real_envido' else 'envido' end;

    elsif tr_status = 'none' and ( (eff >= 24 and rr < 0.35 + 0.05 * d + aggr_n * 0.02)
                                   or (eff <= 12 and d >= 6 and rr < (d - 5) * 0.035 + liar_n * 0.005) ) then
      act := 'sing_truco'; p_type := 'truco';           -- agresivo canta más; mentiroso farolea más

    elsif tr_status = 'accepted' and last_truco is distinct from v_bot::text
          and cur_truco_val < 4 and eff >= 30 and d >= 7 and rr < 0.30 + aggr_n * 0.015 then
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

commit;
