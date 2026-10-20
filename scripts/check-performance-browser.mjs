import { createRequire } from 'node:module'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
// Comparación de componentes reales con HTTP simulado. No mide LCP ni SSR.
// --baseline informa los contadores sin exigir las optimizaciones.
const root = fileURLToPath(new URL('..', import.meta.url)).replaceAll('\\', '/')
const require = createRequire(root + '/package.json')
const { build } = require('esbuild')
const { chromium } = require('playwright')
const baseline = process.argv.includes('--baseline')
const folder = await mkdtemp(path.join(tmpdir(), 'trucazo-performance-'))
const router = `const router = {push: url => window.__navigation = url, refresh() {}}; export const useRouter = () => router; export const usePathname = () => '/lobby';`
const link = `import React from 'react'; export default React.forwardRef(function Link({href,children,prefetch,replace,scroll,...props},ref){return <a href={href} ref={ref} {...props}>{children}</a>})`
await build({
  stdin: { contents: `import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
import Lobby from './src/app/lobby/LobbyClient'; import Game from './src/app/game/[id]/GameClient';
import {SalonBackground, SalonTable} from './src/components/game/SalonScene';
import {createDeck} from './src/lib/truco';
const uid='00000000-0000-4000-8000-000000000001';
const now=new Date().toISOString();
const game={id:'00000000-0000-4000-8000-000000000003',player1_id:uid,player2_id:'00000000-0000-4000-8000-000000000002',player1_username:'Prueba',player2_username:'Rival',player1_score:0,player2_score:0,played_cards:[],current_turn:uid,mano_player:uid,hand_number:1,round_number:1,envido_state:{status:'none',chain:[],value:0,last_singer:null},truco_state:{status:'none',value:1,last_singer:null},round_results:[],status:'playing',winner_id:null,bet:10,target_score:30,time_limit:30,turn_started_at:now,mazo_count_p1:0,mazo_count_p2:0,envido_reveal:null,awaiting_deal:false,rematch_p1:false,rematch_p2:false,rematch_game_id:null,campaign_rival_id:null,updated_at:now};
window.__fixtureGame=game;
window.__fixtureHand=createDeck().slice(0,3);
function Scene(){const[n,setN]=useState(0);const[slug,setSlug]=useState('clasico');window.__tick=()=>setN(x=>x+1);window.__change=()=>setSlug('quincho');return <div data-tick={n}><SalonBackground slug={slug}/><SalonTable slug={slug}/></div>}
const view=new URLSearchParams(location.search).get('view');
if(view==='finished') Object.assign(game,{status:'finished',winner_id:uid,player1_score:30});
createRoot(document.getElementById('root')).render(view==='scene'?<Scene/>:view==='game'||view==='finished'?<Game game={game} serverNow={Date.now()} currentUserId={uid} myHand={window.__fixtureHand}/>:<Lobby profile={{id:uid,username:'Prueba',coins:1000,games_played:0,games_won:0,games_lost:0,created_at:now}} initialTables={[]} activeGameId={null} myMedal='ninguno' isGuest={true} initialObjectives={null} initialReadyMatch={false}/>);`,
    resolveDir: root, loader: 'tsx' },
  outfile: folder + '/app.js', bundle: true, jsx: 'automatic',
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '"https://ejemplo.supabase.co"', 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '"test-key"' },
  loader: { '.css': 'local-css' }, external: ['/mesa/*'],
  plugins: [{ name: 'fixture-navigation-and-counter', setup(b) {
    b.onResolve({filter:/^next\/(navigation|link)$/}, a=>({path:a.path,namespace:'fixture'}))
    b.onLoad({filter:/.*/,namespace:'fixture'}, a=>({contents:a.path.endsWith('navigation')?router:link,loader:'tsx',resolveDir:root}))
    b.onLoad({filter:/SalonScene\.tsx$/},async a=>({contents:(await readFile(a.path,'utf8')).replaceAll('const theme = getSalonTheme(slug)','window.__sceneRenders++; const theme = getSalonTheme(slug)'),loader:'tsx',resolveDir:path.dirname(a.path)}))
  }}], logLevel: 'error',
})
const server = createServer(async (req,res) => {
  const u = new URL(req.url,'http://fixture.test')
  let file = u.pathname === '/app.js' ? folder+'/app.js' : u.pathname === '/app.css' ? folder+'/app.css' : root+'/public'+u.pathname
  if(u.pathname==='/') { res.setHeader('Content-Type','text/html'); res.end('<div id="root"></div><link rel="stylesheet" href="/app.css"><script>window.__sceneRenders=0</script><script src="/app.js"></script>'); return }
  if(u.pathname==='/_next/image') file=root+'/public'+u.searchParams.get('url')
  try {const data=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/webp');res.end(data)}catch {res.statusCode=404;res.end()}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({channel:process.env.PERF_BROWSER_CHANNEL || undefined,headless:true})
const results={}
try {
  for(const [name,width,view] of [['mobile',390,'lobby'],['desktop',1440,'lobby'],['scene',390,'scene'],['game',390,'game'],['finished',390,'finished']]) {
    const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'})
    const page=await context.newPage()
    const errors=[];const requests=[]
    page.on('pageerror',e=>errors.push(e.message))
    page.on('request',r=>requests.push(r.url()))
    await context.route('https://ejemplo.supabase.co/**',async route=>{
      const url=new URL(route.request().url());const operation=url.pathname.split('/').at(-1)
      let body=url.pathname.includes('/rpc/')?null:[]
      if(operation==='ensure_lobby_tables') body=0
      if(operation==='get_community') body={friends:[],incoming:[],outgoing:[],invites_in:[],invite_out:null,group:null,group_invites_in:[]}
      if(operation==='games') body=await page.evaluate(()=>window.__fixtureGame)
      if(operation==='game_hands') body={cards:await page.evaluate(()=>window.__fixtureHand)}
      await route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
    })
    await page.goto(origin+'/?view='+view)
    await page.waitForFunction(()=>window.__tick || window.__fixtureHand, null, {timeout:5000}).catch(e=>{throw new Error(name+': '+errors.join('; ')+': '+e.message)})
    if(view==='scene') {
      await page.waitForFunction(()=>typeof window.__tick==='function')
      for(let i=0;i<12;i++) {await page.evaluate(()=>window.__tick());await page.waitForFunction(n=>document.querySelector('[data-tick]').dataset.tick===String(n),i+1)}
      results.sceneUnchangedRenders=await page.evaluate(()=>window.__sceneRenders)
      await page.evaluate(()=>window.__change());await page.waitForTimeout(100)
      results.sceneChangedRenders=await page.evaluate(()=>window.__sceneRenders)
    } else if(view==='lobby') {
      await page.waitForTimeout(6200)
      results[name]={tableReads:requests.filter(u=>u.includes('/rest/v1/tables?')).length,chatReads:requests.filter(u=>u.includes('/rest/v1/chat_messages?')).length}
      if(name==='mobile') {await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(500);results.afterResizeChatReads=requests.filter(u=>u.includes('/rest/v1/chat_messages?')).length}
    } else if(view==='game') {
      await page.waitForTimeout(200)
      results.gameEarlyCardRequests=requests.filter(u=>u.includes('/cartas/')).length
      await page.waitForTimeout(2400)
      results.gameFinalCardRequests=requests.filter(u=>u.includes('/cartas/')).length
    } else {
      await page.getByText('¡Ganaste!',{exact:true}).waitFor()
      results.finishedScreenLoaded=true
    }
    if(errors.length) throw new Error(name+': '+errors.join('; '))
    await context.close()
  }
  console.log(JSON.stringify(results,null,2))
  await writeFile(folder+'/'+(baseline?'before':'after')+'.json',JSON.stringify(results,null,2))
  if(!baseline) {
    const assert=require('node:assert/strict')
    assert.equal(results.mobile.chatReads,0)
    assert.equal(results.desktop.chatReads,1)
    assert.equal(results.afterResizeChatReads,1)
    assert.ok(results.mobile.tableReads<=3)
    assert.equal(results.sceneUnchangedRenders,2)
    assert.equal(results.sceneChangedRenders,4)
    assert.ok(results.gameEarlyCardRequests<40)
    assert.equal(results.gameFinalCardRequests,40)
  }
} finally {
  await browser.close()
  await new Promise(r=>server.close(r))
  if(path.dirname(path.resolve(folder))!==path.resolve(tmpdir()) || !path.basename(folder).startsWith('trucazo-performance-')) throw new Error('Carpeta temporal inesperada')
  await rm(folder,{recursive:true,force:true})
}
