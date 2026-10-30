-- ============================================================
-- TRUCAZO — Completar torneos 1v1 con bots que parecen jugadores
-- Fecha: 2026-10-30
--
-- Qué resuelve: si a la hora de inicio un torneo marcado no llegó al cupo,
-- se completa con bots de máxima dificultad (el cerebro del Noroeste) y el
-- torneo arranca solo. Los bots tienen nombre, historial y antigüedad de
-- jugador común; no reciben correos y nada en pantalla los distingue.
--
--   1. tournament_internal.bot_players: los 16 bots y su estilo de juego.
--   2. tournament_internal.bot_fill: qué torneos se completan con bots.
--   3. Las cuentas (auth.users + profiles), sin chocar con nombres reales.
--   4. Los bots nunca reciben correos del torneo.
--   5. bot_act: una decisión del bot con el cerebro del Noroeste.
--   6. bot_step: en partidas de torneo contra estos bots usa bot_act.
--   7. Al abrirse un cruce, el bot "entra" al instante.
--   8. bot_tick (cada minuto): completa el cupo e inicia; crea y juega los
--      cruces bot contra bot, una mano por minuto; y si la persona abandona,
--      el bot sigue jugando y le corre el reloj como haría un rival.
--   9. Marca el torneo 1v1 de hoy y programa el minuto.
--
-- Idempotente: se puede correr más de una vez sin efecto extra.
-- ============================================================

begin;

-- 1-2. TABLAS INTERNAS -----------------------------------------------------

create table if not exists tournament_internal.bot_players (
  bot_id           uuid primary key references public.profiles(id) on delete cascade,
  strategy_profile text not null,
  trait_liar       smallint not null,
  trait_aggressive smallint not null
);

create table if not exists tournament_internal.bot_fill (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- 3. LAS CUENTAS -----------------------------------------------------------

do $accounts$
declare
  b record;
  v_name text;
  v_played int;
  v_won int;
begin
  for b in select * from (values
    (1,'Facu_Lezcano88','calculador',5,6),  (2,'MaruGodoy_','paciente',4,5),
    (3,'cholo.benitez','agresivo',7,8),     (4,'Juanma_Quiroga','marcador',5,7),
    (5,'LaTana_Ok','farolera',8,6),         (6,'Gonza.Ferreyra','calculador',4,6),
    (7,'nico_ruiz10','marcador',6,6),       (8,'Pato_Mendoza','paciente',5,4),
    (9,'Lucho_1987','agresivo',6,8),        (10,'Romi_Acosta','calculador',5,5),
    (11,'el_flaco_quique','farolera',8,7),  (12,'Seba.Ledesma','marcador',5,6),
    (13,'Mati_Coronel','calculador',6,7),   (14,'Vale_Sosa22','paciente',4,6),
    (15,'Dani.Peralta','agresivo',7,7),     (16,'Ruben_Gauna','marcador',6,5)
  ) as v(n, username, profile, liar, aggressive) loop
    -- Si una persona ya usa ese nombre, se le agrega un número.
    v_name := b.username;
    while exists (select 1 from public.profiles p
                  where lower(p.username) = lower(v_name)
                    and p.id <> ('b0720000-0000-4000-a000-0000000000' || lpad(b.n::text, 2, '0'))::uuid) loop
      v_name := b.username || (10 + floor(random() * 90))::int;
    end loop;

    insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000',
            ('b0720000-0000-4000-a000-0000000000' || lpad(b.n::text, 2, '0'))::uuid,
            'authenticated', 'authenticated', 'torneo' || b.n || '@trucazo.bot', now(),
            '{"provider":"bot","providers":["bot"]}',
            jsonb_build_object('username', v_name), now(), now())
    on conflict (id) do nothing;

    -- Historial creíble: entre 60 y 320 partidas, ganadas el 54–66%.
    v_played := 60 + floor(random() * 260)::int;
    v_won := round(v_played * (0.54 + random() * 0.12))::int;
    insert into public.profiles (id, username, is_bot, coins, games_played, games_won,
                                 games_lost, created_at)
    values (('b0720000-0000-4000-a000-0000000000' || lpad(b.n::text, 2, '0'))::uuid,
            v_name, true, 3000 + floor(random() * 9000)::int, v_played, v_won,
            v_played - v_won, now() - make_interval(days => 20 + floor(random() * 50)::int))
    on conflict (id) do update set
      is_bot = true,
      games_played = greatest(public.profiles.games_played, excluded.games_played),
      games_won = greatest(public.profiles.games_won, excluded.games_won),
      games_lost = greatest(public.profiles.games_lost, excluded.games_lost),
      created_at = least(public.profiles.created_at, excluded.created_at);

    insert into tournament_internal.bot_players (bot_id, strategy_profile, trait_liar, trait_aggressive)
    values (('b0720000-0000-4000-a000-0000000000' || lpad(b.n::text, 2, '0'))::uuid,
            b.profile, b.liar, b.aggressive)
    on conflict (bot_id) do update set
      strategy_profile = excluded.strategy_profile,
      trait_liar = excluded.trait_liar,
      trait_aggressive = excluded.trait_aggressive;
  end loop;

  -- Misma reparación que 20260829163123: GoTrue no tolera tokens en NULL.
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users'
               and column_name = 'confirmation_token') then
    update auth.users set confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, '')
    where raw_app_meta_data->>'provider' = 'bot';
  end if;
end $accounts$;

-- 4. SIN CORREOS PARA BOTS -------------------------------------------------

create or replace function tournament_internal.skip_bot_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and is_bot) then
    return null;
  end if;
  return new;
end;
$$;
drop trigger if exists tournament_skip_bot_email on public.tournament_email_jobs;
create trigger tournament_skip_bot_email before insert on public.tournament_email_jobs
  for each row execute function tournament_internal.skip_bot_email();

-- 5. UNA DECISIÓN DEL BOT --------------------------------------------------
--
-- Igual que _northwest_bot_step, pero el estilo sale de bot_players en vez de
-- campaign_rivals, y el marcador se lleva a escala de 30 (el plan del Noroeste
-- está calibrado a 30 puntos). Sólo lee la mano del bot. Devuelve true si
-- ejecutó una jugada válida.

create or replace function tournament_internal.bot_act(p_game_id uuid, p_bot uuid)
returns boolean language plpgsql security definer set search_path = public as $function$
declare
  g games%rowtype; b tournament_internal.bot_players%rowtype;
  v_opp uuid; remaining jsonb; full_hand jsonb; cs campaign_style%rowtype;
  hp int; fama numeric; reads numeric; style jsonb; decision jsonb; action text;
  scale numeric; ok boolean := true; error_text text;
  prev_sub text := current_setting('request.jwt.claim.sub', true);
  prev_claims text := current_setting('request.jwt.claims', true);
begin
  select * into b from tournament_internal.bot_players where bot_id = p_bot;
  if not found then return false; end if;
  select * into g from games where id = p_game_id;
  if not found or g.status <> 'playing' or g.awaiting_deal
     or p_bot not in (g.player1_id, g.player2_id) then
    return false;
  end if;
  v_opp := case when p_bot = g.player1_id then g.player2_id else g.player1_id end;

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
  values (p_game_id, null, 'torneo', action, decision->>'type', decision, ok, error_text);
  return ok;
end;
$function$;

-- Ejecuta una RPC del juego (advance_hand / timeout_mazo) como si la llamara
-- el bot, igual que hace la pantalla de una persona.
create or replace function tournament_internal.bot_call(p_game_id uuid, p_bot uuid, p_rpc text)
returns void language plpgsql security definer set search_path = public as $function$
declare
  prev_sub text := current_setting('request.jwt.claim.sub', true);
  prev_claims text := current_setting('request.jwt.claims', true);
begin
  perform set_config('request.jwt.claim.sub', p_bot::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_bot::text, 'role', 'authenticated')::text, true);
  begin
    if p_rpc = 'advance_hand' then perform public.advance_hand(p_game_id);
    elsif p_rpc = 'timeout_mazo' then perform public.timeout_mazo(p_game_id);
    end if;
  exception when others then null;
  end;
  perform set_config('request.jwt.claim.sub', coalesce(prev_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(prev_claims, ''), true);
end;
$function$;

-- Quién tiene que actuar ahora (mismo criterio que la pantalla de juego).
create or replace function tournament_internal.game_actor(g public.games)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when g.envido_state->>'status' = 'declaring' then (g.envido_state->>'declare_turn')::uuid
    when g.envido_state->>'status' in ('envido','real_envido','falta_envido') then
      case when g.envido_state->>'last_singer' = g.player1_id::text then g.player2_id else g.player1_id end
    when g.truco_state->>'status' in ('truco','retruco','vale_cuatro') then
      case when g.truco_state->>'last_singer' = g.player1_id::text then g.player2_id else g.player1_id end
    else g.current_turn end;
$$;

-- 6. BOT_STEP --------------------------------------------------------------
--
-- La pantalla de la persona sigue llamando bot_step como con cualquier bot.
-- Si el rival es un bot de torneo, decide bot_act; si no, todo queda como
-- estaba (misma derivación que 20260923121000).

create or replace function public.bot_step(p_game_id uuid)
returns games language plpgsql security definer set search_path = public as $function$
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
  if exists (select 1 from games g join campaign_rivals r on r.id=g.campaign_rival_id
             where g.id=p_game_id and r.strategy_profile is not null) then
    return public._northwest_bot_step(p_game_id);
  end if;
  return public._bot_step_pre_noroeste(p_game_id);
end;
$function$;

-- 7. EL BOT ENTRA AL CRUCE AL INSTANTE -------------------------------------

create or replace function tournament_internal.bot_enter_ready_match()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    insert into public.tournament_match_presence(match_id, tournament_id, entry_id, user_id)
      select new.id, new.tournament_id, member.entry_id, member.user_id
        from public.tournament_entry_members member
        join tournament_internal.bot_players b on b.bot_id = member.user_id
       where member.entry_id in (new.side_a_entry_id, new.side_b_entry_id)
         and member.status = 'accepted'
    on conflict (match_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists tournament_bot_enter_ready_match on public.tournament_matches;
create trigger tournament_bot_enter_ready_match after update of status on public.tournament_matches
  for each row execute function tournament_internal.bot_enter_ready_match();

-- 8. EL MINUTO DE LOS BOTS -------------------------------------------------

create or replace function tournament_internal.bot_tick()
returns void language plpgsql security definer set search_path = public as $function$
declare
  t tournaments%rowtype; m tournament_matches%rowtype; g games%rowtype;
  v_needed int; v_bot uuid; v_entry uuid; v_a uuid; v_b uuid; v_name_a text; v_name_b text;
  v_hands record; v_game_id uuid; v_actor uuid; v_human uuid; v_bots int; i int;
begin
  -- a) A la hora de inicio: completar el cupo con bots e iniciar.
  for t in select tt.* from tournaments tt
      join tournament_internal.bot_fill f on f.tournament_id = tt.id
     where tt.status = 'published' and tt.mode = '1v1' and tt.starts_at <= now()
       and tt.roster_frozen_at is null loop
    begin
      select * into t from tournaments where id = t.id for update;
      continue when t.status <> 'published';
      -- Quedan las inscripciones con check-in y la lista de espera; start_one
      -- reemplaza a quien no confirmó con la espera, y el resto lo ponen bots.
      v_needed := t.capacity
        - (select count(*) from tournament_entries e
            join tournament_checkins c on c.entry_id = e.id
           where e.tournament_id = t.id and e.status = 'active')
        - (select count(*) from tournament_entries e
           where e.tournament_id = t.id and e.status = 'waitlisted');
      for i in 1..greatest(v_needed, 0) loop
        select b.bot_id into v_bot from tournament_internal.bot_players b
         where not exists (select 1 from tournament_entry_members mm
                           where mm.tournament_id = t.id and mm.user_id = b.bot_id)
         order by random() limit 1;
        exit when v_bot is null;
        insert into tournament_entries(tournament_id, status, kind, created_by)
          values (t.id, 'active', 'solo', v_bot) returning id into v_entry;
        insert into tournament_entry_members(tournament_id, entry_id, user_id, role, status, accepted_at)
          values (t.id, v_entry, v_bot, 'captain', 'accepted', now());
        insert into tournament_checkins(entry_id, tournament_id, confirmed_by)
          values (v_entry, t.id, v_bot);
        v_bot := null;
      end loop;
      perform tournament_internal.start_one(t.id, null);
    exception when others then
      raise warning 'bot_tick fill %: %', t.id, sqlerrm;
    end;
  end loop;

  -- b) Cruces listos con todos adentro y sin mesa (bot contra bot): crearla.
  for m in select mm.* from tournament_matches mm
      join tournament_internal.bot_fill f on f.tournament_id = mm.tournament_id
      join tournaments tt on tt.id = mm.tournament_id
     where mm.status = 'ready' and mm.game_id is null and tt.status = 'running'
       and mm.entry_deadline > now() loop
    begin
      perform 1 from tournaments where id = m.tournament_id for update;
      select * into m from tournament_matches where id = m.id for update;
      continue when m.status <> 'ready' or m.game_id is not null;
      select a.user_id, pa.username into v_a, v_name_a
        from tournament_entry_members a join profiles pa on pa.id = a.user_id
       where a.entry_id = m.side_a_entry_id and a.status = 'accepted';
      select bm.user_id, pb.username into v_b, v_name_b
        from tournament_entry_members bm join profiles pb on pb.id = bm.user_id
       where bm.entry_id = m.side_b_entry_id and bm.status = 'accepted';
      continue when v_a is null or v_b is null
        or not exists (select 1 from tournament_match_presence where match_id = m.id and user_id = v_a)
        or not exists (select 1 from tournament_match_presence where match_id = m.id and user_id = v_b);
      select * into t from tournaments where id = m.tournament_id;
      v_game_id := gen_random_uuid();
      -- Mismo alta que tournament_enter_match.
      insert into tables(id, tournament_match_id, tournament_id, name, creator_id,
        creator_username, opponent_id, opponent_username, bet, is_private,
        status, target_score, time_limit)
      values(v_game_id, m.id, t.id, t.name, v_a, v_name_a, v_b, v_name_b,
        0, true, 'playing', t.target_score, 30);
      select * into v_hands from _deal_hands();
      insert into games(id, tournament_match_id, player1_id, player2_id, player1_username,
        player2_username, current_turn, mano_player, bet, target_score,
        time_limit, turn_started_at)
      values(v_game_id, m.id, v_a, v_b, v_name_a, v_name_b, v_a, v_a,
        0, t.target_score, 30, now());
      insert into game_hands(game_id, player_id, cards)
        values (v_game_id, v_a, v_hands.h1), (v_game_id, v_b, v_hands.h2);
      update tournament_matches set status = 'playing', game_id = v_game_id,
        started_at = now(), updated_at = now() where id = m.id;
    exception when others then
      raise warning 'bot_tick match %: %', m.id, sqlerrm;
    end;
  end loop;

  -- c) Partidas en curso con bots.
  for g in select gm.* from games gm
      join tournament_matches mm on mm.game_id = gm.id
      join tournament_internal.bot_fill f on f.tournament_id = mm.tournament_id
     where gm.status = 'playing'
       and exists (select 1 from tournament_internal.bot_players b
                   where b.bot_id in (gm.player1_id, gm.player2_id)) loop
    begin
      select count(*) into v_bots from tournament_internal.bot_players b
       where b.bot_id in (g.player1_id, g.player2_id);
      if v_bots = 2 then
        -- Bot contra bot: una mano por minuto, como una partida real.
        if g.awaiting_deal then
          perform tournament_internal.bot_call(g.id, g.player1_id, 'advance_hand');
          select * into g from games where id = g.id;
        end if;
        for i in 1..40 loop
          exit when g.status <> 'playing' or g.awaiting_deal;
          exit when not tournament_internal.bot_act(g.id, tournament_internal.game_actor(g));
          select * into g from games where id = g.id;
        end loop;
        -- Si un bot quedó trabado, el reloj lo resuelve como en cualquier mesa.
        if g.status = 'playing' and not g.awaiting_deal
           and g.turn_started_at + make_interval(secs => g.time_limit + 3) < now() then
          perform tournament_internal.bot_call(g.id, g.player1_id, 'timeout_mazo');
        end if;
      else
        -- Contra una persona: la pantalla de la persona mueve al bot. Si la
        -- cerró, el bot sigue: juega su turno, reparte y le corre el reloj.
        select b.bot_id into v_bot from tournament_internal.bot_players b
         where b.bot_id in (g.player1_id, g.player2_id);
        v_human := case when v_bot = g.player1_id then g.player2_id else g.player1_id end;
        continue when g.updated_at > now() - interval '15 seconds';
        if g.awaiting_deal then
          perform tournament_internal.bot_call(g.id, v_bot, 'advance_hand');
        else
          v_actor := tournament_internal.game_actor(g);
          if v_actor = v_bot then
            perform tournament_internal.bot_act(g.id, v_bot);
          elsif coalesce(case when g.envido_state->>'status' = 'declaring'
                         then (g.envido_state->>'declare_turn')::uuid else g.current_turn end, v_bot) = v_human
                and g.turn_started_at + make_interval(secs => g.time_limit + 3) < now() then
            perform tournament_internal.bot_call(g.id, v_bot, 'timeout_mazo');
          end if;
        end if;
      end if;
    exception when others then
      raise warning 'bot_tick game %: %', g.id, sqlerrm;
    end;
  end loop;
end;
$function$;

revoke all on table tournament_internal.bot_players from public, anon, authenticated;
revoke all on table tournament_internal.bot_fill from public, anon, authenticated;
revoke execute on function tournament_internal.skip_bot_email() from public, anon, authenticated;
revoke execute on function tournament_internal.bot_act(uuid, uuid) from public, anon, authenticated;
revoke execute on function tournament_internal.bot_call(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function tournament_internal.game_actor(public.games) from public, anon, authenticated;
revoke execute on function tournament_internal.bot_enter_ready_match() from public, anon, authenticated;
revoke execute on function tournament_internal.bot_tick() from public, anon, authenticated;
revoke execute on function public.bot_step(uuid) from public, anon;
grant execute on function public.bot_step(uuid) to authenticated;

-- 9. EL TORNEO DE HOY ------------------------------------------------------
-- Torneos 1v1 publicados que empiezan el 30/10/2026 (hora de Argentina).

insert into tournament_internal.bot_fill(tournament_id)
  select id from public.tournaments
   where mode = '1v1' and status = 'published' and deleted_at is null
     and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date = date '2026-10-30'
on conflict (tournament_id) do nothing;

commit;

-- Con el mismo nombre, pg_cron reemplaza el trabajo en vez de duplicarlo.
select cron.schedule('trucazo-tournament-bots-minute', '* * * * *',
  'select tournament_internal.bot_tick()');

-- Confirmación: debe aparecer el torneo de hoy.
select t.name, t.starts_at at time zone 'America/Argentina/Buenos_Aires' as empieza,
       t.capacity as cupo
  from tournament_internal.bot_fill f join public.tournaments t on t.id = f.tournament_id;
