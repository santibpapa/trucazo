-- ============================================================
-- TRUCAZO — Bots del lobby: que siempre haya con quién jugar
-- Fecha: 2026-08-15
--
-- Qué resuelve: si no hay nadie conectado, el lobby se ve vacío y el que entra
-- no puede jugar. Acá agregamos 3 "jugadores" que en realidad son bots de
-- máxima dificultad (los mismos del final de la campaña), pero que se comportan
-- como jugadores comunes: se sientan en las mesas que abre la gente, abren sus
-- propias mesas en el lobby, apuestan monedas de verdad y aceptan la revancha.
--
-- Lo que hace esta migración:
--   1. Tabla lobby_bots: quiénes son y qué tan vivos juegan.
--   2. Las 3 cuentas-bot nuevas (auth.users + profiles), con nombres de jugador
--      común (no personajes de la campaña).
--   3. Ayudantes: _bot_topup (que nunca se queden sin monedas) y
--      _free_lobby_bot (elegir uno que esté libre).
--   4. bot_step: hasta hoy solo funcionaba en duelos de campaña. Ahora también
--      juega partidas normales, sacando su nivel de lobby_bots. El cerebro
--      (cómo decide) queda EXACTAMENTE igual.
--   5. bot_join_table: un bot se sienta en la mesa que abriste (la llama tu
--      propia pantalla de espera si no aparece nadie).
--   6. ensure_lobby_tables: mantiene un par de mesas abiertas en el lobby.
--   7. request_rematch: si tu rival es un bot, acepta la revancha al toque
--      (antes te quedabas esperando para siempre).
--
-- Idempotente: se puede correr más de una vez sin efecto extra.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. QUIÉNES SON
--
-- Tabla aparte de campaign_rivals a propósito: estos bots NO son rivales de la
-- campaña (no tienen que aparecer en la galería del modo historia). Guardan las
-- mismas perillas que usa el cerebro: dificultad y los dos rasgos.
-- ------------------------------------------------------------

create table if not exists public.lobby_bots (
  bot_id           uuid primary key references public.profiles(id) on delete cascade,
  difficulty       smallint not null default 10,  -- 1..10 (10 = juega al máximo)
  trait_liar       smallint not null default 5,   -- 1..10 (cuánto farolea)
  trait_aggressive smallint not null default 5    -- 1..10 (cuánto presiona)
);

alter table public.lobby_bots enable row level security;
-- Sin policies: es una tabla interna. Solo la leen las funciones definer.

-- ------------------------------------------------------------
-- 2. LAS CUENTAS
--
-- UUIDs fijos para que la migración sea repetible. Nombres de jugador común, a
-- propósito: la gracia es que en el lobby no se distingan de una persona.
-- Nunca inician sesión: existen solo para sentarse a jugar.
-- ------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','b0710000-0000-4000-a000-000000000001','authenticated','authenticated','lobby1@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"ElRusso92"}',    now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0710000-0000-4000-a000-000000000002','authenticated','authenticated','lobby2@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Tincho_Ok"}',    now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0710000-0000-4000-a000-000000000003','authenticated','authenticated','lobby3@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Naty_Rosario"}', now(), now())
on conflict (id) do nothing;

-- Ojo con el "on conflict": en Supabase el trigger handle_new_user ya creó el
-- perfil (con las 1000 monedas de arranque) apenas se insertó el usuario de
-- arriba. Por eso acá también fijamos el bolsillo: si no, los bots quedarían
-- con 1000 monedas en vez de la banca que queremos.
insert into public.profiles (id, username, is_bot, coins) values
  ('b0710000-0000-4000-a000-000000000001','ElRusso92',    true, 100000),
  ('b0710000-0000-4000-a000-000000000002','Tincho_Ok',    true, 100000),
  ('b0710000-0000-4000-a000-000000000003','Naty_Rosario', true, 100000)
on conflict (id) do update set
  is_bot   = true,
  username = excluded.username,
  coins    = greatest(profiles.coins, excluded.coins);

-- Los tres al máximo nivel, pero con carácter distinto para que no se sientan
-- el mismo jugador tres veces: uno farolero y picante, uno sobrio, una que
-- presiona pero miente poco.
insert into public.lobby_bots (bot_id, difficulty, trait_liar, trait_aggressive) values
  ('b0710000-0000-4000-a000-000000000001', 10, 8, 8),
  ('b0710000-0000-4000-a000-000000000002', 10, 4, 5),
  ('b0710000-0000-4000-a000-000000000003', 10, 5, 8)
on conflict (bot_id) do update set
  difficulty = excluded.difficulty,
  trait_liar = excluded.trait_liar,
  trait_aggressive = excluded.trait_aggressive;

-- ------------------------------------------------------------
-- 3. AYUDANTES
-- ------------------------------------------------------------

-- Las monedas de los bots son de mentira, pero el juego las cobra y las paga de
-- verdad: si un bot pierde muchas seguidas se quedaría sin saldo para sentarse.
-- Antes de cada mesa le rellenamos el bolsillo hasta un piso.
create or replace function public._bot_topup(p_bot uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  update profiles set coins = greatest(coins, 20000) where id = p_bot and is_bot;
end;
$function$;

-- Un bot que esté libre: sin mesa propia esperando y sin partida en curso.
-- Devuelve null si los tres están ocupados (el que espera sigue esperando).
--
-- "Partida en curso" pide movimiento en la última media hora. Si no, un rival
-- que cerró la pestaña justo al empezar dejaría al bot ocupado para siempre
-- (esas partidas colgadas las cierra igual el barrido de mesas viejas).
create or replace function public._free_lobby_bot()
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_bot uuid;
begin
  select lb.bot_id into v_bot
    from lobby_bots lb
   where not exists (
           select 1 from tables t
            where t.creator_id = lb.bot_id and t.status = 'waiting')
     and not exists (
           select 1 from tables t
           left join games gm on gm.id = t.id
            where (t.creator_id = lb.bot_id or t.opponent_id = lb.bot_id)
              and t.status = 'playing'
              and (gm.id is null or gm.status = 'playing')
              and coalesce(gm.updated_at, t.created_at) > now() - interval '30 minutes')
   order by random()
   limit 1;
  return v_bot;
end;
$function$;

-- ------------------------------------------------------------
-- 4. EL CEREBRO, AHORA TAMBIÉN FUERA DE LA CAMPAÑA
--
-- Único cambio respecto de la versión anterior: dejaba de funcionar si la
-- partida no era un duelo de campaña, y sacaba el nivel/rasgos de
-- campaign_rivals. Ahora, si no es campaña, los saca de lobby_bots. Todas las
-- decisiones (cuándo canta, cuándo miente, qué carta tira) quedan idénticas.
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
  opp_rank int; best_rank int; ncards int; env_need int;
  rr numeric;
  act text; p_type text; chosen jsonb; esc_type text; can_env boolean;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  select id into v_bot from profiles where id in (g.player1_id, g.player2_id) and is_bot limit 1;
  if v_bot is null then raise exception 'esta partida no tiene bot'; end if;
  if uid = v_bot then raise exception 'el bot no juega solo'; end if;
  v_human := case when v_bot = g.player1_id then g.player2_id else g.player1_id end;

  if g.status <> 'playing' or g.awaiting_deal then return g; end if;

  -- De dónde sale el nivel: campaña => el rival de la galería; si no => el bot
  -- del lobby (máxima dificultad).
  if g.campaign_rival_id is not null then
    select coalesce(difficulty, 5), coalesce(trait_liar, 5), coalesce(trait_aggressive, 5)
      into d, tl, ta
      from campaign_rivals where id = g.campaign_rival_id;
  else
    select coalesce(difficulty, 10), coalesce(trait_liar, 5), coalesce(trait_aggressive, 5)
      into d, tl, ta
      from lobby_bots where bot_id = v_bot;
    if not found then raise exception 'este bot no juega en el lobby'; end if;
  end if;
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
    -- Cuánto tanto pido para querer, según lo que está EN JUEGO: el envido
    -- simple se quiere con poco; la falta envido se juega la partida, así que
    -- solo se quiere con un tanto muy fuerte.
    env_need := case es_status
                  when 'falta_envido' then greatest(29, 34 - d)   -- ~29-31: casi siempre no quiero
                  when 'real_envido'  then greatest(24, 29 - d)
                  else                     greatest(20, 27 - d)
                end;
    if et >= 31 and d >= 6 and esc_type is not null and rr < 0.45 then
      act := 'sing_envido'; p_type := esc_type;
    elsif et >= env_need or (rr < r_call and es_status <> 'falta_envido') then
      act := 'respond_envido_yes';                            -- lectura 1: al mentiroso lo quiero más (no en la falta)
    elsif d <= 3 and es_status <> 'falta_envido' and rr < 0.5 then
      act := 'respond_envido_yes';                            -- el bot tonto acepta a ciegas, salvo la falta
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

-- ------------------------------------------------------------
-- 5. UN BOT SE SIENTA EN TU MESA
--
-- La llama tu propia pantalla de espera si pasan unos segundos y no aparece
-- nadie. Solo funciona sobre TU mesa y solo si es pública: las privadas son
-- para jugar con un amigo, ahí no se mete nadie.
-- Si no hay ningún bot libre devuelve la mesa como está (seguís esperando).
-- ------------------------------------------------------------

create or replace function public.bot_join_table(p_table_id uuid)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  t     tables%rowtype;
  v_bot uuid;
  v_un  text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.creator_id <> auth.uid() then raise exception 'no es tu mesa'; end if;
  if t.is_private then return t; end if;
  if t.status <> 'waiting' or t.opponent_id is not null then return t; end if;

  v_bot := public._free_lobby_bot();
  if v_bot is null then return t; end if;

  perform public._bot_topup(v_bot);
  select username into v_un from profiles where id = v_bot;
  update profiles set coins = coins - t.bet where id = v_bot;

  update tables
     set opponent_id = v_bot,
         opponent_username = v_un,
         status = 'playing'
   where id = p_table_id
   returning * into t;

  return t;
end;
$function$;

-- ------------------------------------------------------------
-- 6. QUE EL LOBBY NUNCA SE VEA VACÍO
--
-- La llama el lobby al abrirse. Si hay menos de 2 mesas públicas esperando,
-- un bot abre una (con apuesta y puntaje variados, para que no se noten
-- iguales). Si ya hay mesas de gente de verdad, no hace nada.
-- Las mesas que nadie toma las limpia y reembolsa sweep_stale_tables, igual
-- que las de cualquier jugador.
-- ------------------------------------------------------------

create or replace function public.ensure_lobby_tables()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_want  constant int := 2;      -- mesas públicas en espera que queremos ver
  v_names constant text[] := array[
    'Mesa del club', 'Truco tranqui', 'Una manito', 'La de la esquina',
    'Vamos a 30', 'Mesa del fondo', 'A ver quién se anima'
  ];
  v_open  int;
  v_bot   uuid;
  v_un    text;
  v_bet   int;
  v_score int;
  n       int := 0;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select count(*) into v_open from tables where status = 'waiting' and not is_private;

  while v_open + n < v_want loop
    v_bot := public._free_lobby_bot();
    exit when v_bot is null;

    perform public._bot_topup(v_bot);
    select username into v_un from profiles where id = v_bot;

    v_bet   := (array[20, 50, 100])[1 + floor(random() * 3)];
    v_score := case when random() < 0.5 then 15 else 30 end;

    update profiles set coins = coins - v_bet where id = v_bot;

    insert into tables (name, creator_id, creator_username, bet, is_private,
                        private_code, status, target_score, time_limit)
    values (v_names[1 + floor(random() * array_length(v_names, 1))],
            v_bot, v_un, v_bet, false, null, 'waiting', v_score, 30);

    n := n + 1;
  end loop;

  return n;
end;
$function$;

-- ------------------------------------------------------------
-- 7. REVANCHA CONTRA UN BOT
--
-- Igual que antes, con un solo agregado: si el rival es un bot (y no es un
-- duelo de campaña, que tiene su propio botón), acepta la revancha en el acto,
-- así no te quedás esperando una respuesta que nunca llega.
-- ------------------------------------------------------------

create or replace function public.request_rematch(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g          games%rowtype;
  uid        uuid := auth.uid();
  per_stake  int;
  new_id     uuid;
  h1 jsonb; h2 jsonb;
  c1 int; c2 int;
  v_opp      uuid;
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

  -- el rival bot dice que sí al toque (y con el bolsillo lleno para bancar la apuesta)
  v_opp := case when uid = g.player1_id then g.player2_id else g.player1_id end;
  if g.campaign_rival_id is null and exists (select 1 from profiles where id = v_opp and is_bot) then
    perform public._bot_topup(v_opp);
    if v_opp = g.player1_id then
      update games set rematch_p1 = true where id = p_game_id;
      g.rematch_p1 := true;
    else
      update games set rematch_p2 = true where id = p_game_id;
      g.rematch_p2 := true;
    end if;
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

-- ------------------------------------------------------------
-- 8. PERMISOS
--
-- Las dos que llama el frontend van a authenticated. Las ayudantes internas
-- (las que empiezan con "_") no las llama nadie de afuera.
-- ------------------------------------------------------------

grant execute on function public.bot_join_table(uuid)     to authenticated;
grant execute on function public.ensure_lobby_tables()    to authenticated;

revoke execute on function public._bot_topup(uuid)  from anon, authenticated, public;
revoke execute on function public._free_lobby_bot() from anon, authenticated, public;

commit;
