import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createEmailAdminClient } from '@/lib/email/admin'
import {
  getReengagementCandidate,
  type EmailActivity,
  type ReengagementCampaign,
} from '@/lib/email/candidates'
import { newsMail, reengagementMail } from '@/lib/email/content'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const maxDuration = 60

type News = {
  id: string
  title: string
  body: string
  created_at: string
  email_completed_at: string | null
}

type PendingMail = {
  userId: string
  to: string
  kind: 'news' | 'never_played' | 'inactive'
  newsId: string | null
  campaignId: string | null
  dedupeKey: string
  subject: string
  html: string
  text: string
  unsubscribeUrl: string
}

type ClaimedMail = PendingMail & { deliveryId: string }

const AUTH_PAGE_SIZE = 1000
const ACTIVITY_CHUNK_SIZE = 100
const DEFAULT_MAX_PER_RUN = 90

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Trucazo <hola@trucazo.com.ar>'
  const supabase = createEmailAdminClient()
  if (!resendKey || !supabase) {
    return NextResponse.json(
      { ok: false, reason: 'Faltan RESEND_API_KEY o las claves de Supabase' },
      { status: 503 },
    )
  }

  const users = await listConfirmedUsers(supabase)
  const activities = await loadActivities(supabase, users.map(user => user.id))
  const emailById = new Map(users.map(user => [user.id, user.email!]))
  const now = new Date()
  const maxPerRun = positiveInt(process.env.EMAIL_MAX_PER_RUN, DEFAULT_MAX_PER_RUN)

  const { data: newsRows, error: newsError } = await supabase
    .from('news')
    .select('id, title, body, created_at, email_completed_at')
    .eq('email_enabled', true)
    .is('email_completed_at', null)
    .order('created_at', { ascending: true })
  if (newsError) throw new Error(`No se pudieron cargar las novedades: ${newsError.message}`)

  const { data: campaigns, error: campaignsError } = await supabase
    .from('reengagement_campaigns')
    .select('id, name, audience, delay_days, subject, preview, heading, body, cta_label, cta_path, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('delay_days', { ascending: true })
  if (campaignsError) {
    throw new Error(`No se pudieron cargar las campañas: ${campaignsError.message}`)
  }

  const pending = buildPendingEmails(
    activities,
    emailById,
    (newsRows ?? []) as News[],
    (campaigns ?? []) as ReengagementCampaign[],
    now,
  )
  const claimed = await claimEmails(supabase, pending, maxPerRun)

  if (claimed.length === 0) {
    await markCompletedNews(supabase, (newsRows ?? []) as News[], activities)
    return NextResponse.json({ ok: true, sent: 0, candidates: pending.length })
  }

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey(claimed.map(mail => mail.dedupeKey).join('|')),
    },
    body: JSON.stringify(claimed.map(mail => ({
      from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: {
        'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': idempotencyKey(mail.dedupeKey),
      },
    }))),
  })

  const payload = await response.json().catch(() => null) as
    | { data?: { id: string }[]; message?: string }
    | null

  if (!response.ok || !payload?.data || payload.data.length !== claimed.length) {
    const reason = payload?.message ?? `Resend respondió ${response.status}`
    await markFailed(supabase, claimed, reason)
    return NextResponse.json({ ok: false, reason }, { status: 502 })
  }

  await Promise.all(claimed.map((mail, index) =>
    supabase
      .from('email_deliveries')
      .update({
        status: 'sent',
        provider_id: payload.data![index].id,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mail.deliveryId),
  ))
  await markCompletedNews(supabase, (newsRows ?? []) as News[], activities)

  return NextResponse.json({ ok: true, sent: claimed.length, candidates: pending.length })
}

async function listConfirmedUsers(supabase: ReturnType<typeof createEmailAdminClient> extends infer T ? NonNullable<T> : never) {
  const users: User[] = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    })
    if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`)

    users.push(...data.users.filter(user =>
      Boolean(user.email && user.email_confirmed_at && !user.is_anonymous),
    ))
    if (data.users.length < AUTH_PAGE_SIZE) return users
  }
}

async function loadActivities(
  supabase: ReturnType<typeof createEmailAdminClient> extends infer T ? NonNullable<T> : never,
  userIds: string[],
) {
  const rows: EmailActivity[] = []
  for (let i = 0; i < userIds.length; i += ACTIVITY_CHUNK_SIZE) {
    const { data, error } = await supabase.rpc('email_recipient_activity', {
      p_user_ids: userIds.slice(i, i + ACTIVITY_CHUNK_SIZE),
    })
    if (error) throw new Error(`No se pudo cargar la actividad: ${error.message}`)
    rows.push(...((data ?? []) as EmailActivity[]))
  }
  return rows
}

function buildPendingEmails(
  activities: EmailActivity[],
  emailById: Map<string, string>,
  newsRows: News[],
  campaigns: ReengagementCampaign[],
  now: Date,
) {
  const result: PendingMail[] = []

  for (const activity of activities) {
    const to = emailById.get(activity.user_id)
    if (!to) continue
    const preferencesUrl = `${SITE_URL}/email/preferencias?token=${activity.unsubscribe_token}`
    const unsubscribeUrl = `${SITE_URL}/api/email/preferences?token=${activity.unsubscribe_token}`

    if (activity.news_enabled) {
      for (const item of newsRows) {
        if (new Date(item.created_at) < new Date(activity.registered_at)) continue
        const content = newsMail({
          username: activity.username,
          preferencesUrl,
          title: item.title,
          body: item.body,
        })
        result.push({
          userId: activity.user_id,
          to,
          kind: 'news',
          newsId: item.id,
          campaignId: null,
          dedupeKey: `news:${activity.user_id}:${item.id}`,
          unsubscribeUrl,
          ...content,
        })
      }
    }

    for (const campaign of campaigns) {
      const reminder = getReengagementCandidate(activity, campaign, now)
      if (reminder) {
        const content = reengagementMail({
          username: activity.username,
          preferencesUrl,
          campaign,
        })
        result.push({
          userId: activity.user_id,
          to,
          kind: reminder.kind,
          newsId: null,
          campaignId: campaign.id,
          dedupeKey: reminder.dedupeKey,
          unsubscribeUrl,
          ...content,
        })
      }
    }
  }

  // Primero salen las novedades; el resto se procesa en próximas corridas si
  // el límite diario del proveedor no alcanza.
  return result
    .sort((a, b) => Number(b.kind === 'news') - Number(a.kind === 'news'))
}

async function claimEmails(
  supabase: ReturnType<typeof createEmailAdminClient> extends infer T ? NonNullable<T> : never,
  emails: PendingMail[],
  maxPerRun: number,
) {
  const { data, error } = await supabase.rpc('claim_email_deliveries', {
    p_jobs: emails.map(mail => ({
      user_id: mail.userId,
      kind: mail.kind,
      news_id: mail.newsId,
      campaign_id: mail.campaignId,
      dedupe_key: mail.dedupeKey,
    })),
    p_limit: maxPerRun,
  })
  if (error) throw new Error(`No se pudieron reclamar los envíos: ${error.message}`)

  const byKey = new Map(emails.map(mail => [mail.dedupeKey, mail]))
  return ((data ?? []) as { out_dedupe_key: string; delivery_id: string }[])
    .flatMap(row => {
      const mail = byKey.get(row.out_dedupe_key)
      return mail ? [{ ...mail, deliveryId: row.delivery_id }] : []
    }) satisfies ClaimedMail[]
}

async function markFailed(
  supabase: ReturnType<typeof createEmailAdminClient> extends infer T ? NonNullable<T> : never,
  emails: ClaimedMail[],
  reason: string,
) {
  const safeReason = reason.slice(0, 500)
  await Promise.all(emails.map(mail =>
    supabase
      .from('email_deliveries')
      .update({ status: 'failed', last_error: safeReason, updated_at: new Date().toISOString() })
      .eq('id', mail.deliveryId),
  ))
}

async function markCompletedNews(
  supabase: ReturnType<typeof createEmailAdminClient> extends infer T ? NonNullable<T> : never,
  newsRows: News[],
  activities: EmailActivity[],
) {
  for (const item of newsRows) {
    const expectedIds = activities.filter(activity =>
      activity.news_enabled &&
      new Date(activity.registered_at) <= new Date(item.created_at),
    ).map(activity => activity.user_id)

    let sent = 0
    let countFailed = false
    for (let i = 0; i < expectedIds.length; i += ACTIVITY_CHUNK_SIZE) {
      const { count, error } = await supabase
        .from('email_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('news_id', item.id)
        .eq('status', 'sent')
        .in('user_id', expectedIds.slice(i, i + ACTIVITY_CHUNK_SIZE))
      if (error) {
        countFailed = true
        break
      }
      sent += count ?? 0
    }
    if (countFailed || sent < expectedIds.length) continue

    await supabase
      .from('news')
      .update({ email_completed_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('email_completed_at', null)
  }
}

function idempotencyKey(dedupeKey: string) {
  return `trucazo-${createHash('sha256').update(dedupeKey).digest('hex')}`
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
