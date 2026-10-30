import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import manifest from '../../../../../public/android/historia/manifest.json'
import { createApiClient } from '@/lib/supabase/api'
import { androidOptions, androidOriginAllowed, androidResponse } from '@/lib/android-api'
import { canonical, CAMPAIGN_VERSION, type Snapshot } from '@/lib/offline-campaign/model'
import { BOTS_VERSION } from '@/lib/offline-trial/bots'
import { downloadAvatar } from '@/lib/offline-campaign/avatar'

export const dynamic = 'force-dynamic'
export const OPTIONS = androidOptions
export async function GET(request: NextRequest) {
  if (!androidOriginAllowed(request)) return androidResponse(request, { error: 'Origen no permitido.' }, 403)
  const supabase = await createApiClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  const respond = (body: unknown, status = 200) => androidResponse(request, body, status)
  if (error || !user || user.is_anonymous) return respond({ error: 'Entrá con tu cuenta.' }, 401)
  if (request.nextUrl.searchParams.get('identity') === '1') return respond({ userId: user.id })
  const [{ data, error: exportError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.rpc('prepare_offline_campaign'),
    supabase.from('profiles').select('username,avatar_url,active_salon,active_frame,active_medal,active_accessory').eq('id', user.id).single(),
  ])
  if (exportError) return respond({ error: 'La descarga completa todavía necesita la actualización del servidor.' }, 503)
  if (profileError || !profile) return respond({ error: 'No se pudo descargar tu perfil. Reintentá.' }, 503)
  const snapshot = data as Snapshot
  if (snapshot.userId !== user.id || snapshot.version !== CAMPAIGN_VERSION || snapshot.engine_version !== BOTS_VERSION || !snapshot.grant) {
    return respond({ error: 'Historia necesita actualizarse.' }, 409)
  }
  const hash = createHash('sha256').update(canonical(snapshot.catalog)).digest('hex')
  if (hash !== manifest.catalog_sha256) return respond({ error: 'El catálogo del servidor cambió. Actualizá Historia antes de descargar.' }, 409)
  try {
    snapshot.presentation = { ...profile, active_salon: profile.active_salon ?? 'clasico',
      avatar_url: await downloadAvatar(profile.avatar_url, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!) }
  } catch { return respond({ error: 'No se pudo descargar tu foto. Reintentá; se conserva el guardado anterior.' }, 503) }
  return respond(snapshot)
}
export async function POST(request: NextRequest) {
  if (!androidOriginAllowed(request)) return androidResponse(request, { error: 'Origen no permitido.' }, 403)
  const respond = (body: unknown, status = 200) => androidResponse(request, body, status)
  const supabase = await createApiClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || user.is_anonymous) return respond({ error: 'Entrá con tu cuenta.' }, 401)
  // No cargar una cola ilimitada en memoria; el mismo límite existe en SQL.
  let payload: { records?: unknown; complete?: boolean }
  try {
    const reader = request.body?.getReader()
    if (!reader) return respond({ error: 'Falta el registro de partidas.' }, 400)
    const parts: Uint8Array[] = []; let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 2 * 1024 * 1024) { await reader.cancel(); return respond({ error: 'Enviá menos partidas por vez.' }, 413) }
        parts.push(value)
      }
    } finally { reader.releaseLock() }
    payload = JSON.parse(Buffer.concat(parts).toString('utf8'))
    if (!payload || !Array.isArray(payload.records) || payload.records.length < 1 || payload.records.length > 10
      || typeof payload.complete !== 'boolean') return respond({ error: 'Registro de partidas no compatible.' }, 400)
  } catch { return respond({ error: 'No se pudo leer el registro de partidas.' }, 400) }
  const { data, error: syncError } = await supabase.rpc('sync_offline_campaign', { p_records: payload.records, p_complete: payload.complete })
  if (syncError) {
    const reason = syncError.message.match(/offline:(\w+)/)?.[1]
    if (reason) return respond({ error: reason === 'catalog' ? 'El catálogo cambió. Conservamos las partidas para revisar su versión.'
      : 'El servidor no pudo validar esta cola. Conservamos las partidas para revisarlas.', code: reason }, 409)
    return respond({ error: 'No se pudo confirmar el avance. Reintentá; las partidas siguen guardadas.' }, 503)
  }
  if (data?.snapshot && (data.snapshot.userId !== user.id || data.snapshot.version !== CAMPAIGN_VERSION
    || data.snapshot.engine_version !== BOTS_VERSION || !data.snapshot.grant)) return respond({ error: 'Confirmación no compatible. Se conserva el guardado.' }, 409)
  if (data?.snapshot && createHash('sha256').update(canonical(data.snapshot.catalog)).digest('hex') !== manifest.catalog_sha256) {
    return respond({ error: 'El catálogo cambió. Actualizá Historia; se conservan las partidas y sus comprobantes.' }, 409)
  }
  return respond(data)
}
