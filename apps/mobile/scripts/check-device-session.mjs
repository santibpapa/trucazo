import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import nextEnv from '@next/env'
import { deviceCDP } from './device-cdp.mjs'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
nextEnv.loadEnvConfig(process.cwd())
const connection = await deviceCDP()
const authenticated = process.argv.includes('--authenticated')
const prepareHistory = process.argv.includes('--prepare-history')
try {
  if(authenticated) for(let attempt=0;attempt<20;attempt++) {
    if(await connection.evaluate("!!document.querySelector('header')")) break
    await new Promise(resolve=>setTimeout(resolve,500))
  }
  const result = await connection.evaluate(`(async()=>{
    const stored = JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1') || 'null');
    const status = { origin:location.origin, platform:window.Capacitor.getPlatform(), online:navigator.onLine,
      screen:document.querySelector('input[name=password]')?'login':document.querySelector('header')?'lobby':'other',
      hasSession:!!stored, userId:stored?.user.id, expiresAt:stored?.expires_at,
      alert:document.querySelector('[role=alert]')?.innerText };
    if (!stored) return status;
    const auth = {apikey:${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)},Authorization:'Bearer '+stored.access_token};
    const profile = await fetch(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}+'/rest/v1/profiles?select=id,username,coins,campaign_points&id=eq.'+stored.user.id,{headers:auth}).then(r=>r.json());
    status.profile = profile[0] && {id:profile[0].id,username:profile[0].username,coins:profile[0].coins,points:profile[0].campaign_points};
    const response=await window.Capacitor.Plugins.CapacitorHttp.request({url:'http://localhost:3000/api/android/historia?identity=1',method:'GET',headers:{Authorization:auth.Authorization,Origin:'https://localhost'},responseType:'json'});
    status.history = {status:response.status,userId:response.data.userId};
    if (${prepareHistory}) {
      const download=await window.Capacitor.Plugins.CapacitorHttp.request({url:'http://localhost:3000/api/android/historia',method:'GET',headers:{Authorization:auth.Authorization,Origin:'https://localhost'},responseType:'json'});
      const snapshot=download.data;
      status.preparation={status:download.status,userId:snapshot.userId,version:snapshot.version,engineVersion:snapshot.engine_version,
        hasGrant:!!snapshot.grant,provinces:snapshot.catalog?.provinces.length,rivals:snapshot.catalog?.rivals.length,coins:snapshot.coins,points:snapshot.points};
    }
    status.usernameVisible = !!status.profile && document.body.innerText.includes(status.profile.username);
    return status;
  })()`)
  assert.equal(result.origin,'https://localhost');assert.equal(result.platform,'android')
  if(authenticated){assert.equal(result.hasSession,true);assert.equal(result.screen,'lobby');assert.equal(result.usernameVisible,true);assert.equal(result.profile.id,result.userId);assert.equal(result.history.status,200);assert.equal(result.history.userId,result.userId)}
  else{assert.equal(result.hasSession,false);assert.equal(result.screen,'login')}
  if(prepareHistory){assert.equal(result.preparation.status,200);assert.equal(result.preparation.userId,result.userId);assert.equal(result.preparation.hasGrant,true);assert.equal(result.preparation.provinces,15);assert.equal(result.preparation.rivals,66);assert.equal(result.preparation.coins,result.profile.coins);assert.equal(result.preparation.points,result.profile.points)}
  await mkdir('android/generated',{recursive:true})
  await writeFile('android/generated/android-03-device-'+(authenticated?'authenticated':'login')+'.json',JSON.stringify(result,null,2))
  const shot=await connection.send('Page.captureScreenshot',{format:'png'})
  await writeFile('android/generated/android-03-device-'+(authenticated?'authenticated':'login')+'.png',Buffer.from(shot.data,'base64'))
  console.log(JSON.stringify(result))
}finally{connection.close()}
