-- ============================================================
-- TRUCAZO — Partidas colgadas: barrido + reembolso
-- Fecha: 2026-06-20
--
-- Si AMBOS jugadores abandonan una partida en curso sin terminarla, las
-- monedas que se descontaron al crear/unirse quedaban perdidas. (Si solo uno
-- se va, el otro usa claim_victory.) sweep_stale_games cierra esas partidas y
-- reembolsa la apuesta a cada jugador.
--
-- "Colgada" = status 'playing' y ninguno de los dos dio señales de vida
-- (touch_presence) hace más de p_minutes (si nunca marcó, se usa created_at).
--
-- Pensada para correr por cron (ver 20260620_stale_games_cron.sql). No se
-- otorga al cliente. Idempotente.
-- ============================================================

begin;

create or replace function public.sweep_stale_games(p_minutes int default 10)
 returns int language plpgsql security definer set search_path to 'public'
as $function$
declare
  g record;
  n int := 0;
  cutoff timestamptz := now() - make_interval(mins => p_minutes);
begin
  for g in
    select gm.* from games gm
    where gm.status = 'playing'
      and coalesce((select last_seen_at from game_presence where game_id = gm.id and player_id = gm.player1_id), gm.created_at) < cutoff
      and coalesce((select last_seen_at from game_presence where game_id = gm.id and player_id = gm.player2_id), gm.created_at) < cutoff
    for update
  loop
    -- reembolsar la apuesta a cada uno (g.bet = pozo = apuesta * 2)
    update profiles set coins = coins + (g.bet / 2) where id = g.player1_id;
    update profiles set coins = coins + (g.bet / 2) where id = g.player2_id;
    update games set status = 'finished', winner_id = null, updated_at = now() where id = g.id;
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- Solo para cron/admin: que no sea invocable desde el cliente.
revoke execute on function public.sweep_stale_games(int) from public, anon, authenticated;

commit;
