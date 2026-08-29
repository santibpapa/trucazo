-- ============================================================
-- Analítica: límites de escritura y conservación automática
-- Sólo contra la base local reconstruida por el CI.
-- ============================================================

\set ON_ERROR_STOP on
\pset footer off

begin;

do $test$
declare
  v_visitor uuid := 'a0000000-0000-4000-8000-000000000001';
  v_session uuid := 'a0000000-0000-4000-8000-000000000002';
  v_count int;
  v_deleted jsonb;
begin
  -- Aunque se intenten 35 escrituras en un minuto, sólo entran 30.
  for i in 1..35 loop
    perform public.record_analytics_event(
      gen_random_uuid(), v_visitor, v_session, 'page_view', '/prueba', null,
      'Prueba', 'test', null, null, null, 'AR', 'Celular', 'Safari', 'iOS',
      '{}'::jsonb
    );
  end loop;

  select count(*) into v_count
  from public.analytics_events where visitor_id = v_visitor;
  if v_count <> 30 then
    raise exception 'el límite por visitante dejó % eventos; esperaba 30', v_count;
  end if;

  -- Simula datos de más de un año y comprueba que desaparezcan completos.
  update public.analytics_events
     set occurred_at = now() - interval '366 days'
   where visitor_id = v_visitor;
  update public.analytics_sessions
     set started_at = now() - interval '366 days',
         last_seen_at = now() - interval '366 days'
   where visitor_id = v_visitor;
  update public.analytics_visitors
     set first_seen_at = now() - interval '366 days',
         last_seen_at = now() - interval '366 days'
   where visitor_id = v_visitor;

  v_deleted := public.sweep_old_analytics(365);
  if (v_deleted->>'eventos')::int <> 30
     or (v_deleted->>'sesiones')::int <> 1
     or (v_deleted->>'visitantes')::int <> 1 then
    raise exception 'el barrido devolvió un resultado inesperado: %', v_deleted;
  end if;

  if exists (select 1 from public.analytics_visitors where visitor_id = v_visitor)
     or exists (select 1 from public.analytics_sessions where visitor_id = v_visitor)
     or exists (select 1 from public.analytics_events where visitor_id = v_visitor) then
    raise exception 'el barrido dejó datos viejos';
  end if;

  raise notice 'Analítica: límites y retención correctos.';
end;
$test$;

rollback;
