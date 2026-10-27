// Rutas reales de Next, fallback sin APK y asociación local con certificado debug real.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { chromium } from 'playwright'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
nextEnv.loadEnvConfig(process.cwd())
const artifact=JSON.parse(await readFile('android/generated/android-07-artifact.json','utf8'))
const twa=JSON.parse(await readFile('android/twa-manifest.json','utf8'))
const certificate=artifact.certificateSha256.match(/../g).join(':')
const legacyFixture=Array(32).fill('AA').join(':')
const qa=(await loadQaAccounts()).registrationAccount
assert.ok(qa?.id,'Falta androidqa3 autorizada')
const reservation=createServer()
await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve))
const port=reservation.address().port
await new Promise(resolve=>reservation.close(resolve))
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'--hostname','127.0.0.1'],{
  env:{...process.env,TRUCAZO_NEXT_DIST_DIR:'android/generated/android-07-next',ANDROID_CAPACITOR_PACKAGE_ID:artifact.package,
    ANDROID_CAPACITOR_SHA256_FINGERPRINTS:certificate,ANDROID_SHA256_FINGERPRINTS:legacyFixture},stdio:['ignore','pipe','pipe']})
let browser
const origin='http://localhost:'+port, gamePath='/game/11111111-1111-4111-8111-111111111111'
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('No arrancó el servidor aislado')),15000)
    server.stdout.on('data',data=>{if(data.toString().includes('Ready')){clearTimeout(timer);resolve()}})
    server.on('error',reject);server.on('exit',()=>{clearTimeout(timer);reject(Error('El servidor terminó antes de iniciar'))})
  })
  const asset=await fetch(origin+'/.well-known/assetlinks.json',{redirect:'manual'})
  assert.equal(asset.status,200);assert.ok(asset.headers.get('content-type').includes('application/json'))
  const links=await asset.json()
  assert.equal(links.length,2)
  const cap=links.find(x=>x.target.package_name===artifact.package)
  assert.deepEqual(cap.target.sha256_cert_fingerprints,[certificate])
  assert.deepEqual(cap.relation,['delegate_permission/common.handle_all_urls'])
  assert.deepEqual(links.find(x=>x.target.package_name===twa.packageId).target.sha256_cert_fingerprints,[legacyFixture])
  await writeFile('android/generated/android-07-assetlinks-debug.json',JSON.stringify([cap],null,2))
  browser=await chromium.launch({headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE})
  const context=await browser.newContext({viewport:{width:360,height:640}}),page=await context.newPage()
  const gameRequests=[], localPaths=[]
  page.on('request',r=>{const u=new URL(r.url());if(u.origin===origin)localPaths.push(u.pathname);if(u.pathname===gamePath)gameRequests.push(r.method())})
  await page.goto(origin+gamePath)
  await page.waitForURL('**/login')
  assert.equal(decodeURIComponent((await context.cookies()).find(x=>x.name==='trucazo_auth_next').value),gamePath)
  assert.equal(await page.getByRole('button',{name:'Entrar como invitado',exact:true}).count(),1)
  await page.waitForFunction(()=>Object.keys(document.querySelector('input[name=password]')||{}).some(k=>k.startsWith('__reactProps$')))
  await page.locator('input[name=identifier]').fill(qa.username)
  await page.locator('input[name=password]').fill(qa.password)
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await page.waitForURL('**/lobby',{timeout:30000})
  await writeFile('android/generated/android-07-fallback-diagnostic.json',JSON.stringify({gameRequests,localPaths:localPaths.filter(p=>!p.startsWith('/_next/')),finalPath:new URL(page.url()).pathname,destinationCookie:(await context.cookies()).find(x=>x.name==='trucazo_auth_next')?.value??null},null,2))
  assert.ok(gameRequests.length>=2,'Se volvió a solicitar el destino antes de descartar la mesa inexistente')
  await page.getByRole('heading',{name:'Mesas disponibles',exact:true}).waitFor()
  const identity=await context.request.get(origin+'/api/android/historia?identity=1')
  assert.equal(identity.status(),200);assert.equal((await identity.json()).userId,qa.id)
  await page.screenshot({path:'android/generated/android-07-web-fallback-real.png'})
  const anonymous=await browser.newContext()
  const destination=await anonymous.request.get(origin+'/torneos/11111111-1111-4111-8111-111111111111',{maxRedirects:0})
  assert.equal(destination.status(),307);assert.ok(destination.headers().location.endsWith('/login'))
  const recovery=await anonymous.request.get(origin+'/recuperar-cuenta')
  assert.equal(recovery.status(),200);assert.equal(recovery.headers()['referrer-policy'],'no-referrer')
  const result={scope:'Next real aislado y navegador sin APK, Supabase/QA3 reales; assetlinks local con certificado APK y TWA simulado',
    assetlinksConfigured:true,certificateMatchesApk:true,twaEntryPreserved:true,publicDomainVerified:false,
    fallbackWithoutApk:true,destinationAfterWebLogin:true,missingGameSafelyRejected:true,webQa3Login:true,
    tournamentDestinationProtected:true,recoveryWithoutSession:true,newGames:0,newAccounts:0}
  await writeFile('android/generated/android-07-delivery.json',JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
}catch(failure){console.error('Entrega acceso: '+failure.message.replaceAll(qa.password,'[privado]').replaceAll(qa.email,'[correo QA]'));process.exitCode=1}
finally{await browser?.close();server.kill()}
