// Solo guarda una pantalla pública y autocontenida. Nunca cachear HTML de
// Next, sesiones, RPCs, cartas, perfiles ni respuestas de partidas online.
// Subir la versión cuando cambie offline.html; la campaña tendrá otra caché.
const SHELL_CACHE_PREFIX = 'trucazo-shell-'
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}v1`
const OFFLINE_URL = '/offline.html'
// Solo la prueba optativa. La campaña tendrá su propio formato y caché.
const PROBE_CACHE = 'trucazo-android-probe-v1'
const PROBE_FILES = ['/android/probe.html', '/android/probe.js']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE)
    await cache.add(new Request(OFFLINE_URL, { cache: 'reload', credentials: 'omit' }))
    // No sustituir al worker anterior si la descarga falla.
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter(name => name.startsWith(SHELL_CACHE_PREFIX) && name !== SHELL_CACHE)
      .map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method === 'GET' && url.origin === self.location.origin && PROBE_FILES.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const saved = await (await caches.open(PROBE_CACHE)).match(url.pathname)
      return saved || new Response('Prepará la prueba con conexión.', { status: 503 })
    }))
    return
  }
  // Las APIs, OAuth, recursos y navegaciones de otros sitios pasan a la red.
  // Una respuesta HTML de recuperación nunca debe llegar a una RPC o a RSC.
  if (request.method !== 'GET' || request.mode !== 'navigate'
    || url.origin !== self.location.origin
    || /^\/(api|auth|_next)(\/|$)/.test(url.pathname)) return

  event.respondWith(fetch(request).catch(async () => {
    // Reapertura desde el icono Android: solo si el dueño preparó la prueba.
    if (url.pathname === '/android') {
      const probe = await (await caches.open(PROBE_CACHE)).match('/android/probe.html')
      if (probe) return probe
    }
    const cache = await caches.open(SHELL_CACHE)
    const offline = await cache.match(OFFLINE_URL)
    return new Response(offline ? offline.body : 'Sin conexión. Volvé a intentar cuando tengas internet.', {
      status: 503,
      headers: {
        'Content-Type': offline ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  }))
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'ANDROID_PROBE_PREPARE') return
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(PROBE_CACHE)
      await cache.addAll(PROBE_FILES.map(path => new Request(path, { cache: 'reload', credentials: 'omit' })))
      event.ports[0]?.postMessage({ ok: true })
    } catch { event.ports[0]?.postMessage({ ok: false }) }
  })())
})

self.addEventListener('push', (event) => {
  // Prototipo: no interpretar mensajes arbitrarios ni URLs enviadas por cliente.
  let payload
  try { payload = event.data?.json() } catch { return }
  if (payload?.type !== 'android-probe') return
  event.waitUntil(self.registration.showNotification('Trucazo · prueba Android', {
    body: 'La notificación llegó al dispositivo.', tag: 'trucazo-android-probe',
    data: { type: 'android-probe' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  if (event.notification.data?.type !== 'android-probe') return
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/android/probe.html'))
})
