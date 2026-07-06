-- ============================================================
-- TRUCAZO — Campaña, ETAPA 5: los bots USAN la reputación + fama visible
-- Fecha: 2026-07-06
--
-- Ahora los rivales "leen" el estilo del jugador (que se venía anotando en
-- campaign_style, ver [[campana-etapa4-reputacion]]) y ajustan APENAS su juego.
-- Tres lecturas (moderadas):
--   1. MENTIROSO -> te QUIEREN más: si faroleás seguido, el bot te acepta el
--      envido/truco más veces (tus bluffs dejan de funcionar).
--   2. CAGÓN -> te BLUFEAN más: si te achicás seguido, el bot canta con mano
--      floja para robarte.
--   3. AGRESIVO -> juega más CAUTO: si cantás todo el tiempo, el bot deja de
--      farolearte (no intenta robarte, porque sabe que le vas a pelear).
--
-- "Tu fama te precede": la lectura solo pesa si (a) tenés FAMA (progreso en el
-- ranking), (b) el rival es de los difíciles (los tontos no te conocen), y (c)
-- jugaste suficientes manos (si no, sos un desconocido). read = 0..1 combina
-- las tres. Con read bajo, el bot juega como antes.
--
-- FAMA (0..100) = progreso: campaign_points / FAMA_CAP. Es lo que se muestra en
-- la barra del HUD. get_campaign_map ahora devuelve la fama y un resumen del
-- estilo (mentiroso/cagón/agresivo en 0..100) para el panelito.
--
-- Todas las PERILLAS están juntas y comentadas. Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- get_campaign_map: agrega 'fama' y 'style' al resultado (para el HUD).
-- ------------------------------------------------------------
create or replace function public.get_campaign_map()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid         uuid := auth.uid();
  v_pts       integer;
  v_provinces jsonb;
  cs          campaign_style%rowtype;
  hp          int;
  fama        int;
  liar_pct int; folder_pct int; aggr_pct int;
  sung int;
  fama_cap constant int := 2000;   -- PERILLA: puntos para llegar a fama 100
  known_min constant int := 8;     -- PERILLA: manos mínimas para "te conocen"
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select campaign_points into v_pts from profiles where id = uid;
  v_pts := coalesce(v_pts, 0);
  fama := least(100, (v_pts * 100) / fama_cap);

  select * into cs from campaign_style where user_id = uid;
  hp   := coalesce(cs.hands_played, 0);
  sung := coalesce(cs.envido_sung, 0) + coalesce(cs.truco_sung, 0);
  -- Estilo en 0..100 para mostrar (escalas de presentación = perillas):
  liar_pct   := round( (coalesce(cs.envido_bluff,0) + coalesce(cs.truco_bluff,0))::numeric
                       / greatest(1, sung) * 100 );
  folder_pct := round( least(1, (coalesce(cs.envido_folded,0) + coalesce(cs.truco_folded,0))::numeric
                       / greatest(1, hp) * 2) * 100 );
  aggr_pct   := round( least(1, sung::numeric / greatest(1, hp) / 1.5) * 100 );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'order_index', p.order_index,
      'slug', p.slug,
      'name', p.name,
      'points_required', p.points_required,
      'unlocked', (
        v_pts >= p.points_required
        or exists (
          select 1 from campaign_progress cp2
          join campaign_rivals cr2 on cr2.id = cp2.rival_id
          where cp2.user_id = uid and cr2.province_id = p.id
        )
      ),
      'rivals', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', cr.id,
          'order_index', cr.order_index,
          'slug', cr.slug,
          'display_name', cr.display_name,
          'tagline', cr.tagline,
          'difficulty', cr.difficulty,
          'trait_liar', cr.trait_liar,
          'trait_aggressive', cr.trait_aggressive,
          'target_score', cr.target_score,
          'reward_coins', cr.reward_coins,
          'points_required', cr.points_required,
          'ranking_points', cr.ranking_points,
          'points_reward', cr.points_reward,
          'beaten', (cp.user_id is not null),
          'unlocked', (
            cp.user_id is not null
            or (v_pts >= p.points_required and v_pts >= cr.points_required)
          )
        ) order by cr.points_required, cr.order_index), '[]'::jsonb)
        from campaign_rivals cr
        left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
        where cr.province_id = p.id
      )
    ) order by p.order_index), '[]'::jsonb)
  into v_provinces
  from campaign_provinces p;

  return jsonb_build_object(
    'points', v_pts,
    'fama', fama,
    'style', jsonb_build_object(
      'known', hp >= known_min,
      'hands', hp,
      'liar', liar_pct,
      'folder', folder_pct,
      'aggressive', aggr_pct
    ),
    'provinces', v_provinces
  );
end;
$function$;

-- ------------------------------------------------------------
-- bot_step: mismo cerebro que la etapa de rasgos, más las 3 lecturas de
-- reputación. Solo cambian los umbrales de aceptar/farolear según 'read'.
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
        act := 'envido_say'; p_type := 'son_buenas';
      else
        act := 'envido_say'; p_type := 'tengo';
      end if;
    end if;

  elsif es_status in ('envido','real_envido','falta_envido') and last_env is distinct from v_bot::text then
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
