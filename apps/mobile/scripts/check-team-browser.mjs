import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { teamFixture } from './team-fixture.ts'
import { ids } from './online-fixture.ts'
process.chdir(fileURLToPath(new URL('../../..',import.meta.url)))
const f=await teamFixture(), calls=[], errors=[]
const user=id=>({id,email:id+'@fixture.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},is_anonymous:false,created_at:new Date().toISOString()})
const server=createServer(async(req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname
  try {res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.woff2')?'font/woff2':'text/html');res.end(await readFile(path.join('apps/mobile/dist',p==='/'?'index.html':p.slice(1))))}catch{res.writeHead(404).end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true})
async function client(id) {
  const context=await browser.newContext({viewport:{width:360,height:568}})
  // La red y Auth se simulan; cada RPC de juego ejecuta el SQL real con su rol.
  await context.routeWebSocket('**/realtime/v1/websocket*',ws=>ws.onMessage(message=>{
    if(typeof message!=='string'||!message.startsWith('['))return
    const [join,ref,topic,event,payload]=JSON.parse(message)
    if(event==='phx_join') {ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:(payload.config?.postgres_changes??[]).map((x,i)=>({...x,id:i}))}}]));ws.send(JSON.stringify([join,null,topic,'system',{status:'ok',extension:'postgres_changes'}]))}
    else if(event==='heartbeat'||event==='phx_leave')ws.send(JSON.stringify([join,ref,topic,'phx_reply',{status:'ok',response:{}}]))
  }))
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin===origin)return route.continue()
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin},body:JSON.stringify(body)})
    if(request.method()==='OPTIONS')return reply({})
    if(url.pathname==='/auth/v1/token')return reply({access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture',refresh_token:'fixture',expires_in:3600,token_type:'bearer',user:user(id)})
    if(url.pathname==='/auth/v1/user')return reply(user(id))
    try {
      if(url.pathname.includes('/rpc/')) {
        const name=url.pathname.split('/').at(-1),body=request.postDataJSON();calls.push({id,name,body})
        if(name==='app_compatibility')return reply({compatible:true,versionCode:19,minimumCode:17,updateUrl:null,contract:'trucazo-online-v1',serverNow:Date.now(),activeGameId:null,activeTeamId:null})
        if(name==='active_medal_for')return reply('ninguno')
        if(name==='community_safety_state')return reply({accepted:true,restricted_until:null})
        if(name==='get_community')return reply({friends:[],incoming:[],outgoing:[],invites_in:[],invite_out:null,group:null,group_invites_in:[]})
        if(['get_my_objectives','touch_online','tournament_ready_match'].includes(name))return reply(null)
        return reply(await f.rpc(name,body??{},id))
      }
      const table=url.pathname.split('/').at(-1)
      const rows=table==='match_chat_messages'?await f.asUser(id,async()=>(await f.db.query('select * from match_chat_messages where team_table_id=$1',[url.searchParams.get('team_table_id')?.slice(3)])).rows):await f.read(table,url.searchParams,id)
      return reply(request.headers().accept?.includes('object')?rows[0]??null:rows)
    }catch(e){return reply({message:e.message,code:e.code},400)}
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin);await page.getByLabel('Email o usuario').fill(id+'@fixture.invalid');await page.getByLabel('Contraseña',{exact:true}).fill('fixture');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await page.getByRole('heading',{name:'Mesas disponibles'}).waitFor()
  return {context,page}
}
const wait=async predicate=>{for(let i=0;i<100;i++){if(await predicate())return;await new Promise(r=>setTimeout(r,100))}throw Error('Estado de parejas no llegó')}
const bounds=page=>page.evaluate(()=>({height:innerHeight,width:innerWidth,scroll:document.documentElement.scrollHeight,controls:Array.from(document.querySelectorAll('button')).filter(b=>b.getBoundingClientRect().width&&!b.disabled).map(b=>({text:b.innerText,...b.getBoundingClientRect().toJSON()})),missing:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'))}))
const report={scope:'Interfaz empaquetada + SQL real PGlite; Auth/PostgREST/WebSocket simulados',screens:[]}
try {
  await f.db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'a@fixture.invalid','{"username":"Cuenta A"}'),($2,'b@fixture.invalid','{"username":"Cuenta B"}')`,[ids.A,ids.B])
  const A=await client(ids.A),B=await client(ids.B)
  await A.page.getByRole('button',{name:'Crear mesa',exact:true}).click()
  await A.page.getByRole('button',{name:'2vs2 · Parejas',exact:true}).click()
  await A.page.getByLabel('Nombre de la mesa').fill('Parejas Android 09')
  await A.page.getByRole('button',{name:'Crear',exact:true}).click()
  await A.page.getByRole('heading',{name:'Parejas Android 09',exact:true}).waitFor()
  const id=(await A.page.evaluate(()=>location.hash)).split('/').at(-1)
  await A.page.getByRole('button',{name:'Sentarme en el asiento 1',exact:true}).click()
  await f.rpc('team_join',{p_request_id:crypto.randomUUID(),p_table_id:id},ids.B)
  await B.page.evaluate(id=>location.hash='#/game/parejas/'+id,id)
  await B.page.getByRole('button',{name:'Sentarme en el asiento 2',exact:true}).click()
  await wait(async()=>{const s=await f.rpc('team_snapshot',{p_table_id:id},ids.A);return s.members.some(m=>m.seat===1)})
  await A.page.getByRole('status').filter({hasText:'2/4'}).waitFor()
  await A.page.getByRole('button',{name:'Añadir bot',exact:true}).first().click()
  await A.page.getByRole('status').filter({hasText:'3/4'}).waitFor()
  await A.page.getByRole('button',{name:'Añadir bot',exact:true}).click()
  await A.page.getByRole('button',{name:'Empezar partida',exact:true}).click()
  await A.page.getByRole('region',{name:'Mesa de cuatro jugadores'}).waitFor()
  await B.page.getByRole('region',{name:'Mesa de cuatro jugadores'}).waitFor()
  const long=['truco_yes','truco_no','retruco','envido','real_envido','falta_envido','mazo']
  // Medir permisos reales largos: el truco inicial deja las siete opciones al rival.
  await A.page.getByRole('button',{name:'Truco',exact:true}).click()
  await B.page.getByRole('button',{name:'Retruco',exact:true}).waitFor()
  for(const [width,height] of [[360,568],[320,568],[768,1024],[640,360]]) {
    await B.page.setViewportSize({width,height});await B.page.waitForTimeout(500)
    const view=await bounds(B.page);assert.equal(view.scroll,height);assert.ok(view.controls.every(r=>r.y>=0&&r.bottom<=height&&r.x>=0&&r.right<=width),JSON.stringify(view))
    const state=await f.rpc('team_snapshot',{p_table_id:id},ids.B);assert.ok(long.every(a=>state.legal.includes(a)))
    report.screens.push({width,height,controls:view.controls.length});await B.page.screenshot({path:`android/generated/android-09-long-${width}x${height}.png`})
  }
  await B.page.setViewportSize({width:360,height:820})
  await B.page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','34px');document.documentElement.style.setProperty('--safe-area-inset-bottom','47px')})
  const safe=await bounds(B.page)
  assert.ok(await B.page.locator('[aria-label="Trucazo"]').evaluate(e=>e.getBoundingClientRect().top>=34),'Cabecera detrás de la barra de Android')
  assert.equal(safe.scroll,820)
  assert.ok(safe.controls.every(r=>r.top>=34&&r.bottom<=820-47),'Controles dentro de las barras Android')
  report.safeArea={top:34,bottom:47,headerAndControlsInside:true}
  await B.page.evaluate(()=>{document.documentElement.style.removeProperty('--safe-area-inset-top');document.documentElement.style.removeProperty('--safe-area-inset-bottom')})
  await B.page.setViewportSize({width:360,height:568})
  await B.page.getByRole('button',{name:'Chat de la mesa',exact:true}).click()
  await B.page.getByLabel('Escribir mensaje',{exact:true}).fill('Mesa compartida Android 09')
  await B.page.getByRole('button',{name:'Enviar',exact:true}).click()
  await B.page.getByRole('log').getByText('Mesa compartida Android 09',{exact:true}).waitFor()
  await B.page.getByRole('button',{name:'Frases rápidas',exact:true}).click()
  await B.page.getByRole('button',{name:'Algo tengo',exact:true}).click()
  await wait(async()=>calls.some(c=>c.name==='team_say'))
  const before=await f.rpc('team_snapshot',{p_table_id:id},ids.B)
  await B.context.setOffline(true);await B.page.getByRole('status').filter({hasText:'necesita conexión'}).waitFor()
  await B.context.setOffline(false);await B.page.getByRole('region',{name:'Mesa de cuatro jugadores'}).waitFor()
  const after=await f.rpc('team_snapshot',{p_table_id:id},ids.B)
  assert.equal(after.my_seat,before.my_seat);assert.deepEqual(after.hand,before.hand);assert.equal(after.game.action_started_at,before.game.action_started_at)
  await B.page.reload();await B.page.getByRole('region',{name:'Mesa de cuatro jugadores'}).waitFor()
  await B.page.getByRole('button',{name:'No quiero',exact:true}).click()
  // Resolver el resto con RPCs vigentes; el SQL, nunca el cliente, decide puntaje/pago.
  for(let i=0;i<150;i++) {
    const s=await f.rpc('team_snapshot',{p_table_id:id},ids.A);if(s.table.status==='finished')break
    await f.db.query("update team_games set action_started_at=clock_timestamp()-interval '3 seconds' where id=$1",[id])
    const actor=s.members.find(m=>m.seat===s.actor),owner=actor?.user_id??ids.A
    const view=await f.rpc('team_snapshot',{p_table_id:id},owner)
    await f.rpc('team_action',{p_table_id:id,p_request_id:crypto.randomUUID(),p_version:view.table.version,p_action:view.game.awaiting_deal||view.actor_is_bot?'tick':'mazo'},owner)
  }
  await A.page.getByRole('button',{name:'Volver al lobby',exact:true}).waitFor({timeout:15000})
  const final=await f.rpc('team_snapshot',{p_table_id:id},ids.A);assert.equal(final.table.status,'finished')
  await A.page.getByRole('button',{name:'Volver al lobby',exact:true}).click();await A.page.getByRole('heading',{name:'Mesas disponibles'}).waitFor()
  assert.deepEqual(errors,[]);report.recovery=true;report.writtenAndQuickChat=true;report.scores=final.game.scores
  await writeFile('android/generated/android-09-browser.json',JSON.stringify(report,null,2));console.log('OK interfaz de parejas, cantos largos en cuatro tamaños, chat, reconexión, resultado y regreso.',report)
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await f.db.close()}
