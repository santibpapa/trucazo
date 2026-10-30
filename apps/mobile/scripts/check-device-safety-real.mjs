// Crea una denuncia privada QA1→QA3 y prueba bloqueo/desbloqueo. No publica chat,
// crea partidas, toca monedas ni envía avisos. Requiere SQL aplicado por el dueño.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts(), qa = [...saved.accounts, saved.registrationAccount]
const origin = 'http://localhost:3000', clients = [], c = await deviceCDP()
let browser, context, reportId, blockAttempted = false
const results = { environment: 'Web local cookies + APK Android 11 sesión QA3 propia + Supabase real; denuncia privada QA, sin sanción ni mensajes públicos', passed: [] }
const wait = async predicate => { for (let i = 0; i < 120; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('No apareció el estado esperado en APK real') }
const click = name => wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`))
async function go(path, text) { await c.evaluate('location.hash=' + JSON.stringify('#' + path)); await wait(() => c.evaluate('document.body.innerText.includes(' + JSON.stringify(text) + ')')) }
async function shot(name) { await writeFile('android/generated/android-12-real-native-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
try {
  for (const account of qa) {
    const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password })
    if (login.error) throw new Error('Falló ingreso de ' + account.username)
    clients.push(client)
  }
  const initial = await clients[0].rpc('community_safety_state')
  assert.equal(initial.error, null, 'Aplicar primero el SQL nuevo en Supabase; no se continúa sin él')
  assert.ok(!initial.data.blocks.some(person => person.id === qa[2].id), 'El par ya estaba bloqueado: no cambiar un bloqueo previo')
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), qa[2].id)
  browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
  context = await browser.newContext({ viewport: { width: 360, height: 640 } }); const page = await context.newPage()
  await page.goto(origin + '/login'); await page.waitForFunction(() => Object.keys(document.querySelector('input[name=password]') || {}).some(key => key.startsWith('__reactProps$')))
  await page.getByLabel('Email o usuario').fill(qa[0].email); await page.getByLabel('Contraseña', { exact: true }).fill(qa[0].password); await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL('**/lobby**')
  await page.goto(origin + '/convivencia'); await page.getByRole('heading', { name: 'Convivencia', exact: true }).waitFor(); await page.getByText('No bloqueaste a nadie.', { exact: true }).waitFor()
  if (await page.getByRole('button', { name: 'Leer y aceptar las normas', exact: true }).count()) { await page.getByRole('button', { name: 'Leer y aceptar las normas', exact: true }).click(); await page.getByRole('button', { name: 'Acepto las normas', exact: true }).click(); await page.getByRole('button', { name: 'Leer y aceptar las normas', exact: true }).waitFor({ state: 'hidden' }) }
  await page.getByLabel('Nombre de usuario exacto').fill(qa[2].username); await page.getByRole('button', { name: 'Buscar persona', exact: true }).click(); await page.getByRole('button', { name: 'Opciones de ' + qa[2].username, exact: true }).click()
  await page.getByLabel('Detalle (opcional)').fill('ANDROID-12 QA privada 15/10/2026. Ensayo autorizado; no hay una infracción real. Cerrar sin sanción.')
  const responsePromise = page.waitForResponse(response => response.url() === origin + '/api/community/report' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Enviar denuncia', exact: true }).click(); const response = await responsePromise, body = await response.json()
  assert.equal(response.status(), 200); assert.equal(body.imageWarning, false); reportId = body.id
  results.reportId = reportId; results.adminResolution = 'pending'
  await writeFile('android/generated/android-12-real.json', JSON.stringify(results, null, 2))
  await page.getByText(/Denuncia recibida/).waitFor(); await page.screenshot({ path: 'android/generated/android-12-real-web-report.png' })
  const repeatedResponse = page.waitForResponse(response => response.url() === origin + '/api/community/report' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Enviar denuncia', exact: true }).click(); assert.equal((await (await repeatedResponse).json()).id, reportId)
  await page.getByRole('button', { name: 'Bloquear persona', exact: true }).click(); blockAttempted = true; await page.getByRole('button', { name: 'Confirmar bloqueo', exact: true }).click(); await page.getByText(/Persona bloqueada/).waitFor(); await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).waitFor()
  results.passed.push('web cookies: normas, denuncia con copia privada de foto, reintento único y bloqueo')

  await go('/convivencia', 'No bloqueaste a nadie.')
  const needsRules = await c.evaluate("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Leer y aceptar las normas')")
  if (needsRules) { await click('Leer y aceptar las normas'); await click('Acepto las normas'); await wait(() => c.evaluate("!document.body.innerText.includes('Leer y aceptar las normas')")) }
  await go('/comunidad', 'Comunidad'); await click('Amigos')
  await wait(() => c.evaluate("!!document.querySelector('input[name=buscar-amigo]')"))
  await c.evaluate(`(()=>{const field=document.querySelector('input[name=buscar-amigo]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(qa[0].username)});field.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await click('Agregar'); await wait(() => c.evaluate("document.body.innerText.includes('bloqueo')")); await shot('blocked-route')
  await go('/admin/denuncias', 'Esta sección es sólo para administradores.'); await shot('role')
  const unauthorizedImage = await context.request.get(origin + '/api/community/report-images?id=' + reportId)
  assert.equal(unauthorizedImage.status(), 403)
  for (let i = 0; i < clients.length; i++) {
    const moderation = await clients[i].rpc('moderation_reports'); assert.ok(moderation.error)
    const state = await clients[i].rpc('community_safety_state'); assert.equal(state.error, null)
    if (i !== 0) assert.ok(!state.data.reports.some(report => report.id === reportId))
  }
  results.passed.push('APK QA3: ruta alternativa rechazada; tres QA sin acceso a casos ajenos/admin/imágenes')
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).click(); await page.getByText('No bloqueaste a nadie.', { exact: true }).waitFor()
  await go('/lobby', 'Mesas disponibles')
  const expected = [[1070,26],[1030,23],[370,0]]
  for (let i = 0; i < clients.length; i++) {
    const profile = await clients[i].from('profiles').select('coins,campaign_points,is_admin').eq('id', qa[i].id).single()
    assert.equal(profile.error, null); assert.deepEqual([profile.data.coins, profile.data.campaign_points], expected[i]); assert.equal(profile.data.is_admin, false)
  }
  results.reportId = reportId; results.adminResolution = 'pending'; results.passed.push('desbloqueo y saldos/roles conservados')
  await writeFile('android/generated/android-12-real.json', JSON.stringify(results, null, 2)); console.log(JSON.stringify(results))
} finally {
  if (clients[0] && blockAttempted) { try { await clients[0].rpc('set_player_block', { p_target: qa[2].id, p_blocked: false }) } catch { /* Mantener la salida y el diagnóstico principal. */ } }
  await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close(); await context?.close(); await browser?.close()
  for (const client of clients) await client.auth.signOut({ scope: 'local' })
}
