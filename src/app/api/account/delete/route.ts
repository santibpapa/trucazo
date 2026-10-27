import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { androidOptions, withAndroidCors } from '@/lib/android-api'
import { createAdminClient } from '@/lib/supabase/admin'
import { validDeletionRequest, verifyDeletionIdentity } from '@/lib/account-deletion/identity'
import { processAccountDeletions } from '@/lib/account-deletion/process'

export const runtime = 'nodejs'
export const maxDuration = 60

export const OPTIONS = androidOptions
export function POST(request: Request) {
  return withAndroidCors(request, () => deleteAccount(request))
}
async function deleteAccount(request: Request) {
  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > 4096) return NextResponse.json({ ok: false }, { status: 413 })
  const body: unknown = (() => { try { return JSON.parse(rawBody) } catch { return null } })()
  if (!validDeletionRequest(request, body)) {
    return NextResponse.json({ ok: false, reason: 'confirmation' }, { status: 400 })
  }
  const supabase = await createApiClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || user.is_anonymous) {
    return NextResponse.json({ ok: false, reason: 'session' }, { status: 401 })
  }
  if (body.owner && body.owner !== user.id) return NextResponse.json({ ok: false, reason: 'account_changed' }, { status: 409 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ ok: false, reason: 'unavailable' }, { status: 503 })
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  const claims = await supabase.auth.getClaims(token)
  if (claims.error || !await verifyDeletionIdentity(user, body.password, claims.data?.claims)) {
    return NextResponse.json({ ok: false, reason: 'reauthenticate' }, { status: 403 })
  }
  // Nunca aceptar un id del navegador: sólo se borra la cuenta autenticada.
  const prepared = await admin.rpc('prepare_account_deletion', { p_user_id: user.id })
  if (prepared.error || typeof prepared.data !== 'string') {
    return NextResponse.json({ ok: false, reason: 'unavailable' }, { status: 503 })
  }
  let completed = false
  try {
    const result = await processAccountDeletions(admin, prepared.data)
    completed = result.completed === 1
  } catch {
    // La solicitud ya quedó guardada; el cron retoma incluso si esta función muere.
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  return NextResponse.json({ ok: true, status: completed ? 'deleted' : 'pending' }, { status: completed ? 200 : 202 })
}
