// Destino existente tras acceso: mesa privada de QA3, sin rival ni partida iniciada.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const saved=await loadQaAccounts(),qa=saved.registrationAccount,other=saved.accounts[1]
assert.ok(qa?.id,'Falta QA3 autorizada')
const api=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const login=await api.auth.signInWithPassword({email:qa.email,password:qa.password})
if(login.error)throw Error('No se pudo ingresar con QA3')
let c=await deviceCDP(),browser,table,initialCoins
const visibleButton=label=>`Array.from(document.querySelectorAll('button')).find(b=>b.getClientRects().length&&b.innerText.trim()===${JSON.stringify(label)})`
async function wait(e){for(let i=0;i<100;i++){if(await c.evaluate(e))return;await new Promise(r=>setTimeout(r,200))}throw Error('El destino nativo no apareció')}
try{
  const profile=await api.from('profiles').select('coins').eq('id',qa.id).single()
  if(profile.error)throw Error('No se pudo leer el saldo inicial')
  initialCoins=profile.data.coins
  const created=await api.rpc('create_table',{p_name:'QA ANDROID-07 acceso',p_bet:10,p_is_private:true,p_private_code:randomBytes(4).toString('hex').toUpperCase(),p_target_score:15,p_time_limit:30})
  if(created.error)throw Error('No se pudo preparar la mesa privada QA')
  table=created.data
  assert.equal(table.creator_id,qa.id);assert.equal(table.status,'waiting');assert.equal(table.is_private,true)
  const gamePath='/game/'+table.id
  const nativeOwner=await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id`)
  assert.ok([other.id,qa.id].includes(nativeOwner),'Esta prueba no cierra cuentas personales')
  await c.evaluate(`location.hash='#/lobby'`);await wait(`!!document.querySelector('button[aria-label="Perfil"]')`)
  await c.evaluate(`document.querySelector('button[aria-label="Perfil"]').click()`)
  await wait(`!!${visibleButton('Cerrar sesión')}`)
  await c.evaluate(`${visibleButton('Cerrar sesión')}.click()`)
  await wait(`!!document.querySelector('input[name=identifier]')`)
  execFileSync(process.env.ADB,['-s','emulator-5554','shell','am','start','-a','android.intent.action.VIEW','-c','android.intent.category.BROWSABLE','-d','https://www.trucazo.com.ar'+gamePath,'-p','ar.com.trucazo.capacitor.dev'],{stdio:'pipe'})
  await wait(`location.hash===${JSON.stringify('#'+gamePath)}&&!!document.querySelector('input[name=identifier]')`)
  await c.evaluate(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [name,value]of ${JSON.stringify([['identifier',qa.username],['password',qa.password]])}){const input=document.querySelector('input[name='+name+']');set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}setTimeout(()=>Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Iniciar sesión').click(),0);})()`)
  await wait(`document.querySelector('h2')?.innerText==='Esperando rival'&&JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id===${JSON.stringify(qa.id)}`)
  assert.equal(await c.evaluate('location.hash'),'#'+gamePath)
  browser=await chromium.launch({headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE})
  const context=await browser.newContext({viewport:{width:360,height:640}}),page=await context.newPage()
  await page.goto('http://localhost:3000'+gamePath)
  await page.waitForURL('**/login')
  await page.waitForFunction(()=>Object.keys(document.querySelector('input[name=password]')||{}).some(k=>k.startsWith('__reactProps$')))
  await page.locator('input[name=identifier]').fill(qa.username);await page.locator('input[name=password]').fill(qa.password)
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await page.getByRole('heading',{name:'Esperando rival',exact:true}).waitFor({timeout:30000})
  assert.equal(new URL(page.url()).pathname,gamePath)
  await page.screenshot({path:'android/generated/android-07-real-table-web.png'})
  const foreign=await browser.newContext()
  const foreignLogin=await foreign.request.post('http://localhost:3000/api/login-usuario',{data:{username:other.username,password:other.password}})
  assert.equal(foreignLogin.status(),200)
  const rejected=await foreign.newPage()
  await rejected.goto('http://localhost:3000'+gamePath)
  await rejected.waitForURL('**/lobby',{timeout:30000})
  assert.equal(await rejected.getByRole('heading',{name:'Esperando rival',exact:true}).count(),0)
  const games=await api.from('games').select('id').eq('id',table.id)
  assert.deepEqual(games.data,[],'La mesa privada quedó esperando, sin repartir ni jugar')
  const cancelled=await api.rpc('cancel_table',{p_table_id:table.id})
  if(cancelled.error)throw Error('Falta cancelar la mesa QA')
  const finalProfile=await api.from('profiles').select('coins').eq('id',qa.id).single()
  assert.equal(finalProfile.data.coins,initialCoins)
  await c.evaluate(`location.hash='#/lobby'`);await wait(`!!document.querySelector('header')`)
  const result={scope:'APK y Next reales, mesa privada existente de QA3; sin rival ni partida',owner:qa.id,tableId:table.id,nativeDestinationAfterLogin:true,
    webDestinationAfterLogin:true,foreignUserRejected:true,newGames:0,privateTableCancelled:true,coinsBefore:initialCoins,coinsAfter:finalProfile.data.coins}
  await writeFile('android/generated/android-07-real-table-return.json',JSON.stringify(result,null,2))
  table=null;console.log(JSON.stringify(result))
}catch(failure){console.error('Destino real: '+failure.message.replaceAll(qa.password,'[privado]').replaceAll(qa.email,'[correo QA]').replaceAll(other.password,'[privado]').replaceAll(other.email,'[correo QA]'));process.exitCode=1}
finally{
  if(table){const cancelled=await api.rpc('cancel_table',{p_table_id:table.id});if(cancelled.error)console.error('La mesa QA requiere cancelación normal: '+table.id)}
  await browser?.close();c.close();await api.auth.signOut({scope:'local'})
}
