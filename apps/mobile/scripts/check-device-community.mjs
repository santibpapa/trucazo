// Dos QA por sus formularios normales: social privado app/web y rutas restantes.
// No publica chat/novedades ni envía avisos de soporte.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
import { releaseDevice } from './release-device.mjs'
import { releaseQaLogin } from './release-qa-login.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts(), qa = [...saved.accounts, saved.registrationAccount]
const origin = process.env.ANDROID_QA_WEB_ORIGIN || 'http://localhost:3002'
const release = process.argv.includes('--release-device')
const c = release ? await releaseDevice({ serial: process.env.ANDROID_QA_SERIAL, port: 9239 }) : await deviceCDP()
if (release) await releaseQaLogin(3, false, c)
const clients = [], browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
const prefix = release ? 'android-17-community-release20' : 'android-11-real'
const report = { scope: release ? 'APK20 Android11/WebView133 y web pública HTTPS; Supabase real; sólo QA1/QA3, sin chat público/campañas' : 'APK Android 11/WebView 133 + web Next local + Supabase real; sólo QA1/QA3; sin chat público ni campañas', routes: [], flows: [] }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function wait(test) { for (let i = 0; i < 160; i++) { const result = await test(); if (result) return result; await pause(200) } throw Error('No llegó el estado esperado') }
const text = () => c.evaluate('document.body.innerText')
async function go(route, expected) { await c.evaluate(`if(location.hash===${JSON.stringify('#' + route)})window.dispatchEvent(new Event('mobile:refresh'));else location.hash=${JSON.stringify('#' + route)}`); await pause(350); if (route === '/comunidad' && expected?.toLowerCase() === 'mis amigos') await click('Amigos'); if (expected) await wait(async () => (await text()).toLowerCase().includes(expected.toLowerCase())) }
async function click(label) { await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)}&&!b.disabled&&b.getBoundingClientRect().width);if(!b)return false;b.click();return true})()`)) }
async function fill(selector, value) { assert.ok(await c.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)) }
async function shot(name) { await writeFile('android/generated/' + prefix + '-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
async function clientFor(account) {
  const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  assert.equal((await client.auth.signInWithPassword({ email: account.email, password: account.password })).error, null)
  clients.push(client); return client
}
try {
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), qa[2].id)
  const a = await clientFor(qa[2]), b = await clientFor(qa[0]), third = await clientFor(qa[1])
  const state = async client => { const result = await client.rpc('get_community'); assert.equal(result.error, null); return result.data }
  assert.equal((await state(a)).group, null); assert.equal((await state(b)).group, null)
  assert.ok(!(await state(a)).friends.some(f => f.user_id === qa[0].id), 'Conservar una amistad QA previa; no repetir altas')
  const context = await browser.newContext({ viewport: { width: 360, height: 568 } }), page = await context.newPage()
  await page.goto(origin + '/login'); await page.waitForFunction(() => Object.keys(document.querySelector('input[name=password]') || {}).some(k => k.startsWith('__reactProps$')))
  await page.getByLabel('Email o usuario').fill(qa[0].username); await page.getByLabel('Contraseña', { exact: true }).fill(qa[0].password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL('**/lobby**')
  await page.goto(origin + '/comunidad'); await page.getByRole('heading', { name: 'Comunidad', exact: true }).waitFor()
  await go('/comunidad', 'Mis amigos'); await fill('input[name="buscar-amigo"]', qa[0].username); await click('Agregar')
  await wait(async () => (await state(b)).incoming.some(f => f.username === qa[2].username))
  await page.reload(); await page.getByRole('button', { name: 'Aceptar', exact: true }).click()
  await wait(async () => (await state(a)).friends.some(f => f.username === qa[0].username))
  report.friendshipId = (await state(a)).friends.find(f => f.user_id === qa[0].id).friendship_id
  await writeFile('android/generated/' + prefix + '-progress.json', JSON.stringify(report, null, 2))
  await go('/lobby', 'Mesas disponibles'); await go('/comunidad', qa[0].username)
  await wait(async () => (await text()).includes('Conectado')); await shot('friends')
  report.flows.push('amistad APK QA3 → web QA1, aceptación y presencia real')
  await click('Grupo'); await fill('input[placeholder="Nombre del grupo"]', release ? 'ANDROID-17 QA privado' : 'ANDROID-11 QA privado'); await click('Crear grupo')
  await wait(async () => (await text()).includes('1/20 integrantes')); await click('Invitar')
  report.createdGroupId = (await state(a)).group.id
  await writeFile('android/generated/' + prefix + '-progress.json', JSON.stringify(report, null, 2))
  await wait(async () => (await state(b)).group_invites_in.length === 1)
  await page.reload(); await page.getByRole('button', { name: /^Grupo/ }).click(); await page.getByRole('button', { name: 'Unirme', exact: true }).click()
  await wait(async () => (await state(a)).group?.members.length === 2)
  await go('/comunidad', 'Mis amigos'); await click('Grupo'); await wait(async () => (await text()).includes('2/20 integrantes')); await shot('group')
  assert.ok((await third.rpc('kick_group_member', { p_user_id: qa[0].id })).error)
  await page.getByRole('button', { name: 'Salir del grupo', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar salida', exact: true }).click()
  await wait(async () => (await state(a)).group?.members.length === 1)
  await go('/comunidad', 'Mis amigos'); await click('Grupo'); await click('Eliminar grupo'); await pause(150); await click('Eliminar grupo')
  await wait(async () => (await state(a)).group === null)
  report.flows.push('crear/invitar/unirse/salir/eliminar grupo por controles normales; tercero rechazado')
  await go('/lobby', 'Mesas disponibles'); await go('/comunidad', qa[0].username); await click('Invitar')
  await wait(async () => (await state(b)).invites_in.length === 1)
  await page.goto(origin + '/comunidad'); await page.getByRole('button', { name: 'No', exact: true }).click()
  await wait(async () => (await state(a)).invite_out === null)
  await go('/lobby', 'Mesas disponibles'); await go('/comunidad', qa[0].username); await click('Invitar'); await wait(async () => (await state(b)).invites_in.length === 1)
  await click('Cancelar'); await wait(async () => (await state(b)).invites_in.length === 0)
  report.flows.push('invitación a juego rechazada desde lobby web y cancelada desde APK; sin modificar monedas')
  // Todas las páginas públicas conservan componentes/contenido; calculadora interactiva.
  for (const path of ['ayuda', 'como-se-juega-al-truco', 'orden-cartas-truco', 'envido-real-envido-falta-envido', 'pardas-truco-reglas', 'calculadora-envido', 'truco-dos-jugadores', 'truco-en-parejas', 'truco-contra-computadora', 'jugar-truco-con-amigos', 'jugar-truco-sin-registrarse', 'modo-historia-truco', 'acerca-de-trucazo', 'contacto', 'privacidad', 'terminos']) {
    await go('/' + path); await wait(() => c.evaluate("!!document.querySelector('h1')"))
    assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, path)
    assert.ok(!(await text()).includes('próxima versión de prueba'), path)
    assert.ok(await c.evaluate("Array.from(document.querySelectorAll('a')).some(a=>a.getAttribute('href')==='#/lobby')"))
    report.routes.push(path)
    if (['ayuda', 'contacto', 'calculadora-envido'].includes(path)) await shot(path)
  }
  await go('/calculadora-envido?c1=espada-7&c2=oro-6&c3=copa-5', 'Tu tanto es'); await wait(async () => (await text()).includes('7: la carta'))
  assert.ok((await c.evaluate('location.hash')).startsWith('#/calculadora-envido?'))
  await go('/email/preferencias', 'Emails que querés recibir')
  assert.equal(await c.evaluate("Array.from(document.querySelectorAll('input[type=checkbox]')).some(x=>x.checked)"), false)
  await click('Guardar preferencias'); await wait(async () => (await text()).includes('guardamos tus preferencias'))
  await click('No quiero recibir ningún email'); await wait(async () => (await text()).includes('guardamos tus preferencias')); await shot('preferences')
  report.flows.push('preferencias propias guardadas y baja total; QA sigue sin correos')
  for (const route of ['/admin', '/admin/analytics', '/admin/emails', '/admin/persona/' + qa[0].id]) { await go(route, 'sólo para administradores'); report.routes.push(route + ' rechazado') }
  await go('/resena', 'Contanos qué te pareció'); await click('Enviar'); await wait(async () => (await text()).includes('Poné las dos puntuaciones')); await shot('feedback-validation')
  await click('Cancelar'); await wait(async () => (await text()).includes('Mesas disponibles'))
  await go('/comunidad', qa[0].username); await click('Quitar a ' + qa[0].username); await click('¿Quitar?'); await wait(async () => !(await state(a)).friends.some(f => f.user_id === qa[0].id))
  await go('/lobby', 'Mesas disponibles')
  await writeFile('android/generated/' + prefix + '.json', JSON.stringify(report, null, 2)); console.log('OK', report.flows, report.routes.length + ' rutas')
} finally { await c.close(); await browser.close(); for (const client of clients) await client.auth.signOut({ scope: 'local' }) }
