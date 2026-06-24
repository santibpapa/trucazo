-- ============================================================
-- TRUCAZO — Username insensible a mayúsculas (login + registro)
-- Fecha: 2026-06-22
--
--  * Índice único sobre lower(username): impide registrar "Bob" y "bob".
--  * get_login_email ahora matchea sin distinguir mayúsculas.
--
-- ⚠️ Si ya existieran usuarios que difieren solo en mayúsculas, la creación
--    del índice falla (y revierte todo). En ese caso hay que renombrar uno
--    antes de correr esto.
-- Idempotente.
-- ============================================================

begin;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

create or replace function public.get_login_email(p_username text)
 returns text language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
  return v_email;
end;
$function$;

commit;
