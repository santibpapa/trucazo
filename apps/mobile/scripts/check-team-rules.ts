import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { teamFixture } from './team-fixture'
import { ids } from './online-fixture'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
async function main() {
const f = await teamFixture()
try {
  // La suite existente incluye las cinco composiciones, 15/30, pardas,
  // declaraciones, permisos, pagos únicos, tiempos, presencia y pedidos al bot.
  await f.db.exec(await readFile('supabase/tests/team_games.sql','utf8'))
  await f.db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'a@fixture.invalid','{"username":"Cuenta A"}'),($2,'b@fixture.invalid','{"username":"Cuenta B"}')`,[ids.A,ids.B])
  let s = await f.rpc('team_create',{p_request_id:crypto.randomUUID(),p_name:'Chat Android 09',p_bet:10,p_target_score:15,p_time_limit:30,p_is_private:false},ids.A)
  const action = async (action: string, seat?: number) => { s=await f.rpc('team_action',{p_table_id:s.table.id,p_request_id:crypto.randomUUID(),p_version:s.table.version,p_action:action,p_seat:seat??null},ids.A) }
  await action('seat',0)
  for (const seat of [1,2,3]) await action('add_bot',seat)
  await action('start')
  const request=crypto.randomUUID(), body={p_mode:'team',p_match_id:s.table.id,p_body:'Prueba Android 09',p_request_id:request}
  const message=await f.rpc('send_match_chat_message',body,ids.A)
  assert.equal((await f.rpc('send_match_chat_message',body,ids.A)).id,message.id)
  await assert.rejects(()=>f.rpc('send_match_chat_message',{...body,p_request_id:crypto.randomUUID()},ids.B),/no disponible/)
  const after=await f.rpc('team_snapshot',{p_table_id:s.table.id},ids.A)
  assert.equal(after.table.version,s.table.version)
  assert.equal(after.game.action_started_at,s.game.action_started_at)
  await writeFile('android/generated/android-09-rules.json',JSON.stringify({scope:'SQL vigente en PGlite; Auth/cron simulados; no certifica concurrencia remota',existingTeamSuite:'passed',writtenChat:{singleReceipt:true,outsiderBlocked:true,clockAndVersionUnchanged:true}},null,2))
  console.log('OK suite SQL de parejas completa y chat escrito: permisos, reintento único y reloj conservado.')
} finally { await f.db.close() }
}
void main().catch(error=>{console.error(error.message);process.exitCode=1})
