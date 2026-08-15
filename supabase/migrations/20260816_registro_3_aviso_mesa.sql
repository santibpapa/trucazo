-- ============================================================
-- TRUCAZO — Registro (3 de 3): que el aviso de mesa nueva no se pueda inventar
-- Fecha: 2026-08-16
--
-- CÓMO ESTABA: el navegador le mandaba al servidor el nombre de la mesa, la
-- apuesta, quién la abrió y a cuántos puntos, y el servidor reenviaba ESO tal
-- cual por Telegram. Cualquiera con sesión podía escribir el texto que quisiera
-- —incluso haciéndose pasar por otro jugador— y repetir la llamada todas las
-- veces que quisiera. No es peligroso para los jugadores (el mensaje le llega
-- solo al dueño), pero es un canal de spam gratis.
--
-- CÓMO QUEDA: el navegador manda SOLO el id de la mesa. Esta función es la que
-- decide si corresponde avisar, y devuelve el texto ya armado con datos de la
-- base. Además marca la mesa como "ya avisada" en el mismo movimiento, así por
-- más que se llame diez veces sale un solo mensaje.
--
-- Idempotente.
-- ============================================================

begin;

-- Marca de "ya se avisó por esta mesa". Va en la propia fila de la mesa para que
-- reclamar el aviso y marcarlo sea UNA sola operación, sin carreras posibles.
alter table public.tables add column if not exists notified_at timestamptz;

-- Devuelve los datos del aviso la PRIMERA vez que se la llama para una mesa, y
-- null todas las siguientes. Solo el creador, solo mesas públicas que están
-- esperando rival, y solo si es reciente.
create or replace function public.claim_table_notification(p_table_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare t tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  -- El update es el que "gana la carrera": si dos llamadas entran juntas, solo
  -- una encuentra notified_at en null y se lleva la fila.
  update tables
     set notified_at = now()
   where id = p_table_id
     and creator_id = auth.uid()
     and not is_private
     and status = 'waiting'
     and opponent_id is null
     and notified_at is null
     and created_at > now() - interval '5 minutes'
   returning * into t;

  if not found then return null; end if;

  return jsonb_build_object(
    'name',         t.name,
    'creator',      t.creator_username,
    'bet',          t.bet,
    'target_score', t.target_score
  );
end;
$function$;

grant execute on function public.claim_table_notification(uuid) to authenticated;

commit;
