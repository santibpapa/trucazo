import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import manifest from '../src/app/manifest'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://trucazo.test'
type WorkerEvent = {
  request?: { method: string; mode: string; url: string }
  waitUntil?: (promise: Promise<unknown>) => void
  respondWith?: (promise: Promise<Response>) => void
}

function worker() {
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  const entries = new Map<string, Map<string, Response>>()
  let installFails = false
  let network: () => Promise<Response> = async () => new Response('desde la red')
  let skipped = 0
  let claimed = 0
  const downloaded: Request[] = []
  const caches = {
    async open(name: string) {
      if (!entries.has(name)) entries.set(name, new Map())
      const cache = entries.get(name)!
      return {
        async add(request: Request) {
          downloaded.push(request)
          if (installFails) throw new Error('descarga incompleta')
          cache.set(new URL(request.url).pathname, new Response('<h1>Sin conexión</h1>'))
        },
        async match(path: string) { return cache.get(path)?.clone() },
      }
    },
    async keys() { return Array.from(entries.keys()) },
    async delete(name: string) { return entries.delete(name) },
  }
  runInNewContext(source, {
    self: {
      location: { origin },
      addEventListener: (name: string, listener: (event: WorkerEvent) => void) => listeners.set(name, listener),
      skipWaiting: async () => { skipped++ },
      clients: { claim: async () => { claimed++ } },
    },
    caches,
    Request: class extends Request {
      constructor(url: string, options: RequestInit) { super(new URL(url, origin), options) }
    },
    Response, URL,
    fetch: () => network(),
  })
  return {
    entries, caches, downloaded,
    get skipped() { return skipped },
    get claimed() { return claimed },
    failInstall() { installFails = true },
    useNetwork(callback: () => Promise<Response>) { network = callback },
    async lifecycle(name: string) {
      let pending: Promise<unknown> | undefined
      listeners.get(name)!({ waitUntil: promise => { pending = promise } })
      await pending
    },
    fetch(path: string, mode = 'navigate', method = 'GET') {
      let response: Promise<Response> | undefined
      listeners.get('fetch')!({
        request: { method, mode, url: new URL(path, origin).href },
        respondWith: promise => { response = promise },
      })
      return response
    },
  }
}

test('identidad estable de PWA y alcance de las rutas de juego', () => {
  const app = manifest()
  assert.equal(app.id, '/')
  assert.equal(app.start_url, '/')
  assert.equal(app.scope, '/')
  assert.equal(app.lang, 'es-AR')
})

test('instala únicamente la pantalla pública, sin credenciales', async () => {
  const w = worker()
  await w.lifecycle('install')
  assert.equal(w.skipped, 1)
  assert.equal(w.downloaded.length, 1)
  assert.equal(new URL(w.downloaded[0].url).pathname, '/offline.html')
  assert.equal(w.downloaded[0].credentials, 'omit')
  assert.equal(w.downloaded[0].cache, 'reload')
})

test('no activa una actualización si la descarga falla', async () => {
  const w = worker()
  w.failInstall()
  await assert.rejects(w.lifecycle('install'), /descarga incompleta/)
  assert.equal(w.skipped, 0)
})

test('limpia solo shells viejos, conservando recursos y guardados de campaña', async () => {
  const w = worker()
  await w.lifecycle('install')
  await w.caches.open('trucazo-shell-v0')
  await w.caches.open('trucazo-campaign-v1')
  await w.caches.open('otra-aplicacion')
  await w.lifecycle('activate')
  assert.deepEqual(await w.caches.keys(), ['trucazo-shell-v1', 'trucazo-campaign-v1', 'otra-aplicacion'])
  assert.equal(w.claimed, 1)
})

test('navegación online siempre usa la red, sin guardar respuestas privadas ni errores', async () => {
  const w = worker()
  await w.lifecycle('install')
  for (const status of [200, 401, 404, 500]) {
    w.useNetwork(async () => new Response('respuesta privada', { status }))
    const response = await w.fetch('/game/privada')!
    assert.equal(response.status, status)
    assert.equal(await response.text(), 'respuesta privada')
  }
  assert.deepEqual(Array.from(w.entries.get('trucazo-shell-v1')!.keys()), ['/offline.html'])
})

test('fallo de red recupera la pantalla pública, sin almacenarla como una partida', async () => {
  const w = worker()
  await w.lifecycle('install')
  w.useNetwork(async () => { throw new TypeError('sin red') })
  const response = await w.fetch('/torneos/ejemplo?tab=partidas')!
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex')
  assert.match(await response.text(), /Sin conexión/)
  assert.deepEqual(Array.from(w.entries.get('trucazo-shell-v1')!.keys()), ['/offline.html'])
})

test('recuperación mínima si el usuario borró la caché', async () => {
  const w = worker()
  w.useNetwork(async () => { throw new TypeError('sin red') })
  const response = await w.fetch('/lobby')!
  assert.equal(response.status, 503)
  assert.match(await response.text(), /Sin conexión/)
})

test('no intercepta API, OAuth, RSC, recursos, POST ni otros dominios', () => {
  const w = worker()
  for (const path of ['/api/rpc', '/auth/callback?code=privado', '/_next/static/prueba.js']) {
    assert.equal(w.fetch(path), undefined)
  }
  assert.equal(w.fetch('/game/privada?_rsc=prueba', 'cors'), undefined)
  assert.equal(w.fetch('/cartas/espada_01.webp', 'no-cors'), undefined)
  assert.equal(w.fetch('/lobby', 'navigate', 'POST'), undefined)
  assert.equal(w.fetch('https://otro.test/lobby'), undefined)
})
