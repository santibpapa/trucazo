// Sólo lectura en Supabase real: central, roles y enlaces del APK en frío/caliente.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import nextEnv from '@next/env'
import { deviceCDP } from './device-cdp.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
nextEnv.loadEnvConfig(process.cwd())
const credentials = await loadQaAccounts(), qa = [...credentials.accounts, credentials.registrationAccount]
const pkg = 'ar.com.trucazo.capacitor.dev', serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554'
assert.ok(process.env.ADB, 'Cargar scripts/android-env.ps1')
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const wait = async predicate => { for (let i = 0; i < 100; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 200)) } throw Error('El APK no llegó al destino de torneo') }
let c, browser
const report = { environment: 'APK Android 11 + Next local + Supabase real; sólo lecturas de torneos, sin altas ni correos', web: [] }
async function connect() {
  await wait(async () => {
    let pid
    try { pid = adb(['shell', 'pidof', pkg]).trim() } catch { return false }
    if (!pid) return false
    adb(['forward', 'tcp:9224', 'localabstract:webview_devtools_remote_' + pid])
    try { c = await deviceCDP(); return true } catch { return false }
  })
}
async function intent(path, cold = false) {
  if (cold) { c?.close(); c = null; adb(['shell', 'am', 'force-stop', pkg]) }
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', 'https://www.trucazo.com.ar' + path, '-p', pkg])
  if (!c) await connect()
  await wait(() => c.evaluate('location.hash===' + JSON.stringify('#' + path)))
}
async function shot(name) { await writeFile('android/generated/android-10-real-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
try {
  const auth = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } })
  assert.equal(auth.status, 200); assert.equal((await auth.json()).mailer_autoconfirm, true); report.confirmEmail = 'off'
  await connect(); assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), qa[2].id)
  await intent('/torneos'); await wait(() => c.evaluate("document.querySelector('h1')?.textContent==='Torneos'")); await shot('hub')
  report.nativeHub = await c.evaluate('document.body.innerText')
  const missing = '11111111-1111-4111-8111-111111111111'
  await intent('/torneos/' + missing); await wait(() => c.evaluate("document.querySelector('[role=alert]')?.textContent.includes('No pudimos abrir el torneo')")); await shot('missing-detail')
  await intent('/torneos/' + missing + '/partidas/' + missing, true)
  await wait(() => c.evaluate("document.querySelector('[role=alert]')?.textContent.includes('no está disponible para espectadores')")); await shot('cold-spectator')
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), qa[2].id)
  await c.evaluate("location.hash='#/admin/torneos'"); await wait(() => c.evaluate("document.body.innerText.includes('sólo para administradores')")); await shot('role')
  browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
  for (const n of [1, 2]) {
    const account = qa[n - 1], context = await browser.newContext({ viewport: { width: 360, height: 568 } }), page = await context.newPage()
    await page.goto('http://localhost:3000/login')
    await page.waitForFunction(() => Object.keys(document.querySelector('input[name=password]') || {}).some(k => k.startsWith('__reactProps$')))
    await page.getByLabel('Email o usuario').fill(account.email); await page.getByLabel('Contraseña', { exact: true }).fill(account.password); await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await page.waitForURL('**/lobby**'); const identity = await context.request.get('http://localhost:3000/api/android/historia?identity=1'); assert.equal((await identity.json()).userId, account.id)
    await page.goto('http://localhost:3000/torneos'); await page.getByRole('heading', { name: 'Torneos', exact: true }).waitFor()
    const body = await page.locator('main').innerText(); assert.ok(body.includes('Todavía no hay torneos'))
    await page.screenshot({ path: 'android/generated/android-10-real-web-' + n + '.png' }); report.web.push({ username: account.username, central: 'empty', identity: 'verified' }); await context.close()
  }
  report.warmCentralAndDetail = true; report.coldSpectator = true; report.roleRejected = true; report.ownerPreserved = true
  await c.evaluate("location.hash='#/lobby'"); await wait(() => c.evaluate("document.body.innerText.includes('Mesas disponibles')"))
  await writeFile('android/generated/android-10-real.json', JSON.stringify(report, null, 2)); console.log('OK central real app/web, enlaces fríos/calientes, torneo inexistente, rol rechazado, QA3 conservada y confirmación apagada.')
} finally { if (c) { await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close() } if (browser) await browser.close() }
