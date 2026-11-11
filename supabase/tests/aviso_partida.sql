-- Sólo base descartable reconstruida. Se revierte todo al terminar.
-- Aviso de partida reducido: un aviso por transacción con sólo lo que cambió,
-- y sólo los dos jugadores pueden escuchar el canal de su partida.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'aviso de partida: %', detail; end if; end $$;

-- Cuántos avisos del canal ve el usuario p_user (null = sin sesión).
create function pg_temp.seen_by(p_user uuid, p_topic text) returns bigint language plpgsql as $$
declare v bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user)::text, true);
  perform set_config('realtime.topic', p_topic, true);
  set local role authenticated;
  select count(*) into v from realtime.messages where topic = p_topic;
  reset role;
  return v;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('a1150000-0000-4000-a000-000000000001','aviso-a@test.invalid','{"username":"Aviso A"}'),
  ('a1150000-0000-4000-a000-000000000002','aviso-b@test.invalid','{"username":"Aviso B"}'),
  ('a1150000-0000-4000-a000-000000000003','aviso-c@test.invalid','{"username":"Aviso C"}');
update public.ranking_email_campaign set is_active=false where id;

do $test$
declare
  a uuid := 'a1150000-0000-4000-a000-000000000001';
  b uuid := 'a1150000-0000-4000-a000-000000000002';
  c uuid := 'a1150000-0000-4000-a000-000000000003';
  gid uuid := gen_random_uuid();
  quiet uuid := gen_random_uuid();
  before_stamp timestamptz;
  msg realtime.messages;
  denied boolean := false;
begin
  insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,status)
    values (gid,'Aviso',a,'Aviso A',b,'Aviso B',50,'playing'),
           (quiet,'Aviso quieto',a,'Aviso A',b,'Aviso B',50,'finished');
  insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet)
    values (gid,a,b,'Aviso A','Aviso B',a,a,100);
  insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,status)
    values (quiet,a,b,'Aviso A','Aviso B',a,a,100,'finished');
  select updated_at into before_stamp from public.games where id = gid;

  -- Dos cambios en la misma transacción: un solo aviso, con el estado final.
  update public.games set played_cards = '[{"player_id":"a1150000-0000-4000-a000-000000000001","card":{"value":1,"suit":"espada"},"round":1}]'::jsonb,
                          current_turn = b where id = gid;
  update public.games set player1_score = 3 where id = gid;
  -- Sin cambios reales: no hay nada que avisar.
  update public.games set bet = bet where id = quiet;
  set constraints public.trg_broadcast_game_diff immediate;

  perform pg_temp.check((select count(*) from realtime.messages where topic = 'game:' || gid) = 1, 'un aviso por transacción');
  perform pg_temp.check((select count(*) from realtime.messages where topic = 'game:' || quiet) = 0, 'sin cambios no se avisa');
  select * into msg from realtime.messages where topic = 'game:' || gid;
  perform pg_temp.check(msg.event = 'partida' and msg.private and msg.extension = 'broadcast', 'canal privado, evento partida');
  perform pg_temp.check((msg.payload->>'from')::timestamptz = before_stamp, 'from es el updated_at de antes');
  perform pg_temp.check(msg.payload->'d'->>'current_turn' = b::text, 'trae el turno nuevo');
  perform pg_temp.check((msg.payload->'d'->>'player1_score')::int = 3, 'trae el último cambio de la transacción');
  perform pg_temp.check(jsonb_array_length(msg.payload->'d'->'played_cards') = 1, 'trae la carta jugada');
  perform pg_temp.check(not (msg.payload->'d' ? 'player1_id') and not (msg.payload->'d' ? 'bet'), 'no trae lo que no cambió');

  -- Sólo los dos jugadores escuchan; nadie manda por el canal.
  perform pg_temp.check(pg_temp.seen_by(a, 'game:' || gid) = 1, 'el jugador 1 escucha');
  perform pg_temp.check(pg_temp.seen_by(b, 'game:' || gid) = 1, 'el jugador 2 escucha');
  perform pg_temp.check(pg_temp.seen_by(c, 'game:' || gid) = 0, 'un tercero no escucha');
  perform pg_temp.check(pg_temp.seen_by(null, 'game:' || gid) = 0, 'sin sesión no escucha');
  perform pg_temp.check(pg_temp.seen_by(a, 'game:no-es-una-partida') = 0, 'un canal raro no rompe nada');
  begin
    perform set_config('request.jwt.claim.sub', a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
    perform set_config('realtime.topic', 'game:' || gid, true);
    set local role authenticated;
    insert into realtime.messages(topic, extension, payload, event, private)
      values ('game:' || gid, 'broadcast', '{}'::jsonb, 'partida', true);
  exception when insufficient_privilege then denied := true;
  end;
  reset role;
  perform pg_temp.check(denied, 'un jugador no puede mandar avisos falsos');

  -- La función del aviso no se puede llamar desde la API.
  perform pg_temp.check(not has_function_privilege('authenticated', 'public._broadcast_game_diff()', 'execute'), 'función cerrada a authenticated');
  perform pg_temp.check(not has_function_privilege('anon', 'public._broadcast_game_diff()', 'execute'), 'función cerrada a anon');
  raise notice 'OK: aviso de partida reducido';
end
$test$;

rollback;
