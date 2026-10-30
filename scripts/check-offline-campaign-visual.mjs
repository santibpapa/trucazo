import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build, transform } from 'esbuild'
import { chromium } from 'playwright'
import sharp from 'sharp'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import tailwindConfig from '../tailwind.config.ts'
import { EMPTY_STYLE, BOTS_VERSION } from '../src/lib/offline-trial/bots.ts'
import { createCampaign, startDuel, applyTurn, CAMPAIGN_VERSION } from '../src/lib/offline-campaign/model.ts'
import { step } from '../src/lib/offline-trial/engine.ts'
import { campaignView, campaignRanking } from '../src/offline-campaign/views.ts'

// Referencia real de la web anterior a compartir sus pantallas con la app.
const revision='2ecd674eaeee0f797a854db544c1a1e02c489f7d'
const root=resolve('android/generated/visual-historia');await mkdir(root,{recursive:true})
for(const [name,path] of [['HistoriaClient','src/app/historia/HistoriaClient.tsx'],['GameClient','src/app/game/[id]/GameClient.tsx']]){
  await writeFile(root+'/'+name+'.tsx',execFileSync('git',['show',revision+':'+path]))
}
const stub=`import React from 'react'; export const track=()=>{};export const trackFirstParty=()=>{};
export const useRouter=()=>({push:()=>{},refresh:()=>{}});
export function createClient(){const channel={on:()=>channel,subscribe:()=>channel,send:()=>{}};return{channel:()=>channel,removeChannel:()=>{},from:table=>{const query={select:()=>query,eq:()=>query,single:async()=>({data:table==='game_hands'?{cards:window.sample.c.trial?.hands[0]}:null,error:null})};return query},rpc:async(name)=>({data:name==='get_campaign_ranking'?window.sample.ranking:null,error:null})}}
export default function Link({children,...props}){return <a {...props}>{children}</a>}`
const referenceBundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import {createRoot} from 'react-dom/client';
import Historia from './android/generated/visual-historia/HistoriaClient';import Game from './android/generated/visual-historia/GameClient';
const s=window.sample,c=s.c,t=c.trial,p=c.presentation,r=t&&c.official.catalog.rivals.find(r=>r.id===t.rival);
createRoot(document.getElementById('root')).render(s.mode==='map'?<Historia {...s.view}/>:<Game game={{...t.game,bet:0,player1_username:p.username,player2_username:r.display_name,time_limit:0,turn_started_at:'',campaign_rival_id:r.id,campaign_reward:0,campaign_points_earned:0,rematch_p1:false,rematch_p2:false,rematch_game_id:null,mazo_count_p1:0,mazo_count_p2:0}} currentUserId={c.owner} myHand={t.hands[0]} campaignRivalSlug={r.slug} myAvatarUrl={p.avatar_url} myFrame={p.active_frame} myMedal={p.active_medal} myAccessory={p.active_accessory} salonSlug={p.active_salon}/>)`},
  bundle:true,write:false,outfile:root+'/reference.js',jsx:'automatic',minify:true,target:'chrome100',external:['/mesa/*'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"'},
  plugins:[{name:'reference-transport',setup(b){b.onResolve({filter:/^(next\/(navigation|link)|@\/lib\/supabase\/client|@vercel\/analytics|@\/lib\/analytics\/client)$/},args=>({path:args.path,namespace:'reference-stub'}));
    b.onLoad({filter:/.*/,namespace:'reference-stub'},()=>({contents:stub,loader:'tsx',resolveDir:process.cwd()}));
    b.onResolve({filter:/ObjectiveProgressDelta$/},()=>({path:'objectives',namespace:'reference-empty'}));b.onLoad({filter:/.*/,namespace:'reference-empty'},()=>({contents:'export default function Objectives(){return null}',loader:'js'}));}}]})
const reference=referenceBundle.outputFiles.find(f=>f.path.endsWith('.js')).contents
const referenceGlobals=(await postcss([tailwindcss(tailwindConfig.default??tailwindConfig)]).process(await readFile('src/app/globals.css','utf8'),{from:'src/app/globals.css'})).css
const referenceCss=(await transform(referenceGlobals+'\n'+referenceBundle.outputFiles.find(f=>f.path.endsWith('.css')).text,{loader:'css',minify:true})).code
const manifest=JSON.parse(await readFile('public/android/historia/manifest.json','utf8')),catalog=JSON.parse(await readFile('public/android/historia/catalog.json','utf8'))
const owner='00000000-0000-4000-a000-000000000001',photo='data:image/webp;base64,'+(await readFile('public/personajes/novato.webp')).toString('base64')
const snapshot={version:CAMPAIGN_VERSION,engine_version:BOTS_VERSION,userId:owner,exported_at:'2026-10-11T10:00:00Z',points:0,coins:1000,style:structuredClone(EMPTY_STYLE),progress:[],catalog,
  presentation:{username:'Santi',avatar_url:photo,active_salon:'clasico',active_frame:'oro',active_medal:'primera',active_accessory:'fernet'}}
const resources=new Map(await Promise.all([...manifest.assets.map(a=>a.path),'/sw.js','/offline.html','/android/historia/manifest.json'].map(async p=>[p,await readFile('public'+p)])))
const harness=(await build({stdin:{contents:"import * as storage from './src/lib/offline-campaign/storage';globalThis.fixture=storage;",resolveDir:process.cwd()},bundle:true,write:false})).outputFiles[0].text
let sample
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
  if(path==='/api/android/historia'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('identity')?{userId:owner}:snapshot));return}
  if(path==='/reference.js'){res.setHeader('Content-Type','text/javascript');res.end(reference);return}
  if(path==='/reference.css'){res.setHeader('Content-Type','text/css');res.end(referenceCss);return}
  if(path==='/reference'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reference.css"><style>@font-face{font-family:Geist;src:url('/android/historia/font.woff2') format('woff2');font-display:swap}body{--font-inter:Geist;font-family:Geist,system-ui,sans-serif}</style></head><body class="min-h-screen bg-base font-sans text-cream antialiased"><div id="root"></div><script>window.sample=${JSON.stringify(sample).replaceAll('<','\\u003c')}</script><script src="/reference.js"></script></body></html>`);return}
  res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.woff2')?'font/woff2':path.endsWith('.wav')?'audio/wav':'image/webp');res.end(resources.get(path)??'')})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true,executablePath:process.env.PWA_BROWSER_EXECUTABLE,args:['--disable-lcd-text']}),context=await browser.newContext({viewport:{width:360,height:640},reducedMotion:'reduce'})
await context.addInitScript(()=>{localStorage.setItem('trucazo:campania:tutorial:00000000-0000-4000-a000-000000000001','1');localStorage.setItem('trucazo:muted','1');Math.random=()=>0.99;
  const old=setTimeout;window.setTimeout=(fn,ms,...args)=>old(fn,ms===3600?1:ms>=1000&&ms<=6500?1000000:ms,...args)})
const local=await context.newPage(),web=await context.newPage(),errors=[]
for(const p of [local,web])p.on('pageerror',e=>errors.push(e.message))
let compared=0
async function load(c,mode){
  const view=campaignView(c);sample={c,mode,view,ranking:campaignRanking(c)}
  await local.goto(origin+'/android/historia/index.html');await local.addScriptTag({content:harness})
  await local.evaluate(async c=>{const db=await fixture.openCampaignStore();await new Promise((ok,no)=>{const tx=db.transaction(['meta','campaigns'],'readwrite');tx.objectStore('meta').put(c.owner,'active');tx.objectStore('campaigns').put(c,c.owner);tx.oncomplete=ok;tx.onabort=no});db.close()},c)
  await local.evaluate(view=>localStorage.setItem('trucazo:campania:seen:00000000-0000-4000-a000-000000000001',JSON.stringify({rivals_unlocked:view.provinces.flatMap(p=>p.rivals.filter(r=>r.unlocked).map(r=>r.id)),rivals_beaten:view.provinces.flatMap(p=>p.rivals.filter(r=>r.beaten).map(r=>r.id)),provinces_unlocked:view.provinces.filter(p=>p.unlocked).map(p=>p.slug)})),view)
  await local.reload();await local.locator('#campaign').waitFor();if(mode==='game')await local.locator('#resume').click()
  await web.goto(origin+'/reference');await web.locator('main').waitFor()
  // Comparar el mismo cuadro en reposo; los componentes comparten las animaciones.
  for(const p of [local,web])await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'})
}
async function compare(name,size){
  for(const p of [local,web]){await p.setViewportSize(size);await p.mouse.move(0,0);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
    await p.evaluate(()=>{for(const b of document.querySelectorAll('[data-game-actions]>button:last-child,main>div:last-child button')){if(b.textContent==='Guardar y salir'||b.textContent==='Sin internet · guardado'||b.textContent==='Continuar partida')b.style.visibility='hidden'}for(const b of document.querySelectorAll('button'))if(b.textContent.trim()==='Abandonar partida')b.style.visibility='hidden'})
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
  // El estado de descarga/guardado es específico de offline y queda fuera de
  // la comparación del diseño de mapa y mesa. Los controles de juego se comparan.
  const notice=local.locator('button').filter({hasText:'Sin internet · guardado'})
  if(await notice.count())await notice.evaluate(b=>b.parentElement.style.visibility='hidden')
  const visual=async p=>p.evaluate(()=>Array.from(document.querySelector('main').querySelectorAll('*')).flatMap(e=>{
    const r=e.getBoundingClientRect(),s=getComputedStyle(e)
    if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')return []
    return [{tag:e.tagName,rect:[r.x,r.y,r.width,r.height],text:Array.from(e.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim(),src:e.tagName==='IMG'?e.getAttribute('src'):null,
      style:['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','backgroundImage','borderRadius','borderWidth','borderColor','boxShadow','opacity','transform','padding','margin'].map(k=>s[k])}]
  }))
  assert.deepEqual(await visual(local),await visual(web),name+' '+size.width+'x'+size.height+': geometría, textos, imágenes y estilos')
  await local.bringToFront();const a=await local.screenshot({animations:'disabled'})
  await web.bringToFront();const b=await web.screenshot({animations:'disabled'})
  await writeFile(root+'/'+name+'-'+size.width+'x'+size.height+'-app.png',a);await writeFile(root+'/'+name+'-'+size.width+'x'+size.height+'-web.png',b)
  const rawA=await sharp(a).raw().toBuffer(),rawB=await sharp(b).raw().toBuffer()
  let delta=0;for(let i=0;i<rawA.length;i++)delta+=Math.abs(rawA[i]-rawB[i])
  // La geometría y el CSS se exigen idénticos arriba. El compositor de Windows
  // puede suavizar distinto letras/bordes en dos árboles de capas equivalentes.
  // Admitir como máximo un nivel medio de color sobre 255 en la captura completa.
  const meanDelta=delta/rawA.length
  assert.ok(meanDelta<=1,name+' '+size.width+'x'+size.height+': diferencia media de color '+meanDelta);compared++
}
try{
  await local.goto(origin+'/android/historia/index.html');await local.locator('#prepare').click();await local.locator('#campaign').waitFor()
  const sizes=[{width:360,height:640},{width:393,height:852},{width:320,height:568},{width:640,height:360}]
  await load(createCampaign(snapshot,manifest.digest),'map')
  for(const size of sizes)await compare('mapa',size)
  await Promise.all([local,web].map(p=>p.getByRole('button',{name:'Entrar a Buenos Aires',exact:true}).click()))
  for(const size of sizes)await compare('provincia',size)
  await Promise.all([local,web].map(p=>p.getByRole('button',{name:'Ver a '+catalog.rivals[0].display_name,exact:true}).click()))
  for(const size of sizes)await compare('rival',size)
  for(const salon of ['clasico','cafetin','quincho','neon','rooftop','presidencial']){
    const c=startDuel(createCampaign(snapshot,manifest.digest),catalog.rivals[0].id,77,crypto.randomUUID());c.trial.game.mano_player=owner;c.trial.game.current_turn=owner;c.presentation.active_salon=salon
    await load(c,'game');for(const size of sizes)await compare('mesa-'+salon,size)
  }
  const c=startDuel(createCampaign(snapshot,manifest.digest),catalog.rivals[0].id,77,crypto.randomUUID());c.trial.game.mano_player=owner;c.trial.game.current_turn=owner
  const envStart=structuredClone(c);envStart.trial.game.mano_player=envStart.trial.game.player2_id;envStart.trial.game.current_turn=envStart.trial.game.player2_id
  const envido=applyTurn(envStart,step(envStart.trial,{player:envStart.trial.game.player2_id,type:'sing_envido',value:'envido'}),snapshot.exported_at)
  const truco=applyTurn(c,step(c.trial,{player:owner,type:'sing_truco',value:'truco'}),snapshot.exported_at)
  const accepted=applyTurn(truco,step(truco.trial,{player:truco.trial.game.player2_id,type:'respond_truco',accept:true}),snapshot.exported_at)
  for(const [name,state] of [['envido',envido],['truco',truco],['truco-aceptado',accepted]]){await load(state,'game');for(const size of sizes)await compare(name,size)}
  assert.deepEqual(errors,[]);console.log('Diseño: '+compared+' comparaciones de geometría, estilos y capturas contra la web original aprobadas. Capturas en '+root)
}finally{await browser.close();await new Promise(r=>server.close(r))}
