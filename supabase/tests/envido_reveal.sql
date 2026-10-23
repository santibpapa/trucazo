-- Sólo base descartable. Todos los datos de prueba terminan en ROLLBACK.
\set ON_ERROR_STOP on
begin;
create function pg_temp.envido_reveal_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Mostrar envido: %',detail; end if; end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('ee250000-0000-4000-a000-000000000001','envido-reveal-a@test.invalid','{"username":"EnvidoRevealA"}'),
  ('ee250000-0000-4000-a000-000000000002','envido-reveal-b@test.invalid','{"username":"EnvidoRevealB"}');
insert into public.profiles(id,username) values
  ('ee250000-0000-4000-a000-000000000001','EnvidoRevealA'),
  ('ee250000-0000-4000-a000-000000000002','EnvidoRevealB') on conflict(id) do nothing;

create function pg_temp.envido_fixture(winner uuid,mano uuid,target integer,points integer) returns uuid language plpgsql as $$
declare
  a uuid := 'ee250000-0000-4000-a000-000000000001'; b uuid := 'ee250000-0000-4000-a000-000000000002';
  gid uuid := gen_random_uuid();
begin
  insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
    values(gid,'Prueba mostrar envido',a,'EnvidoRevealA',b,'EnvidoRevealB',0,'playing');
  insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score)
    values(gid,a,b,'EnvidoRevealA','EnvidoRevealB',mano,mano,0,target);
  insert into public.game_hands(game_id,player_id,cards)
    select gid,winner,jsonb_agg(c order by (c->>'value')::integer) from jsonb_array_elements(public._truco_deck()) c where
      (c->>'suit'='basto' and (c->>'value')::integer in (5,case when points=32 then 7 else 10 end)) or
      (c->>'suit'='oro' and (c->>'value')::integer=11);
  insert into public.game_hands(game_id,player_id,cards)
    select gid,case when winner=a then b else a end,jsonb_agg(c) from jsonb_array_elements(public._truco_deck()) c where
      (c->>'suit'='espada' and (c->>'value')::integer=4) or
      (c->>'suit'='copa' and (c->>'value')::integer=10) or (c->>'suit'='oro' and (c->>'value')::integer=12);
  return gid;
end $$;

create function pg_temp.envido_declare(gid uuid,mano uuid,response text) returns public.games language plpgsql as $$
declare g public.games; uid uuid;
begin
  select * into g from public.games where id=gid;
  uid := case when g.envido_state->>'last_singer'=g.player1_id::text then g.player2_id else g.player1_id end;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  perform public.respond_envido(gid,true);
  perform set_config('request.jwt.claim.sub',mano::text,true);
  perform public.envido_say(gid,'tengo');
  uid := case when mano=g.player1_id then g.player2_id else g.player1_id end;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  return public.envido_say(gid,response);
end $$;

create function pg_temp.envido_proof(g public.games,winner uuid,points integer) returns void language plpgsql as $$
declare played jsonb; card jsonb;
begin
  perform pg_temp.envido_reveal_check(g.envido_reveal->>'player_id'=winner::text,'muestra al ganador del envido');
  select coalesce(jsonb_agg(pc->'card'),'[]') into played from jsonb_array_elements(g.played_cards) pc where pc->>'player_id'=winner::text;
  perform pg_temp.envido_reveal_check(public._envido_points(played||(g.envido_reveal->'cards'))=points,'las cartas prueban el tanto');
  for card in select value from jsonb_array_elements(g.envido_reveal->'cards') loop
    perform pg_temp.envido_reveal_check(card->>'suit'='basto','sólo muestra las cartas necesarias');
    perform pg_temp.envido_reveal_check(not played @> jsonb_build_array(card),'no duplica cartas jugadas');
  end loop;
end $$;

do $test$
declare
  a uuid := 'ee250000-0000-4000-a000-000000000001'; b uuid := 'ee250000-0000-4000-a000-000000000002';
  winner uuid; mano uuid; singer uuid; uid uuid; gid uuid; target integer; closing text; g public.games;
  card jsonb; suit text; checked integer := 0;
begin
  foreach target in array array[15,30] loop
    foreach winner in array array[a,b] loop
      foreach mano in array array[a,b] loop
        gid := pg_temp.envido_fixture(winner,mano,target,25);
        perform set_config('request.jwt.claim.sub',mano::text,true);
        perform public.sing_envido(gid,'envido');
        g := pg_temp.envido_declare(gid,mano,'tengo');
        perform pg_temp.envido_reveal_check(g.envido_reveal is null,'el tanto sigue privado mientras se juega');
        perform set_config('request.jwt.claim.sub',g.current_turn::text,true);
        g := public.sing_truco(gid,'truco');
        singer := (g.truco_state->>'last_singer')::uuid;
        uid := case when singer=a then b else a end;
        perform set_config('request.jwt.claim.sub',uid::text,true);
        g := public.respond_truco(gid,false);
        perform pg_temp.envido_reveal_check(g.awaiting_deal,'truco no querido cierra la mano');
        perform pg_temp.envido_proof(g,winner,25);
        checked := checked+1;

        gid := pg_temp.envido_fixture(winner,mano,target,32);
        update public.games set player1_score=case when winner=a then 3 else 0 end,player2_score=case when winner=b then 3 else 0 end where id=gid;
        perform set_config('request.jwt.claim.sub',mano::text,true);
        perform public.sing_envido(gid,'real_envido');
        uid := case when mano=a then b else a end;
        perform set_config('request.jwt.claim.sub',uid::text,true);
        perform public.sing_envido(gid,'falta_envido');
        g := pg_temp.envido_declare(gid,mano,case when winner=mano then 'son_buenas' else 'tengo' end);
        perform pg_temp.envido_reveal_check(g.status='finished' and g.winner_id=winner,'la falta termina la partida');
        perform pg_temp.envido_proof(g,winner,32);
        checked := checked+1;
      end loop;
    end loop;
  end loop;
  foreach closing in array array['truco','mazo','cartas','mazo_declarando','campana'] loop
    gid := pg_temp.envido_fixture(a,a,15,32);
    perform set_config('request.jwt.claim.sub',a::text,true);
    perform public.sing_envido(gid,'envido');
    if closing='mazo_declarando' then
      perform set_config('request.jwt.claim.sub',b::text,true);
      perform public.respond_envido(gid,true);
      perform set_config('request.jwt.claim.sub',a::text,true);
      perform public.envido_say(gid,'tengo');
      update public.games set player1_score=14 where id=gid;
      perform set_config('request.jwt.claim.sub',b::text,true);
      g := public.envido_say(gid,'mazo');
    else
      g := pg_temp.envido_declare(gid,a,'son_buenas');
      update public.games set player1_score=14 where id=gid;
      if closing='campana' then
        update public.games set campaign_rival_id=(select id from public.campaign_rivals order by order_index limit 1) where id=gid;
        perform pg_temp.envido_reveal_check((select campaign_rival_id is not null from public.games where id=gid),'rival de Historia disponible');
      end if;
      if closing='truco' then
        perform set_config('request.jwt.claim.sub',a::text,true);
        perform public.sing_truco(gid,'truco');
        perform set_config('request.jwt.claim.sub',b::text,true);
        g := public.respond_truco(gid,false);
      elsif closing='mazo' then
        update public.games set current_turn=b where id=gid;
        perform set_config('request.jwt.claim.sub',b::text,true);
        g := public.irse_al_mazo(gid);
        perform public.finish_game(gid,a,g.player1_score,g.player2_score);
      elsif closing='cartas' then
        -- Primera parda; quien ganó el envido juega último y cierra la segunda.
        update public.game_hands set cards=(select jsonb_agg(c) from jsonb_array_elements(public._truco_deck()) c where
          (c->>'suit'='copa' and (c->>'value')::int=11) or (c->>'suit'='espada' and (c->>'value')::int=4)) where game_id=gid and player_id=b;
        foreach uid in array array[a,b] loop
          suit := case when uid=a then 'oro' else 'copa' end;
          select c into card from public.game_hands,jsonb_array_elements(cards) c where game_id=gid and player_id=uid and c->>'suit'=suit;
          update public.games set played_cards=played_cards||jsonb_build_array(jsonb_build_object('player_id',uid,'round',1,'card',card)) where id=gid;
          update public.game_hands set cards=(select jsonb_agg(c) from jsonb_array_elements(cards) c where c<>card) where game_id=gid and player_id=uid;
        end loop;
        update public.games set round_number=2,round_results='[{"round":1,"winner_id":null}]',current_turn=b where id=gid;
        foreach uid in array array[b,a] loop
          select cards->0 into card from public.game_hands where game_id=gid and player_id=uid;
          perform set_config('request.jwt.claim.sub',uid::text,true);
          g := public.play_card(gid,card);
        end loop;
        perform pg_temp.envido_reveal_check(jsonb_array_length(g.played_cards)=4,'conserva la última carta al terminar');
      else
        perform set_config('request.jwt.claim.sub',a::text,true);
        perform public.finish_game(gid,a,15,0);
      end if;
    end if;
    select * into g from public.games where id=gid;
    perform pg_temp.envido_reveal_check(g.status='finished','cierre final: '||closing);
    perform pg_temp.envido_proof(g,a,32);
    checked := checked+1;
  end loop;
  foreach closing in array array['sin_envido','rechazado','sin_declarar'] loop
    gid := pg_temp.envido_fixture(a,a,15,25);
    perform set_config('request.jwt.claim.sub',a::text,true);
    if closing<>'sin_envido' then
      perform public.sing_envido(gid,'envido');
      perform set_config('request.jwt.claim.sub',b::text,true);
      if closing='rechazado' then perform public.respond_envido(gid,false);
      else
        perform public.respond_envido(gid,true);
        perform set_config('request.jwt.claim.sub',a::text,true);
        perform public.envido_say(gid,'mazo');
      end if;
    end if;
    perform public.finish_game(gid,b,0,15);
    select * into g from public.games where id=gid;
    perform pg_temp.envido_reveal_check(g.envido_reveal is null,'no revela cartas: '||closing);
    checked := checked+1;
  end loop;
  raise notice 'Mostrar envido: % cierres aprobados',checked;
end $test$;
rollback;
