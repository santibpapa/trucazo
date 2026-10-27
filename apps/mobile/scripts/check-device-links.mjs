// APK debug real: intents Android y formulario normal. No crea mesas ni resultados.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
const adb = process.env.ADB, serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554'
assert.ok(adb, 'Cargar scripts/android-env.ps1')
const pkg = 'ar.com.trucazo.capacitor.dev', scheme = pkg + '://auth/callback'
const gamePath = '/game/11111111-1111-4111-8111-111111111111'
const qa = (await loadQaAccounts()).accounts[1]
const command = args => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8' })
let c
async function connect() {
  for (let i = 0; i < 50; i++) {
    let pid = ''
    try { pid = command(['shell', 'pidof', pkg]).trim() } catch { /* Proceso todavía iniciando. */ }
    if (/^\d+$/.test(pid)) {
      command(['forward', 'tcp:9224', 'localabstract:webview_devtools_remote_' + pid])
      try { c = await deviceCDP(); return } catch { /* WebView todavía inicia. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('El APK no abrió su WebView.')
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await c.evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('La pantalla esperada no apareció.')
}
async function intent(uri, cold = false, resolveManifest = false) {
  if (cold) { c?.close(); command(['shell', 'am', 'force-stop', pkg]); c = null }
  command(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.BROWSABLE', '-d', "'" + uri + "'", ...(resolveManifest ? ['-p', pkg] : ['-n', pkg + '/.MainActivity'])])
  if (!c) await connect()
}
const click = label => c.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()===${JSON.stringify(label)})?.click()`)
async function shot(name) {
  const result = await c.send('Page.captureScreenshot', { format: 'png' })
  await writeFile('android/generated/android-07-' + name + '.png', Buffer.from(result.data, 'base64'))
}
try {
  await connect()
  assert.equal(await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id`), qa.id)
  await intent('https://www.trucazo.com.ar' + gamePath, false, true)
  await wait(`location.hash===${JSON.stringify('#' + gamePath)}&&document.querySelector('[role=alert]')?.innerText.includes('no está disponible')`)
  await shot('native-game-unavailable')
  await intent(scheme + '?flow=google&nonce=11111111-1111-4111-8111-111111111111&code=fixture-code')
  await wait(`document.querySelector('[role=alert]')?.innerText.includes('no corresponde')`)
  await shot('native-unrequested-callback')
  await click('Volver')
  await intent('https://evil.invalid' + gamePath)
  await wait(`document.querySelector('[role=alert]')?.innerText.includes('no es de Trucazo')`)
  await click('Volver')
  await intent('https://www.trucazo.com.ar/torneos/11111111-1111-4111-8111-111111111111', true, true)
  await wait(`location.hash==='#/torneos/11111111-1111-4111-8111-111111111111'&&document.body.innerText.includes('próxima versión')`)
  await shot('native-tournament-cold')
  await intent(scheme + '?flow=recovery&nonce=11111111-1111-4111-8111-111111111111&code=fixture-code', true)
  await wait(`document.querySelector('[role=alert]')?.innerText.includes('no corresponde')`)
  await click('Volver')
  await c.evaluate(`location.hash='#/lobby'`)
  await wait(`!!document.querySelector('header')`)
  await click('Perfil'); await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText.trim()==='Cerrar sesión')`)
  await click('Cerrar sesión'); await wait(`!!document.querySelector('input[name=identifier]')`)
  await intent('https://www.trucazo.com.ar' + gamePath, false, true)
  await wait(`!!document.querySelector('input[name=identifier]')&&location.hash===${JSON.stringify('#' + gamePath)}`)
  // Reutilizar QA2; no importar una sesión de otra superficie.
  await c.evaluate(`(()=>{
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(const [name,value] of ${JSON.stringify([['identifier', qa.email], ['password', qa.password]])}){
      const input=document.querySelector('input[name='+name+']');set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    setTimeout(()=>Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Iniciar sesión'&&!b.disabled)?.click(),0);
  })()`)
  await wait(`location.hash===${JSON.stringify('#' + gamePath)}&&JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id===${JSON.stringify(qa.id)}&&document.querySelector('[role=alert]')?.innerText.includes('no está disponible')`)
  await shot('native-destination-after-login')
  await c.evaluate(`location.hash='#/lobby'`); await wait(`!!document.querySelector('header')`)
  const result = { scope: 'APK 0.6.0/Android 11, enlaces válidos resueltos por manifest dentro del paquete; ataques enviados a la actividad. No acredita asociación pública del dominio', owner: qa.id, warmGameLink: true, coldTournamentLink: true, manifestResolvedGameAndTournament: true, coldAndWarmCallbackRejected: true, foreignHostRejected: true, destinationAfterPasswordLogin: true, qaSessionRetained: true, newGames: 0 }
  await writeFile('android/generated/android-07-native-links.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} catch (failure) {
  console.error('Enlaces instalados: ' + failure.message.replaceAll(qa.password, '[privado]').replaceAll(qa.email, '[correo QA]')); process.exitCode = 1
} finally { c?.close() }
