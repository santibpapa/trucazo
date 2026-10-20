import assert from 'node:assert/strict'
import { createMatchChatReadiness, matchChatSendError } from '../src/lib/match-chat'

let recoveries = 0
const connection = createMatchChatReadiness(() => { recoveries++ })

// SUBSCRIBED no recupera por sí solo: el servidor aún puede no estar escuchando.
assert.equal(connection.ready, false)
assert.equal(recoveries, 0)
connection.system({ extension: 'other', status: 'ok' })
assert.equal(recoveries, 0)
connection.system({ extension: 'postgres_changes', status: 'ok' })
assert.equal(connection.ready, true)
assert.equal(recoveries, 1)
connection.system({ extension: 'postgres_changes', status: 'ok' })
assert.equal(recoveries, 1)

// Un corte exige otra confirmación antes de volver a consultar el historial.
connection.disconnect()
assert.equal(connection.ready, false)
assert.equal(recoveries, 1)
connection.system({ extension: 'system', status: 'error' })
assert.equal(recoveries, 1)
connection.system({ extension: 'system', status: 'ok' })
assert.equal(recoveries, 2)

// PostgREST puede devolver un Error o un objeto plano con message.
assert.equal(matchChatSendError({ message: 'Esperá 3 segundos antes de enviar otro mensaje' }), 'Esperá 3 segundos antes de enviar otro mensaje')
assert.equal(matchChatSendError(new Error('Ya enviaste ese mensaje')), 'Ya enviaste ese mensaje')
assert.equal(matchChatSendError(null), 'No se pudo enviar. Volvé a intentar.')
console.log('Chat: recuperación tras confirmar recepción y rechazos específicos correctos.')
