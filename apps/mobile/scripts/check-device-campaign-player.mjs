import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { deviceCDP } from './device-cdp.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const qa=await loadQaAccounts(),owner=qa.registrationAccount.id,c=await deviceCDP(),report={scope:'Historia online y descarga en APK Android 11/WebView 133 con Supabase real; QA3'}
const pause=ms=>new Promise(r=>setTimeout(r,ms))
async function wait(expression){for(let i=0;i<160;i++){const value=await c.evaluate(expression);if(value)return value;await pause(150)}throw Error('El APK no mostró '+expression)}
async function click(label){assert.ok(await c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>(b.textContent.trim()===${JSON.stringify(label)}||b.getAttribute('aria-label')===${JSON.stringify(label)})&&!b.disabled);b?.click();return !!b})()`),'Falta '+label)}
async function shot(name){const image=await c.send('Page.captureScreenshot',{format:'png'});await writeFile('android/generated/android-08-'+name+'.png',Buffer.from(image.data,'base64'))}
try{
  assert.equal(await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id`),owner)
  if (!process.argv.includes('--download-only')) {
  await c.evaluate(`location.hash='#/historia'`)
  await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.getAttribute('aria-label')==='Entrar a Buenos Aires')`)
  const tutorialBefore=await c.evaluate(`localStorage.getItem('trucazo:campania:tutorial:'+${JSON.stringify(owner)})`)
  if(!tutorialBefore){await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='¡A jugar!')`);await click('¡A jugar!')}
  assert.equal(await c.evaluate(`localStorage.getItem('trucazo:campania:tutorial:'+${JSON.stringify(owner)})`),'1')
  await shot('qa3-online-map')
  await click('Entrar a Buenos Aires');await click('Ver a Tobías, el Novato');await click('Jugar')
  await wait(`!!document.querySelector('[data-game-table]')||!!document.querySelector('[data-card-hand="me"]')`)
  const gameId=await c.evaluate(`location.hash.slice('#/game/'.length)`)
  assert.match(gameId,/^[0-9a-f-]{36}$/)
  await pause(800)
  const table=await c.evaluate(`({body:document.body.innerText,images:Array.from(document.images).map(i=>i.getAttribute('src')),backgrounds:Array.from(document.querySelectorAll('div')).map(e=>e.style.backgroundImage).filter(Boolean),overflow:Array.from(document.querySelectorAll('[data-game-actions] button,[data-card-hand="me"] button')).some(b=>{const r=b.getBoundingClientRect();return r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth})})`)
  assert.ok(table.images.some(src=>src?.includes('/personajes/novato')))
  assert.ok(table.images.some(src=>src?.includes('/accesorios/agua')))
  assert.ok(table.images.some(src=>src?.includes('/'+owner+'/')))
  assert.ok(table.backgrounds.some(src=>src.includes('cafetin')))
  assert.equal(table.overflow,false)
  report.online={gameId,correctRival:true,salon:true,avatar:true,accessory:true,controlsFit:true}
  await writeFile('android/generated/android-08-native-online-table.json',JSON.stringify(report,null,2))
  await shot('qa3-equipped-online-table')
  await c.send('Page.enable');await c.evaluate(`setTimeout(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Abandonar partida').click(),200)`);await pause(400);await c.send('Page.handleJavaScriptDialog',{accept:true})
  await wait(`document.body.innerText.includes('Perdiste')`)
  }
  await c.evaluate(`location.hash='#/historia/offline'`);await wait(`!!document.querySelector('#prepare')&&!document.querySelector('#prepare').disabled`);await click('Descargar Historia')
  await wait(`!!document.querySelector('#campaign')`)
  const saved=await c.evaluate(`(async()=>{const s=JSON.parse((await Capacitor.Plugins.CampaignStore.read({owner:${JSON.stringify(owner)}})).body);return {owner:s.owner,revision:s.revision,pending:s.pending.length,coins:s.official.coins,points:s.official.points,provinces:s.official.catalog.provinces.length,rivals:s.official.catalog.rivals.length,avatarCached:s.presentation?.avatar_url?.startsWith('data:image/jpeg;base64,'),salon:s.presentation?.active_salon,frame:s.presentation?.active_frame,accessory:s.presentation?.active_accessory}})()`)
  assert.equal(saved.owner,owner);assert.equal(saved.avatarCached,true);assert.equal(saved.coins,400);assert.equal(saved.pending,0)
  assert.equal(saved.salon,'cafetin');assert.equal(saved.frame,'bronce');assert.equal(saved.accessory,'agua')
  assert.equal(saved.provinces,15);assert.equal(saved.rivals,66);report.offline=saved
  await click('Sin internet · guardado');await wait(`document.body.innerText.includes('Confirmado:')`)
  await shot('qa3-confirmed-progress')
  await writeFile('android/generated/android-08-native-campaign-player.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}catch(error){console.error(await c.evaluate(`({route:location.hash,body:document.body.innerText.slice(0,1600)})`));throw error}finally{c.close()}
