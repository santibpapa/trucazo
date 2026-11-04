-- ============================================================
-- TRUCAZO — Los bots del lobby juegan con el cerebro del Noroeste
-- Fecha: 2026-11-04
--
-- Qué resuelve: los bots del lobby (mesas 1v1 abiertas por la gente y por
-- ellos) seguían con el cerebro anterior al Noroeste. Ahora usan
-- _northwest_plan, el mismo de los rivales del Noroeste y de los torneos.
--
--   1. lobby_bots.strategy_profile: el estilo de juego de cada bot
--      (calculador, paciente, agresivo, marcador o farolera).
--   2. _rename_lobby_bot: al cambiar de nombre también sortea estilo nuevo,
--      como ya hacía con los rasgos.
--   3. _lobby_bot_act: una decisión con el cerebro del Noroeste. Es la misma
--      cuenta que tournament_internal.bot_act (marcador llevado a escala de 30
--      para las mesas a 15), leyendo el bot de lobby_bots.
--   4. bot_step: en partidas sin campaña contra un bot del lobby usa
--      _lobby_bot_act. Torneos, Historia y el resto no cambian.
--
-- La decisión sólo lee la mano del bot y las cartas públicas, igual que en
-- el Noroeste. Idempotente: se puede correr más de una vez sin efecto extra.
-- ============================================================

begin;

-- 1. ESTILO DE JUEGO -------------------------------------------------------

alter table public.lobby_bots
  add column if not exists strategy_profile text;

update public.lobby_bots
   set strategy_profile = (array['calculador','paciente','agresivo','marcador','farolera'])
                          [1 + floor(random() * 5)::int]
 where strategy_profile is null;

alter table public.lobby_bots alter column strategy_profile set default 'calculador';
alter table public.lobby_bots alter column strategy_profile set not null;

-- 2. NOMBRE NUEVO, ESTILO NUEVO --------------------------------------------
-- Copia de la versión vigente; sólo se agrega strategy_profile.

create or replace function public._rename_lobby_bot(p_bot uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_name text;
begin
  select n.name into v_name
    from lobby_bot_names n
   where not exists (
           select 1 from profiles p where lower(p.username) = lower(n.name))
   order by random()
   limit 1;

  if v_name is null then return; end if;

  update profiles set username = v_name where id = p_bot and is_bot;

  -- Carácter nuevo para el "jugador nuevo" (la dificultad queda en el máximo).
  update lobby_bots
     set trait_liar       = 3 + floor(random() * 7)::smallint,   -- 3..9
         trait_aggressive = 3 + floor(random() * 7)::smallint,   -- 3..9
         strategy_profile = (array['calculador','paciente','agresivo','marcador','farolera'])
                            [1 + floor(random() * 5)::int]
   where bot_id = p_bot;
end;
$function$;

-- 3. UNA DECISIÓN CON EL CEREBRO DEL NOROESTE ------------------------------

create or replace function public._lobby_bot_act(p_game_id uuid, p_bot uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g games%rowtype; b lobby_bots%rowtype;
  v_opp uuid; remaining jsonb; full_hand jsonb; cs campaign_style%rowtype;
  hp int; fama numeric; reads numeric; style jsonb; decision jsonb; action text;
  scale numeric; ok boolean := true; error_text text;
  prev_sub text := current_setting('request.jwt.claim.sub', true);
  prev_claims text := current_setting('request.jwt.claims', true);
begin
  select * into b from lobby_bots where bot_id = p_bot;
  if not found then return false; end if;
  select * into g from games where id = p_game_id;
  if not found or g.status <> 'playing' or g.awaiting_deal
     or p_bot not in (g.player1_id, g.player2_id) then
    return false;
  end if;
  v_opp := case when p_bot = g.player1_id then g.player2_id else g.player1_id end;

  -- ÚNICA lectura de game_hands: la fila del bot. Las cartas jugadas son
  -- públicas; se reconstruye así el envido de su mano original.
  select cards into remaining from game_hands where game_id = p_game_id and player_id = p_bot;
  full_hand := coalesce(remaining, '[]'::jsonb) || coalesce(
    (select jsonb_agg(e.value->'card') from jsonb_array_elements(g.played_cards) e
     where e.value->>'player_id' = p_bot::text), '[]'::jsonb);
  select * into cs from campaign_style where user_id = v_opp;
  hp := coalesce(cs.hands_played, 0);
  select least(1, coalesce(campaign_points, 0)::numeric / 2000) into fama from profiles where id = v_opp;
  reads := coalesce(fama, 0) * least(1, hp::numeric / 20);
  style := jsonb_build_object('read', reads,
    'liar_rate', (coalesce(cs.envido_bluff,0) + coalesce(cs.truco_bluff,0))::numeric /
      greatest(1, coalesce(cs.envido_sung,0) + coalesce(cs.truco_sung,0)),
    'fold_rate', least(1, (coalesce(cs.envido_folded,0) + coalesce(cs.truco_folded,0))::numeric /
      greatest(1, hp) * 2),
    'aggr_rate', least(1, (coalesce(cs.envido_sung,0) + coalesce(cs.truco_sung,0))::numeric /
      greatest(1, hp) / 1.5));
  -- El cerebro está calibrado a 30 puntos: en mesas a 15 se escala el marcador.
  scale := 30.0 / greatest(g.target_score, 1);
  decision := public._northwest_plan(remaining, full_hand, g.played_cards, g.round_results,
    g.envido_state, g.truco_state, p_bot, g.mano_player, g.round_number,
    g.current_turn = p_bot,
    round((case when p_bot = g.player1_id then g.player1_score else g.player2_score end) * scale)::int,
    round((case when v_opp = g.player1_id then g.player1_score else g.player2_score end) * scale)::int,
    b.strategy_profile, b.trait_liar::int, b.trait_aggressive::int,
    style, random()::numeric);
  action := decision->>'action';
  if action = 'wait' then return false; end if;

  perform set_config('request.jwt.claim.sub', p_bot::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_bot::text, 'role', 'authenticated')::text, true);
  begin
    case action
      when 'play' then perform public.play_card(p_game_id, decision->'card');
      when 'sing_envido' then perform public.sing_envido(p_game_id, decision->>'type');
      when 'sing_truco' then perform public.sing_truco(p_game_id, decision->>'type');
      when 'respond_envido_yes' then perform public.respond_envido(p_game_id, true);
      when 'respond_envido_no' then perform public.respond_envido(p_game_id, false);
      when 'respond_truco_yes' then perform public.respond_truco(p_game_id, true);
      when 'respond_truco_no' then perform public.respond_truco(p_game_id, false);
      when 'envido_say' then perform public.envido_say(p_game_id, decision->>'type');
    end case;
  exception when others then
    ok := false; error_text := sqlerrm;
  end;
  perform set_config('request.jwt.claim.sub', coalesce(prev_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(prev_claims, ''), true);
  insert into bot_decisions (game_id, rival_id, situation, action, detail, numbers, ok, error)
  values (p_game_id, null, 'lobby', action, decision->>'type', decision, ok, error_text);
  return ok;
end;
$function$;

revoke execute on function public._lobby_bot_act(uuid, uuid) from anon, authenticated, public;

-- 4. EL PUNTO DE ENTRADA ---------------------------------------------------
-- Copia de la versión vigente (20261030234500); se agrega el bloque del lobby.

create or replace function public.bot_step(p_game_id uuid)
 returns games
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); g games%rowtype; v_bot uuid;
begin
  select b.bot_id into v_bot from games gm
    join tournament_internal.bot_players b on b.bot_id in (gm.player1_id, gm.player2_id)
   where gm.id = p_game_id limit 1;
  if v_bot is not null then
    if uid is null then raise exception 'no autenticado'; end if;
    select * into g from games where id = p_game_id;
    if uid not in (g.player1_id, g.player2_id) then raise exception 'not a player of this game'; end if;
    if uid = v_bot then raise exception 'el bot no juega solo'; end if;
    perform tournament_internal.bot_act(p_game_id, v_bot);
    select * into g from games where id = p_game_id;
    return g;
  end if;
  -- Bots del lobby: mismo cerebro que el Noroeste.
  select lb.bot_id into v_bot from games gm
    join lobby_bots lb on lb.bot_id in (gm.player1_id, gm.player2_id)
   where gm.id = p_game_id and gm.campaign_rival_id is null limit 1;
  if v_bot is not null then
    if uid is null then raise exception 'no autenticado'; end if;
    select * into g from games where id = p_game_id;
    if uid not in (g.player1_id, g.player2_id) then raise exception 'not a player of this game'; end if;
    if uid = v_bot then raise exception 'el bot no juega solo'; end if;
    perform public._lobby_bot_act(p_game_id, v_bot);
    select * into g from games where id = p_game_id;
    return g;
  end if;
  if exists (select 1 from games gm join campaign_rivals r on r.id = gm.campaign_rival_id
             where gm.id = p_game_id and r.strategy_profile is not null) then
    return public._northwest_bot_step(p_game_id);
  end if;
  return public._bot_step_pre_noroeste(p_game_id);
end;
$function$;

commit;
