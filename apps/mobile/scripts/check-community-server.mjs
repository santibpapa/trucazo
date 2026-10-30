// Rutas reales + Storage/Supabase real, sólo QA2. Usar servidor local con
// WEB3FORMS_ACCESS_KEY vacío: este ensayo NO autoriza envío de correos.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
nextEnv.loadEnvConfig(process.cwd())
const origin = process.env.ANDROID_QA_WEB_ORIGIN || 'http://localhost:3003'
assert.ok(/^http:\/\/localhost:300[023]$/.test(origin))
const saved = await loadQaAccounts(), account = saved.accounts[1], clients = []
const report = { scope: 'API Next local + Supabase/Storage reales, QA2; notificador apagado', checks: [] }
async function login(a) {
  const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const result = await client.auth.signInWithPassword({ email: a.email, password: a.password }); assert.equal(result.error, null)
  clients.push(client); return { client, token: result.data.session.access_token }
}
try {
  const { client, token } = await login(account), peer = await login(saved.accounts[0])
  const admin = createClient(saved.projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const call = (path, body, authorization = token, extra = {}) => fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: 'https://localhost', 'Content-Type': 'application/json', ...(authorization ? { Authorization: 'Bearer ' + authorization } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) })
  assert.equal((await call('/api/android/preferences', undefined, null)).status, 401)
  assert.equal((await call('/api/android/preferences', undefined, 'invalid')).status, 401)
  assert.equal((await call('/api/android/preferences?token=invalido')).status, 404)
  assert.equal((await call('/api/android/preferences', undefined, token, { Origin: 'https://ajeno.invalid' })).status, 403)
  for (const path of ['/api/android/admin-emails', '/api/admin/email-campaigns', '/api/admin/news-campaign', '/api/admin/ranking-campaign']) {
    const method = path === '/api/android/admin-emails' ? 'GET' : 'PATCH'
    const response = await fetch(origin + path, { method, headers: { Authorization: 'Bearer ' + token, Origin: 'https://localhost', 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })
    assert.equal(response.status, 403, path); assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost')
  }
  report.checks.push('Bearer inválido/sin sesión, CORS ajeno y administración rechazados')
  const preferences = await call('/api/android/preferences'); assert.equal(preferences.status, 200)
  assert.ok(Object.values(await preferences.json()).every(value => value === false))
  const preflight = await fetch(origin + '/api/feedback', { method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Headers': 'authorization,content-type' } }); assert.equal(preflight.status, 204)
  assert.equal((await call('/api/feedback', { general: 7 })).status, 400)
  const png = await readFile('android/generated/android-11-prueba.png')
  const loose = account.id + '/android-11-loose-' + crypto.randomUUID() + '.png'
  assert.equal((await client.storage.from('feedback-images').upload(loose, png, { contentType: 'image/png' })).error, null)
  assert.equal((await call('/api/uploads/cleanup', { bucket: 'feedback-images', paths: [loose] }, peer.token)).status, 400)
  assert.equal((await call('/api/uploads/cleanup', { bucket: 'feedback-images', paths: [loose] })).status, 200)
  assert.ok(!(await admin.storage.from('feedback-images').list(account.id)).data.some(file => file.name === loose.split('/')[1]))
  const path = account.id + '/android-11-support-' + crypto.randomUUID() + '.png'
  assert.equal((await client.storage.from('feedback-images').upload(path, png, { contentType: 'image/png' })).error, null)
  const response = await call('/api/feedback', { general: 5, aesthetics: 5, understood: true, hadProblem: false, comment: 'ANDROID-11 QA: prueba técnica de reseña e imagen, sin incidencia real ni aviso por correo.', paths: [path] })
  assert.equal(response.status, 200); const result = await response.json(); assert.deepEqual(result, { ok: true })
  const feedback = await admin.from('feedback').select('id,image_paths,user_id').eq('user_id', account.id).contains('image_paths', [path]).single()
  assert.equal(feedback.error, null); assert.equal(feedback.data.user_id, account.id)
  assert.ok((await peer.client.storage.from('feedback-images').createSignedUrl(path, 60)).error)
  const publicUrl = admin.storage.from('feedback-images').getPublicUrl(path).data.publicUrl
  assert.ok(!(await fetch(publicUrl)).ok)
  const signed = await admin.storage.from('feedback-images').createSignedUrl(path, 60); assert.equal(signed.error, null)
  assert.equal((await fetch(signed.data.signedUrl)).status, 200)
  await call('/api/uploads/cleanup', { bucket: 'feedback-images', paths: [path] })
  assert.ok((await admin.storage.from('feedback-images').list(account.id)).data.some(file => file.name === path.split('/')[1]))
  report.feedback = { id: feedback.data.id, owner: account.username, imagePrivate: true, authorizedLink: true, preservedAfterLostResponseCleanup: true, notified: false }
  report.checks.push('archivo suelto propio retirado; archivo ajeno rechazado; imagen vinculada conservada', 'reseña guardada una vez; imagen privada y URL temporal autorizada')
  await writeFile('android/generated/android-11-server.json', JSON.stringify(report, null, 2)); console.log('OK', report.checks)
} finally { for (const client of clients) await client.auth.signOut({ scope: 'local' }) }
