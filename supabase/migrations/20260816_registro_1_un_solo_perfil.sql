-- ============================================================
-- TRUCAZO — Registro (1 de 3): un solo responsable de crear el perfil
-- Fecha: 2026-08-16
--
-- EL LÍO DE HOY: el perfil se puede crear desde CUATRO lugares distintos — el
-- trigger `handle_new_user` (que corre solo al nacer el usuario), la pantalla de
-- registro, el botón de invitado y la vuelta de Google. Se pisan entre ellos.
--
-- LO QUE SE VERIFICÓ EN POSTGRES, con el trigger instalado:
--
--   1. EL MODO INVITADO NO FUNCIONA. Un invitado entra sin email y sin nombre,
--      así que el trigger intentaba guardar un nombre NULO y explotaba:
--        "null value in column username violates not-null constraint"
--      Como el trigger corre dentro del alta del usuario, el alta entera falla
--      y el botón muestra "El modo invitado no está disponible por ahora".
--
--   2. AL REGISTRARSE, SALE UN ERROR FALSO. El trigger crea el perfil bien, y
--      enseguida la pantalla de registro intenta crearlo de nuevo. Ese segundo
--      intento choca con el primero (SQLSTATE 23505) y el navegador lo muestra
--      como "Ese nombre de usuario ya está en uso". El usuario se queda trabado
--      creyendo que no se registró... cuando la cuenta YA está creada.
--
-- (Si en tu base el trigger NO estaba puesto, no veías ninguna de las dos: el
-- perfil lo venía creando el navegador. Esta migración deja el trigger puesto y
-- andando, así el comportamiento es el mismo siempre.)
--
-- CÓMO QUEDA: manda el trigger, y nadie más. El trigger ahora:
--   * saca el nombre del registro, o de Google, o del email, y si no hay nada
--     usa "Invitado" (que es el caso del que entra sin cuenta);
--   * si ese nombre está ocupado, le agrega números hasta encontrar uno libre
--     (respetando mayúsculas/minúsculas, como el resto del juego);
--   * nunca hace fallar el alta del usuario: si algo raro pasa, deja pasar y el
--     lobby crea el perfil como red de última instancia.
--
-- Las monedas iniciales las sigue fijando el servidor (`force_profile_defaults`),
-- así el navegador no puede pedir más de las que corresponden.
--
-- ⚠️ ORDEN: correr este SQL ANTES de publicar la web. Con el SQL puesto y la web
-- vieja todavía arriba no se rompe nada (el navegador sigue haciendo su insert
-- de más, que falla como ya venía fallando). Al revés sí habría un rato sin
-- nadie creando perfiles.
--
-- Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. EL TRIGGER QUE CREA EL PERFIL
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_base     text;
  v_name     text;
  v_invitado boolean := false;
  v_intento  int := 0;
begin
  -- ¿De dónde sacamos el nombre? El que eligió al registrarse; si no, la parte
  -- del email antes del arroba (es lo que se venía usando para las cuentas de
  -- Google). El nombre completo de Google NO se usa a propósito: trae espacios
  -- y después hay que poder tipearlo para entrar.
  v_base := nullif(btrim(coalesce(
    new.raw_user_meta_data->>'username',
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  )), '');

  -- Sin nombre ni email: es alguien que entró como invitado.
  if v_base is null then
    v_base     := 'Invitado';
    v_invitado := true;
  end if;
  v_base := left(v_base, 16);

  -- Los invitados llevan número siempre (Invitado4821), como venía siendo. Al
  -- resto solo se le agrega si el nombre ya está ocupado.
  v_name := case when v_invitado
                 then v_base || (1000 + floor(random() * 9000))::int::text
                 else v_base end;

  while exists (select 1 from profiles p where lower(p.username) = lower(v_name)) loop
    v_intento := v_intento + 1;
    exit when v_intento > 25;
    v_name := left(v_base, 12) || (1000 + floor(random() * 9000))::int::text;
  end loop;

  insert into profiles (id, username)
  values (new.id, v_name)
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Pase lo que pase, el alta del usuario NO se cae por culpa del perfil. Si el
  -- perfil no llegó a crearse, el lobby lo crea al entrar (red de seguridad que
  -- ya existía).
  return new;
end;
$function$;

-- ------------------------------------------------------------
-- 2. DEJARLO EFECTIVAMENTE PUESTO
--
-- Hasta ahora este trigger se creaba a mano en el panel, así que no había forma
-- de saber si estaba o no. Acá se deja siempre en el mismo estado: se borran los
-- que apunten a handle_new_user (con el nombre que tengan) y se crea uno solo.
-- ------------------------------------------------------------

do $block$
declare t record;
begin
  for t in
    select tg.tgname
      from pg_trigger tg
      join pg_proc p on p.oid = tg.tgfoid
     where tg.tgrelid = 'auth.users'::regclass
       and not tg.tgisinternal
       and p.proname = 'handle_new_user'
  loop
    execute format('drop trigger if exists %I on auth.users', t.tgname);
  end loop;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when insufficient_privilege then
  raise notice
    'No se pudo crear el trigger sobre auth.users por permisos. Crealo a mano '
    'con: create trigger on_auth_user_created after insert on auth.users '
    'for each row execute function public.handle_new_user();';
end;
$block$;

-- ------------------------------------------------------------
-- 3. LAS MONEDAS INICIALES LAS PONE EL SERVIDOR
--
-- Ya existía; se deja puesto por las dudas, para que el navegador no pueda
-- pedir un perfil con más monedas de las que corresponden.
-- ------------------------------------------------------------

drop trigger if exists trg_force_profile_defaults on public.profiles;
create trigger trg_force_profile_defaults
  before insert on public.profiles
  for each row execute function public.force_profile_defaults();

commit;
