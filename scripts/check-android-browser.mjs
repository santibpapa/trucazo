// UI real de la prueba local, identidad ficticia. No prueba Supabase, APK ni FCM.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const resources = new Map(await Promise.all([
  ['/sw.js', 'text/javascript', '../public/sw.js'],
  ['/offline.html', 'text/html', '../public/offline.html'],
  ['/android/probe.html', 'text/html', '../public/android/probe.html'],
  ['/android/probe.js', 'text/javascript', '../public/android/probe.js'],
].map(async ([url, type, file]) => [url, { type, content: await readFile(new URL(file, import.meta.url)) }])))
let userId = 'fixture-account-a'
let failDownload = false
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/api/android/probe') {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ userId, publicKey: null }))
  } else if (failDownload && path === '/android/probe.js') {
    response.writeHead(503); response.end('descarga incompleta')
  } else if (resources.has(path)) {
    const resource = resources.get(path)
    response.setHeader('Content-Type', resource.type); response.end(resource.content)
  } else {
    response.setHeader('Content-Type', 'text/html')
    response.end('<h1>Online</h1>')
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const profile = await mkdtemp(join(tmpdir(), 'trucazo-android-probe-'))
let context
const launch = () => chromium.launchPersistentContext(profile, { headless: true,
  executablePath: process.env.PWA_BROWSER_EXECUTABLE, viewport: { width: 360, height: 640 } })

try {
  context = await launch()
  let page = await context.newPage()
  await page.goto(`${origin}/android/probe.html`)
  failDownload = true
  await page.locator('#prepare').click()
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('descarga no terminó'))
  assert.equal(await page.locator('#increment').isDisabled(), true)
  failDownload = false
  await page.locator('#prepare').click()
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Preparación completa'))
  await page.locator('#increment').click()
  await page.waitForFunction(() => document.querySelector('#count').textContent === '1')
  assert.equal(await page.locator('#count').textContent(), '1')
  assert.equal(await page.locator('#subscribe').isDisabled(), true)
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('trucazo-android-probe-v1')
    return (await cache.keys()).map(request => new URL(request.url).pathname).sort()
  })
  assert.deepEqual(cached, ['/android/probe.html', '/android/probe.js'])
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await context.close()

  context = await launch()
  await context.setOffline(true)
  page = await context.newPage()
  const response = await page.goto(`${origin}/android`)
  assert.equal(response.status(), 200)
  await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1')
  await page.locator('#increment').click()
  await page.waitForFunction(() => document.querySelector('#count').textContent === '2')
  assert.equal(await page.locator('#count').textContent(), '2')
  assert.equal(await page.evaluate(async () => { try { await fetch('/api/android/probe'); return false } catch { return true } }), true)
  await context.setOffline(false)
  userId = 'fixture-account-b'
  await page.goto(`${origin}/android/probe.html`)
  await page.waitForFunction(() => document.querySelector('#count')?.textContent === '0')
  await page.locator('#increment').click()
  await page.waitForFunction(() => document.querySelector('#count').textContent === '1')
  assert.equal(await page.locator('#count').textContent(), '1')
  console.log('OK: descarga interrumpida, preparación completa, reinicio offline desde /android, guardado y cambio de cuenta ficticia.')
  console.log('Pendientes: TWA instalada, autorización real de Supabase y entrega push por FCM.')
} finally {
  await context?.close()
  await new Promise(resolve => server.close(resolve))
  await rm(profile, { recursive: true, force: true })
}
