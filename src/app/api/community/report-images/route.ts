import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'
export const OPTIONS = androidOptions
export function GET(request: Request) {
  return withAndroidCors(request, async () => {
    const client = await createApiClient(request)
    const { data: { user } } = await client.auth.getUser()
    if (!user || user.is_anonymous) return androidResponse(request, { error: 'No autorizado.' }, 401)
    const role = await client.from('profiles').select('is_admin').eq('id', user.id).single()
    if (role.error || !role.data?.is_admin) return androidResponse(request, { error: 'Sólo administradores.' }, 403)
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return androidResponse(request, { error: 'Denuncia inválida.' }, 400)
    const admin = createAdminClient()
    if (!admin) return androidResponse(request, { error: 'Servidor no disponible.' }, 503)
    const result = await admin.rpc('community_report_media', { p_report: id })
    if (result.error) return androidResponse(request, { error: 'Denuncia no encontrada.' }, 404)
    return androidResponse(request, { images: result.data.images })
  })
}
