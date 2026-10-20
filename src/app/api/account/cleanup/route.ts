import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processAccountDeletions } from '@/lib/account-deletion/process'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })
  try {
    const result = await processAccountDeletions(admin)
    return NextResponse.json({ ok: result.pending === 0, ...result }, { status: result.pending ? 502 : 200 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}

/** pg_cron llama una solicitud concreta; el token sólo vive en la cola privada. */
export async function POST(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(id) || !uuid.test(token)) return NextResponse.json({ ok: false }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 })
  const job = await admin.from('account_deletion_jobs').select('id').eq('id', id).eq('token', token).maybeSingle()
  if (job.error || !job.data) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const result = await processAccountDeletions(admin, id)
    return NextResponse.json({ ok: result.pending === 0, ...result }, { status: result.pending ? 502 : 200 })
  } catch { return NextResponse.json({ ok: false }, { status: 502 }) }
}
