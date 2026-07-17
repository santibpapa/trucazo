-- ============================================================
-- TRUCAZO — Mesas en espera colgadas: barrido + reembolso
-- Fecha: 2026-07-17
--
-- sweep_stale_games (20260620) cierra PARTIDAS ya arrancadas que quedaron
-- colgadas, pero NO toca las MESAS en espera (status 'waiting') que nadie
-- llegó a jugar. Si alguien crea una mesa y cierra el navegador sin apretar
-- "Cancelar mesa", esa mesa queda para siempre en el lobby y sus monedas
-- descontadas quedan trabadas.
--
-- sweep_stale_tables hace lo mismo que el botón "Cancelar mesa" pero
-- automático: para cada mesa 'waiting' más vieja que p_minutes, le devuelve
-- la apuesta al creador y borra la mesa (por cascade se borra también la
-- invitación privada, si tenía).
--
-- Pensada para correr por cron (ver abajo). No se otorga al cliente.
-- Idempotente.
-- ============================================================

begin;

create or replace function public.sweep_stale_tables(p_minutes int default 15)
 returns int language plpgsql security definer set search_path to 'public'
as $function$
declare
  t record;
  n int := 0;
  cutoff timestamptz := now() - make_interval(mins => p_minutes);
begin
  for t in
    select tb.* from tables tb
    where tb.status = 'waiting'
      and tb.created_at < cutoff
    for update
  loop
    -- reembolsar la apuesta al creador (igual que cancel_table)
    update profiles set coins = coins + t.bet where id = t.creator_id;
    delete from tables where id = t.id;  -- borra también la invitación (cascade)
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- Solo para cron/admin: que no sea invocable desde el cliente.
revoke execute on function public.sweep_stale_tables(int) from public, anon, authenticated;

commit;

-- ============================================================
-- Programar el barrido (pg_cron). Corre cada 5 minutos y limpia las mesas
-- que llevan más de 15 minutos esperando sin que nadie se sume.
-- Corré esto APARTE si tu plan no permite pg_cron (podés llamar la función
-- a mano). pg_cron ya quedó habilitado con sweep_stale_games.
-- ============================================================
select cron.schedule(
  'sweep-stale-tables-trucazo',
  '*/5 * * * *',
  $$ select public.sweep_stale_tables(15); $$
);

-- Para ver / quitar el job:
--   select * from cron.job where jobname = 'sweep-stale-tables-trucazo';
--   select cron.unschedule('sweep-stale-tables-trucazo');
