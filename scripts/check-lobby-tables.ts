import assert from 'node:assert/strict'
import { test } from 'node:test'
import { subscribeLobbyTables } from '../src/lib/lobby-tables'
import type { Table } from '../src/lib/types'

const flush = () => new Promise<void>(resolve => setImmediate(resolve))
const rows = (id: string) => [{ id, status: 'waiting', is_private: false }] as Table[]

function fixture(ensureError = false) {
  const requests: Array<(value: { data: Table[] | null; error: unknown }) => void> = []
  const filters: Array<[string, unknown]> = []
  const names: string[] = []
  let onStatus: (status: string) => void = () => {}
  let onChange: () => void = () => {}
  let removed = 0
  const channel = {
    on(_event: string, filter: { event: string }, callback: () => void) {
      assert.equal(filter.event, '*')
      onChange = callback
      return channel
    },
    subscribe(callback: (status: string) => void) { onStatus = callback; return channel },
  }
  const client = {
    rpc(name: string) {
      assert.equal(name, 'ensure_lobby_tables')
      return Promise.resolve({ data: ensureError ? null : 0, error: ensureError ? 'offline' : null })
    },
    channel(name: string) { names.push(name); return channel },
    removeChannel() { removed++; return Promise.resolve() },
    from(table: string) {
      assert.equal(table, 'tables')
      const query = {
        select: () => query,
        eq(key: string, value: unknown) { filters.push([key, value]); return query },
        order: () => new Promise(resolve => requests.push(resolve)),
      }
      return query
    },
  } as unknown as Parameters<typeof subscribeLobbyTables>[0]
  const updates: Table[][] = []
  return {
    start: () => subscribeLobbyTables(client, data => updates.push(data)),
    requests, filters, names, updates,
    reconnect: () => onStatus('SUBSCRIBED'),
    change: () => onChange(),
    removed: () => removed,
  }
}

test('volver a un lobby vacío en caché consulta mesas aunque ensure devuelva cero', async () => {
  const f = fixture()
  const stop = f.start()
  await flush()
  assert.equal(f.requests.length, 1)
  f.requests[0]({ data: rows('mesa-existente'), error: null })
  await flush()
  assert.equal(f.updates[0][0].id, 'mesa-existente')
  assert.deepEqual(f.filters, [['status', 'waiting'], ['is_private', false]])
  stop()
})

test('reconectar revalida y una respuesta vieja no borra mesas recientes', async () => {
  const f = fixture()
  const stop = f.start()
  await flush()
  f.reconnect()
  f.requests[1]({ data: rows('reciente'), error: null })
  await flush()
  f.requests[0]({ data: [], error: null })
  await flush()
  assert.equal(f.updates.length, 1)
  assert.equal(f.updates[0][0].id, 'reciente')
  f.change()
  f.requests[2]({ data: [], error: null })
  await flush()
  assert.deepEqual(f.updates[1], [])
  stop()
})

test('fallar la reposición permite leer mesas; fallar la lectura conserva la lista', async () => {
  const f = fixture(true)
  const stop = f.start()
  await flush()
  f.requests[0]({ data: rows('existente'), error: null })
  await flush()
  f.reconnect()
  f.requests[1]({ data: null, error: 'offline' })
  await flush()
  assert.equal(f.updates.length, 1)
  assert.equal(f.updates[0][0].id, 'existente')
  stop()
})

test('salir ignora respuestas pendientes y volver abre un canal diferente', async () => {
  const f = fixture()
  const stop = f.start()
  await flush()
  stop()
  f.requests[0]({ data: rows('vieja'), error: null })
  await flush()
  assert.deepEqual(f.updates, [])
  assert.equal(f.removed(), 1)
  const stopAgain = f.start()
  assert.notEqual(f.names[0], f.names[1])
  stopAgain()
  await flush()
  assert.equal(f.requests.length, 1)
})
