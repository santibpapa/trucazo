-- Ejecutar sólo sobre base de PR reconstruida. Las cuentas de prueba se revierten.
begin;

create function pg_temp.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Noroeste: %',message; end if; end $$;

do $test$
declare
  u uuid := gen_random_uuid(); gate uuid; first_rival uuid; last_rival uuid;
  duel uuid; before_coins int; after_coins int; i int;
  view_map jsonb; province jsonb; rival jsonb; blocked boolean;
  p1 jsonb; p2 jsonb; cards jsonb;
  bot uuid := 'b0700000-0000-4000-a000-000000000066';
begin
  perform pg_temp.check((select count(*) from campaign_provinces)=15,'15 provincias');
  perform pg_temp.check((select count(*) from campaign_rivals)=66,'66 rivales');
  select id into gate from campaign_rivals where slug='antartica';
  select id into first_rival from campaign_rivals where slug='olivarero';
  select id into last_rival from campaign_rivals where slug='duena-silencio';
  perform pg_temp.check((select count(*) from campaign_provinces
     where order_index between 11 and 15 and required_rival_id=gate)=5,
     'Irene exigida en todas las provincias');
  perform pg_temp.check((select count(*) from campaign_rivals
     where order_index between 47 and 66 and target_score=30 and strategy_profile is not null)=20,
     'veinte rivales 1v1 a 30');
  perform pg_temp.check((select count(distinct slug) from campaign_rivals)=66,
     'slugs únicos');

  insert into auth.users(id,email,raw_user_meta_data)
    values(u,u::text||'@test.invalid',jsonb_build_object('username','Prueba Noroeste'));
  update profiles set campaign_points=50000 where id=u;
  perform set_config('request.jwt.claim.sub',u::text,true);
  view_map := public.get_campaign_map();
  select value into province from jsonb_array_elements(view_map->'provinces')
   where value->>'slug'='jujuy';
  perform pg_temp.check(province->>'unlocked'='false','Jujuy cerrada sin Irene aun con puntos');
  blocked := false;
  begin
    perform public.start_campaign_duel(last_rival);
  exception when raise_exception then blocked := true;
  end;
  perform pg_temp.check(blocked,'no se puede entrar directamente a Jujuy sin Irene');

  insert into campaign_progress(user_id,rival_id) values(u,gate);
  view_map := public.get_campaign_map();
  select value into province from jsonb_array_elements(view_map->'provinces')
   where value->>'slug'='jujuy';
  perform pg_temp.check(province->>'unlocked'='true','Irene habilita Jujuy con puntaje');
  -- El ranking incluye al usuario: se baja a 45.000 para validar la
  -- posición fija de Doña Aurelia frente al resto de los rivales.
  update profiles set campaign_points=45000 where id=u;
  perform pg_temp.check((select exists(select 1 from jsonb_array_elements(public.get_campaign_ranking()) e
    where e.value->>'slug'='duena-silencio' and (e.value->>'position')::int=1)),
    'Doña Aurelia es la rival número uno');
  perform pg_temp.check((public.start_campaign_duel(last_rival)).id is not null,
    'duelo directo de Jujuy disponible tras Irene y puntaje');
  update profiles set campaign_points=17500 where id=u;
  view_map := public.get_campaign_map();
  select value into province from jsonb_array_elements(view_map->'provinces')
   where value->>'slug'='la-rioja';
  perform pg_temp.check(province->>'unlocked'='true','entrada a La Rioja a 17.500');
  select value into rival from jsonb_array_elements(province->'rivals')
   where value->>'slug'='olivarero';
  perform pg_temp.check(rival->>'unlocked'='true','primer rival jugable');
  select value into province from jsonb_array_elements(view_map->'provinces')
   where value->>'slug'='catamarca';
  perform pg_temp.check(province->>'unlocked'='false','puntaje de Catamarca independiente');
  blocked := false;
  begin perform public.start_campaign_duel(last_rival);
  exception when raise_exception then blocked := true; end;
  perform pg_temp.check(blocked,'puntaje bloquea duelo directo aun con Irene');
  duel := (public.start_campaign_duel(first_rival)).id;
  perform pg_temp.check(duel is not null,'primer duelo sin derrotar a los otros 45');
  select coins into before_coins from profiles where id=u;
  perform public.finish_game(duel,u,30,10);
  select coins into after_coins from profiles where id=u;
  perform pg_temp.check((select campaign_points from profiles where id=u)=18407,
    '800 puntos base más 107 de margen en primera victoria');
  perform pg_temp.check(after_coins-before_coins=1600,'1600 monedas sólo primera victoria');
  perform public.finish_game(duel,u,30,10);
  perform pg_temp.check((select campaign_points from profiles where id=u)=18407
    and (select coins from profiles where id=u)=after_coins,
    'liquidación duplicada no paga dos veces');

  -- La revancha sigue libre aun si el puntaje actual bajara posteriormente.
  update profiles set campaign_points=0 where id=u;
  for i in 1..4 loop
    duel := (public.start_campaign_duel(first_rival)).id;
    perform pg_temp.check(duel is not null,'revancha sin candado de puntos');
    perform public.finish_game(duel,u,30,10);
  end loop;
  perform pg_temp.check((select campaign_points from profiles where id=u)=240,
    'revancha: 80 por duelo hasta tope total de 240');
  perform pg_temp.check((select coins from profiles where id=u)=after_coins,
    'revanchas no repagan monedas');

  -- Táctica: responder a un 7 con la peor carta que lo supera, guardando
  -- el ancho para el siguiente cruce. Sólo se ven las cartas propias y el 7.
  cards := '[{"rank":1,"suit":"espada","value":1},
             {"rank":5,"suit":"oro","value":3}]'::jsonb;
  p1 := public._northwest_card_choice(cards,cards,
    jsonb_build_array(jsonb_build_object('round',2,'player_id',u,'card',
      jsonb_build_object('rank',11,'suit','copa','value',7))),
    jsonb_build_array(jsonb_build_object('winner_id',bot)),
    bot,u,2,'calculador');
  perform pg_temp.check((p1->'card'->>'rank')::int=5,
    'conservar el ancho y ganar con la carta suficiente');

  p1 := public._northwest_plan(cards,cards,'[]'::jsonb,'[]'::jsonb,
    '{"status":"falta_envido","last_singer":"00000000-0000-4000-a000-000000000001","value":25,"chain":["envido","falta_envido"]}'::jsonb,
    '{"status":"none","value":2}'::jsonb,
    bot,bot,1,false,4,5,'calculador',5,5,'{}'::jsonb,0.25);
  perform pg_temp.check(p1->>'action'='respond_envido_no',
    'falta envido con tantos flojos se rechaza');
  cards := '[{"rank":4,"suit":"oro","value":7},
             {"rank":12,"suit":"oro","value":6},
             {"rank":1,"suit":"espada","value":1}]'::jsonb;
  p1 := public._northwest_plan(cards,cards,'[]'::jsonb,'[]'::jsonb,
    '{"status":"falta_envido","last_singer":"00000000-0000-4000-a000-000000000001","value":25,"chain":["envido","falta_envido"]}'::jsonb,
    '{"status":"none","value":2}'::jsonb,
    bot,bot,1,false,4,5,'calculador',5,5,'{}'::jsonb,0.25);
  perform pg_temp.check(p1->>'action'='respond_envido_yes',
    'falta con 33 tantos se acepta');

  -- Cambiar físicamente la fila oculta del humano en la base. Las cartas
  -- propias se toman de la partida creada; mesa, marcador y semilla son iguales.
  bot := 'b0700000-0000-4000-a000-000000000047';
  select h.cards into cards from game_hands h where h.game_id=duel and h.player_id=bot;
  update game_hands set cards='[{"rank":14,"suit":"oro","value":4},
                               {"rank":13,"suit":"basto","value":5},
                               {"rank":12,"suit":"copa","value":6}]'::jsonb
   where game_id=duel and player_id=u;
  p1 := public._northwest_plan(cards,cards,'[]'::jsonb,'[]'::jsonb,
    '{"status":"none"}'::jsonb,'{"status":"none","value":2}'::jsonb,
    bot,bot,1,true,12,10,'calculador',5,5,'{}'::jsonb,0.37);
  update game_hands set cards='[{"rank":1,"suit":"espada","value":1},
                               {"rank":2,"suit":"basto","value":1},
                               {"rank":3,"suit":"espada","value":7}]'::jsonb
   where game_id=duel and player_id=u;
  p2 := public._northwest_plan(cards,cards,'[]'::jsonb,'[]'::jsonb,
    '{"status":"none"}'::jsonb,'{"status":"none","value":2}'::jsonb,
    bot,bot,1,true,12,10,'calculador',5,5,'{}'::jsonb,0.37);
  perform pg_temp.check(p1=p2,'decisión determinista sin cartas ocultas');
end $test$;

rollback;
