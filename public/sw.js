// Solo guarda una pantalla pública y autocontenida. Nunca cachear HTML de
// Next, sesiones, RPCs, cartas, perfiles ni respuestas de partidas online.
// Subir la versión cuando cambie offline.html; la campaña tendrá otra caché.
const SHELL_CACHE_PREFIX = 'trucazo-shell-'
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}v1`
const OFFLINE_URL = '/offline.html'

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
  // Las APIs, OAuth, recursos y navegaciones de otros sitios pasan a la red.
  // Una respuesta HTML de recuperación nunca debe llegar a una RPC o a RSC.
  if (request.method !== 'GET' || request.mode !== 'navigate'
    || url.origin !== self.location.origin
    || /^\/(api|auth|_next)(\/|$)/.test(url.pathname)) return

  event.respondWith(fetch(request).catch(async () => {
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
