import assert from 'node:assert/strict'
import { getReengagementCandidate, type EmailActivity } from '../src/lib/email/candidates'

const now = new Date('2026-08-26T12:00:00Z')
const base: EmailActivity = {
  user_id: '00000000-0000-0000-0000-000000000001',
  username: 'Santi',
  registered_at: '2026-08-20T12:00:00Z',
  last_played_at: null,
  news_enabled: true,
  reengagement_enabled: true,
  unsubscribe_token: '00000000-0000-0000-0000-000000000002',
}

assert.deepEqual(getReengagementCandidate(base, now), {
  kind: 'never_played',
  dedupeKey: `never-played:${base.user_id}`,
})

assert.equal(getReengagementCandidate({
  ...base,
  registered_at: '2026-08-25T12:00:01Z',
}, now), null)

assert.deepEqual(getReengagementCandidate({
  ...base,
  last_played_at: '2026-08-23T10:30:00Z',
}, now), {
  kind: 'inactive',
  dedupeKey: `inactive:${base.user_id}:2026-08-23T10:30:00Z`,
})

assert.equal(getReengagementCandidate({
  ...base,
  reengagement_enabled: false,
}, now), null)

console.log('Emails: reglas de reactivación correctas.')
