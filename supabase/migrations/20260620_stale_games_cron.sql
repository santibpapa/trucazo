-- ============================================================
-- TRUCAZO — Programar el barrido de partidas colgadas (pg_cron)
-- Fecha: 2026-06-20
--
-- Corre sweep_stale_games() cada 5 minutos. Requiere la extensión pg_cron
-- (en Supabase: Database → Extensions → habilitar "pg_cron", o el CREATE de abajo).
--
-- Correr APARTE de la migración de la función (esta puede fallar si tu plan
-- no permite pg_cron; en ese caso, podés llamar sweep_stale_games() a mano o
-- desde un cron externo / Edge Function programada).
-- ============================================================

create extension if not exists pg_cron;

-- Reprogramable: si ya existe el job, lo actualiza (pg_cron >= 1.4).
select cron.schedule(
  'sweep-stale-trucazo',
  '*/5 * * * *',
  $$ select public.sweep_stale_games(10); $$
);

-- Para ver / quitar el job:
--   select * from cron.job where jobname = 'sweep-stale-trucazo';
--   select cron.unschedule('sweep-stale-trucazo');
