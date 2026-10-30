// Dos APK firmados y servicios públicos reales. Sólo QA3; no toca el QA14 original.
// La estrategia automatizada usa el estado completo sólo en este diagnóstico.
// Las jugadas se hacen mediante botones y los resultados se validan de nuevo en SQL.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { releaseDevice } from './release-device.mjs'
import { releaseQaLogin } from './release-qa-login.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved=await loadQaAccounts(),qa=saved.registrationAccount,devices=[]
const sdk=createClient(saved.projectUrl,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
assert.equal((await sdk.auth.signInWithPassword({email:qa.email,password:qa.password})).error,null)
const adb=(serial,args)=>execFileSync(process.env.ADB,['-s',serial,...args],{encoding:'utf8'})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async(c,expression)=>{for(let i=0;i<160;i++){if(await c.evaluate(expression))return;await pause(100)}throw Error('No apareció el estado de Historia esperado')}
const click=(c,label)=>c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>!b.disabled&&(b.getAttribute('aria-label')===${JSON.stringify(label)}||b.textContent.trim()===${JSON.stringify(label)}));if(!b)return false;b.click();return true})()`)
const readExpression=`(async()=>JSON.parse((await Capacitor.Plugins.CampaignStore.read({owner:${JSON.stringify(qa.id)}})).body||'null'))()`
const summary=c=>c.evaluate(`(async()=>{const s=await Capacitor.Plugins.CampaignStore.read({owner:${JSON.stringify(qa.id)}}),g=JSON.parse(s.body);return {owner:g.owner,revision:g.revision,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s.body))),b=>b.toString(16).padStart(2,'0')).join(''),grant:g.official.grant.id,rivals:g.official.catalog.rivals.length,provinces:g.official.catalog.provinces.length,coins:g.official.coins,points:g.official.points,pending:g.pending.map(p=>({id:p.id,coins:p.projected_reward.coins})),receipts:g.receipts||[],trial:g.trial?{id:g.trial.id,status:g.trial.game.status,scores:[g.trial.game.player1_score,g.trial.game.player2_score],actions:g.trial.actions.length,winner:g.trial.game.winner_id}:null,online:navigator.onLine,alerts:Array.from(document.querySelectorAll('[role=alert]')).map(x=>x.textContent)}})()`)
const profile=async()=>{const r=await sdk.from('profiles').select('id,coins,campaign_points').eq('id',qa.id).single();assert.equal(r.error,null);return r.data}
const probe=(await build({stdin:{contents:`
 import {legalActions,step,botStep} from './src/lib/offline-trial/engine';
 import {getEnvidoPoints} from './src/lib/truco';
 function choose(t){const memo=new Map(),owner=t.owner;
 function score(t){const g=t.game,key=JSON.stringify([g,t.hands,t.rng,t.bot.style]);if(memo.has(key))return memo.get(key);
 if(g.status==='finished')return (g.winner_id===owner?1000:-1000)+g.player1_score-g.player2_score;
 if(g.awaiting_deal)return g.player1_score-g.player2_score;
 const bot=g.envido_state.status==='declaring'?g.envido_state.declare_turn===g.player2_id:g.current_turn===g.player2_id;
 const value=bot?score(botStep(t)):Math.max(...legalActions(t,owner).map(a=>score(step(t,a))));memo.set(key,value);return value}
 return legalActions(t,owner).map(a=>({a,value:score(step(t,a))})).sort((a,b)=>b.value-a.value)[0]?.a}
 globalThis.historyAcceptance={legalActions,choose,getEnvidoPoints};`,resolveDir:process.cwd()},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
const network=(d,enabled)=>{adb(d.serial,['shell','svc','wifi',enabled?'enable':'disable']);adb(d.serial,['shell','svc','data',enabled?'enable':'disable'])}
const restoreNetwork=d=>{adb(d.serial,['shell','svc','wifi',d.wifi?'enable':'disable']);adb(d.serial,['shell','svc','data',d.data?'enable':'disable'])}
const report={scope:'APK17 y20 instalados en emuladores Android16/11; UI, SQLite y servicios WWW HTTPS reales. Estrategia de diagnóstico; no es teléfono físico.',owner:qa.id,devices:[]}
try{
  report.before=await profile()
  for(const [serial,port] of [['emulator-5556',9238],['emulator-5554',9239]]){
    const c=await releaseDevice({serial,port}),d={serial,port,c,wifi:adb(serial,['shell','settings','get','global','wifi_on']).trim()==='1',data:adb(serial,['shell','settings','get','global','mobile_data']).trim()==='1'};devices.push(d)
    await releaseQaLogin(3,false,c)
    await c.evaluate("location.hash='#/historia/offline'")
    await wait(c,"!!document.querySelector('#prepare')||!!document.querySelector('#campaign')")
    if(await c.evaluate("!!document.querySelector('#prepare')")){
      assert.ok(await click(c,'Descargar Historia'));await wait(c,"!!document.querySelector('#campaign')")
    }
    d.prepared=await summary(c);assert.equal(d.prepared.pending.length,0);assert.equal(d.prepared.rivals,66);assert.equal(d.prepared.provinces,15)
    const installed=adb(serial,['shell','dumpsys','package','ar.com.trucazo.app']);d.versionCode=Number(installed.match(/versionCode=(\d+)/)?.[1]);assert.ok([17,20].includes(d.versionCode))
    network(d,false);await wait(c,'!navigator.onLine')
    const rival=await c.evaluate(`(async()=>{const g=await ${readExpression};return g.official.catalog.rivals.find(r=>r.slug==='novato')})()`)
    assert.ok(rival);d.rewardCoins=rival.reward_coins
    if(d.prepared.trial?.status!=='playing'){
    for(const label of ['¡A jugar!','Cerrar ventana'])await click(c,label)
    assert.ok(await click(c,'Entrar a Buenos Aires'));await pause(300)
    assert.ok(await click(c,'Ver a '+rival.display_name));await pause(150)
    assert.ok(await click(c,'Jugar')||await click(c,'Revancha'));await wait(c,"!!document.querySelector('#table')")
    }
    await c.evaluate('Capacitor.Plugins.App.minimizeApp().then(()=>true)');await pause(250)
    d.beforeCold=await summary(c)
    await c.close();d.c=null;adb(serial,['shell','am','force-stop','ar.com.trucazo.app'])
    d.c=await releaseDevice({serial,port});await wait(d.c,'!!globalThis.Capacitor?.Plugins?.CampaignStore')
    d.afterCold=await summary(d.c);assert.equal(d.afterCold.sha256,d.beforeCold.sha256);assert.equal(d.afterCold.online,false)
    await d.c.evaluate("location.hash='#/historia/offline'");await wait(d.c,"!!document.querySelector('#resume')")
    assert.ok(await click(d.c,'Continuar partida'));await wait(d.c,"!!document.querySelector('#table')")
    await d.c.evaluate(probe)
    await d.c.evaluate('(()=>{const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms>=500&&ms<=3000?30:ms,...args);return true})()')
    for(let n=0;n<1600;n++){
      const action=await d.c.evaluate(`(async()=>{const g=await ${readExpression},t=g.trial;if(t.game.status==='finished')return {finished:true,won:t.game.winner_id===g.owner};const a=t.game.awaiting_deal?null:historyAcceptance.choose(t);if(!a)return {};const labels={envido:'Envido',real_envido:'Real Envido',falta_envido:'Falta Envido',truco:'Truco',retruco:'Retruco',vale_cuatro:'Vale Cuatro'};const ownHand=[...t.hands[0],...t.game.played_cards.filter(p=>p.player_id===g.owner).map(p=>p.card)];return {label:a.type==='play_card'?'Jugar '+a.card.value+' de '+a.card.suit:a.type.startsWith('sing_')?labels[a.value]:a.type==='irse_al_mazo'||a.value==='mazo'?'Ir al mazo':a.type.startsWith('respond_')?(a.accept?'Quiero':'No quiero'):a.value==='son_buenas'?'Son buenas':'Tengo '+historyAcceptance.getEnvidoPoints(ownHand)}})()`)
      if(action.finished){assert.equal(action.won,true,'El resultado debe ganarse jugando');break}
      if(action.label)await click(d.c,action.label)
      await pause(60);if(n===1599)throw Error('No terminó el duelo')
    }
    d.queued=await summary(d.c);assert.equal(d.queued.pending.length,1);assert.equal(d.queued.online,false)
  }
  assert.notEqual(devices[0].prepared.grant,devices[1].prepared.grant)
  // Sólo se pierde la primera respuesta DESPUÉS de la acreditación HTTPS real.
  await devices[0].c.evaluate(`(()=>{const original=Capacitor.nativePromise;window.__historyNativePromise=original;window.__historyLost=null;Capacitor.nativePromise=async function(plugin,method,options){const r=await original.call(this,plugin,method,options);if(!window.__historyLost&&plugin==='CapacitorHttp'&&method==='request'&&options?.method==='POST'&&options.url==='https://www.trucazo.com.ar/api/android/historia'&&r.status===200){window.__historyLost={receipts:r.data.receipts,coins:r.data.snapshot?.coins,points:r.data.snapshot?.points};throw Error('Respuesta perdida: diagnóstico después de confirmar en servidor')}return r};return true})()`)
  for(const d of devices)network(d,true)
  await wait(devices[0].c,'!!window.__historyLost')
  await wait(devices[1].c,`(async()=>!(await ${readExpression}).pending.length)()`)
  devices[0].lostResponse=await devices[0].c.evaluate('window.__historyLost')
  devices[0].afterLost=await summary(devices[0].c);assert.equal(devices[0].afterLost.pending.length,1)
  report.beforeRetry=await profile()
  await devices[0].c.evaluate('Capacitor.nativePromise=window.__historyNativePromise;delete window.__historyNativePromise;true')
  await devices[0].c.evaluate("location.hash='#/historia/offline'")
  if(await devices[0].c.evaluate("!!document.querySelector('#new-game')"))await click(devices[0].c,'Volver al modo historia')
  assert.ok(await click(devices[0].c,'Sin internet · guardado'));await wait(devices[0].c,"!!document.querySelector('#sync')&&!document.querySelector('#sync').disabled")
  assert.ok(await click(devices[0].c,'Reintentar sincronización'))
  await wait(devices[0].c,`(async()=>!(await ${readExpression}).pending.length)()`)
  report.afterRetry=await profile();assert.deepEqual(report.afterRetry,report.beforeRetry)
  for(const d of devices){d.final=await summary(d.c);assert.equal(d.final.pending.length,0);assert.ok(d.final.receipts.some(r=>r.id===d.queued.pending[0].id));report.devices.push({serial:d.serial,versionCode:d.versionCode,prepared:d.prepared,beforeCold:d.beforeCold,afterCold:d.afterCold,queued:d.queued,lostResponse:d.lostResponse,afterLost:d.afterLost,final:d.final});await d.c.evaluate("location.hash='#/lobby'")}
  const receipts=devices.flatMap(d=>d.final.receipts.filter(r=>r.id===d.queued.pending[0].id));assert.equal(receipts.length,2)
  assert.ok(receipts.reduce((sum,r)=>sum+r.coins,0)<=devices[0].rewardCoins,'No pagar dos veces la primera victoria')
  report.passed=true;report.retryDidNotPayAgain=true
  await writeFile('android/generated/android-17-history-versions-real.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,versions:devices.map(d=>d.versionCode),offlineColdRestored:true,lostResponseQueueRetained:true,retryDidNotPayAgain:true,before:report.before,after:report.afterRetry}))
}catch(error){
  report.failure=error.message
  await writeFile('android/generated/android-17-history-versions-real-failed.json',JSON.stringify(report,null,2))
  throw error
}finally{
  for(const d of devices){try{restoreNetwork(d)}catch{}try{await d.c?.evaluate('if(window.__historyNativePromise)Capacitor.nativePromise=window.__historyNativePromise;true')}catch{}await d.c?.close().catch(()=>{})}
  await sdk.auth.signOut({scope:'local'})
}
