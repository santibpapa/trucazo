// Verifica el build real de Next sin cuenta, red externa ni datos de producción.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { chromium } from 'playwright'

const reservation = createServer()
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'https://ejemplo.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'clave-de-mentira-para-el-build' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let browser
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No inició el build de Next.')), 15000)
    server.stdout.on('data', data => { if (data.toString().includes('Ready')) { clearTimeout(timer); resolve() } })
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Next cerró con código ${code}.`)) })
    server.on('error', reject)
  })
  const origin = `http://127.0.0.1:${port}`
  browser = await chromium.launch({ headless: true, executablePath: process.env.PWA_BROWSER_EXECUTABLE })
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  const page = await context.newPage()
  const asset = await context.request.get(`${origin}/.well-known/assetlinks.json`)
  assert.equal(asset.status(), 200)
  assert.deepEqual(await asset.json(), [])
  assert.equal((await context.request.get(`${origin}/api/android/probe`)).status(), 403)
  assert.equal((await context.request.post(`${origin}/api/android/probe`, { data: {} })).status(), 403)
  await page.goto(`${origin}/android`)
  await page.waitForURL('**/login?android=1')
  await page.waitForFunction(() => sessionStorage.getItem('trucazo:android-entry:v1') === '1')
  assert.equal(await page.getByRole('button', { name: 'Entrar como invitado' }).count(), 0)
  await page.getByRole('link', { name: 'Registrate gratis' }).click()
  await page.waitForURL('**/register')
  const web = await browser.newContext()
  const other = await web.newPage()
  await other.goto(`${origin}/login`)
  assert.equal(await other.getByRole('button', { name: 'Entrar como invitado' }).count(), 1)
  await context.addCookies([{ name: 'trucazo_auth_next', value: '/android', url: origin }])
  const callback = await context.request.get(`${origin}/auth/callback`, { maxRedirects: 0 })
  assert.equal(callback.status(), 307)
  assert.ok(callback.headers().location.endsWith('/login?android=1'))
  await context.addCookies([{ name: 'trucazo_auth_next', value: 'https://evil.test', url: origin }])
  const unsafe = await context.request.get(`${origin}/auth/callback`, { maxRedirects: 0 })
  assert.ok(unsafe.headers().location.endsWith('/login'))
  console.log('OK Next real: acceso Android sin invitado, web independiente, registro, callback seguro, assetlinks y API anónima rechazada.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
