import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFcm, type PushJob } from '@/lib/native-push/send'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  const key = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1] || ''
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!uuid.test(id) || !uuid.test(key)) return json({ ok: false }, 401)
  const admin = createAdminClient()
  if (!admin) return json({ ok: false }, 503)
  const claim = await admin.rpc('native_push_claim', { p_id: id, p_key: key })
  if (claim.error) return json({ ok: false }, 503)
  if (!claim.data) return json({ ok: false }, 401)
  if (claim.data.skip) return json({ ok: true, skipped: true })
  const job = claim.data as PushJob
  let outcome: Awaited<ReturnType<typeof sendFcm>>
  try { outcome = await sendFcm(job) }
  catch { outcome = { result: 'retry', delay: 30 * 2 ** (job.attempts - 1) } }
  const saved = await admin.rpc('native_push_complete', { p_id: id, p_lease: job.lease,
    p_result: outcome.result, p_delay: Math.ceil(outcome.delay) })
  return json({ ok: !saved.error, accepted: outcome.result === 'sent' }, saved.error ? 503 : 200)
}
