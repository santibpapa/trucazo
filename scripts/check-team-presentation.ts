import assert from 'node:assert/strict'
import { announcementRemaining, teamAnnouncement } from '../src/lib/team-presentation'
import type { TeamSnapshot } from '../src/lib/team-game'

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
console.log('Presentación 2vs2: autores, cantos, privacidad y vencimiento OK')
