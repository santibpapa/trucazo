// Torneos SQL descartables → handler de envío real → FCM → APK real.
// No crea ni publica un torneo en Supabase de producción.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { pushFixture } from './check-push-rules'
import { deviceCDP } from './device-cdp.mjs'
import { ids } from './online-fixture'

async function main() {
  const c = await deviceCDP(), f = await pushFixture(), { db } = f
  try {
    const native = await c.evaluate('(async()=>{const n=await Capacitor.Plugins.PushBinding.state({owner:JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")).user.id});return {owner:n.owner,installation:n.installation,binding:n.binding}})()')
    const token = await c.evaluate('(async()=>{let h;try{return await new Promise((resolve,reject)=>{setTimeout(()=>reject(Error("Sin token QA")),20000);Capacitor.Plugins.PushNotifications.addListener("registration",t=>resolve(t.value)).then(v=>{h=v;return Capacitor.Plugins.PushNotifications.register()}).catch(reject)})}finally{await h?.remove()}})()')
    await db.query('insert into profiles(id,username,is_bot) values($1,$2,false)', [native.owner, 'QA local de notificaciones'])
    await db.query(`insert into auth.users(id,is_anonymous,raw_app_meta_data) values($1,false,'{"qa_purpose":"android-app-acceptance"}')`, [native.owner])
    await f.push('native_push_register', [native.installation, 'f'.repeat(64), token, native.binding], native.owner)
    const admin = { rpc: async (name: string, args: Record<string, unknown>) => {
      assert.ok(['native_push_claim', 'native_push_complete'].includes(name))
      const fields = Object.keys(args)
      return { data: (await db.query<{ value: unknown }>(`select public.${name}(${fields.map((k, i) => k + '=>$' + (i + 1)).join(',')}) value`, Object.values(args))).rows[0].value, error: null }
    } }
    ;(globalThis as any).tournamentPushAdmin = admin
    const compiled = await build({ stdin: { contents: `import{POST}from'./src/app/api/android/push/send/route';globalThis.tournamentPushSend=POST;`, loader: 'ts', resolveDir: process.cwd() },
      bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', plugins: [{ name: 'isolated-db', setup(b) {
        b.onResolve({ filter: /^@\/lib\/supabase\/admin$/ }, a => ({ path: a.path, namespace: 'fixture' }))
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export function createAdminClient(){return globalThis.tournamentPushAdmin}', loader: 'js' }))
      } }] })
    new Function('require', compiled.outputFiles[0].text)(createRequire(import.meta.url))
    const received: { kind: string; title: string }[] = []
    const dispatch = async (kind: string, title: string) => {
      const jobs = (await db.query<{ value: any[] }>('select public.native_push_jobs() value')).rows[0].value
      assert.equal(jobs.length, 1)
      const result = await (globalThis as any).tournamentPushSend(new Request('http://localhost:3000/api/android/push/send?id=' + jobs[0].id, {
        method: 'POST', headers: { Authorization: 'Bearer ' + jobs[0].key },
      }))
      assert.equal(result.status, 200); assert.equal((await result.json()).accepted, true)
      let visible = false
      for (let i = 0; i < 80; i++) {
        visible = await c.evaluate(`(async()=>(await Capacitor.Plugins.PushNotifications.getDeliveredNotifications()).notifications.some(n=>n.title===${JSON.stringify(title)}))()`)
        if (visible) break
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      assert.ok(visible, 'Recepción Android de ' + kind)
      received.push({ kind, title })
    }
    const tournament = randomUUID(), entryA = randomUUID(), entryB = randomUUID()
    await db.query(`insert into tournaments(id,name,mode,format,capacity,target_score,starts_at,created_by,updated_by,status,published_at)
      values($1,'Torneo QA aislado','1v1','knockout',4,15,now()+interval '20 minutes',$2,$2,'published',now())`, [tournament, native.owner])
    for (const [entry, owner] of [[entryA, native.owner], [entryB, ids.B]]) {
      await db.query("insert into tournament_entries(id,tournament_id,status,created_by) values($1,$2,'active',$3)", [entry, tournament, owner])
      await db.query("insert into tournament_entry_members(tournament_id,entry_id,user_id,role,status,accepted_at) values($1,$2,$3,'captain','accepted',now())", [tournament, entry, owner])
    }
    await dispatch('checkin', 'Ya podés confirmar tu torneo')
    assert.equal((await db.query<{ value: any[] }>('select public.native_push_jobs() value')).rows[0].value.length, 0)
    await db.query("update tournaments set status='running' where id=$1", [tournament])
    const match = (await db.query<{ id: string }>(`insert into tournament_matches(tournament_id,phase,round_number,match_number,side_a_entry_id,side_b_entry_id)
      values($1,'semifinal',1,1,$2,$3) returning id`, [tournament, entryA, entryB])).rows[0].id
    await db.query("update tournament_matches set status='ready',ready_at=now(),entry_deadline=now()+interval '5 minutes' where id=$1", [match])
    await dispatch('match', 'Tu partida está lista')
    const adb = (args: string[]) => execFileSync(process.env.ADB || 'adb', ['-s', 'emulator-5554', ...args])
    adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); adb(['shell', 'cmd', 'statusbar', 'expand-notifications'])
    adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-tournaments.xml'])
    await writeFile('android/generated/android-13-tournament-received.png', adb(['exec-out', 'screencap', '-p']))
    await writeFile('android/generated/android-13-tournaments.json', JSON.stringify({ environment: 'Torneo SQL PGlite aislado; handler real y FCM reales; recepción APK Android 11 QA2; ningún torneo creado/publicado en Supabase real', received }, null, 2))
    console.log('OK SQL aislado → handler real → FCM → avisos visibles de check-in y partida lista, sin torneo público.')
  } finally { c.close(); await db.close() }
}
void main().catch(error => { console.error('Aceptación de torneos push: ' + error.message); process.exitCode = 1 })
