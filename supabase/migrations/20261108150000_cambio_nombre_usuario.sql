-- ============================================================
-- TRUCAZO — Cambio de nombre de usuario desde el perfil
-- Fecha: 2026-11-08 · Ver docs/operacion.md → cambio-nombre-usuario
--
-- Decisión del dueño (08/11/2026): cada jugador puede cambiarse el nombre
-- UNA sola vez, gratis, y el nombre viejo queda libre enseguida. Un segundo
-- cambio se pide por correo a hola@trucazo.com.ar; soporte lo habilita
-- poniendo username_changed_at en null.
--
-- El nombre está copiado en varias tablas (chat, mesas, partidas, historial
-- del rival, invitaciones, asientos 2vs2, novedades): se actualiza en todas,
-- igual que hace la moderación al anonimizar un perfil.
-- No se toca tournament_matches: guarda a propósito el nombre que tenía cada
-- lado cuando se jugó el cruce (historial de nombres de torneos).
--
-- Mientras haya una partida 1v1 en juego se rechaza el cambio: actualizar esa
-- fila de games reinicia el reloj del turno (_touch_turn_start).
--
-- Agrega una columna y una función; no cambia nada existente, así que sirve
-- para todas las versiones de la app instaladas.
-- ============================================================

alter table public.profiles add column if not exists username_changed_at timestamptz;

create or replace function public.change_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_username, ''));
  me public.profiles;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then
    raise exception 'Entrá con una cuenta registrada para cambiar tu nombre';
  end if;
  if char_length(v_name) not between 3 and 20 then
    raise exception 'El nombre tiene que tener entre 3 y 20 caracteres';
  end if;
  if public._chat_censor(v_name) <> v_name then
    raise exception 'Ese nombre no está permitido';
  end if;

  select * into me from public.profiles where id = uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if me.username_changed_at is not null then
    raise exception 'Ya cambiaste tu nombre una vez. Para otro cambio, escribinos a hola@trucazo.com.ar';
  end if;
  if v_name = me.username then
    raise exception 'Ese ya es tu nombre';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_name) and id <> uid) then
    raise exception 'Ese nombre de usuario ya está en uso';
  end if;
  if exists (select 1 from public.games where status = 'playing' and uid in (player1_id, player2_id)) then
    raise exception 'Terminá tu partida antes de cambiar el nombre';
  end if;

  begin
    update public.profiles set username = v_name, username_changed_at = now() where id = uid;
  exception when unique_violation then
    raise exception 'Ese nombre de usuario ya está en uso';
  end;

  update public.chat_messages set username = v_name where user_id = uid;
  update public.match_chat_messages set sender_name = v_name where sender_id = uid;
  update public.tables set name = 'Mesa de ' || v_name where creator_id = uid and name = 'Mesa de ' || me.username;
  update public.tables set creator_username = v_name where creator_id = uid;
  update public.tables set opponent_username = v_name where opponent_id = uid;
  update public.games set player1_username = v_name where player1_id = uid;
  update public.games set player2_username = v_name where player2_id = uid;
  update public.game_history set opponent_username = v_name where opponent_id = uid;
  update public.game_invites set from_username = v_name where from_id = uid;
  update public.team_seats set username = v_name where user_id = uid;
  update public.news set author_username = v_name where author_id = uid;

  return v_name;
end;
$function$;

revoke all on function public.change_username(text) from public, anon;
grant execute on function public.change_username(text) to authenticated;
