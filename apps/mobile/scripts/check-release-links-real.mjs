// App Links del dominio público: Android elige la app sin forzar paquete.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { connectReleaseDevice, releaseDevice } from './release-device.mjs'
const serial = process.env.ANDROID_QA_SERIAL, pkg = 'ar.com.trucazo.app'
assert.ok(serial, 'Indicar ANDROID_QA_SERIAL')
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const pause = ms => new Promise(r => setTimeout(r, ms))
const wait = async (c, expression) => {
  for (let i = 0; i < 120; i++) { if (await c.evaluate(expression)) return; await pause(150) }
  throw Error('El destino del enlace no apareció')
}
const open = path => {
  const result = adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
    '-c', 'android.intent.category.BROWSABLE', '-d', "'https://www.trucazo.com.ar" + path + "'"])
  assert.ok(result.includes('Activity: ' + pkg + '/'), 'Android debe elegir el paquete final')
  return { androidChoseFinalPackage: true, cold: result.includes('LaunchState: COLD') }
}
const coldScreen = async (text, name) => {
  for (let i = 0; i < 10; i++) {
    adb(['shell', 'uiautomator', 'dump', '/sdcard/android17-links.xml'])
    const xml = adb(['shell', 'cat', '/sdcard/android17-links.xml'])
    // Sólo comprobar el texto esperado de nuestra app; no guardar el árbol del sistema.
    if (xml.includes('package="' + pkg + '"') && xml.includes(text)) {
      await writeFile('android/generated/android-17-links-' + name + '-20.png',
        execFileSync(process.env.ADB, ['-s', serial, 'exec-out', 'screencap', '-p']))
      adb(['shell', 'rm', '/sdcard/android17-links.xml']); return
    }
    await pause(400)
  }
  throw Error('La pantalla fría de Trucazo no mostró el destino esperado')
}
const result = { scope: 'Redmi/Android16, APK20 firmado, asociación pública real; códigos de rechazo sintéticos sin credenciales', checks: [] }
const c = await connectReleaseDevice()
const gamePath = '/game/11111111-1111-4111-8111-111111111111'
result.checks.push({ kind: 'warm_game', ...open(gamePath) })
await wait(c, `location.hash==='#${gamePath}'&&document.body.innerText.includes('no está disponible')`)
open('/auth/mobile?flow=google&nonce=11111111-1111-4111-8111-111111111111&code=fixture-code')
await wait(c, "document.querySelector('[role=alert]')?.innerText.includes('no corresponde')")
result.checks.push({ kind: 'warm_unrequested_callback', safelyRejected: true })
await c.stop(); await pause(1500)
adb(['shell', 'am', 'force-stop', pkg])
result.checks.push({ kind: 'cold_community', ...open('/comunidad') })
await coldScreen('MIS AMIGOS', 'cold-community')
result.checks.at(-1).nativeDestinationLoaded = true
adb(['shell', 'am', 'force-stop', pkg])
result.checks.push({ kind: 'cold_unrequested_recovery', ...open('/auth/mobile?flow=recovery&nonce=11111111-1111-4111-8111-111111111111&code=fixture-code') })
await coldScreen('no corresponde', 'cold-callback')
result.checks.at(-1).safelyRejected = true
// La instrumentación inicia otra instancia: reconectarla sólo después de observar el arranque frío.
const cold = await releaseDevice({ serial, port: 9238 })
try {
  await cold.evaluate("location.hash='#/lobby'")
  await wait(cold, "document.body.innerText.includes('Mesas disponibles')")
  result.passed = true
  await writeFile('android/generated/android-17-phone-links-20.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await cold.close() }
