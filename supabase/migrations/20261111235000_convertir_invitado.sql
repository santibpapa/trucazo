-- ============================================================
-- TRUCAZO — El invitado que se registra conserva lo que jugó
-- Fecha: 2026-11-11 · Ver docs/backend.md → convertir-invitado
--
-- Hasta ahora, registrarse siendo invitado creaba un usuario nuevo y el
-- invitado quedaba abandonado con sus monedas, historial y Modo Historia.
-- Desde este cambio la web convierte al invitado en cuenta (Supabase:
-- updateUser con email o linkIdentity con Google). Es el mismo usuario, así
-- que todo lo que cuelga de su id se conserva solo. Esta migración agrega lo
-- que falta en la base.
--
-- Decisiones del dueño (11/11/2026):
--   1. Monedas: si al convertirse tiene menos de 1.000, se completa hasta
--      1.000 (lo que recibe cualquier cuenta nueva). Si tiene más, se respeta.
--   2. Nombre: el invitado se llama Invitado#### (lo pone handle_new_user);
--      al convertirse elige su nombre, y esa elección NO gasta el cambio de
--      nombre gratis de change_username.
--
-- Piezas:
--   - profiles.guest_name_pending: true mientras el invitado convertido
--     todavía no eligió nombre. La web lo usa para pedírselo en el lobby.
--   - Trigger en auth.users: cuando is_anonymous pasa de true a false, completa
--     las monedas y marca el nombre pendiente si sigue siendo Invitado####.
--     Los invitados que eligieron nombre al entrar por un enlace de mesa lo
--     conservan y no quedan pendientes.
--   - choose_guest_account_name: elegir el nombre una vez, con las mismas
--     reglas que change_username, y copiarlo en las mismas tablas.
--
-- Sólo agrega una columna, un trigger y una función: no cambia nada que use
-- la app instalada.
-- ============================================================

alter table public.profiles
  add column if not exists guest_name_pending boolean not null default false;

create or replace function public._guest_converted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.profiles
     set coins = greatest(coins, 1000),
         guest_name_pending = username ~ '^Invitado[0-9]+$'
   where id = new.id;
  return new;
exception when others then
  -- Igual que handle_new_user: pase lo que pase, la conversión de la cuenta
  -- no se cae por culpa del perfil. Sin el regalo, la cuenta sigue andando.
  raise warning '_guest_converted(%): %', new.id, sqlerrm;
  return new;
end;
$function$;

revoke all on function public._guest_converted() from public, anon, authenticated;

drop trigger if exists on_guest_converted on auth.users;
create trigger on_guest_converted
  after update of is_anonymous on auth.users
  for each row
  when (old.is_anonymous is true and new.is_anonymous is false)
  execute function public._guest_converted();

create or replace function public.choose_guest_account_name(p_username text)
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
  -- Se mira la tabla y no el token: justo después de convertirse, el token
  -- viejo todavía puede decir que es invitado.
  if uid is null or not exists (
    select 1 from auth.users where id = uid and is_anonymous is false
  ) then
    raise exception 'Entrá con una cuenta registrada para elegir tu nombre';
  end if;
  if char_length(v_name) not between 3 and 20 then
    raise exception 'El nombre tiene que tener entre 3 y 20 caracteres';
  end if;
  if public._chat_censor(v_name) <> v_name then
    raise exception 'Ese nombre no está permitido';
  end if;

  select * into me from public.profiles where id = uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if not me.guest_name_pending then
    raise exception 'Ya elegiste tu nombre. Podés cambiarlo una vez desde tu perfil';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_name) and id <> uid) then
    raise exception 'Ese nombre de usuario ya está en uso';
  end if;
  if v_name <> me.username and exists (
    select 1 from public.games where status = 'playing' and uid in (player1_id, player2_id)
  ) then
    raise exception 'Terminá tu partida antes de elegir el nombre';
  end if;

  if v_name = me.username then
    update public.profiles set guest_name_pending = false where id = uid;
    return v_name;
  end if;

  begin
    update public.profiles set username = v_name, guest_name_pending = false where id = uid;
  exception when unique_violation then
    raise exception 'Ese nombre de usuario ya está en uso';
  end;

  -- Misma lista que change_username (20261108150000): el nombre está copiado
  -- en estas tablas. Si se agrega una, sumarla en las dos funciones.
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

revoke all on function public.choose_guest_account_name(text) from public, anon;
grant execute on function public.choose_guest_account_name(text) to authenticated;
