// Prueba real de la base web en un origen local, sin credenciales ni Supabase.
// No afirma que exista todavía motor de campaña, sincronización o push.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const sw = await readFile(new URL('../public/sw.js', import.meta.url))
const offline = await readFile(new URL('../public/offline.html', import.meta.url))
// Este fixture NO se publica. El registro usa las mismas opciones de RegisterSW.
const fixture = '<!doctype html><html lang="es"><body><h1>Online</h1><script>navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })</script></body></html>'
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/sw.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(sw)
  } else if (path === '/offline.html') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(offline)
  } else if (path.startsWith('/api/')) {
    response.setHeader('Content-Type', 'application/json')
    response.end('{"private":true}')
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(fixture)
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const profile = await mkdtemp(join(tmpdir(), 'trucazo-pwa-'))
let context

async function launch() {
  return chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: process.env.PWA_BROWSER_EXECUTABLE,
    viewport: { width: 360, height: 640 },
    serviceWorkers: 'allow',
  })
}

// Guardado ficticio de la prueba técnica, aislado de las bases de la aplicación.
async function storedValue(page, value) {
  return page.evaluate(value => new Promise((resolve, reject) => {
    const request = indexedDB.open('trucazo-pwa-probe', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('probe')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('probe', value === null ? 'readonly' : 'readwrite')
      const store = transaction.objectStore('probe')
      const operation = value === null ? store.get('fixture-account') : store.put(value, 'fixture-account')
      let result
      operation.onsuccess = () => { result = operation.result }
      transaction.oncomplete = () => { db.close(); resolve(result) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  }), value)
}

try {
  context = await launch()
  let page = await context.newPage()
  await page.goto(`${origin}/torneos/ejemplo?tab=partidas`)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  assert.equal(await page.locator('h1').textContent(), 'Online')
  // Recorrer datos privados no debe agregarlos a Cache Storage.
  assert.deepEqual(await page.evaluate(async () => (await fetch('/api/private')).json()), { private: true })
  await page.goto(`${origin}/game/privada`)
  await page.goto(`${origin}/torneos/ejemplo?tab=partidas`)
  await storedValue(page, { account: 'fixture-account', sequence: 1 })
  assert.equal(await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return 'pushManager' in registration && 'Notification' in window
  }), true)

  await context.setOffline(true)
  const offlineResponse = await page.reload()
  assert.equal(offlineResponse.status(), 503)
  assert.equal(await page.locator('h1').textContent(), 'No pudimos conectar')
  assert.equal(await page.locator('#retry').getAttribute('href'), '/torneos/ejemplo?tab=partidas')
  assert.deepEqual(await storedValue(page, null), { account: 'fixture-account', sequence: 1 })
  await storedValue(page, { account: 'fixture-account', sequence: 2 })
  assert.equal(await page.evaluate(async () => {
    try { await fetch('/api/private'); return false } catch { return true }
  }), true)
  const cacheUrls = await page.evaluate(async () => {
    const urls = []
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname)
    }
    return urls
  })
  assert.deepEqual(cacheUrls, ['/offline.html'])
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true)

  // Reiniciar todo el proceso del navegador conservando el perfil y sin red.
  await context.close()
  context = await launch()
  await context.setOffline(true)
  page = await context.newPage()
  await page.goto(`${origin}/historia`)
  assert.equal(await page.locator('h1').textContent(), 'No pudimos conectar')
  assert.deepEqual(await storedValue(page, null), { account: 'fixture-account', sequence: 2 })
  await context.setOffline(false)
  await page.locator('#retry').click()
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Online')
  assert.equal(new URL(page.url()).pathname, '/historia')

  // Un primer arranque sin preparación no tiene worker: no prometer offline.
  const fresh = await context.browser().newContext({ serviceWorkers: 'allow', offline: true })
  try {
    const firstPage = await fresh.newPage()
    await assert.rejects(firstPage.goto(`${origin}/historia`), /ERR_INTERNET_DISCONNECTED/)
  } finally {
    await fresh.close()
  }
  console.log('OK: recuperación offline, URL original, caché pública, API sin caché, IndexedDB tras reinicio y retorno online.')
  console.log('Push: APIs disponibles; envío real y TWA Android todavía pendientes.')
} finally {
  await context?.close()
  await new Promise(resolve => server.close(resolve))
  await rm(profile, { recursive: true, force: true })
}
