import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { tournamentMail, type TournamentMailKind } from '@/lib/email/content'
import { createEmailAdminClient } from '@/lib/email/admin'
import { isConfirmedEmailRecipient } from '@/lib/email/recipients'
import { sendResendBatch } from '@/lib/email/resend'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const maxDuration = 60
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const KINDS: TournamentMailKind[] = ['announcement', 'registration', 'reminder', 'checkin', 'match', 'rescheduled', 'cancelled']

export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!UUID.test(id) || !UUID.test(token)) return NextResponse.json({ ok: false }, { status: 401 })
  const admin = createEmailAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })
  const { data: job, error } = await admin.from('tournament_email_jobs')
    .select('id,tournament_id,user_id,job_type,schedule_version,status,attempts,token,due_at,next_attempt_at,dedupe_key,audience')
    .eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!job || !job.user_id || !timingSafeEqual(Buffer.from(token), Buffer.from(job.token))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (job.status === 'sent' || job.status === 'cancelled') return NextResponse.json({ ok: true, sent: 0 })
  const now = new Date()
  if (new Date(job.due_at) > now || new Date(job.next_attempt_at) > now || job.attempts >= 6) {
    return NextResponse.json({ ok: true, busy: true })
  }
  const { data: lease, error: leaseError } = await admin.from('tournament_email_jobs')
    .update({ status: 'processing', attempts: job.attempts + 1,
      next_attempt_at: new Date(now.getTime() + 120_000).toISOString(), locked_at: now.toISOString() })
    .eq('id', id).eq('token', token).eq('attempts', job.attempts)
    .in('status', ['pending', 'failed', 'processing'])
    .lte('next_attempt_at', now.toISOString()).select('id').maybeSingle()
  if (leaseError) return NextResponse.json({ ok: false }, { status: 503 })
  if (!lease) return NextResponse.json({ ok: true, busy: true })

  const [tournament, preference, profile, authUser, delivery] = await Promise.all([
    admin.from('tournaments').select('name, starts_at, status, schedule_version, published_at').eq('id', job.tournament_id).single(),
    admin.from('email_preferences').select('tournaments_enabled, unsubscribe_token').eq('user_id', job.user_id).maybeSingle(),
    admin.from('profiles').select('username, is_bot').eq('id', job.user_id).maybeSingle(),
    admin.auth.admin.getUserById(job.user_id),
    admin.from('email_deliveries').select('status').eq('dedupe_key', job.dedupe_key).maybeSingle(),
  ])
  if (tournament.error || preference.error || profile.error || authUser.error || delivery.error) {
    await fail(admin, id, token, 'No se pudo verificar el destinatario.')
    return NextResponse.json({ ok: false }, { status: 503 })
  }
  const current = tournament.data
  const validStatus = job.job_type === 'cancelled' ? current?.status === 'cancelled'
    : job.job_type === 'match' ? current?.status === 'running'
      : current?.status === 'published'
  if (!current || current.schedule_version !== job.schedule_version || !validStatus
    || !current.published_at || !KINDS.includes(job.job_type as TournamentMailKind)) {
    await admin.from('tournament_email_jobs').update({ status: 'cancelled' }).eq('id', id).eq('token', token)
    return NextResponse.json({ ok: true, sent: 0 })
  }
  let matchSides: string[] | null = null
  if (job.job_type === 'match') {
    const matchId = (job.audience as { match_id?: string } | null)?.match_id
    if (!matchId || !UUID.test(matchId)) {
      await fail(admin, id, token, 'El cruce no tiene identificador válido.')
      return NextResponse.json({ ok: false }, { status: 503 })
    }
    const match = await admin.from('tournament_matches').select('status,entry_deadline,side_a_entry_id,side_b_entry_id')
      .eq('id', matchId).eq('tournament_id', job.tournament_id).maybeSingle()
    if (match.error) {
      await fail(admin, id, token, 'No se pudo verificar el cruce.')
      return NextResponse.json({ ok: false }, { status: 503 })
    }
    if (match.data?.status !== 'ready' || !match.data.entry_deadline
      || new Date(match.data.entry_deadline) <= now) {
      await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'La partida ya no está lista.' })
        .eq('id', id).eq('token', token)
      return NextResponse.json({ ok: true, skipped: 1 })
    }
    matchSides = [match.data.side_a_entry_id, match.data.side_b_entry_id].filter((side): side is string => !!side)
  }
  if (delivery.data?.status === 'sent') {
    await admin.from('tournament_email_jobs').update({ status: 'sent', sent_at: now.toISOString() }).eq('id', id).eq('token', token)
    return NextResponse.json({ ok: true, sent: 0 })
  }
  const recipient = authUser.data.user
  if (!preference.data?.tournaments_enabled || !profile.data || profile.data.is_bot
    || !recipient || !isConfirmedEmailRecipient(recipient)) {
    await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'Destinatario o preferencia no habilitados.' })
      .eq('id', id).eq('token', token)
    return NextResponse.json({ ok: true, skipped: 1 })
  }
  if (job.job_type !== 'announcement') {
    const membership = await admin.from('tournament_entry_members').select('entry_id')
      .eq('tournament_id', job.tournament_id).eq('user_id', job.user_id).eq('status', 'accepted')
    if (membership.error) {
      await fail(admin, id, token, 'No se pudo verificar la inscripción.')
      return NextResponse.json({ ok: false }, { status: 503 })
    }
    if (!membership.data?.length || (matchSides && !membership.data.some(member => matchSides.includes(member.entry_id)))) {
      await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'Inscripción retirada.' })
        .eq('id', id).eq('token', token)
      return NextResponse.json({ ok: true, skipped: 1 })
    }
    if (job.job_type === 'checkin') {
      const entryIds = membership.data.map(member => member.entry_id)
      const [entries, checkins] = await Promise.all([
        admin.from('tournament_entries').select('id').in('id', entryIds).eq('status', 'active'),
        admin.from('tournament_checkins').select('entry_id').in('entry_id', entryIds),
      ])
      if (entries.error || checkins.error) {
        await fail(admin, id, token, 'No se pudo verificar el check-in.')
        return NextResponse.json({ ok: false }, { status: 503 })
      }
      if (!entries.data?.length || checkins.data?.length) {
        await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'Check-in no necesario.' })
          .eq('id', id).eq('token', token)
        return NextResponse.json({ ok: true, skipped: 1 })
      }
    }
  }
  const key = process.env.RESEND_API_KEY
  if (!key) {
    await fail(admin, id, token, 'Falta configurar Resend.')
    return NextResponse.json({ ok: false }, { status: 503 })
  }
  const preferencesUrl = `${SITE_URL}/email/preferencias?token=${preference.data.unsubscribe_token}`
  const unsubscribeUrl = `${SITE_URL}/api/email/preferences?token=${preference.data.unsubscribe_token}`
  const content = tournamentMail({ kind: job.job_type as TournamentMailKind, username: profile.data.username,
    tournamentName: current.name, tournamentId: job.tournament_id, startsAt: current.starts_at, preferencesUrl })
  try {
    const { error: logError } = await admin.from('email_deliveries').upsert({
      user_id: job.user_id, kind: 'tournament', dedupe_key: job.dedupe_key,
      status: 'sending', updated_at: now.toISOString(), attempts: job.attempts + 1,
    }, { onConflict: 'dedupe_key' })
    if (logError) throw logError
    const latest = await admin.from('tournaments').select('status,schedule_version')
      .eq('id', job.tournament_id).single()
    if (latest.error) throw latest.error
    if (latest.data.schedule_version !== job.schedule_version
      || latest.data.status !== current.status) {
      await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'Agenda reemplazada.' })
        .eq('id', id).eq('token', token).throwOnError()
      await admin.from('email_deliveries').update({ status: 'skipped', last_error: 'Agenda reemplazada.' })
        .eq('dedupe_key', job.dedupe_key).throwOnError()
      return NextResponse.json({ ok: true, skipped: 1 })
    }
    const result = await sendResendBatch({ apiKey: key,
      from: process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>',
      mails: [{ to: recipient.email!, unsubscribeUrl, dedupeKey: job.dedupe_key, ...content }] })
    if (result.sent[0]) {
      const at = new Date().toISOString()
      await admin.from('email_deliveries').update({ status: 'sent', provider_id: result.sent[0].providerId,
        sent_at: at, updated_at: at, last_error: null }).eq('dedupe_key', job.dedupe_key).throwOnError()
      await admin.from('tournament_email_jobs').update({ status: 'sent', provider_id: result.sent[0].providerId,
        sent_at: at, last_error: null }).eq('id', id).eq('token', token).throwOnError()
      return NextResponse.json({ ok: true, sent: 1 })
    }
    if (result.skipped[0]) {
      await admin.from('email_deliveries').update({ status: 'skipped', last_error: result.skipped[0].reason.slice(0, 500) })
        .eq('dedupe_key', job.dedupe_key).throwOnError()
      await admin.from('tournament_email_jobs').update({ status: 'cancelled', last_error: 'Destinatario inválido.' })
        .eq('id', id).eq('token', token).throwOnError()
      return NextResponse.json({ ok: true, skipped: 1 })
    }
    throw new Error(result.failed[0]?.reason ?? 'Resend no aceptó el envío.')
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'No se pudo enviar el correo.'
    await admin.from('email_deliveries').update({ status: 'failed', last_error: reason.slice(0, 500) })
      .eq('dedupe_key', job.dedupe_key)
    await fail(admin, id, token, reason)
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}

async function fail(admin: NonNullable<ReturnType<typeof createEmailAdminClient>>, id: string, token: string, message: string) {
  await admin.from('tournament_email_jobs').update({ status: 'failed', last_error: message.slice(0, 500),
    next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq('id', id).eq('token', token)
}
