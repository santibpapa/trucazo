// Mensajes QA reales por FCM para las guardas Android. No genera eventos de producto.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
import { sendFcm, type PushJob } from '../../../src/lib/native-push/send'
const port = Number(process.argv[3] || 9224), mode = process.argv[2] || 'guards'
const serial = port === 9225 ? 'emulator-5556' : 'emulator-5554', pkg = 'ar.com.trucazo.capacitor.dev'
const adb = (args: string[]) => execFileSync(process.env.ADB || 'adb', ['-s', serial, ...args])
let c: Awaited<ReturnType<typeof deviceCDP>>
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function state() {
  return c.evaluate(`(async()=>{const p=await Capacitor.Plugins.PushBinding.state({owner:JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id});return {user:p.owner,installation:p.installation,binding:p.binding}})()`)
}
async function token() {
  return c.evaluate(`(async()=>{let h;const value=new Promise((resolve,reject)=>{setTimeout(()=>reject(Error('FCM no registró el dispositivo')),20000);Capacitor.Plugins.PushNotifications.addListener('registration',t=>resolve(t.value)).then(v=>{h=v;return Capacitor.Plugins.PushNotifications.register()}).catch(reject)});try{return await value}finally{await h?.remove()}})()`)
}
const delivered = () => c.evaluate('(async()=>(await Capacitor.Plugins.PushNotifications.getDeliveredNotifications()).notifications.map(n=>n.tag))()')
async function expectVisible(event: string) { for (let i = 0; i < 80; i++) { if ((await delivered()).includes(event)) return; await pause(150) } throw Error('No apareció el aviso QA') }
async function send(job: PushJob) { assert.equal((await sendFcm(job)).result, 'sent') }
function record(event: string) {
  const dump = adb(['shell', 'dumpsys', 'notification', '--noredact']).toString()
  const blocks = dump.split(/(?=NotificationRecord\()/)
  const selected = blocks.find(b => b.slice(0, 500).includes('tag=' + event))
  assert.ok(selected, 'Debe estar el aviso Android real')
  const time = selected.match(/mUpdateTimeMs=(\d+)/)?.[1] || selected.match(/postTime=(\d+)/)?.[1]
  assert.ok(time, 'Medir publicación para distinguir reaviso de una sola tarjeta')
  return time
}
async function main() {
  c = await deviceCDP({ port })
try {
  const identity = await state(), firstToken = await token()
  assert.ok(identity.user && identity.binding)
  const payload = (event = randomUUID()) => ({ ...identity, event, kind: 'invite', expires: String(Math.floor(Date.now() / 1000) + 180),
    title: 'Te invitaron a jugar', body: 'Verificación privada ANDROID-13.', path: '/comunidad' })
  const job = (data: Record<string, string>, target = firstToken): PushJob => ({ id: randomUUID(), lease: randomUUID(), attempts: 1, token: target, data })
  const passed: string[] = []
  if (mode === 'guards') {
    const data = payload(), message = job(data)
    await send(message); await expectVisible(data.event)
    const before = record(data.event)
    await send(message); await send(message); await pause(1800)
    assert.equal(record(data.event), before)
    passed.push('mismo evento enviado tres veces por FCM: una publicación Android, sin reaviso')
    const wrong = payload(); wrong.user = 'b00d207b-8d36-4b59-8479-346b91ce762d'
    await send(job(wrong)); await pause(1200); assert.ok(!(await delivered()).includes(wrong.event))
    passed.push('FCM real con destinatario de otra cuenta descartado por Android')
    const expired = payload(), originalFetch = globalThis.fetch
    globalThis.fetch = (async (input, init) => {
      if (String(input).includes('fcm.googleapis.com')) {
        const body = JSON.parse(String(init?.body)); body.message.data.expires = '1'
        return originalFetch(input, { ...init, body: JSON.stringify(body) })
      }
      return originalFetch(input, init)
    }) as typeof fetch
    try { await send(job(expired)) } finally { globalThis.fetch = originalFetch }
    await pause(1200); assert.ok(!(await delivered()).includes(expired.event))
    const control = payload(); await send(job(control)); await expectVisible(control.event)
    passed.push('mensaje con vencimiento alterado en el ensayo viajó por FCM y no se mostró; control posterior recibido')
    await writeFile('android/generated/android-13-old-envelope.json', JSON.stringify(identity, null, 2))
  } else if (mode === 'preference') {
    const off = payload(); await send(job(off)); await pause(1500)
    assert.ok(!(await delivered()).includes(off.event))
    const control = { ...payload(), kind: 'checkin' }; await send(job(control)); await expectVisible(control.event)
    passed.push('invitaciones apagadas desde UI no se muestran; otra categoría recibe control real')
  } else if (mode === 'renew') {
    await c.evaluate('Capacitor.Plugins.PushNotifications.unregister()'); await pause(1500)
    const renewed = await token(); assert.notEqual(renewed, firstToken)
    await pause(1200)
    const data = payload(); await send(job(data, renewed)); await expectVisible(data.event)
    passed.push('token FCM borrado/renovado realmente; token distinto y recepción conservada')
    console.log(JSON.stringify({ tokenChanged: true, tokenSha256: createHash('sha256').update(renewed).digest('hex') }))
  } else if (mode === 'previous-account') {
    const previous = JSON.parse(await readFile('android/generated/android-13-old-envelope.json', 'utf8'))
    assert.notEqual(previous.user, identity.user)
    const stale = { ...payload(), ...previous }
    await send(job(stale)); await pause(1500); assert.ok(!(await delivered()).includes(stale.event))
    const valid = payload(); await send(job(valid)); await expectVisible(valid.event)
    passed.push('cuenta B recibe sólo su aviso; sobre tardío de A enviado al token actual no aparece')
  } else if (mode === 'closed') {
    const data = payload(), message = job(data)
    c.close()
    adb(['shell', 'cmd', 'statusbar', 'collapse']); adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
    await pause(1000)
    adb(['shell', 'am', 'kill', pkg])
    let running = ''
    for (let i = 0; i < 20; i++) {
      try { running = adb(['shell', 'pidof', pkg]).toString().trim() } catch (failure: any) { if (failure.status !== 1) throw failure; running = '' }
      if (!running) break
      await pause(150)
    }
    assert.equal(running, '')
    await send(message); await pause(1800)
    adb(['shell', 'cmd', 'statusbar', 'expand-notifications']); adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-closed.xml'])
    const xml = adb(['shell', 'cat', '/sdcard/trucazo-push-closed.xml']).toString()
    assert.ok(xml.includes('Verificación privada ANDROID-13.'))
    await writeFile('android/generated/android-13-received-closed.png', adb(['exec-out', 'screencap', '-p']))
    passed.push('aviso FCM visible con WebView/proceso cerrado en segundo plano, sin force-stop')
  } else throw Error('Modo desconocido')
  await writeFile('android/generated/android-13-' + mode + '.json', JSON.stringify({ environment: 'FCM y APK reales; mensajes QA dirigidos sólo a la instalación propia, emisor local', port, passed }, null, 2))
  console.log('OK', passed.join('; '))
} finally { c.close() }
}
void main().catch(error => { console.error('Prueba de guardas push: ' + error.message); process.exitCode = 1 })
