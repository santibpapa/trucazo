// Cuentas persistentes de QA autorizadas por el dueño. Sólo para Node local.
// Credenciales fuera de Git; nunca imprimir passwords, sesiones ni llaves.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'

export const QA_FILE = fileURLToPath(new URL('../../../android/generated/private/android-qa-accounts.json', import.meta.url))
export async function loadQaAccounts() {
  const saved = JSON.parse(await readFile(QA_FILE, 'utf8'))
  assert.equal(saved.version, 1)
  assert.deepEqual(saved.accounts.map(a => a.username), ['androidqa1', 'androidqa2'])
  return saved
}
async function main() {
  process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
  nextEnv.loadEnvConfig(process.cwd())
  const mode = process.argv[2] || 'check', url = process.env.NEXT_PUBLIC_SUPABASE_URL
  assert.ok(['provision', 'check'].includes(mode), 'Usar provision o check')
  assert.ok(url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Falta configuración Supabase')
  let saved
  try { saved = await loadQaAccounts() }
  catch (failure) {
    if (failure.code !== 'ENOENT' || mode !== 'provision') throw failure
    saved = { version: 1, projectUrl: url, createdAt: new Date().toISOString(), accounts: [1, 2].map(n => ({
      id: randomUUID(), username: 'androidqa' + n, email: 'androidqa' + n + '@qa.trucazo.test',
      password: 'Tq9!' + randomBytes(24).toString('base64url'),
    })) }
    await mkdir(new URL('../../../android/generated/private/', import.meta.url), { recursive: true })
    await writeFile(QA_FILE, JSON.stringify(saved, null, 2), { flag: 'wx', mode: 0o600 })
  }
  assert.equal(saved.projectUrl, url, 'Las cuentas pertenecen a otro proyecto')
  let admin
  if (mode === 'provision') {
    assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Falta la llave administrativa local')
    admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  const results = []
  for (const account of [...saved.accounts, ...(saved.registrationAccount?.id ? [saved.registrationAccount] : [])]) {
    if (admin) {
      const existing = await admin.auth.admin.getUserById(account.id)
      if (existing.error && existing.error.status !== 404) throw existing.error
      if (!existing.data.user) {
        const collision = await admin.from('profiles').select('id').ilike('username', account.username).maybeSingle()
        if (collision.error) throw collision.error
        assert.equal(collision.data, null, 'El nombre ya pertenece a otro usuario; no se modifica')
        const created = await admin.auth.admin.createUser({ id: account.id, email: account.email, password: account.password,
          email_confirm: true, user_metadata: { username: account.username }, app_metadata: { qa_purpose: 'android-app-acceptance' } })
        if (created.error) throw created.error
        assert.equal(created.data.user.id, account.id)
      } else {
        assert.equal(existing.data.user.email, account.email)
        assert.equal(existing.data.user.app_metadata.qa_purpose, 'android-app-acceptance')
      }
    }
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    try {
      const login = await client.auth.signInWithPassword({ email: account.email, password: account.password })
      if (login.error) throw login.error
      assert.equal(login.data.user.id, account.id); assert.equal(login.data.user.is_anonymous, false)
      assert.ok(login.data.user.email_confirmed_at)
      const [profile, progress] = await Promise.all([
        client.from('profiles').select('id,username,coins,campaign_points,is_admin,is_bot').eq('id', account.id).single(),
        client.from('campaign_progress').select('rival_id,wins,rematch_points').eq('user_id', account.id),
      ])
      for (const response of [profile, progress]) if (response.error) throw response.error
      assert.equal(profile.data.username, account.username)
      assert.equal(profile.data.is_admin, false); assert.equal(profile.data.is_bot, false)
      results.push({ ...profile.data, confirmed: true, login: 'passed', progress: progress.data })
    } finally { await client.auth.signOut({ scope: 'local' }) }
  }
  const report = { projectUrl: url, checkedAt: new Date().toISOString(), accounts: results }
  await writeFile('android/generated/android-qa-accounts-check.tmp', JSON.stringify(report, null, 2))
  await rename('android/generated/android-qa-accounts-check.tmp', 'android/generated/android-qa-accounts-check.json')
  console.log(JSON.stringify(report))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(failure => { console.error('QA: ' + failure.message); process.exitCode = 1 })
}
