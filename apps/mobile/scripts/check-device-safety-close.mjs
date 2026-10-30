// Lectura de la resolución QA y pruebas negativas sin nuevos casos ni mensajes.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts(), qa = [...saved.accounts, saved.registrationAccount]
const report = JSON.parse(await readFile('android/generated/android-12-real.json', 'utf8'))
const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const c = await deviceCDP()
let browser, context
const wait = async predicate => { for (let i = 0; i < 120; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('No apareció el estado final de convivencia') }
const click = name => wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`))
try {
  const login = await client.auth.signInWithPassword({ email: qa[0].email, password: qa[0].password }); assert.equal(login.error, null)
  const state = await client.rpc('community_safety_state'); assert.equal(state.error, null)
  assert.equal(state.data.reports.find(item => item.id === report.reportId)?.action, 'dismiss')
  assert.equal(state.data.blocks.length, 0)
  browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
  context = await browser.newContext({ viewport: { width: 360, height: 640 } }); const page = await context.newPage()
  await page.goto('http://localhost:3000/login'); await page.waitForFunction(() => Object.keys(document.querySelector('input[name=password]') || {}).some(key => key.startsWith('__reactProps$')))
  await page.getByLabel('Email o usuario').fill(qa[0].email); await page.getByLabel('Contraseña', { exact: true }).fill(qa[0].password); await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.waitForURL('**/lobby**')
  await page.goto('http://localhost:3000/convivencia'); await page.getByText('Prueba ANDROID-12 verificada; cerrada sin sanción ni infracción real.', { exact: true }).waitFor(); await page.screenshot({ path: 'android/generated/android-12-real-web-resolved.png' })
  await c.evaluate("location.hash='#/convivencia'")
  await wait(() => c.evaluate("document.body.innerText.includes('No enviaste denuncias.')"))
  await c.evaluate(`(()=>{const field=document.querySelector('input[name=safety-username]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(qa[2].username)});field.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await click('Buscar persona'); await click('Opciones de ' + qa[2].username); await click('Enviar denuncia')
  await wait(() => c.evaluate("document.body.innerText.includes('No podés denunciarte a vos mismo')"))
  await writeFile('android/generated/android-12-real-native-self-rejected.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await click('Cerrar')
  const imageStatus = await c.evaluate(`(async()=>{const session=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'));const r=await Capacitor.Plugins.CapacitorHttp.request({url:'http://localhost:3000/api/community/report-images?id=${report.reportId}',method:'GET',headers:{Authorization:'Bearer '+session.access_token,Origin:'https://localhost'},responseType:'json'});return r.status})()`)
  assert.equal(imageStatus, 403)
  await c.evaluate("location.hash='#/lobby'"); await wait(() => c.evaluate("document.body.innerText.includes('Mesas disponibles')"))
  report.adminResolution = 'dismiss'; report.resolutionVerification = 'RPC con contexto del administrador existente en SQL real; interfaz positiva en APK con datos aislados; resolución visible en web QA1 real'
  report.passed.push('resolución del caso QA real y respuesta visible para QA1', 'API nativa Bearer real: autorreporte e imagen privada rechazados, sin nuevos casos')
  await writeFile('android/generated/android-12-real.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report))
} finally { await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close(); await context?.close(); await browser?.close(); await client.auth.signOut({ scope: 'local' }) }
