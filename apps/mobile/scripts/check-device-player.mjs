// Aceptación del APK debug con las tres QA existentes. Nunca imprime tokens.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import sharp from 'sharp'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'

process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
nextEnv.loadEnvConfig(process.cwd())
const qa=await loadQaAccounts(), accounts=[...qa.accounts,qa.registrationAccount], report={scope:'APK instalado Android 11/WebView 133 + web Next local 3002 + Supabase real',comparisons:[],movements:[]}
const webOrigin=process.env.ANDROID_QA_WEB_ORIGIN || 'http://localhost:3000'
assert.ok(['http://localhost:3000','http://localhost:3002'].includes(webOrigin))
report.scope='APK instalado Android 11/WebView 133 + web Next local + Supabase real'
const c=await deviceCDP()
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function wait(expression) {for(let i=0;i<100;i++){const result=await c.evaluate(expression);if(result)return result;await pause(150)}throw Error('El APK no mostró el estado esperado: '+expression)}
async function go(route,text) {await c.evaluate(`location.hash=${JSON.stringify('#'+route)}`);if(text)await wait(`document.body.innerText.includes(${JSON.stringify(text)})`)}
async function click(text) {assert.ok(await c.evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getBoundingClientRect().width&&!b.disabled);button?.click();return !!button})()`),'Falta botón '+text)}
async function screenshot(name) {const image=await c.send('Page.captureScreenshot',{format:'png'});await writeFile('android/generated/android-08-'+name+'.png',Buffer.from(image.data,'base64'))}
async function login(n) {
  const owner=await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id`)
  assert.ok(!owner||accounts.some(a=>a.id===owner),'No salir de una cuenta personal')
  if(owner!==accounts[n-1].id){
    if(owner){await go('/lobby','Crear mesa');await c.evaluate(`document.querySelector('button[aria-label="Perfil"]').click()`);await click('Cerrar sesión');await wait(`!!document.querySelector('input[name=password]')`)}
    const result=spawnSync(process.execPath,['apps/mobile/scripts/qa-login.mjs','native',String(n)],{encoding:'utf8'})
    assert.equal(result.status,0,'Falló ingreso normal QA; revisar qa-login sin imprimir datos privados')
  }
}
async function clientFor(account) {
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  const login=await client.auth.signInWithPassword({email:account.email,password:account.password});assert.equal(login.error,null)
  return client
}
const identityView=()=>{
  const h=document.querySelector('h1'),p=document.querySelector('main > div'),s=h&&getComputedStyle(h)
  return {title:h?.textContent,color:s?.color,fontSize:s?.fontSize,fontWeight:s?.fontWeight,panelRadius:p&&getComputedStyle(p).borderRadius,width:innerWidth,height:innerHeight}
}
try {
  for(let n=1;n<=3;n++){
    await login(n)
    const account=accounts[n-1],client=await clientFor(account)
    const profile=await client.from('profiles').select('*').eq('id',account.id).single();assert.equal(profile.error,null)
    await go('/profile',account.username);await wait(`!!document.querySelector('h1')`)
    const native=await c.evaluate('('+identityView.toString()+')()')
    const context=await chromium.launchPersistentContext('android/generated/private/qa-web-'+n,{headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,viewport:{width:native.width,height:native.height}})
    try {
      const web=context.pages()[0]||await context.newPage()
      await web.goto(webOrigin+'/profile');await web.getByRole('heading',{name:account.username,exact:true}).waitFor()
      const webView=await web.evaluate(identityView)
      assert.deepEqual(native,webView)
      await screenshot('qa'+n+'-profile-apk');await web.screenshot({path:'android/generated/android-08-qa'+n+'-profile-web.png'})
      const nativeHistory=await c.evaluate(`document.querySelectorAll('section')[2]?.innerText`)
      const webHistory=await web.locator('section').nth(2).innerText();assert.equal(nativeHistory,webHistory)
      await go('/ranking','Ranking');await wait(`!!document.querySelector('h1')`)
      await web.goto(webOrigin+'/ranking');await web.getByRole('heading',{name:'Ranking',exact:true}).waitFor()
      assert.equal((await c.evaluate(`document.querySelector('main').innerText`)).replaceAll(/\s+/g,' '),(await web.locator('main').innerText()).replaceAll(/\s+/g,' '))
      await screenshot('qa'+n+'-ranking-apk')
      await go('/tienda','Tienda');await wait(`!!document.querySelector('h1')`)
      await web.goto(webOrigin+'/tienda');await web.getByRole('heading',{name:'Tienda',exact:true}).waitFor()
      assert.equal((await c.evaluate(`document.querySelector('main').innerText`)).replaceAll(/\s+/g,' '),(await web.locator('main').innerText()).replaceAll(/\s+/g,' '))
      await screenshot('qa'+n+'-shop-apk');await web.screenshot({path:'android/generated/android-08-qa'+n+'-shop-web.png'})
      report.comparisons.push({username:account.username,coins:profile.data.coins,profileStyleEqual:true,historyEqual:true,rankingEqual:true,shopEqual:true,viewport:{width:native.width,height:native.height}})
    } finally {await context.close();await client.auth.signOut({scope:'local'})}
  }
  if (process.argv.includes('--compare-only')) {
    await writeFile('android/generated/android-08-native-player-final.json',JSON.stringify(report,null,2))
    console.log(JSON.stringify(report))
  } else {
  // QA3 conserva los cosméticos comprados: no se manipulan saldos por administración.
  const account=accounts[2],client=await clientFor(account)
  const readProfile=async()=>{const result=await client.from('profiles').select('*').eq('id',account.id).single();assert.equal(result.error,null);return result.data}
  const before=await readProfile()
  await go('/tienda','Tienda')
  for(const [name,slug,kind,price] of [['Cafetín porteño','cafetin','salon',250],['Bronce','bronce','frame',200],['Botella de agua','agua','accessory',150]]) {
    const current=await readProfile()
    if(current['active_'+kind]===slug)continue
    const owned=await client.from('profile_'+(kind==='accessory'?'accessories':kind+'s')).select('*').eq('profile_id',account.id).eq(kind+'_slug',slug)
    assert.equal(owned.error,null)
    const oldCoins=current.coins
    if(owned.data.length){const result=await client.rpc('set_active_'+kind,{p_slug:slug});assert.equal(result.error,null);continue}
    await c.send('Page.enable')
    const found=await c.evaluate(`(()=>{const h=Array.from(document.querySelectorAll('h3')).find(h=>h.textContent===${JSON.stringify(name)});const button=h?.parentElement.querySelector('button');if(!button||button.disabled)return false;setTimeout(()=>button.click(),200);return true})()`)
    assert.ok(found,'Falta compra '+name);await pause(400);await c.send('Page.handleJavaScriptDialog',{accept:true})
    await wait(`document.body.innerText.includes(${JSON.stringify(kind==='accessory'?'Sacar de la mesa':'En uso')})`)
    let after
    for(let i=0;i<50;i++){after=await readProfile();if(after['active_'+kind]===slug)break;await pause(150)}
    assert.equal(after['active_'+kind],slug);assert.equal(after.coins,oldCoins-price)
    const repeat=await client.rpc('buy_'+kind,{p_slug:slug});assert.ok(repeat.error);assert.equal((await readProfile()).coins,after.coins)
    report.movements.push({kind,slug,before:oldCoins,price,after:after.coins,repeatedPurchaseCharged:false})
  }
  await go('/profile',account.username);await wait(`!!document.querySelector('input[type=file]')`)
  const png=await sharp({create:{width:64,height:64,channels:3,background:'#c9a24b'}}).png().toBuffer()
  const previous=(await readProfile()).avatar_url
  await c.evaluate(`(()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(png.toString('base64'))}),x=>x.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'android-qa-avatar.png',{type:'image/png'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)
  let after
  for(let i=0;i<100;i++){after=await readProfile();if(after.avatar_url&&after.avatar_url!==previous)break;await pause(150)}
  assert.ok(after.avatar_url&&after.avatar_url!==previous,'La foto no se actualizó')
  assert.ok(after.avatar_url.includes('/'+account.id+'/'))
  report.avatar={owner:account.id,updated:true,ownStoragePath:true}
  report.final={username:account.username,coinsBefore:before.coins,coins:after.coins,frame:after.active_frame,salon:after.active_salon,accessory:after.active_accessory}
  await client.auth.signOut({scope:'local'})
  await screenshot('qa3-avatar-apk')
  await writeFile('android/generated/android-08-native-player.json',JSON.stringify(report,null,2))
  console.log(JSON.stringify(report))
  }
} finally {c.close()}
