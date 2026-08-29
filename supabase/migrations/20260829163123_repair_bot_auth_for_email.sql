-- Las cuentas bot se insertaron por SQL antes de existir los emails. GoTrue
-- espera cadenas vacías (no NULL) en estos tokens internos; si encuentra un
-- NULL, auth.admin.listUsers() falla y el cron no puede cargar destinatarios.
-- Se limita a provider=bot: no modifica datos de acceso de personas reales.
begin;

do $$
declare
  token_column text;
begin
  -- La reconstrucción liviana de CI no replica todas las columnas internas de
  -- GoTrue. Actualizamos cada token sólo cuando esa versión de auth.users lo
  -- contiene, sin perder la reparación en Supabase real.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'raw_app_meta_data'
  ) then
    foreach token_column in array array[
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change'
    ] loop
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'users'
          and column_name = token_column
      ) then
        execute format(
          'update auth.users set %1$I = coalesce(%1$I, '''') where raw_app_meta_data->>''provider'' = ''bot'' and %1$I is null',
          token_column
        );
      end if;
    end loop;
  end if;
end
$$;

commit;
