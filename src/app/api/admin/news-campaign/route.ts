import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEmailAdminClient } from '@/lib/email/admin'

export async function PATCH(request: Request) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const admin = createEmailAdminClient()
  if (!admin) return NextResponse.json({ error: 'Servidor no disponible.' }, { status: 503 })
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const payload = await request.json().catch(() => null)
  if (typeof payload?.is_active !== 'boolean') {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  }
  const { error } = await admin.from('news_email_campaign').update({
    is_active: payload.is_active, updated_at: new Date().toISOString(),
  }).eq('id', true)
  if (error) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
