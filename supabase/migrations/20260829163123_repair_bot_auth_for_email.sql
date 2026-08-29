-- Las cuentas bot se insertaron por SQL antes de existir los emails. GoTrue
-- espera cadenas vacías (no NULL) en estos tokens internos; si encuentra un
-- NULL, auth.admin.listUsers() falla y el cron no puede cargar destinatarios.
-- Se limita a provider=bot: no modifica datos de acceso de personas reales.
begin;

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, '')
where raw_app_meta_data->>'provider' = 'bot'
  and (
    confirmation_token is null
    or recovery_token is null
    or email_change_token_new is null
    or email_change is null
  );

commit;
