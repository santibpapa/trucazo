import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { tournamentFixture } from './tournament-fixture'
import { communityFixture } from './community-fixture'
import { ids } from './online-fixture'
import { pathToFileURL } from 'node:url'

export const pushMigration = '20261015231009_native_push_notifications.sql'
export async function pushFixture() {
  const f = await communityFixture(await tournamentFixture()), { db } = f
  await db.exec(`create schema storage; create table storage.objects(bucket_id text,name text);
    insert into auth.users(id,is_anonymous,raw_app_meta_data) values
    ('${ids.A}',false,'{"qa_purpose":"android-app-acceptance"}'),('${ids.B}',false,'{"qa_purpose":"android-app-acceptance"}');`)
  await db.exec(await readFile('supabase/migrations/20261015145540_community_safety.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/' + pushMigration, 'utf8'))
  const rpc = async (name: string, args: unknown[] = [], owner = ids.A) => f.asUser(owner, async () =>
    (await db.query<{ value: any }>(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) value`, args)).rows[0].value)
  return { ...f, push: rpc }
}

async function main() {
  const f = await pushFixture(), { db } = f, passed: string[] = []
  const deviceA = '11111111-1111-4111-8111-111111111111', deviceB = '22222222-2222-4222-8222-222222222222'
  const binding = '33333333-3333-4333-8333-333333333333', bindingB = '44444444-4444-4444-8444-444444444444'
  const secret = 'a'.repeat(64), token = 'fixture-token-'.repeat(5)
  const register = (device = deviceA, owner = ids.A, bind = binding, suffix = '') => f.push('native_push_register', [device, secret, token + suffix, bind], owner)
  try {
    assert.equal((await f.push('native_push_state')).available, true)
    for (const table of ['devices', 'preferences', 'events', 'deliveries', 'settings']) {
      await assert.rejects(() => f.asUser(ids.B, () => db.exec('select * from native_push.' + table)), /permission denied/)
    }
    await assert.rejects(() => f.push('native_push_jobs'), /permission denied/)
    await assert.rejects(() => f.push('native_push_claim', [deviceA, binding]), /permission denied/)
    await register()
    await register(deviceB, ids.A, bindingB, 'second')
    assert.equal((await db.query('select * from native_push.devices')).rows.length, 2)
    await assert.rejects(() => f.push('native_push_register', [deviceA, 'b'.repeat(64), token, binding], ids.B), /Dispositivo/)
    await assert.rejects(() => f.push('native_push_register', [deviceB, secret, token, binding], ids.B), /Dispositivo/)
    passed.push('tokens privados, funciones de envío sólo servidor, secreto de instalación y dos dispositivos')

    await db.exec(`insert into community_safety.acceptances(user_id,version) values('${ids.A}','2026-10-15'),('${ids.B}','2026-10-15')`)
    // Datos aislados para probar el disparador real sin jugar ni gastar monedas.
    const table = '55555555-5555-4555-8555-555555555555'
    await db.query("insert into tables(id,name,creator_id,creator_username,status,bet,target_score) values($1,'Mesa aislada',$2,'Cuenta B','waiting',0,15)", [table, ids.B])
    const invite = async (from = ids.B) => (await db.query<{ id: string }>(`insert into game_invites(from_id,to_id,from_username,table_id,bet,target_score)
      values($1,$2,'Cuenta de ensayo',$3,0,15) returning id`, [from, ids.A, table])).rows[0].id
    const first = await invite()
    await invite()
    assert.equal((await db.query('select * from native_push.events')).rows.length, 1)
    const jobs = (await db.query<{ value: any }>('select public.native_push_jobs() value')).rows[0].value
    assert.equal(jobs.length, 2)
    const claim = async (job: any) => (await db.query<{ value: any }>('select public.native_push_claim($1,$2) value', [job.id, job.key])).rows[0].value
    assert.equal(await claim({ ...jobs[0], key: binding }), null)
    const job = await claim(jobs[0])
    assert.equal(job.data.kind, 'invite'); assert.equal(job.data.user, ids.A)
    assert.equal((await claim(jobs[0])).skip, true)
    await db.query('select public.native_push_complete($1,$2,$3,15)', [job.id, bindingB, 'sent'])
    assert.equal((await db.query<{ status: string }>('select status from native_push.deliveries where id=$1', [job.id])).rows[0].status, 'sending')
    await db.query('select public.native_push_complete($1,$2,$3,15)', [job.id, job.lease, 'retry'])
    await db.query("update native_push.deliveries set next_at=now()-interval '1 second' where id=$1", [job.id])
    const retry = await claim(jobs[0]); assert.equal(retry.attempts, 2); assert.equal(retry.data.event, job.data.event)
    await db.query('select public.native_push_complete($1,$2,$3,15)', [retry.id, retry.lease, 'sent'])
    assert.equal((await claim(jobs[0])).skip, true)
    passed.push('invitación real, límite de diez minutos, un evento por dispositivo, lease y reintento sin nuevo evento')

    await f.push('native_push_preferences', [false, true, true])
    assert.equal((await claim(jobs[1])).skip, true)
    await f.push('native_push_preferences', [true, true, true])
    await register(deviceA, ids.B, bindingB)
    assert.equal((await claim(jobs[0])).skip, true)
    await f.push('native_push_unregister', [deviceA, secret], ids.A)
    assert.equal((await db.query<{ enabled: boolean }>('select enabled from native_push.devices where installation=$1', [deviceA])).rows[0].enabled, true)
    await f.push('native_push_unregister', [deviceA, secret], ids.B)
    assert.equal((await db.query<{ enabled: boolean }>('select enabled from native_push.devices where installation=$1', [deviceA])).rows[0].enabled, false)
    await db.query('delete from game_invites where id=$1', [first])
    assert.equal((await db.query<{ value: boolean }>('select native_push.valid($1) value', [job.data.event])).rows[0].value, false)
    passed.push('preferencias por cuenta, cambio A/B, baja restringida y aviso vencido/cancelado')

    await db.exec("update native_push.events set created_at=now()-interval '11 minutes'")
    await register()
    const second = await invite()
    await db.exec('select public.native_push_jobs()')
    const forA = (await db.query('select j.id,j.key from native_push.deliveries j join native_push.events e on e.id=j.event_id where j.installation=$1 and e.subject=$2', [deviceA, second])).rows[0]
    const live = await claim(forA)
    assert.ok(live.token)
    await f.push('native_push_register', [deviceA, secret, token + 'renewed', binding])
    await db.query('select public.native_push_complete($1,$2,$3,15)', [live.id, live.lease, 'invalid_token'])
    assert.equal((await db.query<{ enabled: boolean }>('select enabled from native_push.devices where installation=$1', [deviceA])).rows[0].enabled, true)
    await db.query('delete from game_invites where id=$1', [second])

    const tournament = '66666666-6666-4666-8666-666666666666'
    const entryA = '77777777-7777-4777-8777-777777777777', entryB = '88888888-8888-4888-8888-888888888888'
    await db.query(`insert into tournaments(id,name,mode,format,capacity,target_score,starts_at,created_by,updated_by,status,published_at)
      values($1,'Torneo aislado','1v1','knockout',4,15,now()+interval '20 minutes',$2,$2,'published',now())`, [tournament, ids.A])
    for (const [entry, owner] of [[entryA, ids.A], [entryB, ids.B]]) {
      await db.query("insert into tournament_entries(id,tournament_id,status,created_by) values($1,$2,'active',$3)", [entry, tournament, owner])
      await db.query("insert into tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at) values($1,$2,$3,'captain','accepted',now())", [tournament, entry, owner])
    }
    const checkins = (await db.query<{ value: any }>('select public.native_push_jobs() value')).rows[0].value
    assert.equal(checkins.length, 2)
    assert.equal((await claim(checkins[0])).data.kind, 'checkin')
    await db.exec('select native_push.prepare(); select native_push.prepare()')
    assert.equal((await db.query("select * from native_push.events where kind='checkin'")).rows.length, 1)
    await db.query('insert into tournament_checkins(entry_id,tournament_id,confirmed_by) values($1,$2,$3)', [entryA, tournament, ids.A])
    assert.equal((await claim(checkins[1])).skip, true)
    await db.query("update tournaments set status='running' where id=$1", [tournament])
    const match = (await db.query<{ id: string }>(`insert into tournament_matches(tournament_id,phase,round_number,match_number,side_a_entry_id,side_b_entry_id)
      values($1,'semifinal',1,1,$2,$3) returning id`, [tournament, entryA, entryB])).rows[0].id
    await db.query("update tournament_matches set status='ready',ready_at=now(),entry_deadline=now()+interval '5 minutes' where id=$1", [match])
    const matches = (await db.query<{ value: any }>('select public.native_push_jobs() value')).rows[0].value
    assert.equal(matches.length, 2)
    const matchJob = await claim(matches[0]); assert.equal(matchJob.data.kind, 'match'); assert.equal(matchJob.data.path, '/torneos/' + tournament)
    await db.query('update tournaments set schedule_version=schedule_version+1 where id=$1', [tournament])
    assert.equal((await claim(matches[1])).skip, true)
    passed.push('check-in independiente del email, una vez por agenda, confirmación y cruce real con revalidación de cambios')

    await db.exec("delete from native_push.events where kind='invite'")
    for (let i = 0; i < 6; i++) {
      await db.exec("update native_push.events set created_at=now()-interval '11 minutes' where kind='invite'")
      await invite()
    }
    assert.equal((await db.query("select * from native_push.events where kind='invite'")).rows.length, 5)
    passed.push('límite de cinco invitaciones por hora al destinatario')
    await db.exec("update native_push.events set expires_at=now()-interval '31 days'; select native_push.prepare()")
    assert.equal((await db.query('select * from native_push.events')).rows.length, 0)
    passed.push('renovación no invalidada por respuesta del token viejo y limpieza de datos a treinta días')
    await writeFile('android/generated/android-13-rules.json', JSON.stringify({ environment: 'PostgreSQL aislado, sin red ni cuentas reales', passed }, null, 2))
    console.log('OK', passed.join('; '))
  } finally { await db.close() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(error => { console.error(error.stack); process.exitCode = 1 })
}
