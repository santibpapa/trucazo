// Interfaz empaquetada con SQL real en PGlite. Sin Supabase, mensajes o usuarios remotos.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { safetyFixture } from './safety-fixture.ts'
import { ids } from './online-fixture.ts'
const f = await safetyFixture(), admin = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'
const contexts = [], errors = [], passed = []
const user = id => ({ id, email: id + '@fixture.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: new Date().toISOString() })
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  try { res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.woff2') ? 'font/woff2' : 'text/html'); res.end(await readFile(path.join('apps/mobile/dist', p === '/' ? 'index.html' : p.slice(1)))) } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
let browser
async function go(page, route) { await page.evaluate(route => { location.hash = '#' + route }, route) }
async function web(id) {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } }); contexts.push(context)
  await context.routeWebSocket('**/realtime/v1/websocket*', ws => ws.onMessage(message => {
    const [join, ref, topic, event, payload] = JSON.parse(message)
    if (event === 'phx_join') { ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: (payload.config?.postgres_changes ?? []).map((x, i) => ({ ...x, id: i + 1 })) } }])); ws.send(JSON.stringify([join, null, topic, 'system', { status: 'ok', extension: 'postgres_changes' }])) }
    else if (event === 'heartbeat' || event === 'phx_leave') ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: {} }]))
  }))
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), name = url.pathname.split('/').at(-1)
    if (url.origin === origin) return route.continue()
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (req.method() === 'OPTIONS') return reply({})
    if (url.pathname === '/auth/v1/token') return reply({ access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture', refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: user(id) })
    if (url.pathname === '/auth/v1/user') return reply(user(id))
    if (url.pathname === '/api/community/report') {
      try {
        const body = req.postDataJSON(), report = await f.rpc('report_community_content', { p_kind: body.kind, p_target: body.target, p_reason: body.reason, p_detail: body.detail }, id)
        return reply({ ok: true, id: report, imageWarning: false })
      } catch (error) { return reply({ error: error.message }, 400) }
    }
    try {
      if (url.pathname.includes('/rpc/')) {
        if (name === 'app_compatibility') return reply({ compatible: true, versionCode: 19, minimumCode: 17, updateUrl: null, contract: 'trucazo-online-v1', serverNow: Date.now(), activeGameId: null, activeTeamId: null })
        if (['touch_last_seen','ensure_lobby_tables','get_my_objectives','tournament_ready_match','active_medal_for'].includes(name)) return reply(null)
        if (['get_active_medals','tournament_notifications_list'].includes(name)) return reply([])
        if (name === 'team_lobby') return reply({ tables: [], mine: [] })
        return reply(await f.rpc(name, req.postDataJSON() ?? {}, id))
      }
      let rows
      if (name === 'profiles' && url.searchParams.has('username')) rows = (await f.db.query('select * from profiles where username=$1', [url.searchParams.get('username').slice(3)])).rows
      else if (['chat_messages','news'].includes(name)) rows = (await f.asUser(id, () => f.db.query('select * from ' + name + ' order by created_at desc limit 50'))).rows
      else rows = await f.read(name, url.searchParams, id)
      return reply(req.headers().accept?.includes('object') ? rows[0] ?? null : rows)
    } catch (error) { return reply({ message: error.message, code: error.code }, 400) }
  })
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin); await page.getByLabel('Email o usuario').fill(id + '@fixture.invalid'); await page.getByLabel('Contraseña', { exact: true }).fill('fixture')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await page.getByRole('heading', { name: 'Mesas disponibles' }).waitFor()
  return page
}
try {
  await f.db.query("insert into profiles(id,username,is_admin) values($1,'Administrador local',true)", [admin])
  browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
  const A = await web(ids.A), B = await web(ids.B), H = await web(admin)
  await go(B, '/comunidad'); await B.getByRole('button', { name: 'Chat', exact: true }).click()
  await B.getByPlaceholder('Escribí un mensaje…').fill('ANDROID-12 evidencia aislada')
  await B.getByRole('button', { name: 'Enviar', exact: true }).click()
  await B.getByRole('dialog', { name: 'Normas de convivencia', exact: true }).waitFor()
  await B.getByRole('button', { name: 'Ahora no', exact: true }).click()
  assert.equal(await B.getByPlaceholder('Escribí un mensaje…').inputValue(), 'ANDROID-12 evidencia aislada')
  await B.getByRole('button', { name: 'Enviar', exact: true }).click(); await B.getByRole('button', { name: 'Acepto las normas', exact: true }).click()
  await B.getByPlaceholder('Escribí un mensaje…').waitFor(); await B.waitForFunction(() => document.querySelector('input[placeholder="Escribí un mensaje…"]').value === '')
  passed.push('normas: rechazo conserva borrador; aceptación explícita y envío SQL')
  await go(A, '/comunidad'); await A.getByRole('button', { name: 'Chat', exact: true }).click()
  await A.getByText('ANDROID-12 evidencia aislada', { exact: true }).waitFor()
  await A.getByRole('button', { name: 'Opciones de Cuenta B', exact: true }).click()
  await A.getByLabel('Detalle (opcional)').fill('Prueba aislada de convivencia')
  await A.getByRole('button', { name: 'Enviar denuncia', exact: true }).click()
  await A.getByText(/Denuncia recibida/).waitFor()
  await A.getByRole('button', { name: 'Enviar denuncia', exact: true }).click()
  assert.equal((await f.db.query('select * from community_safety.reports')).rows.length, 1)
  await A.screenshot({ path: 'android/generated/android-12-report.png' })
  await A.getByRole('button', { name: 'Bloquear persona', exact: true }).click(); await A.getByRole('button', { name: 'Confirmar bloqueo', exact: true }).click(); await A.getByText(/Persona bloqueada/).waitFor()
  await A.getByRole('button', { name: 'Cerrar', exact: true }).click(); await A.getByText('ANDROID-12 evidencia aislada', { exact: true }).waitFor({ state: 'hidden' })
  await go(A, '/convivencia'); await A.getByRole('button', { name: 'Desbloquear', exact: true }).waitFor()
  await go(B, '/comunidad'); await B.getByRole('button', { name: 'Amigos', exact: true }).click(); await B.getByPlaceholder('Nombre de usuario').fill('Cuenta A'); await B.getByRole('button', { name: 'Agregar', exact: true }).click(); await B.getByText(/bloqueo/).waitFor()
  passed.push('denunciar/reintentar/bloquear y rechazo desde otra cuenta, con SQL')
  await go(H, '/admin/denuncias'); await H.getByRole('heading', { name: 'Denuncias de convivencia', exact: true }).waitFor(); await H.getByText('Ver copia del contenido denunciado', { exact: true }).click()
  await H.getByText(/ANDROID-12 evidencia aislada/).waitFor(); await H.getByLabel('Decisión').selectOption('remove'); await H.getByLabel('Respuesta para quien denunció').fill('Contenido retirado en prueba aislada')
  await H.getByRole('button', { name: 'Resolver denuncia', exact: true }).click(); await H.getByText('Resuelta: Contenido retirado en prueba aislada', { exact: true }).waitFor()
  await H.screenshot({ path: 'android/generated/android-12-admin.png' })
  await go(A, '/lobby'); await go(A, '/convivencia'); await A.getByText('Contenido retirado en prueba aislada', { exact: true }).waitFor()
  await A.getByRole('button', { name: 'Desbloquear', exact: true }).click(); await A.getByText('No bloqueaste a nadie.', { exact: true }).waitFor()
  await go(B, '/admin/denuncias'); await B.getByText('Esta sección es sólo para administradores.', { exact: true }).waitFor()
  passed.push('admin recibe, revisa evidencia y resuelve; autor ve sólo su estado; rol ordinario rechazado')
  for (const [width, height] of [[320,568],[360,640],[768,1024]]) {
    await A.setViewportSize({ width, height }); await go(A, '/lobby'); await go(A, '/convivencia'); await A.getByRole('heading', { name: 'Convivencia', exact: true }).waitFor()
    assert.ok(await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await A.getByLabel('Nombre de usuario exacto').fill('Cuenta B'); await A.getByRole('button', { name: 'Buscar persona', exact: true }).click(); await A.getByRole('button', { name: 'Opciones de Cuenta B', exact: true }).click()
    assert.ok(await A.getByRole('dialog', { name: 'Denunciar o bloquear', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }))
    await A.screenshot({ path: 'android/generated/android-12-dialog-' + width + '.png' }); await A.keyboard.press('Escape'); await A.getByRole('dialog').waitFor({ state: 'hidden' })
  }
  passed.push('320/360/768 sin desborde; diálogo visible y cierre por Escape')
  assert.deepEqual(errors, [])
  await writeFile('android/generated/android-12-browser.json', JSON.stringify({ environment: 'Interfaz empaquetada + PostgreSQL PGlite aislado; Auth/Realtime simulados', passed }, null, 2))
  console.log('OK', passed)
} catch (error) { for (const context of contexts) for (const page of context.pages()) console.log((await page.locator('body').innerText()).slice(-4000)); throw error }
finally { for (const context of contexts) await context.close(); await browser?.close(); await new Promise(resolve => server.close(resolve)); await f.db.close() }
