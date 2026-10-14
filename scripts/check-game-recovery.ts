import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

// Ejecuta los efectos de producción con el SDK real y un reloj controlado.
// No reemplaza rpc() por una Promise que oculte su ejecución perezosa.
const source = ts.createSourceFile('GameClient.tsx', readFileSync('src/app/game/[id]/GameClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function effectBody(marker: string) {
  const matches: string[] = []
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
      const effect = node.arguments[0]
      if (ts.isArrowFunction(effect) && effect.body.getText(source).includes(marker)) matches.push(effect.body.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(matches.length, 1, marker)
  return matches[0]
}
function advanceBody() {
  let body = ''
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'advanceHand') body = node.getText(source)
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(body)
  return body
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve))
const turnStart = Date.parse('2026-10-14T12:00:00Z')
function fixture(marker: string, overrides: Record<string, unknown> = {}) {
  let elapsed = 0
  let sequence = 0
  let failures = 0
  let earlyRejections = 0
  let seconds: number | null = null
  let state = { id: 'game-a', status: 'playing', awaiting_deal: false, turn_started_at: new Date(turnStart).toISOString(), time_limit: 30, envido_reveal: null, updated_at: new Date(turnStart).toISOString(), ...overrides }
  const requests: string[] = []
  const timers = new Map<number, { due: number; callback: () => unknown; repeat: number }>()
  const listeners = new Map<string, () => void>()
  const add = (callback: () => unknown, ms: number, repeat: number) => { const id = ++sequence; timers.set(id, { due: elapsed + ms, callback, repeat }); return id }
  const client = createClient('https://recovery.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: class { constructor() { throw new Error('Sólo HTTP en esta prueba') } } as unknown as typeof WebSocket },
    global: { fetch: async input => {
      const rpc = String(input).split('/').at(-1)!
      requests.push(rpc)
      if (failures-- > 0) throw new Error('offline')
      if (earlyRejections-- > 0) return new Response(JSON.stringify({ message: 'todavia hay tiempo', code: 'P0001' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ ...state, awaiting_deal: rpc !== 'advance_hand', updated_at: new Date(turnStart + 50000).toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const js = ts.transpileModule(`${advanceBody()}\n${effectBody(marker)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
  const run = new Function('supabase', 'game', 'setGame', 'applyServerGame', 'refetchMyHand', 'rpcFailed', 'setSecondsLeft', 'timeoutFiredRef', 'serverClockRef', 'performance', 'Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'window', js)
  const apply = (next: typeof state) => { state = next }
  const stop = run(client, state, apply, apply, async () => {}, (_label: string, error: unknown) => !!error, (left: number | null) => { seconds = left }, { current: null },
    { current: { serverNow: turnStart + Number(overrides.age ?? 0), startedAt: 0 } },
    { now: () => elapsed }, { now: () => turnStart + elapsed + Number(overrides.localSkew ?? 0), parse: Date.parse },
    (cb: () => unknown, ms: number) => add(cb, ms, 0), (id: number) => timers.delete(id),
    (cb: () => unknown, ms: number) => add(cb, ms, ms), (id: number) => timers.delete(id),
    { addEventListener: (event: string, cb: () => void) => listeners.set(event, cb), removeEventListener: (event: string) => listeners.delete(event) })
  return {
    requests, timers, stop, seconds: () => seconds, state: () => state,
    fail: (count = 1) => { failures = count },
    rejectEarly: () => { earlyRejections = 1 },
    event: async (name: string) => { listeners.get(name)?.(); await flush() },
    advance: async (ms: number) => {
      const target = elapsed + ms
      for (;;) {
        const next = Array.from(timers.entries()).filter(([, t]) => t.due <= target).sort((a, b) => a[1].due - b[1].due)[0]
        if (!next) break
        const [id, timer] = next
        elapsed = timer.due
        if (timer.repeat) timer.due += timer.repeat
        else timers.delete(id)
        await timer.callback()
        await flush()
      }
      elapsed = target
      await flush()
    },
  }
}

test('reparto: un fallo breve no deja al jugador activo esperando para siempre', async () => {
  const f = fixture('advanceHand()', { awaiting_deal: true })
  f.fail()
  await f.advance(1800)
  assert.equal(f.requests.length, 1)
  await f.advance(3000)
  assert.equal(f.requests.length, 2)
  assert.equal(f.state().awaiting_deal, false)
  f.stop()
  assert.equal(f.timers.size, 0)
})

test('reparto: sigue reintentando durante una desconexión prolongada y corta al salir', async () => {
  const f = fixture('advanceHand()', { awaiting_deal: true, envido_reveal: {} })
  f.fail(3)
  await f.advance(11600)
  assert.deepEqual(f.requests, Array(4).fill('advance_hand'))
  f.stop()
  await f.advance(9000)
  assert.equal(f.requests.length, 4)
})

test('reconexión: un turno de 30 segundos vencido no recibe otros 30', async () => {
  const f = fixture("rpc('timeout_mazo'", { age: 40000 })
  await flush()
  assert.equal(f.seconds(), 0)
  assert.deepEqual(f.requests, ['timeout_mazo'])
  f.stop()
})

test('reconexión: un turno iniciado hace 20 segundos muestra los 10 restantes', async () => {
  const f = fixture("rpc('timeout_mazo'", { age: 20000 })
  assert.equal(f.seconds(), 10)
  assert.equal(f.requests.length, 0)
  await f.advance(10000)
  assert.deepEqual(f.requests, ['timeout_mazo'])
  f.stop()
})

test('timeout: reintenta tras error y no vuelve a solicitarlo después del éxito', async () => {
  const f = fixture("rpc('timeout_mazo'")
  f.fail()
  await f.advance(30000)
  assert.equal(f.requests.length, 1)
  await f.advance(500)
  assert.equal(f.requests.length, 2)
  await f.advance(3000)
  assert.equal(f.requests.length, 2)
  f.stop()
})

test('no agenda timeout mientras se reparte ni después del final', async () => {
  for (const overrides of [{ awaiting_deal: true }, { status: 'finished' }]) {
    const f = fixture("rpc('timeout_mazo'", overrides)
    await f.advance(60000)
    assert.equal(f.requests.length, 0)
    assert.equal(f.seconds(), null)
  }
})

test('reloj: la hora incorrecta del dispositivo no altera el tiempo restante', async () => {
  for (const localSkew of [-3600000, 3600000]) {
    const f = fixture("rpc('timeout_mazo'", { age: 20000, localSkew })
    assert.equal(f.seconds(), 10)
    await f.advance(10000)
    assert.equal(f.requests.length, 1)
    f.stop()
  }
})

test('timeout: si Postgres todavía no considera vencido el turno, vuelve a pedirlo', async () => {
  const f = fixture("rpc('timeout_mazo'")
  f.rejectEarly()
  await f.advance(30000)
  assert.equal(f.requests.length, 1)
  await f.advance(500)
  assert.equal(f.requests.length, 2)
  f.stop()
})

test('snapshot atrasado no revive reparto ni partida terminada', () => {
  let body = ''
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'applyServerGame') body = node.getText(source)
    ts.forEachChild(node, visit)
  }
  visit(source)
  const js = ts.transpileModule(`${body}; return applyServerGame`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  let state = { status: 'playing', awaiting_deal: false, updated_at: '2026-10-14T12:01:00Z' }
  const apply = new Function('setGame', js)((update: (previous: typeof state) => typeof state) => { state = update(state) })
  apply({ ...state, awaiting_deal: true, updated_at: '2026-10-14T12:00:59Z' })
  assert.equal(state.awaiting_deal, false)
  apply({ ...state, status: 'finished', updated_at: '2026-10-14T12:01:01Z' })
  apply({ ...state, status: 'playing', updated_at: '2026-10-14T12:01:02Z' })
  assert.equal(state.status, 'finished')
})
