import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import nextEnv from '@next/env'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const bundle=await build({stdin:{contents:`
  import {createRoot} from 'react-dom/client';
  import {flushSync} from 'react-dom';
  import {createElement} from 'react';
  import OfflineGame from './src/offline-campaign/OfflineGame';
  import {createCampaign,startDuel,applyTurn} from './src/lib/offline-campaign/model';
  import {legalActions,step,botStep} from './src/lib/offline-trial/engine';
  globalThis.regionProbe={createRoot,flushSync,createElement,OfflineGame,createCampaign,startDuel,applyTurn,legalActions,step,botStep};
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'android/generated/region-probe.js',external:['/mesa/*'],jsx:'automatic',target:'chrome100',
  alias:{'next/image':path.resolve('apps/mobile/src/navigation.tsx'),'next/link':path.resolve('apps/mobile/src/navigation.tsx'),
    'next/navigation':path.resolve('apps/mobile/src/navigation.tsx'),'@/lib/supabase/client':path.resolve('apps/mobile/src/services.ts')},
  plugins:[{name:'presentation',setup(b){b.onResolve({filter:/^next\/(image|link)$/},a=>({path:a.path,namespace:'presentation'}));b.onLoad({filter:/.*/,namespace:'presentation'},a=>({contents:`export {${a.path==='next/image'?'Image':'Link'} as default} from ${JSON.stringify(path.resolve('apps/mobile/src/navigation.tsx'))}`,loader:'tsx',resolveDir:process.cwd()}))}}],
  define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),MOBILE_API_ORIGIN:'"http://localhost:3000"'}
})
const harness=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text
const styles=bundle.outputFiles.find(file=>file.path.endsWith('.css')).text
const c=await deviceCDP()
try {
  // Salir de Historia desmonta su controlador antes de la presentación aislada.
  await c.evaluate("location.hash='#/diagnostico-regiones'")
  await c.evaluate(`(()=>{const style=document.createElement('style');style.id='region-probe-css';style.textContent=${JSON.stringify(styles)};document.head.append(style)})()`)
  await c.evaluate(harness)
  const rows=await c.evaluate(`(async()=>{
    const owner=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id;
    const state=await Capacitor.Plugins.CampaignStore.read({owner}),saved=JSON.parse(state.body),f=regionProbe;
    const host=document.createElement('div');host.id='region-probe';document.body.append(host);document.getElementById('root').style.display='none';
    const root=f.createRoot(host),rows=[];
    try {
      const base=f.createCampaign({...saved.official,points:50000,progress:saved.official.catalog.rivals.map(r=>({rival_id:r.id,wins:1,rematch_points:0,beaten_at:'2026-10-13T00:00:00Z'}))},'diagnostico-sin-guardado');
      for(const province of base.official.catalog.provinces){
        const rival=base.official.catalog.rivals.find(r=>r.province_id===province.id);
        let campaign=f.startDuel(base,rival.id,19,crypto.randomUUID());
        // Llevar el turno al jugador con el motor real; no hay timers, red ni escrituras.
        for(let n=0;n<20;n++){
          const g=campaign.trial.game;
          if(g.envido_state.status==='declaring'?g.envido_state.declare_turn===owner:g.current_turn===owner)break;
          campaign=f.applyTurn(campaign,f.botStep(campaign.trial),'2026-10-13T00:00:00Z');
        }
        f.flushSync(()=>root.render(f.createElement(f.OfflineGame,{key:rival.id,campaign,busy:false,onAction:async()=>{},onLeave:()=>{},onReplay:async()=>{}})));
        await Promise.all(Array.from(host.querySelectorAll('img')).map(i=>i.decode().catch(()=>{})));
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const buttons=Array.from(host.querySelectorAll('[data-game-actions] button,[data-card-hand="me"] button'));
        rows.push({province:province.slug,rival:rival.slug,target:campaign.trial.game.target_score,controls:buttons.length,
          fits:buttons.every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),
          missingImages:Array.from(host.querySelectorAll('img')).filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),
          outside:buttons.filter(b=>{const r=b.getBoundingClientRect();return r.top<0||r.bottom>innerHeight}).map(b=>({label:b.textContent,top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom}))});
      }
    }finally{root.unmount();host.remove();document.getElementById('root').style.display=''}
    const after=await Capacitor.Plugins.CampaignStore.read({owner});return {scope:'WebView del APK 360×568, componentes/motor reales; progreso ficticio sólo en memoria, sin envío ni escritura',rows,unchanged:after.body===state.body};
  })()`)
  await writeFile(process.env.ANDROID_REGION_REPORT || 'android/generated/android-06-native-regions.json',JSON.stringify(rows,null,2))
  console.log(rows)
  assert.equal(rows.rows.length,15);assert.ok(rows.unchanged)
  for(const row of rows.rows){assert.ok(row.controls>0);assert.ok(row.fits,row.province);assert.deepEqual(row.missingImages,[])}
}finally{await c.evaluate("document.getElementById('region-probe-css')?.remove();location.hash='#/historia/offline'").catch(()=>{});c.close()}
