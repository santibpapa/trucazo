import { createApiClient } from '@/lib/supabase/api'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'
import { preserveReportImages } from '@/lib/report-images'
export const OPTIONS = androidOptions
export function POST(request: Request) {
  return withAndroidCors(request, async () => {
    const client = await createApiClient(request)
    const { data: { user } } = await client.auth.getUser()
    if (!user || user.is_anonymous) return androidResponse(request, { error: 'Entrá con una cuenta registrada.' }, 401)
    const body = await request.json().catch(() => null)
    if (!body || typeof body.kind !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.target ?? '')
      || typeof body.reason !== 'string' || typeof body.detail !== 'string' || body.detail.length > 1000) return androidResponse(request, { error: 'Revisá la denuncia.' }, 400)
    const result = await client.rpc('report_community_content', { p_kind: body.kind, p_target: body.target, p_reason: body.reason, p_detail: body.detail })
    if (result.error) return androidResponse(request, { error: result.error.message }, 400)
    let imageWarning = false
    try { await preserveReportImages(result.data) } catch { imageWarning = true }
    return androidResponse(request, { ok: true, id: result.data, imageWarning })
  })
}
