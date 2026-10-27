// Falla controlada sólo de set_avatar_url: upload y limpieza reales de QA2.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const qa = await loadQaAccounts(), owner = qa.accounts[1].id
const admin = createClient(qa.projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const adb = args => execFileSync(process.env.ADB, ['-s', 'emulator-5554', ...args], { encoding: 'utf8' })
const c = await deviceCDP(), pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function wait(test) { for (let i = 0; i < 100; i++) { if (await test()) return; await pause(150) } throw Error('No llegó la respuesta esperada de la subida') }
const files = async () => { const result = await admin.storage.from('avatars').list(owner); assert.equal(result.error, null); return result.data.map(row => row.name).sort() }
try {
  assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), owner)
  const before = await files()
  await c.evaluate("location.hash='#/profile'"); await wait(() => c.evaluate("!!document.querySelector('button[title=\"Subir foto\"]')"))
  c.onEvent(event => {
    if (event.method !== 'Fetch.requestPaused') return
    const { requestId, request } = event.params
    void c.send('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'OPTIONS' ? 204 : 400,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'https://localhost' }, { name: 'Access-Control-Allow-Headers', value: 'apikey,authorization,x-client-info,content-type,x-supabase-api-version' }, { name: 'Access-Control-Allow-Methods', value: 'POST,OPTIONS' }],
      body: Buffer.from(JSON.stringify({ message: 'Fallo controlado del ensayo Android' })).toString('base64') })
  })
  await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.supabase.co/rest/v1/rpc/set_avatar_url', requestStage: 'Request' }] })
  await c.send('Runtime.evaluate', { expression: "document.querySelector('button[title=\"Subir foto\"]').click()", userGesture: true })
  await pause(600); adb(['shell', 'uiautomator', 'dump', '/sdcard/android-11-picker.xml'])
  const xml = adb(['shell', 'cat', '/sdcard/android-11-picker.xml'])
  const bounds = /<node[^>]*text="android-11-prueba.png"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml)
  assert.ok(bounds, 'Dejar Descargas en vista Lista con la imagen de prueba visible')
  adb(['shell', 'input', 'tap', String(Math.round((+bounds[1] + +bounds[3]) / 2)), String(Math.round((+bounds[2] + +bounds[4]) / 2))])
  for (const key of ['19', '20', '66']) adb(['shell', 'input', 'keyevent', key])
  await wait(() => c.evaluate("document.body.innerText.includes('No se pudo subir la foto')"))
  assert.deepEqual(await files(), before)
  const profile = await admin.from('profiles').select('avatar_url').eq('id', owner).single(); assert.equal(profile.data.avatar_url, null)
  await writeFile('android/generated/android-11-avatar-failure.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const report = JSON.parse(await readFile('android/generated/android-11-images.json'))
  report.avatarFailedCommit = { actualNativePicker: true, uploadReal: true, rpcFailureSimulated: true, orphanRemoved: true, originalPreserved: true }
  await writeFile('android/generated/android-11-images.json', JSON.stringify(report, null, 2)); console.log('OK fallo controlado al guardar foto: original intacta y archivo temporal retirado.')
} finally { await c.send('Fetch.disable').catch(() => {}); c.close() }
