import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { deviceCDP } from './device-cdp.mjs'

// Sólo el APK debug ya ingresado personalmente. No imprime ni exporta tokens.
const run = promisify(execFile)
const adb = (...args) => run(process.env.ADB, ['-s', 'emulator-5580', ...args], { windowsHide: true })
const pause = () => new Promise(resolve => setTimeout(resolve, 1000))
let connection = await deviceCDP()
const read = markExpired => connection.evaluate(`(async()=>{
  const session=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null');
  if(!session) return null;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(session.access_token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const result={userId:session.user.id,expiresAt:session.expires_at,digest};
  if(${markExpired}){session.expires_at=Math.floor(Date.now()/1000)-10;localStorage.setItem('trucazo:mobile:auth:v1',JSON.stringify(session));}
  return result;
})()`)
try {
  const before = await read(true)
  assert.ok(before, 'Entrar personalmente antes de comprobar la renovación.')
  // Dar al WebView tiempo para confirmar localStorage antes de matar el proceso.
  await adb('shell', 'input', 'keyevent', '3')
  await pause()
  connection.close()
  await adb('shell', 'am', 'force-stop', 'ar.com.trucazo.capacitor.dev')
  await adb('shell', 'am', 'start', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-n', 'ar.com.trucazo.capacitor.dev/.MainActivity')
  await pause()
  const { stdout } = await adb('shell', 'pidof', 'ar.com.trucazo.capacitor.dev')
  await adb('forward', 'tcp:9224', 'localabstract:webview_devtools_remote_' + stdout.trim())
  for (let attempt = 0; attempt < 30; attempt++) {
    try { connection = await deviceCDP(); break } catch { await pause() }
  }
  let after
  for (let attempt = 0; attempt < 30; attempt++) {
    after = await read(false)
    if (after?.expiresAt > before.expiresAt) break
    await pause()
  }
  assert.equal(after?.userId, before.userId)
  assert.ok(after.expiresAt > before.expiresAt, 'La sesión no fue renovada por el servidor.')
  assert.notEqual(after.digest, before.digest)
  const result = { userId:after.userId,expiresBefore:before.expiresAt,expiresAfter:after.expiresAt,tokenRotated:true,
    method:'Vencimiento local adelantado; cierre y reapertura del APK; renovación Supabase real.' }
  await writeFile('android/generated/android-03-device-renewal.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { connection.close() }
