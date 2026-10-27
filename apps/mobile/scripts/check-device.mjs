// Diagnóstico del APK debug mediante el puerto adb forward documentado en README.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

let target
const deadline = Date.now() + 10000
while (!target && Date.now() < deadline) {
  const targets = await fetch('http://127.0.0.1:9224/json/list').then(response => response.json()).catch(() => [])
  target = targets.find(page => page.type === 'page' && page.url.startsWith('https://localhost/'))
  if (!target) await new Promise(resolve => setTimeout(resolve, 250))
}
assert.ok(target, 'Abrir el APK y conectar su WebView al puerto 9224.')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let serial = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const reply = JSON.parse(event.data), request = pending.get(reply.id)
  if (request) {
    pending.delete(reply.id)
    clearTimeout(request.timer)
    reply.error ? request.reject(new Error(JSON.stringify(reply.error))) : request.resolve(reply.result)
  }
})
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('WebView no respondió: ' + method)) }, 10000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
try {
  const response = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `
    (async () => {
      await document.fonts.ready;
      const input = document.querySelector('input');
      return {
        origin: location.origin, path: location.pathname, online: navigator.onLine,
        platform: window.Capacitor.getPlatform(), userAgent: navigator.userAgent,
        viewport: [innerWidth, innerHeight], screen: [screen.width, screen.height],
        text: document.body.innerText,
        inputBackground: getComputedStyle(input).backgroundColor,
        fontFamily: getComputedStyle(input).fontFamily,
        resources: performance.getEntriesByType('resource').map(resource => resource.name),
        domReadyMs: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd
      };
    })()` })
  assert.ok(!response.exceptionDetails, JSON.stringify(response.exceptionDetails))
  const result = response.result.value
  assert.equal(result.origin, 'https://localhost')
  assert.equal(result.platform, 'android')
  assert.equal(result.inputBackground, 'rgb(26, 15, 16)')
  assert.match(result.fontFamily, /Geist/)
  assert.match(result.text, /Iniciar sesión/)
  assert.ok(result.resources.every(url => new URL(url).origin === result.origin))
  const offline = process.argv.includes('--offline')
  if (offline) { assert.equal(result.online, false); assert.match(result.text, /Sin conexión/) }
  const evidence = fileURLToPath(new URL('../../../android/generated/', import.meta.url))
  await mkdir(evidence, { recursive: true })
  const name = 'android-02-device-' + (offline ? 'offline' : 'online')
  await writeFile(evidence + name + '.json', JSON.stringify(result, null, 2))
  const screenshot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(evidence + name + '.png', Buffer.from(screenshot.data, 'base64'))
  console.log(JSON.stringify(result))
} finally { socket.close() }
