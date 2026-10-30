// Teclado, selector de imágenes y gesto Atrás; no envía formularios ni archivos.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const serial=process.env.ANDROID_QA_SERIAL||'emulator-5554',port=Number(process.env.ANDROID_QA_CDP||9224)
const adb=args=>execFileSync(process.env.ADB,['-s',serial,...args],{encoding:'utf8',maxBuffer:8*1024*1024})
let c=await deviceCDP({port})
const report={serial,cases:[]},pause=ms=>new Promise(r=>setTimeout(r,ms))
async function reconnect(){c.close();for(let i=0;i<50;i++){try{const pid=adb(['shell','pidof','ar.com.trucazo.capacitor.dev']).trim();adb(['forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid]);c=await deviceCDP({port});return}catch{await pause(200)}}throw Error('No reabrió WebView al cambiar las barras')}
const hardKeyboard=adb(['shell','settings','get','secure','show_ime_with_hard_keyboard']).trim()
const originalNavigation=adb(['shell','settings','get','secure','navigation_mode']).trim()
const wait=async(expression)=>{for(let i=0;i<100;i++){if(await c.evaluate(expression))return;await pause(150)}throw Error('No apareció '+expression)}
async function tap(selector){const p=await c.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.round((r.x+r.width/2)*devicePixelRatio),y:Math.round((r.y+r.height/2+24)*devicePixelRatio)}})()`);adb(['shell','input','tap',String(p.x),String(p.y)])}
const resumed=()=>adb(['shell',"dumpsys activity activities | grep ResumedActivity"])
const back=()=>adb(['shell','input','keyevent','4'])
try{
  adb(['shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity'])
  adb(['shell','settings','put','secure','show_ime_with_hard_keyboard','1'])
  await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await pause(300)
  await c.evaluate("location.hash='#/lobby'");await wait("document.body.innerText.includes('Mesas disponibles')")
  const fullHeight=await c.evaluate('Math.min(innerHeight,visualViewport.height)')
  await c.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Unirse').click()")
  await wait("!!document.querySelector('input[name=joinCode]')");await tap('input[name=joinCode]');await pause(800)
  assert.ok(await c.evaluate('Math.min(innerHeight,visualViewport.height)<'+(fullHeight-80)),'No abrió el teclado real')
  const view=await c.evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return {width:innerWidth,height:innerHeight,viewport:visualViewport.height,dialogTop:r.y,dialogBottom:r.bottom}})()")
  assert.ok(view.dialogTop>=0&&view.dialogBottom<=view.height+1)
  await writeFile('android/generated/android-14-'+serial+'-keyboard.png',Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  back();await wait('Math.min(innerHeight,visualViewport.height)>='+(fullHeight-5));assert.ok(await c.evaluate("!!document.querySelector('[role=dialog]')"))
  back();await wait("!document.querySelector('[role=dialog]')");report.cases.push('primer Atrás oculta teclado; segundo cierra ventana');report.keyboardViewport=view
  await c.evaluate("location.hash='#/profile'");await wait("!!document.querySelector('input[type=file]')")
  await tap('button[aria-label="Cambiar foto"],button[aria-label="Subir foto"]');await pause(700)
  assert.ok(!resumed().includes('ar.com.trucazo.capacitor.dev'),'No abrió el selector de imágenes')
  back();await pause(500);await wait("document.querySelector('h1')?.textContent==='androidqa3'")
  report.cases.push('selector Android de imágenes abre y se cancela sin cambiar la foto')
  adb(['shell','cmd','overlay','enable-exclusive','--category','com.android.internal.systemui.navbar.gestural']);await pause(700)
  await reconnect()
  adb(['shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity']);await wait('!document.hidden&&innerHeight>0')
  await c.evaluate("location.hash='#/lobby'");await wait("document.body.innerText.includes('Mesas disponibles')")
  await c.evaluate("location.hash='#/profile'");await wait("document.querySelector('h1')?.textContent==='androidqa3'")
  await c.evaluate("(async()=>{window.__inputBackEvents=[];window.__inputBackHandle=await Capacitor.Plugins.App.addListener('backButton',e=>window.__inputBackEvents.push({route:location.hash,canGoBack:e.canGoBack}))})()")
  const screen=await c.evaluate('({width:screen.width*devicePixelRatio,height:screen.height*devicePixelRatio})')
  adb(['shell','input','swipe','1',String(Math.round(screen.height/2)),String(Math.round(screen.width*.55)),String(Math.round(screen.height/2)),'300'])
  await wait("location.hash==='#/lobby'");report.cases.push('gesto lateral Atrás vuelve por el historial');report.backEvents=await c.evaluate('window.__inputBackEvents')
  await writeFile('android/generated/android-14-'+serial+'-gesture.png',execFileSync(process.env.ADB,['-s',serial,'exec-out','screencap','-p']))
  await writeFile('android/generated/android-14-'+serial+'-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}catch(error){report.failure=error.message;report.lastScreen=await c.evaluate('({route:location.hash,hidden:document.hidden,height:innerHeight,events:window.__inputBackEvents})').catch(()=>null);report.resumed=resumed();await writeFile('android/generated/android-14-'+serial+'-inputs-failure.json',JSON.stringify(report,null,2));throw error}
finally{
  await c.evaluate('window.__inputBackHandle?.remove()').catch(()=>{})
  adb(['shell','settings',hardKeyboard==='null'?'delete':'put','secure','show_ime_with_hard_keyboard',...(hardKeyboard==='null'?[]:[hardKeyboard])])
  await c.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))").catch(()=>{})
  await c.evaluate("location.hash='#/lobby'").catch(()=>{});await pause(1500);c.close()
  if(originalNavigation==='2')adb(['shell','cmd','overlay','enable-exclusive','--category','com.android.internal.systemui.navbar.gestural'])
  else adb(['shell','cmd','overlay','disable','com.android.internal.systemui.navbar.gestural'])
  adb(['shell','am','start','-n','ar.com.trucazo.capacitor.dev/.MainActivity'])
}
