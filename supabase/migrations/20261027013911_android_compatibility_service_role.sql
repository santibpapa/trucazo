-- Mantener las llamadas internas del servidor al agregar el control previo.
begin;
grant usage on schema app_compatibility to service_role;
grant execute on function app_compatibility.check_request() to service_role;
notify pgrst, 'reload config';
commit;
