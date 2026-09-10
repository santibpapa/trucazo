-- Solo contra una base de prueba reconstruida. Cada cambio se revierte al final.
begin;
create function pg_temp.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '2vs2: %',message; end if; end $$;
create function pg_temp.person() returns uuid language plpgsql as $$
declare u uuid:=gen_random_uuid(); begin
  insert into auth.users(id,email,raw_user_meta_data) values(u,u||'@test.invalid',jsonb_build_object('username',left(u::text,20)));
  update public.profiles set coins=100000 where id=u;
  return u;
end $$;
create function pg_temp.act(t uuid,s integer,a text,c jsonb default null,request uuid default gen_random_uuid(),version bigint default null)
returns jsonb language plpgsql as $$
declare u uuid; result jsonb; begin
  select user_id into u from public.team_seats where table_id=t and seat=s;
  perform pg_temp.check(u is not null,'fixture requiere persona');
  perform set_config('request.jwt.claim.sub',u::text,true);
  if version is null then select x.version into version from public.team_tables x where id=t; end if;
  set local role authenticated;
  result:=public.team_action(t,request,version,a,null,c);
  reset role;
  return result;
end $$;
create function pg_temp.fixture(humans integer[] default array[0,1,2,3],start_now boolean default true,target integer default 15,seconds integer default 30) returns uuid language plpgsql as $$
declare t uuid; owner_id uuid:=pg_temp.person(); u uuid; snap jsonb; s integer; ver bigint; begin
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  snap:=public.team_create(gen_random_uuid(),'Prueba 2vs2',100,target,seconds,false);
  t:=(snap->'table'->>'id')::uuid;
  perform public.team_action(t,gen_random_uuid(),1,'seat',humans[1]);
  reset role;
  for s in 0..3 loop
    if s=humans[1] then continue; end if;
    if s=any(humans) then
      u:=pg_temp.person(); perform set_config('request.jwt.claim.sub',u::text,true);
      set local role authenticated; perform public.team_join(gen_random_uuid(),t); reset role;
      select version into ver from public.team_tables where id=t;
      set local role authenticated; perform public.team_action(t,gen_random_uuid(),ver,'seat',s); reset role;
    else
      perform set_config('request.jwt.claim.sub',owner_id::text,true);
      select version into ver from public.team_tables where id=t;
      set local role authenticated; perform public.team_action(t,gen_random_uuid(),ver,'add_bot',s); reset role;
    end if;
  end loop;
  if start_now then perform pg_temp.act(t,humans[1],'start'); end if;
  return t;
end $$;

-- Ocupación, privilegios reales, privacidad, cartas canónicas, idempotencia.
do $$
declare t uuid:=pg_temp.fixture(); s jsonb; c jsonb; req uuid:=gen_random_uuid(); v bigint; n integer; blocked boolean; u uuid; begin
  perform pg_temp.check((select count(distinct item) from public.team_hands h,jsonb_array_elements(h.cards)item where table_id=t)=12,'12 cartas distintas');
  perform pg_temp.check((select bool_and(jsonb_array_length(cards)=3) from public.team_hands where table_id=t),'tres cartas por persona');
  select user_id into u from public.team_seats where table_id=t and seat=0;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  s:=public.team_snapshot(t);
  select count(*) into n from public.team_hands where table_id=t;
  reset role;
  perform pg_temp.check(n=1 and jsonb_array_length(s->'hand')=3,'RLS solo mano propia');
  perform pg_temp.check(not (s->'game' ? 'hands') and not (s->'members'->1 ? 'cards'),'snapshot no contiene otras manos');
  blocked:=false;
  begin set local role authenticated; update public.team_games set scores=array[15,0] where id=t; exception when insufficient_privilege then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'escritura directa cerrada');
  blocked:=false;
  begin set local role authenticated; perform team_internal.finish(t,0,'trampa'); exception when insufficient_privilege then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'helpers privados cerrados');
  blocked:=false;
  begin perform pg_temp.act(t,1,'mazo'); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'mazo fuera de turno rechazado');
  blocked:=false;
  begin perform pg_temp.act(t,1,'play',(s->'hand'->0)); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'carta fuera de turno rechazada');
  c:=s->'hand'->0; v:=(s->'table'->>'version')::bigint;
  perform pg_temp.act(t,0,'play',c||'{"rank":0}',req,v);
  perform pg_temp.act(t,0,'play',c||'{"rank":0}',req,v);
  perform pg_temp.check((select jsonb_array_length(played)=1 and played->0->'card'=c from public.team_games where id=t),'duplicado no juega dos veces ni acepta rango del cliente');
  s:=pg_temp.act(t,1,'play',c,gen_random_uuid(),v);
  perform pg_temp.check((s->>'stale')::boolean,'versión vieja rechazada');
  blocked:=false;
  begin perform pg_temp.act(t,1,'play',c); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'carta ajena rechazada');
  blocked:=false;
  begin perform pg_temp.act(t,0,'seat'); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'asientos bloqueados al jugar');
  perform set_config('request.jwt.claim.sub',pg_temp.person()::text,true);
  set local role authenticated;
  select count(*) into n from public.team_hands where table_id=t;
  reset role; perform pg_temp.check(n=0,'ajeno no ve manos');
end $$;

-- Los dos compañeros pueden responder; la primera versión gana. Declaración ordenada.
do $$
declare t uuid:=pg_temp.fixture(); s jsonb; v bigint; i integer; p integer; high integer:=-1; best integer; g public.team_games; begin
  perform pg_temp.act(t,0,'envido');
  select * into g from public.team_games where id=t;
  perform pg_temp.check('envido_yes'=any(team_internal.legal(g,1)) and 'envido_no'=any(team_internal.legal(g,3)),'ambos compañeros pueden responder');
  select version into v from public.team_tables where id=t;
  perform pg_temp.act(t,3,'envido_yes',null,gen_random_uuid(),v);
  s:=pg_temp.act(t,1,'envido_no',null,gen_random_uuid(),v);
  perform pg_temp.check((s->>'stale')::boolean and s->'game'->'envido'->>'status'='declaring','respuesta contradictoria no cambia decisión');
  for i in 0..3 loop
    select * into g from public.team_games where id=t;
    perform pg_temp.check(team_internal.actor(g)=i,'declaración respeta orden de mano');
    p:=public._envido_points(team_internal.full_hand(t,i));
    if p>high then high:=p; best:=i; perform pg_temp.act(t,i,'tengo');
    else perform pg_temp.act(t,i,'son_buenas'); end if;
  end loop;
  select * into g from public.team_games where id=t;
  perform pg_temp.check(g.scores[best%2+1]=2 and g.envido->>'status'='resolved','envido suma una vez al equipo');
  perform pg_temp.check(g.turn=0,'envido devuelve turno de carta');
  perform pg_temp.act(t,0,'mazo');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(g.awaiting_deal and g.scores[best%2+1]>=2 and g.last_hand_winner=1,'mazo conserva envido resuelto');
end $$;

-- El envido interrumpe el truco sin perder el turno ni aceptar el truco.
do $$
declare t uuid:=pg_temp.fixture(); g public.team_games; i integer; a text[]; begin
  perform pg_temp.act(t,0,'truco'); perform pg_temp.act(t,1,'envido');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(g.truco->>'status'='pending' and g.envido->>'status'='pending','envido suspende truco');
  perform pg_temp.act(t,0,'envido_yes');
  for i in 0..3 loop
    select * into g from public.team_games where id=t; a:=team_internal.legal(g,i);
    perform pg_temp.act(t,i,case when 'tengo'=any(a) then 'tengo' else 'son_buenas' end);
  end loop;
  select * into g from public.team_games where id=t;
  perform pg_temp.check(team_internal.actor(g)=1 and 'truco_yes'=any(team_internal.legal(g,3)),'se recupera respuesta del truco');
  perform pg_temp.act(t,3,'truco_yes');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(g.turn=0 and 'play'=any(team_internal.legal(g,0)),'recupera turno original después del truco');
end $$;

-- Mazo en todos los estados: sin canto, pendiente, aceptado, truco subido.
do $$
declare t uuid; kind text; g public.team_games; actor integer; expected integer; begin
  foreach kind in array array['none','pending','declaring','truco','retruco','vale_cuatro'] loop
    t:=pg_temp.fixture(); actor:=0; expected:=1;
    if kind in ('pending','declaring') then
      perform pg_temp.act(t,0,'envido'); actor:=1; expected:=2;
      if kind='declaring' then perform pg_temp.act(t,1,'envido_yes'); actor:=0; expected:=3; end if;
    elsif kind in ('truco','retruco','vale_cuatro') then
      perform pg_temp.act(t,0,'truco'); actor:=1; expected:=1;
      if kind in ('retruco','vale_cuatro') then perform pg_temp.act(t,1,'retruco'); actor:=0; expected:=2; end if;
      if kind='vale_cuatro' then perform pg_temp.act(t,0,'vale_cuatro'); actor:=1; expected:=3; end if;
    end if;
    perform pg_temp.act(t,actor,'mazo'); select * into g from public.team_games where id=t;
    perform pg_temp.check(g.awaiting_deal and g.scores[2-actor%2]=expected,'mazo cierra toda mano: '||kind);
  end loop;
end $$;

-- Resolución: se fuerzan cartas válidas para cubrir las combinaciones de pardas.
-- Cada ronda usa otro palo, valores de igual fuerza o ganadores por equipo.
do $$
declare t uuid; pattern integer[]; patterns integer[][]:=array[array[0,0,0],array[1,1,1],array[0,-1,0],array[-1,1,1],array[0,1,-1],array[1,0,-1],array[-1,-1,0],array[-1,-1,1],array[-1,-1,-1]];
  expected integer; r integer; s integer; val integer; card jsonb; hand jsonb; g public.team_games; count_rounds integer;
begin
  foreach pattern slice 1 in array patterns loop
    t:=pg_temp.fixture();
    -- Rangos controlados por el fixture, nunca por la RPC: solo prueba resolución.
    for s in 0..3 loop
      hand:='[]';
      for r in 1..3 loop
        val:=case when pattern[r]=-1 or s%2=pattern[r] then 5 else 6 end;
        hand:=hand||jsonb_build_array(jsonb_build_object('suit',(array['espada','basto','oro'])[r],'value',s+r*4,'rank',val));
      end loop;
      update public.team_hands set cards=hand where table_id=t and seat=s;
    end loop;
    loop
      select * into g from public.team_games where id=t; exit when g.awaiting_deal;
      select cards->0 into card from public.team_hands where table_id=t and seat=g.turn;
      perform pg_temp.act(t,g.turn,'play',card);
    end loop;
    expected:=case when pattern[1]=-1 and pattern[2]=-1 then greatest(pattern[3],0)
      when pattern[1]=-1 then pattern[2] else pattern[1] end;
    perform pg_temp.check(g.last_hand_winner=expected and g.scores[expected+1]=1,'resolución de rondas '||pattern::text);
  end loop;
end $$;

-- Mesas privadas, dueño, cupos, cobro y devolución con reintentos.
do $$
declare u uuid:=pg_temp.person(); guest uuid:=pg_temp.person(); t uuid; s jsonb; req uuid:=gen_random_uuid(); v bigint; code text; blocked boolean; balance integer; begin
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  s:=public.team_create(req,'Privada',100,30,15,true);
  perform public.team_create(req,'Privada',100,30,15,true);
  reset role;
  t:=(s->'table'->>'id')::uuid; code:=s->'table'->>'private_code';
  perform pg_temp.check((select coins=99900 from public.profiles where id=u),'crear idempotente cobra una apuesta');
  perform set_config('request.jwt.claim.sub',guest::text,true); blocked:=false;
  begin set local role authenticated; perform public.team_join(gen_random_uuid(),t); exception when raise_exception then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'UUID no permite ingresar privada');
  set local role authenticated; s:=public.team_join(gen_random_uuid(),null,code); reset role;
  v:=(s->'table'->>'version')::bigint;
  blocked:=false;
  begin set local role authenticated; perform public.team_action(t,gen_random_uuid(),v,'add_bot',3); exception when raise_exception then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'visitante no gestiona bots');
  blocked:=false;
  begin set local role authenticated; perform public.team_action(t,gen_random_uuid(),v,'start'); exception when raise_exception then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'visitante no inicia');
  req:=gen_random_uuid();
  set local role authenticated;
  perform public.team_action(t,req,v,'leave');
  s:=public.team_action(t,req,v,'leave');
  reset role;
  perform pg_temp.check((s->>'left')::boolean and (select coins=100000 from public.profiles where id=guest),'salir y reintentar devuelve una vez');
  perform set_config('request.jwt.claim.sub',u::text,true);
  select version into v from public.team_tables where id=t;
  blocked:=false;
  begin set local role authenticated; perform public.team_action(t,gen_random_uuid(),v,'start'); exception when raise_exception then blocked:=true; end;
  reset role; perform pg_temp.check(blocked,'no empieza incompleta');
  set local role authenticated; perform public.team_action(t,gen_random_uuid(),v,'leave'); reset role;
  perform pg_temp.check((select coins=100000 from public.profiles where id=u),'cancelar devuelve al creador');
end $$;

-- Partidas enteras por RPC en todas las composiciones. Decisión del bot pura,
-- los humanos de prueba eligen acciones con la misma información disponible.
do $$
declare humans integer[]; combination integer; t uuid; g public.team_games; actor integer; a text[]; choice jsonb; n integer; u uuid; before_history integer; before_medals integer;
begin
  select count(*) into before_history from public.game_history;
  for combination in 1..10 loop
    humans:=case (combination-1)%5+1 when 1 then array[0] when 2 then array[0,2] when 3 then array[0,1] when 4 then array[0,1,2] else array[0,1,2,3] end;
    t:=pg_temp.fixture(humans,true,case when combination>5 then 30 else 15 end,case when combination>5 then 15 else 30 end); n:=0;
    delete from public.profile_medals where profile_id in (select user_id from public.team_seats where table_id=t);
    select count(*) into before_medals from public.profile_medals;
    loop
      select * into g from public.team_games where id=t;
      exit when g.winner_team is not null;
      n:=n+1; perform pg_temp.check(n<1200,'partida no se bloquea '||humans::text);
      actor:=team_internal.actor(g);
      update public.team_games set action_started_at=clock_timestamp()-interval '3 seconds' where id=t;
      if g.awaiting_deal or not(actor=any(humans)) then perform pg_temp.act(t,humans[1],'tick');
      else
        a:=team_internal.legal(g,actor);
        choice:=team_internal.bot_choice(g,actor,(select cards from public.team_hands where table_id=t and seat=actor),a,0.42);
        perform pg_temp.check(choice is not null,'humanos siempre tienen acción');
        perform pg_temp.act(t,actor,choice->>'action',choice->'card');
      end if;
    end loop;
    perform pg_temp.check((select status='finished' from public.team_tables where id=t),'partida termina');
    perform pg_temp.check((select bool_and(p.coins=case when s.seat%2=g.winner_team then 100100 else 99900 end)
      from public.team_seats s join public.profiles p on p.id=s.user_id where s.table_id=t),'pago 2B por ganador');
    perform pg_temp.act(t,humans[1],'tick');
    perform pg_temp.check((select count(*)=before_medals from public.profile_medals),'no entrega medallas');
    perform pg_temp.check((select bool_and(p.games_won=0 and p.games_played=0) from public.team_seats s join public.profiles p on p.id=s.user_id where s.table_id=t),'no modifica estadísticas 1vs1');
  end loop;
  perform pg_temp.check((select count(*)=before_history from public.game_history),'no escribe estadísticas 1vs1');
end $$;

-- Timeout, reconexión, cancelación sin reemplazo automático.
do $$
declare t uuid:=pg_temp.fixture(array[0]); g public.team_games; i integer; s jsonb; u uuid; begin
  for i in 1..3 loop
    update public.team_games set turn=0,action_started_at=clock_timestamp()-interval '31 seconds' where id=t;
    perform pg_temp.act(t,0,'tick');
    select * into g from public.team_games where id=t;
    perform pg_temp.check((select timeouts=i from public.team_seats where table_id=t and seat=0),'timeout acumulado');
    if i<3 then
      perform pg_temp.check(g.awaiting_deal and g.last_hand_winner=1,'timeout al mazo');
      update public.team_games set action_started_at=clock_timestamp()-interval '3 seconds' where id=t;
      perform pg_temp.act(t,0,'tick');
    end if;
  end loop;
  perform pg_temp.check(g.winner_team=1 and g.finish_reason='timeouts','tercer timeout pierde equipo');
  t:=pg_temp.fixture(array[0]);
  select user_id into u from public.team_seats where table_id=t and seat=0;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated; s:=public.team_snapshot(t); perform public.team_presence(t); reset role;
  perform pg_temp.check((s->>'my_seat')::integer=0 and jsonb_array_length(s->'hand')=3,'reconexión conserva asiento y mano');
  update public.team_seats set last_seen_at=now()-interval '11 minutes' where table_id=t;
  perform team_internal.sweep(); perform team_internal.sweep();
  perform pg_temp.check((select status='cancelled' from public.team_tables where id=t),'todos ausentes cancela');
  perform pg_temp.check((select coins=100000 from public.profiles where id=u),'barrido reembolsa una vez');
  perform pg_temp.check((select count(*)=1 from public.team_seats where table_id=t and user_id is not null),'no reemplaza persona');
end $$;

-- Prioridad humana, igualdad de tanto y conservación de cartas al ganar compañero.
do $$
declare t uuid:=pg_temp.fixture(array[0,3]); g public.team_games; choice jsonb; h jsonb; first_choice jsonb; i integer; expected integer; begin
  perform pg_temp.act(t,0,'envido');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(team_internal.actor(g)=3,'humano responde antes que compañero bot');
  update public.team_games set action_started_at=clock_timestamp()-interval '3 seconds' where id=t;
  perform pg_temp.act(t,0,'tick');
  perform pg_temp.check((select envido->>'status'='pending' from public.team_games where id=t),'bot no responde por humano');
  t:=pg_temp.fixture();
  -- Empate de 27; gana el primer declarante desde mano (asiento 2).
  update public.team_games set mano=2,turn=2 where id=t;
  update public.team_hands set cards='[{"suit":"oro","value":7,"rank":4},{"suit":"oro","value":10,"rank":10},{"suit":"basto","value":4,"rank":14}]' where table_id=t;
  perform pg_temp.act(t,2,'envido'); perform pg_temp.act(t,3,'envido_yes');
  perform pg_temp.act(t,2,'tengo');
  foreach i in array array[3,0,1] loop
    select * into g from public.team_games where id=t;
    perform pg_temp.check('son_buenas'=any(team_internal.legal(g,i)) and not('tengo'=any(team_internal.legal(g,i))),'igualdad solo permite son buenas');
    perform pg_temp.act(t,i,'son_buenas');
  end loop;
  perform pg_temp.check((select scores=array[2,0] and (envido->>'high_seat')::int=2 from public.team_games where id=t),'igualdad conserva prioridad desde mano');
  select * into g from public.team_games where id=t;
  g.envido:='{"status":"resolved"}'; g.truco:='{"status":"accepted","value":2,"team":0}'; g.turn:=2;
  g.played:='[{"seat":0,"round":1,"card":{"rank":1}},{"seat":1,"round":1,"card":{"rank":8}},{"seat":3,"round":1,"card":{"rank":9}}]';
  h:='[{"suit":"oro","value":7,"rank":4},{"suit":"basto","value":4,"rank":14}]';
  choice:=team_internal.bot_choice(g,2,h,array['play'],0.42);
  perform pg_temp.check((choice->'card'->>'rank')::int=14,'bot guarda la buena cuando compañero gana');
  first_choice:=choice;
  update public.team_hands set cards='[]' where table_id=t and seat<>2;
  choice:=team_internal.bot_choice(g,2,h,array['play'],0.42);
  perform pg_temp.check(first_choice=choice,'cartas ocultas no alteran decisión del bot');
end $$;

rollback;
