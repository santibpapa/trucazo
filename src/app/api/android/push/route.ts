import { createApiClient } from '@/lib/supabase/api'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'

export const dynamic = 'force-dynamic'
export const OPTIONS = androidOptions

export async function GET(request: Request) {
  return withAndroidCors(request, async () => {
    const client = await createApiClient(request)
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user || user.is_anonymous) return androidResponse(request, { error: 'Entrá con tu cuenta.' }, 401)
    const { data, error } = await client.rpc('native_push_state')
    return androidResponse(request, error ? { error: 'No pudimos consultar tus avisos.' } : data, error ? 503 : 200)
  })
}

export async function POST(request: Request) {
  return withAndroidCors(request, async () => {
    const client = await createApiClient(request)
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user || user.is_anonymous) return androidResponse(request, { error: 'Entrá con tu cuenta.' }, 401)
    const raw = await request.text()
    if (raw.length > 8192) return androidResponse(request, { error: 'Solicitud inválida.' }, 400)
    let body
    try { body = JSON.parse(raw) } catch { return androidResponse(request, { error: 'Solicitud inválida.' }, 400) }
    if (!body || typeof body !== 'object') return androidResponse(request, { error: 'Solicitud inválida.' }, 400)
    const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
    let result
    if (body.action === 'preferences' && ['invite', 'checkin', 'match'].every(k => typeof body[k] === 'boolean')) {
      result = await client.rpc('native_push_preferences', { p_invite: body.invite, p_checkin: body.checkin, p_match: body.match })
    } else if (['register', 'unregister'].includes(body.action) && typeof body.installation === 'string' && uuid.test(body.installation)
      && typeof body.secret === 'string' && /^[0-9a-f]{64}$/.test(body.secret)) {
      const args = { p_installation: body.installation, p_secret: body.secret }
      if (body.action === 'unregister') result = await client.rpc('native_push_unregister', args)
      else if (typeof body.token === 'string' && body.token.length >= 30 && body.token.length <= 4096
        && typeof body.binding === 'string' && uuid.test(body.binding)) {
        result = await client.rpc('native_push_register', { ...args, p_token: body.token, p_binding: body.binding })
      }
    }
    if (!result) return androidResponse(request, { error: 'Solicitud inválida.' }, 400)
    return androidResponse(request, result.error ? { error: 'No pudimos guardar tus avisos. Reintentá.' } : { ok: true }, result.error ? 503 : 200)
  })
}
