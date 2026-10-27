import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'

export const OPTIONS = androidOptions
export function POST(request: Request) {
  return withAndroidCors(request, async () => {
    const session = await createApiClient(request)
    const { data: { user } } = await session.auth.getUser()
    if (!user) return androidResponse(request, { error: 'No autorizado.' }, 401)
    const body = await request.json().catch(() => null)
    if (!body || !['avatars', 'feedback-images'].includes(body.bucket) || !Array.isArray(body.paths)
      || body.paths.length > 3 || body.paths.some((p: unknown) => typeof p !== 'string'
        || !new RegExp('^' + user.id + '/[A-Za-z0-9._-]{1,110}\\.(jpg|jpeg|png|webp|gif)$').test(p))) {
      return androidResponse(request, { error: 'Archivos inválidos.' }, 400)
    }
    const admin = createAdminClient()
    if (!admin) return androidResponse(request, { error: 'Servidor no disponible.' }, 503)
    const removable: string[] = []
    for (const path of body.paths as string[]) {
      if (body.bucket === 'feedback-images') {
        const result = await admin.from('feedback').select('id').contains('image_paths', [path]).limit(1)
        if (result.error) return androidResponse(request, { error: 'No pudimos comprobar el archivo.' }, 503)
        if (!result.data?.length) removable.push(path)
      } else {
        const result = await admin.from('profiles').select('avatar_url').eq('id', user.id).single()
        if (result.error) return androidResponse(request, { error: 'No pudimos comprobar tu foto.' }, 503)
        const url = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
        if (result.data.avatar_url !== url) removable.push(path)
      }
    }
    if (removable.length) {
      const { error } = await admin.storage.from(body.bucket).remove(removable)
      if (error) return androidResponse(request, { error: 'No pudimos retirar el archivo.' }, 503)
    }
    return androidResponse(request, { ok: true })
  })
}
