-- Solo contra una base local reconstruida. Prueba seguridad, restricciones e
-- idempotencia del contrato de torneos y revierte todos sus datos al terminar.

\set ON_ERROR_STOP on
\pset footer off

begin;

insert into auth.users(
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000001','authenticated','authenticated','admin-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000002','authenticated','authenticated','capitan-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000003','authenticated','authenticated','pareja-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000004','authenticated','authenticated','jugador-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000005','authenticated','authenticated','invitado-torneos@trucazo.com.ar',now(),'{}','{}',true,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000006','authenticated','authenticated','bot-torneos@trucazo.bot',now(),'{"provider":"bot"}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000007','authenticated','authenticated','bloqueado@sample.test',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000008','authenticated','authenticated','reinvitado-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','aa100000-0000-4000-a000-000000000009','authenticated','authenticated','espera-torneos@trucazo.com.ar',now(),'{}','{}',false,now(),now())
on conflict (id) do update set
  email = excluded.email,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  is_anonymous = excluded.is_anonymous,
  updated_at = now();

insert into public.profiles(id, username, is_admin, is_bot) values
  ('aa100000-0000-4000-a000-000000000001','AdminTorneos',true,false),
  ('aa100000-0000-4000-a000-000000000002','CapitanTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000003','ParejaTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000004','JugadorTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000005','InvitadoTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000006','BotTorneos',false,true),
  ('aa100000-0000-4000-a000-000000000007','CuentaPruebaTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000008','ReinvitadoTorneos',false,false),
  ('aa100000-0000-4000-a000-000000000009','EsperaTorneos',false,false)
on conflict (id) do update set
  username = excluded.username,
  is_admin = excluded.is_admin,
  is_bot = excluded.is_bot;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000001',false);

-- Conservamos el identificador en una variable de sesion para que cada cambio
-- de rol use el mismo torneo sin depender de una tabla auxiliar.
select set_config(
  'trucazo.test_team_tournament',
  public.tournament_admin_create(
    'aa110000-0000-4000-a000-000000000001',
    'Parejas de prueba',
    'Contrato 2v2 del PR 1',
    '2v2', 'knockout', 8, 30, 300, 200, 100,
    now() + interval '40 minutes', true
  )->>'id',
  false
);

-- La misma solicitud de alta devuelve el mismo torneo y no crea otro.
do $$
declare
  v_first uuid := current_setting('trucazo.test_team_tournament')::uuid;
  v_repeated uuid;
begin
  v_repeated := (public.tournament_admin_create(
    'aa110000-0000-4000-a000-000000000001',
    'Parejas de prueba',
    'Contrato 2v2 del PR 1',
    '2v2', 'knockout', 8, 30, 300, 200, 100,
    (select starts_at from public.tournaments where id = v_first), true
  )->>'id')::uuid;
  if v_repeated <> v_first or (select count(*) from public.tournaments where name = 'Parejas de prueba') <> 1 then
    raise exception 'admin_create no fue idempotente';
  end if;
end $$;

-- Restricciones y permisos que no dependen de la interfaz.
do $$
declare
  v_team uuid := current_setting('trucazo.test_team_tournament')::uuid;
  v_rls_count integer;
  v_bad_privileges text[];
  fallas text[] := '{}';
begin
  select count(*) into v_rls_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array[
       'tournaments', 'tournament_entries', 'tournament_entry_members',
       'tournament_checkins', 'tournament_groups', 'tournament_group_members',
       'tournament_matches', 'tournament_match_presence', 'tournament_awards',
       'tournament_notifications', 'tournament_email_jobs'
     ])
     and c.relrowsecurity;
  if v_rls_count <> 11 then
    fallas := array_append(fallas, format('RLS activo en %s de 11 tablas', v_rls_count));
  end if;

  select array_agg(tablename order by tablename) into v_bad_privileges
    from pg_tables
   where schemaname = 'public'
     and tablename like 'tournament%'
     and has_table_privilege('authenticated', format('public.%I', tablename), 'SELECT');
  if v_bad_privileges is not null then
    fallas := array_append(fallas, 'authenticated tiene SELECT directo: ' || array_to_string(v_bad_privileges, ', '));
  end if;
  if has_schema_privilege('authenticated', 'tournament_internal', 'USAGE') then
    fallas := array_append(fallas, 'authenticated puede usar tournament_internal');
  end if;
  if has_function_privilege('authenticated', 'tournament_internal.require_admin()', 'EXECUTE') then
    fallas := array_append(fallas, 'authenticated puede ejecutar require_admin');
  end if;

  -- Un jugador comun no puede crear torneos.
  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000004',true);
  begin
    set local role authenticated;
    perform public.tournament_admin_create(
      'aa110000-0000-4000-a000-000000000002', 'Ataque admin', '',
      '1v1', 'knockout', 4, 15, 0, 0, 0, now() + interval '1 day', false
    );
    fallas := array_append(fallas, 'un jugador comun crea torneos');
  exception when others then null;
  end;
  reset role;

  -- Un invitado de Supabase puede leer el torneo, pero no inscribirse.
  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000005',true);
  begin
    set local role authenticated;
    perform public.tournament_detail(v_team);
  exception when others then
    fallas := array_append(fallas, 'un invitado no puede leer el detalle permitido');
  end;
  reset role;
  begin
    set local role authenticated;
    perform public.tournament_register_solo(
      'aa120000-0000-4000-a000-000000000001', v_team
    );
    fallas := array_append(fallas, 'un invitado anonimo se inscribe');
  exception when others then null;
  end;
  reset role;

  -- Bots y direcciones de prueba tampoco participan.
  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000006',true);
  begin
    set local role authenticated;
    perform public.tournament_register_solo(
      'aa120000-0000-4000-a000-000000000002', v_team
    );
    fallas := array_append(fallas, 'un bot se inscribe');
  exception when others then null;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000007',true);
  begin
    set local role authenticated;
    perform public.tournament_register_solo(
      'aa120000-0000-4000-a000-000000000003', v_team
    );
    fallas := array_append(fallas, 'una cuenta de prueba se inscribe');
  exception when others then null;
  end;
  reset role;

  -- Ni siquiera con una sesion valida se escriben tablas directamente.
  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000004',true);
  begin
    set local role authenticated;
    insert into public.tournament_entries(tournament_id,status,kind,created_by)
    values(v_team,'active','solo','aa100000-0000-4000-a000-000000000004');
    fallas := array_append(fallas, 'authenticated escribe tournament_entries directo');
  exception when others then null;
  end;
  reset role;

  -- La combinacion 2v2 directa con cuatro jugadores falla en la base.
  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000001',true);
  begin
    set local role authenticated;
    perform public.tournament_admin_create(
      'aa110000-0000-4000-a000-000000000003', 'Estructura invalida', '',
      '2v2', 'knockout', 4, 30, 0, 0, 0, now() + interval '1 day', false
    );
    fallas := array_append(fallas, 'la base acepta 2v2 directo con cupo 4');
  exception when check_violation then null;
  end;
  reset role;

  if array_length(fallas, 1) > 0 then
    raise exception E'FALLAS DE SEGURIDAD DE TORNEOS:\n  - %', array_to_string(fallas, E'\n  - ');
  end if;
end $$;

-- Invitacion y aceptacion: dos llamados, una sola pareja.
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000002',false);
set local role authenticated;
select public.tournament_invite_partner(
  'aa130000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid,
  'aa100000-0000-4000-a000-000000000003'
);
reset role;

select set_config(
  'trucazo.test_team_invitation',
  (
    select m.id::text
      from public.tournament_entry_members m
     where m.tournament_id = current_setting('trucazo.test_team_tournament')::uuid
       and m.user_id = 'aa100000-0000-4000-a000-000000000003'
       and m.status = 'pending'
  ),
  false
);

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000003',false);
set local role authenticated;
select public.tournament_respond_invitation(
  'aa140000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid,
  current_setting('trucazo.test_team_invitation')::uuid, true
);
select public.tournament_respond_invitation(
  'aa140000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid,
  current_setting('trucazo.test_team_invitation')::uuid, true
);
select public.tournament_respond_invitation(
  'aa140000-0000-4000-a000-000000000002',
  current_setting('trucazo.test_team_tournament')::uuid,
  current_setting('trucazo.test_team_invitation')::uuid, true
);
reset role;

do $$
declare
  v_team uuid := current_setting('trucazo.test_team_tournament')::uuid;
  v_entry uuid;
begin
  select e.id into v_entry
    from public.tournament_entries e
   where e.tournament_id = v_team and e.status = 'active';
  if v_entry is null then raise exception 'la pareja no quedo activa'; end if;
  if (select kind from public.tournament_entries where id = v_entry) <> 'team' then
    raise exception 'la entrada aceptada no quedo como equipo';
  end if;
  if (select count(*) from public.tournament_entry_members where entry_id = v_entry and status = 'accepted') <> 2 then
    raise exception 'aceptar dos veces duplico o perdio integrantes';
  end if;
  if (select count(*) from public.tournament_entries where tournament_id = v_team) <> 1 then
    raise exception 'aceptar dos veces duplico la inscripcion';
  end if;
end $$;

-- Rechazar y volver a invitar conserva dos intentos distintos. Una pantalla
-- vieja no puede aceptar el intento nuevo usando el identificador anterior.
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000004',false);
set local role authenticated;
select public.tournament_invite_partner(
  'aa130000-0000-4000-a000-000000000002',
  current_setting('trucazo.test_team_tournament')::uuid,
  'aa100000-0000-4000-a000-000000000008'
);
reset role;

select set_config(
  'trucazo.test_first_rejected_invitation',
  (
    select m.id::text
      from public.tournament_entry_members m
     where m.tournament_id = current_setting('trucazo.test_team_tournament')::uuid
       and m.user_id = 'aa100000-0000-4000-a000-000000000008'
       and m.status = 'pending'
  ),
  false
);

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000008',false);
set local role authenticated;
select public.tournament_respond_invitation(
  'aa140000-0000-4000-a000-000000000003',
  current_setting('trucazo.test_team_tournament')::uuid,
  current_setting('trucazo.test_first_rejected_invitation')::uuid, false
);
reset role;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000004',false);
set local role authenticated;
select public.tournament_invite_partner(
  'aa130000-0000-4000-a000-000000000003',
  current_setting('trucazo.test_team_tournament')::uuid,
  'aa100000-0000-4000-a000-000000000008'
);
reset role;

select set_config(
  'trucazo.test_second_invitation',
  (
    select m.id::text
      from public.tournament_entry_members m
     where m.tournament_id = current_setting('trucazo.test_team_tournament')::uuid
       and m.user_id = 'aa100000-0000-4000-a000-000000000008'
       and m.status = 'pending'
  ),
  false
);

do $$
declare
  v_stale_rejected boolean := false;
  v_stale_error text;
begin
  if current_setting('trucazo.test_first_rejected_invitation') =
     current_setting('trucazo.test_second_invitation') then
    raise exception 'la reinvitacion reutilizo el identificador anterior';
  end if;

  perform set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000008',true);
  begin
    set local role authenticated;
    perform public.tournament_respond_invitation(
      'aa140000-0000-4000-a000-000000000004',
      current_setting('trucazo.test_team_tournament')::uuid,
      current_setting('trucazo.test_first_rejected_invitation')::uuid,
      true
    );
  exception when others then
    v_stale_rejected := true;
    v_stale_error := sqlerrm;
  end;
  reset role;

  if not v_stale_rejected then
    raise exception 'una pantalla vieja acepto una invitacion diferente';
  end if;
  if v_stale_error <> 'No hay una invitacion pendiente' then
    raise exception 'la invitacion vieja fallo por una causa inesperada: %', v_stale_error;
  end if;
  if not exists (
    select 1 from public.tournament_entry_members
     where id = current_setting('trucazo.test_second_invitation')::uuid
       and status = 'pending'
  ) then
    raise exception 'el intento viejo modifico la invitacion vigente';
  end if;
end $$;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000008',false);
set local role authenticated;
select public.tournament_respond_invitation(
  'aa140000-0000-4000-a000-000000000005',
  current_setting('trucazo.test_team_tournament')::uuid,
  current_setting('trucazo.test_second_invitation')::uuid, true
);
reset role;

do $$
begin
  if (
    select count(*)
      from public.tournament_entry_members
     where tournament_id = current_setting('trucazo.test_team_tournament')::uuid
       and user_id = 'aa100000-0000-4000-a000-000000000008'
       and status in ('rejected', 'accepted')
  ) <> 2 then
    raise exception 'la reinvitacion no conservo ambos intentos';
  end if;
end $$;

-- Abrimos el check-in reprogramando. Cualquiera de los dos confirma al equipo y
-- repetirlo, incluso con otro request_id, deja una sola fila.
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000001',false);
set local role authenticated;
select public.tournament_admin_reschedule(
  'aa150000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid,
  now() + interval '20 minutes'
);
reset role;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000003',false);
set local role authenticated;
select public.tournament_check_in(
  'aa160000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid
);
select public.tournament_check_in(
  'aa160000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_team_tournament')::uuid
);
select public.tournament_check_in(
  'aa160000-0000-4000-a000-000000000002',
  current_setting('trucazo.test_team_tournament')::uuid
);
reset role;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000002',false);
set local role authenticated;
select public.tournament_check_in(
  'aa160000-0000-4000-a000-000000000003',
  current_setting('trucazo.test_team_tournament')::uuid
);
reset role;

do $$
declare
  v_team uuid := current_setting('trucazo.test_team_tournament')::uuid;
  v_entry uuid := (
    select e.id
      from public.tournament_entries e
      join public.tournament_entry_members m on m.entry_id = e.id
     where e.tournament_id = v_team
       and m.user_id = 'aa100000-0000-4000-a000-000000000003'
       and m.status = 'accepted'
     limit 1
  );
begin
  if (select count(*) from public.tournament_checkins where entry_id = v_entry) <> 1 then
    raise exception 'el check-in repetido genero mas de una fila';
  end if;
  if (select confirmed_by from public.tournament_checkins where entry_id = v_entry)
     <> 'aa100000-0000-4000-a000-000000000003'::uuid then
    raise exception 'el segundo integrante sobreescribio quien confirmo primero';
  end if;
  if (select count(*) from tournament_internal.audit_log where entry_id = v_entry and action = 'entry_checked_in') <> 1 then
    raise exception 'el check-in repetido duplico la auditoria';
  end if;
end $$;

-- Reprogramar invalida toda confirmacion de presencia anterior.
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000001',false);
set local role authenticated;
select public.tournament_admin_reschedule(
  'aa150000-0000-4000-a000-000000000002',
  current_setting('trucazo.test_team_tournament')::uuid,
  now() + interval '1 week'
);
reset role;

do $$
begin
  if exists (
    select 1 from public.tournament_checkins
     where tournament_id = current_setting('trucazo.test_team_tournament')::uuid
  ) then
    raise exception 'reprogramar conservo un check-in viejo';
  end if;
  if not exists (
    select 1
      from tournament_internal.audit_log
     where tournament_id = current_setting('trucazo.test_team_tournament')::uuid
       and action = 'tournament_rescheduled'
       and details->>'checkins_cleared' = '1'
  ) then
    raise exception 'reprogramar no audito el check-in invalidado';
  end if;
end $$;

-- Un retiro promociona primero a la inscripcion mas antigua en espera. Quien
-- vuelve a anotarse despues no puede ocupar ese lugar libre.
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000001',false);
select set_config(
  'trucazo.test_waitlist_tournament',
  public.tournament_admin_create(
    'aa170000-0000-4000-a000-000000000001',
    'Espera de prueba',
    'Prioridad de la lista de espera',
    '1v1', 'knockout', 4, 15, 0, 0, 0,
    now() + interval '2 hours', true
  )->>'id',
  false
);

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000002',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000003',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000002',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000004',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000003',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000008',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000004',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;
select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000009',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000005',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;

do $$
begin
  if not exists (
    select 1
      from public.tournament_entries e
      join public.tournament_entry_members m on m.entry_id = e.id
     where e.tournament_id = current_setting('trucazo.test_waitlist_tournament')::uuid
       and e.status = 'waitlisted'
       and m.user_id = 'aa100000-0000-4000-a000-000000000009'
       and m.status = 'accepted'
  ) then
    raise exception 'el quinto jugador no quedo en espera';
  end if;
end $$;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000003',false);
set local role authenticated;
select public.tournament_withdraw(
  'aa172000-0000-4000-a000-000000000001',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;

select set_config('request.jwt.claim.sub','aa100000-0000-4000-a000-000000000003',false);
set local role authenticated;
select public.tournament_register_solo(
  'aa171000-0000-4000-a000-000000000006',
  current_setting('trucazo.test_waitlist_tournament')::uuid
);
reset role;

do $$
declare
  v_tournament uuid := current_setting('trucazo.test_waitlist_tournament')::uuid;
  v_promoted_entry uuid;
begin
  select e.id into v_promoted_entry
    from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id
   where e.tournament_id = v_tournament
     and e.status = 'active'
     and m.user_id = 'aa100000-0000-4000-a000-000000000009'
     and m.status = 'accepted';
  if v_promoted_entry is null then
    raise exception 'el primero en espera no fue promocionado';
  end if;
  if tournament_internal.active_player_count(v_tournament, null) <> 4 then
    raise exception 'la promocion altero el cupo activo';
  end if;
  if not exists (
    select 1
      from public.tournament_entries e
      join public.tournament_entry_members m on m.entry_id = e.id
     where e.tournament_id = v_tournament
       and e.status = 'waitlisted'
       and m.user_id = 'aa100000-0000-4000-a000-000000000003'
       and m.status = 'accepted'
  ) then
    raise exception 'la inscripcion nueva salto la lista de espera';
  end if;
  if (
    select count(*) from tournament_internal.audit_log
     where tournament_id = v_tournament
       and entry_id = v_promoted_entry
       and action = 'entry_promoted_from_waitlist'
  ) <> 1 then
    raise exception 'la promocion no quedo auditada exactamente una vez';
  end if;
end $$;

rollback;

\echo ''
\echo '  =================================================='
\echo '   TORNEOS SEGUROS E IDEMPOTENTES — la prueba paso'
\echo '  =================================================='
