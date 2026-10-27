import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'

export const OPTIONS = androidOptions
async function preferences(request: Request, write: boolean) {
  return withAndroidCors(request, async () => {
    const token = new URL(request.url).searchParams.get('token')
    let owner: string | undefined
    if (token !== null) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
        return androidResponse(request, { error: 'El enlace no es válido.' }, 404)
      }
    } else {
      const session = await createApiClient(request)
      const { data: { user } } = await session.auth.getUser()
      if (!user || user.is_anonymous) return androidResponse(request, { error: 'Entrá con tu cuenta.' }, 401)
      owner = user.id
    }
    const admin = createAdminClient()
    if (!admin) return androidResponse(request, { error: 'Servidor no disponible.' }, 503)
    const columns = 'news_enabled,reengagement_enabled,ranking_enabled,tournaments_enabled'
    let query
    if (write) {
      const body = await request.json().catch(() => null)
      const names = columns.split(',')
      if (!body || names.some(name => typeof body[name] !== 'boolean')) return androidResponse(request, { error: 'Preferencias inválidas.' }, 400)
      query = admin.from('email_preferences').update({ ...Object.fromEntries(names.map(name => [name, body[name]])), updated_at: new Date().toISOString() })
    } else query = admin.from('email_preferences').select(columns)
    const result = await (token !== null ? query.eq('unsubscribe_token', token) : query.eq('user_id', owner!)).select(columns).maybeSingle()
    if (result.error || !result.data) return androidResponse(request, { error: 'El enlace no es válido o no pudimos cargar las preferencias.' }, 404)
    return androidResponse(request, result.data)
  })
}
export function GET(request: Request) { return preferences(request, false) }
export function POST(request: Request) { return preferences(request, true) }
