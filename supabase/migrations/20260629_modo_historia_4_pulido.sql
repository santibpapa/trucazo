-- ============================================================
-- TRUCAZO — Modo Historia, ETAPA 4: pulido (premio visible + limpieza)
-- Fecha: 2026-06-29
--
-- 1) games.campaign_reward: guarda las monedas de premio otorgadas en ese duelo
--    (>0 solo la primera vez que el jugador vence al rival). La pantalla de fin
--    lo usa para mostrar el cartel "+N monedas".
-- 2) start_campaign_duel: antes de crear el duelo nuevo, borra los duelos de
--    campaña sin terminar del mismo jugador, así no quedan colgados como
--    "partida en curso" ni se acumulan. Idempotente.
-- ============================================================

begin;

alter table public.games add column if not exists campaign_reward integer not null default 0;

-- finish_game: en la rama de campaña, además de pagar el premio la 1ª vez,
-- lo registra en games.campaign_reward para mostrarlo. Resto igual.
create or replace function public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
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
      if found then  -- primera vez que lo vence => pagar y registrar el premio
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

-- start_campaign_duel: limpia los duelos de campaña sin terminar del jugador
-- antes de crear el nuevo, y arranca el duelo (igual que antes).
create or replace function public.start_campaign_duel(p_rival_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
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

  -- Limpiar duelos de campaña sin terminar de este jugador (borrar la mesa
  -- arrastra game + game_hands por las llaves foráneas en cascada).
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

commit;
