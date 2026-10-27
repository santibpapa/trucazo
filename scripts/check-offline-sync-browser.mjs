import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { syncFixture, SYNC_OWNER as A } from './offline-sync-fixture.ts'
import { createCampaign, startDuel, applyTurn } from '../src/lib/offline-campaign/model.ts'
import { step, botStep, legalActions } from '../src/lib/offline-trial/engine.ts'

const {db,catalog}=await syncFixture()
const manifest=JSON.parse(await readFile('public/android/historia/manifest.json','utf8'))
const assets=new Map(await Promise.all([...manifest.assets.map(a=>a.path),'/sw.js','/offline.html','/android/historia/manifest.json'].map(async p=>[p,await readFile('public'+p)])))
const harness=(await build({stdin:{contents:"import * as storage from './src/lib/offline-campaign/storage'; import * as model from './src/lib/offline-campaign/model'; import * as engine from './src/lib/offline-trial/engine'; globalThis.fixture={...storage,...model,...engine};",resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
let offline=false,drop=false,postCount=0,deny=false,delay=false,releaseResponse
const errors=[]
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost'),path=url.pathname
  if(offline){req.socket.destroy();return}
  res.setHeader('Cache-Control','no-store')
  if(path==='/api/android/historia') {
   res.setHeader('Content-Type','application/json')
   if(deny){res.statusCode=401;res.end(JSON.stringify({error:'Entrá con tu cuenta.'}));return}
   if(url.searchParams.get('identity')==='1'){res.end(JSON.stringify({userId:A}));return}
   if(req.method==='POST') {
    postCount++;const parts=[];for await(const part of req)parts.push(part)
    const payload=JSON.parse(Buffer.concat(parts).toString())
    const value=(await db.query('select sync_offline_campaign($1::jsonb,$2) value',[JSON.stringify(payload.records),payload.complete])).rows[0].value
    if(delay)await new Promise(r=>{releaseResponse=r})
    if(drop){req.socket.destroy();return}
    res.end(JSON.stringify(value));return
   }
   res.end(JSON.stringify((await db.query('select prepare_offline_campaign() value')).rows[0].value));return
  }
  if(assets.has(path)) {
   res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.css')?'text/css':path.endsWith('.woff2')?'font/woff2':path.endsWith('.html')?'text/html':'image/webp')
   res.end(assets.get(path));return
  }
  res.end('<h1>Online</h1>')
 }catch(error){console.error('API de prueba:',error.message,error.detail??'',error.where??'');res.statusCode=409;res.end(JSON.stringify({error:error.message}))}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port,root=resolve('android/generated')
await mkdir(root,{recursive:true});const profile=await mkdtemp(join(root,'sync-profile-'))
let context,page
const saved=()=>page.evaluate(async()=>{const owner=await fixture.campaignOwner();return owner?fixture.loadCampaign(owner):undefined})
async function launch(){
 context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,viewport:{width:360,height:640}})
 await context.addInitScript(()=>localStorage.setItem('trucazo:campania:tutorial:00000000-0000-4000-a000-000000000001','1'))
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
}
async function connect(){await page.goto(origin+'/android/historia/index.html');await page.addScriptTag({content:harness});await page.waitForFunction(()=>document.querySelector('#campaign')||document.querySelector('#prepare')&&!document.querySelector('#prepare').disabled)}
async function write(c){await page.evaluate(async c=>{const old=await fixture.loadCampaign(c.owner);c.revision=old.revision+1;await fixture.saveCampaign(c,old)},c)}
function finish(c,start=true){
 if(start)c=startDuel(c,catalog.rivals[0].id,1,crypto.randomUUID())
 for(let n=0;n<4000&&c.trial.game.status==='playing';n++){
  const t=c.trial,g=t.game,bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
  const a=legalActions(t,A),chosen=a.find(a=>a.type==='advance_hand')??a.find(a=>a.type.startsWith('respond_')&&a.accept)??a.find(a=>a.type==='envido_say'&&a.value==='tengo')??a.filter(a=>a.type==='play_card').sort((a,b)=>a.card.rank-b.card.rank)[0]
  c=applyTurn(c,g.awaiting_deal?step(t,{player:A,type:'advance_hand'}):bot?botStep(t):step(t,chosen),new Date().toISOString())
 }
 assert.equal(c.trial.game.status,'finished');return c
}
try {
 await launch();await connect();await page.locator('#prepare').click()
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Historia lista'))
 assert.ok((await saved()).official.grant)
 // Partida terminada sin red: la cola queda intacta tras reiniciar el navegador.
 const result=finish(await saved());offline=true;await context.setOffline(true);await write(result)
 await context.close();await launch();await context.setOffline(true);await connect()
 assert.deepEqual((await saved()).pending,result.pending);assert.equal(postCount,0)
 // El servidor confirma y se pierde la respuesta. El guardado debe seguir pendiente.
 offline=false;drop=true;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('No se pudo'))
 assert.deepEqual((await saved()).pending,result.pending)
 const credited=(await db.query('select coins,campaign_points from profiles where id=$1',[A])).rows[0]
 assert.equal((await db.query('select * from offline_replay_v1.receipts')).rows.length,1)
  drop=false
 offline=true;await context.setOffline(true);await context.close();await launch();await context.setOffline(true);await connect()
 assert.deepEqual((await saved()).pending,result.pending)
 offline=false;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Partidas confirmadas'))
 const confirmed=await saved();assert.equal(confirmed.pending.length,0);assert.equal(confirmed.pending_coins,0)
  assert.equal(confirmed.official.coins,credited.coins);assert.equal(confirmed.official.points,credited.campaign_points)
 assert.equal(confirmed.receipts.length,1);assert.deepEqual((await db.query('select coins,campaign_points from profiles where id=$1',[A])).rows[0],credited)
 assert.equal((await db.query('select * from offline_replay_v1.receipts')).rows.length,1)
 assert.equal(confirmed.trial.id,result.trial.id)
 // Mientras hay una partida abierta, recuperar conexión no cambia su motor ni envía resultados.
 offline=true;await context.setOffline(true)
 const open=startDuel(finish(confirmed),catalog.rivals[0].id,1,crypto.randomUUID());await write(open);await page.reload();await page.addScriptTag({content:harness})
 const count=postCount;offline=false;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await page.waitForTimeout(400);assert.equal(postCount,count);assert.deepEqual((await saved()).pending,open.pending)
 // Fallo de guardado tras la confirmación: la misma cola se puede reenviar.
 offline=true;await context.setOffline(true);const quota=finish(open,false);await write(quota)
 await page.reload();await page.addScriptTag({content:harness})
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;globalThis.restorePut=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(...args){if(this.name==='campaigns')throw new DOMException('sin espacio','QuotaExceededError');return put.apply(this,args)}})
 offline=false;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('No se pudo guardar'))
 assert.deepEqual((await saved()).pending,quota.pending);await page.evaluate(()=>{restorePut();window.dispatchEvent(new Event('online'))})
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Partidas confirmadas'))
 assert.equal((await saved()).pending.length,0)
 // Actualizar el prototipo conserva sus registros y los comprobantes previos.
 offline=true;await context.setOffline(true)
 const current=await saved(),legacy=finish(createCampaign({...current.official,grant:undefined},manifest.digest))
 legacy.receipts=current.receipts;await write(legacy)
 const fresh=(await db.query('select prepare_offline_campaign() value')).rows[0].value
 const upgraded=await page.evaluate(async({fresh,digest})=>fixture.prepareCampaign(fresh,digest),{fresh,digest:manifest.digest})
 assert.deepEqual(upgraded.legacy_results,legacy.pending);assert.deepEqual(upgraded.receipts,current.receipts)
 assert.equal(upgraded.pending.length,0);assert.equal(upgraded.points,fresh.points)
 await page.reload();await page.addScriptTag({content:harness})
 // Cerrar sesión mientras la respuesta está en vuelo: ocultar la cuenta, preservar su guardado.
 offline=true;await context.setOffline(true);const closing=finish(await saved());await write(closing);await page.reload();await page.addScriptTag({content:harness})
 offline=false;delay=true;await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 const deadline=Date.now()+10000
 while(!releaseResponse&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20))
 assert.ok(releaseResponse,'No llegó la confirmación a demorar.')
 deny=true;delay=false;releaseResponse()
 await page.locator('#welcome').waitFor({state:'visible'})
 const retained=await page.evaluate(A=>fixture.loadCampaign(A),A);assert.deepEqual(retained.pending,closing.pending);assert.equal(await saved(),undefined)
 assert.deepEqual(errors,[])
 console.log('Navegador → API de prueba → SQL real: confirmación, respuesta perdida, reinicio, cuota, prototipo conservado, pausa durante partida y cierre de sesión aprobados.')
}catch(error){console.error('Estado:',await page.locator('#status').textContent(),'POST:',postCount,'Errores:',errors);throw error}
finally{await context?.close();await new Promise(r=>server.close(r));await db.close();const path=relative(root,profile);assert.ok(path&&!path.startsWith('..')&&!isAbsolute(path));await rm(profile,{recursive:true,force:true})}
