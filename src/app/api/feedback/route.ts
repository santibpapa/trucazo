import { createApiClient } from '@/lib/supabase/api'
import { feedbackImageLinks } from '@/lib/feedback-images.mjs'
import { androidOptions, androidResponse, withAndroidCors } from '@/lib/android-api'

export const OPTIONS = androidOptions
export function POST(request: Request) {
  return withAndroidCors(request, async () => {
    const client = await createApiClient(request)
    const { data: { user } } = await client.auth.getUser()
    if (!user) return androidResponse(request, { error: 'Volvé a entrar para dejar tu reseña.' }, 401)
    const body = await request.json().catch(() => null)
    if (!body || ![body.general, body.aesthetics].every(n => Number.isInteger(n) && n >= 1 && n <= 5)
      || typeof body.understood !== 'boolean' || typeof body.hadProblem !== 'boolean'
      || typeof body.comment !== 'string' || body.comment.length > 2000 || !Array.isArray(body.paths)
      || body.paths.length > 3 || body.paths.some((p: unknown) => typeof p !== 'string'
        || !new RegExp('^' + user.id + '/[A-Za-z0-9._-]{1,100}\\.(jpg|jpeg|png|webp|gif)$').test(p))) {
      return androidResponse(request, { error: 'Revisá las puntuaciones, respuestas e imágenes.' }, 400)
    }
    const { error } = await client.rpc('submit_feedback', {
      p_rating_general: body.general, p_rating_aesthetics: body.aesthetics,
      p_understood: body.understood, p_had_problem: body.hadProblem, p_comment: body.comment, p_image_paths: body.paths,
    })
    if (error) return androidResponse(request, { error: error.message }, 400)
    // Web3Forms requiere el envío desde el navegador. El servidor prepara sólo
    // enlaces privados del autor; la clave del formulario es pública.
    const key = process.env.WEB3FORMS_ACCESS_KEY ?? process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
    let emailNotice: Record<string, string> | undefined
    if (key) {
      try {
        const images = await feedbackImageLinks(client.storage.from('feedback-images'), body.paths)
        emailNotice = { access_key: key, subject: 'Nueva reseña de Trucazo', from_name: 'Trucazo',
          'Puntuación general': `${body.general}/5`, 'Estética': `${body.aesthetics}/5`,
          'Entendió el desarrollo': body.understood ? 'Sí' : 'No', 'Tuvo problemas': body.hadProblem ? 'Sí' : 'No',
          'Comentario': body.comment.trim() || '(sin comentario)', 'Imágenes': images }
      } catch { /* La fuente oficial sigue siendo feedback. */ }
    }
    return androidResponse(request, { ok: true, emailNotice })
  })
}
