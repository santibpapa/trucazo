// Interfaz empaquetada y, con --device, APK instalado. Todas las operaciones de
// torneos/juego usan SQL local; Auth del APK conserva su sesión QA real.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { tournamentFixture } from './tournament-fixture.ts'
import { deviceCDP } from './device-cdp.mjs'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const native = process.argv.includes('--device'), f = await tournamentFixture()
const qa = ['b00d207b-8d36-4b59-8479-346b91ce762d', 'ebf2c130-304d-431f-9754-110715ca2892', '2c9dd1e8-a39b-41e7-af2a-f67502691795']
const admin = 'a0100000-0000-4000-a000-000000000000'
const people = [qa[2], qa[0], ...Array.from({ length: 14 }, (_, i) => 'a0100000-0000-4000-a000-' + String(i + 1).padStart(12, '0'))]
const errors = [], calls = [], contexts = [], report = { scope: 'UI empaquetada + SQL PGlite; Auth/PostgREST/WebSocket simulados; sin servidor real de torneos', native, tournaments: [] }
const user = id => ({ id, email: id + '@fixture.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: new Date().toISOString() })
let c, browser
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  try { res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.woff2') ? 'font/woff2' : 'text/html'); res.end(await readFile(path.join('apps/mobile/dist', p === '/' ? 'index.html' : p.slice(1)))) } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
const wait = async predicate => { for (let i = 0; i < 160; i++) { const result = await predicate(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 100)) } throw Error('La interfaz de torneos no llegó al estado esperado') }
async function rest(url, body, owner, headers = {}) {
  const name = url.pathname.split('/').at(-1)
  if (url.pathname.includes('/rpc/')) {
    calls.push({ owner, name })
    if (name === 'app_compatibility') return { compatible: true, versionCode: 19, minimumCode: 17, updateUrl: null, contract: 'trucazo-online-v1', serverNow: Date.now(), activeGameId: null, activeTeamId: null }
    if (name === 'active_medal_for') return 'ninguno'
    if (name === 'get_community') return { friends: [], incoming: [], outgoing: [], invites_in: [], invite_out: null, group: null, group_invites_in: [] }
    if (['touch_online', 'touch_last_seen', 'get_my_objectives', 'ensure_lobby_tables', 'touch_presence'].includes(name)) return null
    return f.rpc(name, body ?? {}, owner)
  }
  if (name === 'profiles' && (url.searchParams.has('username') || url.searchParams.has('id') && url.searchParams.get('id').startsWith('in.'))) {
    const pattern = url.searchParams.get('username')?.slice(6)
    const ids = url.searchParams.get('id')?.slice(4, -1).split(',')
    const rows = (await f.db.query(pattern ? 'select * from profiles where username ilike $1' : 'select * from profiles where id=any($1::uuid[])', [pattern ?? ids])).rows
    return headers.accept?.includes('object') ? rows[0] ?? null : rows
  }
  const rows = await f.read(name, url.searchParams, owner)
  return headers.accept?.includes('object') ? rows[0] ?? null : rows
}
async function web(id) {
  const context = await browser.newContext({ viewport: { width: 360, height: 568 } }); contexts.push(context)
  await context.routeWebSocket('**/realtime/v1/websocket*', ws => ws.onMessage(message => {
    if (typeof message !== 'string' || !message.startsWith('[')) return
    const [join, ref, topic, event, payload] = JSON.parse(message)
    if (event === 'phx_join') { ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: (payload.config?.postgres_changes ?? []).map((x, i) => ({ ...x, id: i })) } }])); ws.send(JSON.stringify([join, null, topic, 'system', { status: 'ok', extension: 'postgres_changes' }])) }
    else if (event === 'heartbeat' || event === 'phx_leave') ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: {} }]))
  }))
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === origin) return route.continue()
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin }, body: JSON.stringify(body) })
    if (request.method() === 'OPTIONS') return reply({})
    if (url.pathname === '/auth/v1/token') return reply({ access_token: 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.fixture', refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: user(id) })
    if (url.pathname === '/auth/v1/user') return reply(user(id))
    try { return reply(await rest(url, request.postData() ? request.postDataJSON() : null, id, request.headers())) } catch (e) { console.log('Fixture:', url.pathname, e.message); return reply({ message: e.message, code: e.code }, 400) }
  })
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message))
  page.on('dialog', dialog => dialog.accept())
  await page.goto(origin); await page.getByLabel('Email o usuario').fill(id + '@fixture.invalid'); await page.getByLabel('Contraseña', { exact: true }).fill('fixture'); await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await page.getByRole('heading', { name: 'Mesas disponibles' }).waitFor()
  return page
}
async function go(page, route) {
  if (page === c) await c.evaluate('location.hash=' + JSON.stringify('#' + route))
  else await page.evaluate(route => { location.hash = '#' + route }, route)
}
async function text(page) { return page === c ? c.evaluate('document.body.innerText') : page.locator('body').innerText() }
async function has(page, value) { return (await text(page)).includes(value) }
async function click(page, name) {
  if (page !== c) return page.getByRole('button', { name, exact: true }).click()
  await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`))
}
async function shot(page, name) {
  const file = 'android/generated/android-10-' + (native ? 'native-' : '') + name + '.png'
  if (page === c) await writeFile(file, Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  else await page.screenshot({ path: file })
}
async function refresh(page) { if (page === c) await c.evaluate("window.dispatchEvent(new Event('mobile:refresh'))"); else await page.evaluate(() => window.dispatchEvent(new Event('mobile:refresh'))) }
async function seedTournament(mode, format = 'knockout', capacity = mode === '1v1' ? 4 : 8) {
  return f.rpc('tournament_admin_create', { p_request_id: crypto.randomUUID(), p_name: 'ANDROID-10 ' + mode + ' ' + format, p_description: 'Sólo SQL aislado', p_mode: mode, p_format: format, p_capacity: capacity, p_target_score: 15, p_prize_first: 200, p_prize_second: 100, p_prize_third: 50, p_starts_at: new Date(Date.now() + 40 * 60000).toISOString(), p_publish: true }, admin)
}
async function start(id) {
  await f.db.exec('alter table tournaments disable trigger tournaments_validate_future_start')
  await f.db.query("update tournaments set starts_at=now()-interval '1 minute' where id=$1", [id])
  await f.db.exec('alter table tournaments enable trigger tournaments_validate_future_start')
  await f.rpc('tournament_admin_start', { p_tournament_id: id }, admin)
}
async function finishMatches(id) {
  // Los helpers SQL son los que llaman los motores al terminar; la suite de
  // competencia comprueba aparte cartas, ausencias, progresión y repetición.
  for (let i = 0; i < 30; i++) {
    const rows = (await f.db.query("select * from tournament_matches where tournament_id=$1 and status in ('ready','playing') order by round_number,match_number", [id])).rows
    if (!rows.length) break
    for (const match of rows) {
      const members = (await f.db.query("select user_id from tournament_entry_members where entry_id in ($1,$2) and status='accepted' order by entry_id,user_id", [match.side_a_entry_id, match.side_b_entry_id])).rows
      for (const member of members) await f.rpc('tournament_enter_match', { p_match_id: match.id }, member.user_id)
      const m = (await f.db.query('select * from tournament_matches where id=$1', [match.id])).rows[0]
      if (m.game_id) {
        const g = (await f.db.query('select player1_id from games where id=$1', [m.game_id])).rows[0]
        await f.db.query('select finish_game($1,$2,15,5)', [m.game_id, g.player1_id]); await f.db.query('select finish_game($1,$2,15,5)', [m.game_id, g.player1_id])
      } else {
        await f.db.query('update team_games set scores=array[15,5] where id=$1', [m.team_game_id])
        await f.db.query("select team_internal.finish($1,0,'points')", [m.team_game_id]); await f.db.query("select team_internal.finish($1,0,'points')", [m.team_game_id])
      }
    }
  }
  assert.equal((await f.rpc('tournament_detail', { p_tournament_id: id }, qa[2])).tournament.status, 'completed')
}
try {
  for (const id of [...new Set([admin, ...people, qa[1]])]) {
    const username = qa.includes(id) ? 'androidqa' + (qa.indexOf(id) + 1) : id === admin ? 'Admin aislado' : 'Jugador' + people.indexOf(id)
    await f.db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, id + '@trucazo.com.ar'])
    await f.db.query('insert into profiles(id,username,is_admin,coins) values($1,$2,$3,1000)', [id, username, id === admin])
  }
  browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE, headless: true })
  const B = await web(qa[0]), S = await web(qa[1]), H = await web(admin)
  let A
  if (native) {
    c = await deviceCDP(); A = c
    assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), qa[2], 'El APK debe conservar QA3')
    c.onEvent(event => {
      if (event.method === 'Network.loadingFailed') console.log('Red APK:', event.params.errorText, event.params.corsErrorStatus)
      if (event.method !== 'Fetch.requestPaused') return
      void (async () => {
        const { requestId, request } = event.params
        let data, status = 200
        try { data = request.method === 'OPTIONS' ? {} : await rest(new URL(request.url), request.postData ? JSON.parse(request.postData) : null, qa[2], { accept: request.headers.Accept ?? request.headers.accept }) }
        catch (e) { status = 400; data = { message: e.message, code: e.code } }
        await c.send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'https://localhost' }, { name: 'Access-Control-Allow-Headers', value: request.headers['Access-Control-Request-Headers'] ?? request.headers['access-control-request-headers'] ?? 'apikey,authorization,x-client-info,content-type,x-supabase-api-version' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' }], body: Buffer.from(JSON.stringify(data)).toString('base64') })
      })().catch(e => errors.push(e.message))
    })
    await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.supabase.co/rest/v1/*', requestStage: 'Request' }] })
    await c.send('Network.enable')
    report.scope = 'APK instalado y clientes web empaquetados + SQL PGlite; Auth QA3 real; REST del APK interceptado sólo durante el ensayo; sin escritura de torneos en Supabase'
  } else A = await web(qa[2])
  await go(A, '/admin/torneos'); await wait(() => has(A, 'sólo para administradores')); await shot(A, 'role-denied')
  await assert.rejects(() => f.rpc('tournament_admin_start', { p_tournament_id: crypto.randomUUID() }, qa[2]), /administrador/i)
  // Administración completa sobre un borrador aislado, sin publicar a terceros.
  await go(H, '/admin/torneos/nuevo'); await H.getByLabel('Nombre', { exact: true }).fill('Borrador Android 10')
  await H.getByRole('button', { name: 'Guardar borrador', exact: true }).click(); await H.getByRole('heading', { name: 'Editar borrador', exact: true }).waitFor()
  await shot(H, 'admin-draft')
  await H.getByRole('button', { name: 'Guardar y publicar', exact: true }).click(); await H.getByRole('heading', { name: 'Borrador Android 10', exact: true }).waitFor()
  for (const mode of ['1v1', '2v2']) {
    console.log('UI torneo:', native ? 'APK' : 'browser', mode)
    const t = await seedTournament(mode), count = mode === '1v1' ? 4 : 8
    await go(A, '/torneos'); await wait(() => has(A, t.name)); await shot(A, mode + '-hub')
    await go(A, '/torneos/' + t.id); await wait(() => has(A, 'Anotarme'))
    if (mode === '1v1') { await click(A, 'Anotarme'); await wait(() => has(A, 'Ya estás inscripto')) }
    await go(B, '/torneos/' + t.id); await wait(() => has(B, 'Anotarme'))
    await click(B, mode === '2v2' ? 'Anotarme solo' : 'Anotarme'); await wait(() => has(B, 'Ya estás inscripto'))
    if (mode === '2v2') {
      await B.getByLabel('Invitar compañero por nombre de usuario').fill('androidqa3'); await B.getByRole('button', { name: 'Enviar invitación', exact: true }).click()
      await wait(() => has(B, 'Invitación enviada')); await refresh(A); await wait(() => has(A, 'Aceptar invitación')); await click(A, 'Aceptar invitación'); await wait(() => has(A, 'Equipo:'))
    }
    for (const id of people.slice(2, count)) await f.rpc('tournament_register_solo', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id }, id)
    const waitlisted = await f.rpc('tournament_register_solo', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id }, qa[1]); assert.ok(waitlisted)
    const waiting = await f.rpc('tournament_my_entry', { p_tournament_id: t.id }, qa[1]); assert.equal(waiting.entry.status, 'waitlisted')
    await go(S, '/torneos/' + t.id); await S.getByRole('heading', { name: 'Estás en lista de espera', exact: true }).waitFor()
    await f.rpc('tournament_admin_reschedule', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id, p_starts_at: new Date(Date.now() + 20 * 60000).toISOString() }, admin)
    await refresh(A); await wait(() => has(A, 'Confirmar presencia'))
    if (!(await has(A, 'Check-in listo'))) await click(A, 'Confirmar presencia')
    await wait(() => has(A, 'Check-in listo'))
    await refresh(B); await wait(() => has(B, 'Ya estás inscripto')); if (!(await has(B, 'Check-in listo'))) await click(B, 'Confirmar presencia')
    for (const id of people.slice(2, count)) await f.rpc('tournament_check_in', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id }, id)
    await shot(A, mode + '-checkin'); await go(H, '/admin/torneos/' + t.id); await H.getByRole('heading', { name: t.name, exact: true }).waitFor()
    // La pausa frena la siguiente ronda; los cruces ya abiertos continúan.
    await start(t.id)
    const detail = await f.rpc('tournament_detail', { p_tournament_id: t.id }, qa[2]), entry = await f.rpc('tournament_my_entry', { p_tournament_id: t.id }, qa[2])
    const match = detail.matches.find(m => [m.side_a_entry_id, m.side_b_entry_id].includes(entry.entry.id) && m.status === 'ready'); assert.ok(match)
    await f.rpc('tournament_admin_pause', { p_tournament_id: t.id, p_pause: true }, admin)
    await refresh(A); await wait(() => has(A, 'pausado')); await shot(A, mode + '-paused')
    await f.rpc('tournament_admin_pause', { p_tournament_id: t.id, p_pause: false }, admin)
    await refresh(A); await wait(() => has(A, 'Entrar a la partida')); await click(A, 'Entrar a la partida'); await wait(() => has(A, 'Esperando'))
    // Un compañero ausente todavía no genera una mesa 2v2.
    assert.equal((await f.db.query('select game_id,team_game_id from tournament_matches where id=$1', [match.id])).rows[0].team_game_id, null)
    const members = (await f.db.query("select user_id from tournament_entry_members where entry_id in ($1,$2) and status='accepted'", [match.side_a_entry_id, match.side_b_entry_id])).rows
    for (const member of members.filter(m => m.user_id !== qa[2])) await f.rpc('tournament_enter_match', { p_match_id: match.id }, member.user_id)
    await refresh(A); await wait(() => has(A, 'Ir a la partida'))
    const started = (await f.db.query('select game_id,team_game_id from tournament_matches where id=$1', [match.id])).rows[0]
    const gamePath = mode === '1v1' ? '/game/' + started.game_id : '/game/parejas/' + started.team_game_id
    await go(A, gamePath); await wait(() => has(A, 'Abandonar partida')); await shot(A, mode + '-table')
    // Llevar el turno hasta QA3 y jugar una carta con el control del cliente.
    for (let turn = 0; turn < 4; turn++) {
      if (mode === '1v1') {
        const g = (await f.db.query('select current_turn from games where id=$1', [started.game_id])).rows[0]
        if (g.current_turn === qa[2]) break
        const hand = (await f.db.query('select cards from game_hands where game_id=$1 and player_id=$2', [started.game_id, g.current_turn])).rows[0].cards
        await f.rpc('play_card', { p_game_id: started.game_id, p_card: hand[0] }, g.current_turn)
      } else {
        const s = await f.rpc('team_snapshot', { p_table_id: started.team_game_id }, qa[2]), actor = s.members.find(m => m.seat === s.actor)
        if (actor.user_id === qa[2]) break
        const view = await f.rpc('team_snapshot', { p_table_id: started.team_game_id }, actor.user_id)
        await f.rpc('team_action', { p_table_id: started.team_game_id, p_request_id: crypto.randomUUID(), p_version: view.table.version, p_action: 'play', p_card: view.hand[0] }, actor.user_id)
      }
    }
    await refresh(A); await wait(() => has(A, 'Abandonar partida'))
    const card = A === c ? await wait(() => c.evaluate("Array.from(document.querySelectorAll('button')).find(b=>!b.disabled&&b.getAttribute('aria-label')?.startsWith('Jugar '))?.getAttribute('aria-label')")) : await A.getByRole('button', { name: /^Jugar / }).first().getAttribute('aria-label')
    await click(A, card)
    await wait(async () => (await f.rpc('tournament_spectator_snapshot', { p_match_id: match.id }, qa[1])).game.played.length > 0)
    await go(S, '/torneos/' + t.id + '/partidas/' + match.id); await S.getByRole('heading', { name: 'Partida en vivo', exact: true }).waitFor()
    const snapshot = await f.rpc('tournament_spectator_snapshot', { p_match_id: match.id }, qa[1]); assert.ok(snapshot.game); assert.ok(!('hand' in snapshot.game)); assert.ok(!('hands' in snapshot.game))
    assert.ok(snapshot.game.played.length > 0)
    const handTable = mode === '1v1' ? 'game_hands' : 'team_hands', key = mode === '1v1' ? 'game_id' : 'table_id'
    assert.equal((await f.asUser(qa[1], () => f.db.query(`select * from ${handTable} where ${key}=$1`, [started.game_id ?? started.team_game_id]))).rows.length, 0)
    await shot(S, mode + '-spectator-web')
    await go(A, '/torneos/' + t.id + '/partidas/' + match.id); await wait(() => has(A, 'Partida en vivo')); await shot(A, mode + '-spectator')
    assert.equal(await has(A, 'Todavía no se jugó ninguna carta.'), false)
    const geometry = () => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollHeight, horizontal: document.documentElement.scrollWidth, cards: Array.from(document.images).map(img => ({ loaded: img.complete && img.naturalWidth > 0, ...img.getBoundingClientRect().toJSON() })) })
    const sizes = native ? [null] : [[320, 568], [360, 568], [768, 1024], [640, 360]]
    for (const size of sizes) {
      if (size) { await A.setViewportSize({ width: size[0], height: size[1] }); await A.waitForTimeout(250) }
      const view = A === c ? await c.evaluate('(' + geometry.toString() + ')()') : await A.evaluate(geometry)
      assert.equal(view.scroll, view.height, JSON.stringify(view)); assert.ok(view.horizontal <= view.width, JSON.stringify(view))
      assert.ok(view.cards.every(card => card.bottom <= view.height && card.right <= view.width && card.x >= 0), JSON.stringify(view))
      await shot(A, mode + '-spectator-' + view.width + 'x' + view.height)
    }
    if (!native) await A.setViewportSize({ width: 360, height: 568 })
    await go(A, '/torneos/' + t.id); await wait(() => has(A, 'Ir a la partida')); await go(A, gamePath); await wait(() => has(A, 'Abandonar partida'))
    await finishMatches(t.id)
    await refresh(A); await wait(() => has(A, 'Volver al torneo')); await shot(A, mode + '-result')
    await go(A, '/torneos/' + t.id); await wait(() => has(A, 'Finalizado')); await shot(A, mode + '-final')
    const awards = (await f.db.query('select user_id,coins,placement from tournament_awards where tournament_id=$1 order by user_id', [t.id])).rows
    assert.equal(awards.length, mode === '1v1' ? 3 : 6)
    const before = (await f.db.query('select id,coins from profiles order by id')).rows
    await finishMatches(t.id); assert.deepEqual((await f.db.query('select id,coins from profiles order by id')).rows, before)
    report.tournaments.push({ id: t.id, mode, registered: count, matchId: match.id, gameId: started.game_id ?? started.team_game_id, awards, waitlist: true, checkin: true, pause: true, missingPartner: mode === '2v2', spectatorPrivate: true, reentry: true, repeatedAwards: false })
  }
  for (const mode of ['1v1', '2v2']) {
    const count = mode === '1v1' ? 8 : 16, t = await seedTournament(mode, 'groups', count)
    for (const id of people.slice(0, count)) await f.rpc('tournament_register_solo', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id }, id)
    await f.rpc('tournament_admin_reschedule', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id, p_starts_at: new Date(Date.now() + 20 * 60000).toISOString() }, admin)
    for (const id of people.slice(0, count)) await f.rpc('tournament_check_in', { p_request_id: crypto.randomUUID(), p_tournament_id: t.id }, id)
    await start(t.id); await go(A, '/torneos/' + t.id); await wait(() => has(A, 'Tabla de grupos')); await shot(A, mode + '-groups')
    await finishMatches(t.id); await refresh(A); await wait(() => has(A, 'Posiciones finales')); await shot(A, mode + '-groups-final')
    report.tournaments.push({ id: t.id, mode, format: 'groups', registered: count, awards: (await f.db.query('select user_id,placement,coins from tournament_awards where tournament_id=$1', [t.id])).rows })
  }
  const cancelled = await seedTournament('1v1')
  await f.rpc('tournament_register_solo', { p_request_id: crypto.randomUUID(), p_tournament_id: cancelled.id }, qa[2])
  await f.rpc('tournament_admin_reschedule', { p_request_id: crypto.randomUUID(), p_tournament_id: cancelled.id, p_starts_at: new Date(Date.now() + 3 * 3600000).toISOString() }, admin)
  await go(A, '/torneos/' + cancelled.id); await wait(() => has(A, 'Ya estás inscripto'))
  await f.rpc('tournament_admin_cancel', { p_request_id: crypto.randomUUID(), p_tournament_id: cancelled.id, p_reason: 'Ensayo aislado' }, admin)
  await refresh(A); await wait(() => has(A, 'Este torneo fue cancelado')); await shot(A, 'cancelled')
  await go(A, '/torneos'); await wait(() => has(A, 'El torneo cambió de fecha.')); await wait(() => has(A, 'El torneo fue cancelado.'))
  if (!native) {
    await A.context().setOffline(true); await wait(() => has(A, 'necesitan conexión')); await A.context().setOffline(false); await wait(() => has(A, 'Torneos'))
    for (const [width, height] of [[320, 568], [360, 568], [768, 1024]]) {
      await A.setViewportSize({ width, height }); await A.waitForTimeout(250)
      assert.ok(await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await shot(A, 'hub-' + width)
    }
  } else {
    await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await wait(() => has(A, 'necesitan conexión')); await shot(A, 'offline')
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await wait(() => has(A, 'Avisos de torneos'))
  }
  assert.deepEqual(errors, []); report.admin = true; report.rescheduleCancel = true; report.calls = calls.length
  await writeFile('android/generated/android-10-' + (native ? 'native' : 'browser') + '.json', JSON.stringify(report, null, 2))
  console.log('OK torneos 1v1/2v2, inscripción/equipo, espera/check-in, pausa, mesas/reingreso, espectador privado, cierre/premio, avisos y rol.', report.tournaments.map(t => ({ mode: t.mode, id: t.id, awards: t.awards.length })))
} catch (error) {
  if (c) console.log('APK:', await c.evaluate('({route:location.hash,text:document.body.innerText})'))
  console.log('Errores:', errors)
  console.log('Últimas RPC:', calls.slice(-20))
  for (const context of contexts) for (const page of context.pages()) console.log('Diagnóstico:', await page.evaluate(() => location.hash), (await page.locator('body').innerText()).slice(0, 1600))
  throw error
} finally {
  if (c) { await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {}); await c.send('Fetch.disable').catch(() => {}); await go(c, '/lobby').catch(() => {}); c.close() }
  if (browser) await browser.close()
  await new Promise(resolve => server.close(resolve)); await f.db.close()
}
