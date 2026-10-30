// Baja real por UI/HTTPS; los enlaces tardíos son intents sintéticos, no nuevos avisos FCM.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { connectReleaseDevice } from './release-device.mjs'
import { releaseQaLogin } from './release-qa-login.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
const c = await connectReleaseDevice(), qa = (await loadQaAccounts()).accounts
const serial = process.env.ANDROID_QA_SERIAL
assert.ok(serial, 'Indicar ANDROID_QA_SERIAL')
const pause = ms => new Promise(r => setTimeout(r, ms))
const wait = async expression => {
  for (let i = 0; i < 150; i++) { if (await c.evaluate(expression)) return; await pause(150) }
  throw Error('La pantalla esperada no apareció: ' + expression)
}
const click = label => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled);if(!b)return false;b.click();return true})()`)
const state = () => c.evaluate('(async()=>{const session=JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")||"null"),n=await Capacitor.Plugins.PushBinding.state({owner:session?.user.id||""});return {session:session?.user.id||null,owner:n.owner,consented:n.consented,allowed:n.allowed,delivered:(await Capacitor.Plugins.PushNotifications.getDeliveredNotifications()).notifications.length}})()')
const notifyIntent = (owner, expires) => {
  const id = randomUUID()
  execFileSync(process.env.ADB, ['-s', serial, 'shell', 'am', 'start',
    '-n', 'ar.com.trucazo.app/ar.com.trucazo.capacitor.dev.MainActivity', '--es', 'google.message_id', id,
    '--es', 'event', id, '--es', 'user', owner, '--es', 'path', '/comunidad', '--es', 'expires', String(expires)], { stdio: 'pipe' })
}
await releaseQaLogin(1)
await c.evaluate('(async()=>{try{window.__acceptanceWakeLock=await navigator.wakeLock.request("screen")}catch{}return true})()')
await c.evaluate("location.hash='#/notificaciones'")
await wait("document.body.innerText.includes('Apagar en este dispositivo')")
assert.ok(await click('Apagar en este dispositivo'))
await wait("document.body.innerText.includes('Apagados en este dispositivo')")
const off = await state()
assert.equal(off.session, qa[0].id); assert.equal(off.owner, ''); assert.equal(off.consented, false); assert.equal(off.delivered, 0)
await c.evaluate("location.hash='#/lobby'"); await wait("document.body.innerText.includes('Mesas disponibles')")
await c.evaluate("location.hash='#/notificaciones'"); await wait("document.body.innerText.includes('Activar notificaciones')")
assert.ok(await click('Activar notificaciones')); await wait("document.body.innerText.includes('Activados en este dispositivo')")
await releaseQaLogin(2)
const accountB = await state(); assert.equal(accountB.session, qa[1].id); assert.equal(accountB.owner, '')
notifyIntent(qa[0].id, Math.floor(Date.now() / 1000) + 300)
await wait("document.body.innerText.includes('Ese aviso pertenece a otra cuenta.')")
assert.ok(await click('Volver'))
await releaseQaLogin(1)
notifyIntent(qa[0].id, 1)
await wait("document.body.innerText.includes('Ese aviso ya venció.')")
assert.ok(await click('Volver'))
await wait("location.hash==='#/comunidad'&&document.body.innerText.includes('MIS AMIGOS')")
await c.evaluate("location.hash='#/notificaciones'")
await wait("document.body.innerText.includes('Activados en este dispositivo')||document.body.innerText.includes('Activar notificaciones')")
if (await c.evaluate("document.body.innerText.includes('Activar notificaciones')")) {
  assert.ok(await click('Activar notificaciones')); await wait("document.body.innerText.includes('Activados en este dispositivo')")
}
const restored = await state(); assert.equal(restored.owner, qa[0].id); assert.equal(restored.consented, true)
await c.evaluate("location.hash='#/lobby'"); await wait("document.body.innerText.includes('Mesas disponibles')")
const result = { scope: 'Redmi/APK20, controles normales y HTTPS reales; sólo los intents tardíos son sintéticos',
  off, canPlayWithDevicePushOff: true, accountB, wrongAccountIntentRejected: true,
  expiredIntentExplained: true, currentCommunityOpened: true, restored }
await writeFile('android/generated/android-17-phone-push-edges-20.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
