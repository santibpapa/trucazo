// Handlers reales; Auth/Storage sustituidos. No crea cuentas ni borra datos reales.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'

async function main() {
  const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
  const now = Math.floor(Date.now() / 1000)
  const f = { signedIn: true, recent: true, storageFails: false, calls: [] as string[], token: '' }
  const user = { id: owner, is_anonymous: false, last_sign_in_at: new Date().toISOString(), identities: [{ provider: 'google' }] }
  const ok = { error: null }
  const query: any = { eq: () => query, then: (resolve: (value: unknown) => void) => resolve(ok) }
  const admin = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      f.calls.push(name)
      if (name === 'prepare_account_deletion') { assert.equal(args.p_user_id, owner); return { data: 'job', error: null } }
      if (name === 'claim_account_deletions') return { data: [{ id: 'job', user_id: owner, lease_id: 'lease', objects: [{ bucket: 'avatars', name: owner + '/photo.jpg' }] }], error: null }
      return { data: [], error: null }
    },
    auth: { admin: { updateUserById: async () => ok, deleteUser: async () => { f.calls.push('delete-auth'); return ok } } },
    storage: { from: () => ({ remove: async () => ({ error: f.storageFails ? new Error('fixture') : null }) }) },
    from: () => ({ delete: () => query, update: () => query }),
  }
  const client = { auth: {
    getUser: async () => ({ data: { user: f.signedIn ? user : null }, error: null }),
    getClaims: async (token: string) => { f.token = token; return { data: { claims: { sub: owner, amr: [{ method: 'oauth', timestamp: now - (f.recent ? 60 : 700) }] } }, error: null } },
    signOut: async () => ok,
  } }
  ;(globalThis as any).privacyFixture = { client, admin }
  const bundle = await build({ stdin: { contents: `import {POST,OPTIONS} from './src/app/api/account/delete/route';globalThis.privacyHandlers={POST,OPTIONS};`, resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, plugins: [{ name: 'privacy-fixture', setup(b) {
      b.onResolve({ filter: /^@\/lib\/supabase\/(api|admin)$/ }, a => ({ path: a.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const createApiClient=async()=>globalThis.privacyFixture.client;export const createAdminClient=()=>globalThis.privacyFixture.admin;' }))
    } }] })
  new Function('require', bundle.outputFiles[0].text)(createRequire(import.meta.url))
  const { POST, OPTIONS } = (globalThis as any).privacyHandlers
  const request = (body: unknown = { confirmation: 'ELIMINAR' }, origin = 'https://localhost', bearer = true) => new Request('https://www.trucazo.com.ar/api/account/delete', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer fixture-token' } : {}) }, body: JSON.stringify(body),
  })
  assert.equal((await POST(request({}, 'https://evil.invalid'))).status, 403)
  assert.equal((await POST(request(undefined, 'https://localhost', false))).status, 400)
  f.signedIn = false; assert.equal((await POST(request())).status, 401)
  f.signedIn = true; f.recent = false; assert.equal((await POST(request())).status, 403)
  assert.equal((await POST(request({ confirmation: 'ELIMINAR', owner: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' }))).status, 409)
  assert.equal(f.calls.length, 0)
  f.recent = true
  const deleted = await POST(request({ confirmation: 'ELIMINAR', userId: 'victim' }))
  assert.equal(deleted.status, 200); assert.equal((await deleted.json()).status, 'deleted')
  assert.equal(f.token, 'fixture-token'); assert.equal(deleted.headers.get('access-control-allow-origin'), 'https://localhost')
  assert(f.calls.includes('delete-auth'))
  f.calls.length = 0; f.storageFails = true
  const pending = await POST(request())
  assert.equal(pending.status, 202); assert.equal((await pending.json()).status, 'pending')
  assert(!f.calls.includes('delete-auth'))
  assert.equal((await OPTIONS(request())).status, 204)
  await writeFile('android/generated/android-15-api.json', JSON.stringify({ environment: 'Handlers reales, Auth/Storage simulados', passed: ['origen y sesión', 'Bearer explícito en claims', 'OAuth de ESTA sesión reciente', 'ID ajeno ignorado', 'Storage antes de Auth', 'reintento durable 202', 'CORS Android'] }, null, 2))
  console.log('OK privacidad: sesión, origen, OAuth reciente por sesión, cuenta propia, Storage/Auth y reintento.')
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
