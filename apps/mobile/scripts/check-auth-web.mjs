// Build Next real; proveedor de recuperación simulado, sin correos/cuentas reales.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const origin = process.env.ANDROID_AUTH_WEB_ORIGIN || 'http://localhost:3000'
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', calls = []
const user = { id: owner, aud: 'authenticated', role: 'authenticated', is_anonymous: false, email: 'fixture@example.invalid', user_metadata: {}, app_metadata: {} }
const session = { access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user }
let returned, challenge, updated = false
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  await context.addInitScript(() => sessionStorage.setItem('trucazo:android-entry:v1', '1'))
  await context.route('**/auth/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), body = request.postDataJSON()
    const reply = value => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
    if (url.pathname.endsWith('/recover')) { returned = new URL(url.searchParams.get('redirect_to')); challenge = body.code_challenge; return reply({}) }
    if (url.pathname.endsWith('/token')) {
      assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), challenge)
      return reply(session)
    }
    if (url.pathname.endsWith('/user')) {
      if (request.method() === 'PUT') { assert.equal(body.password, 'fixture-new-password'); updated = true }
      return reply(user)
    }
    return reply({})
  })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (/\/(?:_vercel|api\/analytics)/.test(new URL(request.url()).pathname)) calls.push(request.url()) })
  const nonce = '11111111-1111-4111-8111-111111111111'
  const bridgeResponse = await page.goto(origin + '/auth/mobile?flow=recovery&nonce=' + nonce + '&code=fixture-code&sb_flow_id=0123456789abcdef0123456789abcdef')
  assert.equal(bridgeResponse.status(), 200)
  assert.equal(bridgeResponse.headers()['referrer-policy'], 'no-referrer')
  await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).waitFor()
  const app = new URL(await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).getAttribute('href'))
  assert.equal(app.protocol, 'ar.com.trucazo.capacitor.dev:'); assert.equal(app.searchParams.get('code'), 'fixture-code'); assert.equal(app.searchParams.get('sb_flow_id'), '0123456789abcdef0123456789abcdef')
  assert.equal(page.url(), origin + '/auth/mobile')
  assert.equal(await page.getByRole('link', { name: 'Recuperar desde este navegador' }).getAttribute('href'), '/recuperar-cuenta')
  await page.screenshot({ path: 'android/generated/android-07-bridge-web.png' })
  await page.goto(origin + '/auth/mobile?app=release&flow=recovery&nonce=' + nonce + '&code=fixture-code')
  await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).waitFor()
  assert.equal(new URL(await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).getAttribute('href')).protocol, 'ar.com.trucazo.app:')
  assert.equal(page.url(), origin + '/auth/mobile')
  await page.goto(origin + '/auth/mobile?flow=google&nonce=' + nonce + '#error=access_denied&error_description=cancelled')
  await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).waitFor()
  assert.equal(new URL(await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).getAttribute('href')).searchParams.get('error'), 'cancelled')
  await page.goto(origin + '/auth/mobile?flow=foreign&nonce=' + nonce + '&code=fixture-code')
  await page.getByRole('alert').filter({ hasText: 'incompleto' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Abrir Trucazo', exact: true }).count(), 0)
  const recoveryResponse = await page.goto(origin + '/recuperar-cuenta')
  assert.equal(recoveryResponse.status(), 200)
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid')
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await page.getByRole('status').filter({ hasText: 'Si ese email tiene una cuenta' }).waitFor()
  assert.equal(returned.pathname, '/recuperar-cuenta')
  returned.searchParams.set('code', 'fixture-recovery-code')
  const callbackResponse = await page.goto(returned.toString())
  assert.equal(callbackResponse.status(), 200, 'El middleware conserva el retorno de recuperación')
  await page.getByLabel('Nueva contraseña', { exact: true }).waitFor()
  await page.reload(); await page.getByLabel('Nueva contraseña', { exact: true }).waitFor()
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('fixture-new-password')
  await page.getByLabel('Repetí la contraseña', { exact: true }).fill('different')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await page.getByRole('alert').filter({ hasText: 'no coinciden' }).waitFor()
  assert.equal(updated, false)
  await page.screenshot({ path: 'android/generated/android-07-password-web-fixture.png' })
  await page.getByLabel('Repetí la contraseña', { exact: true }).fill('fixture-new-password')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await page.waitForFunction(() => !sessionStorage.getItem('trucazo:web-recovery:v1'))
  assert.equal(updated, true)
  assert.deepEqual(calls, [], 'Sin códigos enviados a analítica en acceso')
  assert.deepEqual(errors, [])
  const result = { scope: 'Next build real, navegador/SDK reales, recuperación simulada; sin correo/actualización real', bridge: true, safeFallback: true, cancelledFragment: true, recoveryCallbackKept: true, verifiedRefresh: true, passwordMismatch: true, passwordUpdate: true, noAccessAnalytics: true, errors }
  await writeFile('android/generated/android-07-web-fixture.json', JSON.stringify(result, null, 2))
  console.log('OK retorno HTTPS, fallback web, cancelación, recuperación/cambio de contraseña y exclusión de analítica con Next real/proveedor simulado.')
} finally { await browser.close() }
