// APK instalado con sesión QA real; contenido y administración sólo en SQL local.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
import { safetyFixture } from './safety-fixture.ts'
import { ids } from './online-fixture.ts'
const f = await safetyFixture(), c = await deviceCDP(), admin = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'
const owner = await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id")
assert.equal(owner, '2c9dd1e8-a39b-41e7-af2a-f67502691795')
let adminView = false
const errors = [], calls = []
const adb = args => execFileSync(process.env.ADB, ['-s', 'emulator-5554', ...args], { encoding: 'utf8' })
const wait = async predicate => { for (let i = 0; i < 120; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('El APK no llegó al estado de convivencia esperado') }
const has = text => c.evaluate('document.body.innerText.includes(' + JSON.stringify(text) + ')')
const click = name => wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`))
async function go(route, text) { await c.evaluate('location.hash=' + JSON.stringify('#' + route)); await wait(() => has(text)) }
async function shot(name) { await writeFile('android/generated/android-12-native-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
const server = createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk
  const body = raw ? JSON.parse(raw) : {}, path = new URL(req.url, 'http://localhost').pathname
  try {
    if (path !== '/api/community/report') { res.writeHead(503).end(); return }
    const id = await f.rpc('report_community_content', { p_kind: body.kind, p_target: body.target, p_reason: body.reason, p_detail: body.detail }, ids.A)
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, id, imageWarning: false }))
  } catch (error) { res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message })) }
})
try {
  await f.db.query("insert into profiles(id,username,is_admin) values($1,'Admin ficticio',true)", [admin])
  await f.rpc('accept_community_rules', { p_version: '2026-10-15' }, ids.B)
  await f.rpc('send_chat_message', { p_body: 'ANDROID-12 nativo aislado' }, ids.B)
  await new Promise(resolve => server.listen(3004, '127.0.0.1', resolve))
  c.onEvent(event => {
    if (event.method !== 'Fetch.requestPaused') return
    void (async () => {
      const { requestId, request } = event.params, url = new URL(request.url), name = url.pathname.split('/').at(-1)
      let data, status = 200
      try {
        if (request.method === 'OPTIONS') data = {}
        else if (name === 'profiles') data = { id: owner, username: 'QA nativa de convivencia', is_admin: adminView, coins: 370 }
        else if (name === 'chat_messages') data = (await f.asUser(ids.A, () => f.db.query('select * from chat_messages order by created_at'))).rows
        else { calls.push(name); data = await f.rpc(name, request.postData ? JSON.parse(request.postData) : {}, adminView && ['moderation_reports','moderation_feedback','resolve_community_report'].includes(name) ? admin : ids.A) }
      } catch (error) { data = { message: error.message }; status = 400 }
      await c.send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'https://localhost' }, { name: 'Access-Control-Allow-Headers', value: 'apikey,authorization,x-client-info,content-type,x-supabase-api-version,accept,accept-profile,content-profile' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' }], body: Buffer.from(JSON.stringify(data)).toString('base64') })
    })().catch(error => errors.push(error.message))
  })
  const rpcNames = ['community_safety_state','accept_community_rules','set_player_block','get_community','moderation_reports','moderation_feedback','resolve_community_report']
  await c.send('Fetch.enable', { patterns: [ ...['profiles','chat_messages'].map(name => ({ urlPattern: 'https://*.supabase.co/rest/v1/' + name + '*', requestStage: 'Request' })), ...rpcNames.map(name => ({ urlPattern: 'https://*.supabase.co/rest/v1/rpc/' + name, requestStage: 'Request' })) ] })
  adb(['reverse', 'tcp:3000', 'tcp:3004'])
  await go('/convivencia', 'Leer y aceptar las normas'); await click('Leer y aceptar las normas'); await wait(() => has('Acepto las normas')); await shot('rules'); await click('Acepto las normas')
  await wait(() => c.evaluate("!document.body.innerText.includes('Leer y aceptar las normas')"))
  await go('/comunidad', 'Comunidad'); await click('Chat'); await wait(() => has('ANDROID-12 nativo aislado'))
  await click('Opciones de Cuenta B'); await click('Enviar denuncia'); await wait(() => has('Denuncia recibida')); await shot('report')
  await click('Bloquear persona'); await click('Confirmar bloqueo'); await wait(() => has('Persona bloqueada')); await click('Cerrar')
  await go('/convivencia', 'Personas bloqueadas'); await wait(() => has('Desbloquear')); await shot('blocks'); await click('Desbloquear'); await wait(() => has('No bloqueaste a nadie.'))
  adminView = true; await go('/admin/denuncias', 'Denuncias de convivencia')
  await c.evaluate(`(()=>{const field=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'Ensayo nativo resuelto sin sanción');field.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await click('Resolver denuncia'); await wait(() => has('Resuelta: Ensayo nativo resuelto sin sanción')); await shot('admin')
  assert.deepEqual(errors, [])
  await writeFile('android/generated/android-12-native-isolated.json', JSON.stringify({ environment: 'APK instalado Android 11; sesión QA3 real; RPC/contenido/admin PGlite y API local ficticios; sin reportes ni roles remotos', passed: ['normas dentro del APK','denuncia privada por transporte nativo','bloqueo/desbloqueo','panel admin ficticio y resolución'], calls }, null, 2))
  console.log('OK convivencia dentro del APK con SQL local y sesión QA conservada.')
} catch (error) { console.log(errors, await c.evaluate('document.body.innerText')); throw error }
finally { await c.send('Fetch.disable').catch(() => {}); adb(['reverse','tcp:3000','tcp:3000']); await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close(); if (server.listening) await new Promise(resolve => server.close(resolve)); await f.db.close() }
