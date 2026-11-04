-- ============================================================
-- TRUCAZO — Menos salida de datos y menos peso en la base (plan gratuito)
-- Fecha: 2026-11-04 · Ver docs/operacion.md → cuotas-2026-11-04
--
-- 1. `games` estaba en REPLICA IDENTITY FULL: cada aviso de Realtime mandaba la
--    partida nueva y además la anterior completa, que ningún cliente usa
--    (sólo leen `payload.new`). Con DEFAULT la anterior viaja como el `id`.
--    Comprobado antes de aplicar: la tabla TOAST de `games` está vacía (ninguna
--    columna sin cambios queda afuera del aviso).
-- 2. `cron.job_run_details` guardaba cada corrida de todas las tareas desde
--    junio (~84 MB) y `bot_decisions` 30 días (~73 MB). Limpieza diaria: 2 días
--    de historial de cron y 7 de decisiones de bots. bot_step sigue borrando a
--    los 30 días de vez en cuando; queda sin efecto y no se toca.
-- Idempotente.
-- ============================================================

alter table public.games replica identity default;

select cron.schedule('trucazo-cron-history-cleanup', '50 4 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '2 days'$$);
select cron.schedule('trucazo-bot-decisions-cleanup', '55 4 * * *',
  $$delete from public.bot_decisions where created_at < now() - interval '7 days'$$);

-- Primera limpieza (en una base local sin pg_cron la tabla no existe).
do $$
begin
  if to_regclass('cron.job_run_details') is not null then
    execute $q$delete from cron.job_run_details where end_time < now() - interval '2 days'$q$;
  end if;
end $$;
delete from public.bot_decisions where created_at < now() - interval '7 days';
