import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createEmailAdminClient } from '@/lib/email/admin'
import { processEmails } from '@/lib/email/process'

export const runtime = 'nodejs'
export const maxDuration = 60

// A per-publication capability, stored only in the service-role-only job table.
// The payload cannot select recipients, alter content, or run other campaigns.
export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const admin = createEmailAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })
  const { data: job, error } = await admin.from('news_email_jobs')
    .select('news_id, token, title, body, published_at, completed_at, next_attempt_at')
    .eq('news_id', id).maybeSingle()
  if (error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!job || !timingSafeEqual(Buffer.from(token), Buffer.from(job.token))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const [config, news] = await Promise.all([
    admin.from('news_email_campaign').select('is_active').eq('id', true).single(),
    admin.from('news').select('email_enabled, email_completed_at').eq('id', id).maybeSingle(),
  ])
  if (config.error || news.error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!config.data.is_active || !news.data?.email_enabled || job.completed_at) {
    return NextResponse.json({ ok: true, sent: 0 })
  }
  if (news.data.email_completed_at) {
    await admin.from('news_email_jobs').update({ completed_at: news.data.email_completed_at })
      .eq('news_id', id).throwOnError()
    return NextResponse.json({ ok: true, sent: 0 })
  }
  // Atomic lease: concurrent webhook/retry calls cannot run this job together.
  const now = new Date().toISOString()
  const lease = await admin.from('news_email_jobs')
    .update({ locked_until: new Date(Date.now() + 120_000).toISOString() })
    .eq('news_id', id).lte('locked_until', now).select('news_id').maybeSingle()
  if (lease.error) return NextResponse.json({ ok: false }, { status: 503 })
  if (!lease.data) return NextResponse.json({ ok: true, busy: true })
  try {
    const result = await processEmails({ id, title: job.title, body: job.body,
      created_at: job.published_at, email_completed_at: news.data.email_completed_at })
    const completed = await admin.from('news').select('email_completed_at').eq('id', id).single()
    if (completed.error) throw completed.error
    await admin.from('news_email_jobs').update({
      completed_at: completed.data.email_completed_at,
      locked_until: now,
      next_attempt_at: new Date(Date.now() + (result.ok ? 60_000 : 900_000)).toISOString(),
      last_error: result.ok ? null : 'El proveedor no pudo completar la tanda. Se reintentará.',
    }).eq('news_id', id).throwOnError()
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch {
    await admin.from('news_email_jobs').update({ locked_until: now,
      next_attempt_at: new Date(Date.now() + 900_000).toISOString(),
      last_error: 'No se pudo completar la tanda. Se reintentará.',
    }).eq('news_id', id)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
