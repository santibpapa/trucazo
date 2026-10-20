import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import { rankingMail } from '@/lib/email/content'
import { isConfirmedEmailRecipient } from '@/lib/email/recipients'
import { sendResendBatch } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const maxDuration = 60

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const admin = createEmailAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })

  const { data: job, error } = await admin
    .from('ranking_email_jobs')
    .select('id, user_id, old_rank, new_rank, passed_by_username, token, status, attempts, next_attempt_at, locked_until, completed_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!job || !timingSafeEqual(Buffer.from(token), Buffer.from(job.token))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (job.completed_at) return NextResponse.json({ ok: true, sent: 0 })

  const [config, preference, profile, authUser] = await Promise.all([
    admin.from('ranking_email_campaign').select('is_active').eq('id', true).single(),
    admin.from('email_preferences').select('ranking_enabled, unsubscribe_token').eq('user_id', job.user_id).maybeSingle(),
    admin.from('profiles').select('username, is_bot, is_admin').eq('id', job.user_id).maybeSingle(),
    admin.auth.admin.getUserById(job.user_id),
  ])
  if (config.error || preference.error || profile.error || authUser.error) {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
  if (!config.data.is_active) return NextResponse.json({ ok: true, paused: true })

  const now = new Date()
  const nowIso = now.toISOString()
  const lease = await admin
    .from('ranking_email_jobs')
    .update({
      status: 'sending',
      attempts: job.attempts + 1,
      locked_until: new Date(now.getTime() + 120_000).toISOString(),
    })
    .eq('id', id)
    .eq('token', token)
    .is('completed_at', null)
    .in('status', ['pending', 'failed', 'sending'])
    .lte('locked_until', nowIso)
    .select('id')
    .maybeSingle()
  if (lease.error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!lease.data) return NextResponse.json({ ok: true, busy: true })

  const recipient = authUser.data.user
  if (
    !preference.data?.ranking_enabled
    || !profile.data
    || profile.data.is_bot
    || profile.data.is_admin
    || !recipient
    || !isConfirmedEmailRecipient(recipient)
  ) {
    await admin.from('ranking_email_jobs').update({
      status: 'skipped',
      completed_at: nowIso,
      locked_until: nowIso,
      last_error: 'Omitido: el destinatario no está habilitado.',
    }).eq('id', id).eq('token', token)
    return NextResponse.json({ ok: true, sent: 0, skipped: 1 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>'
  if (!resendKey) {
    await failJob(admin, id, token, 'Falta configurar Resend.')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const preferencesUrl = `${SITE_URL}/email/preferencias?token=${preference.data.unsubscribe_token}`
  const unsubscribeUrl = `${SITE_URL}/api/email/preferences?token=${preference.data.unsubscribe_token}`
  const content = rankingMail({
    username: profile.data.username,
    preferencesUrl,
    oldRank: job.old_rank as 1 | 2 | 3 | null,
    newRank: job.new_rank as 1 | 2 | 3 | null,
    passedByUsername: job.passed_by_username,
  })

  try {
    const result = await sendResendBatch({
      apiKey: resendKey,
      from,
      mails: [{
        to: recipient.email!,
        dedupeKey: `ranking:${job.id}`,
        unsubscribeUrl,
        ...content,
      }],
    })
    if (result.sent[0]) {
      await admin.from('ranking_email_jobs').update({
        status: 'sent',
        provider_id: result.sent[0].providerId,
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        locked_until: nowIso,
        last_error: null,
      }).eq('id', id).eq('token', token).throwOnError()
      return NextResponse.json({ ok: true, sent: 1, skipped: 0, failed: 0 })
    }
    if (result.skipped[0]) {
      await admin.from('ranking_email_jobs').update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
        locked_until: nowIso,
        last_error: `Omitido: ${result.skipped[0].reason}`.slice(0, 500),
      }).eq('id', id).eq('token', token).throwOnError()
      return NextResponse.json({ ok: true, sent: 0, skipped: 1, failed: 0 })
    }

    const reason = result.failed[0]?.reason ?? 'El proveedor no aceptó el correo.'
    await failJob(admin, id, token, reason)
    return NextResponse.json({ ok: false, sent: 0, skipped: 0, failed: 1 }, { status: 502 })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'No se pudo enviar el correo.'
    await failJob(admin, id, token, reason)
    return NextResponse.json({ ok: false, sent: 0, skipped: 0, failed: 1 }, { status: 503 })
  }
}

async function failJob(
  admin: NonNullable<ReturnType<typeof createEmailAdminClient>>,
  id: string,
  token: string,
  reason: string,
) {
  const now = new Date()
  await admin.from('ranking_email_jobs').update({
    status: 'failed',
    locked_until: now.toISOString(),
    next_attempt_at: new Date(now.getTime() + 15 * 60_000).toISOString(),
    last_error: reason.slice(0, 500),
  }).eq('id', id).eq('token', token)
}
