import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

// Componentes reales y transporte controlado; no usa cuentas ni partidas reales.
const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(path.join(root, 'package.json'))
const { build } = require('esbuild')
const { chromium } = require('playwright')
const folder = await mkdtemp(path.join(tmpdir(), 'trucazo-chat-'))
const transport = `
const channels = new Set();
const query = result => {
  const q = { then: (yes, no) => Promise.resolve(result()).then(yes, no) };
  for (const method of ['select','eq','in','order','limit','single','maybeSingle','abortSignal']) q[method] = () => q;
  return q;
};
window.__deliver = message => {
  window.__lastMessage = message;
  for (const channel of channels) for (const [type, filter, callback] of channel.handlers)
    if (type === 'postgres_changes' && filter.table === 'match_chat_messages') callback({new: message});
};
window.__quick = () => {
  window.__team = {...window.__team, game: {...window.__team.game, chat: [{seat: 3, text: '¡Quiero!', at: new Date().toISOString(), hand: 1}]}};
  for (const channel of channels) for (const [type, filter, callback] of channel.handlers) {
    if (type === 'broadcast' && filter.event === 'emote') callback({payload: {text: '¡Quiero!'}});
    if (type === 'postgres_changes' && filter.table === 'team_tables') callback({});
  }
};
const client = {
  from: table => query(() => ({data: table === 'match_chat_messages' ? window.__history : table === 'games' ? window.__game : table === 'game_hands' ? {cards: window.__hand} : [], error: null})),
  rpc: (name, args) => query(() => {
    if (name === 'community_safety_state') return {data: {accepted:true, restricted_until:null}, error:null};
    if (name === 'send_match_chat_message') {
      if (window.__reject) return {data: null, error: {message: 'Esperá 3 segundos antes de enviar otro mensaje'}};
      const message = {id: args.p_request_id, sender_id: window.__user, sender_name: 'Prueba', body: args.p_body, created_at: new Date().toISOString(), client_request_id: args.p_request_id};
      if (window.__realtimeFirst) window.__deliver(message); else window.__lastMessage = message;
      return {data: message, error: null};
    }
    return {data: name === 'team_snapshot' ? {...window.__team, server_now: new Date().toISOString()} : null, error: null};
  }),
  channel(name) {
    const channel = {handlers: [], on(type, filter, callback) {this.handlers.push([type, filter, callback]); return this},
      subscribe(callback) {channels.add(this); queueMicrotask(() => {callback?.('SUBSCRIBED'); for (const [type,, handler] of this.handlers) if (type === 'system') handler({extension:'postgres_changes', status:'ok'})}); return this}, send() {return Promise.resolve('ok')}};
    return channel;
  },
  removeChannel(channel) {channels.delete(channel); return Promise.resolve('ok')},
};
export const createClient = () => client;
`
const entry = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import Game from './src/app/game/[id]/GameClient';
import Team from './src/app/game/parejas/[id]/TeamGameClient';
import {createDeck} from './src/lib/truco';
const ids = [1,2,3,4].map(n => '00000000-0000-4000-8000-00000000000'+n);
const view = new URLSearchParams(location.search).get('view');
const now = new Date().toISOString();
window.__user = view === 'team' ? ids[2] : ids[0];
window.__hand = createDeck().slice(0,3);
window.__history = [{id:'history',sender_id:ids[1],sender_name:'Rival',body:'Mensaje anterior',created_at:now,client_request_id:'history'}];
window.__game = {id:'game',player1_id:ids[0],player2_id:ids[1],player1_username:'Prueba',player2_username:'Rival',player1_score:0,player2_score:0,played_cards:[],current_turn:ids[0],mano_player:ids[0],hand_number:1,round_number:1,envido_state:{status:'none',chain:[],value:0,last_singer:null},truco_state:{status:'none',value:1,last_singer:null},round_results:[],status:'playing',winner_id:null,bet:10,target_score:30,time_limit:120,turn_started_at:now,mazo_count_p1:0,mazo_count_p2:0,envido_reveal:null,awaiting_deal:false,rematch_p1:false,rematch_p2:false,rematch_game_id:null,campaign_rival_id:view === 'campaign' ? 'rival' : null,updated_at:now};
window.__team = {table:{id:'team',creator_id:ids[0],name:'Prueba',bet:10,target_score:30,time_limit:120,is_private:false,private_code:null,status:'playing',version:1},members:ids.map((id,seat)=>({id,user_id:id,seat,username:'Jugador '+seat,avatar_url:null,is_bot:false,timeouts:0})),game:{id:'team-game',hand_number:1,mano:2,turn:2,round:1,scores:[0,0],played:[],rounds:[],envido:{status:'none'},truco:{status:'none',value:1},awaiting_deal:false,winner_team:null,finish_reason:null,last_hand_winner:null,action_started_at:now,announcement:null,reveal:null,chat:[]},my_seat:2,hand:window.__hand,legal:['envido','real_envido','falta_envido','truco','mazo'],actor:2,actor_is_bot:false,server_now:now,coins:1000};
window.__message = (seat, body) => ({id:crypto.randomUUID(),sender_id:ids[seat],sender_name:'Jugador '+seat,body,created_at:now,client_request_id:crypto.randomUUID()});
createRoot(document.getElementById('root')).render(view === 'team' ? <Team initial={window.__team} userId={ids[2]} isGuest={false} salonSlug='clasico'/> : <Game game={window.__game} serverNow={Date.now()} currentUserId={ids[0]} myHand={window.__hand}/>);
`
await build({
  stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, outfile: path.join(folder, 'app.js'),
  bundle: true, jsx: 'automatic', loader: { '.css': 'local-css' }, external: ['/mesa/*'],
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT': '"true"' },
  plugins: [{ name: 'controlled-transport', setup(b) {
    b.onResolve({filter: /^next\/navigation$/}, () => ({path:'navigation', namespace:'fixture'}))
    b.onLoad({filter: /.*/, namespace:'fixture'}, () => ({contents:'const router={push(){},refresh(){}}; export const useRouter=()=>router; export const usePathname=()=>"/game/test";'}))
    b.onLoad({filter: /lib[\\/]supabase[\\/]client\.ts$/}, () => ({contents:transport, loader:'js'}))
  }}], logLevel: 'error',
})
execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', 'src/app/globals.css', '-o', path.join(folder, 'global.css')], {cwd:root, stdio:'pipe'})
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.test')
  if (url.pathname === '/') { res.setHeader('Content-Type','text/html'); res.end('<meta name="viewport" content="width=device-width"><div id="root"></div><link rel="stylesheet" href="/global.css"><link rel="stylesheet" href="/app.css"><script src="/app.js"></script>'); return }
  const file = ['/app.js','/app.css','/global.css'].includes(url.pathname) ? path.join(folder,url.pathname) : path.join(root,'public',url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname)
  try { res.setHeader('Content-Type',file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'image/webp'); res.end(await readFile(file)) }
  catch {res.statusCode=404;res.end()}
})
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
const browser = await chromium.launch({channel:process.env.MATCH_CHAT_BROWSER_CHANNEL || undefined, headless:true})
const origin = 'http://127.0.0.1:'+server.address().port
try {
  for (const view of ['game','team']) for (const [width,height] of [[320,640],[360,640],[390,844],[1440,900]]) {
    const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'})
    const page = await context.newPage()
    const errors = []
    page.on('pageerror',error => errors.push(error.message))
    await page.clock.install()
    await page.goto(origin+'/?view='+view)
    await page.getByRole('button',{name:'Chat de la mesa',exact:true}).waitFor()
    const bubble = text => page.getByRole('status').filter({hasText:text})
    assert.equal(await bubble('Mensaje anterior').count(),0, 'El historial no debe hablar al entrar')
    await page.evaluate(view => window.__deliver(window.__message(view === 'team' ? 3 : 1,'Hola desde la mesa')), view)
    await bubble('Hola desde la mesa').waitFor()
    await page.clock.runFor(4000)
    await page.evaluate(() => window.__deliver(window.__lastMessage))
    await page.clock.runFor(2100)
    assert.equal(await bubble('Hola desde la mesa').count(),0,'Un duplicado no renueva el globo')
    await page.getByRole('button',{name:/Chat,/}).click()
    await page.getByLabel('Escribir mensaje').fill('Mi mensaje')
    await page.getByRole('button',{name:'Enviar',exact:true}).click()
    await page.getByRole('button',{name:'Cerrar chat'}).click()
    await bubble('Mi mensaje').waitFor()
    await page.evaluate(() => window.__deliver(window.__lastMessage))
    assert.equal(await bubble('Mi mensaje').count(),1,'Confirmación y Realtime no duplican')
    await page.getByRole('button',{name:'Chat de la mesa',exact:true}).click()
    await page.evaluate(() => window.__realtimeFirst=true)
    await page.getByLabel('Escribir mensaje').fill('Primero Realtime')
    await page.getByRole('button',{name:'Enviar',exact:true}).click()
    await page.getByRole('button',{name:'Cerrar chat'}).click()
    await bubble('Primero Realtime').waitFor()
    assert.equal(await bubble('Mi mensaje').count(),0,'Sólo el último del autor')
    await page.getByRole('button',{name:'Chat de la mesa',exact:true}).click()
    await page.getByLabel('Silenciar chat').check()
    await page.getByRole('button',{name:'Cerrar chat'}).click()
    assert.equal(await bubble('Primero Realtime').count(),0,'Silenciar retira globos visibles')
    await page.evaluate(() => window.__deliver(window.__message(1,'Texto silenciado')))
    assert.equal(await bubble('Texto silenciado').count(),0)
    await page.getByRole('button',{name:'Chat de la mesa',exact:true}).click()
    await page.getByLabel('Silenciar chat').uncheck()
    assert.equal(await page.getByRole('log').getByText('Texto silenciado',{exact:true}).count(),1,'El historial conserva mensajes silenciados')
    await page.evaluate(() => window.__reject=true)
    await page.getByLabel('Escribir mensaje').fill('Rechazado')
    await page.getByRole('button',{name:'Enviar',exact:true}).click()
    await page.getByRole('alert').waitFor()
    await page.getByRole('button',{name:'Cerrar chat'}).click()
    assert.equal(await bubble('Rechazado').count(),0,'No mostrar envíos rechazados')
    await page.evaluate(view => window.__deliver(window.__message(view === 'team' ? 3 : 1,'Mensaje antes del canto')),view)
    await bubble('Mensaje antes del canto').waitFor()
    await page.evaluate(() => window.__quick())
    await page.getByText('¡Quiero!',{exact:false}).waitFor()
    await bubble('Mensaje antes del canto').waitFor({state:'detached'})
    await page.clock.runFor(6100)
    const texts = view === 'team' ? [0,1,2,3].map(seat => String(seat).repeat(200)) : ['S'.repeat(200),'Mensaje propio']
    await page.evaluate(({view,texts}) => texts.forEach((text,index) => window.__deliver(window.__message(view === 'team' ? index : 1-index,text))),{view,texts})
    const rectangles = []
    for (const text of texts) {
      const item = bubble(text)
      await item.waitFor()
      const rect = await item.boundingBox()
      rectangles.push(rect)
      assert.ok(rect.x>=0 && rect.y>=0 && rect.x+rect.width<=width+1 && rect.y+rect.height<=height+1,'Globo dentro de la pantalla')
      assert.ok(rect.height<=94,'El mensaje largo no cubre la mesa')
    }
    for (const [index, a] of rectangles.entries()) for (const b of rectangles.slice(index+1))
      assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y,'Los globos no se pisan')
    if (view==='team') {
      assert.ok(rectangles[0].y<rectangles[1].y && rectangles[2].y>rectangles[1].y,'Compañero arriba y autor propio abajo')
      assert.ok(rectangles[1].x<rectangles[3].x,'Rivales en sus costados según el asiento propio')
    } else assert.ok(rectangles[0].y<rectangles[1].y,'Rival arriba y autor propio abajo')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth || document.documentElement.scrollHeight>innerHeight),false,'Partida sin scroll')
    if (process.env.MATCH_CHAT_SCREENSHOTS && width===360) {
      await page.evaluate(view => {
        const texts = view==='team' ? ['¡Buenas! ¿Cómo andan?', '¡Buen partido, che!', '¡Vamos equipo!', 'Todo bien, ¿vos?'] : ['¡Buenas! ¿Cómo andan?', '¡Buen partido, che!']
        texts.forEach((text,index) => window.__deliver(window.__message(view==='team' ? index : 1-index,text)))
      },view)
      await bubble('¡Buenas! ¿Cómo andan?').waitFor()
      await mkdir(process.env.MATCH_CHAT_SCREENSHOTS,{recursive:true})
      await page.screenshot({path:path.join(process.env.MATCH_CHAT_SCREENSHOTS,view+'.png')})
    }
    assert.deepEqual(errors,[])
    console.log(view+' '+width+'×'+height+': recepción, envío, duplicados, silencio, cantos y tamaño correctos')
    await context.close()
  }
  const page = await browser.newPage()
  await page.goto(origin+'/?view=campaign')
  await page.getByRole('button',{name:'Chat rápido',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Chat de la mesa',exact:true}).count(),0)
  console.log('Historia conserva únicamente frases rápidas.')
} finally {
  await browser.close()
  await new Promise(resolve=>server.close(resolve))
  if (path.dirname(path.resolve(folder))!==path.resolve(tmpdir()) || !path.basename(folder).startsWith('trucazo-chat-')) throw new Error('Carpeta temporal inesperada')
  await rm(folder,{recursive:true,force:true})
}
