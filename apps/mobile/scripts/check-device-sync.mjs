// Lectura del APK debug ingresado personalmente; nunca exporta sesión ni cartas.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import nextEnv from '@next/env'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const c = await deviceCDP(), mark = process.argv[2] || 'summary'
try {
  const result = await c.evaluate(`(async()=>{
    const session=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'));
    const state=await Capacitor.Plugins.CampaignStore.read({owner:session.user.id}),g=JSON.parse(state.body);
    const digest=async body=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
    const other=await Capacitor.Plugins.CampaignStore.read({owner:'9370e685-9dd0-4fab-a1a4-721a60f7d3dd'});
    const result={owner:g.owner,active:state.active,revision:g.revision,sha256:await digest(state.body),version:g.version,engine:g.official.engine_version,
      points:g.points,officialPoints:g.official.points,coins:g.official.coins,pending:g.pending.map(p=>p.id),receipts:g.receipts??[],
      style:g.official.style,progress:g.official.progress,trial:{id:g.trial?.id,status:g.trial?.game.status,actions:g.trial?.actions.length},
      otherHash:other.body?await digest(other.body):null,online:navigator.onLine,status:document.querySelector('#status')?.textContent,
      alert:document.querySelector('[role=alert]')?.innerText};
    if(navigator.onLine){
      const headers={apikey:${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)},Authorization:'Bearer '+session.access_token};
      const read=async(table,select='*')=>{const r=await fetch(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}+'/rest/v1/'+table+'?select='+select+'&'+(table==='profiles'?'id':'user_id')+'=eq.'+g.owner,{headers});if(!r.ok)throw Error('Lectura oficial: '+r.status);return r.json()};
      const [profile,style,progress]=await Promise.all([read('profiles','id,coins,campaign_points'),read('campaign_style'),read('campaign_progress')]);
      result.server={profile:profile[0],style:style[0],progress};
    }
    return result;
  })()`)
  assert.equal(result.owner,result.active)
  assert.equal(result.otherHash,'4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e')
  if(mark==='confirmed') {
    assert.equal(result.pending.length,0);assert.equal(result.receipts.length,5)
    assert.equal(result.coins,result.server.profile.coins);assert.equal(result.officialPoints,result.server.profile.campaign_points)
  }
  await writeFile('android/generated/android-06-real-'+mark+'.json',JSON.stringify(result,null,2))
  const shot=await c.send('Page.captureScreenshot',{format:'png'})
  await writeFile('android/generated/android-06-real-'+mark+'.png',Buffer.from(shot.data,'base64'))
  console.log(JSON.stringify(result))
} finally { c.close() }
