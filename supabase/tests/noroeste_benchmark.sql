-- PARTIDAS REALES, no un port de las reglas. Base local reconstruida solamente.
-- El llamador fija trucazo.benchmark_trials y trucazo.benchmark_seed_start.
-- Todo (cuentas, partidas, premios y funciones de prueba) termina en ROLLBACK.
begin;
set local statement_timeout='15min';
create temporary table northwest_benchmark_results(slug text,seed int,seat int,won boolean,margin int,actions int) on commit drop;

create function pg_temp.northwest_benchmark_game(p_rival uuid,p_seed int,p_seat int)
returns table(won boolean,margin int,actions int) language plpgsql as $$
declare
  p1 uuid:='b0800000-0000-4000-a000-000000000001';
  p2 uuid:='b0800000-0000-4000-a000-000000000002';
  nw uuid:=case when p_seat=1 then p1 else p2 end;
  legacy uuid; actor uuid; caller uuid; duel uuid:=gen_random_uuid();
  g games%rowtype; before_game jsonb; dealt_cards jsonb[]; hand_dealt int:=0;
  steps int:=0; decision_error text;
begin
  select id into legacy from campaign_rivals where slug='antartica';
  begin
  -- Aislar cada partida evita acumular versiones de perfiles y triggers
  -- diferidos al alternar is_bot miles de veces. Se ejecuta el motor completo;
  -- sólo se conservan las métricas, no sus efectos en la base de pruebas.
  delete from campaign_style where user_id in(p1,p2);
  update profiles set campaign_points=22000 where id in(p1,p2);
  insert into tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,is_private,status,target_score)
    values(duel,'Prueba Noroeste',p1,'Prueba Uno',p2,'Prueba Dos',0,true,'playing',30);
  insert into games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score,campaign_rival_id)
    values(duel,p1,p2,'Prueba Uno','Prueba Dos',p1,p1,0,30,p_rival);
  insert into game_hands(game_id,player_id,cards) values(duel,p1,'[]'),(duel,p2,'[]');
  loop
    select * into g from games where id=duel;
    exit when g.status='finished';
    if steps>=2000 or g.hand_number>200 then raise exception 'benchmark: partida trabada seed %, rival %',p_seed,p_rival; end if;
    if g.awaiting_deal then
      perform set_config('request.jwt.claim.sub',p1::text,true);
      perform public.advance_hand(duel);
      select * into g from games where id=duel;
      if g.status='finished' then exit; end if;
    end if;
    if g.hand_number<>hand_dealt then
      -- Fixture de reparto: misma secuencia al invertir asientos. Ningún
      -- decisor recibe la semilla ni acceso a las cartas del otro jugador.
      select array_agg(e.value order by md5(p_rival::text||':'||p_seed||':'||g.hand_number||':'||e.value::text))
        into dealt_cards from jsonb_array_elements(_truco_deck()) e;
      update game_hands set cards=case when player_id=p1 then to_jsonb(dealt_cards[1:3]) else to_jsonb(dealt_cards[4:6]) end where game_id=duel;
      hand_dealt:=g.hand_number;
    end if;
    actor:=case when g.envido_state->>'status'='declaring' then (g.envido_state->>'declare_turn')::uuid else g.current_turn end;
    caller:=case when actor=p1 then p2 else p1 end;
    -- En producción hay un humano y un bot. El arnés alterna qué cuenta
    -- es bot para que AMBOS cerebros SQL actúen por su entrada real.
    update profiles set is_bot=(id=actor) where id in(p1,p2);
    update games set campaign_rival_id=case when actor=nw then p_rival else legacy end where id=duel returning * into g;
    before_game:=to_jsonb(g);
    perform set_config('request.jwt.claim.sub',caller::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',caller,'role','authenticated')::text,true);
    perform setseed((('x'||substr(md5(p_rival::text||':'||p_seed||':'||g.hand_number||':'||steps||':'||case when actor=p1 then 1 else 2 end),1,8))::bit(32)::bigint/4294967295.0)::double precision);
    perform public.bot_step(duel);
    select error into decision_error from bot_decisions where game_id=duel and not ok limit 1;
    if decision_error is not null then raise exception 'benchmark acción ilegal: %, state %',decision_error,before_game; end if;
    select * into g from games where id=duel;
    if to_jsonb(g)=before_game then raise exception 'benchmark: no avanzó state %',before_game; end if;
    steps:=steps+1;
  end loop;
  won:=g.winner_id=nw;
  margin:=case when nw=p1 then g.player1_score-g.player2_score else g.player2_score-g.player1_score end;
  actions:=steps;
  raise exception 'rollback de la partida de prueba' using errcode='PZ001';
  exception when sqlstate 'PZ001' then
    -- Las variables PL/pgSQL conservan el resultado; las filas se revierten.
    null;
  end;
  return next;
end $$;

do $benchmark$
declare
  rival record; trial int; seat int; row_result record; total int; victories int;
  trials int:=coalesce(nullif(current_setting('trucazo.benchmark_trials',true),''),'10')::int;
  seed_start int:=coalesce(nullif(current_setting('trucazo.benchmark_seed_start',true),''),'1')::int;
begin
  if trials not between 1 and 100 or seed_start<1 then raise exception 'parámetros benchmark inválidos'; end if;
  if (select count(*) from campaign_rivals where order_index between 47 and 66)<>20
     or not exists(select 1 from campaign_rivals where slug='antartica' and difficulty=10) then
    raise exception 'benchmark: faltan los veinte rivales o Irene nivel 10';
  end if;
  insert into auth.users(id,email,raw_user_meta_data) values
    ('b0800000-0000-4000-a000-000000000001','bench1@test.invalid','{"username":"Prueba Uno"}'),
    ('b0800000-0000-4000-a000-000000000002','bench2@test.invalid','{"username":"Prueba Dos"}');
  for rival in select id,slug from campaign_rivals where order_index between 47 and 66 order by order_index loop
    for trial in seed_start..seed_start+trials-1 loop
      for seat in 1..2 loop
        select * into row_result from pg_temp.northwest_benchmark_game(rival.id,trial,seat);
        if row_result.won is null or row_result.actions<1 then
          raise exception 'benchmark: partida sin resultado';
        end if;
        insert into northwest_benchmark_results values(rival.slug,trial,seat,row_result.won,row_result.margin,row_result.actions);
      end loop;
    end loop;
    select count(*),count(*) filter(where won) into total,victories from northwest_benchmark_results where slug=rival.slug;
    raise notice 'benchmark %: %/% victorias',rival.slug,victories,total;
  end loop;
  if exists(select 1 from games where player1_id='b0800000-0000-4000-a000-000000000001') then
    raise exception 'benchmark: no se revirtió una partida de prueba';
  end if;
end $benchmark$;

select slug,count(*) as games,count(*) filter(where won) as wins,
  round(100.0*count(*) filter(where won)/count(*),2) as win_rate,
  round(avg(margin),2) as average_margin
from northwest_benchmark_results group by slug order by slug;

-- Cada rival usa repartos distintos; sólo los dos asientos comparten semilla.
-- El límite agrupa cada pareja rival/semilla (200 bloques), no 400 Bernoulli.
with seeds as(select slug,seed,avg(won::int) as rate from northwest_benchmark_results group by slug,seed)
select (select count(*) from northwest_benchmark_results) as games,
       (select count(*) from northwest_benchmark_results where won) as wins,
       round(100*avg(rate),2) as win_rate,
       round(100*(avg(rate)-2.3*stddev_samp(rate)/sqrt(count(*)::numeric)),2) as lower_seed_block_bound
from seeds;

do $$
declare rate numeric; low numeric;
begin
  select avg(s.rate),avg(s.rate)-2.3*stddev_samp(s.rate)/sqrt(count(*)::numeric) into rate,low
    from(select avg(won::int) as rate from northwest_benchmark_results group by slug,seed) s;
  if rate<=0.55 or (low is not null and low<=0.50) then
    raise exception 'benchmark: dificultad no demostrada (rate %, límite %)',rate,low;
  end if;
end $$;
rollback;
