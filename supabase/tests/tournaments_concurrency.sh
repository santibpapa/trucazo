#!/usr/bin/env bash
# Dos conexiones compiten por el ultimo lugar de un torneo 1v1. Las dos RPC
# deben terminar bien: una activa y la otra en espera, nunca cinco activas.
set -euo pipefail

PSQL=(psql -v ON_ERROR_STOP=1 --quiet --no-psqlrc)
TOURNAMENT_ID='aa200000-0000-4000-a000-000000000001'
ADMIN_ID='aa200000-0000-4000-a000-000000000002'
P1='aa200000-0000-4000-a000-000000000011'
P2='aa200000-0000-4000-a000-000000000012'
P3='aa200000-0000-4000-a000-000000000013'
P4='aa200000-0000-4000-a000-000000000014'
P5='aa200000-0000-4000-a000-000000000015'
P6='aa200000-0000-4000-a000-000000000016'

cleanup() {
  "${PSQL[@]}" -c "
    delete from public.tournaments where id = '$TOURNAMENT_ID';
    delete from auth.users where id = any(array[
      '$ADMIN_ID'::uuid, '$P1'::uuid, '$P2'::uuid, '$P3'::uuid,
      '$P4'::uuid, '$P5'::uuid, '$P6'::uuid
    ]);
  " >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

"${PSQL[@]}" <<SQL
insert into auth.users(
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','$ADMIN_ID','authenticated','authenticated','admin-carrera@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P1','authenticated','authenticated','carrera-1@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P2','authenticated','authenticated','carrera-2@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P3','authenticated','authenticated','carrera-3@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P4','authenticated','authenticated','carrera-4@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P5','authenticated','authenticated','carrera-5@trucazo.com.ar',now(),'{}','{}',false,now(),now()),
  ('00000000-0000-0000-0000-000000000000','$P6','authenticated','authenticated','carrera-6@trucazo.com.ar',now(),'{}','{}',false,now(),now());

insert into public.profiles(id, username, is_admin) values
  ('$ADMIN_ID','AdminCarreraTorneo',true),
  ('$P1','CarreraTorneo1',false),
  ('$P2','CarreraTorneo2',false),
  ('$P3','CarreraTorneo3',false),
  ('$P4','CarreraTorneo4',false),
  ('$P5','CarreraTorneo5',false),
  ('$P6','CarreraTorneo6',false)
on conflict (id) do update set username = excluded.username, is_admin = excluded.is_admin;

insert into public.tournaments(
  id, name, description, mode, format, capacity, target_score,
  starts_at, status, published_at, created_by, updated_by
) values (
  '$TOURNAMENT_ID', 'Carrera por el ultimo cupo', '',
  '1v1', 'knockout', 4, 15, now() + interval '1 day',
  'published', now(), '$ADMIN_ID', '$ADMIN_ID'
);
SQL

register_player() {
  local user_id="$1"
  local request_id="$2"
  "${PSQL[@]}" -c "
    select set_config('request.jwt.claim.sub', '$user_id', false);
    set role authenticated;
    select public.tournament_register_solo('$request_id', '$TOURNAMENT_ID');
  " >/dev/null
}

withdraw_player() {
  local user_id="$1"
  local request_id="$2"
  "${PSQL[@]}" -c "
    select set_config('request.jwt.claim.sub', '$user_id', false);
    set role authenticated;
    select public.tournament_withdraw('$request_id', '$TOURNAMENT_ID');
  " >/dev/null
}

register_player "$P1" 'aa210000-0000-4000-a000-000000000001'
register_player "$P2" 'aa210000-0000-4000-a000-000000000002'
register_player "$P3" 'aa210000-0000-4000-a000-000000000003'

register_player "$P4" 'aa210000-0000-4000-a000-000000000004' &
PID_4=$!
register_player "$P5" 'aa210000-0000-4000-a000-000000000005' &
PID_5=$!
wait "$PID_4"
wait "$PID_5"

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_active integer;
  v_waitlisted integer;
  v_members integer;
begin
  select count(*) into v_active
    from public.tournament_entry_members m
    join public.tournament_entries e on e.id = m.entry_id
   where e.tournament_id = '$TOURNAMENT_ID'
     and e.status = 'active'
     and m.status = 'accepted';
  select count(*) into v_waitlisted
    from public.tournament_entry_members m
    join public.tournament_entries e on e.id = m.entry_id
   where e.tournament_id = '$TOURNAMENT_ID'
     and e.status = 'waitlisted'
     and m.status = 'accepted';
  select count(*) into v_members
    from public.tournament_entry_members
   where tournament_id = '$TOURNAMENT_ID' and status = 'accepted';

  if v_active <> 4 or v_waitlisted <> 1 or v_members <> 5 then
    raise exception 'carrera incorrecta: activos %, espera %, miembros %',
      v_active, v_waitlisted, v_members;
  end if;
end
\$\$;
SQL

# Aunque un retiro y una inscripcion nueva lleguen juntos, la persona que ya
# esperaba recibe el lugar. El recien llegado queda detras.
withdraw_player "$P1" 'aa220000-0000-4000-a000-000000000001' &
PID_WITHDRAW=$!
register_player "$P6" 'aa210000-0000-4000-a000-000000000006' &
PID_6=$!
wait "$PID_WITHDRAW"
wait "$PID_6"

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_active integer;
  v_waitlisted integer;
begin
  select count(*) into v_active
    from public.tournament_entry_members m
    join public.tournament_entries e on e.id = m.entry_id
   where e.tournament_id = '$TOURNAMENT_ID'
     and e.status = 'active'
     and m.status = 'accepted';
  select count(*) into v_waitlisted
    from public.tournament_entry_members m
    join public.tournament_entries e on e.id = m.entry_id
   where e.tournament_id = '$TOURNAMENT_ID'
     and e.status = 'waitlisted'
     and m.status = 'accepted';

  if v_active <> 4 or v_waitlisted <> 1 then
    raise exception 'retiro concurrente incorrecto: activos %, espera %',
      v_active, v_waitlisted;
  end if;
  if not exists (
    select 1
      from public.tournament_entry_members m
      join public.tournament_entries e on e.id = m.entry_id
     where e.tournament_id = '$TOURNAMENT_ID'
       and e.status = 'active'
       and m.status = 'accepted'
       and m.user_id = '$P4'
  ) or not exists (
    select 1
      from public.tournament_entry_members m
      join public.tournament_entries e on e.id = m.entry_id
     where e.tournament_id = '$TOURNAMENT_ID'
       and e.status = 'active'
       and m.status = 'accepted'
       and m.user_id = '$P5'
  ) then
    raise exception 'la inscripcion que ya esperaba no fue promocionada';
  end if;
  if not exists (
    select 1
      from public.tournament_entry_members m
      join public.tournament_entries e on e.id = m.entry_id
     where e.tournament_id = '$TOURNAMENT_ID'
       and e.status = 'waitlisted'
       and m.status = 'accepted'
       and m.user_id = '$P6'
  ) then
    raise exception 'la inscripcion nueva salto la espera durante el retiro';
  end if;
end
\$\$;
SQL

echo 'Ultimo cupo y retiro serializados: la espera conserva prioridad.'
