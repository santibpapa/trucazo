import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { watchStartedTable } from '../src/lib/lobby-tables'

const flush = () => new Promise<void>(resolve => setImmediate(resolve))
const userId = '00000000-0000-4000-8000-000000000001'
const playing = { id: 'mesa-nueva', games: { status: 'playing' } }

async function fixture(run: (f: {
  requests: { url: URL; reply: (data: unknown, status?: number) => void }[]
  navigations: string[]
  change: () => void
  reconnect: () => void
  poll: () => void
  visible: (value: boolean) => void
  online: () => void
  stop: () => void
  timeout: () => void
  listeners: Map<string, () => void>
  intervals: Map<number, () => void>
}) => Promise<void>) {
  const original = { document: globalThis.document, window: globalThis.window, setInterval, clearInterval }
  const originalTimeout = AbortSignal.timeout
  const timeouts: AbortController[] = []
  AbortSignal.timeout = ms => {
    assert.equal(ms, 8000)
    const controller = new AbortController()
    timeouts.push(controller)
    return controller.signal
  }
  const requests: { url: URL; reply: (data: unknown, status?: number) => void }[] = []
  const navigations: string[] = []
  const listeners = new Map<string, () => void>()
  const intervals = new Map<number, () => void>()
  const events = {
    addEventListener: (name: string, callback: () => void) => { listeners.set(name, callback) },
    removeEventListener: (name: string) => { listeners.delete(name) },
  }
  const document = { ...events, visibilityState: 'visible' }
  Object.assign(globalThis, {
    document, window: events,
    setInterval: (callback: () => void, ms: number) => { intervals.set(ms, callback); return ms },
    clearInterval: (ms: number) => { intervals.delete(ms) },
  })
  let change = () => {}
  let reconnect = () => {}
  let removed = 0
  const channel = {
    on(_kind: string, filter: Record<string, string>, callback: () => void) {
      assert.equal(filter.filter, `creator_id=eq.${userId}`)
      assert.equal(filter.event, 'UPDATE')
      change = callback
      return channel
    },
    subscribe(callback: (status: string) => void) { reconnect = () => callback('SUBSCRIBED'); return channel },
  }
  // SDK HTTP real; sólo el transporte y la entrega de eventos son controlados.
  const client = createClient('https://lobby.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `test-${crypto.randomUUID()}` },
    realtime: { transport: class { constructor() { throw new Error('No abrir sockets reales') } } as unknown as typeof WebSocket },
    global: { fetch: async (input, init) => new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      requests.push({ url: new URL(String(input)), reply: (data, status = 200) => resolve(new Response(JSON.stringify(data), {
        status, headers: { 'Content-Type': 'application/json' },
      })) })
    }) },
  })
  client.channel = (() => channel) as unknown as typeof client.channel
  client.removeChannel = (async () => { removed++; return 'ok' }) as typeof client.removeChannel
  const stop = watchStartedTable(client, userId, id => navigations.push(id))
  try {
    await flush()
    await run({ requests, navigations, change: () => change(), reconnect: () => reconnect(),
      poll: () => { intervals.get(10000)?.() },
      visible: value => { document.visibilityState = value ? 'visible' : 'hidden'; listeners.get('visibilitychange')?.() },
      online: () => { listeners.get('online')?.() }, stop, listeners, intervals,
      timeout: () => { timeouts.at(-1)?.abort(new DOMException('Timeout', 'TimeoutError')) } })
  } finally {
    if (!removed) stop()
    Object.assign(globalThis, original)
    AbortSignal.timeout = originalTimeout
    assert.equal(removed, 1)
    assert.equal(listeners.size, 0)
    assert.equal(intervals.size, 0)
  }
}

test('lee mesa y partida juntas, con filtros, orden y respaldo de diez segundos', async () => fixture(async f => {
  const url = f.requests[0].url
  assert.equal(url.pathname, '/rest/v1/tables')
  assert.equal(url.searchParams.get('select'), 'id,games(status)')
  assert.equal(url.searchParams.get('creator_id'), `eq.${userId}`)
  assert.equal(url.searchParams.get('status'), 'eq.playing')
  assert.equal(url.searchParams.get('order'), 'created_at.desc')
  assert.equal(url.searchParams.get('limit'), '1')
  assert.deepEqual(Array.from(f.intervals.keys()), [10000])
  f.requests[0].reply([playing]); await flush()
  assert.deepEqual(f.navigations, ['mesa-nueva'])
  f.poll(); f.change(); await flush()
  assert.equal(f.requests.length, 1)
}))

test('el aviso en vivo abre la partida sin esperar al respaldo', async () => fixture(async f => {
  f.requests[0].reply([]); await flush()
  f.change(); await flush()
  f.requests[1].reply([playing]); await flush()
  assert.deepEqual(f.navigations, ['mesa-nueva'])
}))

test('una partida terminada no impide detectar la siguiente', async () => fixture(async f => {
  f.requests[0].reply([{ id: 'mesa-vieja', games: { status: 'finished' } }]); await flush()
  assert.equal(f.navigations.length, 0)
  f.poll(); await flush()
  f.requests[1].reply([playing]); await flush()
  assert.deepEqual(f.navigations, ['mesa-nueva'])
}))

test('una mesa jugando sin partida todavía permite que start_game la cree', async () => fixture(async f => {
  f.requests[0].reply([{ id: 'mesa-nueva', games: null }]); await flush()
  assert.deepEqual(f.navigations, ['mesa-nueva'])
}))

test('un error de lectura no navega y la reconexión reintenta', async () => fixture(async f => {
  f.requests[0].reply({ message: 'rejected' }, 400); await flush()
  assert.equal(f.navigations.length, 0)
  f.reconnect(); await flush()
  f.requests[1].reply([playing]); await flush()
  assert.equal(f.navigations.length, 1)
}))

test('los avisos durante una lectura se agrupan sin perder el último cambio', async () => fixture(async f => {
  f.change(); f.change(); f.reconnect(); await flush()
  assert.equal(f.requests.length, 1)
  f.requests[0].reply([]); await flush()
  assert.equal(f.requests.length, 2)
  f.requests[1].reply([playing]); await flush()
  assert.equal(f.navigations.length, 1)
}))

test('una lectura sin respuesta vence y libera el respaldo sin superponer pedidos', async () => fixture(async f => {
  f.poll(); await flush()
  assert.equal(f.requests.length, 1)
  f.timeout(); await flush()
  assert.equal(f.requests.length, 2)
  f.requests[1].reply([playing]); await flush()
  assert.equal(f.navigations.length, 1)
}))

test('no consulta en segundo plano y relee al volver o recuperar red', async () => fixture(async f => {
  f.requests[0].reply([]); await flush()
  f.visible(false); f.poll(); f.change(); await flush()
  assert.equal(f.requests.length, 1)
  f.visible(true); await flush()
  f.requests[1].reply([]); await flush()
  f.online(); await flush()
  assert.equal(f.requests.length, 3)
  f.requests[2].reply([]); await flush()
}))

test('salir ignora respuestas tardías y limpia canal, reloj y eventos', async () => fixture(async f => {
  f.stop()
  f.requests[0].reply([playing]); await flush()
  f.change(); f.reconnect(); f.poll(); await flush()
  assert.equal(f.requests.length, 1)
  assert.equal(f.navigations.length, 0)
}))
