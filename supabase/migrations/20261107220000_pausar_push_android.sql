-- ============================================================
-- TRUCAZO — Pausar el despachador de avisos push de la app Android
-- Fecha: 2026-11-07 · Ver docs/android.md → android-estado-actual
--
-- La app Android está en pausa hasta que Google Ad Manager apruebe la cuenta,
-- y los envíos ya estaban apagados (native_push.settings.dispatch_enabled =
-- false). Aun así, la tarea `trucazo-native-push` corría cada 15 segundos
-- (unas 5.760 veces por día) y llenaba el historial de cron: 15.364 corridas
-- guardadas el 07/11, con 3 dispositivos de prueba y ningún aviso pendiente.
--
-- Se DESACTIVA la tarea, no se borra: conserva su horario y su comando.
-- No toca tablas, dispositivos ni configuración de push.
--
-- Para retomarla cuando vuelva Android, correr en el SQL Editor:
--   select cron.alter_job(jobid, active := true)
--   from cron.job where jobname = 'trucazo-native-push';
-- ============================================================

-- En una base local sin pg_cron (reconstrucción y pruebas) no hay cron.job.
do $$
begin
  if to_regclass('cron.job') is not null then
    perform cron.alter_job(jobid, active := false)
    from cron.job where jobname = 'trucazo-native-push';
  end if;
end $$;
