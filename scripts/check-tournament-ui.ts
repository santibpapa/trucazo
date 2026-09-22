import assert from 'node:assert/strict'
import {
  argentinaInputToIso,
  escapeTournamentUsernamePattern,
  isExactTournamentUsername,
  isoToArgentinaInput,
  TOURNAMENT_CAPACITIES,
  tournamentCheckInState,
  tournamentRequestForRetry,
  validateTournamentDraft,
} from '../src/lib/tournament-ui'
import type { Tournament, TournamentDraftInput } from '../src/lib/tournaments'

assert.deepEqual(TOURNAMENT_CAPACITIES['1v1'].knockout, [4, 8, 16, 32])
assert.deepEqual(TOURNAMENT_CAPACITIES['1v1'].groups, [8, 16, 32])
assert.deepEqual(TOURNAMENT_CAPACITIES['2v2'].knockout, [8, 16, 32])
assert.deepEqual(TOURNAMENT_CAPACITIES['2v2'].groups, [16, 32])

assert.equal(argentinaInputToIso('2027-01-10T19:00'), '2027-01-10T22:00:00.000Z')
assert.equal(isoToArgentinaInput('2027-01-10T22:00:00.000Z'), '2027-01-10T19:00')
assert.equal(argentinaInputToIso('fecha-invalida'), null)

assert.equal(escapeTournamentUsernamePattern('Juan_20%26'), 'Juan\\_20\\%26')
assert.equal(isExactTournamentUsername('JUAN_2026', 'juan_2026'), true)
assert.equal(isExactTournamentUsername('JuanX2026', 'Juan_2026'), false)

let nextRequest = 0
const createRequestId = () => `request-${++nextRequest}`
const firstRequest = tournamentRequestForRetry(null, 'mismo-formulario', createRequestId)
const retriedRequest = tournamentRequestForRetry(firstRequest, 'mismo-formulario', createRequestId)
const changedRequest = tournamentRequestForRetry(firstRequest, 'formulario-modificado', createRequestId)
assert.equal(firstRequest.requestId, 'request-1')
assert.equal(retriedRequest.requestId, firstRequest.requestId)
assert.equal(changedRequest.requestId, 'request-2')

const validInput: TournamentDraftInput = {
  name: 'Copa de prueba',
  description: 'Recorrido del formulario',
  mode: '2v2',
  format: 'knockout',
  capacity: 8,
  targetScore: 30,
  prizeFirst: 300,
  prizeSecond: 200,
  prizeThird: 100,
  startsAt: '2099-01-10T22:00:00.000Z',
}
assert.deepEqual(validateTournamentDraft(validInput), [])
assert.match(
  validateTournamentDraft({ ...validInput, format: 'groups', capacity: 8 })[0],
  /cupo/i,
)
assert.match(validateTournamentDraft({ ...validInput, prizeFirst: -1 })[0], /monedas/i)

const tournament: Tournament = {
  id: '00000000-0000-4000-a000-000000000001',
  name: 'Check-in de prueba',
  description: '',
  mode: '1v1',
  format: 'knockout',
  capacity: 4,
  target_score: 15,
  prize_first: 0,
  prize_second: 0,
  prize_third: 0,
  starts_at: '2027-01-10T22:00:00.000Z',
  status: 'published',
  published_at: '2027-01-01T12:00:00.000Z',
  paused_at: null,
  roster_frozen_at: null,
  schedule_version: 1,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: '2027-01-01T12:00:00.000Z',
  updated_at: '2027-01-01T12:00:00.000Z',
}
assert.equal(tournamentCheckInState(tournament, Date.parse('2027-01-10T21:29:59Z')), 'not_open')
assert.equal(tournamentCheckInState(tournament, Date.parse('2027-01-10T21:30:00Z')), 'open')
assert.equal(tournamentCheckInState(tournament, Date.parse('2027-01-10T22:00:00Z')), 'closed')

console.log('Formularios, reintentos, usuarios, horarios y combinaciones de torneos verificados.')
