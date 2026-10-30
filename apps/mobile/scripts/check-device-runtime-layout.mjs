// APK real y reglas SQL descartables: ninguna acción de juego llega a Supabase.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { teamFixture } from './team-fixture.ts'
import { ids } from './online-fixture.ts'
import { deviceCDP } from './device-cdp.mjs'

const serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554', port = Number(process.env.ANDROID_QA_CDP || 9224)
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const originalFont=adb(['shell','settings','get','system','font_scale']).trim(), largeFont=process.argv.includes('--large-font')
const cutout=process.argv.includes('--cutout'),landscapeOnly=process.argv.includes('--landscape-only')
const cutoutPackage='com.android.internal.display.cutout.emulation.tall'
const cutoutWasEnabled=adb(['shell','cmd','overlay','list']).includes('[x] '+cutoutPackage)
if(cutout)adb(['shell','cmd','overlay','enable',cutoutPackage])
// Android recrea la actividad al cambiar la letra. Conectar CDP DESPUÉS de ese cambio.
adb(['shell','settings','put','system','font_scale',largeFont?'1.3':'1'])
adb(['shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity']); await pause(1500)
let c
for(let i=0;i<40;i++){try{const pid=adb(['shell','pidof','ar.com.trucazo.capacitor.dev']).trim();adb(['forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid]);c=await deviceCDP({port});break}catch{await pause(200)}}
assert.ok(c,'No abrió el WebView nuevo después de cambiar la letra')
const f = await teamFixture(), errors = [], calls = []
const owner = await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id")
assert.equal(owner, '2c9dd1e8-a39b-41e7-af2a-f67502691795')
const original = { size: adb(['shell', 'wm', 'size']), density: adb(['shell', 'wm', 'density']) }
const report = { scope: 'APK real, sesión QA3 real; todo REST de juego interceptado antes de salir y ejecutado en PGlite local', serial, screens: [] }
async function wait(expression) {
  for (let i = 0; i < 120; i++) { if (await c.evaluate(expression)) return; await pause(150) }
  throw Error('No apareció el estado esperado: ' + expression)
}
const click = async label => { await wait(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)}&&!b.disabled&&!b.closest('[inert]'));if(!b)return false;b.click();return true})()`) }
async function go(route) { await c.evaluate('location.hash=' + JSON.stringify('#' + route)); await wait("!!document.querySelector('[data-game-actions],[data-team-stage]')"); await pause(250) }
const shot = async name => writeFile('android/generated/android-14-' + serial + '-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
try {
  adb(['shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity']); await wait('!document.hidden&&innerHeight>0')
  await f.db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'qa@fixture.invalid','{"username":"QA3 local"}'),($2,'a@fixture.invalid','{"username":"Cuenta A"}')`, [owner, ids.A])
  await f.db.query("update profiles set active_frame='bronce',active_accessory='agua' where id=$1", [owner])
  await f.db.exec('create table user_presence(user_id uuid primary key,last_seen_at timestamptz default now())')
  const table = await f.rpc('create_table', { p_name: 'Cantos de 14', p_bet: 10, p_is_private: true, p_private_code: 'NATIVE14' }, ids.A)
  await f.rpc('join_table_by_code', { p_code: 'NATIVE14' }, owner)
  await f.rpc('start_game', { p_game_id: table.id }, ids.A)
  await f.rpc('sing_truco', { p_game_id: table.id, p_type: 'truco' }, ids.A)
  let team = await f.rpc('team_create', { p_request_id: crypto.randomUUID(), p_name: 'Parejas de 14', p_bet: 10, p_target_score: 30, p_time_limit: 30, p_is_private: false }, ids.A)
  const action = async (player, name, seat) => { const s = await f.rpc('team_snapshot', { p_table_id: team.table.id }, player); team = await f.rpc('team_action', { p_table_id: team.table.id, p_request_id: crypto.randomUUID(), p_version: s.table.version, p_action: name, p_seat: seat ?? null }, player) }
  await action(ids.A, 'seat', 0); await f.rpc('team_join', { p_table_id: team.table.id, p_request_id: crypto.randomUUID() }, owner)
  await action(owner, 'seat', 1); await action(ids.A, 'add_bot', 2); await action(ids.A, 'add_bot', 3); await action(ids.A, 'start'); await action(ids.A, 'truco')
  // Congelar sólo el reloj del fixture para poder comparar tamaños sin vencer turnos.
  await f.db.query("update games set time_limit=3600 where id=$1", [table.id])
  await f.db.query("update team_games set action_started_at=clock_timestamp()+interval '1 hour' where id=$1", [team.table.id])
  c.onEvent(event => {
    if (event.method !== 'Fetch.requestPaused') return
    void (async () => {
      const { requestId, request } = event.params, url = new URL(request.url), name = url.pathname.split('/').at(-1)
      let data, status = 200
      try {
        if (request.method === 'OPTIONS') data = {}
        else if (url.pathname.includes('/rpc/')) {
          calls.push(name)
          data = name === 'get_community' ? { friends:[],incoming:[],outgoing:[],invites_in:[],invite_out:null,group:null,group_invites_in:[] }
            : name === 'tournament_notifications_list' ? []
            : ['active_medal_for','get_game_objective_progress','get_my_objectives','touch_online','tournament_ready_match','ensure_lobby_tables'].includes(name) ? null
            : await f.rpc(name, request.postData ? JSON.parse(request.postData) : {}, owner)
        } else {
          const rows = await f.read(name, url.searchParams, owner)
          data = (request.headers.Accept || request.headers.accept || '').includes('object+json') ? rows[0] ?? null : rows
        }
      } catch (error) { data = { message: error.message }; status = 400; errors.push(name + ': ' + error.message) }
      await c.send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
        { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'https://localhost' },
        { name: 'Access-Control-Allow-Headers', value: 'apikey,authorization,x-client-info,content-type,x-supabase-api-version,accept,prefer,accept-profile,content-profile' },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify(data)).toString('base64') })
    })().catch(error => errors.push(error.message))
  })
  await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.supabase.co/rest/v1/*', requestStage: 'Request' }] })
  const sizes=largeFont?[['large-font','720x1280','1.3']]:cutout?[['cutout','720x1280','1']]:landscapeOnly?[['landscape','1280x720','1']]:[['small','640x1136','1'],['standard','720x1280','1'],['landscape','1280x720','1'],['tablet','1600x2560','1']]
  for (const [label, size, font] of sizes) {
    adb(['shell','wm','size',size]); adb(['shell','wm','density','320']); await pause(800); await wait('!document.hidden&&innerHeight>0')
    for (const mode of ['one','team']) {
      const themes = label === 'standard' && mode === 'one' ? ['clasico','cafetin','quincho','neon','rooftop','presidencial'] : ['cafetin']
      for (const theme of themes) {
        await c.evaluate("location.hash='#/lobby'"); await wait("document.body.innerText.includes('Mesas disponibles')")
        await f.db.query('update profiles set active_salon=$2 where id=$1',[owner,theme])
        await go(mode === 'one' ? '/game/' + table.id : '/game/parejas/' + team.table.id)
        if(label==='landscape')await pause(3800)
        await wait("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Falta Envido')")
        const view = await c.evaluate(`(()=>({width:innerWidth,height:innerHeight,fontScale:${JSON.stringify(font)},scroll:document.documentElement.scrollHeight,
          clipped:Array.from(document.querySelectorAll('button')).filter(b=>b.getClientRects().length&&!b.disabled).filter(b=>{const r=b.getBoundingClientRect();return r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5||b.scrollHeight>b.clientHeight+1}).map(b=>({label:b.getAttribute('aria-label')||b.textContent.trim(),rect:b.getBoundingClientRect().toJSON(),scroll:b.scrollHeight,client:b.clientHeight})),
          escapedIcons:Array.from(document.querySelectorAll('button[aria-label] svg')).filter(svg=>{const s=svg.getBoundingClientRect(),b=svg.closest('button').getBoundingClientRect();return s.x<b.x-.5||s.y<b.y-.5||s.right>b.right+.5||s.bottom>b.bottom+.5}).map(svg=>({label:svg.closest('button').getAttribute('aria-label'),button:svg.closest('button').getBoundingClientRect().toJSON(),icon:svg.getBoundingClientRect().toJSON()})),
          missing:Array.from(document.images).filter(i=>i.complete&&!i.naturalWidth).map(i=>new URL(i.src).pathname)}))()`)
        report.lastView=view
        console.log(label,mode,theme,view.width+'x'+view.height)
        assert.equal(view.scroll,view.height,mode+' '+label+' tiene scroll'); assert.deepEqual(view.clipped,[],mode+' '+label); assert.deepEqual(view.missing,[]); assert.deepEqual(view.escapedIcons,[],mode+' '+label+' iconos')
        report.screens.push({label,mode,theme,...view}); await shot(label+'-'+mode+'-'+theme)
        if(cutout)await writeFile('android/generated/android-14-'+serial+'-cutout-'+mode+'-system.png',execFileSync(process.env.ADB,['-s',serial,'exec-out','screencap','-p']))
      }
    }
  }
  assert.deepEqual(errors,[])
  report.calls = [...new Set(calls)]; report.gameActionsReachedRemote = false
  await writeFile('android/generated/android-14-' + serial + '-layout'+(largeFont?'-font':cutout?'-cutout':landscapeOnly?'-landscape':'')+'.json', JSON.stringify(report,null,2))
  console.log('OK mesas 1v1/parejas, siete opciones, seis salones, pantalla pequeña/horizontal/tablet/letra aumentada.',report.screens.length)
} catch(error) { await shot('layout-failure').catch(()=>{}); await writeFile('android/generated/android-14-'+serial+'-layout-failure.json',JSON.stringify({message:error.message,errors,report},null,2)); throw error }
finally {
  await c.evaluate("location.hash='#/lobby'").catch(()=>{}); await pause(150); await c.send('Fetch.disable').catch(()=>{})
  adb(['shell','wm','size',original.size.match(/Override size: (\d+x\d+)/)?.[1] || 'reset'])
  adb(['shell','wm','density',original.density.match(/Override density: (\d+)/)?.[1] || 'reset'])
  await c.evaluate("window.dispatchEvent(new Event('mobile:refresh'))").catch(()=>{}); await pause(500); c.close(); await f.db.close()
  adb(['shell','settings',originalFont==='null'?'delete':'put','system','font_scale',...(originalFont==='null'?[]:[originalFont])])
  if(cutout&&!cutoutWasEnabled)adb(['shell','cmd','overlay','disable',cutoutPackage])
}
