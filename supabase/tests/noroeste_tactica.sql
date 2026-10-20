-- Regresiones sobre las funciones SQL reales. Sólo base de pruebas; rollback.
begin;
create or replace function pg_temp.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Noroeste táctica: %',message; end if; end $$;
do $test$
declare
  bot uuid := 'b0700000-0000-4000-a000-000000000066';
  human uuid := '00000000-0000-4000-a000-000000000001';
  ace jsonb; four jsonb; two_b jsonb; two_o jsonb; three_o jsonb; six_e jsonb; seven_e jsonb;
  plan jsonb; choice jsonb; played jsonb; results jsonb;
begin
  select value into ace from jsonb_array_elements(_truco_deck()) where value->>'suit'='espada' and value->>'value'='1';
  select value into four from jsonb_array_elements(_truco_deck()) where value->>'suit'='oro' and value->>'value'='4';
  select value into two_b from jsonb_array_elements(_truco_deck()) where value->>'suit'='basto' and value->>'value'='2';
  select value into two_o from jsonb_array_elements(_truco_deck()) where value->>'suit'='oro' and value->>'value'='2';
  select value into three_o from jsonb_array_elements(_truco_deck()) where value->>'suit'='oro' and value->>'value'='3';
  select value into six_e from jsonb_array_elements(_truco_deck()) where value->>'suit'='espada' and value->>'value'='6';
  select value into seven_e from jsonb_array_elements(_truco_deck()) where value->>'suit'='espada' and value->>'value'='7';
  played := jsonb_build_array(jsonb_build_object('round',1,'player_id',bot,'card',two_b),
                              jsonb_build_object('round',1,'player_id',human,'card',two_o));
  results := '[{"round":1,"winner_id":null}]'::jsonb;
  plan := _northwest_plan(jsonb_build_array(ace,four),jsonb_build_array(two_b,ace,four),played,results,
    '{"status":"none"}',jsonb_build_object('status','truco','value',2,'last_singer',human),
    bot,human,2,true,10,10,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'action' in ('respond_truco_yes','sing_truco'),'primera parda + ancho: aceptar o subir victoria segura');

  results := jsonb_build_array(jsonb_build_object('round',1,'winner_id',human),
                               jsonb_build_object('round',2,'winner_id',bot));
  played := jsonb_build_array(jsonb_build_object('round',1,'player_id',bot,'card',four),
    jsonb_build_object('round',1,'player_id',human,'card',two_b),
    jsonb_build_object('round',2,'player_id',bot,'card',three_o),
    jsonb_build_object('round',2,'player_id',human,'card',two_o),
    jsonb_build_object('round',3,'player_id',bot,'card',ace));
  plan := _northwest_plan('[]',jsonb_build_array(four,three_o,ace),played,results,
    '{"status":"none"}',jsonb_build_object('status','retruco','value',3,'last_singer',human),
    bot,human,3,true,10,10,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'action' in ('respond_truco_yes','sing_truco'),'ancho ya tirado en tercera: no regalar retruco');
  perform pg_temp.check(plan->>'type'='vale_cuatro','victoria segura: subir incluso sin sorteo favorable');

  -- Invertir únicamente las cartas públicas debe invertir la respuesta:
  -- reconocer el ancho propio no puede convertirse en querer a ciegas.
  played := jsonb_build_array(jsonb_build_object('round',3,'player_id',bot,'card',four),
                              jsonb_build_object('round',3,'player_id',human,'card',ace));
  plan := _northwest_plan('[]',jsonb_build_array(four,three_o,two_b),played,results,
    '{"status":"none"}',jsonb_build_object('status','retruco','value',3,'last_singer',human),
    bot,human,3,true,10,10,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'action'='respond_truco_no','tercera perdida: no regalar puntos');

  -- Haber ganado primera permite empatar segunda; no gastar el ancho.
  played := jsonb_build_array(jsonb_build_object('round',1,'player_id',bot,'card',three_o),
                              jsonb_build_object('round',2,'player_id',human,'card',two_o));
  results := jsonb_build_array(jsonb_build_object('round',1,'winner_id',bot));
  choice := _northwest_card_choice(jsonb_build_array(ace,two_b),jsonb_build_array(three_o,ace,two_b),
    played,results,bot,human,2,'calculador');
  perform pg_temp.check(choice->'card'=two_b,'primera ganada: elegir la parda que cierra la mano');
  perform pg_temp.check((choice->>'hand_chance')::numeric=1,'parda ganadora vale certeza, no 42%');

  -- No quiero también concede puntos: a 29 no debe regalar el partido.
  plan := _northwest_plan(jsonb_build_array(ace,two_b,four),jsonb_build_array(ace,two_b,four),'[]','[]',
    jsonb_build_object('status','envido','value',2,'chain',jsonb_build_array('envido'),'last_singer',human),
    '{"status":"none"}',bot,human,1,true,20,29,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'action'='respond_envido_yes','no rechazar si concede el punto que termina el partido');

  plan := _northwest_plan(jsonb_build_array(six_e,seven_e,four),jsonb_build_array(six_e,seven_e,four),'[]','[]',
    '{"status":"none"}','{"status":"none"}',bot,bot,1,true,10,10,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'action'='sing_envido' and plan->>'type'='falta_envido',
    '33 siendo mano: aprovechar victoria segura sin depender del azar');
  plan := _northwest_plan(jsonb_build_array(six_e,seven_e,four),jsonb_build_array(six_e,seven_e,four),'[]','[]',
    '{"status":"none"}','{"status":"none"}',bot,human,1,true,10,10,'paciente',7,7,'{}',0.99);
  perform pg_temp.check(plan->>'type'<>'falta_envido','33 siendo pie no garantiza ganar un empate');
  plan := _northwest_plan(jsonb_build_array(ace,two_o,four),jsonb_build_array(ace,two_o,four),'[]','[]',
    '{"status":"none"}','{"status":"none"}',bot,human,1,true,10,10,'paciente',7,7,'{}',0.01);
  perform pg_temp.check(plan->>'action'<>'sing_envido','26 sin lectura favorable: no apostar por valor como si fueran 30');

  perform pg_temp.check(_envido_quiero_value('["envido","real_envido"]',0,0,30)=5,'envido + real: cinco');
  perform pg_temp.check(_envido_reject_value('["envido","real_envido"]',0,0,30)=2,'rechazo de envido + real: dos');
  perform pg_temp.check(_envido_reject_value('["real_envido","falta_envido"]',0,0,30)=3,'rechazo de real + falta: tres');

  perform pg_temp.check(_northwest_win_probability(array[0,1,0]::numeric[],array[1,0,0]::numeric[],false)=1,
    'parda + ganada: tercera irrelevante');
  perform pg_temp.check(_northwest_win_probability(array[0,0,0]::numeric[],array[1,1,1]::numeric[],true)=1,
    'tres pardas siendo mano');
  perform pg_temp.check(_northwest_win_probability(array[0,0,0]::numeric[],array[1,1,1]::numeric[],false)=0,
    'tres pardas siendo pie');
  perform pg_temp.check(not exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace
    and p.proname like '\_northwest\_%' escape '\'
    and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))),
    'ningún ayudante táctico expuesto al cliente');
end $test$;
rollback;
