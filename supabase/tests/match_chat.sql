-- Solo en base descartable reconstruida. Se revierte todo al terminar.
\set ON_ERROR_STOP on
begin;
create function pg_temp.chat_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'match chat: %',detail; end if; end $$;

insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
  ('c1000000-0000-4000-a000-000000000001','chat-a@test.invalid',false,'{"username":"Chat A"}'),
  ('c1000000-0000-4000-a000-000000000002','chat-b@test.invalid',false,'{"username":"Chat B"}'),
  ('c1000000-0000-4000-a000-000000000003','chat-c@test.invalid',false,'{"username":"Chat C"}'),
  ('c1000000-0000-4000-a000-000000000004','chat-invitado@test.invalid',true,'{"username":"Invitado"}'),
  ('c1000000-0000-4000-a000-000000000005','chat-bot@test.invalid',false,'{"username":"Bot"}');
insert into public.profiles(id,username,is_bot) values
  ('c1000000-0000-4000-a000-000000000001','Chat A',false),
  ('c1000000-0000-4000-a000-000000000002','Chat B',false),
  ('c1000000-0000-4000-a000-000000000003','Chat C',false),
  ('c1000000-0000-4000-a000-000000000004','Invitado',false),
  ('c1000000-0000-4000-a000-000000000005','Bot',true)
on conflict (id) do update set username=excluded.username,is_bot=excluded.is_bot;

insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,is_private,status,target_score,time_limit) values
  ('c1100000-0000-4000-a000-000000000001','Chat 1v1','c1000000-0000-4000-a000-000000000001','Chat A','c1000000-0000-4000-a000-000000000002','Chat B',100,false,'playing',15,30),
  ('c1100000-0000-4000-a000-000000000002','Chat bot','c1000000-0000-4000-a000-000000000001','Chat A','c1000000-0000-4000-a000-000000000005','Bot',100,false,'playing',15,30),
  ('c1100000-0000-4000-a000-000000000003','Chat invitado','c1000000-0000-4000-a000-000000000004','Invitado','c1000000-0000-4000-a000-000000000002','Chat B',100,false,'playing',15,30),
  ('c1100000-0000-4000-a000-000000000004','Chat campaña','c1000000-0000-4000-a000-000000000001','Chat A','c1000000-0000-4000-a000-000000000005','Bot',100,false,'playing',15,30),
  ('c1100000-0000-4000-a000-000000000005','Chat Mudo','c1000000-0000-4000-a000-000000000001','Chat A','c1000000-0000-4000-a000-000000000005','Bot',100,false,'playing',15,30);

insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet,status,campaign_rival_id) values
  ('c1100000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000002','Chat A','Chat B','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001',100,'playing',null),
  ('c1100000-0000-4000-a000-000000000002','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000005','Chat A','Bot','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001',100,'playing',null),
  ('c1100000-0000-4000-a000-000000000003','c1000000-0000-4000-a000-000000000004','c1000000-0000-4000-a000-000000000002','Invitado','Chat B','c1000000-0000-4000-a000-000000000004','c1000000-0000-4000-a000-000000000004',100,'playing',null),
  ('c1100000-0000-4000-a000-000000000004','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000005','Chat A','Rival de campaña','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001',100,'playing',(select id from public.campaign_rivals where slug <> 'mudo' limit 1)),
  ('c1100000-0000-4000-a000-000000000005','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000005','Chat A','Don Salvador','c1000000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001',100,'playing',(select id from public.campaign_rivals where slug = 'mudo'));
insert into public.team_tables(id,creator_id,name,bet,target_score,time_limit,status) values
  ('c1200000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001','Chat mixto',100,15,30,'playing'),
  ('c1200000-0000-4000-a000-000000000002','c1000000-0000-4000-a000-000000000001','Chat solo',100,15,30,'playing');
insert into public.team_seats(table_id,user_id,seat,username,paid) values
  ('c1200000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000001',0,'Chat A',100),
  ('c1200000-0000-4000-a000-000000000001','c1000000-0000-4000-a000-000000000004',1,'Invitado',100),
  ('c1200000-0000-4000-a000-000000000002','c1000000-0000-4000-a000-000000000001',0,'Chat A',100);
insert into public.team_seats(table_id,seat,username,paid)
select 'c1200000-0000-4000-a000-000000000001'::uuid,s,'Bot',100 from generate_series(2,3) s
union all
select 'c1200000-0000-4000-a000-000000000002'::uuid,s,'Bot',100 from generate_series(1,3) s;

do $$
declare
  a uuid := 'c1000000-0000-4000-a000-000000000001';
  b uuid := 'c1000000-0000-4000-a000-000000000002';
  c uuid := 'c1000000-0000-4000-a000-000000000003';
  guest uuid := 'c1000000-0000-4000-a000-000000000004';
  game uuid := 'c1100000-0000-4000-a000-000000000001';
  team uuid := 'c1200000-0000-4000-a000-000000000001';
  request uuid := gen_random_uuid();
  row_one public.match_chat_messages;
  row_again public.match_chat_messages;
  version_before bigint;
  blocked boolean;
  seen integer;
begin
  perform pg_temp.chat_check(has_table_privilege('authenticated','public.match_chat_messages','SELECT'), 'SELECT permitido');
  perform pg_temp.chat_check(not has_table_privilege('authenticated','public.match_chat_messages','INSERT,UPDATE,DELETE,TRUNCATE'), 'escritura de tabla cerrada');
  perform pg_temp.chat_check(not has_function_privilege('anon','public.send_match_chat_message(text,uuid,text,uuid)','EXECUTE'), 'anon sin RPC');
  perform pg_temp.chat_check(not has_function_privilege('authenticated','match_chat_internal.cleanup()','EXECUTE'), 'limpieza inaccesible');
  select version into version_before from public.team_tables where id=team;
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  row_one := public.send_match_chat_message('game',game,'  <b>🧉</b>  ',request);
  row_again := public.send_match_chat_message('game',game,'<b>🧉</b>',request);
  reset role;
  perform pg_temp.chat_check(row_one.id=row_again.id and row_one.sender_name='Chat A' and row_one.body='<b>🧉</b>', 'autor, texto plano e idempotencia');
  perform pg_temp.chat_check((select count(*) from public.match_chat_messages where game_id=game)=1, 'un solo mensaje');
  perform pg_temp.chat_check((select version from public.team_tables where id=team)=version_before, 'versión de juego intacta');

  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('game',game,'otro',request);
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'request_id no se reutiliza');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('game',game,'<b>🧉</b>',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'duplicado reciente rechazado');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('game',game,'otra cosa',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'frecuencia impuesta en SQL');

  update public.match_chat_messages set created_at=clock_timestamp()-interval '11 seconds' where id=row_one.id;
  set local role authenticated;
  perform public.send_match_chat_message('team',team,'Mensaje para toda la mesa',gen_random_uuid());
  reset role;
  perform pg_temp.chat_check((select version from public.team_tables where id=team)=version_before, 'chat no mueve equipo');
  perform pg_temp.chat_check(exists (
    select 1 from public.match_chat_messages where team_table_id=team and sender_id is null
      and sender_name='Bot' and created_at > clock_timestamp() and char_length(body) between 1 and 200
  ), 'bot compañero responde después sin tocar la partida');
  perform set_config('request.jwt.claim.sub',guest::text,true);
  set local role authenticated;
  select count(*) into seen from public.match_chat_messages where team_table_id=team;
  reset role; perform pg_temp.chat_check(seen=2,'invitado sentado puede leer mensajes y respuestas');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('team',team,'invitado',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'invitado no escribe');
  perform set_config('request.jwt.claim.sub',c::text,true);
  set local role authenticated;
  select count(*) into seen from public.match_chat_messages;
  reset role; perform pg_temp.chat_check(seen=0,'ajeno no lee aun sin filtro');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('game',game,'ajeno',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'ajeno no envía');
  perform set_config('request.jwt.claim.sub',b::text,true);
  set local role authenticated;
  select count(*) into seen from public.match_chat_messages where game_id=game;
  reset role; perform pg_temp.chat_check(seen=1,'rival ve mensaje 1v1');
  perform set_config('request.jwt.claim.sub',a::text,true);
  foreach game in array array['c1100000-0000-4000-a000-000000000002'::uuid,'c1100000-0000-4000-a000-000000000004'::uuid] loop
    update public.match_chat_messages set created_at=clock_timestamp()-interval '20 seconds' where sender_id=a;
    set local role authenticated;
    row_one := public.send_match_chat_message('game',game,'Hola, ¿jugamos?',gen_random_uuid());
    row_again := public.send_match_chat_message('game',game,'Hola, ¿jugamos?',row_one.client_request_id);
    reset role;
    perform pg_temp.chat_check(row_again.id=row_one.id, 'reintento con bot es idempotente');
    perform pg_temp.chat_check((select count(*) from public.match_chat_messages where game_id=game)=2,
                               '1v1 con bot, incluida campaña, recibe texto y responde una vez');
    perform pg_temp.chat_check(exists (
      select 1 from public.match_chat_messages where game_id=game and sender_id is null
        and sender_name=case when game='c1100000-0000-4000-a000-000000000004'::uuid
                             then 'Rival de campaña' else 'Bot' end
        and created_at > row_one.created_at + interval '1 second'
    ), 'la respuesta 1v1 sale a nombre del rival visible con demora');
    if game='c1100000-0000-4000-a000-000000000002'::uuid then
      update public.match_chat_messages set created_at=clock_timestamp()-interval '4 seconds' where id=row_one.id;
      set local role authenticated;
      perform public.send_match_chat_message('game',game,'Otro mensaje',gen_random_uuid());
      reset role;
      perform pg_temp.chat_check((select count(*) from public.match_chat_messages
        where game_id=game and sender_id is null)=1,'el bot no responde como loro');
    end if;
  end loop;
  update public.match_chat_messages set created_at=clock_timestamp()-interval '20 seconds' where sender_id=a;
  set local role authenticated;
  perform public.send_match_chat_message('game','c1100000-0000-4000-a000-000000000005','Hola, Salvador',gen_random_uuid());
  reset role;
  perform pg_temp.chat_check((select count(*) from public.match_chat_messages
    where game_id='c1100000-0000-4000-a000-000000000005')=1,'el Mudo recibe texto y no habla');
  update public.match_chat_messages set created_at=clock_timestamp()-interval '20 seconds' where sender_id=a;
  set local role authenticated;
  perform public.send_match_chat_message('team','c1200000-0000-4000-a000-000000000002','Vamos a jugar',gen_random_uuid());
  reset role;
  perform pg_temp.chat_check((select count(*) from public.match_chat_messages
    where team_table_id='c1200000-0000-4000-a000-000000000002')=2,'1P+3B también tiene chat');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('team',team,repeat('🧉',201),gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'límite Unicode');
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('team',team,E' \n\t ',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'vacío tras espacios');
  blocked:=false;
  begin set local role authenticated; insert into public.match_chat_messages(game_id,sender_id,sender_name,body,client_request_id)
    values(game,a,'Falso','trampa',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'INSERT directo denegado');
  update public.team_tables set status='finished' where id=team;
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('team',team,'final',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'mesa terminada no acepta');
  update public.games set status='finished' where id='c1100000-0000-4000-a000-000000000001';
  blocked:=false;
  begin set local role authenticated; perform public.send_match_chat_message('game','c1100000-0000-4000-a000-000000000001','final',gen_random_uuid());
  exception when others then blocked:=true; end;
  reset role; perform pg_temp.chat_check(blocked,'partida terminada no acepta');
  update public.match_chat_messages set created_at=clock_timestamp()-interval '73 hours' where id=row_one.id;
  set local role authenticated;
  select count(*) into seen from public.match_chat_messages where id=row_one.id;
  reset role; perform pg_temp.chat_check(seen=0,'caducidad de lectura');
  perform match_chat_internal.cleanup();
  perform pg_temp.chat_check(not exists(select 1 from public.match_chat_messages where id=row_one.id),'limpieza solo vencidos');
  perform pg_temp.chat_check((select count(*) from public.match_chat_messages where team_table_id=team)=2,'limpieza conserva recientes');
end $$;
rollback;
