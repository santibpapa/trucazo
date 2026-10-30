// Navegador real con identidad ficticia. No usa cuentas ni partidas de producción.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { createTrial, legalActions, step, botStep, BOT, VERSION } from '../src/lib/offline-trial/engine.ts'

const HUMAN = '00000000-0000-4000-a000-000000000001'
let userId = HUMAN, rejectIdentity = false, failDownload = false, corruptDownload = false
const requests = []
let offlineNetwork = false
const root = resolve('android/generated')
await mkdir(root, { recursive: true })
const profile = await mkdtemp(join(root, 'tobias-profile-'))
const resources = new Map(await Promise.all([
  ['/sw.js','text/javascript'],['/offline.html','text/html'],['/android/tobias.html','text/html'],
  ['/android/tobias.js','text/javascript'],['/android/tobias-manifest.json','application/json'],
].map(async ([url,type])=>[url,{type,content:await readFile('public'+url)}])))
const harness = (await build({stdin:{contents:
  "import * as storage from './src/lib/offline-trial/storage'; import * as engine from './src/lib/offline-trial/engine'; globalThis.fixture={...storage,...engine};",
  resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
const server = createServer((req,res)=>{
  const path = new URL(req.url,'http://localhost').pathname; requests.push(path)
  if(offlineNetwork){req.socket.destroy();return}
  res.setHeader('Cache-Control','no-store')
  if(path==='/api/android/tobias'){
    res.setHeader('Content-Type','application/json')
    res.statusCode=rejectIdentity?401:200
    res.end(JSON.stringify(rejectIdentity?{error:'sin cuenta'}:{userId,version:VERSION}))
  }else if(path==='/android/tobias.js'&&(failDownload||corruptDownload)){
    res.setHeader('Content-Type','text/javascript');res.statusCode=failDownload?503:200;res.end('// incompleto')
  }else if(resources.has(path)){const resource=resources.get(path);res.setHeader('Content-Type',resource.type);res.end(resource.content)}
  else {res.setHeader('Content-Type','text/html');res.end('<h1>Online</h1>')}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
let context, page
const errors=[]
const launch=()=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,
  viewport:{width:360,height:640}})
async function connect(){
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/android/tobias.html')
  await page.addScriptTag({content:harness})
}
const snapshot=()=>page.evaluate(async()=>{const owner=await fixture.activeOwner();return owner?fixture.loadTrial(owner):null})
async function seed(t){
  await page.evaluate(async t=>{await fixture.setOwner(t.owner);const previous=await fixture.loadTrial(t.owner);await fixture.saveTrial(t,previous)},t)
  await page.reload();await page.addScriptTag({content:harness})
  await page.locator('#resume').waitFor({state:'visible'}).catch(async error => { console.log(await page.evaluate(() => ({status:document.querySelector('#status')?.textContent, body:document.body.innerText, online:navigator.onLine}))); console.log(await snapshot()); throw error })
}
async function waitRevision(previous){
  const deadline=Date.now()+15000
  while(Date.now()<deadline){
    if((await snapshot()).revision>previous)return
    await page.waitForTimeout(80)
  }
  throw new Error('El turno no avanzó: '+await page.locator('#status').textContent())
}
function winningSeed(){
  for(let seed=1;seed<=100;seed++){
    let t=createTrial(HUMAN,15,seed,'00000000-0000-4000-a000-000000000015')
    for(let n=0;n<600&&t.game.status==='playing';n++){
      if(t.game.awaiting_deal)t=step(t,{player:HUMAN,type:'advance_hand'})
      else if(t.game.envido_state.status==='declaring'?t.game.envido_state.declare_turn===BOT:t.game.current_turn===BOT)t=botStep(t)
      else{
        const options=legalActions(t,HUMAN)
        const a=options.find(a=>a.type.startsWith('respond_')&&a.accept)
          ??options.find(a=>a.type==='envido_say'&&a.value==='tengo')
          ??options.filter(a=>a.type==='play_card').sort((a,b)=>a.card.rank-b.card.rank)[0]
        assert.ok(a);t=step(t,a)
      }
    }
    if(t.game.winner_id===HUMAN)return seed
  }
  throw new Error('No se encontró una victoria reproducible')
}
async function fit(){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true)
  assert.equal(await page.evaluate(()=>Array.from(document.querySelectorAll('#actions button,#cards button')).every(b=>{
    const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth
  })),true)
}
try{
  context=await launch();await connect()
  assert.equal(await page.locator('#start15').isDisabled(),true)
  failDownload=true;await page.locator('#prepare').click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('no terminó'))
  assert.equal(await page.locator('#start15').isDisabled(),true)
  failDownload=false;await page.locator('#prepare').click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Ensayo descargado'))
  assert.equal(await page.locator('#start15').isDisabled(),false)
  const pointer=await page.evaluate(async()=>await(await(await caches.open('trucazo-tobias-ready-v1')).match('/android/tobias-manifest.json')).text())
  corruptDownload=true;await page.locator('#prepare').click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('no terminó'))
  assert.equal(await page.evaluate(async()=>await(await(await caches.open('trucazo-tobias-ready-v1')).match('/android/tobias-manifest.json')).text()),pointer)
  corruptDownload=false
  await page.locator('#start15').click();await page.locator('#table').waitFor({state:'visible'});await fit()
  await page.locator('#pause').click()
  const saved=await snapshot();assert.ok(saved)
  await context.close()
  offlineNetwork=true;context=await launch();await context.setOffline(true);page=await context.newPage()
  await page.goto(origin+'/android')
  await page.addScriptTag({content:harness});await page.locator('#resume').waitFor({state:'visible'})
  assert.deepEqual(await snapshot(),saved)
  await page.locator('#resume').click();await fit()
  await page.screenshot({path:join(root,'tobias-360x640.png')})
  await page.locator('#pause').click()
  // Interrupciones durante carta, canto y declaraciones. No cambia ni el azar.
  let t=createTrial(HUMAN,15,123,'00000000-0000-4000-a000-000000000020')
  t.game.mano_player=HUMAN;t.game.current_turn=HUMAN
  const cases=[]
  cases.push(step(t,{player:HUMAN,type:'play_card',card:t.hands[0][0]}))
  t=step(t,{player:HUMAN,type:'sing_truco',value:'truco'});cases.push(t)
  t=step(t,{player:BOT,type:'sing_envido',value:'envido'});cases.push(t)
  t=step(t,{player:HUMAN,type:'respond_envido',accept:true});cases.push(t)
  t=step(t,{player:HUMAN,type:'envido_say',value:'tengo'});cases.push(t)
  for(const sample of cases){
    await seed(sample)
    await page.locator('#resume').click();await fit();await page.locator('#pause').click()
    const before=await snapshot()
    await context.close();context=await launch();await context.setOffline(true)
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
    await page.goto(origin+'/android');await page.addScriptTag({content:harness})
    await page.locator('#resume').waitFor({state:'visible'})
    assert.deepEqual(await snapshot(),before)
  }
  // Reapertura justo antes/después del bot: la misma decisión, una sola vez.
  const beforeBot=cases[0], expected=botStep(beforeBot)
  await seed(beforeBot)
  await page.locator('#resume').click()
  await waitRevision(expected.revision - 1)
  await page.locator('#pause').click()
  assert.deepEqual(await snapshot(),expected)
  await page.reload();await page.addScriptTag({content:harness})
  assert.deepEqual(await snapshot(),expected)
  // Dos escritores compiten por la misma revisión. IndexedDB acepta uno.
  const race=await page.evaluate(async()=>{
    const previous=await fixture.loadTrial(await fixture.activeOwner())
    const action=fixture.legalActions(previous,previous.owner)[0]
    const next=fixture.step(previous,action)
    const outcomes=await Promise.allSettled([fixture.saveTrial(next,previous),fixture.saveTrial(next,previous)])
    return outcomes.map(r=>r.status)
  })
  assert.deepEqual(race.sort(),['fulfilled','rejected'])
  // Sin espacio: no se muestra una jugada que no llegó al guardado.
  await seed(cases[2]);await page.locator('#resume').click()
  const beforeFailure=await snapshot()
  await page.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction
    window.restoreTransaction=()=>{IDBDatabase.prototype.transaction=original}
    IDBDatabase.prototype.transaction=function(stores,mode,...args){
      if(mode==='readwrite')throw new DOMException('Sin espacio','QuotaExceededError')
      return original.call(this,stores,mode,...args)
    }
  })
  await page.getByRole('button',{name:'Quiero',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('No avanzamos'))
  assert.deepEqual(await snapshot(),beforeFailure)
  await page.evaluate(()=>window.restoreTransaction())
  // Todos los controles entran también con cinco opciones de envido.
  for(const viewport of [{width:320,height:568},{width:360,height:640},{width:412,height:915},{width:640,height:360}]){
    await page.setViewportSize(viewport);await seed(cases[2]);await page.locator('#resume').click();await fit()
    if(viewport.width===320)await page.screenshot({path:join(root,'tobias-envido-320x568.png')})
    await page.locator('#pause').click()
  }
  await page.setViewportSize({width:360,height:640})
  // Completar dos duelos por la pantalla, sin red: juego fuerte y juego débil.

  for(const [target,weak]of [[15,false],[30,true]]){
    let game=createTrial(HUMAN,target,weak?41:winningSeed(),'00000000-0000-4000-a000-0000000000'+(weak?'31':'15'))
    await seed(game);await page.waitForLoadState('networkidle');const requestCount=requests.length;await page.locator('#resume').click()
    const deadline=Date.now()+120000
    for(let count=0;count<600;count++){
      assert.ok(Date.now()<deadline,'El duelo no terminó en dos minutos')
      game=await snapshot()
      if(game.game.status==='finished')break
      if(await page.getByRole('button',{name:'Siguiente mano',exact:true}).count()){
        await page.getByRole('button',{name:'Siguiente mano',exact:true}).click()
      }else if(await page.getByRole('button',{name:'Quiero',exact:true}).count()){
        await page.getByRole('button',{name:'Quiero',exact:true}).click()
      }else if(await page.getByRole('button',{name:'Tengo · declarar tantos',exact:true}).count()){
        await page.getByRole('button',{name:'Tengo · declarar tantos',exact:true}).click()
      }else{
        const cards=game.hands[0].slice().sort((a,b)=>weak?b.rank-a.rank:a.rank-b.rank)
        let clicked=false
        for(const c of cards){
          const b=page.getByRole('button',{name:'Jugar '+c.value+' de '+c.suit,exact:true})
          if(await b.count()&&!await b.isDisabled()){await b.click();clicked=true;break}
        }
        if(!clicked){await page.waitForTimeout(80);count--;continue}
      }
      await waitRevision(game.revision)
    }
    game=await snapshot();assert.equal(game.game.status,'finished');assert.equal(game.result.status,'trial-only')
    assert.ok(game.game.player1_score>=target||game.game.player2_score>=target)
    assert.equal(game.game.winner_id,weak?BOT:HUMAN)
    console.log('Duelo de pantalla a '+target+': '+game.game.player1_score+' a '+game.game.player2_score)
    assert.deepEqual(requests.slice(requestCount).filter(path=>path!=='/sw.js'),[],'Hubo llamadas del juego durante una partida offline');await page.locator('#new-game').click()
  }

  // Cuenta B nunca continúa A; cerrar sesión oculta ambas y conserva archivos.
  offlineNetwork=false;await context.setOffline(false);userId='00000000-0000-4000-a000-000000000099'
  await page.goto(origin+'/android/tobias.html');await page.addScriptTag({content:harness})
  await page.waitForFunction(()=>document.querySelector('#resume').hidden)
  assert.equal(await page.locator('#start15').isDisabled(),true)
  await page.locator('#prepare').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Ensayo descargado'))
  await page.locator('#start15').click();await page.locator('#pause').click()
  assert.equal((await snapshot()).owner,userId)
  rejectIdentity=true;await page.goto(origin+'/android/tobias.html');await page.addScriptTag({content:harness})
  await page.waitForFunction(()=>document.querySelector('#resume').hidden)
  assert.equal(await page.evaluate(()=>fixture.activeOwner()),undefined)
  assert.ok(await page.evaluate(owner=>fixture.loadTrial(owner),HUMAN))
  assert.deepEqual(errors,[])
  console.log('OK: descarga interrumpida/integridad, reinicio de navegador offline, 5 estados recuperados, bot único, dos escritores, falta de espacio, 4 tamaños, duelos completos 15/30 sin red y separación de cuentas.')
  console.log('Capturas: android/generated/tobias-360x640.png y tobias-envido-320x568.png')
}finally{
  await context?.close();await new Promise(resolve=>server.close(resolve))
  if(!profile.startsWith(root))throw new Error('Perfil fuera del directorio de pruebas')
  await rm(profile,{recursive:true,force:true})
}
