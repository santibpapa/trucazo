// Salida/baja y enlaces tardíos con las QA existentes; no cambia sus guardados.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const mode = process.argv[2], port = Number(process.argv[3] || 9224), c = await deviceCDP({ port })
const adb = args => execFileSync(process.env.ADB || 'adb', ['-s', port === 9225 ? 'emulator-5556' : 'emulator-5554', ...args])
const wait = async predicate => { for (let i = 0; i < 120; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 150)) } throw Error('No llegó el estado de cuenta esperado') }
const click = name => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`)
const shot = async name => writeFile('android/generated/android-13-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
try {
  if (mode === 'off') {
    await c.evaluate("location.hash='#/notificaciones'")
    await wait(() => c.evaluate("document.body.innerText.includes('Apagar en este dispositivo')"))
    assert.ok(await click('Apagar en este dispositivo'))
    await wait(() => c.evaluate("document.body.innerText.includes('Apagados en este dispositivo')"))
    const state = await c.evaluate('(async()=>{const s=JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")),n=await Capacitor.Plugins.PushBinding.state({owner:s.user.id}),d=await Capacitor.Plugins.PushNotifications.getDeliveredNotifications();return {logged:!!s,consented:n.consented,bound:!!n.owner,delivered:d.notifications.length}})()')
    assert.deepEqual(state, { logged: true, consented: false, bound: false, delivered: 0 })
    await shot('device-off'); console.log(JSON.stringify({ deviceOff: true, sessionPreserved: true, notificationsCleared: true }))
  } else if (mode === 'logout') {
    adb(['shell', 'cmd', 'statusbar', 'collapse'])
    await c.evaluate("location.hash='#/lobby'")
    await wait(() => c.evaluate("!!document.querySelector('button[aria-label=Perfil]')"))
    assert.ok(await click('Perfil'))
    await wait(() => c.evaluate("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Cerrar sesión')"))
    assert.ok(await click('Cerrar sesión'))
    await wait(() => c.evaluate("!!document.querySelector('input[name=password]')"))
    const state = await c.evaluate('(async()=>{const n=await Capacitor.Plugins.PushBinding.state({owner:""}),d=await Capacitor.Plugins.PushNotifications.getDeliveredNotifications();return {session:!!localStorage.getItem("trucazo:mobile:auth:v1"),bound:!!n.owner,delivered:d.notifications.length}})()')
    assert.deepEqual(state, { session: false, bound: false, delivered: 0 })
    console.log(JSON.stringify({ logout: true, serverUnregisterRequested: true, nativeCleared: true }))
  } else if (mode === 'no-session') {
    assert.equal(await c.evaluate("!!document.querySelector('input[name=password]')"), true)
    const old = JSON.parse(await readFile('android/generated/android-13-old-envelope.json', 'utf8')), event = randomUUID()
    adb(['shell', 'am', 'start', '-n', 'ar.com.trucazo.capacitor.dev/.MainActivity', '--es', 'google.message_id', event,
      '--es', 'event', event, '--es', 'user', old.user, '--es', 'path', '/comunidad', '--es', 'expires', String(Math.floor(Date.now() / 1000) + 300)])
    await wait(() => c.evaluate("location.hash==='#/login'&&!!document.querySelector('input[name=password]')"))
    await shot('notice-without-session'); console.log(JSON.stringify({ oldIntentWithoutSession: true, loginRequired: true }))
  } else if (mode === 'wrong-login') {
    await wait(() => c.evaluate("document.body.innerText.includes('Ese aviso pertenece a otra cuenta.')"))
    assert.ok(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id==='ebf2c130-304d-431f-9754-110715ca2892'"))
    await shot('notice-wrong-account'); assert.ok(await click('Volver'))
    await wait(() => c.evaluate("document.body.innerText.includes('androidqa2')"))
    console.log(JSON.stringify({ accountB: true, previousAccountDestinationRejected: true }))
  } else if (mode === 'expired') {
    const owner = await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), event = randomUUID()
    adb(['shell', 'am', 'start', '-n', 'ar.com.trucazo.capacitor.dev/.MainActivity', '--es', 'google.message_id', event,
      '--es', 'event', event, '--es', 'user', owner, '--es', 'path', '/comunidad', '--es', 'expires', '1'])
    await wait(() => c.evaluate("document.body.innerText.includes('Ese aviso ya venció.')"))
    await shot('notice-expired'); assert.ok(await click('Volver'))
    await wait(() => c.evaluate("location.hash==='#/comunidad'&&document.body.innerText.toLowerCase().includes('mis amigos')"))
    console.log(JSON.stringify({ expiredExplained: true, currentCommunityOpened: true }))
  } else throw Error('Modo no reconocido')
} finally { c.close() }
