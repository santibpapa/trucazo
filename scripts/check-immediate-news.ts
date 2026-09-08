import assert from 'node:assert/strict'
import { buildPendingEmails } from '../src/lib/email/process'
import { newsMail } from '../src/lib/email/content'
import type { EmailActivity } from '../src/lib/email/candidates'

const publication = { id: 'news-one', title: '¡NOS RENOVAMOS!', body: 'Texto exacto.\n\nSegunda línea: «mesa».', created_at: '2026-09-08T13:00:00Z', email_completed_at: null }
const user: EmailActivity = { user_id: 'first', username: 'Santi', registered_at: '2026-09-08T12:00:00Z', last_played_at: null, news_enabled: true, reengagement_enabled: true, unsubscribe_token: 'token' }
const rows = [user, {...user, user_id: 'late', registered_at: '2026-09-08T13:00:01Z'}, {...user, user_id: 'out', news_enabled: false}]
const jobs = buildPendingEmails(rows, new Map(rows.map(row => [row.user_id, `${row.user_id}@mail.com`])), [publication], [], new Date())
assert.equal(jobs.length, 1)
assert.equal(jobs[0].userId, 'first')
assert.equal(jobs[0].kind, 'news')
assert.equal(jobs[0].campaignId, null)
assert.equal(jobs[0].dedupeKey, 'news:first:news-one')
assert.equal(jobs[0].subject, publication.title)
assert.ok(jobs[0].text.includes(publication.body))
assert.deepEqual(buildPendingEmails(rows, new Map(), [publication], [], new Date()), [])
assert.equal(buildPendingEmails([user], new Map([['first','first@mail.com']]), [], [], new Date()).length, 0)
const second = buildPendingEmails([user], new Map([['first','first@mail.com']]), [{...publication, id:'news-two'}], [], new Date())
assert.notEqual(second[0].dedupeKey, jobs[0].dedupeKey)
const escaped = newsMail({ username:'Santi', preferencesUrl:'https://trucazo.com.ar',title:'<script>',body:'<img onerror="attack()">\n{{usuario}}' })
assert.ok(!escaped.html.includes('<img onerror='))
assert.ok(escaped.text.includes('{{usuario}}'))
console.log('Novedades: contenido exacto, corte de registro, bajas, aislamiento y deduplicación correctos.')
