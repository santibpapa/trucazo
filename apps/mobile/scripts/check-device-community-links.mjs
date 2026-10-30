// Enlaces Android fríos/calientes con QA existente. No imprime el token privado.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const qa = await loadQaAccounts(), account = qa.accounts[1], pkg = 'ar.com.trucazo.capacitor.dev'
const adb = args => execFileSync(process.env.ADB, ['-s', 'emulator-5554', ...args], { encoding: 'utf8' })
const admin = createClient(qa.projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const preferences = await admin.from('email_preferences').select('unsubscribe_token').eq('user_id', account.id).single()
assert.equal(preferences.error, null)
let c = await deviceCDP()
async function wait(test) { for (let i = 0; i < 100; i++) { if (await test()) return; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('No abrió el enlace Android esperado') }
try {
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), account.id)
  c.close(); c = null; adb(['shell', 'am', 'force-stop', pkg])
  // stdout se descarta: Android imprime la URL, que en este caso contiene el token.
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', 'https://www.trucazo.com.ar/email/preferencias?token=' + preferences.data.unsubscribe_token, '-p', pkg])
  await wait(async () => {
    let pid; try { pid = adb(['shell', 'pidof', pkg]).trim() } catch { return false }
    if (!pid) return false
    adb(['forward', 'tcp:9224', 'localabstract:webview_devtools_remote_' + pid])
    try { c = await deviceCDP(); return true } catch { return false }
  })
  await wait(() => c.evaluate("document.body?.innerText.includes('Emails que querés recibir')"))
  assert.equal(await c.evaluate("Array.from(document.querySelectorAll('input[type=checkbox]')).some(x=>x.checked)"), false)
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', 'https://www.trucazo.com.ar/comunidad', '-p', pkg])
  await wait(() => c.evaluate("document.querySelector('h1')?.textContent==='Comunidad'"))
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), account.id)
  await writeFile('android/generated/android-11-links.json', JSON.stringify({ environment: 'APK Android 11 + API local + Supabase real', preferencesColdToken: true, communityWarm: true, qa2SessionPreserved: true, preferencesStillOff: true }, null, 2))
  console.log('OK enlace frío de preferencias y comunidad en caliente; sesión QA2 conservada.')
} finally { if (c) { await c.evaluate("location.hash='#/lobby'").catch(() => {}); c.close() } }
