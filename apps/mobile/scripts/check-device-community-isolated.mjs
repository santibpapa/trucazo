// Pantallas administrativas del APK con REST y API locales ficticios. No eleva
// permisos de las QA ni activa campañas ni envía correos al servidor real.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
import { adminStats, acquisition, person } from './community-admin-data.mjs'
const serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554'
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const c = await deviceCDP(), calls = [], errors = []
let campaigns = [], newsActive = false, rankingActive = false
const server = createServer(async (req, res) => {
  let text = ''; for await (const chunk of req) text += chunk
  const body = text ? JSON.parse(text) : {}, path = new URL(req.url, 'http://localhost').pathname
  calls.push({ path, method: req.method })
  let data = {}
  if (path === '/api/android/admin-emails') data = { sender: 'Ensayo local sin envíos', campaigns, newsState: { active: newsActive, latest: null }, rankingState: { active: rankingActive, pending: 0, sent: 0, failed: 0, skipped: 0 } }
  else if (path === '/api/admin/email-campaigns') {
    const campaign = { ...body, id: body.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sent: 0, failed: 0, skipped: 0 }
    campaigns = [campaign]; data = { campaign }
  } else if (path === '/api/admin/news-campaign') { newsActive = body.is_active; data = { ok: true } }
  else if (path === '/api/admin/ranking-campaign') { rankingActive = body.is_active; data = { ok: true } }
  else { res.writeHead(404).end(); return }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Access-Control-Allow-Origin', 'https://localhost'); res.end(JSON.stringify(data))
})
await new Promise(resolve => server.listen(3004, '127.0.0.1', resolve))
const wait = async test => { for (let i = 0; i < 100; i++) { const value = await test(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('No apareció el panel administrativo esperado') }
async function go(path, expected) { await c.evaluate('location.hash=' + JSON.stringify('#' + path)); await wait(() => c.evaluate('document.body.innerText.includes(' + JSON.stringify(expected) + ')')) }
async function click(text) { await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)return false;b.click();return true})()`)) }
async function shot(name) { await writeFile('android/generated/android-11-native-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
try {
  const owner = await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id")
  assert.ok(['ebf2c130-304d-431f-9754-110715ca2892', '2c9dd1e8-a39b-41e7-af2a-f67502691795'].includes(owner))
  c.onEvent(event => {
    if(event.method==='Network.loadingFailed')console.log('Red simulada',event.params.errorText,event.params.corsErrorStatus)
    if (event.method !== 'Fetch.requestPaused') return
    void (async () => {
      const { requestId, request } = event.params, path = new URL(request.url).pathname
      let data
      if (request.method === 'OPTIONS') data = {}
      else if (path.endsWith('/profiles')) data = { id: owner, username: 'QA administrador ficticio', is_admin: true, coins: 1000 }
      else if (path.endsWith('/admin_stats')) data = adminStats
      else if (path.endsWith('/admin_acquisition')) data = acquisition
      else if (path.endsWith('/admin_player')) data = person
      else throw Error('El ensayo no permite ' + path)
      await c.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'https://localhost' },{name:'Access-Control-Allow-Headers',value:request.headers['Access-Control-Request-Headers']||request.headers['access-control-request-headers']||'apikey,authorization,x-client-info,content-type,x-supabase-api-version,accept,accept-profile,content-profile'},{name:'Access-Control-Allow-Methods',value:'GET,POST,OPTIONS'}], body: Buffer.from(JSON.stringify(data)).toString('base64') })
    })().catch(error => errors.push(error.message))
  })
  await c.send('Network.enable')
  await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.supabase.co/rest/v1/profiles*', requestStage: 'Request' },{ urlPattern: 'https://*.supabase.co/rest/v1/rpc/admin_*', requestStage: 'Request' }] })
  adb(['reverse', 'tcp:3000', 'tcp:3004'])
  for (const [path, expected, name] of [['/admin', 'Panel de estadísticas', 'stats'], ['/admin?dias=7', 'Panel de estadísticas', 'stats-7'], ['/admin/analytics', 'Tráfico y adquisición', 'analytics'], ['/admin/persona/' + person.perfil.id, 'androidqa1', 'person'], ['/admin/emails', 'Campañas de email', 'emails']]) { await go(path, expected); await shot(name) }
  await click('Nueva')
  await c.evaluate(`(()=>{for(const [label,value] of [['Nombre interno','ANDROID-11 local'],['Asunto','Sólo prueba'],['Título dentro del mail','QA'],['Contenido','Sin destinatarios reales']]){const l=Array.from(document.querySelectorAll('label')).find(l=>l.textContent.trim()===label);const field=l&&(document.getElementById(l.htmlFor)||l.querySelector('textarea,input')||l.parentElement.querySelector('input'));if(!field)throw Error(label);Object.getOwnPropertyDescriptor(field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}))}})()`)
  await click('Crear campaña'); await wait(() => c.evaluate("document.body.innerText.includes('Editar campaña')")); await shot('email-draft')
  assert.equal(campaigns.length, 1); assert.equal(campaigns[0].is_active, false)
  assert.ok(calls.some(call => call.path === '/api/admin/email-campaigns' && call.method === 'POST'))
  assert.deepEqual(errors, [])
  await writeFile('android/generated/android-11-native-admin.json', JSON.stringify({ scope: 'APK instalado; Auth QA real, REST/API administrativos ficticios; sin privilegios ni correos reales', panels: 5, inactiveDraftSaved: true, calls }, null, 2))
  console.log('OK paneles nativos, filtro de días, ficha y borrador inactivo con API aislada.')
} catch(error) {console.log(errors,await c.evaluate('document.body.innerText'));throw error} finally {
  await c.send('Fetch.disable').catch(() => {}); adb(['reverse', 'tcp:3000', 'tcp:3003'])
  await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close(); await new Promise(resolve => server.close(resolve))
}
