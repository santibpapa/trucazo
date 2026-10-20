-- Fixtures privados, sin red, sin correos y con ROLLBACK.
\set ON_ERROR_STOP on
begin;
create function pg_temp.image_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Capturas: %',detail; end if; end $$;
grant execute on function pg_temp.image_check(boolean,text) to anon,authenticated,service_role;

do $$ declare r uuid; f uuid:=gen_random_uuid(); u uuid; t text; p text; failed boolean;
begin
  select id into u from public.profiles limit 1;
  if u is null then
    u:=gen_random_uuid();
    insert into auth.users(id,raw_user_meta_data) values(u,jsonb_build_object('username','CapturaFixture'));
  end if;
  p:=u::text||'/ticket-fixture.jpg';
  select id into r from feedback_internal.runs where status='running' and lease_until>clock_timestamp();
  if r is null then insert into feedback_internal.runs default values returning id into r; end if;
  insert into public.feedback(id,user_id,rating_general,rating_aesthetics,understood,had_problem,comment,image_paths)
    values(f,u,1,1,true,true,'Fixture',array[p]);
  insert into feedback_internal.reviews(feedback_id,source_hash,status,run_id)
    select f,feedback_internal.fingerprint(x),'processing',r from public.feedback x where x.id=f;
  perform pg_temp.image_check(not has_schema_privilege('authenticated','feedback_internal','usage'),'schema privado');
  perform pg_temp.image_check(not has_function_privilege('anon','public.consume_feedback_image_ticket(text)','execute'),'RPC cerrada a anon');
  perform pg_temp.image_check(not has_function_privilege('authenticated','public.consume_feedback_image_ticket(text)','execute'),'RPC cerrada a jugadores');
  perform pg_temp.image_check(has_function_privilege('service_role','public.consume_feedback_image_ticket(text)','execute'),'RPC habilitada al servidor');
  perform pg_temp.image_check(not has_function_privilege('service_role','feedback_internal.image_ticket(uuid,uuid,integer)','execute'),'servidor no puede emitir tickets');
  perform pg_temp.image_check(not has_function_privilege('authenticated','feedback_internal.image_ticket(uuid,uuid,integer)','execute'),'jugador no puede emitir tickets');
  failed:=false;
  begin perform feedback_internal.image_ticket(r,f,2); exception when others then failed:=true; end;
  perform pg_temp.image_check(failed,'índice fuera de adjuntos rechazado');
  failed:=false;
  begin perform feedback_internal.image_ticket(r,gen_random_uuid(),1); exception when others then failed:=true; end;
  perform pg_temp.image_check(failed,'otra reseña rechazada');
  t:=feedback_internal.image_ticket(r,f,1);
  perform pg_temp.image_check(t ~ '^[a-f0-9]{64}$','ticket aleatorio de 256 bits');
  perform pg_temp.image_check(not exists(select 1 from feedback_internal.image_tickets where token_hash=t),'token no se guarda en claro');
  perform pg_temp.image_check(public.consume_feedback_image_ticket(t)=p,'ticket válido devuelve ruta exacta');
  perform pg_temp.image_check(public.consume_feedback_image_ticket(t) is null,'replay rechazado');
  perform pg_temp.image_check(public.consume_feedback_image_ticket(repeat('0',64)) is null,'ticket inventado rechazado');
  t:=feedback_internal.image_ticket(r,f,1);
  update feedback_internal.image_tickets set expires_at=clock_timestamp()-interval '1 second' where token_hash=encode(extensions.digest(t,'sha256'),'hex');
  perform pg_temp.image_check(public.consume_feedback_image_ticket(t) is null,'ticket vencido rechazado');
  t:=feedback_internal.image_ticket(r,f,1);
  update public.feedback set comment='Fixture editada' where id=f;
  perform pg_temp.image_check(public.consume_feedback_image_ticket(t) is null,'edición de la reseña revoca ticket');
  update feedback_internal.reviews set source_hash=feedback_internal.fingerprint(x) from public.feedback x where x.id=f and feedback_id=f;
  t:=feedback_internal.image_ticket(r,f,1);
  update feedback_internal.reviews set status='reviewed' where feedback_id=f;
  perform pg_temp.image_check(public.consume_feedback_image_ticket(t) is null,'reseña cerrada revoca ticket');
  -- INVOKER y search_path fijo en las dos funciones.
  perform pg_temp.image_check(not exists(select 1 from pg_proc where oid in ('feedback_internal.image_ticket(uuid,uuid,integer)'::regprocedure,'public.consume_feedback_image_ticket(text)'::regprocedure) and (prosecdef or proconfig is null)),'sin elevación ni search_path mutable');
end $$;

-- Aislamiento real de Storage: mismo archivo, dueño/tercero/invitado.
insert into storage.objects(bucket_id,name) values ('feedback-images','e1aa0000-0000-4000-a000-000000000001/image-test.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','e1aa0000-0000-4000-a000-000000000001',true);
select pg_temp.image_check((select count(*)=1 from storage.objects where bucket_id='feedback-images' and name='e1aa0000-0000-4000-a000-000000000001/image-test.jpg'),'dueño lee su captura');
select set_config('request.jwt.claim.sub','e1aa0000-0000-4000-a000-000000000002',true);
select pg_temp.image_check((select count(*)=0 from storage.objects where bucket_id='feedback-images' and name='e1aa0000-0000-4000-a000-000000000001/image-test.jpg'),'tercero no lee');
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.image_check((select count(*)=0 from storage.objects where bucket_id='feedback-images' and name='e1aa0000-0000-4000-a000-000000000001/image-test.jpg'),'invitado no lee');
reset role;
rollback;
