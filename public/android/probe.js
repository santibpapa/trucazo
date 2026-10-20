/* Prueba de arquitectura, aislada del futuro guardado de campaña. Sin tokens. */
const DB_NAME = 'trucazo-android-probe-v1'
const SUBSCRIBED = 'trucazo:android-probe-subscribed:v1'
const el = id => document.getElementById(id)
let fixture = null
let uploadedSubscription = null
let subscribed = false
const status = text => { el('status').textContent = text }

async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('fixture')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('No se pudo abrir el guardado local.'))
    request.onblocked = () => reject(new Error('Cerrá otras pestañas de esta prueba.'))
  })
}

async function stored(value) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('fixture', value ? 'readwrite' : 'readonly')
      const request = value ? tx.objectStore('fixture').put(value, 'active') : tx.objectStore('fixture').get('active')
      tx.oncomplete = () => resolve(value || request.result || null)
      tx.onerror = () => reject(new Error('No se pudo guardar. Revisá el espacio disponible.'))
      tx.onabort = () => reject(new Error('El guardado se interrumpió.'))
    })
  } finally { db.close() }
}

async function registration() {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador no admite la prueba.')
  await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
  return navigator.serviceWorker.ready
}

async function prepareShell() {
  const reg = await registration()
  await new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => reject(new Error('La descarga no terminó. Volvé a intentar.')), 15000)
    channel.port1.onmessage = event => {
      clearTimeout(timer)
      channel.port1.close()
      event.data?.ok ? resolve() : reject(new Error('La descarga no terminó. Volvé a intentar.'))
    }
    reg.active.postMessage({ type: 'ANDROID_PROBE_PREPARE' }, [channel.port2])
  })
}

async function account() {
  const response = await fetch('/api/android/probe', { cache: 'no-store' })
  if (!response.ok) throw new Error('Conectate e iniciá sesión con tu cuenta de administrador.')
  return response.json()
}

function render() {
  el('count').textContent = String(fixture?.count ?? 0)
  el('increment').disabled = !fixture
  el('subscribe').disabled = !fixture?.publicKey || !('PushManager' in window)
  for (const id of ['send', 'export', 'unsubscribe']) el(id).disabled = !subscribed
  el('send-file').disabled = !uploadedSubscription
  el('storage').textContent = fixture
    ? `Guardado listo. Almacenamiento persistente: ${fixture.persistent ? 'concedido' : 'no concedido por el navegador'}.`
    : 'Todavía no se preparó.'
}

function action(id, handler) {
  el(id).onclick = async () => {
    el(id).disabled = true
    try { await handler() } catch (error) { status(error.message || 'No se pudo completar la prueba.') }
    finally { el(id).disabled = false; render() }
  }
}

action('prepare', async () => {
  const identity = await account()
  await prepareShell()
  const persistent = await navigator.storage?.persist?.() ?? false
  fixture = await stored({ version: 1, userId: identity.userId, publicKey: identity.publicKey,
    count: fixture?.userId === identity.userId ? fixture.count : 0, persistent })
  status('Preparación completa. Ahora podés cerrar y reabrir sin conexión.')
})

action('increment', async () => {
  if (!fixture) throw new Error('Primero prepará la prueba con conexión.')
  fixture = await stored({ ...fixture, count: fixture.count + 1 })
  status('Guardado completo.')
})

action('subscribe', async () => {
  // Pedir permiso únicamente desde este toque explícito, nunca al abrir la app.
  if (!('Notification' in window) || await Notification.requestPermission() !== 'granted') {
    throw new Error('No se otorgó el permiso. Podés seguir jugando.')
  }
  const identity = await account()
  if (!identity.publicKey) throw new Error('Falta configurar la clave pública de prueba.')
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  const encoded = identity.publicKey.replace(/-/g, '+').replace(/_/g, '/')
  const key = Uint8Array.from(atob(encoded), char => char.charCodeAt(0))
  sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  localStorage.setItem(SUBSCRIBED, '1')
  subscribed = true
  status('Suscripción de prueba creada. Todavía no se envió ninguna notificación.')
})

async function send(subscription) {
  const response = await fetch('/api/android/probe', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'No se pudo enviar.')
  status('El proveedor aceptó el envío. Comprobá que la notificación apareció en el Android.')
}

action('send', async () => {
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub) throw new Error('Primero permití las notificaciones de prueba.')
  await send(sub.toJSON())
})

action('export', async () => {
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub) throw new Error('Primero permití las notificaciones de prueba.')
  const url = URL.createObjectURL(new Blob([JSON.stringify(sub.toJSON(), null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'trucazo-push-prueba.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  status('Archivo guardado. Es privado: usalo solo para probar tu dispositivo.')
})

el('subscription-file').onchange = async event => {
  uploadedSubscription = null
  try {
    const file = event.target.files[0]
    if (!file || file.size > 4096) throw new Error('Elegí el archivo de suscripción de prueba.')
    uploadedSubscription = JSON.parse(await file.text())
    el('send-file').disabled = false
  } catch (error) { el('send-file').disabled = true; status(error.message) }
}
action('send-file', async () => { if (uploadedSubscription) await send(uploadedSubscription) })

action('unsubscribe', async () => {
  const sub = await (await registration()).pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  localStorage.removeItem(SUBSCRIBED)
  subscribed = false
  status('Prueba dada de baja.')
})

void (async () => {
  try {
    fixture = await stored()
    render()
    // Al reconectar, no conservar el contador de otra cuenta o de una sesión cerrada.
    if (navigator.onLine) {
      const response = await fetch('/api/android/probe', { cache: 'no-store' }).catch(() => null)
      if (response?.ok) {
        const identity = await response.json()
        if (fixture && fixture.userId !== identity.userId) fixture = await stored({ ...fixture, userId: identity.userId, count: 0, publicKey: identity.publicKey })
      } else if (response?.status === 403) {
        fixture = null
        indexedDB.deleteDatabase(DB_NAME)
        status('Esta prueba requiere una cuenta de administrador.')
      }
    }
    render()
    const reg = await navigator.serviceWorker.getRegistration('/')
    if (reg && localStorage.getItem(SUBSCRIBED) && await reg.pushManager.getSubscription()) {
      subscribed = true
      render()
    }
  } catch (error) { status(error.message) }
})()
