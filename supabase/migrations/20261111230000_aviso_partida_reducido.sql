-- ============================================================
-- TRUCAZO — Aviso de partida reducido (menos salida de datos)
-- Fecha: 2026-11-11 · Ver docs/operacion.md → cuotas-2026-11-04
--
-- Hasta hoy cada jugada viajaba por Realtime como la fila entera de `games`
-- más la lista de sus 34 columnas con su tipo, a cada jugador. Ahora la base
-- manda un aviso propio por el canal privado `game:<id>` con sólo los campos
-- que cambiaron:
--
--   evento 'partida', contenido { from: <updated_at anterior>, d: { campo: valor, ... } }
--
-- - Un solo aviso por transacción y partida, con el estado final: el trigger
--   se ejecuta al confirmar (deferrable initially deferred) y los siguientes
--   disparos de la misma transacción no mandan nada.
-- - `from` le permite a la mesa saber si el aviso encaja con lo que tiene; si
--   no encaja, relee la partida entera.
-- - Sólo los dos jugadores de la partida pueden escuchar ese canal (política
--   sobre realtime.messages). Nadie puede mandar por él desde el navegador.
-- - Un error al armar o mandar el aviso nunca frena la jugada: se registra
--   como advertencia y la mesa se pone al día con su respaldo por polling.
-- - `games` sigue en la publicación de Realtime: las apps ya instaladas siguen
--   recibiendo la fila entera como hasta hoy. Sólo se ahorra con la mesa nueva.
-- - Limpieza cada hora de los avisos ya entregados (tarea de cron).
-- Idempotente.
-- ============================================================

create or replace function public._broadcast_game_diff()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_flag text := 'trucazo.aviso_' || replace(new.id::text, '-', '');
  v_now jsonb;
  v_before jsonb;
  v_diff jsonb;
begin
  if coalesce(current_setting(v_flag, true), '') = '1' then
    return null;
  end if;
  perform set_config(v_flag, '1', true);

  -- El primer disparo trae en OLD la fila de antes de la transacción; la
  -- fila de la tabla ya es la final.
  select to_jsonb(g) into v_now from public.games g where g.id = new.id;
  if v_now is null then
    return null;
  end if;
  v_before := to_jsonb(old);
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_diff
    from jsonb_each(v_now) as e
   where e.value is distinct from v_before -> e.key;
  if v_diff = '{}'::jsonb then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object('from', old.updated_at, 'd', v_diff),
    'partida',
    'game:' || new.id::text,
    true
  );
  return null;
exception when others then
  raise warning 'aviso de partida %: %', new.id, sqlerrm;
  return null;
end;
$$;

revoke execute on function public._broadcast_game_diff() from public, anon, authenticated;

drop trigger if exists trg_broadcast_game_diff on public.games;
create constraint trigger trg_broadcast_game_diff
  after update on public.games
  deferrable initially deferred
  for each row execute function public._broadcast_game_diff();

-- Realtime toma cada aviso del registro de cambios (WAL) apenas se guarda; la
-- fila en realtime.messages no se vuelve a leer, pero Supabase la conserva 3
-- días (~20 MB por día a este ritmo). Se borran los avisos de partida de más
-- de una hora.
select cron.schedule('trucazo-aviso-partida-cleanup', '17 * * * *',
  $$delete from realtime.messages where topic like 'game:%' and inserted_at < now() - interval '1 hour'$$);

-- Quién puede escuchar el canal privado de una partida: sus dos jugadores.
-- (En una base local sin Realtime la tabla no existe y no hay nada que proteger.)
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "Jugadores escuchan su partida" on realtime.messages';
    execute $p$
      create policy "Jugadores escuchan su partida"
      on realtime.messages for select to authenticated
      using (
        realtime.messages.extension = 'broadcast'
        and exists (
          select 1 from public.games g
           -- El case evita convertir a uuid un canal con otro nombre.
           where g.id = case
                   when realtime.topic() ~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                   then substring(realtime.topic() from 6)::uuid
                 end
             and (select auth.uid()) in (g.player1_id, g.player2_id)
        )
      )
    $p$;
  end if;
end $$;
