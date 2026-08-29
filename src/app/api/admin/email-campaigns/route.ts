import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import { reengagementMail } from '@/lib/email/content'
import type { ReengagementKind } from '@/lib/email/candidates'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'

type CampaignInput = {
  name: string
  audience: ReengagementKind
  delay_days: number
  subject: string
  preview: string
  heading: string
  body: string
  cta_label: string
  cta_path: string
  is_active: boolean
}

export async function POST(request: Request) {
  const context = await requireAdmin()
  if (context instanceof NextResponse) return context

  const parsed = validateCampaign(await request.json().catch(() => null))
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { data, error } = await context.admin
    .from('reengagement_campaigns')
    .insert({ ...parsed.value, created_by: context.userId })
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: { ...data, sent: 0, failed: 0 } }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await requireAdmin()
  if (context instanceof NextResponse) return context

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null
  const id = typeof payload?.id === 'string' ? payload.id : ''
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'La campaña no es válida.' }, { status: 400 })
  }

  const parsed = validateCampaign(payload)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { data, error } = await context.admin
    .from('reengagement_campaigns')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}

export async function PUT(request: Request) {
  const context = await requireAdmin()
  if (context instanceof NextResponse) return context

  const parsed = validateCampaign(await request.json().catch(() => null))
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  if (!context.email) {
    return NextResponse.json(
      { error: 'Tu cuenta de administrador no tiene un email para recibir la prueba.' },
      { status: 400 },
    )
  }

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>'
  if (!resendKey) {
    return NextResponse.json({ error: 'Falta configurar Resend.' }, { status: 503 })
  }

  const { data: preferences } = await context.admin
    .from('email_preferences')
    .select('unsubscribe_token')
    .eq('user_id', context.userId)
    .maybeSingle()
  const preferencesUrl = preferences?.unsubscribe_token
    ? `${SITE_URL}/email/preferencias?token=${preferences.unsubscribe_token}`
    : `${SITE_URL}/admin/emails`
  const content = reengagementMail({
    username: context.username,
    preferencesUrl,
    campaign: {
      id: '00000000-0000-4000-8000-000000000000',
      ...parsed.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  })

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [context.email],
      subject: content.subject,
      html: content.html,
      text: content.text,
      headers: { 'X-Trucazo-Test': 'true' },
    }),
  })
  const payload = await response.json().catch(() => null) as
    | { id?: string; message?: string }
    | null
  if (!response.ok || !payload?.id) {
    return NextResponse.json(
      { error: payload?.message ?? `Resend respondió ${response.status}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, to: context.email })
}

async function requireAdmin() {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const admin = createEmailAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Falta configurar el servidor.' }, { status: 503 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, username')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  return {
    admin,
    userId: user.id,
    email: user.email ?? null,
    username: profile.username || 'Administrador',
  }
}

function validateCampaign(value: unknown): { value: CampaignInput } | { error: string } {
  if (!value || typeof value !== 'object') return { error: 'Faltan los datos de la campaña.' }
  const input = value as Record<string, unknown>
  const audience = input.audience
  const delayDays = Number(input.delay_days)

  if (audience !== 'never_played' && audience !== 'inactive') {
    return { error: 'Elegí a quién se envía la campaña.' }
  }
  if (!Number.isInteger(delayDays) || delayDays < 1 || delayDays > 365) {
    return { error: 'Los días de espera deben estar entre 1 y 365.' }
  }

  const fields = {
    name: cleanText(input.name, 80),
    subject: cleanText(input.subject, 180),
    preview: cleanText(input.preview, 200),
    heading: cleanText(input.heading, 180),
    body: cleanText(input.body, 4000),
    cta_label: cleanText(input.cta_label, 80),
    cta_path: cleanText(input.cta_path, 500),
  }
  if (!fields.name || !fields.subject || !fields.heading || !fields.body || !fields.cta_label) {
    return { error: 'Completá todos los campos obligatorios.' }
  }
  if (
    !fields.cta_path.startsWith('/') ||
    fields.cta_path.startsWith('//') ||
    fields.cta_path.includes('\\')
  ) {
    return { error: 'El destino del botón debe ser una ruta de Trucazo, por ejemplo /lobby.' }
  }

  return {
    value: {
      ...fields,
      audience,
      delay_days: delayDays,
      is_active: input.is_active === true,
    },
  }
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
