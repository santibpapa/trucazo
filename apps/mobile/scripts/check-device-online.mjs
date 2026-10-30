// Aceptación del APK debug ya autenticado. Usa los controles reales, no modifica
// reglas/filas ni copia la sesión. La cuenta pierde/gana la apuesta ficticia normal.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import nextEnv from '@next/env'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const c = await deviceCDP(), results = []
const sleep = () => new Promise(resolve=>setTimeout(resolve,1000))
const click = async text => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)throw Error('Falta el control esperado');b.click();return true})()`)
const state = () => c.evaluate(`({route:location.hash,text:document.body.innerText,buttons:Array.from(document.querySelectorAll('button')).filter(b=>b.getBoundingClientRect().height>0&&!b.disabled).map(b=>({text:b.textContent.trim(),label:b.getAttribute('aria-label')})),height:innerHeight,scroll:document.documentElement.scrollHeight})`)
async function waitFor(predicate) {for(let i=0;i<40;i++){const value=await state();if(predicate(value))return value;await sleep()}throw Error('El APK no llegó al estado esperado')}
const snapshot = () => c.evaluate(`(async()=>{const s=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'));const headers={apikey:${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)},Authorization:'Bearer '+s.access_token};const base=${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}+'/rest/v1/';const id=location.hash.split('/').at(-1);const g=(await fetch(base+'games?select=id,status,target_score,player1_score,player2_score,winner_id,hand_number,mazo_count_p1,mazo_count_p2&id=eq.'+id,{headers}).then(r=>r.json()))[0];const profile=(await fetch(base+'profiles?select=id,coins,campaign_points&id=eq.'+s.user.id,{headers}).then(r=>r.json()))[0];return {game:g,profile};})()`)
try {
  for(const target of process.argv.includes('--30') ? [30] : [15,30]) {
    const resume = (await state()).route.startsWith('#/game/')
    if (!resume) {
    await waitFor(s=>s.buttons.some(b=>b.text==='Crear mesa'))
    await click('Crear mesa')
    await waitFor(s=>s.buttons.some(b=>b.text==='A '+target))
    await c.evaluate(`(async()=>{const input=document.getElementById('tableName');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'ANDROID-05 bot ${target}');input.dispatchEvent(new Event('input',{bubbles:true}));Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='A ${target}').click();await new Promise(requestAnimationFrame)})()`)
    await click('Crear')
    console.log('Mesa pública a '+target+': esperando al bot del servidor.')
    }
    await waitFor(s=>s.buttons.some(b=>b.label?.startsWith('Jugar ')))
    const entry=await state()
    assert.equal(entry.scroll,entry.height)
    const image=await c.send('Page.captureScreenshot',{format:'png'})
    await writeFile('android/generated/android-05-real-bot-'+target+'-table.png',Buffer.from(image.data,'base64'))
    let actions=0
    for(let n=0;n<600;n++) {
      const current=await state()
      if(current.buttons.some(b=>b.text==='Revancha'))break
      const choice=current.buttons.find(b=>b.text==='No quiero')
        ?? current.buttons.find(b=>b.text.startsWith('Tengo '))
        ?? current.buttons.find(b=>b.label?.startsWith('Jugar '))
      if(choice) {
        await c.evaluate(`(()=>{const b=${choice.label?`document.querySelector('button[aria-label=${JSON.stringify(choice.label)}]')`:`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(choice.text)})`};if(b&&!b.disabled)b.click()})()`)
        actions++
      }
      if(n && n%30===0)console.log('Bot a '+target+': '+actions+' controles usados; partida en curso.')
      await sleep()
    }
    const end=await snapshot()
    assert.equal(end.game.status,'finished')
    assert.equal(end.game.target_score,target)
    assert.ok(Math.max(end.game.player1_score,end.game.player2_score)>=target)
    if (!resume) assert.equal(end.game.mazo_count_p1,0)
    const shot=await c.send('Page.captureScreenshot',{format:'png'})
    await writeFile('android/generated/android-05-real-bot-'+target+'-result.png',Buffer.from(shot.data,'base64'))
    results.push({...end,actions})
    await writeFile('android/generated/android-05-real-bots.json',JSON.stringify(results,null,2))
    console.log('Bot a '+target+' terminado:',end.game.player1_score+'–'+end.game.player2_score,'saldo',end.profile.coins)
    await click('Volver al lobby')
  }
  console.log('OK dos partidas completas desde el APK real a 15 y 30; contadores de tiempo incluidos en la evidencia.')
} finally {c.close()}
