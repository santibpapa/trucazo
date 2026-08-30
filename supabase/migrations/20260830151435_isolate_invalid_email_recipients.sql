-- Un destinatario inválido no debe contarse como un fallo reintentable: nunca
-- va a volverse válido y podría bloquear a todo el lote. Conservamos el
-- registro como omitido para que el historial siga siendo auditable.
begin;

alter table public.email_deliveries
  drop constraint if exists email_deliveries_status_check;

alter table public.email_deliveries
  add constraint email_deliveries_status_check
  check (status in ('sending', 'sent', 'failed', 'skipped'));

-- Limpia los intentos fallidos que pertenecen a dominios reservados o usados
-- por cuentas de prueba. Los demás fallos quedan listos para reintentarse.
update public.email_deliveries d
set
  status = 'skipped',
  last_error = 'Omitido: dirección de prueba no entregable',
  updated_at = now()
from auth.users u
where u.id = d.user_id
  and d.status = 'failed'
  and (
    lower(split_part(u.email, '@', 2)) in (
      'example.com', 'example.net', 'example.org', 'test.com'
    )
    or lower(split_part(u.email, '@', 2)) like '%.example.com'
    or lower(split_part(u.email, '@', 2)) like '%.example.net'
    or lower(split_part(u.email, '@', 2)) like '%.example.org'
    or lower(split_part(u.email, '@', 2)) like '%.invalid'
    or lower(split_part(u.email, '@', 2)) like '%.localhost'
    or lower(split_part(u.email, '@', 2)) like '%.test'
  );

commit;
