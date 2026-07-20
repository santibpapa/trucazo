-- ============================================================
-- TRUCAZO — Bot: la fuerza de la mano ahora vale igual en toda la mano
--           + registro de decisiones del bot (para diagnosticar)
-- Fecha: 2026-07-20
--
-- EL BUG (reportado: "si gano la segunda ronda y canto truco, el bot
-- nunca quiere"): el bot medía su mano SUMANDO las cartas que le quedaban
-- sin jugar, pero las varas para decidir estaban pensadas para cuando
-- tiene las 3 cartas. Al jugar cartas la suma se achica y las varas no:
--   * Ronda 3 (le queda 1 carta, tope 14 puntos): aceptar truco pedía
--     15-18 puntos en dificultad 4-7 -> IMPOSIBLE, no quería nunca.
--     En dif 8-10 solo aceptaba con las 3 mejores cartas del mazo.
--   * Nunca cantaba retruco/vale cuatro en la ronda 3 (pedía 30 puntos).
--   * En ronda avanzada solo cantaba truco como FAROL (con carta mala):
--     un patrón al revés, delatador y explotable.
--   * Si perdió la 1ra ronda, jamás cantaba truco con mano buena.
--
-- EL ARREGLO: la fuerza se lleva SIEMPRE a escala de 3 cartas (regla de
-- tres: suma * 3 / cartas que quedan). La ronda 1 queda EXACTAMENTE igual
-- que hoy; las rondas 2 y 3 pasan a tener porcentajes razonables de
-- quiero / no quiero / subir. Verificado con scripts/sim_bot.ts (espejo
-- en JS de estas reglas: si se cambian estos umbrales, actualizarlo).
--
-- Mismo arreglo en _record_style: al medir si el HUMANO farolea el truco
-- usaba la misma suma sin escalar, así que en ronda 3 casi cualquier
-- truco tuyo quedaba mal anotado como "farol" en tu reputación.
--
-- NUEVO — bot_decisions: cada decisión del bot queda anotada (situación,
-- números que calculó, qué hizo, y el error si la jugada falló — antes
-- los errores se tragaban en silencio). Solo se lee desde el SQL Editor;
-- los jugadores no la ven. Se limpia sola (borra lo más viejo de 30 días).
--
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tabla de registro de decisiones del bot (solo uso interno).
-- ------------------------------------------------------------
create table if not exists public.bot_decisions (
  id         bigint generated always as identity primary key,
  game_id    uuid not null,
  rival_id   uuid,
  situation  text not null,          -- responder_truco / responder_envido / declarar_tanto / turno
  action     text,                   -- qué hizo (play, sing_truco, respond_truco_no, ...)
  detail     text,                   -- variante (truco/retruco/envido/tengo/...)
  numbers    jsonb,                  -- los números que miró para decidir
  ok         boolean,                -- ¿la jugada se ejecutó bien?
  error      text,                   -- si falló, el mensaje (antes se perdía)
  created_at timestamptz not null default now()
);
create index if not exists bot_decisions_created_at_idx on public.bot_decisions (created_at);
alter table public.bot_decisions enable row level security;   -- sin políticas: nadie la ve desde el juego
revoke all on public.bot_decisions from anon, authenticated;

-- ------------------------------------------------------------
-- 2. bot_step: fuerza normalizada + registro de decisiones.
--    (mismo cerebro que la etapa de fama/reputación; solo cambia cómo
--    se calcula 'eff' y que ahora todo queda anotado)
-- ------------------------------------------------------------
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
  -- EL ARREGLO: la suma de cartas restantes se lleva a escala de 3 cartas,
  -- así las varas de abajo valen igual en cualquier ronda.
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
                             'rr', round(rr, 3), 'card', chosen),
          acted_ok, v_err);
  if rr < 0.02 then
    delete from bot_decisions where created_at < now() - interval '30 days';
  end if;

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

-- ------------------------------------------------------------
-- 3. _record_style: el "detector de faroles" del humano usa la misma
--    escala de 3 cartas (antes, cantar truco en ronda 3 casi siempre
--    quedaba mal anotado como farol).
-- ------------------------------------------------------------
create or replace function public._record_style(p_game_id uuid, p_signal text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  g        games%rowtype;
  actor    uuid := auth.uid();
  v_human  uuid;
  remaining jsonb; full_hand jsonb;
  tanto int; power int; n int;
  bluff_envido constant int := 24;
  bluff_truco  constant int := 12;
begin
  select * into g from games where id = p_game_id;
  if not found or g.campaign_rival_id is null then return; end if;

  select id into v_human from profiles
   where id in (g.player1_id, g.player2_id) and not is_bot limit 1;
  if v_human is null or actor is distinct from v_human then return; end if;

  insert into campaign_style (user_id) values (v_human) on conflict (user_id) do nothing;

  if p_signal = 'hand_played' then
    update campaign_style set hands_played = hands_played + 1, updated_at = now()
     where user_id = v_human;

  elsif p_signal = 'envido_sung' then
    select cards into remaining from game_hands where game_id = p_game_id and player_id = v_human;
    full_hand := coalesce(remaining, '[]'::jsonb) || coalesce(
      (select jsonb_agg(pc.value->'card') from jsonb_array_elements(g.played_cards) pc
       where pc.value->>'player_id' = v_human::text), '[]'::jsonb);
    tanto := public._envido_points(full_hand);
    update campaign_style set
      envido_sung  = envido_sung + 1,
      envido_bluff = envido_bluff + (case when tanto < bluff_envido then 1 else 0 end),
      updated_at = now()
     where user_id = v_human;

  elsif p_signal = 'truco_sung' then
    select cards into remaining from game_hands where game_id = p_game_id and player_id = v_human;
    select count(*) into n from jsonb_array_elements(coalesce(remaining, '[]'::jsonb));
    -- misma escala de 3 cartas que usa el bot para su propia mano
    power := round(public._bot_hand_power(remaining) * 3.0 / greatest(n, 1));
    update campaign_style set
      truco_sung  = truco_sung + 1,
      truco_bluff = truco_bluff + (case when power < bluff_truco then 1 else 0 end),
      updated_at = now()
     where user_id = v_human;

  elsif p_signal = 'envido_folded' then
    update campaign_style set envido_folded = envido_folded + 1, updated_at = now()
     where user_id = v_human;

  elsif p_signal = 'truco_folded' then
    update campaign_style set truco_folded = truco_folded + 1, updated_at = now()
     where user_id = v_human;
  end if;
end;
$function$;

commit;
