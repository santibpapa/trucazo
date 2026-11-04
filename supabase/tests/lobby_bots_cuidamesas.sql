-- Base descartable. Los bots que nunca abren mesa quedan para la gente.
begin;
create function pg_temp.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Bots del lobby: %', message; end if; end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;
create function pg_temp.person() returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid(); begin
  insert into auth.users(id, email, raw_user_meta_data)
    values(u, u || '@test.invalid', jsonb_build_object('username', left(u::text, 16)));
  update public.profiles set coins = 1000 where id = u;
  return u;
end $$;
-- Mesa pública 1v1 abierta por una persona, devuelve el rival que se sentó.
create function pg_temp.human_table(private boolean default false) returns uuid language plpgsql as $$
declare u uuid := pg_temp.person(); t uuid; r uuid; begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  set local role authenticated;
  select id into t from public.create_table('Mesa de prueba', 20, private,
    case when private then upper(left(u::text, 6)) end, 15, 30);
  select opponent_id into r from public.bot_join_table(t);
  reset role;
  return r;
end $$;

do $$
declare
  openers uuid[];
  joiners uuid[];
  r1 uuid; r2 uuid; r3 uuid;
  u uuid;
begin
  -- Ningún bot ocupado al empezar.
  delete from public.tables where creator_id in (select bot_id from public.lobby_bots)
                               or opponent_id in (select bot_id from public.lobby_bots);
  select array_agg(bot_id) filter (where opens_tables),
         array_agg(bot_id) filter (where not opens_tables)
    into openers, joiners from public.lobby_bots;
  perform pg_temp.check(cardinality(openers) = 3 and cardinality(joiners) = 2, 'tres que abren mesas y dos que sólo se sientan');
  perform pg_temp.check((select bool_and(is_bot) from public.profiles where id = any(joiners)), 'los nuevos son cuentas bot');
  perform pg_temp.check((select count(distinct lower(username)) from public.profiles where id = any(openers || joiners)) = 5, 'nombres distintos');
  perform pg_temp.check(not has_function_privilege('authenticated', 'public._free_lobby_bot(boolean)', 'execute'), 'elegir bot sigue siendo interno');

  -- El lobby sólo abre mesas con los tres de siempre.
  u := pg_temp.person();
  perform set_config('request.jwt.claim.sub', u::text, true);
  set local role authenticated;
  perform public.ensure_lobby_tables();
  reset role;
  perform pg_temp.check((select count(*) from public.tables where status = 'waiting' and creator_id = any(joiners)) = 0, 'los nuevos nunca abren mesa');
  perform pg_temp.check((select count(*) from public.tables where status = 'waiting' and creator_id = any(openers)) = 2, 'el lobby mantiene dos mesas de bots');

  -- Lo de hoy en producción: dos de siempre esperando en su mesa y uno jugando.
  r1 := pg_temp.human_table();
  perform pg_temp.check(r1 = any(joiners), 'primero se sienta uno de los nuevos');
  r2 := pg_temp.human_table();
  perform pg_temp.check(r2 = any(joiners) and r2 <> r1, 'después el otro nuevo');
  r3 := pg_temp.human_table();
  perform pg_temp.check(r3 = any(openers), 'con los nuevos ocupados, se sienta el de siempre que quedaba libre');
  perform pg_temp.check(pg_temp.human_table() is null, 'con los cinco ocupados no se sienta nadie (la pantalla reintenta)');

  -- La privada sigue siendo sólo para amigos.
  delete from public.tables where opponent_id = any(joiners);
  perform pg_temp.check(pg_temp.human_table(true) is null, 'en mesa privada no entra ningún bot');
  perform pg_temp.check(pg_temp.human_table() = any(joiners), 'se libera un nuevo y vuelve a sentarse');

  raise notice 'OK: bots del lobby que cuidan las mesas de la gente';
end $$;

-- Los bots del lobby deciden con el cerebro del Noroeste.
do $$
declare u uuid := pg_temp.person(); t uuid; g public.games; i int;
begin
  perform pg_temp.check((select bool_and(strategy_profile in ('calculador','paciente','agresivo','marcador','farolera')) from public.lobby_bots), 'cada bot tiene estilo del Noroeste');
  perform pg_temp.check(not has_function_privilege('authenticated', 'public._lobby_bot_act(uuid,uuid)', 'execute'), 'la decisión del bot es interna');
  delete from public.tables where creator_id in (select bot_id from public.lobby_bots)
                               or opponent_id in (select bot_id from public.lobby_bots);
  perform set_config('request.jwt.claim.sub', u::text, true);
  set local role authenticated;
  select id into t from public.create_table('Mesa de prueba', 20, false, null, 15, 30);
  perform public.bot_join_table(t);
  g := public.start_game(t);
  for i in 1..6 loop
    if g.current_turn = u and coalesce(g.envido_state->>'status', 'none') = 'none'
       and coalesce(g.truco_state->>'status', 'none') = 'none' then
      perform public.play_card(t, (select cards->0 from public.game_hands where game_id = t and player_id = u));
    else
      perform public.bot_step(t);
    end if;
    select * into g from public.games where id = t;
  end loop;
  reset role;
  perform pg_temp.check(exists (select 1 from public.bot_decisions where game_id = t and situation = 'lobby' and ok), 'el bot decidió con el cerebro nuevo');
  perform pg_temp.check(not exists (select 1 from public.bot_decisions where game_id = t and (situation <> 'lobby' or not ok)), 'sin decisiones del cerebro viejo ni errores');
  raise notice 'OK: bots del lobby con el cerebro del Noroeste';
end $$;
rollback;
