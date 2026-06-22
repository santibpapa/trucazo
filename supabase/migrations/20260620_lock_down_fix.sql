-- ============================================================
-- TRUCAZO — Fix de la Etapa 5: revocar finish_game también de PUBLIC
-- Fecha: 2026-06-20
--
-- En Postgres las funciones reciben EXECUTE para PUBLIC por defecto, así que
-- revocar solo a anon/authenticated no bloquea la llamada directa. Hay que
-- revocar también a PUBLIC. Las RPCs definer la siguen llamando internamente
-- (corren como el dueño de la función), así que el juego no se ve afectado.
-- ============================================================

begin;

revoke execute on function public.finish_game(uuid, uuid, integer, integer) from public, anon, authenticated;

commit;
