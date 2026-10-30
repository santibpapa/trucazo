// Perfil/tienda QA1 reales. Usa una carta empaquetada como archivo de ensayo, sin fotos personales.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { releaseDevice } from './release-device.mjs'
import { releaseQaLogin } from './release-qa-login.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved=await loadQaAccounts(),qa=saved.accounts[0],c=await releaseDevice({serial:'emulator-5554',port:9239})
const sdk=createClient(saved.projectUrl,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
assert.equal((await sdk.auth.signInWithPassword({email:qa.email,password:qa.password})).error,null)
const profile=async()=>{const r=await sdk.from('profiles').select('id,coins,campaign_points,avatar_url,active_accessory').eq('id',qa.id).single();assert.equal(r.error,null);return r.data}
const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,150))}throw Error('No apareció el estado de perfil/tienda esperado')}
const resume=process.argv.includes('--resume-shop')
const report=resume?JSON.parse(await readFile('android/generated/android-17-player-real-20.json','utf8')):{scope:'APK20/Android11 y web pública HTTPS, QA1, almacenamiento/RPC reales; carta empaquetada por input de diagnóstico, no selector físico',startedAt:new Date().toISOString()}
let browser,uploadedPath,uploaded
const save=()=>writeFile('android/generated/android-17-player-real-20.json',JSON.stringify(report,null,2))
try{
 await releaseQaLogin(1,false,c)
 if(resume){assert.equal(report.avatarRestoredAndTestObjectRemoved,true);assert.equal((await profile()).avatar_url,null);assert.equal((await profile()).coins,report.before.coins);report.shopResumedAt=new Date().toISOString();delete report.failure}
 else {report.before=await profile();assert.equal(report.before.avatar_url,null,'Conservar una foto anterior')
 await c.evaluate("location.hash='#/profile'");await wait(()=>c.evaluate('!!document.querySelector("input[type=file]")'))
 assert.equal(await c.evaluate(`(async()=>{const input=document.querySelector('input[type=file]'),r=await fetch('/cartas/oro_01.webp');if(!r.ok)throw Error('Falta el archivo de ensayo');const blob=await r.blob(),dt=new DataTransfer();dt.items.add(new File([blob],'android17-card-test.webp',{type:'image/webp'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`),true)
 await wait(async()=>{const p=await profile();if(p.avatar_url){uploaded=p.avatar_url;return true}return false})
 const url=new URL(uploaded),prefix='/storage/v1/object/public/avatars/'+qa.id+'/'
 assert.equal(url.origin,saved.projectUrl);assert.ok(url.pathname.startsWith(prefix))
 const name=url.pathname.slice(prefix.length);assert.match(name,/^\d+\.jpg$/);assert.ok(Number(name.slice(0,-4))>=Date.parse(report.startedAt))
 uploadedPath=qa.id+'/'+name;report.uploadedPath=uploadedPath;await save()
 const publicImage=await fetch(uploaded);assert.equal(publicImage.status,200);report.publicAvatarBytes=(await publicImage.arrayBuffer()).byteLength
 }
 browser=await chromium.launch({executablePath:process.env.PWA_BROWSER_EXECUTABLE,headless:true})
 const page=await browser.newPage({viewport:{width:360,height:820}})
 await page.goto('https://www.trucazo.com.ar/login');await page.waitForFunction(()=>Object.keys(document.querySelector('input[name=password]')||{}).some(k=>k.startsWith('__reactProps$')))
 await page.locator('input[name=identifier]').fill(qa.email);await page.locator('input[name=password]').fill(qa.password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/lobby**')
 if(!resume){await page.goto('https://www.trucazo.com.ar/profile');await page.getByRole('heading',{name:qa.username,exact:true}).waitFor()
 await page.waitForFunction(u=>Array.from(document.images).some(i=>i.src===u&&i.complete&&i.naturalWidth>0),uploaded)
 report.avatarShownOnWeb=true
 // El servicio rechaza borrar el avatar todavía vinculado al perfil.
 const api=async(path,body)=>{const response=await fetch('https://www.trucazo.com.ar'+path,{method:'POST',headers:{Authorization:'Bearer '+(await sdk.auth.getSession()).data.session.access_token,Origin:'https://localhost','Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json()}
 await api('/api/uploads/cleanup',{bucket:'avatars',paths:[uploadedPath]});assert.equal((await fetch(uploaded)).status,200);report.linkedAvatarProtected=true
 assert.equal((await sdk.rpc('set_avatar_url',{p_url:null})).error,null)
 await api('/api/uploads/cleanup',{bucket:'avatars',paths:[uploadedPath]});report.avatarRestoredAndTestObjectRemoved=true;uploadedPath=null
 }
 const [items,owned]=await Promise.all([sdk.from('accessories').select('slug,name,price').gt('price',0).order('price'),sdk.from('profile_accessories').select('accessory_slug').eq('profile_id',qa.id)])
 assert.equal(items.error,null);assert.equal(owned.error,null)
 const item=items.data.find(a=>a.price<=150&&!owned.data.some(o=>o.accessory_slug===a.slug));assert.ok(item,'Necesita un accesorio barato sin comprar de QA1')
 await c.evaluate("location.hash='#/tienda'");await wait(()=>c.evaluate("document.body.innerText.includes('Accesorios')"))
 await c.evaluate(`(()=>{window.__playerConfirm=window.confirm;window.confirm=message=>message===${JSON.stringify('¿Comprar "'+item.name+'" por '+item.price.toLocaleString('es-AR')+' monedas?')};const h=Array.from(document.querySelectorAll('h3')).find(h=>h.textContent.trim()===${JSON.stringify(item.name)});h?.parentElement.querySelector('button')?.click();return !!h})()`)
 await wait(async()=>(await profile()).active_accessory===item.slug)
 report.purchase={...item,beforeCoins:report.before.coins,after:await profile()};assert.equal(report.purchase.after.coins,report.before.coins-item.price)
 await sdk.rpc('buy_accessory',{p_slug:item.slug});assert.equal((await profile()).coins,report.purchase.after.coins);report.duplicatePurchaseDidNotCharge=true
 await page.goto('https://www.trucazo.com.ar/tienda');await page.getByRole('heading',{name:'Tienda',exact:true}).waitFor()
 await page.getByRole('heading',{name:item.name,exact:true}).locator('..').getByRole('button',{name:'Sacar de la mesa',exact:true}).waitFor();report.equippedOnWeb=true
 await c.evaluate(`(()=>{const h=Array.from(document.querySelectorAll('h3')).find(h=>h.textContent.trim()===${JSON.stringify(item.name)});const b=h?.parentElement.querySelector('button');if(b?.textContent.trim()!=='Sacar de la mesa')return false;b.click();return true})()`)
 await wait(async()=>['ninguno',null].includes((await profile()).active_accessory))
 if(!['ninguno',null].includes(report.before.active_accessory))assert.equal((await sdk.rpc('set_active_accessory',{p_slug:report.before.active_accessory})).error,null)
 report.final=await profile();assert.equal(report.final.avatar_url,null)
 report.passed=true;await save();console.log(JSON.stringify({passed:true,avatarShownOnWeb:true,linkedAvatarProtected:true,testAvatarRemoved:true,purchased:item.slug,coins:report.final.coins,duplicatePurchaseDidNotCharge:true}))
}catch(error){report.failure=error.message;await save();throw error}
finally{
 await c.evaluate('if(window.__playerConfirm)window.confirm=window.__playerConfirm;true').catch(()=>{})
 await c.evaluate("location.hash='#/lobby'").catch(()=>{});await c.close();await browser?.close();await sdk.auth.signOut({scope:'local'})
}
