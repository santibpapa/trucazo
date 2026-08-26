import { NextResponse } from 'next/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import { SITE_URL } from '@/lib/site'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!UUID_PATTERN.test(token)) {
    return NextResponse.redirect(`${SITE_URL}/email/preferencias`, 303)
  }
  return NextResponse.redirect(`${SITE_URL}/email/preferencias?token=${token}`, 303)
}

export async function POST(request: Request) {
  const supabase = createEmailAdminClient()
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 })

  const url = new URL(request.url)
  const contentType = request.headers.get('content-type') ?? ''
  const form = contentType.includes('form') ? await request.formData() : null
  const token = url.searchParams.get('token') ?? form?.get('token')?.toString() ?? ''

  if (!UUID_PATTERN.test(token)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const oneClick = form?.get('List-Unsubscribe') === 'One-Click'
  const allOff = oneClick || form?.get('action') === 'all-off'
  const update = allOff
    ? { news_enabled: false, reengagement_enabled: false, updated_at: new Date().toISOString() }
    : {
        news_enabled: form?.get('news') === 'on',
        reengagement_enabled: form?.get('reengagement') === 'on',
        updated_at: new Date().toISOString(),
      }

  const { data, error } = await supabase
    .from('email_preferences')
    .update(update)
    .eq('unsubscribe_token', token)
    .select('user_id')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ ok: false }, { status: 404 })
  if (oneClick) return new Response(null, { status: 200 })

  return NextResponse.redirect(`${SITE_URL}/email/preferencias?token=${token}&guardado=1`, 303)
}
