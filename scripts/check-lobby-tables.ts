import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { subscribeLobbyTables } from '../src/lib/lobby-tables'
import type { Table } from '../src/lib/types'

const flush = () => new Promise<void>(resolve => setImmediate(resolve))
const rows = (id: string) => [{ id, status: 'waiting', is_private: false }] as Table[]
type Request = { url: URL; reply: (data: unknown, status?: number) => void }
type Fixture = {
  requests: Request[]; updates: Table[][]; names: string[]
  initial: (data: Table[]) => Promise<void>
  change: () => void; reconnect: () => void; poll: () => void
  visible: (value: boolean) => void; focus: () => void; online: () => void
  stop: () => void; restart: () => void; timeout: () => void
}

async function fixture(run: (f: Fixture) => Promise<void>) {
  const original = { document: globalThis.document, window: globalThis.window, setInterval, clearInterval }
  const originalTimeout = AbortSignal.timeout
  const timeouts: AbortController[] = []
  AbortSignal.timeout = ms => {
    assert.equal(ms, 8000)
    const controller = new AbortController()
    timeouts.push(controller)
    return controller.signal
  }
  const requests: Request[] = []
  const updates: Table[][] = []
  const names: string[] = []
  const listeners = new Map<string, () => void>()
  const intervals = new Map<number, () => void>()
  const events = {
    addEventListener: (name: string, callback: () => void) => { listeners.set(name, callback) },
    removeEventListener: (name: string) => { listeners.delete(name) },
  }
  const document = { ...events, visibilityState: 'visible' }
  let change = () => {}
  let reconnect = () => {}
  let removed = 0
  const channel = {
    on(_event: string, filter: Record<string, string>, callback: () => void) {
      assert.deepEqual(filter, { event: '*', schema: 'public', table: 'tables' })
      change = callback
      return channel
    },
    subscribe(callback: (status: string) => void) { reconnect = () => callback('SUBSCRIBED'); return channel },
  }
  // SDK real; se controlan solamente el transporte, el reloj y los avisos.
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
  client.channel = ((name: string) => { names.push(name); return channel }) as unknown as typeof client.channel
  client.removeChannel = (async () => { removed++; return 'ok' }) as typeof client.removeChannel
  await client.auth.initialize()
  Object.assign(globalThis, {
    document, window: events,
    setInterval: (callback: () => void, ms: number) => { intervals.set(ms, callback); return ms },
    clearInterval: (ms: number) => { intervals.delete(ms) },
  })
  let stop = subscribeLobbyTables(client, data => updates.push(data))
  try {
    await flush()
    await run({ requests, updates, names,
      initial: async data => { requests[0].reply(0); await flush(); requests[1].reply(data); await flush() },
      change: () => change(), reconnect: () => reconnect(),
      poll: () => { intervals.get(30000)?.() },
      visible: value => { document.visibilityState = value ? 'visible' : 'hidden'; listeners.get('visibilitychange')?.() },
      focus: () => { listeners.get('focus')?.() }, online: () => { listeners.get('online')?.() },
      stop: () => stop(),
      restart: () => { stop = subscribeLobbyTables(client, data => updates.push(data)) },
      timeout: () => { assert.ok(timeouts.length); timeouts.at(-1)?.abort(new DOMException('Timeout', 'TimeoutError')) },
    })
  } finally {
    if (removed < names.length) stop()
    Object.assign(globalThis, original)
    AbortSignal.timeout = originalTimeout
    assert.equal(removed, names.length)
    assert.equal(listeners.size, 0)
    assert.equal(intervals.size, 0)
  }
}

test('volver a un lobby vacío en caché consulta mesas aunque ensure devuelva cero', async () => fixture(async f => {
  assert.equal(f.requests[0].url.pathname, '/rest/v1/rpc/ensure_lobby_tables')
  await f.initial(rows('existente'))
  const url = f.requests[1].url
  assert.equal(url.pathname, '/rest/v1/tables')
  assert.equal(url.searchParams.get('select'), '*')
  assert.equal(url.searchParams.get('status'), 'eq.waiting')
  assert.equal(url.searchParams.get('is_private'), 'eq.false')
  assert.equal(url.searchParams.get('order'), 'created_at.desc')
  assert.equal(f.updates[0][0].id, 'existente')
}))

test('volver de otra pestaña repone y relee aunque no llegue una reconexión', async () => fixture(async f => {
  await f.initial(rows('anterior'))
  f.visible(false); f.poll(); f.change(); f.reconnect(); await flush()
  assert.equal(f.requests.length, 2, 'no trabaja con la pestaña oculta')
  f.visible(true); await flush()
  assert.equal(f.requests[2].url.pathname, '/rest/v1/rpc/ensure_lobby_tables')
  f.requests[2].reply(2); await flush()
  f.requests[3].reply(rows('repuesta')); await flush()
  assert.equal(f.updates.at(-1)?.[0].id, 'repuesta')
}))

test('el borrado por antigüedad repone mesas sin salir del lobby', async () => fixture(async f => {
  await f.initial(rows('vencida'))
  f.change(); await flush()
  f.requests[2].reply([]); await flush()
  assert.equal(f.requests[3].url.pathname, '/rest/v1/rpc/ensure_lobby_tables')
  f.requests[3].reply(2); await flush()
  f.requests[4].reply(rows('nueva')); await flush()
  assert.equal(f.updates.at(-1)?.[0].id, 'nueva')
}))

test('el respaldo recupera avisos perdidos y permite otro vencimiento', async () => fixture(async f => {
  await f.initial(rows('inicial'))
  for (let cycle = 0; cycle < 2; cycle++) {
    const start = f.requests.length
    f.poll(); await flush()
    assert.equal(f.requests[start].url.pathname, '/rest/v1/rpc/ensure_lobby_tables')
    f.requests[start].reply(2); await flush()
    f.requests[start + 1].reply(rows(`ciclo-${cycle}`)); await flush()
    assert.equal(f.updates.at(-1)?.[0].id, `ciclo-${cycle}`)
  }
}))

test('reconectar, recuperar foco y recuperar red reponen antes de leer', async () => fixture(async f => {
  await f.initial(rows('inicial'))
  for (const recover of [f.reconnect, f.focus, f.online]) {
    const start = f.requests.length
    recover(); await flush()
    assert.equal(f.requests[start].url.pathname, '/rest/v1/rpc/ensure_lobby_tables')
    f.requests[start].reply(0); await flush()
    f.requests[start + 1].reply(rows('actual')); await flush()
    assert.equal(f.updates.at(-1)?.[0].id, 'actual')
  }
}))

test('agrupa avisos y descarta una lectura anterior a un nuevo aviso', async () => fixture(async f => {
  await f.initial(rows('inicial'))
  f.change(); await flush()
  f.change(); f.change(); f.reconnect(); f.online(); await flush()
  assert.equal(f.requests.length, 3)
  f.requests[2].reply([]); await flush()
  assert.equal(f.updates.length, 1)
  assert.equal(f.requests.length, 4)
  f.requests[3].reply(0); await flush()
  f.requests[4].reply(rows('reciente')); await flush()
  assert.equal(f.updates.at(-1)?.[0].id, 'reciente')
}))

test('fallar o vencer la reposición permite leer las mesas existentes', async () => fixture(async f => {
  f.requests[0].reply({ message: 'offline' }, 400); await flush()
  f.requests[1].reply(rows('existente')); await flush()
  f.online(); await flush()
  f.timeout(); await flush()
  assert.equal(f.requests[3].url.pathname, '/rest/v1/tables')
  f.requests[3].reply(rows('conservada')); await flush()
  assert.equal(f.updates.at(-1)?.[0].id, 'conservada')
}))

test('una lectura fallida conserva la lista y una colgada libera el reintento', async () => fixture(async f => {
  await f.initial(rows('existente'))
  f.change(); await flush()
  f.requests[2].reply({ message: 'offline' }, 400); await flush()
  assert.equal(f.updates.length, 1)
  f.change(); await flush()
  f.poll(); await flush()
  assert.equal(f.requests.length, 4)
  f.timeout(); await flush()
  f.requests[4].reply(0); await flush()
  f.requests[5].reply(rows('recuperada')); await flush()
  assert.equal(f.updates.at(-1)?.[0].id, 'recuperada')
}))

test('si no hay bots disponibles, una lista realmente vacía no genera un bucle', async () => fixture(async f => {
  await f.initial(rows('inicial'))
  f.change(); await flush()
  f.requests[2].reply([]); await flush()
  f.requests[3].reply(0); await flush()
  f.requests[4].reply([]); await flush()
  assert.deepEqual(f.updates.at(-1), [])
  assert.equal(f.requests.length, 5)
}))

test('salir durante la reposición no lee ni actualiza después; volver usa otro canal', async () => fixture(async f => {
  f.stop()
  f.requests[0].reply(2); await flush()
  assert.equal(f.requests.length, 1)
  assert.deepEqual(f.updates, [])
  f.restart(); await flush()
  assert.notEqual(f.names[0], f.names[1])
  f.requests[1].reply(0); await flush()
  f.stop()
  f.requests[2].reply(rows('tardía')); await flush()
  f.change(); f.reconnect(); f.poll(); f.focus(); f.online(); await flush()
  assert.equal(f.requests.length, 3)
  assert.deepEqual(f.updates, [])
}))
