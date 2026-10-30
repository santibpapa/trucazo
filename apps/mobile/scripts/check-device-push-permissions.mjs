// Permisos reales de la app QA en el segundo emulador; no toca guardados ni envía avisos.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const adb = (args, options = {}) => execFileSync(process.env.ADB || 'adb', ['-s', 'emulator-5556', ...args], options)
const c = await deviceCDP({ port: 9225 })
try {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
  adb(['shell', 'wm', 'dismiss-keyguard'])
  const before = await c.evaluate('(async()=>({permission:await Capacitor.Plugins.PushNotifications.checkPermissions(),route:location.hash}))()')
  assert.ok(['prompt', 'prompt-with-rationale', 'denied'].includes(before.permission.receive))
  if (!await c.evaluate('window.__qaPushPermission')) {
  await c.evaluate('if(!Object.hasOwn(window,"__qaPushPermission")){window.__qaPushPermission=null;void Capacitor.Plugins.PushNotifications.requestPermissions().then(p=>{window.__qaPushPermission=p.receive})};true')
  adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-permission.xml'])
  const xml = adb(['shell', 'cat', '/sdcard/trucazo-push-permission.xml'], { encoding: 'utf8' })
  const deny = xml.match(/<node[^>]*resource-id="[^"]*permission_deny_button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  assert.ok(deny, 'Debe aparecer el permiso real de Android')
  await writeFile('android/generated/android-13-permission-prompt.png', adb(['exec-out', 'screencap', '-p']))
  adb(['shell', 'input', 'tap', String(Math.floor((Number(deny[1]) + Number(deny[3])) / 2)), String(Math.floor((Number(deny[2]) + Number(deny[4])) / 2))])
  for (let i = 0; i < 50; i++) { if (await c.evaluate('window.__qaPushPermission!==null')) break; await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  assert.ok(['denied', 'prompt-with-rationale'].includes(await c.evaluate('window.__qaPushPermission')))
  const after = await c.evaluate('(async()=>{const b=await Capacitor.Plugins.PushBinding.state({owner:JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")).user.id});return {allowed:b.allowed,consented:b.consented,owner:!!b.owner,screen:document.body.innerText.includes("Mesas disponibles")}})()')
  assert.equal(after.allowed, false); assert.equal(after.consented, false); assert.equal(after.owner, false); assert.equal(after.screen, true)
  await writeFile('android/generated/android-13-permission-denied.png', adb(['exec-out', 'screencap', '-p']))
  await writeFile('android/generated/android-13-permissions.json', JSON.stringify({ environment: 'Android 16/API36, emulador QA secundario', prompt: true, denied: true, canUseLobby: true, nativeUnbound: true }, null, 2))
  console.log('OK permiso Android real denegado, lobby usable y dispositivo sin alta push; aceptación se comprueba después desde la pantalla normal.')
} finally { c.close() }
