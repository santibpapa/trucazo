import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { onlineFixture, ids } from './online-fixture.ts'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const evidence = path.resolve('android/generated', process.env.ANDROID_QA_EVIDENCE_DIR || ''), root = path.resolve(process.env.ANDROID_QA_DIST || 'apps/mobile/dist')
const legacy = JSON.parse(await readFile(path.join(root, 'build-info.json'), 'utf8')).version === '0.16.1'
await mkdir(evidence,{recursive:true})
const fixture = await onlineFixture(), calls = [], sockets = new Set(), errors = []
const user = owner => ({id:ids[owner],email:owner+'@fixture.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},is_anonymous:false,created_at:new Date().toISOString()})
const sessions = new Map()
let failNextBot = false, failNextAdvance = false, serverClockOffset = 0
const token = owner => {
  const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:ids[owner],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture'
  sessions.set(jwt,owner)
  return {access_token:jwt,refresh_token:owner+'-refresh',expires_in:3600,token_type:'bearer',user:user(owner)}
}
const mime = p => p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':p.endsWith('.webp')?'image/webp':p.endsWith('.woff2')?'font/woff2':'text/html'
const server = createServer(async(req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname
  try{res.setHeader('Content-Type',mime(p));res.end(await readFile(path.join(root,p==='/'?'index.html':p.slice(1))))}catch{res.writeHead(404).end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser = await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true})
async function broadcast() {
  for(const socket of sockets) for(const join of socket.joins.values()) for(const filter of join.filters) {
    const query=new URLSearchParams()
    if(filter.filter){const [column,...value]=filter.filter.split('=');query.set(column,value.join('='))}
    const rows=await fixture.read(filter.table,query,ids[socket.owner])
    for(const record of rows) socket.ws.send(JSON.stringify([join.ref,null,join.topic,'postgres_changes',{
      ids:[filter.id],data:{schema:'public',table:filter.table,type:'UPDATE',record,old_record:{},
        columns:Object.entries(record).map(([name,value])=>({name,type:typeof value==='object'?'jsonb':typeof value==='number'?'int4':typeof value==='boolean'?'bool':'text'})),
        commit_timestamp:new Date().toISOString(),errors:null},
    }]))
  }
}
async function client(owner) {
  const context=await browser.newContext({viewport:{width:360,height:568}})
  await context.routeWebSocket('**/realtime/v1/websocket*',ws=>{
    const socket={ws,owner,joins:new Map()};sockets.add(socket)
    ws.onMessage(message=>{
      // El SDK actual codifica los emotes como frames binarios; este fixture
      // sólo reproduce la replicación de tables/games y los latidos Phoenix.
      if(typeof message!=='string' || !message.startsWith('['))return
      const [joinRef,ref,topic,event,payload]=JSON.parse(String(message))
      if(event==='phx_join') {
        const filters=(payload.config?.postgres_changes??[]).map((filter,i)=>({...filter,id:i+1}))
        socket.joins.set(topic,{ref:joinRef,topic,filters})
        ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:filters}}]))
        ws.send(JSON.stringify([joinRef,null,topic,'system',{status:'ok',extension:'postgres_changes',message:'Subscribed to PostgreSQL'}]))
      } else if(event==='phx_leave') {socket.joins.delete(topic);ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]))}
      else if(event==='heartbeat') ws.send(JSON.stringify([null,ref,topic,'phx_reply',{status:'ok',response:{}}]))
    })
    ws.onClose(()=>sockets.delete(socket))
  })
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin===origin)return route.continue()
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}
    const reply=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)})
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers})
    const body=request.postDataJSON(),authenticated=sessions.get(request.headers().authorization?.replace(/^Bearer /,''))
    calls.push({owner:authenticated,path:url.pathname,method:request.method(),body,query:url.search})
    if(url.pathname==='/auth/v1/token')return reply(token(owner))
    if(url.pathname==='/auth/v1/user')return authenticated?reply(user(authenticated)):reply({message:'Unauthorized'},401)
    if(url.pathname==='/auth/v1/logout')return reply({})
    if(!authenticated)return reply({message:'Unauthorized'},401)
    try {
      if(url.pathname.startsWith('/rest/v1/rpc/')){
        const name=url.pathname.split('/').at(-1)
        if(name==='bot_step' && failNextBot){failNextBot=false;return reply({message:'Corte de red de prueba'},503)}
        if(name==='advance_hand' && failNextAdvance){failNextAdvance=false;return reply({message:'Corte de red de prueba'},503)}
        if(name==='app_compatibility')return reply({compatible:true,versionCode:18,minimumCode:17,updateUrl:null,contract:'trucazo-online-v1',serverNow:Date.now()+serverClockOffset,activeGameId:null,activeTeamId:null})
        if(name==='active_medal_for')return reply('ninguno')
        if(name==='team_lobby')return reply({tables:[],mine:[]})
        if(name==='community_safety_state')return reply({accepted:true,restricted_until:null})
        if(name==='get_community')return reply({friends:[],incoming:[],outgoing:[],invite_out:null,group:null,group_invites_in:[],
          invites_in:await fixture.asUser(ids[authenticated],async()=>(await fixture.db.query('select id as invite_id,from_id,from_username,table_id,bet,target_score from game_invites where to_id=$1',[ids[authenticated]])).rows)})
        if(['touch_online','get_my_objectives','tournament_ready_match','get_game_objective_progress'].includes(name))return reply(null)
        const result=await fixture.rpc(name,body,ids[authenticated]);await broadcast();return reply(result)
      }
      if(url.pathname.startsWith('/rest/v1/')){
        const rows=await fixture.read(url.pathname.split('/').at(-1),url.searchParams,ids[authenticated])
        return reply(request.headers().accept?.includes('object')?rows[0]??null:rows)
      }
      return reply({})
    } catch(failure){return reply({message:failure.message,code:failure.code??'fixture'},400)}
  })
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message))
  await page.clock.install()
  page.on('dialog',dialog=>dialog.accept())
  await page.goto(origin);await page.getByLabel('Email o usuario').fill(owner+'@fixture.invalid')
  await page.getByLabel('Contraseña').fill('fixture-password');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await page.getByRole('heading',{name:'Mesas disponibles'}).waitFor()
  return {context,page}
}
const wait = async predicate => {for(let i=0;i<100;i++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Estado esperado no llegó')}
const game = async id => (await fixture.db.query('select * from games where id=$1',[id])).rows[0]
const refresh = page => page.evaluate(()=>window.dispatchEvent(new Event('mobile:refresh')))
const tables = async () => (await fixture.db.query('select * from tables order by created_at desc')).rows
let A,B
try {
  A=await client('A');B=await client('B')
  await A.page.getByRole('button',{name:'Crear mesa',exact:true}).click()
  await A.page.getByLabel('Nombre de la mesa').fill('Privada Android 05')
  await A.page.getByRole('button',{name:'A 15',exact:true}).click()
  await A.page.getByText('Mesa privada',{exact:true}).click()
  await A.page.getByRole('button',{name:'Crear',exact:true}).click()
  await A.page.getByRole('heading',{name:/^(Invitá a tu rival|Compartí el código)$/}).waitFor()
  const table=(await tables())[0]
  assert.equal(table.is_private,true)
  await A.page.getByRole('button',{name:'Ir a la sala de espera'}).click()
  await A.page.getByRole('heading',{name:'Esperando rival'}).waitFor()
  assert.equal((await fixture.read('tables',new URLSearchParams({id:'eq.'+table.id}),ids.B)).length,0)
  await assert.rejects(()=>fixture.rpc('join_table',{p_table_id:table.id},ids.B),/disponible/)
  await assert.rejects(()=>fixture.rpc('join_table_by_code',{p_code:'INVALIDO'},ids.B),/invalido/)
  // El mismo RPC que usa el diálogo web de código hace el ingreso atómico.
  await fixture.rpc('join_table_by_code',{p_code:table.private_code},ids.B)
  await broadcast();await B.page.evaluate(id=>location.hash='#/game/'+id,table.id)
  await A.page.locator('[data-game-actions]').waitFor();await B.page.locator('[data-game-actions]').waitFor()
  assert.equal((await fixture.read('game_hands',new URLSearchParams({game_id:'eq.'+table.id}),ids.A)).length,1)
  assert.equal((await fixture.read('game_hands',new URLSearchParams({game_id:'eq.'+table.id,player_id:'eq.'+ids.B}),ids.A)).length,0)
  assert.ok(![...sockets].some(socket=>[...socket.joins.values()].some(join=>join.filters.some(filter=>filter.table==='game_hands'))))
  const initial=await game(table.id)
  await A.page.getByRole('button',{name:'Envido',exact:true}).click();await wait(async()=> (await game(table.id)).envido_state.status==='envido')
  await B.page.getByRole('button',{name:'Quiero',exact:true}).click()
  await A.page.getByRole('button',{name:/^Tengo /}).click();await B.page.getByRole('button',{name:/^Tengo /}).click()
  await A.page.getByRole('button',{name:'Truco',exact:true}).click()
  await B.page.getByRole('button',{name:'Retruco',exact:true}).click()
  await A.page.getByRole('button',{name:'Vale Cuatro',exact:true}).click()
  await B.page.getByRole('button',{name:'Quiero',exact:true}).click()
  await A.page.getByRole('button',{name:/^Jugar \d+ de /}).first().click()
  await wait(async()=> (await game(table.id)).played_cards.length===1)
  const played=structuredClone(await game(table.id)),beforeCalls=calls.filter(c=>c.path.endsWith('/play_card')).length
  await A.page.getByRole('status').filter({hasText:'Turno de Cuenta B'}).waitFor()
  await A.page.waitForTimeout(600)
  await A.page.clock.fastForward(4000)
  serverClockOffset += 4000
  const secondsBefore=Number((await A.page.getByRole('status').filter({hasText:'⏱'}).innerText()).match(/⏱\s*(\d+)s/)[1])
  await A.context.setOffline(true);await A.page.getByRole('status').filter({hasText:'necesita conexión'}).waitFor()
  await A.context.setOffline(false);await A.page.locator('[data-game-actions]').waitFor();await refresh(A.page)
  const secondsAfter=Number((await A.page.getByRole('status').filter({hasText:'⏱'}).innerText()).match(/⏱\s*(\d+)s/)[1])
  assert.ok(secondsAfter<=secondsBefore,`El mismo turno no recupera tiempo al reconectar: ${secondsBefore}→${secondsAfter}`)
  assert.equal(calls.filter(c=>c.path.endsWith('/play_card')).length,beforeCalls)
  assert.equal((await game(table.id)).played_cards.length,played.played_cards.length)
  // Completar la partida con acciones SQL reales; la UI recibe el mismo estado.
  for(let i=0;i<50;i++) {
    const g=await game(table.id);if(g.status==='finished')break
    if(g.awaiting_deal)await fixture.rpc('advance_hand',{p_game_id:g.id},ids.A)
    else await fixture.rpc('irse_al_mazo',{p_game_id:g.id},g.current_turn)
  }
  await broadcast();await A.page.getByRole('button',{name:'Revancha',exact:true}).waitFor()
  const finished=await game(table.id),coinSnapshot=await fixture.db.query('select id,coins,games_played from profiles order by id')
  await fixture.rpc('start_game',{p_game_id:table.id},ids.A)
  assert.deepEqual((await fixture.db.query('select id,coins,games_played from profiles order by id')).rows,coinSnapshot.rows)
  const resultBounds=await A.page.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,
    controls:Array.from(document.querySelectorAll('button')).map(b=>b.getBoundingClientRect().toJSON()).filter(r=>r.width&&r.height)}))
  assert.ok(resultBounds.scroll<=resultBounds.height,JSON.stringify(resultBounds))
  assert.ok(resultBounds.controls.every(r=>r.bottom<=resultBounds.height),JSON.stringify(resultBounds))
  await A.page.getByRole('button',{name:'Objetivos de esta partida',exact:true}).click()
  await A.page.getByRole('dialog',{name:'Objetivos de esta partida',exact:true}).waitFor()
  await A.page.getByRole('button',{name:'Cerrar ventana'}).click()
  await A.page.screenshot({path:path.join(evidence,'android-05-fixture-result.png')})
  await A.page.getByRole('button',{name:'Revancha',exact:true}).click()
  await B.page.getByRole('button',{name:'Revancha',exact:true}).click()
  await wait(async()=>!!(await game(table.id)).rematch_game_id)
  const rematch=(await game(table.id)).rematch_game_id
  await wait(async()=>(await A.page.evaluate(()=>location.hash))==='#/game/'+rematch)
  await A.page.locator('[data-game-actions]').waitFor()
  const next=await game(rematch);assert.equal(next.target_score,15);assert.equal(next.mano_player,ids.B)
  await A.page.getByRole('button',{name:'Abandonar partida',exact:true}).click()
  await wait(async()=>(await game(rematch)).status==='finished')
  await A.page.getByRole('button',{name:'Volver al lobby',exact:true}).click()
  await A.page.getByRole('heading',{name:'Mesas disponibles'}).waitFor()
  if (!legacy) {
  await fixture.db.query("insert into friendships(requester_id,addressee_id,status) values($1,$2,'accepted')",[ids.A,ids.B])
  const invitation=await fixture.rpc('invite_friend',{p_friend_id:ids.B,p_target_score:30},ids.A)
  await B.page.evaluate(()=>location.hash='#/lobby')
  await B.page.getByRole('main').getByText('Cuenta A te invita a jugar',{exact:true}).waitFor()
  await B.page.getByRole('button',{name:'Jugar',exact:true}).click()
  await B.page.locator('[data-game-actions]').waitFor()
  assert.equal(await B.page.evaluate(()=>location.hash),'#/game/'+invitation.table_id)
  assert.equal((await game(invitation.table_id)).target_score,30)
  await fixture.rpc('forfeit',{p_game_id:invitation.table_id},ids.B)
  const botTable=await fixture.rpc('create_table',{p_name:'Recuperación de bot',p_bet:10,p_is_private:false,p_target_score:15},ids.A)
  await fixture.rpc('bot_join_table',{p_table_id:botTable.id},ids.A)
  await A.page.evaluate(id=>location.hash='#/game/'+id,botTable.id)
  await A.page.locator('[data-game-actions]').waitFor()
  failNextBot=true
  const botCalls=calls.filter(c=>c.path.endsWith('/bot_step')).length
  await A.page.getByRole('button',{name:/^Jugar \d+ de /}).first().click()
  await wait(()=>calls.filter(c=>c.path.endsWith('/bot_step')).length>botCalls)
  const playCalls=calls.filter(c=>c.path.endsWith('/play_card')).length
  await refresh(A.page)
  await wait(()=>calls.filter(c=>c.path.endsWith('/bot_step')).length>botCalls+1)
  assert.equal(calls.filter(c=>c.path.endsWith('/play_card')).length,playCalls)
  await fixture.rpc('forfeit',{p_game_id:botTable.id},ids.A)
  const dealTable=await fixture.rpc('create_table',{p_name:'Recuperación de reparto',p_bet:10,p_is_private:true,p_private_code:'DEAL05'},ids.A)
  await fixture.rpc('join_table_by_code',{p_code:'DEAL05'},ids.B)
  await fixture.rpc('start_game',{p_game_id:dealTable.id},ids.A)
  failNextAdvance=true
  const advanceCalls=calls.filter(c=>c.path.endsWith('/advance_hand')).length
  await fixture.rpc('irse_al_mazo',{p_game_id:dealTable.id},ids.A)
  await A.page.evaluate(id=>location.hash='#/game/'+id,dealTable.id)
  await A.page.locator('[data-game-actions]').waitFor()
  await wait(()=>calls.filter(c=>c.path.endsWith('/advance_hand')).length>advanceCalls)
  await refresh(A.page)
  await wait(async()=>(await game(dealTable.id)).hand_number===2)
  assert.equal((await game(dealTable.id)).hand_number,2)
  await fixture.rpc('forfeit',{p_game_id:dealTable.id},ids.A)
  const layoutTable=await fixture.rpc('create_table',{p_name:'Cantos completos',p_bet:10,p_is_private:true,p_private_code:'LAYOUT05'},ids.A)
  await fixture.rpc('join_table_by_code',{p_code:'LAYOUT05'},ids.B)
  await fixture.rpc('start_game',{p_game_id:layoutTable.id},ids.A)
  await fixture.rpc('sing_truco',{p_game_id:layoutTable.id,p_type:'truco'},ids.A)
  await B.page.evaluate(id=>location.hash='#/game/'+id,layoutTable.id)
  await B.page.getByRole('button',{name:'Envido',exact:true}).waitFor()
  for(const viewport of [{width:360,height:568},{width:360,height:640},{width:390,height:844}]) {
    await B.page.setViewportSize(viewport)
    const bounds=await B.page.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,
      controls:Array.from(document.querySelectorAll('button')).map(b=>({label:b.textContent.trim()||b.getAttribute('aria-label'),rect:b.getBoundingClientRect().toJSON()})).filter(b=>b.rect.width&&b.rect.height)}))
    assert.ok(bounds.scroll<=bounds.height,JSON.stringify(bounds))
    assert.ok(bounds.controls.every(b=>b.rect.bottom<=bounds.height&&b.rect.top>=0),JSON.stringify(bounds))
    await B.page.screenshot({path:path.join(evidence,`android-05-fixture-cantos-${viewport.width}x${viewport.height}.png`)})
  }
  await fixture.rpc('forfeit',{p_game_id:layoutTable.id},ids.B)
  }
  assert.ok(calls.filter(c=>c.path.endsWith('/game_hands')).every(c=>new URLSearchParams(c.query).get('player_id')==='eq.'+ids[c.owner]))
  await writeFile(path.join(evidence,'android-05-controller-fixture.json'),JSON.stringify({scope:'UI/SDK reales; Auth/Community/WebSocket simulados; funciones 1v1, invitaciones y RLS reales en PGlite aislado, sin triggers de ranking/objetivos ni Supabase remoto',legacy,privateCreate:true,privateAccessDenied:true,codeJoin:true,invitationEntry:!legacy,ownHandOnly:true,noHandsRealtime:true,envidoAndDeclaration:true,trucoEscalation:true,card:true,reconnectWithoutReplay:true,clockReconnect:{before:secondsBefore,after:secondsAfter},botRecovery:!legacy,dealRecovery:!legacy,finishedScore:[finished.player1_score,finished.player2_score],target:initial.target_score,rematch:true,forfeit:true,realCoinsFromSQL:true,errors},null,2))
  assert.deepEqual(errors,[])
  console.log('OK 1v1 empaquetado: mesa privada, código, RLS, envido/tantos, truco/retruco/vale cuatro, carta, red, resultado, revancha, abandono y saldo SQL.')
} catch(failure) {
  if(A)await A.page.screenshot({path:path.join(evidence,'android-05-fixture-failure.png')})
  throw failure
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await fixture.db.close()}
