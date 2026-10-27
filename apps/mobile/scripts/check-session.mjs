import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const root = path.resolve('apps/mobile/dist'), evidence = path.resolve(process.env.ANDROID_SESSION_EVIDENCE_DIR || 'android/generated')
await mkdir(evidence, { recursive: true })
const profile = await mkdtemp(path.join(evidence, 'android-03-fixture-'))
const errors = [], calls = [], sessions = new Map()
const ids = { A: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', B: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' }
let refreshes = 0, serial = 0, context, page, brokenAsset = false, brokenSnapshot = false
const syncMode = process.argv.includes('--sync')
const historyMode = process.argv.includes('--history') || syncMode
let dropSync = false, incompatibleSync = false, delaySync = false, releaseSync
const receipts = new Map(), official = new Map()
const catalog = JSON.parse(await readFile('public/android/historia/catalog.json','utf8'))
const emptyStyle = {hands_played:0,envido_sung:0,envido_bluff:0,envido_folded:0,truco_sung:0,truco_bluff:0,truco_folded:0}
const historySnapshot = owner => ({version:'historia-local-v1',engine_version:'historia-bots-v1',userId:ids[owner],exported_at:new Date().toISOString(),
  points:0,coins:owner==='A'?1001:2022,style:emptyStyle,progress:[],catalog,grant:{id:ids[owner],seed:7,rules:'historia-sql-v1'},presentation:{username:'Cuenta '+owner,avatar_url:null,active_salon:'clasico',active_frame:null,active_medal:null,active_accessory:null}})
const harness=(await build({stdin:{contents:"import * as storage from './src/lib/offline-campaign/storage'; import * as model from './src/lib/offline-campaign/model'; import * as engine from './src/lib/offline-trial/engine'; globalThis.historyFixture={...storage,...model,...engine}",resolveDir:process.cwd()},bundle:true,write:false})).outputFiles[0].text
const token = (owner) => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: ids[owner], exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.fixture'
  sessions.set(jwt, owner)
  return { access_token: jwt, refresh_token: owner + '-refresh-' + (++serial), expires_in: 3600, token_type: 'bearer', user: user(owner) }
}
const user = owner => ({ id: ids[owner], email: owner + '@fixture.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, is_anonymous: false, created_at: new Date().toISOString() })
const server = createServer(async(req,res)=> {
  const p = new URL(req.url, 'http://localhost').pathname
  if(brokenAsset&&p.startsWith('/cartas/')){res.writeHead(404).end();return}
  try { const bytes=await readFile(path.join(root, p==='/'?'index.html':p.slice(1))); res.setHeader('Content-Type', p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.woff2')?'font/woff2':'text/html'); res.end(bytes) }
  catch { res.writeHead(404).end() }
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port
async function launch() {
  context=await chromium.launchPersistentContext(profile,{executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true,viewport:{width:360,height:640}})
  await context.route('**/*', async route => {
    const request=route.request(), url=new URL(request.url())
    if(url.origin===origin) {
      if(brokenAsset&&url.pathname.startsWith('/cartas/'))return route.fulfill({status:404,body:''})
      try {const bytes=await readFile(path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1)));return route.fulfill({body:bytes,contentType:url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.json')?'application/json':url.pathname.endsWith('.webp')?'image/webp':url.pathname.endsWith('.woff2')?'font/woff2':'text/html'})}
      catch{return route.fulfill({status:404,body:''})}
    }
    const headers={ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers':'authorization,content-type', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS' }
    const respond=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)})
    if(request.method()==='OPTIONS') return route.fulfill({status:204,headers})
    calls.push({path:url.pathname,method:request.method()})
    const auth=request.headers().authorization?.replace(/^Bearer /,'')
    const owner=sessions.get(auth)
    const body=request.postDataJSON()
    if(url.pathname==='/api/android/login') {
      if(body.password!=='fixture-password' || !['A','B'].includes(body.username))return respond({ok:false},401)
      const value=token(body.username);return respond({access_token:value.access_token,refresh_token:value.refresh_token})
    }
    if(url.pathname==='/auth/v1/token') {
      if(url.searchParams.get('grant_type')==='refresh_token'){refreshes++;return respond(token(body.refresh_token[0]))}
      if(body.password!=='fixture-password' || !['A@fixture.invalid','B@fixture.invalid'].includes(body.email))return respond({error:'invalid_grant',message:'Invalid login credentials'},400)
      return respond(token(body.email[0]))
    }
    if(url.pathname==='/auth/v1/user')return owner?respond(user(owner)):respond({message:'invalid token'},401)
    if(url.pathname==='/auth/v1/logout'){assert.equal(url.searchParams.get('scope'),'local');return respond({})}
    if(url.pathname==='/api/android/historia') {
      if(!owner)return respond({error:'Entrá con tu cuenta.'},401)
      if(request.method()==='POST') {
        assert.ok(syncMode);assert.ok(body.records.length<=10)
        const snapshot=official.get(owner)??historySnapshot(owner)
        const confirmed=body.records.map(record=>{
          const key=owner+record.id
          if(!receipts.has(key)) {
            assert.equal(record.trial.owner,ids[owner])
            const receipt={id:record.id,...record.projected_reward,...record.trial.result,status:'accepted'}
            receipts.set(key,receipt);snapshot.points+=receipt.points;snapshot.coins+=receipt.coins
            snapshot.style=record.trial.bot.style
          }
          return receipts.get(key)
        })
        official.set(owner,snapshot)
        if(delaySync)await new Promise(resolve=>{releaseSync=resolve})
        if(dropSync)return route.abort()
        return respond({receipts:confirmed,snapshot:body.complete?{...snapshot,engine_version:incompatibleSync?'future-engine':snapshot.engine_version}:null})
      }
      return respond(brokenSnapshot?{error:'Descarga interrumpida'}:url.searchParams.has('identity')?{userId:ids[owner]}:official.get(owner)??historySnapshot(owner),brokenSnapshot?503:200)
    }
    if(!owner)return respond({message:'unauthorized'},401)
    if(url.pathname==='/rest/v1/profiles')return respond({id:ids[owner],username:'Cuenta '+owner,coins:owner==='A'?1001:2022,avatar_url:null})
    if(url.pathname==='/rest/v1/games')return respond(null)
    if(url.pathname==='/rest/v1/rpc/app_compatibility')return respond({compatible:true,versionCode:body.p_version_code,minimumCode:17,updateUrl:null,contract:'trucazo-online-v1',activeGameId:null,activeTeamId:null})
    if(url.pathname==='/rest/v1/rpc/team_lobby')return respond({tables:[],mine:[]})
    if(url.pathname==='/rest/v1/rpc/active_medal_for')return respond('ninguno')
    if(url.pathname.startsWith('/rest/v1/rpc/'))return respond(null)
    return respond([])
  })
  page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin)
}
async function login(identifier,password='fixture-password'){
  await page.getByLabel('Email o usuario').fill(identifier);await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
}
async function lobby(owner){await page.getByRole('heading',{name:'Mesas disponibles'}).waitFor();await page.getByText('Cuenta '+owner,{exact:true}).last().waitFor()}
async function logout(){await page.getByRole('button',{name:'Perfil',exact:true}).click();await page.getByRole('button',{name:'Cerrar sesión',exact:true}).last().click();await page.getByLabel('Email o usuario').waitFor()}
async function history(){await page.evaluate(()=>location.hash='#/historia/offline');await page.addScriptTag({content:harness})}
async function saved(owner='A'){return page.evaluate(owner=>historyFixture.loadCampaign(owner),ids[owner])}
async function finishOffline() {
  await context.setOffline(true)
  await page.evaluate(async owner=>{
    const f=historyFixture,old=await f.loadCampaign(owner)
    let c=old.trial?.game.status==='playing'?old:f.startDuel(old,old.official.catalog.rivals[0].id,1,crypto.randomUUID())
    for(let n=0;n<4000&&c.trial.game.status==='playing';n++) {
      const t=c.trial,g=t.game,bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id
      const actions=f.legalActions(t,owner),a=actions.find(a=>a.type==='advance_hand')??actions.find(a=>a.type.startsWith('respond_')&&a.accept)
        ??actions.find(a=>a.type==='envido_say'&&a.value==='tengo')??actions.filter(a=>a.type==='play_card').sort((a,b)=>a.card.rank-b.card.rank)[0]
      c=f.applyTurn(c,g.awaiting_deal?f.step(t,{player:owner,type:'advance_hand'}):bot?f.botStep(t):f.step(t,a),new Date().toISOString())
    }
    if(c.trial.game.status!=='finished')throw Error('El fixture no terminó')
    c.revision=old.revision+1;await f.saveCampaign(c,old);window.dispatchEvent(new Event('mobile:refresh'))
  },ids.A)
  await page.waitForFunction(()=>!document.querySelector('#resume'))
  return saved()
}
async function syncChecks() {
  assert.equal(calls.filter(c=>c.path==='/api/android/historia'&&c.method==='POST').length,0,'La partida abierta espera')
  const pending=await finishOffline();dropSync=true
  await context.setOffline(false)
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await saved(),pending);assert.equal(receipts.size,1)
  const balance=structuredClone(official.get('A'))
  await context.setOffline(true);await context.close();await launch();await context.setOffline(true);await history();await page.locator('#campaign').waitFor()
  assert.deepEqual(await saved(),pending)
  dropSync=false
  // La aceptación remota tampoco permite borrar la cola si falla la escritura local.
  await page.evaluate(()=>{globalThis.realTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,mode,...args){if(mode==='readwrite'&&[stores].flat().includes('campaigns'))throw Error('No se pudo guardar la confirmación');return realTransaction.call(this,stores,mode,...args)}})
  await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('mobile:refresh')));await page.getByRole('alert').filter({hasText:'guardar la confirmación'}).waitFor()
  assert.deepEqual(await saved(),pending);assert.equal(receipts.size,1);assert.deepEqual(official.get('A'),balance)
  await page.evaluate(()=>{IDBDatabase.prototype.transaction=realTransaction;window.dispatchEvent(new Event('mobile:refresh'))})
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Partidas confirmadas'))
  const confirmed=await saved();assert.equal(confirmed.pending.length,0);assert.equal(confirmed.receipts.length,1);assert.equal(confirmed.official.coins,balance.coins)
  const next=await finishOffline();incompatibleSync=true;await context.setOffline(false)
  await page.getByRole('alert').filter({hasText:'otra versión'}).waitFor();assert.deepEqual(await saved(),next)
  incompatibleSync=false;await page.evaluate(()=>window.dispatchEvent(new Event('mobile:refresh')))
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Partidas confirmadas'))
  const aPending=await finishOffline();delaySync=true;await context.setOffline(false)
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Confirmando partidas'))
  for(let n=0;n<200&&!releaseSync;n++)await new Promise(resolve=>setTimeout(resolve,20))
  assert.ok(releaseSync,'El servidor recibió el envío demorado')
  await page.evaluate(()=>location.hash='#/lobby');await lobby('A');await logout();await login('B');await lobby('B')
  delaySync=false;releaseSync();await history();await page.locator('#campaign').waitFor()
  assert.deepEqual(await saved(),aPending);assert.equal((await saved('B')).pending.length,0)
  await page.evaluate(()=>location.hash='#/lobby');await lobby('B');await logout();await login('A');await lobby('A');await history()
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Partidas confirmadas'))
  assert.equal((await saved()).pending.length,0);assert.equal((await saved()).receipts.length,3);assert.equal(receipts.size,3)
  await writeFile(path.join(evidence,'android-06-controller-fixture.json'),JSON.stringify({scope:'UI/SDK reales, Auth y aceptación simulados, IndexedDB; validación SQL en check:offline-sync',openDuelWaits:true,lostResponseRetry:true,failedCommitPreservesQueue:true,incompatibleReplyPreservesQueue:true,accountChangeDuringRequest:true,uniqueReceipts:receipts.size,errors},null,2))
  await page.evaluate(()=>location.hash='#/lobby');await lobby('A')
}
try {
  await launch();await page.getByLabel('Email o usuario').waitFor()
  assert.equal(await page.getByRole('button',{name:'Entrar como invitado'}).count(),0)
  await login('desconocido','incorrecta');await page.getByRole('alert').filter({hasText:'Email/usuario o contraseña incorrectos'}).waitFor()
  const unknownError=await page.getByRole('alert').innerText()
  await login('A','incorrecta');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).waitFor();assert.equal(await page.getByRole('alert').innerText(),unknownError)
  await login('A');await lobby('A')
  await page.screenshot({path:path.join(evidence,'android-03-fixture-lobby.png')})
  await page.getByRole('link',{name:'Abrir Modo Campaña'}).click()
  await page.getByRole('link',{name:'Jugar sin internet',exact:true}).click();await page.getByRole('button',{name:'Descargar Historia'}).waitFor()
  if(historyMode){
    await page.addScriptTag({content:harness});brokenAsset=true
    await page.locator('#prepare').click();await page.getByRole('alert').filter({hasText:'incompleta'}).waitFor();assert.equal(await saved(),undefined)
    brokenAsset=false;brokenSnapshot=true
    await page.locator('#prepare').click();await page.getByRole('alert').filter({hasText:'Descarga interrumpida'}).waitFor();assert.equal(await saved(),undefined)
    brokenSnapshot=false;await page.locator('#prepare').click();await page.locator('#campaign').waitFor()
    await page.evaluate(()=>localStorage.setItem('trucazo:campania:tutorial:aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','1'));await page.reload();await history();await page.locator('#campaign').waitFor()
    assert.equal((await saved()).official.catalog.rivals.length,66)
    await page.getByRole('button',{name:'Entrar a Buenos Aires',exact:true}).click()
    await page.getByRole('button',{name:'Ver a '+catalog.rivals.find(r=>r.slug==='novato').display_name,exact:true}).click({force:true})
    await page.getByRole('button',{name:'Jugar',exact:true}).click();await page.locator('#table').waitFor({state:'attached'});await page.locator('[data-game-actions]').waitFor()
    await page.setViewportSize({width:360,height:820})
    await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','34px');document.documentElement.style.setProperty('--safe-area-inset-bottom','47px');document.body.style.paddingTop='34px'})
    const bounds=await page.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,buttons:Array.from(document.querySelectorAll('[data-game-actions] button,[data-card-hand="me"] button')).filter(b=>b.getBoundingClientRect().width).map(b=>({top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom}))}))
    await writeFile(path.join(evidence,'android-history-safe-area.json'),JSON.stringify(bounds,null,2))
    assert.equal(bounds.scroll,bounds.height,'Historia sin scroll entre barras Android simuladas34/47')
    assert.ok(bounds.buttons.length>0,'La mesa de Historia debe tener controles visibles')
    assert.ok(bounds.buttons.every(b=>b.top>=34&&b.bottom<=820-47),'Controles de Historia dentro de las barras Android simuladas')
    await page.evaluate(()=>{document.documentElement.style.removeProperty('--safe-area-inset-top');document.documentElement.style.removeProperty('--safe-area-inset-bottom');document.body.style.removeProperty('padding-top')})
    await page.getByRole('button',{name:'Guardar y salir',exact:true}).click();const before=await saved()
    await context.setOffline(true);await page.evaluate(()=>{const key='trucazo:mobile:auth:v1',s=JSON.parse(localStorage.getItem(key));s.expires_at=1;localStorage.setItem(key,JSON.stringify(s))})
    await page.reload();await history();await page.locator('#resume').waitFor();assert.deepEqual(await saved(),before)
    await context.setOffline(false);await page.evaluate(()=>location.hash='#/lobby');await lobby('A')
  }
  if(!historyMode)await page.getByRole('link',{name:'Volver al lobby'}).click();await lobby('A')
  await context.close();await launch();await lobby('A')
  await page.evaluate(()=>{const key='trucazo:mobile:auth:v1',value=JSON.parse(localStorage.getItem(key));value.expires_at=1;localStorage.setItem(key,JSON.stringify(value))})
  await context.close();await launch();await lobby('A');assert.ok(refreshes>0)
  await context.setOffline(true);await page.getByRole('status').filter({hasText:'Tu sesión está conservada'}).waitFor()
  await context.setOffline(false);await lobby('A')
  await logout();await login('B@fixture.invalid');await lobby('B');assert.equal(await page.getByText('Cuenta A',{exact:true}).count(),0)
  let aBefore
  if(historyMode){await history();await page.locator('#prepare').waitFor();assert.equal(await page.locator('#resume').count(),0);aBefore=await saved();await page.locator('#prepare').click();await page.locator('#campaign').waitFor();assert.equal((await saved('B')).owner,ids.B);assert.deepEqual(await saved(),aBefore);await page.evaluate(()=>location.hash='#/lobby');await lobby('B')}
  await logout();await login('A@fixture.invalid');await lobby('A')
  if(historyMode){await history();await page.locator('#resume').waitFor();assert.deepEqual(await saved(),aBefore);await page.evaluate(()=>location.hash='#/lobby');await lobby('A')}
  if(syncMode){await history();await page.locator('#resume').waitFor();await syncChecks()}
  await logout()
  await context.close();await launch();await page.getByLabel('Email o usuario').waitFor()
  assert.equal(await page.getByRole('heading',{name:'Mesas disponibles'}).count(),0)
  assert.deepEqual(errors,[])
  if(historyMode&&!syncMode)await writeFile(path.join(evidence,'android-04-controller-fixture.json'),JSON.stringify({scope:'UI/SDK reales, dos cuentas simuladas; fallback IndexedDB de navegador',incompleteAssets:true,incompleteSnapshot:true,completePreparation:true,offlineExpiredRestart:true,openDuelPreserved:true,accountABARetained:true,noSyncPosts:!calls.some(c=>c.path==='/api/android/historia'&&c.method==='POST'),errors},null,2))
  await writeFile(path.join(evidence,'android-03-session-fixture.json'),JSON.stringify({scope:'SDK real/UI empaquetada, servidor simulado, sin cuentas reales',usernameLogin:true,emailLogin:true,genericErrors:true,persistedRestart:true,refreshes,offlineSession:true,logoutLocal:true,accountIsolation:true,historyIdentity:true,errors},null,2))
  console.log('OK ingreso email/usuario, error uniforme, cierre/retoma, renovación, offline, logout local, cambio A/B y servicio Historia con SDK real y servidor simulado.')
}catch(failure){
  if(syncMode&&page&&!page.isClosed())console.log('Diagnóstico sync:',{text:await page.locator('body').innerText(),posts:calls.filter(c=>c.path==='/api/android/historia'&&c.method==='POST').length,receipts:receipts.size})
  throw failure
}finally{await context?.close();await new Promise(r=>server.close(r))}

