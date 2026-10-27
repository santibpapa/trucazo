// Handlers reales y procesamiento de imagen; sólo Auth/Storage son dobles locales.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { safetyFixture } from './safety-fixture'
import { ids } from './online-fixture'

async function main() {
  const f = await safetyFixture(), adminId = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'
  let owner: string | null = ids.A, failImage = false, downloads = 0
  const fixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAAABc2X6AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAA10lEQVR4nO3XUQ1EQQhDUfxdl+NmXK2HTSZ8vJMgAFpoy9zTp2rWOzBwGM5K54YjWlFptnS3TVLwSNJKtEyWzvOQb+nsGwZb6gUEsw45hnsKwaxDjuEwnJXODUe0otJs6X6gZr0DA4fhrHRuOKIVlWZLd9skBY8krUTLZOk8D/mWzr5hsKVeQDDrkGO4pxDMOuQYDsNZ6dxwRCsqzZbuB2rWOzBwGM5K54YjWlFptnS3TVLwSNJKtEyWzvOQb+nsGwZb6gUEsw45hnsKwaxDjuEwnJXubwh+79bId6Xbf3EAAAAASUVORK5CYII=', 'base64')
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.invalid'
  const admin = {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      try {
        const q = await f.db.query<{ value: any }>('select public.community_report_media($1,$2::jsonb) value', [args.p_report, args.p_images ? JSON.stringify(args.p_images) : null])
        return { data: q.rows[0].value, error: null }
      } catch (error) { return { data: null, error } }
    },
    storage: { from: (_bucket: string) => ({ download: async (_path: string) => {
      downloads++
      return failImage ? { data: null, error: new Error('Fallo de Storage aislado') } : { data: new Blob([fixture]), error: null }
    } }) },
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: owner ? { id: owner, is_anonymous: false } : null } }) },
    rpc: async (name: string, body: Record<string, unknown>) => { try { return { data: await f.rpc(name, body, owner!), error: null } } catch (error) { return { data: null, error } } },
    from: () => ({ select: () => ({ eq: (_column: string, id: string) => ({ single: async () => ({ data: { is_admin: id === adminId }, error: null }) }) }) }),
  }
  ;(globalThis as any).__safetyApi = { client, admin }
  async function load(entry: string, name: string) {
    const outfile = path.resolve('android/generated/android-12-handler-' + name + '.mjs')
    await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'isolated-auth-storage', setup(b) {
      b.onResolve({ filter: /^@\/lib\/supabase\/(api|admin)$/ }, args => ({ path: args.path, namespace: 'safety-double' }))
      b.onLoad({ filter: /.*/, namespace: 'safety-double' }, () => ({ contents: 'export const createApiClient=async()=>globalThis.__safetyApi.client; export const createAdminClient=()=>globalThis.__safetyApi.admin;' }))
    } }] })
    return import(pathToFileURL(outfile).href)
  }
  try {
    await f.db.query("insert into profiles(id,username,is_admin) values($1,'Admin de API',true)", [adminId])
    await f.rpc('accept_community_rules', { p_version: '2026-10-15' }, ids.B)
    await f.db.exec("update profiles set avatar_url='https://fixture.invalid/storage/v1/object/public/avatars/" + ids.B + "/fixture.png' where id='" + ids.B + "'")
    const report = await load('src/app/api/community/report/route.ts', 'report'), images = await load('src/app/api/community/report-images/route.ts', 'images')
    const request = () => new Request('http://localhost:3000/api/community/report', { method: 'POST', headers: { origin: 'https://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'profile', target: ids.B, reason: 'spam', detail: 'Ensayo de copia privada' }) })
    owner = null; assert.equal((await report.POST(request())).status, 401)
    owner = ids.A
    const response = await report.POST(request()), body = await response.json()
    assert.equal(response.status, 200); assert.equal(body.imageWarning, false)
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost')
    const stored = (await f.db.query<{ media: any[] }>('select media from community_safety.reports where id=$1', [body.id])).rows[0].media
    assert.equal(stored.length, 1); assert.equal(stored[0].type, 'image/jpeg'); assert.ok(Buffer.from(stored[0].data, 'base64').length > 0)
    await report.POST(request()); assert.equal(downloads, 1)
    const imageRequest = () => new Request('http://localhost:3000/api/community/report-images?id=' + body.id, { headers: { origin: 'https://localhost' } })
    assert.equal((await images.GET(imageRequest())).status, 403)
    await assert.rejects(() => f.asUser(ids.A, () => f.db.query('select public.community_report_media($1)', [body.id])), /permission denied/)
    owner = adminId
    const picture = await images.GET(imageRequest()); assert.equal(picture.status, 200); assert.equal((await picture.json()).images[0].data, stored[0].data)
    owner = ids.A; failImage = true
    await f.rpc('community_safety_state', {}, ids.B)
    await f.db.exec("update profiles set avatar_url='https://fixture.invalid/storage/v1/object/public/avatars/" + ids.B + "/otra.png' where id='" + ids.B + "'")
    const failedCopy = await report.POST(request()); assert.equal(failedCopy.status, 200); assert.equal((await failedCopy.json()).imageWarning, true)
    assert.equal((await f.db.query('select * from community_safety.reports')).rows.length, 2)
    const hostile = new Request('http://localhost:3000/api/community/report', { method: 'POST', headers: { origin: 'https://otro.invalid' } })
    assert.equal((await report.POST(hostile)).status, 403)
    const passed = ['handler real con sesión exigida y CORS', 'copia JPEG privada desde Storage propio; reintento no la duplica', 'imagen sólo para admin; RPC privada rechaza al cliente', 'fallo de imagen conserva texto y avisa; contenido cambiado permite nuevo caso']
    await writeFile('android/generated/android-12-api.json', JSON.stringify({ environment: 'Handlers reales + PGlite; Auth y Storage simulados, sin consultas remotas', passed }, null, 2)); console.log('OK', passed)
  } finally { process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl; delete (globalThis as any).__safetyApi; await f.db.close() }
}
void main().catch(error => { console.error(error.stack); process.exitCode = 1 })
