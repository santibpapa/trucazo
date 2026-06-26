-- ============================================================
-- TRUCAZO — Estadísticas de jugador en finish_game
-- Fecha: 2026-06-24
--
-- finish_game ahora también suma a profiles: games_played, y games_won /
-- games_lost según corresponda. (Las partidas anuladas por abandono mutuo,
-- que se cierran sin ganador en sweep_stale_games, no cuentan.)
-- finish_game sigue siendo solo interno (revocada del cliente). Idempotente.
-- ============================================================

begin;

create or replace function public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  g            games%rowtype;
  v_loser_id   uuid;
  v_winner_un  text;
  v_loser_un   text;
  v_net        numeric;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status = 'finished' then return; end if;  -- idempotente
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;
  if p_winner_id <> g.player1_id and p_winner_id <> g.player2_id then
    raise exception 'winner is not a player of this game';
  end if;

  v_loser_id  := case when p_winner_id = g.player1_id then g.player2_id else g.player1_id end;
  v_winner_un := case when p_winner_id = g.player1_id then g.player1_username else g.player2_username end;
  v_loser_un  := case when p_winner_id = g.player1_id then g.player2_username else g.player1_username end;
  v_net       := g.bet / 2.0;

  update games
     set status = 'finished', winner_id = p_winner_id,
         player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
   where id = p_game_id;

  -- pozo al ganador
  update profiles set coins = coins + g.bet where id = p_winner_id;

  -- estadísticas
  update profiles set games_played = games_played + 1, games_won = games_won + 1 where id = p_winner_id;
  update profiles set games_played = games_played + 1, games_lost = games_lost + 1 where id = v_loser_id;

  -- historial de ambos
  insert into game_history (player_id, opponent_id, opponent_username, result, coins_change)
  values
    (p_winner_id, v_loser_id,  v_loser_un,  'win',   v_net),
    (v_loser_id,  p_winner_id, v_winner_un, 'loss', -v_net);
end;
$function$;

commit;
