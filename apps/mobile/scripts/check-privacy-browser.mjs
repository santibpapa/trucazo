// Interfaz empaquetada y SDK reales; peticiones remotas interceptadas.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve('apps/mobile/dist')
const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const user = { id: owner, email: 'delete@fixture.invalid', aud: 'authenticated', role: 'authenticated', is_anonymous: false,
  identities: [{ provider: 'email' }], app_metadata: {}, user_metadata: {} }
const session = { user, access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture',
  refresh_token: 'fixture', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer' }
const saved = { owner, version: 'historia-local-v1', revision: 0, official: { userId: owner, engine_version: 'historia-bots-v1' }, pending: [1, 2].map(() => ({ trial: { version: 'historia-bots-v1' } })) }
const server = createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://localhost').pathname
    res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html')
    res.end(await readFile(path.join(root, p === '/' ? 'index.html' : p.slice(1))))
  } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
const errors = [], calls = []
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  await context.addInitScript(({ session, owner, other }) => {
    localStorage.setItem('trucazo:mobile:auth:v1', JSON.stringify(session))
    localStorage.setItem('trucazo:mobile:screen:' + owner, '/profile')
    localStorage.setItem('trucazo:mobile:screen:' + other, '/historia')
  }, { session, owner, other })
  let reject = true
  await context.route('**/*', async route => {
    const r = route.request(), u = new URL(r.url())
    if (u.origin === origin) return route.continue()
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    if (u.pathname === '/auth/v1/user') return reply(user)
    if (u.pathname === '/auth/v1/logout') return reply({})
    if (u.pathname === '/rest/v1/profiles') return reply({ id: owner })
    if (u.pathname === '/api/account/delete') {
      calls.push({ body: r.postDataJSON(), bearer: r.headers().authorization === 'Bearer ' + session.access_token })
      return reply(reject ? { ok: false, reason: 'reauthenticate' } : { ok: true, status: 'deleted' }, reject ? 403 : 200)
    }
    return reply([])
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(origin + '/#/eliminar-cuenta')
  await page.evaluate(async ({ saved, other }) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('trucazo-historia-local-v1', 1)
      req.onupgradeneeded = () => { req.result.createObjectStore('campaigns'); req.result.createObjectStore('meta') }
      req.onsuccess = () => { const db = req.result, tx = db.transaction(['campaigns', 'meta'], 'readwrite');
        tx.objectStore('campaigns').put(saved, saved.owner); tx.objectStore('campaigns').put({ keep: 'other-account' }, other)
        tx.objectStore('meta').put(saved.owner, 'active'); tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => reject(tx.error) }
    })
  }, { saved, other })
  await page.reload()
  await page.getByText('Tenés 2 resultado(s) sin sincronizar:', { exact: false }).waitFor()
  await page.getByLabel('Confirmá tu contraseña').fill('fixture-password')
  const submit = page.getByRole('button', { name: 'Eliminar mi cuenta definitivamente', exact: true })
  assert(await submit.isDisabled())
  await page.getByLabel('Escribí ELIMINAR para confirmar').fill('ELIMINAR')
  await submit.click()
  await page.getByText('La contraseña no es correcta.', { exact: true }).waitFor()
  reject = false
  await submit.click()
  await page.getByRole('heading', { name: 'Tu cuenta fue eliminada', exact: true }).waitFor()
  await page.waitForFunction(() => !localStorage.getItem('trucazo:mobile:auth:v1'))
  const result = await page.evaluate(async ({ owner, other }) => {
    const data = await new Promise(resolve => {
      const req = indexedDB.open('trucazo-historia-local-v1', 1)
      req.onsuccess = () => { const db = req.result, tx = db.transaction(['campaigns', 'meta'], 'readonly'), store = tx.objectStore('campaigns');
        const a = store.get(owner), b = store.get(other), active = tx.objectStore('meta').get('active')
        tx.oncomplete = () => { resolve({ ownRemoved: !a.result, other: b.result, hidden: !active.result }); db.close() } }
    })
    return { ...data, ownRouteRemoved: !localStorage.getItem('trucazo:mobile:screen:' + owner), otherRoute: localStorage.getItem('trucazo:mobile:screen:' + other) }
  }, { owner, other })
  assert.equal(result.ownRemoved, true); assert.equal(result.hidden, true); assert.equal(result.ownRouteRemoved, true)
  assert.deepEqual(result.other, { keep: 'other-account' }); assert.equal(result.otherRoute, '/historia')
  assert(calls.every(call => call.bearer && call.body.confirmation === 'ELIMINAR' && !call.body.userId))
  assert.deepEqual(errors, [])
  await page.screenshot({ path: 'android/generated/android-15-deletion-browser.png' })
  await writeFile('android/generated/android-15-browser.json', JSON.stringify({ environment: 'APK empaquetado en Chrome; Auth/API simulados', calls: calls.length, result, errors }, null, 2))
  console.log('OK borrado UI: advertencia de dos pendientes, contraseña incorrecta, confirmación, guardado/ruta propios eliminados y otra cuenta intacta.')
} finally { await browser.close(); server.close() }
