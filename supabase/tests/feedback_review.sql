-- La transacción revierte fixtures, concesiones y hallazgos; no llama proveedores.
\set ON_ERROR_STOP on
begin;
create function pg_temp.feedback_check(ok boolean, detail text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Reseñas: %',detail; end if; end $$;

do $test$
declare
  r uuid; next_run uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  c uuid:=gen_random_uuid(); rows jsonb; other_rows jsonb; failed boolean; result jsonb;
begin
  perform pg_temp.feedback_check(not has_schema_privilege('anon','feedback_internal','usage'),'schema cerrado a invitados');
  perform pg_temp.feedback_check(not has_schema_privilege('authenticated','feedback_internal','usage'),'schema cerrado a jugadores');
  perform pg_temp.feedback_check(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='feedback_internal' and (p.prosecdef or has_function_privilege('authenticated',p.oid,'execute')
      or has_function_privilege('anon',p.oid,'execute'))),'funciones invoker y privadas');
  perform pg_temp.feedback_check(not exists(select 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='feedback_internal' and t.relkind='r' and not t.relrowsecurity),'RLS en todas las tablas');
  insert into public.feedback(id,rating_general,rating_aesthetics,understood,had_problem,comment,created_at)
    values(a,5,5,true,false,'fixture A','2000-01-01'),(b,1,2,true,true,'fixture B','2000-01-02'),
      (c,3,3,false,false,'fixture C','2000-01-03');
  r:=feedback_internal.start_run();
  perform pg_temp.feedback_check(r is not null,'primera ejecución obtiene la concesión');
  perform pg_temp.feedback_check(feedback_internal.start_run() is null,'segunda ejecución no compite');
  rows:=feedback_internal.claim_batch(r,2);
  perform pg_temp.feedback_check(jsonb_array_length(rows)=2 and rows->0->>'feedback_id'=a::text,'lote limitado en orden cronológico');
  other_rows:=feedback_internal.claim_batch(r,1);
  perform pg_temp.feedback_check(other_rows->0->>'feedback_id'=c::text,'siguiente lote sin repetir');
  failed:=false;
  begin perform feedback_internal.finish_review(r,b,'actionable','Problema detectado',array['fixture-problem']);
  exception when others then failed:=true; end;
  perform pg_temp.feedback_check(failed,'no cerrar sin guardar hallazgos');
  perform feedback_internal.save_finding(r,b,'fixture-problem',2000000000,'Fixture','bug','high','suspected','Hay un problema','{"test":true}');
  perform feedback_internal.save_finding(r,b,'fixture-problem',2000000000,'Fixture','bug','high','confirmed','Evidencia ampliada','{"test":true}');
  perform pg_temp.feedback_check((select count(*)=1 from feedback_internal.findings where feedback_id=b),'reintento idempotente');
  failed:=false;
  begin perform feedback_internal.save_finding(r,b,'fixture-problem',2000000001,'Fixture','bug','high','confirmed','Otro issue','{}');
  exception when others then failed:=true; end;
  perform pg_temp.feedback_check(failed,'impedir otro issue para el mismo problema');
  perform feedback_internal.save_finding(r,b,'fixture-second',2000000002,'Segundo','usability','medium','needs_info','Segundo hallazgo','{}');
  failed:=false;
  begin perform feedback_internal.finish_review(r,b,'actionable','Dos hallazgos',array['fixture-problem']);
  exception when others then failed:=true; end;
  perform pg_temp.feedback_check(failed,'no omitir el segundo hallazgo al cerrar');
  perform pg_temp.feedback_check(feedback_internal.finish_review(r,b,'actionable','Dos hallazgos',array['fixture-problem','fixture-second']),'cierre con todos los hallazgos');
  update public.feedback set comment='fixture A editada' where id=a;
  perform pg_temp.feedback_check(not feedback_internal.finish_review(r,a,'positive','Anterior','{}'),'edición durante el análisis queda pendiente');
  perform feedback_internal.fail_review(r,c,'Fallo simulado del proveedor');
  perform pg_temp.feedback_check((select status='retry' and retry_at>clock_timestamp() from feedback_internal.reviews where feedback_id=c),'fallo tiene reintento con espera');
  result:=feedback_internal.finish_run(r,'Prueba de cierre parcial');
  perform pg_temp.feedback_check(result->>'status'='partial','cierre no oculta pendientes');
  next_run:=feedback_internal.start_run();
  rows:=feedback_internal.claim_batch(next_run,1);
  perform pg_temp.feedback_check(rows->0->>'feedback_id'=a::text,'reseña modificada recuperada');
  -- Una ejecución perdida se recupera; su agente anterior pierde permiso.
  update feedback_internal.runs set lease_until=clock_timestamp()-interval '1 second' where id=next_run;
  r:=feedback_internal.start_run();
  perform pg_temp.feedback_check((select status='failed' from feedback_internal.runs where id=next_run),'ejecución vencida visible como fallida');
  failed:=false;
  begin perform feedback_internal.finish_review(next_run,a,'positive','Agente vencido','{}');
  exception when others then failed:=true; end;
  perform pg_temp.feedback_check(failed,'agente vencido no puede escribir');
  rows:=feedback_internal.claim_batch(r,1);
  perform pg_temp.feedback_check(rows->0->>'feedback_id'=a::text,'recuperar trabajo interrumpido');
  perform feedback_internal.finish_review(r,a,'positive','Reseña editada analizada','{}');
  update public.feedback set rating_general=2 where id=a;
  perform feedback_internal.finish_run(r,'Prueba');
  r:=feedback_internal.start_run();
  perform pg_temp.feedback_check((select status='pending' from feedback_internal.reviews where feedback_id=a),'cambio posterior a revisión se vuelve a encolar');
  delete from public.feedback where id=b;
  perform pg_temp.feedback_check(not exists(select 1 from feedback_internal.findings where feedback_id=b),'borrado de reseña elimina su seguimiento');
  perform feedback_internal.finish_run(r,'Pruebas terminadas');
end;
$test$;
rollback;
