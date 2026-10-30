// Presentación empaquetada + SQL social aislado. Administración usa datos ficticios; no hay correos.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { communityFixture } from './community-fixture.ts'
import { adminStats, acquisition, person } from './community-admin-data.mjs'
import { deviceCDP } from './device-cdp.mjs'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const native = false, f = await communityFixture()
const qa = ['b00d207b-8d36-4b59-8479-346b91ce762d', 'ebf2c130-304d-431f-9754-110715ca2892', '2c9dd1e8-a39b-41e7-af2a-f67502691795']
const admin = 'a0100000-0000-4000-a000-000000000000'
const errors = [], calls = [], contexts = [], report = { scope: 'UI empaquetada + SQL PGlite; Auth/PostgREST/WebSocket simulados; sin servidor real de torneos', native, passed: [] }
const user = id => ({ id, email: id + '@fixture.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: new Date().toISOString() })
let c, browser
const peers=[]
let feedbackFailure = true
let noticeAttempts = 0
const uploadedImages = new Set(), cleanedImages = []
const server = createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname
  try { res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.woff2') ? 'font/woff2' : 'text/html'); res.end(await readFile(path.join('apps/mobile/dist', p === '/' ? 'index.html' : p.slice(1)))) } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
const wait = async predicate => { for (let i = 0; i < 160; i++) { const result = await predicate(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 100)) } throw Error('La interfaz de comunidad no llegó al estado esperado') }
async function rest(url, body, owner, headers = {}) {
  const name = url.pathname.split('/').at(-1)
  if (url.pathname.includes('/rpc/')) {
    if (name === 'community_safety_state') return { accepted: true, restricted_until: null, blocks: [], reports: [] }
    if (name === 'admin_stats') return adminStats
    if (name === 'admin_acquisition') return acquisition
    if (name === 'admin_player') return person

    calls.push({ owner, name })
    if (name === 'active_medal_for') return 'ninguno'
    if (['get_active_medals','tournament_notifications_list'].includes(name)) return []
    if (name === 'team_lobby') return {tables:[],mine:[]}
    if (name === 'tournament_ready_match') return false
    if (['active_medal_for', 'touch_last_seen', 'get_my_objectives', 'ensure_lobby_tables', 'touch_presence'].includes(name)) return null
    const result = await f.rpc(name, body ?? {}, owner)
    if (name === 'send_chat_message') {
      const row=(await f.db.query('select * from chat_messages order by created_at desc limit 1')).rows[0]
      for(const peer of peers) for(const [i,config] of (peer.config??[]).entries()) if(config.table==='chat_messages') peer.ws.send(JSON.stringify([peer.join,null,peer.topic,'postgres_changes',{ids:[i+1],data:{schema:'public',table:'chat_messages',commit_timestamp:new Date().toISOString(),type:'INSERT',columns:[],record:row,old_record:{},errors:[]}}]))
    }
    return result
  }
  if (name === 'profiles' && (url.searchParams.has('username') || url.searchParams.has('id') && url.searchParams.get('id').startsWith('in.'))) {
    const pattern = url.searchParams.get('username')?.slice(6)
    const ids = url.searchParams.get('id')?.slice(4, -1).split(',')
    const rows = (await f.db.query(pattern ? 'select * from profiles where username ilike $1' : 'select * from profiles where id=any($1::uuid[])', [pattern ?? ids])).rows
    return headers.accept?.includes('object') ? rows[0] ?? null : rows
  }
  if (['chat_messages', 'news'].includes(name)) return (await f.asUser(owner, () => f.db.query('select * from ' + name + ' order by created_at desc limit 50'))).rows
  const rows = await f.read(name, url.searchParams, owner)
  return headers.accept?.includes('object') ? rows[0] ?? null : rows
}
async function web(id) {
  const context = await browser.newContext({ viewport: { width: 360, height: 568 } }); contexts.push(context)
  await context.routeWebSocket('**/realtime/v1/websocket*', ws => ws.onMessage(message => {
    if (typeof message !== 'string' || !message.startsWith('[')) return
    const [join, ref, topic, event, payload] = JSON.parse(message)
    if (event === 'phx_join') { peers.push({ws,join,topic,config:payload.config?.postgres_changes}); ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: (payload.config?.postgres_changes ?? []).map((x, i) => ({ ...x, id: i+1 })) } }])); ws.send(JSON.stringify([join, null, topic, 'system', { status: 'ok', extension: 'postgres_changes' }])) }
    else if (event === 'heartbeat' || event === 'phx_leave') ws.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response: {} }]))
  }))
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin === origin) return route.continue()
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin }, body: JSON.stringify(body) })
    if (request.method() === 'OPTIONS') return reply({})
    if (url.hostname === 'api.web3forms.com') {
      noticeAttempts++
      assert.equal((await f.db.query('select * from feedback')).rows.length, 1)
      assert.equal(request.postDataJSON().access_key, 'fixture-public-key')
      return route.abort('failed')
    }
    if (url.pathname.startsWith('/storage/v1/object/feedback-images/')) {
      const name = url.pathname.slice('/storage/v1/object/feedback-images/'.length)
      uploadedImages.add(name)
      return reply({ Key: 'feedback-images/' + name, Id: crypto.randomUUID() })
    }
    if (url.pathname === '/api/uploads/cleanup') {
      for (const name of request.postDataJSON().paths) { uploadedImages.delete(name); cleanedImages.push(name) }
      return reply({ ok: true })
    }
    if (url.pathname === '/api/feedback') {
      if (feedbackFailure) return reply({ error: 'Fallo de red simulado; reintentá.' }, 503)
      const body = request.postDataJSON()
      await f.rpc('submit_feedback', { p_rating_general: body.general, p_rating_aesthetics: body.aesthetics,
        p_understood: body.understood, p_had_problem: body.hadProblem, p_comment: body.comment, p_image_paths: body.paths }, id)
      return reply({ ok: true, emailNotice: { access_key: 'fixture-public-key', subject: 'Reseña aislada' } })
    }
    if (url.pathname === '/api/android/admin-emails') return reply({sender:'Prueba local',campaigns:[],newsState:{active:false,latest:null},rankingState:{active:false,pending:0,sent:0,failed:0,skipped:0}})
    if (url.pathname === '/api/admin/email-campaigns') return reply({campaign:{...request.postDataJSON(),id:crypto.randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),sent:0,failed:0,skipped:0}})
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
  const file = 'android/generated/android-11-isolated-' + (native ? 'native-' : '') + name + '.png'
  if (page === c) await writeFile(file, Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  else await page.screenshot({ path: file })
}
async function refresh(page) { if (page === c) await c.evaluate("window.dispatchEvent(new Event('mobile:refresh'))"); else await page.evaluate(() => window.dispatchEvent(new Event('mobile:refresh'))) }


try {
  for (const [id, name, isAdmin] of [[qa[0],'androidqa1',false],[qa[1],'androidqa2',false],[qa[2],'androidqa3',false],[admin,'Administrador local',true]]) await f.db.query('insert into profiles(id,username,is_admin,coins) values($1,$2,$3,1000)',[id,name,isAdmin])
  browser=await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true})
  const A=await web(qa[2]),B=await web(qa[0]),H=await web(admin)
  await go(A,'/comunidad');await A.getByRole('button',{name:'Chat',exact:true}).click()
  await go(B,'/comunidad');await B.getByRole('button',{name:'Chat',exact:true}).click()
  await A.getByPlaceholder('Escribí un mensaje…').fill('ANDROID-11 mensaje aislado');await A.getByRole('button',{name:'Enviar',exact:true}).click()
  await B.getByText('ANDROID-11 mensaje aislado',{exact:true}).waitFor()
  await A.getByPlaceholder('Escribí un mensaje…').fill('Frecuencia SQL');await A.getByRole('button',{name:'Enviar',exact:true}).click()
  await A.getByText(/esperá un momento/).waitFor();await shot(A,'chat')
  await go(H,'/comunidad');await H.getByRole('button',{name:'Novedades',exact:true}).click();await H.getByRole('button',{name:'Publicar',exact:true}).click()
  await H.getByPlaceholder('Título',{exact:true}).fill('Novedad sólo SQL local');await H.getByPlaceholder('Contenido de la novedad…').fill('Sin correos ni jugadores reales');await H.getByRole('button',{name:'Publicar',exact:true}).click();await H.getByText('Novedad sólo SQL local',{exact:true}).waitFor();await shot(H,'news-admin')
  // Invitación aceptada con las reglas SQL, entrada a juego y regreso de reseña.
  await f.rpc('send_friend_request',{p_username:'androidqa1'},qa[2]);const pending=(await f.rpc('get_community',{},qa[0])).incoming[0];await f.rpc('respond_friend_request',{p_friendship_id:pending.friendship_id,p_accept:true},qa[0])
  await go(A,'/lobby');await A.getByRole('heading',{name:'Mesas disponibles'}).waitFor();await go(A,'/comunidad');await A.getByRole('button',{name:'Invitar',exact:true}).click()
  await go(B,'/lobby');await B.getByRole('button',{name:'Jugar',exact:true}).click();await wait(()=>has(B,'Abandonar partida'))
  await wait(()=>has(A,'Abandonar partida'));const game=(await f.db.query("select id from games where status='playing'")).rows[0].id
  await shot(A,'invite-game');await f.rpc('forfeit',{p_game_id:game},qa[2]);await refresh(A);await wait(()=>has(A,'Dejar reseña'))
  await A.getByRole('button',{name:/reseña/i}).click();await A.getByText('Contanos qué te pareció').waitFor();await A.getByRole('button',{name:'Cancelar',exact:true}).click();await wait(()=>has(A,'Revancha'))
  await A.getByRole('button',{name:/reseña/i}).click();await A.getByText('Contanos qué te pareció').waitFor()
  await A.getByRole('button',{name:'5 de 5',exact:true}).nth(0).click();await A.getByRole('button',{name:'5 de 5',exact:true}).nth(1).click()
  await A.getByRole('button',{name:'Sí',exact:true}).nth(0).click();await A.getByRole('button',{name:'No',exact:true}).nth(1).click()
  await A.locator('#comment').fill('ANDROID-11 borrador con corte de red')
  await A.locator('#images').setInputFiles('android/generated/android-11-prueba.png')
  await A.context().setOffline(true);assert.equal(await A.locator('#comment').inputValue(),'ANDROID-11 borrador con corte de red')
  await A.context().setOffline(false);await A.waitForTimeout(400)
  assert.equal(await A.locator('#comment').inputValue(),'ANDROID-11 borrador con corte de red')
  await A.getByRole('button',{name:'Enviar',exact:true}).click();await A.getByText('Fallo de red simulado; reintentá.').waitFor()
  assert.equal(uploadedImages.size,0);assert.equal(cleanedImages.length,1)
  assert.equal(noticeAttempts,0)
  feedbackFailure=false;await A.getByRole('button',{name:'Enviar',exact:true}).click();await wait(()=>has(A,'Revancha'))
  assert.equal((await f.db.query('select * from feedback')).rows.length,1)
  assert.equal(noticeAttempts,1);assert.equal(uploadedImages.size,1)
  assert.ok(!(await A.locator('body').innerText()).includes('próxima versión de prueba'))
  for(const [route,heading] of [['/admin','Panel de estadísticas'],['/admin?dias=7','Panel de estadísticas'],['/admin/analytics','Tráfico y adquisición'],['/admin/persona/'+qa[0],'androidqa1'],['/admin/emails','Campañas de email']]){await go(H,route);await H.getByRole('heading',{name:heading,exact:true}).waitFor();await shot(H,'admin-'+route.split('/').at(-1).split('?')[0]);}
  await H.getByRole('button',{name:'Nueva',exact:true}).click();await shot(H,'email-draft')
  // Familia social y ayuda: tamaños pequeños y grandes sin desbordes horizontales.
  for(const [width,height] of [[320,568],[360,568],[768,1024]])for(const route of ['/comunidad','/contacto','/calculadora-envido']){await A.setViewportSize({width,height});await go(A,route);await A.getByRole('heading',{level:1}).waitFor();await shot(A,route.slice(1)+'-'+width);assert.ok(await A.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width+' '+JSON.stringify(await A.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right})).slice(0,8))))}
  assert.deepEqual(errors,[])
  report.scope='UI empaquetada + SQL social PGlite; Auth/Realtime simulados; administración con datos ficticios; sin servicios remotos'
  report.passed=['chat compartido y frecuencia SQL','novedad por administrador','invitación aceptada y mesa SQL','reseña y regreso a resultado; fallo del aviso no duplica ni borra imagen','rutas de administración por rol','320/360/768 sin desbordes']
  await writeFile('android/generated/android-11-browser.json',JSON.stringify(report,null,2));console.log('OK',report.passed)
} catch(error) {console.log('UI diagnóstico',errors,calls.slice(-12));for(const context of contexts)for(const page of context.pages())console.log(await page.locator('body').innerText().catch(()=>''));throw error} finally {for(const context of contexts)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await f.db.close()}
