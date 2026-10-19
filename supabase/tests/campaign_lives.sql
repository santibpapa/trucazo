-- Base descartable reconstruida. No usa datos de jugadores reales.
\set ON_ERROR_STOP on
begin;
create function pg_temp.check_lives(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Vidas: %', detail; end if; end $$;

insert into auth.users(id,email,raw_user_meta_data) values
 ('ca110000-0000-4000-a000-000000000001','lives-a@test.invalid','{"username":"Lives A"}'),
 ('ca110000-0000-4000-a000-000000000002','lives-b@test.invalid','{"username":"Lives B"}'),
 ('ca110000-0000-4000-a000-000000000003','lives-c@test.invalid','{"username":"Lives C"}');
insert into public.friendships(requester_id,addressee_id,status) values
 ('ca110000-0000-4000-a000-000000000001','ca110000-0000-4000-a000-000000000002','accepted');

do $test$
declare
 a uuid := 'ca110000-0000-4000-a000-000000000001';
 b uuid := 'ca110000-0000-4000-a000-000000000002';
 c uuid := 'ca110000-0000-4000-a000-000000000003';
 rival uuid; g public.games; g2 public.games; view_state jsonb; req uuid; ticket uuid;
 next_at timestamptz; original_coins integer; result text; rejected boolean; i integer;
begin
 select id into rival from public.campaign_rivals order by order_index limit 1;
 perform set_config('request.jwt.claim.sub',a::text,true);
 set local role authenticated;
 view_state := public.get_campaign_lives();
 perform pg_temp.check_lives(view_state->>'lives' = '3' and view_state->>'next_life_at' is null,'empieza con tres y sin reloj');
 g := public.start_campaign_duel(rival);
 g2 := public.start_campaign_duel(rival);
 perform pg_temp.check_lives(g.id = g2.id,'reintentar inicio retoma el duelo');
 reset role;
 perform public.finish_game(g.id,a,15,0);
 perform pg_temp.check_lives((select lives=3 from campaign_internal.lives where user_id=a),'ganar no consume');

 for i in 1..3 loop
   set local role authenticated;
   g := public.start_campaign_duel(rival);
   perform public.forfeit(g.id);
   reset role;
   perform pg_temp.check_lives((select lives=3-i from campaign_internal.lives where user_id=a),'perder/rendirse descuenta una');
   perform public.finish_game(g.id,g.player2_id,0,15);
   perform pg_temp.check_lives((select lives=3-i from campaign_internal.lives where user_id=a),'repetir cierre no descuenta');
 end loop;
 select next_life_at into next_at from campaign_internal.lives where user_id=a;
 perform pg_temp.check_lives(next_at > statement_timestamp() + interval '29 minutes','primer reloj de treinta minutos');
 set local role authenticated;
 rejected := false;
 begin perform public.start_campaign_duel(rival); exception when others then rejected := sqlerrm='CAMPAIGN_NO_LIVES'; end;
 perform pg_temp.check_lives(rejected,'cero vidas bloquea el inicio directo');
 rejected := false;
 begin perform public.request_campaign_life(c); exception when others then rejected := true; end;
 perform pg_temp.check_lives(rejected,'terceros no son amigos');
 perform public.request_campaign_life(b);
 perform public.request_campaign_life(b);
 rejected := false;
 begin perform public.begin_campaign_life_ad(); exception when others then rejected := true; end;
 perform pg_temp.check_lives(rejected,'anuncios apagados hasta configurar proveedor');
 reset role;
 update campaign_internal.ad_settings set enabled=true where singleton;
 set local role authenticated;
 ticket := public.begin_campaign_life_ad();
 perform pg_temp.check_lives(ticket = public.begin_campaign_life_ad(),'un ticket pendiente por episodio');
 reset role;
 perform pg_temp.check_lives((select count(*)=1 from campaign_internal.life_requests where requester_id=a),'pedido repetido no genera spam');
 select id into req from campaign_internal.life_requests where requester_id=a;

 perform set_config('request.jwt.claim.sub',c::text,true);
 set local role authenticated;
 perform pg_temp.check_lives(jsonb_array_length(public.get_campaign_lives()->'requests_in')=0,'tercero no ve pedidos');
 rejected := false;
 begin perform public.send_campaign_life(req); exception when others then rejected := true; end;
 perform pg_temp.check_lives(rejected,'tercero no responde');
 rejected := false;
 begin perform public.complete_campaign_life_ad(ticket); exception when others then rejected := true; end;
 perform pg_temp.check_lives(rejected,'ticket no sirve en otra cuenta');
 reset role;

 perform set_config('request.jwt.claim.sub',b::text,true);
 select coins into original_coins from public.profiles where id=b;
 set local role authenticated;
 perform pg_temp.check_lives(jsonb_array_length(public.get_campaign_lives()->'requests_in')=1,'amigo recibe pedido');
 result := public.send_campaign_life(req);
 perform pg_temp.check_lives(result='sent' and public.send_campaign_life(req)='already_sent','ayuda y reintento idempotente');
 reset role;
 perform pg_temp.check_lives((select lives=1 and next_life_at=next_at from campaign_internal.lives where user_id=a),'regalo da una sin reiniciar reloj');
 perform pg_temp.check_lives((select lives=3 from campaign_internal.lives where user_id=b)
   and (select coins=original_coins from public.profiles where id=b),'enviar es gratis');

 perform set_config('request.jwt.claim.sub',a::text,true);
 set local role authenticated;
 view_state := public.complete_campaign_life_ad(ticket);
 perform pg_temp.check_lives(view_state->>'lives'='1','amigo y anuncio simultáneos no duplican');
 view_state := public.complete_campaign_life_ad(ticket);
 perform pg_temp.check_lives(view_state->>'lives'='1','callback duplicado no duplica');
 g := public.start_campaign_duel(rival);
 perform public.forfeit(g.id);
 ticket := public.begin_campaign_life_ad();
 view_state := public.complete_campaign_life_ad(ticket);
 perform pg_temp.check_lives(view_state->>'lives'='1','anuncio recupera una al estar en cero');
 g := public.start_campaign_duel(rival);
 perform public.forfeit(g.id);
 view_state := public.complete_campaign_life_ad(ticket);
 perform pg_temp.check_lives(view_state->>'lives'='0','ticket consumido no se reutiliza en otra derrota');
 reset role;

 -- Fracciones conservadas: recuperar una no reinicia los otros 30 minutos.
 update campaign_internal.lives set next_life_at=statement_timestamp()-interval '29 minutes' where user_id=a;
 view_state := public.get_campaign_lives();
 perform pg_temp.check_lives(view_state->>'lives'='1'
   and (view_state->>'next_life_at')::timestamptz between statement_timestamp()+interval '59 seconds' and statement_timestamp()+interval '61 seconds','recarga conserva sobrante');
 update campaign_internal.lives set next_life_at=statement_timestamp()-interval '2 hours' where user_id=a;
 view_state := public.get_campaign_lives();
 perform pg_temp.check_lives(view_state->>'lives'='3' and view_state->>'next_life_at' is null,'desconectado recarga con máximo tres');
 perform pg_temp.check_lives(not has_schema_privilege('authenticated','campaign_internal','usage')
   and not has_schema_privilege('anon','campaign_internal','usage'),'estado privado');
 perform pg_temp.check_lives(not exists(select 1 from pg_publication_tables where schemaname='campaign_internal'),'sin Realtime de estado privado');

 -- Una anulación sin ganador tampoco consume vida.
 set local role authenticated;
 g := public.start_campaign_duel(rival);
 reset role;
 update public.games set status='finished',winner_id=null where id=g.id;
 perform pg_temp.check_lives((select lives=3 from campaign_internal.lives where user_id=a),'anulación no es derrota');
 -- Un pedido vencido no se puede guardar para la próxima vez que llegue a cero.
 update campaign_internal.lives set lives=0,next_life_at=statement_timestamp()+interval '20 minutes',depletion_id=gen_random_uuid() where user_id=a;
 set local role authenticated;
 perform public.request_campaign_life(b);
 reset role;
 select id into req from campaign_internal.life_requests where requester_id=a and granted_at is null order by expires_at desc limit 1;
 update campaign_internal.life_requests set expires_at=statement_timestamp()-interval '1 second' where id=req;
 perform set_config('request.jwt.claim.sub',b::text,true);
 set local role authenticated;
 perform pg_temp.check_lives(public.send_campaign_life(req)='expired','no concede pedido vencido');
 reset role;
 perform pg_temp.check_lives((select lives=0 from campaign_internal.lives where user_id=a),'pedido vencido no cambia saldo');

 perform set_config('request.jwt.claim.sub','',true);
 rejected := false;
 begin perform public.get_campaign_lives(); exception when others then rejected := true; end;
 perform pg_temp.check_lives(rejected,'requiere identidad incluso al invocar como administrador');
end;
$test$;
rollback;
