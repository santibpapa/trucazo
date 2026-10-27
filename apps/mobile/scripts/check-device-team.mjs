// Aceptación real: sólo las tres QA, controles normales y RPCs de lectura propias.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const qa=await loadQaAccounts(), accounts=[...qa.accounts,qa.registrationAccount]
const pause=ms=>new Promise(r=>setTimeout(r,ms)), origin='http://localhost:3002'
let c=await deviceCDP()
const resumeSolo=process.argv.includes('--resume-solo'),resume=process.argv.includes('--resume')||resumeSolo
const report=resume?JSON.parse(await readFile('android/generated/android-09-real-progress.json','utf8')):{scope:'APK 0.8.0 Android11/WebView133 + Next local + Supabase real',games:[]},contexts=[]
const native={evaluate:fn=>c.evaluate('('+fn.toString()+')()')}
const state=page=>page.evaluate(()=>({route:location.hash,text:document.body.innerText,buttons:Array.from(document.querySelectorAll('button')).filter(b=>b.getBoundingClientRect().width&&!b.disabled).map(b=>({text:b.textContent.trim(),label:b.getAttribute('aria-label')})),height:innerHeight,scroll:document.documentElement.scrollHeight,missing:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'))}))
async function wait(predicate) {for(let i=0;i<120;i++){const value=await predicate();if(value)return value;await pause(150)}throw Error('No llegó el estado esperado del ensayo real')}
async function click(page,text,label=false) {
  const code=`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.getBoundingClientRect().width&&!b.disabled&&${label?'b.getAttribute("aria-label")':'b.textContent.trim()'}===${JSON.stringify(text)});if(!b)return false;b.click();return true})()`
  return page===native?c.evaluate(code):page.evaluate(code)
}
async function fillNative(name,value) {await c.evaluate(`(()=>{const input=document.querySelector('[name=${JSON.stringify(name)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);await pause(50)}
async function shot(name) {const image=await c.send('Page.captureScreenshot',{format:'png'});await writeFile('android/generated/android-09-'+name+'.png',Buffer.from(image.data,'base64'))}
async function web(n) {
  const account=accounts[n-1],context=await chromium.launchPersistentContext('android/generated/private/qa-web-'+n,{headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,viewport:{width:360,height:568}});contexts.push(context)
  const page=context.pages()[0]||await context.newPage();await page.goto(origin+'/login')
  if(await page.locator('input[name=password]').count()) {await page.waitForFunction(()=>Object.keys(document.querySelector('input[name=password]')||{}).some(k=>k.startsWith('__reactProps$')));await page.locator('input[name=identifier]').fill(account.email);await page.locator('input[name=password]').fill(account.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()}
  await page.waitForURL('**/lobby**');await page.getByRole('heading',{name:'Mesas disponibles'}).waitFor();const identity=await context.request.get(origin+'/api/android/historia?identity=1');assert.equal((await identity.json()).userId,account.id);return page
}
async function client(account) {const sdk=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const result=await sdk.auth.signInWithPassword({email:account.email,password:account.password});assert.equal(result.error,null);return sdk}
const sdk=await client(accounts[2]),sdk1=await client(accounts[0]),sdk2=await client(accounts[1])
async function snap(id,api=sdk) {const r=await api.rpc('team_snapshot',{p_table_id:id});assert.equal(r.error,null);return r.data}
async function create(target,privateTable) {
  await c.evaluate(`location.hash='#/lobby'`);await wait(async()=>(await state(native)).buttons.some(b=>b.text==='Crear mesa'))
  await click(native,'Crear mesa');await wait(async()=>(await state(native)).buttons.some(b=>b.text==='2vs2 · Parejas'))
  await click(native,'2vs2 · Parejas');await fillNative('tableName','ANDROID-09 QA '+target);await fillNative('bet','10');await click(native,'A '+target);await click(native,'30s')
  if(privateTable)await c.evaluate(`Array.from(document.querySelectorAll('label,button')).find(b=>b.textContent.trim()==='Mesa privada').click()`)
  await click(native,'Crear');return wait(async()=>{const value=await state(native);return value.route.startsWith('#/game/parejas/')?value.route.split('/').at(-1):null})
}
async function seatNative(seat) {await wait(()=>click(native,'Sentarme en el asiento '+(seat+1),true));await wait(async()=>(await state(native)).text.includes('Vos'))}
async function bot(seat) {await wait(()=>c.evaluate(`(()=>{const b=document.querySelector('button[aria-label="Sentarme en el asiento ${seat+1}"]')?.parentElement.querySelector('button:last-child');if(!b||b.disabled||b.textContent.trim()!=='Añadir bot')return false;b.click();return true})()`));await wait(async()=>!(await state(native)).buttons.some(b=>b.label==='Sentarme en el asiento '+(seat+1)))}
async function play(id,players) {
  let clicks=0
  for(let i=0;i<2200;i++) {
    for(const page of players) {
      const value=await state(page)
      if(page===native&&value.buttons.some(b=>b.text==='Volver al lobby')) {
        const result=await snap(id);if(result.table.status==='finished'){await shot('real-'+result.table.target_score+'-result');return {id,target:result.table.target_score,scores:result.game.scores,reason:result.game.finish_reason,clicks,members:result.members.map(m=>({name:m.username,seat:m.seat,bot:m.is_bot,timeouts:m.timeouts}))}}
      }
      const choice=value.buttons.find(b=>b.text==='No quiero')??value.buttons.find(b=>b.text.startsWith('Tengo '))??value.buttons.find(b=>b.text==='Son buenas')??value.buttons.find(b=>b.label?.startsWith('Jugar '))
      if(choice){await click(page,choice.label??choice.text,!!choice.label);clicks++}
    }
    if(i&&i%100===0)console.log('Parejas reales:',id,'controles',clicks)
    await pause(250)
  }
  throw Error('Partida real no terminó dentro del ensayo')
}
try {
  assert.equal(await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id`),accounts[2].id,'Usar QA3 instalada')
  if(!resumeSolo) {
  const A=await web(1),B=await web(2)
  const before=await Promise.all(accounts.map(async(a,i)=>({username:a.username,coins:(await [sdk1,sdk2,sdk][i].from('profiles').select('coins').eq('id',a.id).single()).data.coins})));if(!resume)report.before=before
  const id=resume?report.openTable:await create(15,true);report.openTable=id;await writeFile('android/generated/android-09-real-progress.json',JSON.stringify(report,null,2))
  if(resume){await A.goto(origin+'/game/parejas/'+id);await B.goto(origin+'/game/parejas/'+id);await c.evaluate(`location.hash=${JSON.stringify('#/game/parejas/'+id)}`)}
  else {
  await seatNative(1);const initial=await snap(id)
  for(const [page,seat] of [[A,0],[B,3]]) {
    await page.getByRole('button',{name:'Unirse',exact:true}).first().click();await page.getByLabel('Código de la mesa',{exact:true}).fill(initial.table.private_code);await page.getByRole('dialog').getByRole('button',{name:'Unirse',exact:true}).click()
    await page.getByRole('button',{name:'Sentarme en el asiento '+(seat+1),exact:true}).click()
  }
  await wait(async()=>(await state(native)).text.includes('3/4'));await bot(2);await shot('real-waiting')
  await wait(()=>click(native,'Empezar partida'));await wait(async()=>(await state(native)).buttons.some(b=>b.text==='Abandonar partida'))
  const privateHand=await sdk.from('team_hands').select('seat,cards').eq('table_id',id);assert.equal(privateHand.error,null);assert.equal(privateHand.data.length,1);assert.equal(privateHand.data[0].seat,1);report.privateHandRows=1
  // Chat real visible en ambos clientes sin cambiar la jugada ni el reloj.
  await click(native,'Chat de la mesa',true)
  await c.evaluate(`(()=>{const t=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'Prueba QA Android09');t.dispatchEvent(new Event('input',{bubbles:true}))})()`);await pause(50);await click(native,'Enviar')
  await A.getByRole('button',{name:/^Chat/}).click();await A.getByRole('log').getByText('Prueba QA Android09',{exact:true}).waitFor();await A.getByLabel('Escribir mensaje',{exact:true}).fill('Recibido desde web QA');await A.getByRole('button',{name:'Enviar',exact:true}).click()
  await wait(async()=>(await state(native)).text.includes('Recibido desde web QA'));await shot('real-chat');await click(native,'Cerrar chat',true);await A.getByRole('button',{name:'Cerrar chat',exact:true}).click();report.writtenChatBothWays=true
  // El truco deja al APK los siete controles de respuesta, visibles.
  await A.getByRole('button',{name:'Truco',exact:true}).click();await wait(async()=>(await state(native)).buttons.some(b=>b.text==='Falta Envido'))
  await shot('real-native-long');const longLayout=await state(native);assert.equal(longLayout.scroll,longLayout.height);assert.deepEqual(longLayout.missing,[]);report.nativeLongActions=true
  await click(native,'Envido');await A.getByRole('button',{name:'Quiero',exact:true}).click()
  for(const page of [A,native,B]) {
    await wait(async()=>{const value=await state(page),b=value.buttons.find(b=>b.text.startsWith('Tengo ')||b.text==='Son buenas');return b?click(page,b.text):false})
  }
  // El bot declara a su tiempo; después se responde el truco suspendido.
  await wait(()=>click(native,'Quiero'))
  await A.getByRole('button',{name:/^Jugar /}).first().click()
  await wait(async()=>(await state(native)).buttons.some(b=>b.label?.startsWith('Jugar ')))
  }
  const checkpoint=await snap(id);await shot('real-table')
  if(!resume) {
  // Cierre forzado del proceso nativo: sesión y cartas vienen del servidor al reabrir.
  c.close();execFileSync(process.env.ADB,['-s','emulator-5554','shell','am','force-stop','ar.com.trucazo.capacitor.dev']);execFileSync(process.env.ADB,['-s','emulator-5554','shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity']);await pause(4000)
  const pid=execFileSync(process.env.ADB,['-s','emulator-5554','shell','pidof','ar.com.trucazo.capacitor.dev'],{encoding:'utf8'}).trim();execFileSync(process.env.ADB,['-s','emulator-5554','forward','tcp:9224','localabstract:webview_devtools_remote_'+pid]);c=await deviceCDP()
  // El arranque vuelve al lobby: su sección de parejas recupera mi mesa.
  await wait(async()=>(await state(native)).text.includes('ANDROID-09 QA 15'));await wait(()=>click(native,'Volver a mi mesa'))
  await wait(async()=>(await state(native)).text.includes('Mesa de cuatro jugadores')||(await state(native)).buttons.some(b=>b.text==='Abandonar partida'))
  const recovered=await snap(id);assert.equal(recovered.my_seat,checkpoint.my_seat);assert.deepEqual(recovered.hand,checkpoint.hand);assert.deepEqual(recovered.game.played,checkpoint.game.played);assert.equal(recovered.game.action_started_at,checkpoint.game.action_started_at);report.processRecovery=true
  }
  const layout=await state(native);assert.equal(layout.scroll,layout.height);assert.deepEqual(layout.missing,[])
  report.games.push(await play(id,[native,A,B]));delete report.openTable;await writeFile('android/generated/android-09-real.json',JSON.stringify(report,null,2));console.log('Mesa mixta terminada',report.games[0])
  await click(native,'Volver al lobby')
  }
  if(!process.argv.includes('--only-mixed')) {
  // Repetir partida por el recorrido vigente: nueva mesa, mismos controles, sin reset.
  const solo=resumeSolo?report.openTable:await create(30,false);report.openTable=solo;if(!resumeSolo){await seatNative(2);for(const seat of [0,1,3])await bot(seat)}
  await wait(()=>click(native,'Empezar partida'));await wait(async()=>(await state(native)).buttons.some(b=>b.text==='Abandonar partida'));await shot('real-30-table')
  await click(native,'Chat de la mesa',true);await click(native,'Frases rápidas');await click(native,'¿Qué hago?');report.botQuickChat=true
  report.botConversation=await wait(async()=>{const s=await snap(solo),chat=s.game.chat??[];return chat.some(line=>line.seat===2&&line.text==='¿Qué hago?')&&chat.some(line=>line.seat===0)?chat:null})
  report.games.push(await play(solo,[native]));delete report.openTable;await click(native,'Volver al lobby')
  }
  const balances=()=>Promise.all(accounts.map(async(a,i)=>({username:a.username,coins:(await [sdk1,sdk2,sdk][i].from('profiles').select('coins').eq('id',a.id).single()).data.coins})))
  report.after=await balances()
  for(const game of report.games) {
    const current=await snap(game.id),request=crypto.randomUUID()
    const body={p_table_id:game.id,p_request_id:request,p_version:current.table.version,p_action:'tick'}
    for(let i=0;i<2;i++){const result=await sdk.rpc('team_action',body);assert.equal(result.error,null)}
  }
  assert.deepEqual(await balances(),report.after);report.finishedRetriesDoNotPayAgain=true
  await writeFile('android/generated/android-09-real.json',JSON.stringify(report,null,2));await writeFile('android/generated/android-09-real-progress.json',JSON.stringify(report,null,2));console.log('OK mesas reales 15/30, chat, privacidad, recuperación y saldo',report)
}catch(error){let message=error.message;for(const account of accounts){message=message.replaceAll(account.password,'[privado]').replaceAll(account.email,'[correo QA]')}console.error(message);await writeFile('android/generated/android-09-real-progress.json',JSON.stringify(report,null,2));process.exitCode=1}
finally {c.close();for(const context of contexts)await context.close();await Promise.all([sdk.auth.signOut({scope:'local'}),sdk1.auth.signOut({scope:'local'}),sdk2.auth.signOut({scope:'local'})])}
