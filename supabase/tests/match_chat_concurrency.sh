#!/usr/bin/env bash
# Dos conexiones del mismo autor no pueden saltar el intervalo de 3 segundos.
set -euo pipefail
PSQL=(psql -v ON_ERROR_STOP=1 --quiet --no-psqlrc)
AUTHOR='c2000000-0000-4000-a000-000000000001'
RIVAL='c2000000-0000-4000-a000-000000000002'
GAME='c2100000-0000-4000-a000-000000000001'
out1="$(mktemp)"
out2="$(mktemp)"
cleanup() {
  "${PSQL[@]}" -c "delete from public.tables where id='$GAME'; delete from auth.users where id in ('$AUTHOR','$RIVAL');" >/dev/null 2>&1 || true
  rm -f "$out1" "$out2"
}
trap cleanup EXIT
cleanup
"${PSQL[@]}" <<SQL
insert into auth.users(id,email,is_anonymous,raw_user_meta_data) values
  ('$AUTHOR','chat-concurrent-a@test.invalid',false,'{"username":"A"}'),
  ('$RIVAL','chat-concurrent-b@test.invalid',false,'{"username":"B"}');
insert into public.profiles(id,username) values ('$AUTHOR','A'),('$RIVAL','B')
  on conflict (id) do update set username=excluded.username;
insert into public.tables(id,name,creator_id,creator_username,opponent_id,opponent_username,bet,is_private,status,target_score,time_limit)
  values('$GAME','Chat concurrente','$AUTHOR','A','$RIVAL','B',100,false,'playing',15,30);
insert into public.games(id,player1_id,player2_id,player1_username,player2_username,current_turn,mano_player,bet)
  values('$GAME','$AUTHOR','$RIVAL','A','B','$AUTHOR','$AUTHOR',100);
SQL
send() {
  local body="$1" request="$2"
  "${PSQL[@]}" -c "select set_config('request.jwt.claim.sub','$AUTHOR',false); set role authenticated;
    select id from public.send_match_chat_message('game','$GAME','$body','$request');" >/dev/null
}
set +e
send 'simultáneo uno' 'c2200000-0000-4000-a000-000000000001' >"$out1" 2>&1 & pid1=$!
send 'simultáneo dos' 'c2200000-0000-4000-a000-000000000002' >"$out2" 2>&1 & pid2=$!
wait "$pid1"; code1=$?
wait "$pid2"; code2=$?
set -e
if [ "$(( (code1 == 0) + (code2 == 0) ))" -ne 1 ]; then
  echo 'ERROR: se esperaban un envío aceptado y otro rechazado' >&2
  cat "$out1" "$out2" >&2
  exit 1
fi
count="$("${PSQL[@]}" --tuples-only --no-align -c "select count(*) from public.match_chat_messages where game_id='$GAME'")"
if [ "$count" != 1 ]; then echo "ERROR: $count mensajes tras dos envíos simultáneos" >&2; exit 1; fi
echo 'Chat concurrente: un solo envío aceptado.'
