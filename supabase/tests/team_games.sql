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
  -- Todas las personas ausentes juegan en el mismo equipo: pierden por abandono, sin reembolso.
  perform pg_temp.check((select status='finished' from public.team_tables where id=t),'todos ausentes de un equipo termina la partida');
  perform pg_temp.check((select winner_team=1 and finish_reason='forfeit' from public.team_games where id=t),'el equipo ausente pierde por abandono');
  perform pg_temp.check((select coins=99900 from public.profiles where id=u),'abandono por ausencia no reembolsa');
  perform pg_temp.check((select count(*)=1 from public.team_seats where table_id=t and user_id is not null),'no reemplaza persona');
  -- Personas ausentes de ambos equipos: se anula y devuelve, una sola vez.
  t:=pg_temp.fixture(array[0,1]);
  update public.team_seats set last_seen_at=now()-interval '11 minutes' where table_id=t;
  perform team_internal.sweep(); perform team_internal.sweep();
  perform pg_temp.check((select status='cancelled' from public.team_tables where id=t),'ausentes de ambos equipos cancela');
  perform pg_temp.check(not exists(select 1 from public.team_seats s join public.profiles p on p.id=s.user_id
    where s.table_id=t and p.coins<>100000),'cancelación por ausencia reembolsa una vez');
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

-- Una sala antigua sigue abierta mientras quede una persona conectada.
do $$
declare t uuid:=pg_temp.fixture(array[0,1],false); u uuid; outsider uuid:=pg_temp.person(); blocked boolean:=false; begin
  update public.team_tables set created_at=now()-interval '2 hours' where id=t;
  update public.team_seats set last_seen_at=now()-interval '20 minutes' where table_id=t;
  select user_id into u from public.team_seats where table_id=t and seat=1;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated; perform public.team_presence(t); reset role;
  perform team_internal.sweep();
  perform pg_temp.check((select status='waiting' from public.team_tables where id=t),'presencia de cualquier compañero/rival conserva sala antigua');
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin set local role authenticated; perform public.team_presence(t);
    exception when raise_exception then blocked:=true; end;
  reset role;
  perform pg_temp.check(blocked,'ajeno no puede renovar presencia');
  update public.team_seats set last_seen_at=now()-interval '16 minutes' where table_id=t and user_id is not null;
  -- Los bots siguen teniendo presencia reciente; no mantienen la sala abiertos.
  update public.team_seats set last_seen_at=now() where table_id=t and user_id is null;
  perform team_internal.sweep(); perform team_internal.sweep();
  perform pg_temp.check((select status='cancelled' from public.team_tables where id=t),'sala sin personas por 15 minutos cancela');
  perform pg_temp.check(not exists(select 1 from public.team_seats s join public.profiles p on p.id=s.user_id
    where s.table_id=t and p.coins<>100000),'cancelación devuelve a ambas personas una vez');
end $$;

-- Retención: borrar jugadas cerradas no habilita reintentos de cobros/pagos.
do $$
declare t uuid:=pg_temp.fixture(array[0,1]); active uuid; recent uuid; u uuid; req uuid:=gen_random_uuid();
  create_req uuid; create_payload jsonb; join_req uuid; join_user uuid; v bigint; kept integer; blocked boolean:=false; begin
  select user_id into u from public.team_seats where table_id=t and seat=0;
  select request_id,payload into create_req,create_payload from team_internal.requests where table_id=t and payload->>'action'='create';
  select request_id,actor into join_req,join_user from team_internal.requests where table_id=t and payload->>'action'='join';
  select version into v from public.team_tables where id=t;
  perform pg_temp.act(t,0,'forfeit',null,req,v);
  update public.team_tables set updated_at=now()-interval '31 days' where id=t;
  active:=pg_temp.fixture(array[0],false);
  update public.team_tables set updated_at=now()-interval '60 days' where id=active;
  recent:=pg_temp.fixture(array[0]); perform pg_temp.act(recent,0,'forfeit');
  select count(*) into kept from team_internal.requests where table_id in (active,recent);
  perform team_internal.prune_requests();
  perform pg_temp.check(not exists(select 1 from team_internal.requests where table_id=t and payload->>'action' not in ('create','join')),'purga acciones antiguas cerradas');
  perform pg_temp.check((select count(*)=2 from team_internal.requests where table_id=t),'conserva creación e ingreso');
  perform pg_temp.check((select count(*)=kept from team_internal.requests where table_id in (active,recent)),'no purga mesas activas ni cierres recientes');
  perform pg_temp.check(team_internal.prune_requests()=0,'repetir limpieza es inocuo');
  -- Reintento con versión original y con versión actual: ninguno vuelve a pagar.
  perform pg_temp.act(t,0,'forfeit',null,req,v);
  perform pg_temp.act(t,0,'forfeit',null,req);
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  perform public.team_create(create_req,create_payload->>'name',(create_payload->>'bet')::int,
    (create_payload->>'score')::int,(create_payload->>'time')::int,(create_payload->>'private')::boolean);
  reset role;
  perform set_config('request.jwt.claim.sub',join_user::text,true);
  set local role authenticated; perform public.team_join(join_req,t); reset role;
  perform pg_temp.check((select coins=99900 from public.profiles where id=u),'reintento de crear no debita otra apuesta');
  perform pg_temp.check((select coins=100100 from public.profiles where id=join_user),'reintentos de ingreso y cierre no repiten pagos');
  perform pg_temp.check((select version=v+1 from public.team_tables where id=t),'mesa cerrada inmutable tras purga y reintentos');
  begin set local role authenticated; perform team_internal.prune_requests();
    exception when insufficient_privilege then blocked:=true; end;
  reset role;
  perform pg_temp.check(blocked,'cliente no puede borrar comprobantes');
  perform pg_temp.check((select relrowsecurity from pg_class where oid='team_internal.requests'::regclass),'comprobantes protegidos por RLS');
end $$;

-- Bots con nombre: de la lista del lobby, sin repetir en la mesa.
do $$
declare t uuid:=pg_temp.fixture(array[0]); begin
  perform pg_temp.check((select count(distinct username)=4 from public.team_seats where table_id=t),'cuatro nombres distintos');
  perform pg_temp.check((select bool_and(username in (select name from public.lobby_bot_names))
    from public.team_seats where table_id=t and user_id is null),'los bots usan nombres de jugador');
  perform pg_temp.check((select relrowsecurity from pg_class where oid='public.team_bot_lines'::regclass),'catálogo de frases protegido por RLS');
  -- Quedarse callado ante el compañero se nota: toda frase del chat rápido
  -- tiene respuesta, y con las dos manos (buena y mala) cuando la distingue.
  perform pg_temp.check(not exists(select 1 from unnest(team_internal.chat_lines()) frase
    where not exists(select 1 from public.team_bot_lines l where l.moment='oye:'||frase)),
    'el bot tiene respuesta para cada frase del chat');
  perform pg_temp.check(not exists(select 1 from public.team_bot_lines l where l.strong
    and not exists(select 1 from public.team_bot_lines o where o.moment=l.moment and not o.strong)),
    'si contesta con buena mano, también contesta con mala');
end $$;

create function pg_temp.say(t uuid,s integer,texto text) returns jsonb language plpgsql as $$
declare u uuid; result jsonb; begin
  select user_id into u from public.team_seats where table_id=t and seat=s;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  result:=public.team_say(t,texto);
  reset role;
  return result;
end $$;

-- El chat rápido: qué se puede decir, quién puede decirlo y qué NO mueve.
do $$
declare t uuid:=pg_temp.fixture(); g public.team_games; v bigint; started timestamptz;
  outsider uuid:=pg_temp.person(); blocked boolean; n integer; i integer; begin
  select version,(select action_started_at from public.team_games where id=t) into v,started
    from public.team_tables where id=t;
  perform pg_temp.say(t,0,'¿Qué hago?');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(jsonb_array_length(g.chat)=1 and g.chat->0->>'text'='¿Qué hago?'
    and (g.chat->0->>'seat')::integer=0 and (g.chat->0->>'hand')::integer=g.hand_number,'la frase queda con autor y mano');
  -- Hablar no es jugar: ni corre el reloj del turno ni invalida la jugada del otro.
  perform pg_temp.check((select version=v from public.team_tables where id=t),'el chat no cambia la versión de la mesa');
  perform pg_temp.check(g.action_started_at=started,'el chat no reinicia el reloj del turno');
  perform pg_temp.check(not (g.chat::text like '%rank%'),'el chat no lleva cartas');
  -- Un mensaje cada dos segundos por persona.
  perform pg_temp.say(t,0,'Algo tengo');
  perform pg_temp.check((select jsonb_array_length(chat)=1 from public.team_games where id=t),'ignora el mensaje repetido al instante');
  blocked:=false;
  begin perform pg_temp.say(t,1,'te mando un link'); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'solo se pueden mandar las frases de la lista');
  blocked:=false;
  begin perform set_config('request.jwt.claim.sub',outsider::text,true);
    set local role authenticated; perform public.team_say(t,'¡Buena!');
    exception when raise_exception then blocked:=true; end;
  reset role;
  perform pg_temp.check(blocked,'un ajeno no puede hablar en la mesa');
  -- La lista guarda las últimas diez y nada más.
  for i in 1..12 loop perform team_internal.say(t,1,'¡Buena!'); end loop;
  select jsonb_array_length(chat) into n from public.team_games where id=t;
  perform pg_temp.check(n=10,'la mesa recuerda las últimas diez frases');
  blocked:=false;
  perform team_internal.finish(t,0,'points');
  begin perform pg_temp.say(t,0,'¡Buena!'); exception when raise_exception then blocked:=true; end;
  perform pg_temp.check(blocked,'no se habla en una mesa terminada');
end $$;

-- El bot escucha a su compañero: le contesta, y lo que contesta es verdad.
do $$
declare t uuid:=pg_temp.fixture(array[0]); g public.team_games; i integer:=0; reply text; begin
  -- Mano de fierro para el bot del asiento 2 (el compañero del 0).
  update public.team_hands set cards='[{"suit":"espada","value":1,"rank":1},{"suit":"basto","value":1,"rank":2},{"suit":"espada","value":7,"rank":3}]'
    where table_id=t and seat=2;
  perform pg_temp.check(team_internal.bot_line(t,2,'oye:¿Qué hago?',team_internal.bot_strong(t,2,false)),'el compañero contesta');
  select chat->-1->>'text' into reply from public.team_games where id=t;
  perform pg_temp.check(reply in (select text from public.team_bot_lines where moment='oye:¿Qué hago?' and strong),'con buena mano contesta que lo sigan');
  update public.team_games set chat='[]' where id=t;
  update public.team_hands set cards='[{"suit":"copa","value":4,"rank":14},{"suit":"basto","value":5,"rank":13},{"suit":"oro","value":6,"rank":12}]'
    where table_id=t and seat=2;
  perform pg_temp.check(team_internal.bot_line(t,2,'oye:¿Qué hago?',team_internal.bot_strong(t,2,false)),'el compañero contesta');
  select chat->-1->>'text' into reply from public.team_games where id=t;
  perform pg_temp.check(reply in (select text from public.team_bot_lines where moment='oye:¿Qué hago?' and not strong),'sin nada avisa que está seco');
  -- Dos bots no se encinan… salvo para contestarle al compañero: quedarse
  -- callado ante una pregunta directa se nota mucho más que el coro.
  perform pg_temp.check(not team_internal.bot_line(t,1,'chicana'),'un bot no habla encima de otro');
  perform pg_temp.check(team_internal.bot_line(t,1,'oye:¿Qué hago?',true,true),'contestarle al compañero no espera turno');
  perform pg_temp.check(not team_internal.bot_line(t,1,'oye:¿Qué hago?',true,true),'pero no se contesta dos veces seguidas');
  -- El pedido de una persona llega al compañero bot y no al rival.
  update public.team_games set chat='[]' where id=t;
  perform pg_temp.say(t,0,'¡Cantales, cantales!');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(team_internal.partner_hint(g,2)='cantales','el compañero escucha el pedido');
  perform pg_temp.check(team_internal.partner_hint(g,1) is null and team_internal.partner_hint(g,3) is null,'los rivales no le manejan el juego al bot');
  update public.team_games set hand_number=hand_number+1 where id=t;
  select * into g from public.team_games where id=t;
  perform pg_temp.check(team_internal.partner_hint(g,2) is null,'el pedido caduca al terminar la mano');
end $$;

-- "Calladito" los calla por el resto de la mano, y solo por esa mano.
do $$
declare t uuid:=pg_temp.fixture(array[0]); g public.team_games; n integer; begin
  perform pg_temp.say(t,0,'Calladito');
  select * into g from public.team_games where id=t;
  perform pg_temp.check(team_internal.quiet(g),'queda pedido el silencio');
  select jsonb_array_length(chat) into n from public.team_games where id=t;
  perform pg_temp.check(not team_internal.bot_line(t,2,'apoya'),'callados no hablan');
  perform team_internal.bot_talk(t,0,'truco');
  perform pg_temp.check((select jsonb_array_length(chat)=n from public.team_games where id=t),'ni siquiera para acompañar un canto');
  update public.team_games set hand_number=hand_number+1 where id=t;
  select * into g from public.team_games where id=t;
  perform pg_temp.check(not team_internal.quiet(g),'en la mano siguiente vuelven a hablar');
end $$;

-- El pedido del compañero corre el umbral del bot, pero no le da la mano.
do $$
declare g public.team_games; floja jsonb; tanto23 jsonb; tanto26 jsonb; fierro jsonb; begin
  g.id:=gen_random_uuid(); g.played:='[]'; g.round:=1; g.turn:=0; g.hand_number:=1; g.chat:='[]';
  floja:='[{"suit":"copa","value":4,"rank":14},{"suit":"basto","value":5,"rank":13},{"suit":"oro","value":6,"rank":12}]';
  tanto23:='[{"suit":"oro","value":1,"rank":7},{"suit":"oro","value":2,"rank":6},{"suit":"basto","value":4,"rank":14}]';
  tanto26:='[{"suit":"oro","value":5,"rank":13},{"suit":"oro","value":1,"rank":7},{"suit":"basto","value":4,"rank":14}]';
  fierro:='[{"suit":"espada","value":1,"rank":1},{"suit":"basto","value":1,"rank":2},{"suit":"espada","value":7,"rank":3}]';
  -- Truco: "cantales" lo anima; "estoy seco" lo guarda.
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['truco_yes','truco_no'],0.3)->>'action'='truco_no','sin pedido, con nada, no quiere');
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['truco_yes','truco_no'],0.3,'cantales')->>'action'='truco_yes','"cantales" lo anima a querer');
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['truco_yes','truco_no'],0.1)->>'action'='truco_yes','sin pedido a veces quiere igual');
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['truco_yes','truco_no'],0.1,'seco')->>'action'='truco_no','"estoy seco" lo hace achicarse');
  perform pg_temp.check(team_internal.bot_choice(g,0,fierro,array['truco_yes','truco_no'],0.9,'seco')->>'action'='truco_yes','con la mano hecha quiere aunque le digan que están secos');
  -- Envido: el tanto del equipo es el mejor de los dos, así que el aviso pesa.
  perform pg_temp.check(team_internal.bot_choice(g,0,tanto23,array['envido_yes','envido_no'],0.5)->>'action'='envido_no','sin pedido, 23 no alcanza');
  perform pg_temp.check(team_internal.bot_choice(g,0,tanto23,array['envido_yes','envido_no'],0.5,'tengo')->>'action'='envido_yes','"algo tengo" baja el listón del envido');
  perform pg_temp.check(team_internal.bot_choice(g,0,tanto26,array['envido_yes','envido_no'],0.5)->>'action'='envido_yes','sin pedido, 26 se quiere');
  perform pg_temp.check(team_internal.bot_choice(g,0,tanto26,array['envido_yes','envido_no'],0.5,'seco')->>'action'='envido_no','"estoy seco" lo pone más exigente');
  -- Sin pedido decide igual que antes, y el pedido nunca inventa una jugada.
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['play'],0.42)
    =team_internal.bot_choice(g,0,floja,array['play'],0.42,'cantales'),'el pedido no cambia qué carta juega');
  perform pg_temp.check(team_internal.bot_choice(g,0,floja,array['truco_yes','truco_no'],0.3,'cantales')->>'action'<>'vale_cuatro','el pedido no inventa un canto que no tiene');
end $$;

rollback;
