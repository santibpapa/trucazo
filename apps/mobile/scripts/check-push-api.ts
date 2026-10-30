import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { sendFcm, type PushJob } from '../../../src/lib/native-push/send'

async function main() {
  const passed: string[] = []
  const fixture = { authenticated: true, calls: [] as { name: string; args: unknown }[] }
  ;(globalThis as any).pushApiFixture = fixture
  const source = `import {GET,POST,OPTIONS} from './src/app/api/android/push/route';globalThis.pushHandlers={GET,POST,OPTIONS};`
  const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'ts' }, bundle: true,
    write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'push-auth', setup(b) {
      b.onResolve({ filter: /^@\/lib\/supabase\/api$/ }, a => ({ path: a.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: `export async function createApiClient(){const f=globalThis.pushApiFixture;return {
        auth:{getUser:async()=>({data:{user:f.authenticated?{id:'account-A',is_anonymous:false}:null}})},
        rpc:async(name,args)=>{f.calls.push({name,args});return {data:{available:true,preferences:{invite:true,checkin:true,match:true}},error:null}}}}` }))
    } }] })
  new Function('require', bundle.outputFiles[0].text)(createRequire(import.meta.url))
  const { GET, POST, OPTIONS } = (globalThis as any).pushHandlers
  const request = (body: unknown, origin = 'https://localhost') => new Request('https://www.trucazo.com.ar/api/android/push', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  fixture.authenticated = false
  assert.equal((await GET(request({}))).status, 401)
  assert.equal((await POST(request({ action: 'preferences', invite: true, checkin: true, match: true }))).status, 401)
  fixture.authenticated = true
  assert.equal((await POST(request({ action: 'preferences', invite: true, checkin: false, match: true }, 'https://evil.invalid'))).status, 403)
  assert.equal((await POST(request({ action: 'send', user: 'someone-else' }))).status, 400)
  assert.equal((await POST(request({ action: 'preferences', invite: 'true', checkin: false, match: true }))).status, 400)
  const response = await POST(request({ action: 'preferences', invite: true, checkin: false, match: true }))
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), 'https://localhost')
  assert.deepEqual(fixture.calls.at(-1), { name: 'native_push_preferences', args: { p_invite: true, p_checkin: false, p_match: true } })
  assert.equal((await OPTIONS(request({}))).status, 204)
  passed.push('sesión obligatoria, CORS, datos inválidos, sin elegir destinatario y preferencias independientes de email')

  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  process.env.ANDROID_PUSH_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'fixture-project', client_email: 'push@fixture.invalid',
    private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }) })
  const originalFetch = globalThis.fetch, sent: any[] = []
  let status = 200, details: unknown[] = []
  globalThis.fetch = (async (input, init) => {
    if (String(input).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'fixture-oauth', expires_in: 3600 })
    sent.push(JSON.parse(String(init?.body)))
    return Response.json(status === 200 ? { name: 'fixture-message' } : { error: { details } }, { status, headers: { 'retry-after': '120' } })
  }) as typeof fetch
  try {
    const job: PushJob = { id: 'fixture', lease: 'fixture', attempts: 1, token: 'fixture-device', data: {
      event: 'fixture-event', user: 'fixture-user', installation: 'fixture-installation', binding: 'fixture-binding', kind: 'invite',
      expires: String(Math.floor(Date.now() / 1000) + 300), title: 'Invitación', body: 'Prueba', path: '/comunidad',
    } }
    assert.equal((await sendFcm(job)).result, 'sent')
    assert.equal(sent[0].message.notification, undefined)
    assert.equal(sent[0].message.android.priority, 'high')
    assert.ok(parseInt(sent[0].message.android.ttl) <= 300)
    status = 429; assert.deepEqual(await sendFcm(job), { result: 'retry', delay: 120 })
    status = 503; assert.equal((await sendFcm(job)).result, 'retry')
    status = 404; details = [{ errorCode: 'UNREGISTERED' }]; assert.equal((await sendFcm(job)).result, 'invalid_token')
    status = 400; details = [{ errorCode: 'INVALID_ARGUMENT' }]; assert.equal((await sendFcm(job)).result, 'failed')
    const calls = sent.length
    assert.equal((await sendFcm({ ...job, data: { ...job.data, expires: '1' } })).result, 'failed')
    assert.equal(sent.length, calls)
    passed.push('FCM sólo datos, TTL, prioridad visible, límites 429/Retry-After, fallos temporales y baja sólo con token inválido')
  } finally { globalThis.fetch = originalFetch; delete process.env.ANDROID_PUSH_SERVICE_ACCOUNT_JSON }
  await writeFile('android/generated/android-13-api.json', JSON.stringify({ environment: 'Handlers y emisor reales, Auth/FCM simulados; clave RSA efímera', passed }, null, 2))
  console.log('OK', passed.join('; '))
}
void main().catch(error => { console.error(error.stack); process.exitCode = 1 })
