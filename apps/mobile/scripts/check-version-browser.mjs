// Interfaz empaquetada y middleware reales, proveedor simulado. Sin cuentas reales.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { createRequire } from 'node:module'

const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const user = { id: owner, aud: 'authenticated', role: 'authenticated', is_anonymous: false, app_metadata: {}, user_metadata: {} }
const session = { access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.fixture',
  refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user }
let mode = 'admitted'
const state = () => ({ compatible: mode === 'admitted', versionCode: 18, minimumCode: mode === 'admitted' ? 17 : 19,
  updateUrl: mode === 'admitted' ? null : 'https://www.trucazo.com.ar/android', contract: 'trucazo-online-v1',
  activeGameId: '11111111-1111-4111-8111-111111111111', activeTeamId: null })
const root = path.resolve('apps/mobile/dist')
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  try { res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html'); res.end(await readFile(path.join(root, p === '/' ? 'index.html' : p.slice(1)))) }
  catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  await context.addInitScript(value => {
    localStorage.setItem('trucazo:mobile:auth:v1', JSON.stringify(value))
    localStorage.setItem('acceptance:pending-result', 'preserve-me')
  }, session)
  await context.route('**/*', async route => {
    const r = route.request(), p = new URL(r.url()).pathname
    if (new URL(r.url()).origin === origin) return route.continue()
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204 })
    if (p === '/auth/v1/user') return reply(user)
    if (p === '/rest/v1/rpc/app_compatibility') return mode === 'unavailable' ? reply({ message: 'temporal' }, 503) : reply(state())
    if (p === '/rest/v1/profiles') return reply({ id: owner, username: 'Cuenta QA', coins: 1000, campaign_points: 0 })
    if (p === '/rest/v1/rpc/community_safety_state') return reply({ accepted: true, restricted_until: null })
    if (p === '/rest/v1/rpc/team_lobby') return reply({ tables: [], mine: [] })
    if (p === '/rest/v1/rpc/active_medal_for') return reply('ninguno')
    if (p.startsWith('/rest/v1/rpc/')) return reply(null)
    if (p === '/rest/v1/games') return reply(null)
    return reply([])
  })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(origin)
  await page.getByRole('link', { name: /^Multijugador/ }).click()
  await page.getByRole('heading', { name: 'Mesas disponibles', exact: true }).waitFor()
  mode = 'retired'; await page.reload()
  await page.getByRole('button', { name: 'Actualizar Trucazo', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Terminar mi partida', exact: true }).getAttribute('href'), '#/game/' + state().activeGameId)
  assert.equal(await page.getByRole('button', { name: 'Crear mesa', exact: true }).count(), 0)
  const preserved = await page.evaluate(() => ({ auth: JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id, pending: localStorage.getItem('acceptance:pending-result'), overflow: document.documentElement.scrollHeight > innerHeight }))
  assert.equal(preserved.auth, owner); assert.equal(preserved.pending, 'preserve-me'); assert.equal(preserved.overflow, false)
  await page.screenshot({ path: 'android/generated/android-17-update-required.png' })
  mode = 'unavailable'; await page.reload()
  await page.getByText('No pudimos comprobar la versión. Tu sesión y tus partidas están guardadas.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Actualizar Trucazo', exact: true }).count(), 0)
  await page.screenshot({ path: 'android/generated/android-17-version-unavailable.png' })
  mode = 'admitted'; await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await page.getByRole('heading', { name: 'Mesas disponibles', exact: true }).waitFor()
  assert.deepEqual(errors, [])
  // Mismo control que ejecuta el middleware de Next antes del handler.
  globalThis.compatibilityFixture = { mode: 'retired', state: { ...state(), updateUrl: 'https://www.trucazo.com.ar/android' } }
  const bundled = await build({ stdin: { contents: "import {checkApiCompatibility} from './src/lib/supabase/app-compatibility';globalThis.checkCompatibility=checkApiCompatibility", resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, plugins: [{ name: 'fixture', setup(b) {
      b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'fixture', namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export function createClient(){return {rpc:async()=>{const f=globalThis.compatibilityFixture;return f.mode==='unavailable'?{error:{code:'TEMP'},data:null}:{error:null,data:{...f.state,compatible:f.mode==='admitted'}}}}}` }))
    } }] })
  new Function('require', bundled.outputFiles[0].text)(createRequire(import.meta.url))
  const req = (p, method = 'POST', bearer = true) => new Request('https://www.trucazo.com.ar' + p, { method, headers: bearer ? { Authorization: 'Bearer fixture' } : {} })
  assert.equal((await globalThis.checkCompatibility(req('/api/android/preferences'))).status, 426)
  globalThis.compatibilityFixture.mode = 'admitted'
  assert.equal(await globalThis.checkCompatibility(req('/api/android/preferences')), null)
  globalThis.compatibilityFixture.mode = 'unavailable'
  assert.equal((await globalThis.checkCompatibility(req('/api/android/preferences'))).status, 503)
  assert.equal(await globalThis.checkCompatibility(req('/api/android/historia')), null)
  assert.equal(await globalThis.checkCompatibility(req('/api/account/delete')), null)
  assert.equal(await globalThis.checkCompatibility(req('/api/feedback', 'POST', false)), null)
  const result = { scope: 'Interfaz empaquetada y control Next reales; proveedor simulado', admitted: true,
    retiredNotice: true, activeGameRecovery: true, preservesSessionAndPending: true, serviceUnavailableDistinct: true,
    retry: true, nextRejectsRetired: true, noOverflowAt360x640: true, pageErrors: errors }
  await writeFile('android/generated/android-17-version-browser.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
