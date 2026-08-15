-- ============================================================
-- TRUCAZO — Seguridad (4 de 5): que el usuario no sirva para sacar el email
-- Fecha: 2026-08-15
--
-- EL AGUJERO (verificado): `get_login_email(text)` recibe un nombre de usuario y
-- devuelve el email de esa cuenta, y estaba concedida a `anon` (o sea, a
-- cualquiera, sin siquiera tener sesión). En la prueba, pidiendo por el usuario
-- "Ana" devolvió "ana@test.com". Con paciencia se arma la lista completa de
-- usuario -> email de todos los jugadores. Es el único agujero que toca datos
-- personales de gente real.
--
-- EL ARREGLO, SIN SACARLE NADA AL JUGADOR: el login por nombre de usuario sigue
-- existiendo igual que siempre. Lo que cambia es quién resuelve el nombre: antes
-- lo preguntaba el navegador, ahora lo hace el servidor de la web
-- (src/app/api/login-usuario/route.ts) con una llave privada que nunca sale de
-- Vercel. El email jamás llega al navegador, y los errores son siempre el mismo
-- mensaje genérico para que no se pueda usar como detector de usuarios.
--
-- La función NO se borra: la sigue usando el servidor. Solo se le quita el
-- permiso a los roles del navegador.
--
-- ⚠️ ORDEN DE APLICACIÓN (importante para no dejar a nadie afuera):
--    1º cargar la variable SUPABASE_SERVICE_ROLE_KEY en Vercel,
--    2º publicar la web con este cambio,
--    3º recién ahí correr este SQL.
--    Si se corre este SQL antes de publicar, el login por usuario deja de
--    andar hasta que se publique (el login por email sigue funcionando).
--
-- Idempotente.
-- ============================================================

begin;

revoke execute on function public.get_login_email(text) from anon, authenticated, public;

-- El dueño de la función (postgres) conserva el permiso, y la llave de servicio
-- actúa con ese nivel, así que el servidor de la web la sigue pudiendo llamar.

commit;

-- ------------------------------------------------------------
-- CÓMO COMPROBARLO (pegar en el SQL Editor):
--
--   select p.oid::regprocedure as funcion,
--          coalesce(array_to_string(p.proacl, ' '), 'ABIERTA A TODOS') as permisos
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace and p.proname = 'get_login_email';
--
-- No tiene que aparecer ni `anon` ni `authenticated` ni "ABIERTA A TODOS".
-- ------------------------------------------------------------
