import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { EMPTY_STYLE, BOTS_VERSION } from '../src/lib/offline-trial/bots.ts'
import { getEnvidoPoints } from '../src/lib/truco.ts'
import { legalActions, step, botStep } from '../src/lib/offline-trial/engine.ts'
import { createCampaign, startDuel, applyTurn, CAMPAIGN_VERSION } from '../src/lib/offline-campaign/model.ts'

const A='00000000-0000-4000-a000-000000000001', B='00000000-0000-4000-a000-000000000002'
const manifest=JSON.parse(await readFile('public/android/historia/manifest.json','utf8'))
const catalog=JSON.parse(await readFile('public/android/historia/catalog.json','utf8'))
const snapshot=(owner=A,points=0)=>({version:CAMPAIGN_VERSION,engine_version:BOTS_VERSION,userId:owner,exported_at:'2026-10-11T10:00:00Z',
  points,coins:1000,style:structuredClone(EMPTY_STYLE),progress:points>=17500?[{rival_id:catalog.rivals.find(r=>r.slug==='antartica').id,beaten_at:'2026-10-10T10:00:00Z',wins:1,rematch_points:0}]:[],catalog})
const resources=new Map(await Promise.all([...manifest.assets.map(a=>a.path),'/sw.js','/offline.html','/android/historia/manifest.json']
  .map(async path=>[path,await readFile('public'+path)])))
let userId=A, unauth=false, offline=false, broken='', corrupt=false, exportFail=false
const requests=[],errors=[]
const harness=(await build({stdin:{contents:"import * as storage from './src/lib/offline-campaign/storage'; import * as model from './src/lib/offline-campaign/model'; import * as engine from './src/lib/offline-trial/engine'; globalThis.fixture={...storage,...model,...engine};",resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),path=url.pathname; requests.push(path)
  if(offline){req.socket.destroy();return}
  res.setHeader('Cache-Control','no-store')
  if(path==='/api/android/historia'){
    res.setHeader('Content-Type','application/json');res.statusCode=unauth?401:exportFail&&url.searchParams.get('identity')!=='1'?503:200
    res.end(JSON.stringify(unauth?{error:'Entrá con tu cuenta.'}:res.statusCode===503?{error:'Servidor pendiente.'}:url.searchParams.get('identity')==='1'?{userId}:snapshot(userId)))
  }else if(path===broken){res.statusCode=corrupt?200:503;res.end('incompleto')}
  else if(resources.has(path)){
    const type=path.endsWith('.js')?'text/javascript':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.woff2')?'font/woff2':path.endsWith('.wav')?'audio/wav':'image/webp'
    res.setHeader('Content-Type',type);res.end(resources.get(path))
  }else {res.setHeader('Content-Type','text/html');res.end('<h1>Online</h1>')}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port,root=resolve('android/generated')
await mkdir(root,{recursive:true});const profile=await mkdtemp(join(root,'historia-profile-'))
let context,page
async function launch(){
  context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,viewport:{width:360,height:640},reducedMotion:'reduce'})
  // Acortar únicamente la espera visual; azar, reglas y guardado son reales.
  await context.addInitScript(()=>{for(const owner of ['00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002'])localStorage.setItem('trucazo:campania:tutorial:'+owner,'1');const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms>=1000&&ms<=6500?20:ms,...args)})
}
async function connect(path='/android/historia/index.html'){
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+path)
  await page.addScriptTag({content:harness});await page.waitForFunction(()=>document.querySelector('#campaign')||document.querySelector('#prepare')&&!document.querySelector('#prepare').disabled).catch(async error=>{console.log('Arranque:',errors,await page.locator('body').innerText());throw error})
}
const saved=()=>page.evaluate(async()=>{const owner=await fixture.campaignOwner();return owner?fixture.loadCampaign(owner):undefined})
async function seed(c){
  await page.evaluate(async c=>{
    const db=await fixture.openCampaignStore()
    await new Promise((resolve,reject)=>{const tx=db.transaction(['meta','campaigns'],'readwrite');tx.objectStore('meta').put(c.owner,'active');tx.objectStore('campaigns').put(c,c.owner);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close()
  },c)
  await page.reload();await page.addScriptTag({content:harness});await page.locator('#campaign').waitFor({state:'visible'})
}
async function prepared(){await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Historia lista'));if(await page.getByRole('button',{name:'Cerrar ventana',exact:true}).count())await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click()}
async function refresh(){await page.getByRole('button',{name:'Sin internet · guardado',exact:true}).click();await page.locator('#refresh').click()}
async function fit(){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const size=await page.evaluate(()=>({height:innerHeight,width:innerWidth,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth}))
  assert.ok(size.scrollHeight<=size.height&&size.scrollWidth<=size.width,JSON.stringify(size))
  assert.equal(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-game-actions] button,[data-card-hand="me"] button')).every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})),true)
  await page.waitForFunction(()=>Array.from(document.images).filter(i=>i.closest('#table')&&!i.closest('[hidden]')).every(i=>i.complete&&i.naturalWidth>0))
}
function chosen(t){
  const a=legalActions(t,A)
  return a.find(a=>a.type==='advance_hand')??a.find(a=>a.type.startsWith('respond_')&&a.accept)
    ??a.find(a=>a.type==='envido_say'&&a.value==='tengo')??a.filter(a=>a.type==='play_card').sort((a,b)=>a.card.rank-b.card.rank)[0]
}
function gameWithSeed(rival,win){
  for(let seed=1;seed<=200;seed++){
    let c=startDuel(createCampaign(snapshot(A,50000),manifest.digest),rival.id,seed,crypto.randomUUID())
    for(let n=0;n<1500&&c.trial.game.status==='playing';n++){
      const t=c.trial,g=t.game,bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
      c=applyTurn(c,g.awaiting_deal?step(t,{player:A,type:'advance_hand'}):bot?botStep(t):step(t,chosen(t)),new Date().toISOString())
    }
    if((c.trial.game.winner_id===A)===win)return {seed,result:c}
  }
  throw new Error('Sin semilla de prueba')
}
async function playComplete(){
  for(let n=0;n<1500;n++){
    const c=await saved(),t=c.trial,g=t.game
    if(g.status==='finished')return c
    const bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
    if(g.awaiting_deal||bot){await page.waitForTimeout(30);continue}
    const a=chosen(t);assert.ok(a)
    const label=a.type==='play_card'?'Jugar '+a.card.value+' de '+a.card.suit:a.type==='advance_hand'?'Siguiente mano'
      :a.type.startsWith('respond_')?a.accept?'Quiero':'No quiero':a.value==='tengo'?'Tengo '+getEnvidoPoints([...t.hands[0],...g.played_cards.filter(pc=>pc.player_id===A).map(pc=>pc.card)]):'Son buenas'
    await page.getByRole('button',{name:label,exact:true}).click()
    await page.waitForFunction(revision=>window.fixture&&document.querySelector('#table')||document.querySelector('#result'), c.revision)
  }
  throw new Error('Partida no terminó')
}
try{
  await launch();await connect()
  broken='/personajes/duena-silencio.webp';await page.locator('#prepare').click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('no terminó'))
  assert.equal(await saved(),undefined);assert.equal(await page.locator('#campaign').count(),0)
  broken='';await page.locator('#prepare').click();await prepared()
  assert.equal((await saved()).official.catalog.rivals.length,66)
  assert.equal(await page.locator('button[aria-label^="Entrar a "],button[aria-label$=" bloqueada"]').count(),15)
  const cachePaths=await page.evaluate(async()=>{const names=await caches.keys();return(await Promise.all(names.map(async name=>(await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname)))).flat()})
  assert.equal(cachePaths.some(p=>p.startsWith('/api/')),false)
  assert.equal(cachePaths.filter(p=>p.startsWith('/personajes/')).length,66)
  console.log('Descarga y mapa preparados.')
  const pointer=await page.evaluate(async()=>await(await(await caches.open('trucazo-historia-ready-v1')).match('/android/historia/manifest.json')).text())
  broken='/cartas/espada_01.webp';corrupt=true;await refresh()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('no terminó'))
  assert.equal(await page.evaluate(async()=>await(await(await caches.open('trucazo-historia-ready-v1')).match('/android/historia/manifest.json')).text()),pointer)
  await page.keyboard.press('Escape')
  broken='';corrupt=false
  await page.getByRole('button',{name:'Entrar a Buenos Aires',exact:true}).click();await page.getByRole('button',{name:'Ver a '+catalog.rivals[0].display_name,exact:true}).click()
  await page.getByRole('button',{name:'Jugar',exact:true}).click();await page.locator('#table').waitFor({state:'visible'});await page.getByRole('button',{name:'Guardar y salir',exact:true}).click()
  const open=await saved();assert.equal(open.trial.rival,catalog.rivals[0].id)
  await context.close();offline=true;await launch();await context.setOffline(true);await connect('/android')
  assert.deepEqual(await saved(),open)
  await page.locator('#resume').click();await fit();await page.screenshot({path:join(root,'historia-partida-360x640.png')});await page.getByRole('button',{name:'Guardar y salir',exact:true}).click()
  // Cierre durante canta/declaración y layout con la mayor cantidad de opciones.
  let c=startDuel(createCampaign(snapshot(A),manifest.digest),catalog.rivals[0].id,77,'00000000-0000-4000-a000-000000000088')
  c.trial.game.mano_player=A;c.trial.game.current_turn=A
  const called=applyTurn(c,step(c.trial,{player:A,type:'sing_envido',value:'envido'}),new Date().toISOString())
  const respond=applyTurn(called,step(called.trial,{player:called.trial.game.player2_id,type:'respond_envido',accept:true}),new Date().toISOString())
  const declaration=applyTurn(respond,step(respond.trial,{player:A,type:'envido_say',value:'tengo'}),new Date().toISOString())
  const pending=structuredClone(c);pending.trial.game.current_turn=A;pending.trial.game.truco_state={status:'truco',value:2,last_singer:pending.trial.game.player2_id}
  for(const state of [c,called,respond,declaration,pending]){
    await seed(state);assert.deepEqual(await saved(),state)
    await page.locator('#resume').click()
    for(const size of [{width:360,height:640},{width:393,height:852},{width:320,height:568},{width:640,height:360}]){
      await page.setViewportSize(size);await fit()
    }
    await page.getByRole('button',{name:'Guardar y salir',exact:true}).click()
  }
  await page.setViewportSize({width:360,height:640})
  console.log('Reapertura y cinco estados en cuatro tamaños aprobados.')
  const northwest=catalog.rivals.find(r=>r.slug==='olivarero'),northSeed=gameWithSeed(northwest,false)
  await seed(startDuel(createCampaign(snapshot(A,50000),manifest.digest),northwest.id,northSeed.seed,'00000000-0000-4000-a000-000000000076'))
  await page.locator('#resume').click();const northResult=await playComplete()
  assert.equal(northResult.trial.game.target_score,30);assert.equal(northResult.trial.game.winner_id,northwest.bot_id)
  assert.equal(northResult.pending_coins,0);await fit();await page.locator('#result').waitFor({state:'visible'});await page.locator('#new-game').click()
  console.log('Noroeste a 30: '+northResult.trial.game.player1_score+' a '+northResult.trial.game.player2_score+'; derrota sin premio.')
  const winning=gameWithSeed(catalog.rivals[0],true)
  const santaFe=catalog.provinces.find(p=>p.slug==='santa-fe')
  c=startDuel(createCampaign(snapshot(A,santaFe.points_required-1),manifest.digest),catalog.rivals[0].id,winning.seed,'00000000-0000-4000-a000-000000000077')
  await seed(c);const apiBefore=requests.filter(p=>p.startsWith('/api/')).length
  await page.locator('#resume').click();const won=await playComplete();assert.equal(won.trial.result.winner,A)
  assert.equal(won.pending.length,1);assert.ok(won.pending_coins>0);assert.equal(won.official.coins,1000)
  assert.equal(requests.filter(p=>p.startsWith('/api/')).length,apiBefore)
  console.log('Partida completa: '+won.trial.game.player1_score+' a '+won.trial.game.player2_score+'; premio en cola.')
  await fit();await page.locator('#new-game').click();await page.screenshot({path:join(root,'historia-mapa-360x640.png')})
  assert.equal(await page.getByRole('button',{name:'Entrar a Santa Fe',exact:true}).count(),1)
  await page.reload();await page.addScriptTag({content:harness});assert.deepEqual(await saved(),won)
  // Renovar conserva el paquete completo, la base usada y los resultados.
  offline=false;await context.setOffline(false);await page.goto(origin+'/android/historia/index.html');await page.addScriptTag({content:harness})
  await page.locator('#campaign').waitFor({state:'visible'});await refresh();await prepared()
  const renewed=await saved();assert.deepEqual(renewed.pending,won.pending);assert.equal(renewed.points,won.points)
  assert.deepEqual(renewed.official,won.official)
  // Dos escritores y fallo de almacenamiento: ninguna jugada queda falsamente guardada.
  const duel=await page.evaluate(async()=>{const c=await fixture.loadCampaign(await fixture.campaignOwner());return fixture.startDuel(c,c.official.catalog.rivals[0].id,99,crypto.randomUUID())})
  await page.evaluate(async({duel,renewed})=>fixture.saveCampaign(duel,renewed),{duel,renewed})
  const revision=await page.evaluate(async()=>{
    const c=await fixture.loadCampaign(await fixture.campaignOwner()),t=c.trial
    const a=fixture.legalActions(t,c.owner).find(a=>a.type==='play_card')
    const next=fixture.applyTurn(c,a?fixture.step(t,a):fixture.botStep(t),new Date().toISOString())
    const results=await Promise.allSettled([fixture.saveCampaign(next,c),fixture.saveCampaign(next,c)])
    return results.map(r=>r.status)
  });assert.deepEqual(revision.sort(),['fulfilled','rejected'])
  await page.reload();await page.addScriptTag({content:harness});await page.locator('#campaign').waitFor({state:'visible'}).catch(async error=>{console.log(await page.locator('body').innerText());console.log(await saved());throw error})
  // Inyectar fallo únicamente en el put de estado; conservar la lectura real.
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;window.restorePut=()=>{IDBObjectStore.prototype.put=original};IDBObjectStore.prototype.put=function(...args){if(this.name==='campaigns')throw new DOMException('Sin espacio','QuotaExceededError');return original.apply(this,args)}})
  const beforeFailure=await saved()
  await page.locator('#resume').click()
  if(beforeFailure.trial.game.current_turn===A) await page.locator('[data-card-hand="me"] button:enabled,[data-game-actions] button:enabled').first().click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('No avanzamos'))
  assert.deepEqual(await saved(),beforeFailure);await page.evaluate(()=>restorePut())
  // B no ve A aunque la exportación de B esté pendiente; A se conserva oculta.
  userId=B;exportFail=true;await page.reload();await page.addScriptTag({content:harness})
  await page.locator('#welcome').waitFor({state:'visible'});assert.equal(await saved(),undefined)
  await page.locator('#prepare').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Servidor pendiente'))
  assert.equal(await saved(),undefined);assert.deepEqual(await page.evaluate(A=>fixture.loadCampaign(A),A),beforeFailure)
  exportFail=false;await page.locator('#prepare').click();await prepared();assert.equal((await saved()).owner,B);assert.equal((await saved()).pending.length,0)
  userId=A;await page.reload();await page.addScriptTag({content:harness});await page.locator('#prepare').click();await prepared()
  assert.deepEqual((await saved()).pending,beforeFailure.pending)
  unauth=true;await page.reload();await page.addScriptTag({content:harness});await page.locator('#welcome').waitFor({state:'visible'});assert.equal(await saved(),undefined)
  assert.equal(errors.length,0,errors.join('\n'))
  console.log('Navegador Historia: descarga de 147 archivos, integridad, mapa de 15 provincias, partida completa, cierre/retoma, 4 tamaños, cola conservada, dos escritores, falta de espacio y aislamiento de cuentas aprobados.')
}finally{
  await context?.close();await new Promise(r=>server.close(r))
  assert.ok(resolve(profile).startsWith(root+requireSeparator()))
  await rm(profile,{recursive:true,force:true})
}
function requireSeparator(){return process.platform==='win32'?'\\':'/'}
