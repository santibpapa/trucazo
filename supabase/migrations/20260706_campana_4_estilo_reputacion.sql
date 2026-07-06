-- ============================================================
-- TRUCAZO — Campaña, ETAPA 4: registro del estilo de juego (base de reputación)
-- Fecha: 2026-07-06
--
-- Empieza a ANOTAR cómo juega el humano en los duelos de campaña, para armarle
-- una "reputación" a futuro. En esta etapa SOLO se registra: los bots todavía
-- NO usan estos datos (decisión de producto del 2026-07-04, ver la memoria
-- campana-etapa4-reputacion). El vocabulario espeja el de los bots
-- (mentiroso/agresivo) para que después sea directo cruzarlos.
--
-- Qué se anota (por jugador, acumulado):
--   - hands_played : manos jugadas en campaña (denominador para normalizar)
--   - envido_sung / envido_bluff : cuántas veces cantó/subió el envido, y de
--       esas cuántas con tanto flojo (bluf)
--   - truco_sung / truco_bluff : ídem para el truco (bluf = mano floja)
--   - envido_folded / truco_folded : cuántas veces se achicó ("no quiero")
--
-- SEGURIDAD: el registro es "dispará y olvidate". Cada enganche va dentro de un
-- bloque que se traga cualquier error (exception when others then null), así el
-- anotador NUNCA puede romper una partida (ni la de campaña ni el PvP). Además,
-- _record_style corta solo si no es un duelo de campaña o si quien actúa no es
-- el humano (el bot canta vía bot_step haciéndose pasar por su cuenta, y esas
-- acciones NO se anotan).
--
-- Las funciones compartidas con el PvP (sing_envido, sing_truco, respond_envido,
-- respond_truco, advance_hand) se reescriben enteras (Postgres no deja parchear
-- media función); el único cambio en cada una es el enganche al final. La rama
-- de PvP queda idéntica: _record_style sale al toque si campaign_rival_id es null.
-- Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tabla del estilo del jugador (una fila por usuario).
-- ------------------------------------------------------------
create table if not exists public.campaign_style (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  hands_played  integer not null default 0,
  envido_sung   integer not null default 0,
  envido_bluff  integer not null default 0,
  envido_folded integer not null default 0,
  truco_sung    integer not null default 0,
  truco_bluff   integer not null default 0,
  truco_folded  integer not null default 0,
  updated_at    timestamptz not null default now()
);

alter table public.campaign_style enable row level security;

drop policy if exists "ver mi estilo" on public.campaign_style;
create policy "ver mi estilo" on public.campaign_style
  for select to authenticated using (auth.uid() = user_id);

grant select on public.campaign_style to authenticated;

-- ------------------------------------------------------------
-- 2. El anotador. Se llama desde las funciones de juego (definer), nunca desde
-- el cliente. PERILLAS de "bluf" comentadas abajo para tunear fácil.
-- ------------------------------------------------------------
create or replace function public._record_style(p_game_id uuid, p_signal text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  g        games%rowtype;
  actor    uuid := auth.uid();
  v_human  uuid;
  remaining jsonb; full_hand jsonb;
  tanto int; power int;
  -- PERILLAS: por debajo de esto, cantar cuenta como "bluf".
  bluff_envido constant int := 24;   -- tanto flojo (0..33)
  bluff_truco  constant int := 12;   -- mano floja (misma vara que usa el bot)
begin
  select * into g from games where id = p_game_id;
  if not found or g.campaign_rival_id is null then return; end if;  -- solo campaña

  select id into v_human from profiles
   where id in (g.player1_id, g.player2_id) and not is_bot limit 1;
  if v_human is null or actor is distinct from v_human then return; end if;  -- solo el humano

  insert into campaign_style (user_id) values (v_human) on conflict (user_id) do nothing;

  if p_signal = 'hand_played' then
    update campaign_style set hands_played = hands_played + 1, updated_at = now()
     where user_id = v_human;

  elsif p_signal = 'envido_sung' then
    -- Tanto real = mano completa del humano (lo que le queda + lo que ya jugó).
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
    power := public._bot_hand_power(remaining);
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

-- ------------------------------------------------------------
-- 3. Enganches en las funciones de juego. Cada uno va blindado.
-- ------------------------------------------------------------

-- 3a. sing_envido: anota que el humano cantó/subió el envido.
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

  begin perform public._record_style(p_game_id, 'envido_sung'); exception when others then null; end;
  return g;
end;
$function$;

-- 3b. sing_truco: anota que el humano cantó/redobló el truco.
create or replace function public.sing_truco(p_game_id uuid, p_type text)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
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

  if g.envido_state->>'status' in ('envido','real_envido','falta_envido')
     and last_s is distinct from uid::text
     and (g.envido_state->>'last_singer') is distinct from uid::text then
    raise exception 'primero respondé el envido';
  end if;

  if pending and last_s is distinct from uid::text then
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

  begin perform public._record_style(p_game_id, 'truco_sung'); exception when others then null; end;
  return g;
end;
$function$;

-- 3c. respond_envido: anota cuando el humano se achica ("no quiero").
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
    update games set
      envido_state = g.envido_state || jsonb_build_object(
        'status','declaring','declare_turn', g.mano_player, 'mano_declared', null),
      updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  begin perform public._record_style(p_game_id, 'envido_folded'); exception when others then null; end;

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

-- 3d. respond_truco: anota cuando el humano se achica ("no quiero").
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

  begin perform public._record_style(p_game_id, 'truco_folded'); exception when others then null; end;

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

-- 3e. advance_hand: cuenta una mano jugada (a partir de la 2ª; la 1ª la cuenta
-- start_campaign_duel). El enganche va tras repartir la mano nueva.
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

  begin perform public._record_style(p_game_id, 'hand_played'); exception when others then null; end;
  return g;
end;
$function$;

-- 3f. start_campaign_duel: cuenta la 1ª mano del duelo. Reescribe la versión
-- vigente (revancha libre) agregando solo el enganche antes del return.
create or replace function public.start_campaign_duel(p_rival_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid        uuid := auth.uid();
  r          campaign_rivals%rowtype;
  pv         campaign_provinces%rowtype;
  v_pts      integer;
  v_username text;
  v_id       uuid := gen_random_uuid();
  h1 jsonb; h2 jsonb;
  g  games%rowtype;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into r from campaign_rivals where id = p_rival_id;
  if not found then raise exception 'rival no encontrado'; end if;
  if r.province_id is null then raise exception 'rival sin provincia'; end if;

  select username, campaign_points into v_username, v_pts from profiles where id = uid;
  if v_username is null then raise exception 'perfil no encontrado'; end if;
  v_pts := coalesce(v_pts, 0);

  if not exists (select 1 from campaign_progress where user_id = uid and rival_id = p_rival_id) then
    select * into pv from campaign_provinces where id = r.province_id;
    if v_pts < pv.points_required then raise exception 'todavía no desbloqueaste esta provincia'; end if;
    if v_pts < r.points_required then raise exception 'todavía no desbloqueaste este rival'; end if;
  end if;

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

  begin perform public._record_style(v_id, 'hand_played'); exception when others then null; end;
  return g;
end;
$function$;

commit;
