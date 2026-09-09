#!/usr/bin/env bash
# Solo contra la base descartable de CI. Dos conexiones PostgreSQL independientes.
set -euo pipefail
psql_cmd=(psql -X -q -v ON_ERROR_STOP=1)
fixture=$("${psql_cmd[@]}" -At <<'SQL'
do $$ declare u uuid; i integer; begin
  for i in 1..4 loop
    u:=('ee220000-0000-4000-a000-00000000000'||i)::uuid;
    insert into auth.users(id,email) values(u,'team-race-'||i||'@test.invalid');
    update public.profiles set coins=100000 where id=u;
  end loop;
end $$;
select set_config('request.jwt.claim.sub','ee220000-0000-4000-a000-000000000001',false) \gset
select (public.team_create(gen_random_uuid(),'Concurrencia',100)->'table'->>'id') as table_id \gset
select set_config('request.jwt.claim.sub','ee220000-0000-4000-a000-000000000002',false) \gset
select public.team_join(gen_random_uuid(),:'table_id') \gset
select set_config('request.jwt.claim.sub','ee220000-0000-4000-a000-000000000003',false) \gset
select public.team_join(gen_random_uuid(),:'table_id') \gset
select set_config('request.jwt.claim.sub','ee220000-0000-4000-a000-000000000004',false) \gset
select public.team_join(gen_random_uuid(),:'table_id') \gset
select :'table_id';
SQL
)
# Barrera real: ambas transacciones esperan la misma fila bloqueada por una tercera.
race() {
  local first="$1" second="$2"
  "${psql_cmd[@]}" -c "begin; select id from team_tables where id='$fixture' for update; select pg_sleep(1); commit;" >/dev/null &
  local barrier=$!
  # La barrera es una ayuda para solapar; las aserciones requieren un solo efecto.
  "${psql_cmd[@]}" -c "$first" >/dev/null & local a=$!
  "${psql_cmd[@]}" -c "$second" >/dev/null & local b=$!
  wait "$a"; wait "$b"; wait "$barrier"
}
request() {
  local user="$1" action="$2" version="$3" seat="${4:-null}" card="${5:-null}"
  echo "begin; set local role authenticated; select set_config('request.jwt.claim.sub','ee220000-0000-4000-a000-00000000000$user',true); select public.team_action('$fixture',gen_random_uuid(),$version,'$action',$seat,$card); commit;"
}
# Dos personas piden el mismo asiento: solo se acepta una versión.
race "$(request 1 seat 4 0)" "$(request 2 seat 4 0)"
"${psql_cmd[@]}" -c "do \$\$ begin if (select count(*) from team_seats where table_id='$fixture' and seat=0)<>1 or (select version from team_tables where id='$fixture')<>5 then raise exception 'doble asiento'; end if; end \$\$;" >/dev/null
# Preparación fija para las carreras de juego (los permisos de asiento se prueban en SQL).
"${psql_cmd[@]}" -c "update team_seats set seat=null where table_id='$fixture'; update team_seats set seat=right(user_id::text,1)::int-1 where table_id='$fixture';" >/dev/null
race "$(request 1 start 5)" "$(request 1 start 5)"
"${psql_cmd[@]}" -c "do \$\$ begin if (select version from team_tables where id='$fixture')<>6 or (select count(*) from team_hands where table_id='$fixture')<>4 then raise exception 'doble reparto'; end if; end \$\$;" >/dev/null
"${psql_cmd[@]}" -c "$(request 1 envido 6)" >/dev/null
race "$(request 2 envido_yes 7)" "$(request 4 envido_no 7)"
"${psql_cmd[@]}" -c "do \$\$ begin if (select version from team_tables where id='$fixture')<>8 or (select envido->>'status' from team_games where id='$fixture') not in ('declaring','rejected') then raise exception 'respuesta contradictoria'; end if; end \$\$;" >/dev/null
race "$(request 1 forfeit 8)" "$(request 3 forfeit 8)"
"${psql_cmd[@]}" -c "do \$\$ begin if (select version from team_tables where id='$fixture')<>9 or (select status from team_tables where id='$fixture')<>'finished' or exists(select 1 from team_seats s join profiles p on p.id=s.user_id where s.table_id='$fixture' and p.coins<>case when seat%2=1 then 100100 else 99900 end) then raise exception 'pago duplicado'; end if; end \$\$;" >/dev/null
printf '%s\n' 'PASS: conexiones concurrentes, asiento, reparto, respuesta y pago únicos'
