import assert from 'node:assert/strict'
import {
  getReengagementCandidate,
  type EmailActivity,
  type ReengagementCampaign,
} from '../src/lib/email/candidates'
import { reengagementMail } from '../src/lib/email/content'
import { isConfirmedEmailRecipient, isTestEmailAddress } from '../src/lib/email/recipients'
import { sendResendBatch } from '../src/lib/email/resend'

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
assert.match(content.html, /name="viewport" content="width=device-width,initial-scale=1"/)
assert.match(content.html, /name="color-scheme" content="light dark"/)
assert.match(content.html, /class="email-card"/)
assert.match(content.html, /Elegir qué emails recibir o darme de baja/)
assert.doesNotMatch(content.html, /retiro total o parcial/)
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
  email: 'jugador@gmail.com',
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
assert.equal(isTestEmailAddress('persona@example.com'), true)
assert.equal(isTestEmailAddress('persona@sub.example.org'), true)
assert.equal(isTestEmailAddress('persona@test.com'), true)
assert.equal(isTestEmailAddress('persona@gmail.com'), false)

function providerMail(to: string, dedupeKey: string) {
  return {
    to,
    dedupeKey,
    subject: 'Volvé a jugar',
    html: '<p>Hola</p>',
    text: 'Hola',
    unsubscribeUrl: 'https://www.trucazo.com.ar/email/preferencias?token=test',
  }
}

let mockCalls = 0
let accepted = 0
const mockFetcher = async (_input: string | URL | Request, init?: RequestInit) => {
  mockCalls += 1
  const body = JSON.parse(String(init?.body)) as { to: string[] }[]
  if (body.some(mail => mail.to[0].endsWith('@example.com'))) {
    return new Response(JSON.stringify({
      message: 'Invalid `to` field. Please use our testing email address instead of domains like `example.com`.',
    }), { status: 422, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({
    data: body.map(() => ({ id: `provider-${++accepted}` })),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

async function checkProviderIsolation() {
  const isolated = await sendResendBatch({
    apiKey: 'test-key',
    from: 'Trucazo <hola@trucazo.com.ar>',
    mails: [
      providerMail('uno@gmail.com', 'uno'),
      providerMail('prueba@example.com', 'prueba'),
      providerMail('dos@gmail.com', 'dos'),
    ],
    fetcher: mockFetcher,
  })
  assert.deepEqual(isolated.sent.map(item => item.mail.to), ['uno@gmail.com', 'dos@gmail.com'])
  assert.deepEqual(isolated.skipped.map(item => item.mail.to), ['prueba@example.com'])
  assert.equal(isolated.failed.length, 0)
  assert.equal(mockCalls, 5)

  const providerDown = await sendResendBatch({
    apiKey: 'test-key',
    from: 'Trucazo <hola@trucazo.com.ar>',
    mails: [providerMail('uno@gmail.com', 'uno')],
    fetcher: async () => new Response(
      JSON.stringify({ message: 'Servicio temporalmente no disponible' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    ),
  })
  assert.equal(providerDown.sent.length, 0)
  assert.equal(providerDown.skipped.length, 0)
  assert.equal(providerDown.failed.length, 1)
}

void checkProviderIsolation()
  .then(() => console.log('Emails: reglas de reactivación correctas.'))
  .catch(cause => {
    console.error(cause)
    process.exitCode = 1
  })
