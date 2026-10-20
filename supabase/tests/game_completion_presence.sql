-- Sólo en la base descartable del CI, con la misma protección que PostgREST.
\set ON_ERROR_STOP on
load 'safeupdate';
set safeupdate.enabled = on;
begin;

create function pg_temp.game_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Cierre/presencia: %', detail; end if; end $$;

-- Confirmar que no estamos ejecutando la prueba sin la protección real.
do $$
begin
  begin
    delete from public.ranking_top3_state;
    raise exception 'safeupdate no bloqueó DELETE sin WHERE';
  exception when cardinality_violation then
    if sqlerrm <> 'DELETE requires a WHERE clause' then raise; end if;
  end;
end $$;

insert into auth.users(id, email, raw_user_meta_data) values
  ('fc000000-0000-4000-a000-000000000001','completion-a@test.invalid','{"username":"CompletionA"}'),
  ('fc000000-0000-4000-a000-000000000002','completion-b@test.invalid','{"username":"CompletionB"}'),
  ('fc000000-0000-4000-a000-000000000003','completion-c@test.invalid','{"username":"CompletionC"}'),
  ('fc000000-0000-4000-a000-000000000004','completion-d@test.invalid','{"username":"CompletionD"}'),
  ('fc000000-0000-4000-a000-000000000005','completion-bot@test.invalid','{"username":"CompletionBot"}');
update public.ranking_email_campaign set is_active = false where id;
update public.profiles
set games_won = case right(id::text,1) when '1' then 4000 when '2' then 3000 when '3' then 2000 when '4' then 1999 else 0 end,
    games_played = case right(id::text,1) when '1' then 4100 when '2' then 3100 when '3' then 2100 when '4' then 2050 else 0 end,
    is_bot = right(id::text,1) = '5', coins = 900
where id::text like 'fc000000-0000-4000-a000-00000000000%';
set constraints all immediate;
select pg_temp.game_check((select user_id = 'fc000000-0000-4000-a000-000000000003' from public.ranking_top3_state where rank = 3), 'podio inicial');
set constraints all deferred;

insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
values ('fc100000-0000-4000-a000-000000000001','Completion',
  'fc000000-0000-4000-a000-000000000004','CompletionD',
  'fc000000-0000-4000-a000-000000000005','CompletionBot',50,'playing');
insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score,player1_score,player2_score,truco_state)
values ('fc100000-0000-4000-a000-000000000001',
  'fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000005','CompletionD','CompletionBot',
  'fc000000-0000-4000-a000-000000000005','fc000000-0000-4000-a000-000000000004',100,30,29,16,
  '{"status":"truco","value":2,"last_singer":"fc000000-0000-4000-a000-000000000004"}');

-- Reproducir la regresión: la RPC devuelve victoria, pero el trigger diferido
-- falla al confirmar. La subtransacción debe revertir marcador, monedas e historial.
savepoint old_ranking;
do $$
begin
  execute replace(pg_get_functiondef('email_internal.refresh_ranking_top3()'::regprocedure),
    'delete from public.ranking_top3_state where rank between 1 and 3;',
    'delete from public.ranking_top3_state;');
end $$;
do $$
begin
  begin
    perform set_config('request.jwt.claim.sub','fc000000-0000-4000-a000-000000000005',true);
    set local role authenticated;
    perform public.respond_truco('fc100000-0000-4000-a000-000000000001',false);
    reset role;
    set constraints all immediate;
    raise exception 'La función anterior debía fallar al confirmar la victoria';
  exception when cardinality_violation then
    if sqlerrm <> 'DELETE requires a WHERE clause' then raise; end if;
  end;
  perform pg_temp.game_check((select status = 'playing' and player1_score = 29 from public.games where id = 'fc100000-0000-4000-a000-000000000001'), 'la falla anterior revierte el marcador');
  perform pg_temp.game_check((select coins = 900 and games_won = 1999 from public.profiles where id = 'fc000000-0000-4000-a000-000000000004'), 'la falla anterior revierte monedas y estadísticas');
  perform pg_temp.game_check(not exists(select 1 from public.game_history where player_id = 'fc000000-0000-4000-a000-000000000004'), 'la falla anterior revierte el historial');
end $$;
rollback to old_ranking;

-- Misma RPC y mismo cambio de podio con el arreglo y safeupdate activo.
select set_config('request.jwt.claim.sub','fc000000-0000-4000-a000-000000000005',true);
set local role authenticated;
do $$ begin perform public.respond_truco('fc100000-0000-4000-a000-000000000001',false); end $$;
reset role;
set constraints all immediate;
select pg_temp.game_check((select status = 'finished' and player1_score = 30 and player2_score = 16 and winner_id = player1_id from public.games where id = 'fc100000-0000-4000-a000-000000000001'), 'victoria confirmada');
select pg_temp.game_check((select coins = 1000 and games_won = 2000 and games_played = 2051 from public.profiles where id = 'fc000000-0000-4000-a000-000000000004'), 'pozo y estadísticas una sola vez');
select pg_temp.game_check((select user_id = 'fc000000-0000-4000-a000-000000000004' from public.ranking_top3_state where rank = 3), 'empate en victorias resuelto por menos partidas');
select pg_temp.game_check((select count(*) = 2 from public.game_history where player_id in ('fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000005')), 'historial de ambos jugadores');
select pg_temp.game_check(not exists(select 1 from public.ranking_email_jobs where user_id::text like 'fc000000-0000-4000-a000-00000000000%'), 'campaña pausada no crea correos');
select public.finish_game('fc100000-0000-4000-a000-000000000001','fc000000-0000-4000-a000-000000000004',30,16);
select pg_temp.game_check((select coins = 1000 and games_won = 2000 from public.profiles where id = 'fc000000-0000-4000-a000-000000000004'), 'cierre idempotente');
select pg_temp.game_check((select count(*) = 2 from public.game_history where player_id in ('fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000005')), 'cierre repetido no duplica historial');
select pg_temp.game_check(not has_function_privilege('authenticated','email_internal.refresh_ranking_top3()','execute'), 'trigger privado');

-- Una partida de 25 minutos con sólo el humano conectado sigue viva.
insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
values ('fc100000-0000-4000-a000-000000000002','Presence',
  'fc000000-0000-4000-a000-000000000004','CompletionD',
  'fc000000-0000-4000-a000-000000000005','CompletionBot',50,'playing');
insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,created_at)
values ('fc100000-0000-4000-a000-000000000002',
  'fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000005','CompletionD','CompletionBot',
  'fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000004',100,now()-interval '25 minutes');
select set_config('request.jwt.claim.sub','fc000000-0000-4000-a000-000000000004',true);
set local role authenticated;
select public.touch_presence('fc100000-0000-4000-a000-000000000002');
select public.touch_online();
reset role;
select public.sweep_stale_games(10);
select pg_temp.game_check((select status = 'playing' from public.games where id = 'fc100000-0000-4000-a000-000000000002'), 'presencia reciente evita la anulación');
select pg_temp.game_check((select coins = 1000 from public.profiles where id = 'fc000000-0000-4000-a000-000000000004'), 'partida activa no reembolsa');
select pg_temp.game_check((select last_seen_at = now() from public.user_presence where user_id = 'fc000000-0000-4000-a000-000000000004'), 'presencia global enviada');

-- Cuando también desaparece el humano, el barrido conserva el reembolso real.
update public.game_presence set last_seen_at = now()-interval '11 minutes'
where game_id = 'fc100000-0000-4000-a000-000000000002';
select public.sweep_stale_games(10);
select public.sweep_stale_games(10);
select pg_temp.game_check((select status = 'finished' and winner_id is null from public.games where id = 'fc100000-0000-4000-a000-000000000002'), 'ausencia real anula sin ganador');
select pg_temp.game_check((select coins = 1050 and games_won = 2000 and games_played = 2051 from public.profiles where id = 'fc000000-0000-4000-a000-000000000004'), 'reembolso único sin afectar estadísticas');
select pg_temp.game_check((select coins = 950 from public.profiles where id = 'fc000000-0000-4000-a000-000000000005'), 'reembolso al rival una sola vez');
select pg_temp.game_check((select count(*) = 2 from public.game_history where player_id in ('fc000000-0000-4000-a000-000000000004','fc000000-0000-4000-a000-000000000005')), 'anulación no registra derrota');

rollback;
\echo 'Victoria confirmada con safeupdate, cierre idempotente y presencia/barrido correctos.'
