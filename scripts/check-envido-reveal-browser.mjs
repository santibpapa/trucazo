import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

// Componente real con respuestas controladas de los dos cierres; sin cuentas reales.
const root=process.cwd(), folder=await mkdtemp(path.join(tmpdir(),'trucazo-envido-'))
const a='ee250000-0000-4000-a000-000000000001',b='ee250000-0000-4000-a000-000000000002'
const five={suit:'basto',value:5,rank:13},seven={suit:'basto',value:7,rank:11},sota={suit:'basto',value:10,rank:10}
const hand=[{suit:'espada',value:4,rank:14},{suit:'copa',value:10,rank:10},{suit:'oro',value:12,rank:8}]
const base={id:'ee250000-0000-4000-a000-000000000010',player1_id:a,player2_id:b,player1_username:'Prueba A',player2_username:'Prueba B',player1_score:0,player2_score:2,played_cards:[],current_turn:a,mano_player:b,hand_number:1,round_number:1,envido_state:{status:'accepted',chain:['envido'],value:2,last_singer:b,winner_id:b,awarded:2,mano_declared:25,player1_points:4,player2_points:25},truco_state:{status:'truco',value:2,last_singer:b},round_results:[],status:'playing',winner_id:null,bet:0,target_score:30,time_limit:120,turn_started_at:new Date().toISOString(),mazo_count_p1:0,mazo_count_p2:0,envido_reveal:null,awaiting_deal:false,rematch_p1:false,rematch_p2:false,rematch_game_id:null,campaign_rival_id:null,updated_at:new Date().toISOString()}
const beforeFalta={...base,mano_player:a,player2_score:3,envido_state:{status:'declaring',chain:['real_envido','falta_envido'],value:27,last_singer:a,declare_turn:b,mano_declared:4},truco_state:{status:'none',value:1,last_singer:null}}
const fixtures=[
 {name:'truco',user:a,hand,before:base,after:{...base,player2_score:3,truco_state:{...base.truco_state,status:'rejected'},awaiting_deal:true,envido_reveal:{player_id:b,cards:[five,sota]}}},
 {name:'falta',user:a,hand,before:beforeFalta,after:{...beforeFalta,status:'finished',winner_id:b,player2_score:30,envido_state:{...beforeFalta.envido_state,status:'accepted',winner_id:b,awarded:27,player1_points:4,player2_points:32},envido_reveal:{player_id:b,cards:[seven,five]}}},
]
await build({
  stdin:{contents:`
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Game from './src/app/game/[id]/GameClient';
    const fixtures=${JSON.stringify(fixtures)};
    window.__fixture=fixtures.find(f=>f.name===new URLSearchParams(location.search).get('case'));
    window.__game=window.__fixture.before;
    createRoot(document.getElementById('root')).render(<Game game={window.__game} serverNow={Date.now()}
      currentUserId={window.__fixture.user} myHand={window.__fixture.hand}/>);
  `,resolveDir:root,loader:'tsx'},outfile:path.join(folder,'app.js'),bundle:true,jsx:'automatic',
  loader:{'.css':'local-css'},external:['/mesa/*'],define:{'process.env':'{}','process.env.NODE_ENV':'"production"'},
  plugins:[{name:'isolated-transport',setup(b){
    b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}))
    b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'const router={push(){},refresh(){}}; export const useRouter=()=>router; export const usePathname=()=>"/game/test";'}))
    b.onLoad({filter:/lib[\\/]supabase[\\/]client\.ts$/},()=>({contents:`
      const channels=new Set();
      const query=result=>{const q={then:(yes,no)=>Promise.resolve(result()).then(yes,no)};
        for(const k of ['select','eq','in','order','limit','single','maybeSingle','abortSignal'])q[k]=()=>q;
        return q;};
      window.__close=()=>{window.__game=window.__fixture.after;
        for(const c of channels)for(const [type,filter,callback]of c.handlers)
          if(type==='postgres_changes'&&filter.table==='games')callback({new:window.__game});};
      const client={
        from:table=>query(()=>({data:table==='games'?window.__game:table==='game_hands'?{cards:window.__fixture.hand}:[],error:null})),
        rpc:name=>query(()=>{if(name==='respond_truco'){window.__close();return {data:window.__game,error:null};}return {data:null,error:null};}),
        channel(){const c={handlers:[],on(type,filter,callback){this.handlers.push([type,filter,callback]);return this;},
          subscribe(callback){channels.add(this);queueMicrotask(()=>callback?.('SUBSCRIBED'));return this;},send(){return Promise.resolve('ok');}};return c;},
        removeChannel(c){channels.delete(c);return Promise.resolve('ok');},
      }; export const createClient=()=>client;
    `,loader:'js'}))
  }}],logLevel:'error',
})
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/app/globals.css','-o',path.join(folder,'global.css')],{cwd:root,stdio:'pipe'})
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.test')
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width"><div id="root"></div><link rel="stylesheet" href="/global.css"><link rel="stylesheet" href="/app.css"><script src="/app.js"></script>');return;}
  const file=['/app.js','/app.css','/global.css'].includes(url.pathname)?path.join(folder,url.pathname):path.join(root,'public',url.pathname==='/_next/image'?url.searchParams.get('url'):url.pathname)
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/webp');res.end(await readFile(file));}
  catch{res.statusCode=404;res.end();}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({channel:process.env.ENVIDO_BROWSER_CHANNEL||undefined,headless:true})
try{
  for(const name of ['truco','falta'])for(const [width,height]of [[360,640],[1440,900]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.clock.install()
    await page.goto(`http://127.0.0.1:${server.address().port}/?case=${name}`)
    await page.locator('[data-card-stage]').waitFor()
    assert.equal(await page.locator('img[alt="7B"],img[alt="5B"]').count(),0,'El tanto rival todavía es privado')
    if(name==='truco')await page.getByRole('button',{name:'No quiero',exact:true}).click()
    else await page.evaluate(()=>window.__close())
    const fixture=fixtures.find(f=>f.name===name)
    const announcement=page.getByText(name==='truco'?'25 en mesa':'32 en mesa',{exact:true})
    await announcement.waitFor()
    // Evaluar las posiciones finales, una vez completados los giros de entrada.
    await page.evaluate(()=>{for(const animation of document.getAnimations())if(animation.effect?.getTiming().iterations!==Infinity)animation.finish();})
    await page.clock.runFor(600)
    const panel=await announcement.locator('..').boundingBox()
    for(const card of fixture.after.envido_reveal.cards){
      const img=page.getByAltText(`${card.value===10?'S':card.value}B`,{exact:true})
      await img.waitFor({state:'visible'})
      const rect=await img.boundingBox()
      assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,'Las cartas se ven completas')
      assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,'La imagen de la carta está cargada')
      assert.ok(rect.x+rect.width<=panel.x||panel.x+panel.width<=rect.x||rect.y+rect.height<=panel.y||panel.y+panel.height<=rect.y,'El anuncio no tapa las cartas del tanto')
    }
    assert.equal(await page.getByRole('button',{name:/^(Truco|Ir al mazo|Quiero|No quiero)$/}).count(),0,'La mano cerrada no ofrece jugadas')
    assert.equal(await page.getByRole('button',{name:'Abandonar partida',exact:true}).isDisabled(),true)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,'La mesa entra sin scroll')
    if(process.env.ENVIDO_SCREENSHOTS&&width===360){
      await mkdir(process.env.ENVIDO_SCREENSHOTS,{recursive:true})
      await page.screenshot({path:path.join(process.env.ENVIDO_SCREENSHOTS,name+'.png'),animations:'disabled'})
    }
    if(name==='falta'){
      await page.getByText('32 en mesa',{exact:true}).waitFor()
      await page.clock.runFor(1500)
      assert.equal(await page.getByRole('heading',{name:'Perdiste',exact:true}).count(),0,'El resultado deja ver las cartas')
      // Realtime puede repetir el mismo estado: no debe reiniciar la espera.
      await page.evaluate(()=>window.__close())
      await page.clock.runFor(600)
      await page.getByRole('heading',{name:'Perdiste',exact:true}).waitFor()
    }
    assert.deepEqual(errors,[])
    console.log(`${name} ${width}×${height}: cartas del tanto visibles, privacidad y cierre correctos.`)
    await context.close()
  }
}finally{
  await browser.close()
  await new Promise(resolve=>server.close(resolve))
  if(path.dirname(path.resolve(folder))!==path.resolve(tmpdir())||!path.basename(folder).startsWith('trucazo-envido-'))throw new Error('Carpeta temporal inesperada')
  await rm(folder,{recursive:true,force:true})
}
