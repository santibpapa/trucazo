-- ============================================================
-- TRUCAZO — Login con email O nombre de usuario
-- Fecha: 2026-06-22
--
-- Supabase autentica por email. Para permitir iniciar sesión con el nombre de
-- usuario, esta función resuelve username → email (leyendo auth.users con
-- privilegios definer). El cliente la usa solo cuando el dato ingresado no es
-- un email. Devuelve null si no existe (el cliente muestra un error genérico).
--
-- Nota: permite mapear un username a su email; es el costo de tener login por
-- usuario. La contraseña sigue siendo la barrera real.
-- Idempotente.
-- ============================================================

begin;

create or replace function public.get_login_email(p_username text)
 returns text language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = p_username
  limit 1;
  return v_email;
end;
$function$;

grant execute on function public.get_login_email(text) to anon, authenticated;

commit;
