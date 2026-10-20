-- Sólo base descartable reconstruida por CI; no modifica partidas de producción.
\set ON_ERROR_STOP on
begin;
create function pg_temp.envido_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Envido 33: %', detail; end if; end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('ea330000-0000-4000-a000-000000000001','envido33-a@test.invalid','{"username":"Envido33 A"}'),
  ('ea330000-0000-4000-a000-000000000002','envido33-b@test.invalid','{"username":"Envido33 B"}');
insert into public.profiles(id,username) values
  ('ea330000-0000-4000-a000-000000000001','Envido33 A'),
  ('ea330000-0000-4000-a000-000000000002','Envido33 B')
on conflict(id) do update set username=excluded.username;

do $test$
declare
  a uuid := 'ea330000-0000-4000-a000-000000000001';
  b uuid := 'ea330000-0000-4000-a000-000000000002';
  mano uuid; pie uuid; uid uuid; gid uuid; expected uuid;
  target integer; rival_points integer; response text; accepted boolean; played boolean;
  g public.games; card jsonb; hand_a jsonb; hand_b jsonb; blocked boolean; count_checked integer := 0;
begin
  select jsonb_agg(value order by (value->>'value')::integer desc) into hand_a
    from jsonb_array_elements(public._truco_deck()) where
      (value->>'suit'='espada' and (value->>'value')::integer in (7,6)) or
      (value->>'suit'='basto' and (value->>'value')::integer=10);
  perform pg_temp.envido_check(public._envido_points(hand_a)=33,'fixture de 33');
  foreach target in array array[15,30] loop
    foreach mano in array array[a,b] loop
      pie := case when mano=a then b else a end;
      foreach rival_points in array array[31,33] loop
        select jsonb_agg(value order by (value->>'value')::integer desc) into hand_b
          from jsonb_array_elements(public._truco_deck()) where
            (value->>'suit'='oro' and (value->>'value')::integer in (6,case when rival_points=33 then 7 else 5 end)) or
            (value->>'suit'='copa' and (value->>'value')::integer=11);
        foreach played in array array[false,true] loop
          foreach accepted in array array[false,true] loop
            foreach response in array array['tengo','son_buenas'] loop
            gid := gen_random_uuid();
            insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
              values(gid,'Prueba envido 33',a,'Envido33 A',b,'Envido33 B',0,'playing');
            insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,target_score)
              values(gid,a,b,'Envido33 A','Envido33 B',mano,mano,0,target);
            insert into public.game_hands(game_id,player_id,cards) values(gid,a,hand_a),(gid,b,hand_b);
            select * into g from public.games where id=gid;
            if played then
              card := case when mano=a then hand_a->1 else hand_b->1 end;
              perform set_config('request.jwt.claim.sub',mano::text,true);
              set local role authenticated;
              g := public.play_card(gid,card);
              reset role;
            end if;
            uid := g.current_turn;
            perform set_config('request.jwt.claim.sub',uid::text,true);
            set local role authenticated;
            g := public.sing_envido(gid,'falta_envido');
            reset role;
            perform pg_temp.envido_check(g.envido_state->>'status'='falta_envido','falta cantada');
            uid := case when uid=a then b else a end;
            perform set_config('request.jwt.claim.sub',uid::text,true);
            set local role authenticated;
            g := public.respond_envido(gid,accepted);
            reset role;
            if not accepted then
              perform pg_temp.envido_check(g.envido_state->>'status'='rejected','no quiero no abre declaración');
              blocked := false;
              begin
                set local role authenticated;
                perform public.envido_say(gid,'tengo');
              exception when others then
                if sqlerrm <> 'no hay envido para declarar' then raise; end if;
                blocked := true;
              end;
              reset role;
              perform pg_temp.envido_check(blocked,'no quiero impide declarar');
            else
              perform pg_temp.envido_check(g.envido_state->>'status'='declaring' and g.envido_state->>'declare_turn'=mano::text,'declara primero la mano');
              -- No se confunde current_turn (carta) con declare_turn (tanto).
              perform set_config('request.jwt.claim.sub',pie::text,true);
              blocked := false;
              begin
                set local role authenticated;
                perform public.envido_say(gid,'tengo');
              exception when others then
                if sqlerrm <> 'no es tu turno de declarar' then raise; end if;
                blocked := true;
              end;
              reset role;
              perform pg_temp.envido_check(blocked,'el pie espera a la mano');
              perform set_config('request.jwt.claim.sub',mano::text,true);
              set local role authenticated;
              g := public.envido_say(gid,'tengo');
              reset role;
              perform pg_temp.envido_check((g.envido_state->>'mano_declared')::integer=case when mano=a then 33 else rival_points end,'tanto de mano, incluidas cartas jugadas');
              perform pg_temp.envido_check(g.envido_state->>'declare_turn'=pie::text,'ahora declara el pie');
              -- Relectura con la misma identidad, como al refrescar/reconectar.
              perform set_config('request.jwt.claim.sub',pie::text,true);
              set local role authenticated;
              select * into g from public.games where id=gid;
              reset role;
              perform pg_temp.envido_check(g.envido_state->>'declare_turn'=pie::text,'estado accesible al reconectar');
              set local role authenticated;
              g := public.envido_say(gid,response);
              reset role;
              expected := case when response='son_buenas' or rival_points=33 then mano else a end;
              perform pg_temp.envido_check(g.envido_state->>'status'='accepted' and g.envido_state->>'winner_id'=expected::text,'gana 33, empate favorece mano');
              if response='tengo' then
                perform pg_temp.envido_check((g.envido_state->>'player1_points')::integer=33 and (g.envido_state->>'player2_points')::integer=rival_points,'tantos expuestos');
              else
                perform pg_temp.envido_check((g.envido_state->>(case when mano=a then 'player1_points' else 'player2_points' end))::integer=case when mano=a then 33 else rival_points end,'son buenas expone sólo el tanto de mano');
              end if;
            end if;
            count_checked := count_checked+1;
            end loop;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  raise notice 'Envido 33: % escenarios correctos',count_checked;
end $test$;
rollback;
