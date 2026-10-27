// Diagnóstico sólo del WebView debug. Nunca imprimir almacenamiento ni tokens.
export async function deviceCDP({ port = 9224, urlPrefix = 'https://localhost/', targetId } = {}) {
  const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(response => response.json())
  const target = targets.find(page => page.type === 'page' && (targetId ? page.id === targetId : page.url.startsWith(urlPrefix)))
  if (!target) throw new Error('Abrir el APK y conectar su WebView debug al puerto 9224.')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let serial = 0
  const pending = new Map()
  const listeners = new Set()
  socket.addEventListener('message', event => {
    const reply = JSON.parse(event.data)
    if (reply.method) { for (const listener of listeners) listener(reply); return }
    const request = pending.get(reply.id)
    if (!request) return
    pending.delete(reply.id); clearTimeout(request.timer)
    reply.error ? request.reject(new Error(reply.error.message)) : request.resolve(reply.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('WebView no respondió.')) }, 45000)
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }))
  })
  return { send, onEvent: listener => { listeners.add(listener); return () => listeners.delete(listener) }, close: () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('WebView cerrado.')) }
    pending.clear(); socket.close()
  }, evaluate: async expression => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (response.exceptionDetails) throw new Error('Falló el diagnóstico del WebView.')
    return response.result.value
  } }
}
