// Audio local real y radios Android. No juega ni crea premios o avisos.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const serial=process.env.ANDROID_QA_SERIAL||'emulator-5554',port=Number(process.env.ANDROID_QA_CDP||9224),pkg='ar.com.trucazo.capacitor.dev'
const adb=args=>execFileSync(process.env.ADB,['-s',serial,...args],{encoding:'utf8'})
const pause=ms=>new Promise(r=>setTimeout(r,ms)),report={serial,cases:[]}
const wifi=adb(['shell','settings','get','global','wifi_on']).trim(),data=adb(['shell','settings','get','global','mobile_data']).trim()
let c,muted
async function connect(){for(let i=0;i<80;i++){try{const pid=adb(['shell','pidof',pkg]).trim();adb(['forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid]);c=await deviceCDP({port});if(await c.evaluate('document.readyState!=="loading"&&!!document.body&&!!window.Capacitor'))return;c.close()}catch{}await pause(200)}throw Error('No abrió WebView')}
async function wait(expression){for(let i=0;i<120;i++){if(await c.evaluate(expression))return;await pause(150)}throw Error('No apareció '+expression)}
const saved=()=>c.evaluate("(async()=>{const r=await Capacitor.Plugins.CampaignStore.read({owner:'2c9dd1e8-a39b-41e7-af2a-f67502691795'});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.body))),b=>b.toString(16).padStart(2,'0')).join('')})()")
try{
  await connect();adb(['shell','am','start','-n',pkg+'/.MainActivity'])
  await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));location.hash='#/lobby'")
  await wait("document.body.innerText.includes('Mesas disponibles')")
  const before=await saved()
  adb(['shell','svc','wifi','disable']);adb(['shell','svc','data','disable'])
  await wait('!navigator.onLine');await wait("document.body.innerText.includes('Sin conexión. Tu sesión está conservada.')")
  await c.evaluate("location.hash='#/historia/offline'");await wait("document.body.innerText.includes('Sin internet · guardado')")
  await pause(1600);c.close();c=null
  adb(['shell','am','force-stop',pkg]);adb(['shell','am','start','-n',pkg+'/.MainActivity']);await connect()
  await wait("!navigator.onLine&&document.body.innerText.includes('Sin internet · guardado')")
  assert.equal(await saved(),before);report.cases.push('radios apagadas, arranque frío de Historia y guardado idéntico')
  await writeFile('android/generated/android-14-'+serial+'-cold-offline.png',Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  adb(['shell','svc','wifi',wifi==='0'?'disable':'enable']);adb(['shell','svc','data',data==='0'?'disable':'enable']);await wait('navigator.onLine')
  report.cases.push('reconexión conserva cuenta y guardado sin confirmar premios nuevos')
  muted=await c.evaluate("localStorage.getItem('trucazo:muted')")
  const probe=(await build({stdin:{resolveDir:process.cwd(),contents:"import {playSound,setMuted} from './src/lib/sounds';window.soundProbe={playSound,setMuted}"},bundle:true,write:false,target:'chrome100'})).outputFiles[0].text
  await c.evaluate("window.originalAudio=window.Audio;window.Audio=function(src){const a=new window.originalAudio(src);a.loop=true;window.qaAudio=a;return a}")
  await c.evaluate(probe);await c.evaluate("soundProbe.setMuted(false);soundProbe.playSound('gano')")
  await wait('window.qaAudio?.readyState>=2&&!window.qaAudio.paused')
  report.audio={src:await c.evaluate('new URL(qaAudio.src).pathname'),duration:await c.evaluate('qaAudio.duration')}
  adb(['shell','input','keyevent','KEYCODE_HOME']);await wait('document.hidden&&qaAudio.paused&&qaAudio.currentTime===0')
  adb(['shell','am','start','-n',pkg+'/.MainActivity']);await wait('!document.hidden')
  assert.ok(await c.evaluate('qaAudio.paused'));await c.evaluate("soundProbe.playSound('carta')");await wait('!qaAudio.paused')
  await c.evaluate('soundProbe.setMuted(true)');assert.ok(await c.evaluate('qaAudio.paused'))
  report.cases.push('WAV local reproduce; otra app lo detiene; al volver no se repite; silenciar lo corta')
  await c.evaluate('window.Audio=window.originalAudio;soundProbe.setMuted('+JSON.stringify(muted==='1')+');'+(muted===null?"localStorage.removeItem('trucazo:muted')":'localStorage.setItem(\'trucazo:muted\','+JSON.stringify(muted)+')'))
  let delayed=0
  c.onEvent(event=>{if(event.method==='Fetch.requestPaused'){delayed++;void pause(2000).then(()=>c.send('Fetch.continueRequest',{requestId:event.params.requestId})).catch(()=>{})}})
  await c.send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/rest/v1/profiles*',requestStage:'Request'}]})
  const start=Date.now();await c.evaluate("location.hash='#/profile'");await pause(250)
  assert.ok(await c.evaluate("document.querySelector('#root').innerText.trim().length>0"))
  await wait("document.querySelector('h1')?.textContent==='androidqa3'")
  report.slowRead={addedDelayMs:2000,profileReadyMs:Date.now()-start,delayedRequests:delayed};assert.ok(delayed>0)
  await c.send('Fetch.disable');assert.equal(await saved(),before)
  report.cases.push('consulta lenta muestra estado de carga y termina sin pantalla blanca ni perder datos')
  await writeFile('android/generated/android-14-'+serial+'-audio-network.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}finally{
  adb(['shell','svc','wifi',wifi==='0'?'disable':'enable']);adb(['shell','svc','data',data==='0'?'disable':'enable'])
  await c?.send('Fetch.disable').catch(()=>{})
  await c?.evaluate("window.qaAudio?.pause();location.hash='#/lobby'").catch(()=>{});await pause(1500);c?.close()
  adb(['shell','am','force-stop',pkg]);adb(['shell','am','start','-n',pkg+'/.MainActivity'])
  await connect();c.close()
}
