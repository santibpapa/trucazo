import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { deviceCDP } from './device-cdp.mjs'

const pkg = 'ar.com.trucazo.capacitor.dev', mode = process.argv[2] || '--summary'
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms))
const adb = (...args) => execFileSync('adb',args,{encoding:'utf8'}).trim()
const harness = (await build({stdin:{contents:`
 import {legalActions,step,botStep} from './src/lib/offline-trial/engine';
 import {getEnvidoPoints} from './src/lib/truco';
 import {applyTurn} from './src/lib/offline-campaign/model';
 // Estrategia de ensayo con manos completas: sólo vive en el diagnóstico, nunca en el APK.
 function chooseWin(t){
   const memo=new Map(),owner=t.owner;
   function score(t){
     const g=t.game,key=JSON.stringify([g,t.hands,t.rng,t.bot.style]);
     if(memo.has(key))return memo.get(key);
     if(g.status==='finished')return (g.winner_id===owner?1000:-1000)+g.player1_score-g.player2_score;
     if(g.awaiting_deal)return g.player1_score-g.player2_score;
     const bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id;
     const value=bot?score(botStep(t)):Math.max(...legalActions(t,owner).map(a=>score(step(t,a))));
     memo.set(key,value);return value;
   }
   return legalActions(t,owner).map(a=>({a,value:score(step(t,a))})).sort((a,b)=>b.value-a.value)[0]?.a;
 }
 globalThis.historyProbe={store:{read:o=>Capacitor.nativePromise('CampaignStore','read',o),commit:o=>Capacitor.nativePromise('CampaignStore','commit',o),activate:o=>Capacitor.nativePromise('CampaignStore','activate',o)},legalActions,step,botStep,getEnvidoPoints,chooseWin,applyTurn};
`,resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
let c
async function connect() {
  for(let attempt=0;attempt<40;attempt++) {
    try {
      const pid=adb('shell','pidof',pkg)
      if(pid) { adb('forward','tcp:9224','localabstract:webview_devtools_remote_'+pid); c=await deviceCDP(); await c.evaluate(harness); return }
    } catch { /* Esperar al proceso/WebView, sin limpiar datos. */ }
    await sleep(250)
  }
  throw Error('El APK no abrió su WebView debug')
}
async function restart() {
  c?.close(); adb('shell','am','force-stop',pkg)
  adb('shell','am','start','-a','android.intent.action.MAIN','-c','android.intent.category.LAUNCHER','-n',pkg+'/.MainActivity')
  await connect(); await c.evaluate("location.hash='#/historia/offline'")
  await wait("!!document.querySelector('#campaign')")
}
async function wait(expression) {
  for(let attempt=0;attempt<160;attempt++) { if(await c.evaluate(expression))return; await sleep(100) }
  throw Error('No apareció: '+expression)
}
const readExpression = `(async()=>{const owner=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id;return JSON.parse((await historyProbe.store.read({owner})).body||'null')})()`
async function saved() { return c.evaluate(readExpression) }
async function click(label) {
  return c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>!b.disabled&&(b.getAttribute('aria-label')===${JSON.stringify(label)}||b.innerText.trim()===${JSON.stringify(label)}));if(!b)return false;b.click();return true})()`)
}
async function resume() { await wait("!!document.querySelector('#resume')"); assert.ok(await click('Continuar partida')); await wait("!!document.querySelector('#table')") }
async function summary() {
  return c.evaluate(`(async()=>{const c=await ${readExpression}; const bytes=new TextEncoder().encode(JSON.stringify(c)),digest=await crypto.subtle.digest('SHA-256',bytes);return {
    owner:c.owner,revision:c.revision,points:c.points,coins:c.official.coins,pendingCoins:c.pending_coins,pending:c.pending.length,
    receipts:c.receipts?.length??0,provinces:c.official.catalog.provinces.length,rivals:c.official.catalog.rivals.length,
    trial:c.trial&&{id:c.trial.id,status:c.trial.game.status,scores:[c.trial.game.player1_score,c.trial.game.player2_score],actions:c.trial.actions.length,winner:c.trial.game.winner_id},
    sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),online:navigator.onLine,
    viewport:{width:innerWidth,height:innerHeight},fits:Array.from(document.querySelectorAll('[data-game-actions] button,[data-card-hand="me"] button')).every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),
    missingImages:Array.from(document.images).filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),alert:document.querySelector('[role=alert]')?.innerText};})()`)
}
try {
  await connect()
  if(mode==='--prepare') {
    await c.evaluate("location.hash='#/historia/offline'")
    await wait("!!document.querySelector('#campaign')||!!document.querySelector('#prepare')&&!document.querySelector('#prepare').disabled")
    if(await c.evaluate("!!document.querySelector('#campaign')")) { await click('Sin internet · guardado'); await click('Actualizar descarga') }
    else await click('Descargar Historia')
    await wait("document.querySelector('#status')?.textContent.includes('Historia lista')")
  }
  if(mode==='--start') {
    if(await c.evaluate("!!document.querySelector('#new-game')"))await click('Volver al modo historia')
    await c.evaluate("location.hash='#/historia/offline'"); await wait("!!document.querySelector('#campaign')")
    await click('¡A jugar!'); await click('Cerrar ventana')
    assert.ok(await click('Entrar a Buenos Aires')); await sleep(250)
    const rival=(await saved()).official.catalog.rivals.find(r=>r.slug==='novato')
    assert.ok(await click('Ver a '+rival.display_name)); await sleep(250)
    assert.ok(await click('Jugar')||await click('Revancha')); await wait("!!document.querySelector('#table')")
  }
  if(mode==='--cuts') {
    // Confirmar carta, canto y respuesta del bot; luego cortar exclusivamente el APK.
    const evidence=[]
    for(const kind of ['card','call','bot']) {
      if(await c.evaluate("!!document.querySelector('#campaign')"))await resume()
      let found=false
      for(let n=0;n<300;n++) {
        const before=await saved(),t=before.trial
        if(t.game.status==='finished')throw Error('La partida terminó antes de los cortes')
        const chosen=await c.evaluate(`(async()=>{const c=await ${readExpression},a=historyProbe.legalActions(c.trial,c.owner);
          const selected=${JSON.stringify(kind)}==='card'?a.find(a=>a.type==='play_card'):${JSON.stringify(kind)}==='call'?a.find(a=>a.type==='sing_truco'):null;
          if(!selected)return null;return selected.type==='play_card'?'Jugar '+selected.card.value+' de '+selected.card.suit:'Truco';})()`)
        if(kind==='bot') {
          if(t.actions.at(-1)?.action.player===t.game.player2_id){found=true;break}
          await sleep(50);continue
        }
        if(chosen&&await click(chosen)) {
          await wait(`(async()=>{const c=await ${readExpression};return c.revision>${before.revision}})()`);found=true;break
        }
        await sleep(50)
      }
      assert.ok(found,'Corte '+kind)
      // Suspender para cancelar timers; lo confirmado debe recuperarse byte a byte.
      adb('shell','input','keyevent','KEYCODE_HOME'); await sleep(250)
      const before=await summary(); await restart(); const after=await summary()
      assert.equal(after.sha256,before.sha256);evidence.push({kind,before,after})
    }
    await writeFile('android/generated/android-04-cuts.json',JSON.stringify(evidence,null,2))
  }
  if(mode==='--play-win'||mode==='--play-loss') {
    if(await c.evaluate("!!document.querySelector('#campaign')"))await resume()
    await c.evaluate("(()=>{const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms>=500&&ms<=3000?30:ms,...args)})()")
    for(let n=0;n<2400;n++) {
      const state=await c.evaluate(`(async()=>{const c=await ${readExpression},t=c.trial,g=t.game;if(g.status==='finished')return{finished:true,won:g.winner_id===c.owner};
        const a=historyProbe.legalActions(t,c.owner),loss=${mode==='--play-loss'};
        const hand=p=>[...t.hands[p===c.owner?0:1],...g.played_cards.filter(pc=>pc.player_id===p).map(pc=>pc.card)];
        const selected=(loss?a.find(a=>a.type==='irse_al_mazo')??a.find(a=>a.type.startsWith('respond_')&&!a.accept):!g.awaiting_deal&&a.length?historyProbe.chooseWin(t):null)
          ??a.find(a=>a.type.startsWith('respond_')&&a.accept)??a.find(a=>a.type==='envido_say'&&a.value==='tengo')
          ??a.filter(a=>a.type==='play_card').sort((a,b)=>a.card.rank-b.card.rank)[0];
        if(!selected||g.awaiting_deal)return{revision:c.revision};
        const labels={envido:'Envido',real_envido:'Real Envido',falta_envido:'Falta Envido',truco:'Truco',retruco:'Retruco',vale_cuatro:'Vale Cuatro'};
        const label=selected.type==='play_card'?'Jugar '+selected.card.value+' de '+selected.card.suit:selected.type.startsWith('sing_')?labels[selected.value]:selected.type==='irse_al_mazo'||selected.value==='mazo'?'Ir al mazo':selected.type.startsWith('respond_')?(selected.accept?'Quiero':'No quiero'):selected.value==='son_buenas'?'Son buenas':'Tengo '+historyProbe.getEnvidoPoints(hand(c.owner));
        return{revision:c.revision,label};})()`)
      if(state.finished){assert.equal(state.won,mode==='--play-win');break}
      if(state.label)await click(state.label)
      await sleep(100)
      if(n===2399)throw Error('La partida no terminó')
    }
    await wait("!!document.querySelector('#result')")
  }
  if(mode==='--failure') {
    const before=await summary()
    try {
      c.close();adb('shell','am','force-stop',pkg)
      adb('shell','run-as',pkg,'chmod','400','no_backup/trucazo-historia-v1.db','no_backup/trucazo-historia-v1.db-journal')
      adb('shell','am','start','-a','android.intent.action.MAIN','-c','android.intent.category.LAUNCHER','-n',pkg+'/.MainActivity')
      await connect();await c.evaluate("location.hash='#/historia/offline'")
      await wait("!!document.querySelector('[role=alert]')")
      const message=await c.evaluate("document.querySelector('[role=alert]').innerText")
      await writeFile('android/generated/android-04-write-failure.json',JSON.stringify({kind:'Base/journal privados de sólo lectura; reapertura SQLite real rechazada',before,message},null,2))
    } finally { adb('shell','run-as',pkg,'chmod','660','no_backup/trucazo-historia-v1.db','no_backup/trucazo-historia-v1.db-journal'); await restart() }
    assert.equal((await summary()).sha256,before.sha256)
  }
  if(mode==='--incomplete') {
    await c.evaluate("location.hash='#/historia/offline'");await wait("!!document.querySelector('#campaign')")
    const before=await summary()
    await c.evaluate("globalThis.originalFetch=fetch;window.fetch=(input,options)=>String(input).includes('/cartas/')?Promise.resolve(new Response('',{status:404})):originalFetch(input,options)")
    try {
      await click('Sin internet · guardado');await click('Actualizar descarga')
      await wait("document.querySelector('[role=alert]')?.innerText.includes('incompleta')")
      assert.equal((await summary()).sha256,before.sha256)
      await writeFile('android/generated/android-04-incomplete.json',JSON.stringify({kind:'Recurso local ausente simulado; guardado SQLite real',before,after:await summary()},null,2))
    } finally { await c.evaluate('window.fetch=originalFetch') }
  }
  if(mode==='--resume')await resume()
  if(mode==='--expired') {
    const before=await summary()
    await c.evaluate("(()=>{const key='trucazo:mobile:auth:v1',s=JSON.parse(localStorage.getItem(key));s.expires_at=1;localStorage.setItem(key,JSON.stringify(s))})()")
    adb('shell','input','keyevent','KEYCODE_HOME');await sleep(1500)
    await restart()
    assert.equal(await c.evaluate("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).expires_at"),1)
    assert.equal((await summary()).sha256,before.sha256)
    assert.equal(await c.evaluate("!!document.querySelector('input[name=password]')"),false)
  }
  if(mode==='--race') {
    if(await c.evaluate("!!document.querySelector('#campaign')"))await resume()
    await wait("!!document.querySelector('[data-card-hand=me] button:enabled,[data-game-actions] button:enabled')")
    const before=await summary()
    const expected=await c.evaluate(`(async()=>{const c=await ${readExpression},actions=historyProbe.legalActions(c.trial,c.owner),a=actions.find(a=>a.type==='play_card')??actions.find(a=>a.type.startsWith('respond_')&&a.accept)??actions.find(a=>a.type==='envido_say'&&a.value==='tengo');if(!a)throw Error('Falta una acción de corte');const next=historyProbe.applyTurn(c,historyProbe.step(c.trial,a),new Date().toISOString()),bytes=new TextEncoder().encode(JSON.stringify(next));const label=a.type==='play_card'?'Jugar '+a.card.value+' de '+a.card.suit:a.type.startsWith('respond_')?'Quiero':'Tengo '+historyProbe.getEnvidoPoints([...c.trial.hands[0],...c.trial.game.played_cards.filter(p=>p.player_id===c.owner).map(p=>p.card)]);return {label,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')};})()`)
    // Cortar inmediatamente después del toque, sin esperar la confirmación del guardado.
    const touched=click(expected.label).catch(()=>false)
    adb('shell','am','force-stop',pkg);c.close();await touched;await restart()
    const after=await summary()
    assert.ok(after.revision===before.revision||after.revision===before.revision+1)
    assert.ok(after.trial.actions===before.trial.actions||after.trial.actions===before.trial.actions+1)
    assert.equal(after.sha256,after.revision===before.revision?before.sha256:expected.sha256)
    await writeFile('android/generated/android-04-immediate-cut.json',JSON.stringify({before,after,confirmed:after.revision!==before.revision},null,2))
  }
  if(mode==='--reopen') { const before=await summary(); await restart(); assert.equal((await summary()).sha256,before.sha256) }
  await mkdir('android/generated',{recursive:true})
  const result=await summary();assert.equal(result.provinces,15);assert.equal(result.rivals,66);assert.ok(result.fits);assert.deepEqual(result.missingImages,[])
  const name='android/generated/'+(process.argv.includes('--android-06')?'android-06':'android-04')+'-device-'+mode.slice(2)
  await writeFile(name+'.json',JSON.stringify(result,null,2));const shot=await c.send('Page.captureScreenshot',{format:'png'});await writeFile(name+'.png',Buffer.from(shot.data,'base64'))
  console.log(JSON.stringify(result))
}finally{c?.close()}
