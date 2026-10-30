import { sign } from 'node:crypto'
import { readFile } from 'node:fs/promises'

export type PushJob = { id: string; lease: string; attempts: number; token: string; data: Record<string, string> }
type Credentials = { project_id: string; client_email: string; private_key: string }
let access: { token: string; until: number; project: string } | null = null

async function authorization() {
  if (access && access.until > Date.now()) return access
  const json = process.env.ANDROID_PUSH_SERVICE_ACCOUNT_JSON
    || (process.env.ANDROID_PUSH_SERVICE_ACCOUNT_FILE ? await readFile(process.env.ANDROID_PUSH_SERVICE_ACCOUNT_FILE, 'utf8') : '')
  if (!json) throw new Error('Falta configurar Firebase en el servidor.')
  const credentials = JSON.parse(json) as Credentials
  if (!/^[a-z0-9-]+$/.test(credentials.project_id) || !credentials.client_email || !credentials.private_key) throw new Error('Configuración Firebase inválida.')
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const content = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })
  const assertion = content + '.' + sign('RSA-SHA256', Buffer.from(content), credentials.private_key).toString('base64url')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(10000) })
  const result = await response.json()
  if (!response.ok || !result.access_token) throw new Error('Firebase no autorizó el envío.')
  access = { token: result.access_token, until: Date.now() + (Number(result.expires_in) - 60) * 1000, project: credentials.project_id }
  return access
}

export async function sendFcm(job: PushJob): Promise<{ result: 'sent' | 'retry' | 'failed' | 'invalid_token'; delay: number }> {
  const ttl = Math.floor(Number(job.data.expires) - Date.now() / 1000)
  if (ttl <= 0) return { result: 'failed', delay: 0 }
  const auth = await authorization()
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' },
    // Sólo datos: el servicio Android verifica cuenta, vigencia y duplicados antes de mostrar el aviso.
    body: JSON.stringify({ message: { token: job.token, data: job.data,
      android: { priority: 'high', ttl: ttl + 's', restricted_package_name: process.env.ANDROID_PUSH_PACKAGE_ID || 'ar.com.trucazo.capacitor.dev' } } }),
    signal: AbortSignal.timeout(10000),
  })
  if (response.ok) return { result: 'sent', delay: 0 }
  if (response.status === 401) access = null
  const result = await response.json().catch(() => ({}))
  console.error('Push FCM rechazado', { status: response.status, code: result.error?.status || 'unknown' })
  const unregistered = result.error?.details?.some((d: { errorCode?: string }) => d.errorCode === 'UNREGISTERED')
  const header = response.headers.get('retry-after')
  const retryAfter = header ? (/^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000) : 0
  return { result: unregistered ? 'invalid_token' : response.status === 429 || response.status >= 500 || response.status === 401 ? 'retry' : 'failed',
    delay: Math.max(response.status === 429 ? 60 : 15, Number.isFinite(retryAfter) ? retryAfter : 0, 15 * 2 ** (job.attempts - 1)) }
}
