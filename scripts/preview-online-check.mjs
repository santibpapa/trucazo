// Prueba real de Auth -> API -> RLS -> Realtime, solamente en la copia desechable.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
assert.equal(process.env.GITHUB_ACTIONS, 'true')
assert.match(url ?? '', /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/supabase$/)
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function rpc(client, name, args) {
  const result = await client.rpc(name, args)
  assert.equal(result.error, null, `${name}: ${result.error?.message}`)
  return result.data
}
const clients = [], sessions = []
for (let seat = 0; seat < 4; seat++) {
  const client = makeClient()
  const { data, error } = await client.auth.signInAnonymously()
  assert.equal(error, null, error?.message)
  assert.ok(data.user)
  clients.push(client); sessions.push(data.session)
}
let snapshot = await rpc(clients[0], 'team_create', {
  p_request_id: randomUUID(), p_name: 'Verificación online', p_bet: 10,
  p_target_score: 15, p_time_limit: 30, p_is_private: false,
})
const id = snapshot.table.id
async function act(client, action, seat = null, card = null) {
  snapshot = await rpc(client, 'team_action', {
    p_table_id: id, p_request_id: randomUUID(), p_version: snapshot.table.version,
    p_action: action, p_seat: seat, p_card: card,
  })
  return snapshot
}
for (let seat = 0; seat < 4; seat++) {
  if (seat) snapshot = await rpc(clients[seat], 'team_join', { p_request_id: randomUUID(), p_table_id: id })
  await act(clients[seat], 'seat', seat)
}
let events = 0
const channel = clients[1].channel(`qa-${id}`).on('postgres_changes', {
  event: 'UPDATE', schema: 'public', table: 'team_tables', filter: `id=eq.${id}`,
}, payload => {
  assert.equal(payload.new.id, id)
  assert.equal(payload.new.hand, undefined)
  events++
})
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Realtime no suscribió')), 15000)
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve() }
    if (status === 'CHANNEL_ERROR') { clearTimeout(timeout); reject(new Error('Error de Realtime')) }
  })
})
await act(clients[0], 'start')
for (let seat = 0; seat < 4; seat++) {
  const own = await rpc(clients[seat], 'team_snapshot', { p_table_id: id })
  assert.equal(own.my_seat, seat)
  assert.equal(own.hand.length, 3)
  const { data, error } = await clients[seat].from('team_hands').select('seat,cards').eq('table_id', id)
  assert.equal(error, null)
  assert.deepEqual(data.map(h => h.seat), [seat], 'RLS sólo devuelve la mano propia')
}
// Recuperar la misma persona en otro cliente, como al recargar el navegador.
const recovered = makeClient()
assert.equal((await recovered.auth.setSession(sessions[2])).error, null)
assert.equal((await rpc(recovered, 'team_snapshot', { p_table_id: id })).my_seat, 2)
clients[2] = recovered
const deadline = Date.now() + 240000
let played = 0
while (snapshot.table.status === 'playing' && Date.now() < deadline) {
  if (snapshot.game.awaiting_deal) {
    await wait(2600)
    await act(clients[0], 'tick')
    continue
  }
  const seat = snapshot.actor
  const own = await rpc(clients[seat], 'team_snapshot', { p_table_id: id })
  snapshot = own
  // Primera mano de cartas completa; luego cantos para cubrir respuestas y tantos.
  const priority = snapshot.game.hand_number > 1
    ? ['tengo', 'son_buenas', 'falta_envido', 'envido_yes', 'truco_yes', 'truco', 'play']
    : ['tengo', 'son_buenas', 'envido_yes', 'truco_yes', 'play']
  const action = priority.find(a => own.legal.includes(a))
  assert.ok(action, `Sin acción para asiento ${seat}`)
  if (action === 'play') played++
  await act(clients[seat], action, null, action === 'play' ? own.hand[0] : null)
}
assert.equal(snapshot.table.status, 'finished', 'La partida debe terminar sin bloqueos')
assert.equal(snapshot.game.finish_reason, 'points')
assert.ok(played >= 8, 'Se jugaron rondas completas antes de los cantos')
assert.ok(events > 0, 'Realtime entregó cambios por WebSocket a otro participante')
for (let seat = 0; seat < 4; seat++) {
  const final = await rpc(clients[seat], 'team_snapshot', { p_table_id: id })
  assert.deepEqual(final.game.scores, snapshot.game.scores)
  assert.equal(final.game.winner_team, snapshot.game.winner_team)
}
await clients[1].removeChannel(channel)
console.log(`OK: 4 invitados, cartas privadas, recarga, ${played} cartas jugadas, ${events} eventos Realtime y resultado compartido.`)
