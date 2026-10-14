import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Ejecutamos los handlers reales del componente, sin copiar su lógica.
const source = readFileSync('src/app/game/[id]/GameClient.tsx', 'utf8')
function handler(name) {
  const start = source.indexOf(`  async function ${name}(`)
  assert.notEqual(start, -1)
  const end = source.indexOf('\n  }', start) + 4
  return source.slice(start, end)
    .replace(/\([^\n]*\) \{/, '(argument) {')
    .replace(/\bas Game\b/g, '')
    .replace(/\btype\b/g, 'argument')
    .replace(/\baccept\b/g, 'argument')
    .replace(/\baction\b/g, 'argument')
}
function fixture(name, rpcResult = { data: null, error: null }, handFails = false) {
  let loading = false
  let state = null
  let signal
  const errors = []
  const calls = []
  const rpc = (name, args) => {
    calls.push({ name, args })
    const request = {
      abortSignal(value) { signal = value; return request },
      then(resolve, reject) {
        if (rpcResult === 'pending') {
          signal?.addEventListener('abort', () => resolve({ data: null, error: { message: 'timeout' } }), { once: true })
          return
        }
        return Promise.resolve().then(() => {
          if (rpcResult instanceof Error) throw rpcResult
          return rpcResult
        }).then(resolve, reject)
      },
    }
    return request
  }
  const scope = {
    supabase: { rpc }, game: { id: 'game-test' }, isMyTurn: true, hasPendingEnvido: true,
    lastActionRef: { current: 0 }, chatChannelRef: { current: null }, myEnvido: 33,
    setLoading: value => { loading = value }, setGame: value => { state = value },
    setMyEmote() {}, setActionError() {},
    console: { error() {} },
    rpcFailed: (_label, error) => { if (error) errors.push(error); return !!error },
    refetchMyHand: async () => {
      if (handFails === 'pending') return new Promise(() => {})
      if (handFails) throw new Error('hand read failed')
    },
    // Acortamos solamente el reloj del test, comprobando el límite de producción.
    AbortSignal: { timeout(ms) { assert.equal(ms, 8000); return AbortSignal.timeout(10) } },
  }
  const run = new Function(...Object.keys(scope), 'getLoading', `return async argument => {
    const loading = getLoading();
    ${handler(name)}
    return ${name}(argument);
  }`)(...Object.values(scope), () => loading)
  return { run, calls, errors, loading: () => loading, state: () => state }
}

for (const [name, argument] of [['singEnvido', 'falta_envido'], ['respondEnvido', true], ['envidoSay', 'tengo']]) {
  test(`${name}: una excepción libera el control y permite reintentar`, async () => {
    const f = fixture(name, new Error('network failure'))
    await f.run(argument).catch(() => {})
    assert.equal(f.loading(), false)
    assert.equal(f.errors.length, 1)
    await f.run(argument).catch(() => {})
    assert.equal(f.calls.length, 2)
  })
  test(`${name}: una respuesta de error libera el control`, async () => {
    const f = fixture(name, { data: null, error: { message: 'no es tu turno' } })
    await f.run(argument)
    assert.equal(f.loading(), false)
    assert.equal(f.errors.length, 1)
  })
  test(`${name}: una petición sin respuesta vence y permite reintentar`, async () => {
    const f = fixture(name, 'pending')
    // Un timer normal mantiene vivo el proceso mientras AbortSignal.timeout vence.
    const timer = setTimeout(() => {}, 100)
    try {
      await Promise.race([f.run(argument), new Promise((_, reject) => setTimeout(() => reject(new Error('bloqueo sin límite')), 80))])
      assert.equal(f.loading(), false)
      assert.equal(f.errors.length, 1)
    } finally { clearTimeout(timer) }
  })
}
test('Tengo 33: la relectura fallida de cartas no deja el botón bloqueado', async () => {
  const game = { envido_state: { status: 'accepted', player1_points: 33 } }
  const f = fixture('envidoSay', { data: game, error: null }, true)
  await f.run('tengo').catch(() => {})
  assert.equal(f.state(), game)
  assert.equal(f.loading(), false)
  assert.deepEqual(f.calls, [{ name: 'envido_say', args: { p_game_id: 'game-test', p_action: 'tengo' } }])
})

test('Tengo 33: libera el botón aunque la relectura de cartas no termine', async () => {
  const f = fixture('envidoSay', { data: { envido_state: { status: 'declaring', declare_turn: 'opponent' } }, error: null }, 'pending')
  await Promise.race([f.run('tengo'), new Promise((_, reject) => setTimeout(() => reject(new Error('la relectura retuvo el control')), 80))])
  assert.equal(f.loading(), false)
})

test('el botón de declaración sigue declare_turn, incluso si current_turn es del rival', () => {
  const expression = source.match(/const myDeclareTurn = ([^\n]+)/)[1]
  const canDeclare = new Function('game', 'currentUserId', 'isDeclaring', `return ${expression}`)
  for (const status of ['falta_envido', 'declaring', 'accepted', 'rejected']) {
    for (const awaiting_deal of [false, true]) {
      for (const declare_turn of ['me', 'opponent']) {
        const game = { current_turn: 'opponent', awaiting_deal, envido_state: { status, declare_turn } }
        assert.equal(canDeclare(game, 'me', status === 'declaring'), status === 'declaring' && !awaiting_deal && declare_turn === 'me')
      }
    }
  }
  assert.match(source, /onClick=\{\(\) => envidoSay\('tengo'\)\} disabled=\{loading\}>Tengo \{myEnvido\}/)
})

test('reconectar o volver a la pestaña relee el estado; salir elimina los listeners', async () => {
  const start = source.indexOf('  // Tiempo real: suscripción')
  const effect = source.slice(start, source.indexOf('  // Respaldo por polling', start))
  const body = effect.slice(effect.indexOf('useEffect(() => {') + 'useEffect(() => {'.length, effect.lastIndexOf('}, [game.id, game.status])'))
    .replace(/\bas Game\b/g, '')
  let subscribed
  let reads = 0
  let removed = 0
  const listeners = new Map()
  const channel = { on() { return channel }, subscribe(cb) { subscribed = cb; return channel } }
  const events = { addEventListener: (event, cb) => listeners.set(event, cb), removeEventListener: event => listeners.delete(event) }
  const document = { ...events, visibilityState: 'visible' }
  const run = new Function('supabase', 'game', 'applyServerGame', 'refetchMyHand', 'refreshGame', 'window', 'document', body)
  const stop = run({ channel: () => channel, removeChannel: () => { removed++ } }, { id: 'game-test', status: 'playing' }, () => {}, () => {}, async () => { reads++ }, events, document)
  assert.equal(typeof subscribed, 'function')
  subscribed('SUBSCRIBED')
  subscribed('CHANNEL_ERROR')
  subscribed('SUBSCRIBED')
  listeners.get('online')()
  listeners.get('visibilitychange')()
  assert.equal(reads, 4)
  document.visibilityState = 'hidden'
  listeners.get('visibilitychange')()
  assert.equal(reads, 4)
  stop()
  assert.equal(listeners.size, 0)
  assert.equal(removed, 1)
})
