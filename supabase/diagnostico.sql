-- ============================================================
-- DIAGNÓSTICO TRUCAZO — SOLO LECTURA (no modifica nada)
-- UNA sola consulta: el SQL Editor de Supabase solo muestra el
-- resultado del último statement, así que va todo junto en JSON.
-- Correr completo y pegar el resultado.
-- ============================================================

with
columnas as (
  select jsonb_agg(t order by t.table_name, t.ordinal_position) j from (
    select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles','tables','games','game_history')
  ) t
),
rls as (
  select jsonb_agg(t) j from (
    select relname as tabla, relrowsecurity as rls_habilitada, relforcerowsecurity as rls_forzada
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in ('profiles','tables','games','game_history')
  ) t
),
policies as (
  select jsonb_agg(t order by t.tablename, t.operacion, t.policyname) j from (
    select tablename, policyname, cmd as operacion, roles::text,
           qual as using_expr, with_check as check_expr
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','tables','games','game_history')
  ) t
),
funciones as (
  select jsonb_agg(t order by t.funcion) j from (
    select p.proname as funcion, pg_get_functiondef(p.oid) as definicion
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('finish_game','create_table','join_table','cancel_table')
  ) t
),
realtime as (
  select jsonb_agg(t order by t.tablename) j from (
    select tablename from pg_publication_tables where pubname = 'supabase_realtime'
  ) t
),
triggers as (
  select jsonb_agg(t) j from (
    select event_object_table as tabla, trigger_name, action_timing,
           event_manipulation as evento, action_statement
    from information_schema.triggers
    where trigger_schema = 'public'
  ) t
),
replica as (
  select jsonb_agg(t) j from (
    select relname as tabla,
           case relreplident when 'd' then 'default (solo PK)' when 'f' then 'full (fila completa)'
                             when 'n' then 'nothing' when 'i' then 'index' end as replica_identity
    from pg_class
    where relnamespace = 'public'::regnamespace and relname in ('games','tables')
  ) t
)
select '1_columnas' as seccion, (select j from columnas) as datos
union all select '2_rls_habilitada', (select j from rls)
union all select '3_policies',       (select j from policies)
union all select '4_funciones',      (select j from funciones)
union all select '5_realtime',       (select j from realtime)
union all select '6_triggers',       (select j from triggers)
union all select '7_replica_identity',(select j from replica)
order by seccion;
