// Medición del APK debug instalado. No vuelca tokens, cuerpos ni mensajes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'

const serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554'
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const name = process.argv[2] || 'android-14-runtime'
assert.match(name, /^android-14-[a-z0-9-]+$/)
const c = await deviceCDP(), requests = [], bytes = [], socketFrames = []
const metrics = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]))
const sample = async label => {
  const a = await metrics(), requestStart = requests.length, byteStart = bytes.length, frameStart=socketFrames.length, started = Date.now()
  await new Promise(resolve => setTimeout(resolve, 20000))
  const b = await metrics()
  return { label, seconds: (Date.now() - started) / 1000, mainThreadMs: (b.TaskDuration - a.TaskDuration) * 1000,
    scriptMs: (b.ScriptDuration - a.ScriptDuration) * 1000, layouts: b.LayoutCount - a.LayoutCount,
    styleRecalculations: b.RecalcStyleCount - a.RecalcStyleCount, heapMiB: b.JSHeapUsedSize / 1048576,
    requests: requests.slice(requestStart), receivedBytes: bytes.slice(byteStart).reduce((sum, n) => sum + n, 0),
    socketFrames: {sent:socketFrames.slice(frameStart).filter(f=>f.sent).length,received:socketFrames.slice(frameStart).filter(f=>!f.sent).length,bytes:socketFrames.slice(frameStart).reduce((sum,f)=>sum+f.bytes,0)} }
}
try {
  const device = { serial, model: adb(['shell', 'getprop', 'ro.product.model']).trim(),
    android: adb(['shell', 'getprop', 'ro.build.version.release']).trim(), api: adb(['shell', 'getprop', 'ro.build.version.sdk']).trim(),
    userAgent: await c.evaluate('navigator.userAgent'), viewport: await c.evaluate('[innerWidth,innerHeight]') }
  await c.send('Performance.enable'); await c.send('Network.enable')
  c.onEvent(event => {
    if (event.method === 'Network.requestWillBeSent') {
      const url = new URL(event.params.request.url)
      if (url.origin !== 'https://localhost') requests.push({ method: event.params.request.method, path: url.pathname })
    }
    if (event.method === 'Network.loadingFinished') bytes.push(event.params.encodedDataLength)
    if (['Network.webSocketFrameSent','Network.webSocketFrameReceived'].includes(event.method)) {
      const frame=event.params.response;socketFrames.push({sent:event.method.endsWith('Sent'),bytes:Buffer.byteLength(frame.payloadData,frame.opcode===2?'base64':'utf8')})
    }
  })
  const foreground = process.argv.includes('--background-only') ? null : await sample('lobby visible en reposo')
  const transitionStart=Date.now()
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
  for(let i=0;i<100;i++){if(await c.evaluate('document.hidden'))break;await new Promise(resolve=>setTimeout(resolve,100))}
  await new Promise(resolve=>setTimeout(resolve,1000))
  const backgroundSettledMs=Date.now()-transitionStart
  const background = await sample('otra app en primer plano')
  const memory = adb(['shell', 'dumpsys', 'meminfo', 'ar.com.trucazo.capacitor.dev']).split('\n')
    .filter(line => /TOTAL PSS:|TOTAL RSS:|TOTAL SWAP PSS:/.test(line)).map(line => line.trim())
  const report = { checkedAt: new Date().toISOString(), device, foreground, background, backgroundSettledMs, memory,
    battery: 'Emulador: consumo eléctrico no representativo; medir en teléfono físico.' }
  await writeFile('android/generated/' + name + '.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  c.close(); adb(['shell', 'am', 'start', '-n', 'ar.com.trucazo.capacitor.dev/.MainActivity'])
}
