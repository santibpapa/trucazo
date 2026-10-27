// SDK y controles reales, proveedor simulado: no envía correos ni cambia cuentas.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import path from 'node:path'

const root = path.resolve('apps/mobile/dist'), userId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false, app_metadata: {}, user_metadata: {} }
const token = () => ({ access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user })
const codes = new Map(), calls = [], returns = []
let sequence = 0, confirmation = true
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  try { res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html'); res.end(await readFile(path.join(root, p === '/' ? 'index.html' : p.slice(1)))) }
  catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
try {
  const context = await browser.newContext()
  await context.route('**/*', async route => {
    const r = route.request(), url = new URL(r.url())
    if (url.origin === origin) return route.continue()
    const body = r.postDataJSON(), p = url.pathname
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    calls.push({ path: p, method: r.method() })
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204 })
    if (p === '/auth/v1/authorize') {
      assert.equal(url.searchParams.get('code_challenge_method'), 's256')
      returns.push({ destination: url.searchParams.get('redirect_to'), challenge: url.searchParams.get('code_challenge') })
      return route.fulfill({ body: '<p>Proveedor de prueba</p>', contentType: 'text/html' })
    }
    if (p === '/auth/v1/signup' || p === '/auth/v1/recover') {
      assert.equal(body.code_challenge_method, 's256')
      returns.push({ destination: url.searchParams.get('redirect_to'), challenge: body.code_challenge })
      return reply(p.endsWith('recover') ? {} : confirmation ? user : token())
    }
    if (p === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'pkce') {
        const expected = codes.get(body.auth_code)
        if (!expected) return reply({ error: 'invalid_grant', message: 'expired' }, 400)
        assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), expected)
        codes.delete(body.auth_code)
      }
      return reply(token())
    }
    if (p === '/auth/v1/user') return reply(user)
    if (p === '/auth/v1/logout') return reply({})
    if (p === '/rest/v1/rpc/app_compatibility') return reply({ compatible: true, versionCode: body.p_version_code, minimumCode: 17, updateUrl: null, contract: 'trucazo-online-v1', activeGameId: null, activeTeamId: null })
    if (p === '/rest/v1/profiles') return reply(url.searchParams.get('select') === 'id' ? { id: userId } : r.headers().accept?.includes('object') ? null : [])
    if (p === '/rest/v1/games') return reply(null)
    if (p === '/rest/v1/rpc/team_lobby') return reply({ tables: [], mine: [] })
    if (p === '/rest/v1/rpc/community_safety_state') return reply({ accepted: true, restricted_until: null })
    if (p === '/rest/v1/rpc/preview_table_invite') return reply({ mode: '1v1', name: 'Mesa de invitación', creator_username: 'Amigo', bet: 10, target_score: 30, time_limit: 30, occupied: 1, capacity: 2, available: true, destination: null })
    if (p === '/rest/v1/rpc/join_table_invite') return reply('/game/11111111-1111-4111-8111-111111111111')
    if (p.startsWith('/rest/v1/rpc/')) return reply(null)
    return reply([])
  })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  // No agregar un acceso a diagnóstico al paquete distribuido.
  const harness = (await build({ stdin: { contents: `import * as auth from './apps/mobile/src/auth'; import {createClient} from './apps/mobile/src/services'; import * as links from './src/lib/auth-links'; window.authProbe={...auth,...links,client:createClient()}`, resolveDir: process.cwd() }, bundle: true, write: false, define: { 'process.env': '{}', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '"https://fixture.supabase.invalid"', 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '"fixture-public"', MOBILE_API_ORIGIN: '"http://localhost:3000"', MOBILE_RELEASE: JSON.stringify(process.env.ANDROID_AUTH_RELEASE === '1') } })).outputFiles[0].text
  await page.addScriptTag({ content: harness })
  const invoke = (name, args = []) => page.evaluate(async ({ name, args }) => {
    try { return { value: await authProbe[name](...args) } }
    catch (failure) { return { error: failure.message } }
  }, { name, args })
  async function callback() {
    assert.ok(returns.length)
    const next = returns.pop(), destination = new URL(next.destination)
    assert.equal(destination.pathname, '/auth/mobile')
    const code = 'fixture-code-' + (++sequence); codes.set(code, next.challenge)
    destination.searchParams.set('code', code)
    assert.equal(destination.searchParams.get('app'), process.env.ANDROID_AUTH_RELEASE === '1' ? 'release' : null)
    return (process.env.ANDROID_AUTH_RELEASE === '1' ? 'ar.com.trucazo.app' : 'ar.com.trucazo.capacitor.dev') + '://auth/callback' + destination.search
  }
  const game = '/game/11111111-1111-4111-8111-111111111111'
  const destinationCheck = await invoke('authDestination', [game])
  assert.equal(destinationCheck.error, undefined)
  assert.equal(destinationCheck.value, game)
  const team = game.replace('/game/', '/game/parejas/')
  assert.equal((await invoke('authDestination', [team])).value, team)
  assert.equal((await invoke('parseAppLink', ['https://www.trucazo.com.ar' + team])).value.path, team)
  const invitation = '/invitar/faf00100-0000-4000-a000-000000000001'
  assert.equal((await invoke('authDestination', [invitation])).value, invitation)
  assert.equal((await invoke('parseAppLink', ['https://www.trucazo.com.ar' + invitation])).value.path, invitation)
  await invoke('rememberDestination', [invitation])
  assert.equal((await invoke('takeDestination')).value, invitation)
  assert.equal((await invoke('authDestination', [invitation + '?next=https://evil.invalid'])).value, null)
  for (const invalid of ['//evil.invalid', '/lobby?next=https://evil.invalid', '/game/not-a-uuid', '/game/../lobby', '/torneos/invalid']) assert.equal((await invoke('authDestination', [invalid])).value, null)
  for (const invalid of ['https://trucazo.com.ar.evil.invalid' + game, 'http://trucazo.com.ar' + game, 'https://evil@trucazo.com.ar' + game, 'ar.com.trucazo.capacitor.dev://wrong/callback']) assert.equal((await invoke('parseAppLink', [invalid])).value, null)
  assert.match((await invoke('completeAppAuth', ['ar.com.trucazo.capacitor.dev://auth/callback?code=unexpected'])).error, /no corresponde/)
  assert.equal((await invoke('register', ['fixture@example.invalid', 'fixture-password', 'JugadorQA'])).value, false)
  const signup = await callback()
  assert.match((await invoke('completeAppAuth', [signup.replace(/nonce=[^&]+/, 'nonce=wrong')])).error, /no corresponde/)
  assert.equal((await invoke('completeAppAuth', [signup])).value, 'login')
  const beforeReplay = calls.filter(c => c.path === '/auth/v1/token').length
  assert.equal((await invoke('completeAppAuth', [signup])).value, null)
  assert.equal(calls.filter(c => c.path === '/auth/v1/token').length, beforeReplay)
  await page.evaluate(async () => { await authProbe.client.auth.signOut({ scope: 'local' }); authProbe.cancelAuth() })
  confirmation = false
  assert.equal((await invoke('register', ['fixture@example.invalid', 'fixture-password', 'JugadorQA'])).value, true)
  assert.equal(await page.evaluate(() => localStorage.getItem('trucazo:mobile:auth-flow:v1')), null)
  confirmation = true
  await page.evaluate(async () => { await authProbe.client.auth.signOut({ scope: 'local' }); authProbe.cancelAuth() })
  returns.length = 0
  const popupPromise = page.waitForEvent('popup')
  assert.equal((await invoke('googleSignIn')).error, undefined)
  const popup = await popupPromise; await popup.waitForLoadState()
  const google = await callback()
  assert.equal((await invoke('completeAppAuth', [google])).value, 'login')
  await popup.close()
  assert.equal(calls.filter(c => c.path === '/auth/v1/signup').length, 2, 'Google no crea otra cuenta por código propio')
  await page.evaluate(async () => { await authProbe.client.auth.signOut({ scope: 'local' }); authProbe.cancelAuth() })
  assert.equal((await invoke('requestRecovery', ['fixture@example.invalid'])).error, undefined)
  assert.equal((await invoke('recoveryReady')).value, false, 'Pedir correo no habilita cambio de contraseña')
  assert.match((await invoke('changePassword', ['fixture-new-password'])).error, /enlace/)
  const recovery = await callback()
  assert.equal((await invoke('completeAppAuth', [recovery])).value, 'recovery')
  assert.equal((await invoke('recoveryReady')).value, true)
  assert.equal((await invoke('changePassword', ['fixture-new-password'])).error, undefined)
  assert.equal((await invoke('recoveryReady')).value, false)
  await page.evaluate(async () => { await authProbe.client.auth.signOut({ scope: 'local' }); authProbe.cancelAuth() })
  await invoke('requestRecovery', ['fixture@example.invalid']); const expired = await callback()
  codes.clear()
  assert.match((await invoke('completeAppAuth', [expired])).error, /venció o ya fue usado/)
  await invoke('cancelAuth')
  await invoke('requestRecovery', ['fixture@example.invalid']); const old = await callback()
  await page.evaluate(() => { const key = 'trucazo:mobile:auth-flow:v1', value = JSON.parse(localStorage.getItem(key)); value.started = 0; localStorage.setItem(key, JSON.stringify(value)) })
  assert.match((await invoke('completeAppAuth', [old])).error, /no corresponde/)
  await invoke('cancelAuth')
  assert.deepEqual(errors, [])
  // Formularios empaquetados: confirmación y validaciones sin usuarios reales.
  await page.reload(); await page.getByRole('link', { name: 'Registrate gratis' }).click()
  await page.getByLabel('Nombre de usuario').fill('JugadorQA'); await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid'); await page.getByLabel('Contraseña', { exact: true }).fill('fixture-password')
  await page.getByRole('checkbox', { name: /Acepto las/ }).check()
  await page.getByRole('button', { name: /Registrarse y ganar/ }).click()
  await page.getByRole('status').filter({ hasText: 'Revisá tu email' }).waitFor()
  await page.screenshot({ path: 'android/generated/android-07-signup-fixture.png' })
  await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click()
  await page.getByRole('link', { name: 'Olvidé mi contraseña' }).click()
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid'); await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await page.getByRole('status').filter({ hasText: 'Si ese email tiene una cuenta' }).waitFor()
  await page.screenshot({ path: 'android/generated/android-07-recovery-fixture.png' })
  await page.evaluate(session => localStorage.setItem('trucazo:mobile:auth:v1', JSON.stringify(session)), { ...token(), expires_at: Math.floor(Date.now() / 1000) + 3600 })
  await page.goto(origin + '/#' + invitation)
  await page.reload()
  await page.getByRole('heading', { name: 'Mesa de invitación' }).waitFor()
  const beforeJoin = calls.filter(c => c.path === '/rest/v1/rpc/join_table_invite').length
  await page.getByRole('button', { name: 'Unirme', exact: true }).click()
  await page.waitForURL('**/#' + game)
  assert.equal(calls.filter(c => c.path === '/rest/v1/rpc/join_table_invite').length, beforeJoin + 1)
  assert.deepEqual(errors, [])
  await writeFile('android/generated/android-07-auth-fixture.json', JSON.stringify({ scope: 'SDK real, proveedor simulado; ningún correo ni cuenta real', pkce: true, signupConfirmation: true, googleExternal: true, noExtraSignup: true, replayIgnored: true, recoveryRequiresLink: true, passwordUpdate: true, expiredAndUsedRejected: true, untrustedDestinationsRejected: true, errors }, null, 2))
  console.log('OK PKCE alta/Google/recuperación, código ligado al dispositivo, reenvío, vencidos, destinos ajenos y formularios reales con proveedor simulado.')
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
