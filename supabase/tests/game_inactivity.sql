-- Sólo base descartable del CI. RPCs reales y rollback al terminar.
\set ON_ERROR_STOP on
begin;

create function pg_temp.afk_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Inactividad: %', detail; end if; end $$;

-- Simular tiempo transcurrido sin esperar ni reiniciar el reloj con el trigger.
create function pg_temp.expire_turn(gid uuid) returns void language plpgsql as $$
begin
  alter table public.games disable trigger trg_touch_turn_start;
  update public.games set turn_started_at=now()-make_interval(secs=>time_limit+1) where id=gid;
  alter table public.games enable trigger trg_touch_turn_start;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('af110000-0000-4000-a000-000000000001','afk-active@test.invalid','{"username":"AFK Active"}'),
  ('af110000-0000-4000-a000-000000000002','afk-absent@test.invalid','{"username":"AFK Absent"}'),
  ('af110000-0000-4000-a000-000000000003','afk-outsider@test.invalid','{"username":"AFK Outsider"}');
update public.ranking_email_campaign set is_active=false where id;

do $test$
declare
  a uuid := 'af110000-0000-4000-a000-000000000001';
  b uuid := 'af110000-0000-4000-a000-000000000002';
  outsider uuid := 'af110000-0000-4000-a000-000000000003';
  active uuid; absent uuid; gid uuid; g public.games; card jsonb; stamp timestamptz;
  limit_seconds int; step int; count_before int;
begin
  foreach active in array array[a,b] loop
    absent := case when active=a then b else a end;
    foreach limit_seconds in array array[15,30] loop
      update public.profiles set coins=900 where id in(a,b);
      select count(*) into count_before from public.game_history where player_id=active;
      gid := gen_random_uuid();
      insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status,time_limit)
        values(gid,'AFK regression',a,'AFK Active',b,'AFK Absent',50,'playing',limit_seconds);
      insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,time_limit)
        values(gid,a,b,'AFK Active','AFK Absent',absent,active,100,limit_seconds);
      insert into public.game_hands(game_id,player_id,cards)
        select gid,uid,jsonb_agg(card) from unnest(array[a,b]) uid
        cross join lateral (select value card from jsonb_array_elements(public._truco_deck()) limit 3) deck group by uid;

      select * into g from public.games where id=gid;
      stamp := g.turn_started_at;
      perform set_config('request.jwt.claim.sub',active::text,true);
      set local role authenticated;
      perform public.touch_presence(gid);
      reset role;
      perform pg_temp.afk_check((select turn_started_at=stamp from public.games where id=gid),'presencia no reinicia el turno');
      perform public.sweep_stale_games(10);
      perform pg_temp.afk_check((select status='playing' from public.games where id=gid),'el barrido no reemplaza el timeout con jugador activo');

      -- Nadie puede acelerar el vencimiento; un tercero no puede resolverlo.
      begin
        set local role authenticated;
        perform public.timeout_mazo(gid);
        raise exception 'Aceptó timeout antes del plazo';
      exception when raise_exception then
        if sqlerrm <> 'todavia hay tiempo' then raise; end if;
      end;
      reset role;
      perform set_config('request.jwt.claim.sub',outsider::text,true);
      begin
        set local role authenticated;
        perform public.timeout_mazo(gid);
        raise exception 'Aceptó timeout de un tercero';
      exception when raise_exception then
        if sqlerrm <> 'not a player of this game' then raise; end if;
      end;
      reset role;

      for step in 1..3 loop
        perform set_config('request.jwt.claim.sub',active::text,true);
        select * into g from public.games where id=gid;
        -- El activo juega cuando le toca; nunca usa forfeit.
        if g.current_turn=active then
          select cards->0 into card from public.game_hands where game_id=gid and player_id=active;
          set local role authenticated;
          g := public.play_card(gid,card);
          reset role;
        end if;
        perform pg_temp.afk_check(g.current_turn=absent,'el turno pendiente pertenece al ausente');
        perform pg_temp.expire_turn(gid);
        set local role authenticated;
        g := public.timeout_mazo(gid);
        reset role;
        perform pg_temp.afk_check(case when absent=a then g.mazo_count_p1 else g.mazo_count_p2 end=step,'cuenta exactamente un vencimiento');
        perform pg_temp.afk_check(case when active=a then g.mazo_count_p1 else g.mazo_count_p2 end=0,'no sanciona al activo');
        if step<3 then
          perform pg_temp.afk_check(g.status='playing' and g.awaiting_deal,'cierra la mano y espera reparto');
          begin
            set local role authenticated;
            perform public.timeout_mazo(gid);
            raise exception 'Duplicó timeout mientras espera reparto';
          exception when raise_exception then
            if sqlerrm <> 'esperando la proxima mano' then raise; end if;
          end;
          reset role;
          set local role authenticated;
          g := public.advance_hand(gid);
          -- Reintento tras respuesta perdida y segundo cliente: idempotente.
          g := public.advance_hand(gid);
          reset role;
          perform pg_temp.afk_check(not g.awaiting_deal and g.hand_number=step+1,'reparte una sola vez');
        else
          perform pg_temp.afk_check(g.status='finished' and g.winner_id=active,'el activo gana por tres vencimientos');
        end if;
      end loop;
      perform pg_temp.afk_check((select coins=1000 from public.profiles where id=active),'pozo entregado al activo');
      perform pg_temp.afk_check((select coins=900 from public.profiles where id=absent),'el ausente no cobra');
      perform pg_temp.afk_check((select count(*)=count_before+1 from public.game_history where player_id=active),'historial una sola vez');
      perform pg_temp.afk_check(not exists(select 1 from public.game_history where player_id=active and result='loss'), 'el activo nunca registra derrota');
    end loop;
  end loop;

  -- Durante la declaración del envido manda declare_turn, aunque current_turn
  -- haya quedado en el otro jugador. El timeout concede envido + mano al activo.
  gid := gen_random_uuid();
  insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
    values(gid,'AFK declaring',a,'AFK Active',b,'AFK Absent',0,'playing');
  insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,envido_state)
    values(gid,a,b,'AFK Active','AFK Absent',a,a,0,
      jsonb_build_object('status','declaring','value',2,'declare_turn',b,'mano_declared',null));
  perform pg_temp.expire_turn(gid);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  g := public.timeout_mazo(gid);
  reset role;
  perform pg_temp.afk_check(g.mazo_count_p2=1 and g.mazo_count_p1=0 and g.player1_score=3 and g.awaiting_deal,
    'sanciona al declarante ausente y entrega los puntos al activo');
end $test$;

rollback;
\echo 'Inactividad: turnos de 15/30s, ambos asientos, presencia, reparto/reintento, permisos, envido y victoria del activo verificados.'
