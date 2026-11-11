import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

// Cuenta los pedidos de la mesa 1v1 con un Supabase simulado y un reloj
// controlado: cada pedido de la mesa es un registro que cobra Supabase.
// La mano sólo se relee al repartir; el respaldo se espacia con Realtime
// conectado, vuelve a 2,5 s sin él y se detiene con la pantalla oculta.
const root = process.cwd(), folder = await mkdtemp(path.join(tmpdir(), 'trucazo-polling-'))
const fixtureFile = path.join(folder, 'responses.json')
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-envido-reveal.ts'], {
  cwd: root, env: { ...process.env, ENVIDO_REVEAL_FIXTURES: fixtureFile }, stdio: 'pipe',
})
const fixture = JSON.parse(await readFile(fixtureFile, 'utf8')).find(f => f.name === 'falta')
await build({
  stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Game from './src/app/game/[id]/GameClient';
    const fixture=${JSON.stringify(fixture)};
    window.__user=fixture.user; window.__game=fixture.before; window.__hand=fixture.hand;
    createRoot(document.getElementById('root')).render(<Game game={window.__game} serverNow={Date.now()}
      currentUserId={fixture.user} myHand={fixture.hand}/>);
  `, resolveDir: root, loader: 'tsx' }, outfile: path.join(folder, 'app.js'), bundle: true, jsx: 'automatic',
  loader: { '.css': 'local-css' }, external: ['/mesa/*'], define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'isolated-transport', setup(b) {
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }))
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'const router={push(){},refresh(){}}; export const useRouter=()=>router; export const usePathname=()=>"/game/test";' }))
    b.onLoad({ filter: /lib[\\/]supabase[\\/]client\.ts$/ }, () => ({ contents: `
      window.__counts={games:0,game_hands:0}; const channels=new Set();
      const query=(table,result)=>{const q={then:(yes,no)=>{if(table in window.__counts)window.__counts[table]++;return Promise.resolve(result()).then(yes,no)}};
        for(const k of ['select','eq','in','order','limit','single','maybeSingle','abortSignal'])q[k]=()=>q;
        return q;};
      // Igual que el servidor: un aviso privado con sólo lo que cambió.
      window.__emit=next=>{const prev=window.__game,d={};window.__game=next;
        for(const k of Object.keys(next))if(JSON.stringify(next[k])!==JSON.stringify(prev[k]))d[k]=next[k];
        for(const c of channels)for(const [type,filter,callback]of c.handlers)
          if(c.private&&type==='broadcast'&&filter.event==='partida')callback({payload:{from:prev.updated_at,d}});};
      window.__raw=payload=>{for(const c of channels)for(const [type,filter,callback]of c.handlers)
          if(c.private&&type==='broadcast'&&filter.event==='partida')callback({payload});};
      window.__status=status=>{for(const c of channels)c.status?.(status)};
      const client={
        from:table=>query(table,()=>({data:table==='games'?window.__game:table==='game_hands'?{cards:window.__hand}:[],error:null})),
        rpc:()=>query('rpc',()=>({data:null,error:null})),
        auth:{getSession:async()=>({data:{session:{user:{id:window.__user}}}})},
        channel(topic,options){const c={private:topic.startsWith('game:')&&options?.config?.private===true,handlers:[],on(type,filter,callback){this.handlers.push([type,filter,callback]);return this;},
          subscribe(callback){this.status=callback;channels.add(this);queueMicrotask(()=>callback?.('SUBSCRIBED'));return this;},send(){return Promise.resolve('ok');}};return c;},
        removeChannel(c){channels.delete(c);return Promise.resolve('ok');},
      }; export const createClient=()=>client;
    `, loader: 'js' }))
  } }], logLevel: 'error',
})
execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-i', 'src/app/globals.css', '-o', path.join(folder, 'global.css')], { cwd: root, stdio: 'pipe' })
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.test')
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<meta name="viewport" content="width=device-width"><div id="root"></div><link rel="stylesheet" href="/global.css"><link rel="stylesheet" href="/app.css"><script src="/app.js"></script>'); return }
  const file = ['/app.js', '/app.css', '/global.css'].includes(url.pathname) ? path.join(folder, url.pathname) : path.join(root, 'public', url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname)
  try { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'image/webp'); res.end(await readFile(file)) }
  catch { res.statusCode = 404; res.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
const baseline = process.argv.includes('--baseline')
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install()
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.locator('[data-card-stage]').waitFor()
  const counts = () => page.evaluate(() => ({ ...window.__counts }))
  const delta = async (fn) => { const a = await counts(); await fn(); const b = await counts(); return { games: b.games - a.games, game_hands: b.game_hands - a.game_hands } }
  let stamp = Date.parse(fixture.before.updated_at)
  const next = (patch) => page.evaluate(([game, patch]) => window.__emit({ ...game, ...patch }), [fixture.before, { ...patch, updated_at: new Date(stamp += 1000).toISOString() }])

  await page.clock.runFor(1000)
  const report = {}
  report.connected30s = await delta(() => page.clock.runFor(30_000))
  report.rivalMove = await delta(async () => { await next({ truco_state: { ...fixture.before.truco_state } }); await page.clock.runFor(100) })
  const myCard = fixture.hand.find(card => !fixture.before.played_cards.some(pc => pc.player_id === fixture.user && pc.card.suit === card.suit && pc.card.value === card.value))
  report.ownCard = await delta(async () => {
    await next({ played_cards: [...fixture.before.played_cards, { player_id: fixture.user, card: myCard, round: fixture.before.round_number }] })
    await page.clock.runFor(100)
  })
  const newHand = [{ value: 1, suit: 'basto' }, { value: 2, suit: 'basto' }, { value: 3, suit: 'basto' }]
  report.newDeal = await delta(async () => {
    await page.evaluate(hand => { window.__hand = hand }, newHand)
    await next({ hand_number: fixture.before.hand_number + 1, played_cards: [], round_number: 1 })
    await page.clock.runFor(100)
  })
  // Un aviso que ya teníamos se ignora; uno al que le falta algo del medio relee la partida.
  report.staleNotice = await delta(async () => {
    await page.evaluate(([from, at]) => window.__raw({ from, d: { updated_at: at, player1_score: 99 } }), [fixture.before.updated_at, fixture.before.updated_at])
    await page.clock.runFor(100)
  })
  report.gapNotice = await delta(async () => {
    await page.evaluate(at => window.__raw({ from: '2000-01-01T00:00:00+00:00', d: { updated_at: at } }), new Date(stamp + 60_000).toISOString())
    await page.clock.runFor(100)
  })
  report.disconnected10s = await delta(async () => { await page.evaluate(() => window.__status('CHANNEL_ERROR')); await page.clock.runFor(10_000) })
  report.hidden20s = await delta(async () => {
    await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }))
    await page.clock.runFor(20_000)
  })
  console.log(JSON.stringify(report, null, 2))
  if (!baseline) {
    assert.ok(report.connected30s.games >= 1 && report.connected30s.games <= 3, 'Con Realtime conectado el respaldo pregunta cada ~15 s')
    assert.equal(report.connected30s.game_hands, 0, 'Sin cambios de mano no se relee la mano')
    assert.equal(report.rivalMove.game_hands, 0, 'Una jugada del rival no cambia mis cartas')
    assert.equal(report.rivalMove.games, 0, 'El aviso con sólo lo que cambió alcanza: no relee la partida')
    assert.equal(report.ownCard.game_hands, 0, 'Jugar una carta propia no relee la mano')
    assert.equal(report.newDeal.game_hands, 1, 'Un reparto nuevo relee la mano una vez')
    assert.deepEqual(report.staleNotice, { games: 0, game_hands: 0 }, 'Un aviso viejo no relee nada')
    assert.equal(await page.getByText('99', { exact: true }).count(), 0, 'Un aviso viejo no pisa el marcador')
    assert.equal(report.gapNotice.games, 1, 'Un aviso que no encaja relee la partida una vez')
    assert.ok(report.disconnected10s.games >= 3, 'Sin Realtime el respaldo vuelve a 2,5 s')
    assert.deepEqual(report.hidden20s, { games: 0, game_hands: 0 }, 'Con la pantalla oculta no se pregunta nada')
    for (const card of ['1B', '2B', '3B']) assert.ok(await page.getByAltText(card, { exact: true }).count() >= 1, `La mano nueva muestra ${card}`)
  }
  assert.deepEqual(errors, [])
  console.log(baseline ? 'Mesa 1v1: contadores de referencia.' : 'Mesa 1v1: mano y respaldo por polling sólo cuando hace falta.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
  if (path.dirname(path.resolve(folder)) !== path.resolve(tmpdir()) || !path.basename(folder).startsWith('trucazo-polling-')) throw new Error('Carpeta temporal inesperada')
  await rm(folder, { recursive: true, force: true })
}
