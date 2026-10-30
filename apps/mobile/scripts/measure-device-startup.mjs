// Tres arranques fríos y respuesta local de una ventana, sin crear mesas.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const serial=process.env.ANDROID_QA_SERIAL||'emulator-5554',port=Number(process.env.ANDROID_QA_CDP||9224),pkg='ar.com.trucazo.capacitor.dev'
const adb=args=>execFileSync(process.env.ADB,['-s',serial,...args],{encoding:'utf8'})
const pause=ms=>new Promise(r=>setTimeout(r,ms)),report={scope:'APK debug instalado; tres arranques, lobby contra Supabase real y ventana sin RPC de juego; marca interna tras render y dos cuadros, reloj del dispositivo calibrado sin espera CDP',serial,starts:[],actions:[]}
let c
async function connect(){for(let i=0;i<80;i++){try{const pid=adb(['shell','pidof',pkg]).trim();adb(['forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid]);c=await deviceCDP({port});if(await c.evaluate('!!document.body'))return;c.close()}catch{}await pause(150)}throw Error('No abrió WebView')}
async function wait(expression){for(let i=0;i<120;i++){if(await c.evaluate(expression))return;await pause(100)}throw Error('No apareció '+expression)}
try{
  await connect();await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));location.hash='#/lobby'");await pause(1500)
  for(let i=0;i<3;i++){
    await pause(3500)
    c.close();c=null;adb(['shell','am','force-stop',pkg]);await pause(800)
    const clockBefore=Date.now(),deviceClock=Number(adb(['shell','date','+%s%3N']).trim()),clockAfter=Date.now()
    assert.ok(Number.isSafeInteger(deviceClock)&&deviceClock>1e12)
    const clockOffset=deviceClock-(clockBefore+clockAfter)/2,start=Date.now()
    const launch=adb(['shell','am','start','-W','-n',pkg+'/.MainActivity'])
    await connect();await wait("document.body.innerText.includes('Mesas disponibles')&&!!document.querySelector('button[aria-label=Perfil]')&&performance.getEntriesByName('trucazo:lobby-ready').length===1")
    const readyMs=Date.now()-start
    const timing=await c.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0],paint=performance.getEntriesByType('paint'),ready=performance.getEntriesByName('trucazo:lobby-ready')[0].startTime;return {timeOrigin:performance.timeOrigin,lobbyReadyFromNavigationMs:ready,domReadyMs:n.domContentLoadedEventEnd,firstPaintMs:paint.find(p=>p.name==='first-paint')?.startTime,firstContentfulPaintMs:paint.find(p=>p.name==='first-contentful-paint')?.startTime,userAgent:navigator.userAgent,resources:performance.getEntriesByType('resource').filter(e=>e.startTime<ready).map(e=>{const p=new URL(e.name).pathname;return {path:p.startsWith('/auth/')||p.startsWith('/rest/')?p:'/local-or-image',startMs:e.startTime,durationMs:e.duration}})}})()")
    report.starts.push({nativeTotalMs:Number(launch.match(/TotalTime:\s*(\d+)/)?.[1]),lobbyReadyUpperBoundMs:readyMs,
      lobbyReadyFromLaunchMs:timing.timeOrigin+timing.lobbyReadyFromNavigationMs-(start+clockOffset),
      contentFromLaunchMs:timing.timeOrigin+timing.firstContentfulPaintMs-(start+clockOffset),clockRoundTripMs:clockAfter-clockBefore,...timing})
    await pause(600)
    const action=await c.evaluate("(async()=>{const start=performance.now();Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Crear mesa').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {twoFramesMs:performance.now()-start,dialogPresent:!!document.querySelector('[role=dialog]')}})()")
    assert.ok(action.dialogPresent);report.actions.push(action)
    await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
  }
  report.device={model:adb(['shell','getprop','ro.product.model']).trim(),android:adb(['shell','getprop','ro.build.version.release']).trim(),api:adb(['shell','getprop','ro.build.version.sdk']).trim(),viewport:await c.evaluate('[innerWidth,innerHeight]')}
  await writeFile('android/generated/android-14-startup-internal.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}finally{await c?.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));location.hash='#/lobby'").catch(()=>{});c?.close()}
