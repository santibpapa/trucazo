-- Foto de estructura y funciones 2vs2, sin datos de usuarios ni cartas.
-- Ejecutar únicamente sobre una base de prueba reconstruida:
-- psql -X -At -v ON_ERROR_STOP=1 -f scripts/export-team-schema.sql > supabase/schema/team_2vs2.json
with relations as (
  select c.oid, n.nspname as schema_name, c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind='r' and ((n.nspname='public' and c.relname in
    ('team_tables','team_seats','team_games','team_hands'))
    or (n.nspname='team_internal' and c.relname='requests'))
), tables as (
  select schema_name||'.'||relname as name, jsonb_build_object(
    'rls', relrowsecurity,
    'columns', (select jsonb_agg(jsonb_build_object('name',a.attname,
      'type',format_type(a.atttypid,a.atttypmod),'nullable',not a.attnotnull,
      'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
    'constraints', (select jsonb_object_agg(c.conname,pg_get_constraintdef(c.oid))
      from pg_constraint c where c.conrelid=r.oid),
    'indexes', (select jsonb_object_agg(i.indexname,i.indexdef) from pg_indexes i
      where i.schemaname=r.schema_name and i.tablename=r.relname),
    'policies', (select jsonb_agg(jsonb_build_object('name',p.policyname,'roles',p.roles,
      'command',p.cmd,'using',p.qual,'check',p.with_check) order by p.policyname)
      from pg_policies p where p.schemaname=r.schema_name and p.tablename=r.relname),
    'grants', (select jsonb_agg(jsonb_build_object('role',g.grantee,'privilege',g.privilege_type)
      order by g.grantee,g.privilege_type) from information_schema.table_privileges g
      where g.table_schema=r.schema_name and g.table_name=r.relname)
  ) as definition from relations r
), functions as (
  select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as name,
    jsonb_build_object('definition',pg_get_functiondef(p.oid), 'acl',p.proacl) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='team_internal' or (n.nspname='public' and p.proname in
    ('team_create','team_join','team_action','team_snapshot','team_lobby','team_presence','email_recipient_activity'))
)
select jsonb_pretty(jsonb_build_object(
  'tables',(select jsonb_object_agg(name,definition) from tables),
  'functions',(select jsonb_object_agg(name,definition) from functions)
));
