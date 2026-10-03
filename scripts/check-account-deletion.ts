import assert from 'node:assert/strict'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { validDeletionRequest, hasRecentSignIn, needsPassword } from '../src/lib/account-deletion/identity'
import { processAccountDeletion, type DeletionJob } from '../src/lib/account-deletion/process'

const request = (origin: string | null, type = 'application/json') => new Request('https://www.trucazo.com.ar/api/account/delete', {
  method: 'POST', headers: { ...(origin ? { origin } : {}), 'content-type': type },
})
assert(validDeletionRequest(request('https://www.trucazo.com.ar'), { confirmation: 'ELIMINAR' }))
assert(!validDeletionRequest(request('https://otro.test'), { confirmation: 'ELIMINAR' }))
assert(!validDeletionRequest(request(null), { confirmation: 'ELIMINAR' }))
assert(!validDeletionRequest(request('https://www.trucazo.com.ar', 'text/plain'), { confirmation: 'ELIMINAR' }))
assert(!validDeletionRequest(request('https://www.trucazo.com.ar'), { confirmation: 'eliminar' }))
assert(!validDeletionRequest(request('https://www.trucazo.com.ar'), { confirmation: 'ELIMINAR', password: 123 }))
assert(!validDeletionRequest(request('https://www.trucazo.com.ar'), { confirmation: 'ELIMINAR', password: 'x'.repeat(1025) }))
const now = Date.parse('2026-10-01T19:00:00Z')
const user = (last: string | undefined) => ({ last_sign_in_at: last } as User)
assert(hasRecentSignIn(user('2026-10-01T18:59:00Z'), now))
assert(!hasRecentSignIn(user('2026-10-01T18:49:00Z'), now))
assert(!hasRecentSignIn(user('2026-10-01T19:01:00Z'), now))
assert(!hasRecentSignIn(user(undefined), now))
assert(needsPassword({ identities: [{ provider: 'email' }] } as User))
assert(!needsPassword({ identities: [{ provider: 'google' }] } as User))

const job: DeletionJob = { id: 'job', user_id: 'owner', lease_id: 'lease',
  objects: [{ bucket: 'avatars', name: 'owner/a.jpg' }, { bucket: 'avatars', name: 'owner/a.jpg' }] }
function fakeAdmin(failure?: string) {
  const calls: string[] = []
  const removed: string[][] = []
  const success = { data: null, error: null }
  const fail = { data: null, error: { code: 'provider_failure' } }
  const query = {
    eq: () => query,
    then: (resolve: (value: typeof success) => void) => resolve(success),
  }
  const admin = {
    auth: { admin: {
      updateUserById: async (id: string) => { calls.push(`ban:${id}`); return failure === 'missing' ? { error: { code: 'user_not_found' } } : success },
      deleteUser: async (id: string) => { calls.push(`auth:${id}`); return failure === 'auth' ? fail : success },
    } },
    rpc: async (name: string) => { calls.push(name); return { data: failure === 'missing' ? [] : [{ bucket: 'avatars', name: 'owner/b.jpg' }], error: null } },
    storage: { from: (bucket: string) => ({ remove: async (paths: string[]) => {
      calls.push(`files:${bucket}`); removed.push(paths); return failure === 'storage' ? fail : success
    } }) },
    from: () => ({ delete: () => { calls.push('complete'); return query }, update: () => { calls.push('retry'); return query } }),
  } as unknown as SupabaseClient
  return { admin, calls, removed }
}
async function main() {
  const success = fakeAdmin()
  assert(await processAccountDeletion(success.admin, job))
  assert.deepEqual(success.removed, [['owner/a.jpg', 'owner/b.jpg']])
  assert(success.calls.indexOf('files:avatars') < success.calls.indexOf('auth:owner'))
  assert.equal(success.calls.at(-1), 'complete')
  const storageFailed = fakeAdmin('storage')
  assert(!await processAccountDeletion(storageFailed.admin, job))
  assert(!storageFailed.calls.includes('auth:owner'))
  assert(!storageFailed.calls.includes('complete'))
  assert.equal(storageFailed.calls.at(-1), 'retry')
  const authFailed = fakeAdmin('auth')
  assert(!await processAccountDeletion(authFailed.admin, job))
  assert(!authFailed.calls.includes('complete'))
  assert.equal(authFailed.calls.at(-1), 'retry')
  const missing = fakeAdmin('missing')
  assert(await processAccountDeletion(missing.admin, job))
  assert.deepEqual(missing.removed, [['owner/a.jpg']])
  const large = fakeAdmin()
  assert(await processAccountDeletion(large.admin, { ...job, objects: Array.from({ length: 205 }, (_, i) => ({ bucket: 'avatars', name: `owner/${i}.jpg` })) }))
  assert(large.removed.every(batch => batch.length <= 100))
  console.log('Eliminación: confirmación, origen, identidad reciente, borrado de archivos antes de Auth y reintentos OK.')
}
void main()
