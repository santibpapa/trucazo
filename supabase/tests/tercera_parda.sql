-- Sólo base local descartable: juega cartas reales contra la RPC y revierte todo.
\set ON_ERROR_STOP on
begin;
create function pg_temp.parda_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Pardas: %',detail; end if; end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('da100000-0000-4000-a000-000000000001','parda-a@test.invalid','{"username":"Parda A"}'),
  ('da100000-0000-4000-a000-000000000002','parda-b@test.invalid','{"username":"Parda B"}');
insert into public.profiles(id,username) values
  ('da100000-0000-4000-a000-000000000001','Parda A'),
  ('da100000-0000-4000-a000-000000000002','Parda B')
on conflict(id) do update set username=excluded.username;

do $test$
declare
  a uuid := 'da100000-0000-4000-a000-000000000001';
  b uuid := 'da100000-0000-4000-a000-000000000002';
  scenario record; is_campaign boolean; ends_match boolean; mano uuid; expected uuid;
  rival uuid; gid uuid; stake integer; base_score integer; r integer; turn integer;
  ranks integer[] := array[5,8,12]; rank_a integer; rank_b integer;
  card_a jsonb; card_b jsonb; hand_a jsonb; hand_b jsonb; card jsonb; uid uuid;
  g public.games; checked integer := 0;
begin
  select id into rival from public.campaign_rivals order by order_index limit 1;
  perform pg_temp.parda_check(rival is not null,'hay rival para probar campaña');
  -- 0 = parda, 1 = A, 2 = B. Todos los caminos terminales legales.
  for scenario in select * from (values
    (array[1,2,0],1), (array[2,1,0],2),
    (array[1,1],1), (array[2,2],2),
    (array[1,0],1), (array[2,0],2), (array[0,1],1), (array[0,2],2),
    (array[1,2,1],1), (array[1,2,2],2),
    (array[2,1,1],1), (array[2,1,2],2),
    (array[0,0,1],1), (array[0,0,2],2), (array[0,0,0],0)
  ) cases(outcomes,winner) loop
    foreach mano in array array[b,a] loop
      expected := case scenario.winner when 1 then a when 2 then b else mano end;
      foreach is_campaign in array array[false,true] loop
        update profiles set is_bot=is_campaign where id=b;
        foreach stake in array array[1,2,4] loop
          foreach ends_match in array array[false,true] loop
            gid := gen_random_uuid();
            base_score := case when ends_match then 30-stake else 0 end;
            hand_a := '[]'; hand_b := '[]';
            for r in 1..3 loop
              rank_a := ranks[r] + case when scenario.outcomes[r]=2 then 1 else 0 end;
              rank_b := ranks[r] + case when scenario.outcomes[r]=1 then 1 else 0 end;
              select value into card_a from jsonb_array_elements(public._truco_deck())
                where (value->>'rank')::integer=rank_a order by value->>'suit' limit 1;
              select value into card_b from jsonb_array_elements(public._truco_deck())
                where (value->>'rank')::integer=rank_b and value<>card_a
                order by value->>'suit' limit 1;
              hand_a := hand_a || jsonb_build_array(card_a);
              hand_b := hand_b || jsonb_build_array(card_b);
            end loop;
            insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
              values(gid,'Prueba pardas',a,'Parda A',b,'Parda B',0,'playing');
            insert into public.games(id,player1_id,player2_id,player1_username,player2_username,
              current_turn,mano_player,bet,target_score,player1_score,player2_score,campaign_rival_id,truco_state)
              values(gid,a,b,'Parda A','Parda B',mano,mano,0,30,base_score,base_score,
                case when is_campaign then rival end,
                jsonb_build_object('status',case when stake=1 then 'none' else 'accepted' end,'value',stake));
            insert into public.game_hands(game_id,player_id,cards) values(gid,a,hand_a),(gid,b,hand_b);
            select * into g from public.games where id=gid;
            for r in 1..array_length(scenario.outcomes,1) loop
              for turn in 1..2 loop
                uid := g.current_turn;
                card := case when uid=a then hand_a->(r-1) else hand_b->(r-1) end;
                perform set_config('request.jwt.claim.sub',uid::text,true);
                set local role authenticated;
                g := public.play_card(gid,card);
                reset role;
              end loop;
              if r<array_length(scenario.outcomes,1) then
                perform pg_temp.parda_check(g.status='playing' and not g.awaiting_deal and g.round_number=r+1,
                  format('no terminar antes de tiempo: %s, ronda %s',scenario.outcomes,r));
              end if;
            end loop;
            perform pg_temp.parda_check(
              g.player1_score=base_score+case when expected=a then stake else 0 end and
              g.player2_score=base_score+case when expected=b then stake else 0 end,
              format('ganador/puntos: %s, mano %s, campaña %s, valor %s, fin %s',
                scenario.outcomes,mano,is_campaign,stake,ends_match));
            if ends_match then
              perform pg_temp.parda_check(g.status='finished' and g.winner_id=expected,'ganador al alcanzar 30');
              perform pg_temp.parda_check(exists(select 1 from public.game_history
                where player_id=expected and opponent_id=case when expected=a then b else a end and result='win'),
                'historial del ganador');
            else
              perform pg_temp.parda_check(g.awaiting_deal and g.status='playing','espera próxima mano');
            end if;
            checked := checked+1;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
  raise notice '% casos de pardas y resolución de manos verificados',checked;
end $test$;
rollback;
