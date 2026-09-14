import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { announcementRemaining, teamAnnouncement, teamActionRows, teamChatBubbles, CHAT_BUBBLE_MS } from '../src/lib/team-presentation'
import { TEAM_EMOTES } from '../src/lib/emotes'
import type { TeamChatLine, TeamSnapshot } from '../src/lib/team-game'

const now = '2026-09-12T15:00:00Z'
const snapshot = {
  my_seat: 3, members: [0, 1, 2, 3].map(seat => ({ seat, username: `Jugador ${seat}` })),
  game: { hand_number: 7, announcement: { at: now, seat: 0, action: 'truco', text: 'Truco' } },
} as TeamSnapshot
for (const [seat, side] of [[3, 'bottom'], [0, 'right'], [1, 'top'], [2, 'left']] as const) {
  snapshot.game!.announcement!.seat = seat
  const banner = teamAnnouncement(snapshot)!
  assert.equal(banner.side, side, 'El autor se ubica respecto del asiento local, aunque no sea 0')
  assert.equal(banner.hand, 7)
  assert.equal(banner.subtitle, `lo cantó Jugador ${seat}`)
}
for (const [action, text] of [['envido', 'Envido'], ['real_envido', 'Real envido'], ['falta_envido', 'Falta envido'], ['truco_yes', 'Quiero'], ['envido_no', 'No quiero'], ['tengo', 'Tengo 31'], ['son_buenas', 'Son buenas'], ['mazo', 'Al mazo']]) {
  Object.assign(snapshot.game!.announcement!, { action, text })
  const banner = teamAnnouncement(snapshot)!
  assert.equal(banner.title, text, 'Respeta el evento confirmado por el servidor')
  assert.equal(banner.score, undefined, 'No calcula ni revela tantos de otros jugadores')
}
assert.equal(announcementRemaining(now, now), 3600)
assert.equal(announcementRemaining(now, '2026-09-12T15:00:02Z'), 1600, 'Una recarga sólo conserva el tiempo restante')
assert.equal(announcementRemaining(now, '2026-09-12T15:01:00Z'), 0, 'No revive cantos antiguos')
assert.equal(announcementRemaining(now, '2026-09-12T14:59:59Z'), 3600)
assert.equal(announcementRemaining('inválida', now), 0)
snapshot.game!.announcement = null
assert.equal(teamAnnouncement(snapshot), null, 'La nueva mano no hereda el cartel anterior')
snapshot.my_seat = null
assert.equal(teamAnnouncement(snapshot), null)
assert.deepEqual(teamActionRows(['mazo', 'play', 'truco', 'envido', 'real_envido', 'falta_envido']), [
  ['envido', 'real_envido', 'falta_envido'], ['truco', 'mazo'],
])
const sevenActions = ['mazo', 'truco_yes', 'truco_no', 'retruco', 'envido', 'real_envido', 'falta_envido']
assert.deepEqual(teamActionRows(sevenActions), [
  ['truco_yes', 'retruco', 'truco_no'], ['envido', 'real_envido', 'falta_envido'], ['mazo'],
], 'Los siete permisos entran en tres filas, con el mismo orden de respuesta que 1vs1')
assert.deepEqual(teamActionRows(['son_buenas', 'mazo']), [['son_buenas', 'mazo']])
assert.deepEqual(teamActionRows([]), [], 'No agrega acciones cuando no corresponde actuar')

// Chat rápido: el servidor manda la hora de cada frase, incluida la de los bots,
// que hablan con un respiro. La pantalla solo decide cuál está vigente.
const t0 = Date.parse('2026-09-12T15:00:00Z')
const line = (seat: number, text: string, offset: number): TeamChatLine =>
  ({ seat, text, hand: 3, at: new Date(t0 + offset).toISOString() })
const dicho = [line(1, '¿Qué hago?', 0), line(3, 'Cantá tranquilo', 900)]
assert.deepEqual(teamChatBubbles(dicho, 1, t0), [{ seat: 1, text: '¿Qué hago?', relative: 0 }],
  'La frase del bot todavía no toca: habla con un respiro')
assert.deepEqual(teamChatBubbles(dicho, 1, t0 + 900), [
  { seat: 1, text: '¿Qué hago?', relative: 0 }, { seat: 3, text: 'Cantá tranquilo', relative: 2 },
], 'Cada frase se ubica respecto del asiento local')
assert.deepEqual(teamChatBubbles(dicho, 3, t0 + 900).map(b => b.relative), [2, 0],
  'El mismo intercambio visto desde el otro asiento')
assert.deepEqual(teamChatBubbles(dicho, 1, t0 + CHAT_BUBBLE_MS), [{ seat: 3, text: 'Cantá tranquilo', relative: 2 }],
  'Una frase vencida se apaga sola')
assert.deepEqual(teamChatBubbles([line(2, 'Algo tengo', 0), line(2, 'Estoy seco', 100)], 0, t0 + 100),
  [{ seat: 2, text: 'Estoy seco', relative: 2 }], 'Un jugador tiene un solo globito: el último')
assert.deepEqual(teamChatBubbles([], 0, t0), [])

// Las frases que se pueden mandar están en dos lados: acá y en el servidor, que
// rechaza cualquier otro texto. Si se desincronizan, el chat deja de funcionar.
const migration = readFileSync(new URL('../supabase/migrations/20260914170000_team_2vs2_bots_hablan.sql', import.meta.url), 'utf8')
const block = migration.match(/-- CHAT_LINES_BEGIN([\s\S]*?)-- CHAT_LINES_END/)?.[1]
assert.ok(block, 'La migración del chat 2vs2 debe marcar su lista con CHAT_LINES_BEGIN/END')
assert.deepEqual((block.match(/'[^']+'/g) ?? []).map(comilla => comilla.slice(1, -1)), [...TEAM_EMOTES],
  'La lista del servidor es espejo de TEAM_EMOTES: agregar una frase es tocar las dos')

console.log('Presentación 2vs2: autores, cantos, privacidad, vencimiento y chat OK')
