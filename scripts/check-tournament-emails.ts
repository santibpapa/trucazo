import assert from 'node:assert/strict'
import { tournamentMail, type TournamentMailKind } from '../src/lib/email/content'

const kinds: TournamentMailKind[] = ['announcement', 'registration', 'reminder', 'checkin', 'match', 'rescheduled', 'cancelled']
for (const kind of kinds) {
  const mail = tournamentMail({ kind, username: '<Santi & Ana>',
    tournamentName: 'Copa <Especial>', tournamentId: '11111111-1111-4111-8111-111111111111',
    startsAt: '2026-10-01T22:00:00.000Z',
    preferencesUrl: 'https://www.trucazo.com.ar/email/preferencias?token=prueba' })
  assert(!mail.html.includes('<Especial>'), `${kind}: nombre del torneo sin escapar`)
  if (['announcement', 'registration', 'cancelled'].includes(kind)) {
    assert(mail.html.includes('Copa &lt;Especial&gt;'), `${kind}: falta el nombre del torneo`)
  }
  assert(!mail.html.includes('<Santi & Ana>'), `${kind}: saludo no escapado`)
  assert(mail.html.includes('token=prueba'), `${kind}: falta enlace de baja`)
  assert(mail.text.includes('/torneos/11111111-1111-4111-8111-111111111111'), `${kind}: destino incorrecto`)
}
const announcement = tournamentMail({ kind: 'announcement', username: 'Santi',
  tournamentName: 'Copa', tournamentId: '11111111-1111-4111-8111-111111111111',
  startsAt: '2026-10-01T22:00:00.000Z', preferencesUrl: 'https://www.trucazo.com.ar/email/preferencias' })
assert(announcement.text.includes('no te inscribe'), 'El anuncio debe pedir confirmación explícita')
assert(announcement.text.includes('19:00'), 'La fecha debe mostrarse en hora argentina')
console.log('Correos de torneos: siete eventos, enlaces, hora argentina y escape correctos.')
