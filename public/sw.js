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
  const localReferrer = request.referrer && /\/android(?:\/historia\/(?:index\.html|app\.css))?$/.test(new URL(request.referrer).pathname)
  if (request.method === 'GET' && url.origin === self.location.origin && campaignAsset(url.pathname)
    && (url.pathname.startsWith('/android/historia/') || localReferrer || (!request.referrer && event.clientId))) {
    event.respondWith((async () => {
      // Avatares y fondos pueden pedir recursos sin Referer. Identificar la
      // pantalla por su cliente mantiene el paquete fuera de las mesas online.
      const client = event.clientId && await self.clients.get(event.clientId)
      const localHistory = client ? /\/android(?:\/historia\/index\.html)?$/.test(new URL(client.url).pathname) : localReferrer
      if (url.pathname.startsWith('/android/historia/') || localHistory) {
        const saved = await campaignSaved(url.pathname)
        if (saved) return saved
      }
      return fetch(request).catch(() => new Response('Conectate una vez para descargar Historia.', { status: 503 }))
    })())
    return
  }
  if (request.method === 'GET' && url.origin === self.location.origin && TRIAL_FILES.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const saved = await trialSaved(url.pathname)
      return saved || new Response('Conectate una vez para preparar el ensayo de Tobías.', { status: 503 })
    }))
    return
  }
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
      const campaign = await campaignSaved('/android/historia/index.html')
      if (campaign) return campaign
      const trial = await trialSaved('/android/tobias.html')
      if (trial) return trial
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

// Solo archivos públicos expresamente verificados. Ningún dato de la cuenta,
// petición de juego, respuesta autenticada o HTML de Next entra en esta caché.
const CAMPAIGN_READY = 'trucazo-historia-ready-v1'
const CAMPAIGN_PREFIX = 'trucazo-historia-package-'
const CAMPAIGN_MANIFEST = '/android/historia/manifest.json'
const CAMPAIGN_CORE = ['/android/historia/index.html', '/android/historia/app.js', '/android/historia/app.css',
  '/android/historia/catalog.json', '/android/historia/font.woff2', '/historia/mapa-argentina.webp',
  '/sounds/carta.wav', '/sounds/gano.wav', '/sounds/perdi.wav',
  '/mesa/club/clasico.webp', '/mesa/club/cafetin-reference.webp', '/mesa/club/quincho-reference.webp',
  '/mesa/club/pena-reference.webp', '/mesa/club/bodegon-reference.webp', '/mesa/club/refugio-reference.webp',
  '/mesa/club/table-mask.svg', '/mesa/club/rim-mask.svg', '/mesa/club/rim.webp', '/mesa/club/grain.svg',
  '/accesorios/agua.webp', '/accesorios/cenicero.webp', '/accesorios/copa.webp', '/accesorios/fajo.webp',
  '/accesorios/fernet.webp', '/accesorios/habano.webp', '/accesorios/whiskey.webp']
function campaignAsset(path) {
  return CAMPAIGN_CORE.includes(path) || /^\/historia\/provincia-[a-z-]+\.webp$/.test(path)
    || /^\/personajes\/[a-z-]+\.webp$/.test(path)
    || /^\/cartas\/(espada|basto|oro|copa)_(0[1-7]|1[012])\.webp$/.test(path)
}
async function campaignSaved(path) {
  const pointer = await (await caches.open(CAMPAIGN_READY)).match(CAMPAIGN_MANIFEST)
  if (!pointer) return null
  const manifest = await pointer.json()
  if (!manifest.assets.some(a => a.path === path)) return null
  return (await caches.open(CAMPAIGN_PREFIX + manifest.digest)).match(path)
}
const hex = bytes => Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
self.addEventListener('message', event => {
  if (event.data?.type !== 'HISTORIA_PREPARE') return
  event.waitUntil((async () => {
    try {
      const response = await fetch(CAMPAIGN_MANIFEST, { cache: 'reload', credentials: 'omit' })
      if (!response.ok) throw new Error('manifest')
      const manifest = await response.json()
      if (manifest.version !== 'historia-local-v1' || manifest.engine_version !== 'historia-bots-v1'
        || manifest.catalog_sha256 !== event.data.catalogHash || !/^[a-f0-9]{64}$/.test(manifest.digest)
        || !Array.isArray(manifest.assets) || manifest.assets.length !== 147
        || new Set(manifest.assets.map(a => a.path)).size !== manifest.assets.length
        || !CAMPAIGN_CORE.every(path => manifest.assets.some(a => a.path === path))
        || !manifest.assets.every(a => campaignAsset(a.path) && /^[a-f0-9]{64}$/.test(a.sha256)
          && Number.isSafeInteger(a.bytes) && a.bytes > 0)) throw new Error('assets')
      const digest = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(manifest.assets))))
      if (digest !== manifest.digest) throw new Error('digest')
      const cache = await caches.open(CAMPAIGN_PREFIX + manifest.digest)
      let completed = 0
      for (const asset of manifest.assets) {
        const file = await fetch(asset.path, { cache: 'reload', credentials: 'omit' })
        if (!file.ok) throw new Error('download')
        const bytes = await file.clone().arrayBuffer()
        const hash = hex(await crypto.subtle.digest('SHA-256', bytes))
        if (hash !== asset.sha256 || bytes.byteLength !== asset.bytes) throw new Error('integrity')
        await cache.put(asset.path, file)
        event.ports[0]?.postMessage({ progress: ++completed, total: manifest.assets.length })
      }
      // Un corte conserva el puntero previo. Se retienen también los paquetes
      // antiguos para las partidas y registros todavía pendientes.
      await (await caches.open(CAMPAIGN_READY)).put(CAMPAIGN_MANIFEST,
        new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }))
      event.ports[0]?.postMessage({ ok: true, digest: manifest.digest })
    } catch { event.ports[0]?.postMessage({ ok: false }) }
  })())
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

// Paquete público del ensayo. El guardado por cuenta vive en IndexedDB.
const TRIAL_READY = 'trucazo-tobias-ready-v1'
const TRIAL_PREFIX = 'trucazo-tobias-package-'
const TRIAL_FILES = ['/android/tobias.html', '/android/tobias.js']
async function trialSaved(path) {
  const pointer = await (await caches.open(TRIAL_READY)).match('/android/tobias-manifest.json')
  if (!pointer) return null
  const manifest = await pointer.json()
  return (await caches.open(TRIAL_PREFIX + manifest.digest)).match(path)
}
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'TOBIAS_PREPARE') return
  event.waitUntil((async () => {
    try {
      const response = await fetch('/android/tobias-manifest.json', { cache: 'reload', credentials: 'omit' })
      if (!response.ok) throw new Error('manifest')
      const manifest = await response.json()
      if (manifest.version !== 'tobias-v1' || !/^[a-f0-9]{64}$/.test(manifest.digest)
        || !Array.isArray(manifest.assets) || manifest.assets.length !== 2
        || !TRIAL_FILES.every(path => manifest.assets.filter(asset => asset.path === path).length === 1)) throw new Error('assets')
      const cache = await caches.open(TRIAL_PREFIX + manifest.digest)
      for (const asset of manifest.assets) {
        const file = await fetch(asset.path, { cache: 'reload', credentials: 'omit' })
        if (!file.ok || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('download')
        const bytes = await file.clone().arrayBuffer()
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
        if (hash !== asset.sha256 || bytes.byteLength !== asset.bytes) throw new Error('integrity')
        await cache.put(asset.path, file)
      }
      // Cambiar el puntero solo después de completar y comprobar todo.
      await (await caches.open(TRIAL_READY)).put('/android/tobias-manifest.json',
        new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }))
      event.ports[0]?.postMessage({ ok: true })
    } catch { event.ports[0]?.postMessage({ ok: false }) }
  })())
})
