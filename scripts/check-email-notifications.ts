import assert from 'node:assert/strict'
import {
  getReengagementCandidate,
  type EmailActivity,
  type ReengagementCampaign,
} from '../src/lib/email/candidates'
import { reengagementMail } from '../src/lib/email/content'
import { isConfirmedEmailRecipient } from '../src/lib/email/recipients'

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

const campaign: ReengagementCampaign = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Primera partida',
  audience: 'never_played',
  delay_days: 2,
  subject: 'Volvé, {{usuario}}',
  preview: 'Hay una mesa esperando.',
  heading: 'Te quedó el mazo sin estrenar',
  body: 'Probá tu primera partida.',
  cta_label: 'Jugar',
  cta_path: '/lobby',
  is_active: true,
  created_at: '2026-08-20T12:00:00Z',
  updated_at: '2026-08-20T12:00:00Z',
}

assert.deepEqual(getReengagementCandidate(base, campaign, now), {
  kind: 'never_played',
  dedupeKey: `campaign:${campaign.id}:${base.user_id}:never-played`,
})

assert.equal(getReengagementCandidate({
  ...base,
  registered_at: '2026-08-25T12:00:01Z',
}, campaign, now), null)

assert.deepEqual(getReengagementCandidate({
  ...base,
  last_played_at: '2026-08-23T10:30:00Z',
}, { ...campaign, audience: 'inactive' }, now), {
  kind: 'inactive',
  dedupeKey: `campaign:${campaign.id}:${base.user_id}:2026-08-23T10:30:00Z`,
})

assert.equal(getReengagementCandidate({
  ...base,
  reengagement_enabled: false,
}, campaign, now), null)

assert.equal(getReengagementCandidate(base, { ...campaign, is_active: false }, now), null)
assert.equal(getReengagementCandidate(base, { ...campaign, audience: 'inactive' }, now), null)
assert.equal(getReengagementCandidate(base, { ...campaign, delay_days: 7 }, now), null)

const content = reengagementMail({
  username: 'Santi',
  preferencesUrl: 'https://www.trucazo.com.ar/email/preferencias?token=test',
  campaign,
})
assert.equal(content.subject, 'Volvé, Santi')
assert.match(content.html, /Probá tu primera partida\./)
assert.match(content.text, /Jugar: https:\/\/www\.trucazo\.com\.ar\/lobby\?utm_source=trucazo_email&utm_medium=email/)
assert.match(content.text, /utm_campaign=reactivacion-primera-partida/)

const unsafeLink = reengagementMail({
  username: 'Santi',
  preferencesUrl: 'https://www.trucazo.com.ar/email/preferencias?token=test',
  campaign: { ...campaign, cta_path: '/\\evil.example' },
})
assert.match(unsafeLink.text, /Jugar: https:\/\/www\.trucazo\.com\.ar\/lobby\?utm_source=trucazo_email&utm_medium=email/)
assert.doesNotMatch(unsafeLink.text, /evil\.example/)

assert.equal(isConfirmedEmailRecipient({
  email: 'jugador@example.com',
  email_confirmed_at: '2026-08-20T12:00:00Z',
  is_anonymous: false,
  app_metadata: { provider: 'email', providers: ['email'] },
}), true)
assert.equal(isConfirmedEmailRecipient({
  email: 'bot1@trucazo.bot',
  email_confirmed_at: '2026-08-20T12:00:00Z',
  is_anonymous: false,
  app_metadata: { provider: 'bot', providers: ['bot'] },
}), false)

console.log('Emails: reglas de reactivación correctas.')
