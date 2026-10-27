import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadEmailAdmin } from '@/lib/email/admin-data'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'

export const OPTIONS = androidOptions
export function GET(request: Request) {
  return withAndroidCors(request, async () => {
    const session = await createApiClient(request)
    const { data: { user } } = await session.auth.getUser()
    if (!user || user.is_anonymous) return androidResponse(request, { error: 'Entrá con tu cuenta.' }, 401)
    const profile = await session.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile.data?.is_admin) return androidResponse(request, { error: 'Esta sección es sólo para administradores.' }, 403)
    const admin = createAdminClient()
    if (!admin) return androidResponse(request, { error: 'Servidor no disponible.' }, 503)
    try {
      return androidResponse(request, { ...await loadEmailAdmin(admin), sender: process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>' })
    } catch { return androidResponse(request, { error: 'No pudimos cargar los correos.' }, 503) }
  })
}
