import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

// Ejecutar el efecto real con el SDK real: rpc() es un thenable perezoso.
// Un mock que devuelve Promise.resolve ocultaría la ausencia de await.
function presenceEffect(path: string, rpc: string) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const effects: ts.ArrowFunction[] = []
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
      const effect = node.arguments[0]
      if (ts.isArrowFunction(effect) && effect.body.getText(source).includes(`rpc('${rpc}'`)) effects.push(effect)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(effects.length, 1, `Un único efecto de ${rpc}`)
  return new Function('supabase', 'game', 'setInterval', 'clearInterval', 'initial', 'refresh', 'document', 'window', 'navigator', effects[0].body.getText(source))
}

const gameEffect = presenceEffect('src/app/game/[id]/GameClient.tsx', 'touch_presence')
const communityEffect = presenceEffect('src/lib/useCommunity.ts', 'touch_online')
const flush = () => new Promise<void>(resolve => setImmediate(resolve))

function fixture(effect: Function, game = { id: 'game-a', status: 'playing' }, initial: unknown = {}) {
  const requests: Array<{ rpc: string; body: unknown }> = []
  const timers = new Map<number, () => void>()
  let refreshes = 0
  let offline = false
  const client = createClient('https://presence.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Node 20 del CI no tiene WebSocket nativo. Estos efectos sólo usan HTTP.
    realtime: { transport: class {
      constructor() { throw new Error('La prueba de presencia no debe abrir Realtime') }
    } as unknown as typeof WebSocket },
    global: { fetch: async (input, init) => {
      requests.push({ rpc: String(input).split('/').at(-1)!, body: JSON.parse(String(init?.body ?? '{}')) })
      if (offline) throw new Error('offline')
      return new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const events = { addEventListener() {}, removeEventListener() {} }
  const stop = effect(client, game,
    (callback: () => void, ms: number) => { timers.set(ms, callback); return ms },
    (id: number) => timers.delete(id), initial, () => { refreshes++ },
    { ...events, hidden: false }, events, { onLine: true })
  return { requests, timers, stop, refreshes: () => refreshes, disconnect: () => { offline = true } }
}

test('la partida envía presencia al entrar y cada 8 segundos; salir cancela el intervalo', async () => {
  const f = fixture(gameEffect)
  await flush()
  assert.deepEqual(f.requests, [{ rpc: 'touch_presence', body: { p_game_id: 'game-a' } }])
  f.timers.get(8000)!()
  await flush()
  assert.equal(f.requests.length, 2)
  f.stop()
  assert.equal(f.timers.size, 0)
})

test('una partida terminada no envía latidos; una nueva usa su propio ID', async () => {
  const finished = fixture(gameEffect, { id: 'old', status: 'finished' })
  await flush()
  assert.equal(finished.requests.length, 0)
  assert.equal(finished.timers.size, 0)
  const next = fixture(gameEffect, { id: 'new', status: 'playing' })
  await flush()
  assert.deepEqual(next.requests[0].body, { p_game_id: 'new' })
  next.stop()
})

test('comunidad envía presencia al entrar y cada 30 segundos, conservando el refresco', async () => {
  const f = fixture(communityEffect, undefined, null)
  await flush()
  assert.deepEqual(f.requests, [{ rpc: 'touch_online', body: {} }])
  assert.equal(f.refreshes(), 1)
  f.timers.get(30000)!()
  f.timers.get(15000)!()
  await flush()
  assert.equal(f.requests.length, 2)
  assert.equal(f.refreshes(), 2)
  f.stop()
  assert.equal(f.timers.size, 0)
})

test('un fallo de red permite reintentar en el siguiente latido', async () => {
  const f = fixture(gameEffect)
  f.disconnect()
  await flush()
  f.timers.get(8000)!()
  await flush()
  assert.equal(f.requests.length, 2)
  f.stop()
})
