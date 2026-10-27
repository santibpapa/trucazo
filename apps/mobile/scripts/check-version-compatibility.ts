// SQL real en Postgres descartable: no modifica Supabase ni cuentas reales.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { onlineFixture, ids } from './online-fixture'

const f = await onlineFixture(), { db } = f
const sessions = { A: '11111111-1111-4111-8111-111111111111', B: '22222222-2222-4222-8222-222222222222' }
try {
  await db.exec(`create role authenticator; create role service_role; create table auth.sessions(id uuid primary key);
    insert into auth.sessions values('${sessions.A}'),('${sessions.B}');
    create table public.team_tables(id uuid, status text, updated_at timestamptz);
    create table public.team_seats(table_id uuid,user_id uuid);`)
  await db.exec(await readFile('supabase/migrations/20261027005516_android_version_compatibility.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261027013911_android_compatibility_service_role.sql', 'utf8'))
  await db.exec("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false);set role service_role;select app_compatibility.check_request();reset role;")
  async function request(owner: 'A' | 'B', path: string, sql: string, args: unknown[] = [], method = 'POST') {
    await db.query(`select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false),
      set_config('request.path',$3,false),set_config('request.method',$4,false),set_config('request.headers','{}',false)`,
    [ids[owner], JSON.stringify({ sub: ids[owner], session_id: sessions[owner], role: 'authenticated', is_anonymous: false }), path, method])
    await db.exec('set role authenticated')
    try {
      await db.exec('select app_compatibility.check_request()')
      return (await db.query<any>(sql, args)).rows
    } finally { await db.exec('reset role') }
  }
  const compatibility = async (owner: 'A' | 'B', code: number | null) =>
    (await request(owner, 'rpc/app_compatibility', 'select public.app_compatibility($1) state', [code]))[0].state
  assert.equal((await compatibility('A', 18)).compatible, true)
  assert.equal((await compatibility('B', 19)).compatible, true)
  await assert.rejects(() => db.exec('update app_compatibility.policy set minimum_code=19'), /check constraint/)
  await assert.rejects(() => request('A', 'rpc/app_compatibility', 'select * from app_compatibility.policy'), /permission denied/)
  const table = (await request('A', 'rpc/create_table', "select to_jsonb(public.create_table(p_name=>'Versiones',p_bet=>10,p_is_private=>false,p_target_score=>15,p_time_limit=>30)) value"))[0].value
  await request('B', 'rpc/join_table', 'select public.join_table($1)', [table.id])
  await request('A', 'rpc/start_game', 'select public.start_game($1)', [table.id])
  const before = (await db.query('select id,coins from profiles order by id')).rows
  await db.exec("update app_compatibility.policy set minimum_code=19,replacement_code=19,replacement_available=true,replacement_url='https://www.trucazo.com.ar/android'")
  const retired = await compatibility('A', null)
  assert.equal(retired.compatible, false); assert.equal(retired.activeGameId, table.id)
  assert.equal((await compatibility('B', null)).compatible, true)
  // Omitir el aviso y las cabeceras, incluso usando GET RPC, sigue rechazado.
  for (const method of ['POST', 'GET']) await assert.rejects(() => request('A', 'rpc/create_table',
    "select public.create_table(p_name=>'No crear',p_bet=>10,p_is_private=>false,p_target_score=>15,p_time_limit=>30)", [], method), /Actualizá/)
  await assert.rejects(() => request('A', 'profiles', 'update profiles set coins=0'), /Actualizá/)
  assert.deepEqual((await db.query('select id,coins from profiles order by id')).rows, before)
  const reads = await request('A', 'games', 'select id from games', [], 'GET')
  assert.ok(reads.some(row => row.id === table.id))
  await request('A', 'rpc/forfeit', 'select public.forfeit($1)', [table.id])
  const after = (await db.query('select id,coins from profiles order by id')).rows
  await request('A', 'rpc/start_game', 'select public.start_game($1)', [table.id])
  assert.deepEqual((await db.query('select id,coins from profiles order by id')).rows, after)
  // Confirmar colas conserva el validador v1; el control no las bloquea.
  await request('A', 'rpc/sync_offline_campaign', 'select 1')
  await request('A', 'rpc/team_action', 'select 1')
  assert.equal((await compatibility('A', 19)).compatible, true)
  assert.equal((await compatibility('A', 18)).versionCode, 19)
  // Eliminar la sesión Auth retira el vínculo; no quedan datos huérfanos.
  await db.query('delete from auth.sessions where id=$1', [sessions.A])
  assert.equal((await db.query('select * from app_compatibility.sessions where user_id=$1', [ids.A])).rows.length, 0)
  const result = { scope: 'Postgres descartable, contrato v1', admitted: true, retiredDirectRestRejected: true,
    omittedHeadersRejected: true, getRpcRejected: true, policyPrivate: true, unavailableReplacementCannotRetire: true,
    activeGameCanFinish: true, prizesNotDuplicated: true, syncRecoveryAllowed: true, updatePreservesSessionBinding: true }
  await mkdir('android/generated', { recursive: true })
  await writeFile('android/generated/android-17-version-sql.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await db.close() }
