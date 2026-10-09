import { NextRequest, NextResponse } from 'next/server'
import webPush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { parseProbeSubscription } from '@/lib/android-probe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function adminAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  return profile?.is_admin ? user : null
}

export async function GET() {
  const user = await adminAccount()
  if (!user) return json({ error: 'Esta prueba es solo para administradores.' }, 403)
  return json({ userId: user.id, publicKey: process.env.ANDROID_PROBE_VAPID_PUBLIC_KEY ?? null })
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return json({ error: 'Origen inválido.' }, 403)
  if (!await adminAccount()) return json({ error: 'Esta prueba es solo para administradores.' }, 403)
  const publicKey = process.env.ANDROID_PROBE_VAPID_PUBLIC_KEY
  const privateKey = process.env.ANDROID_PROBE_VAPID_PRIVATE_KEY
  const subject = process.env.ANDROID_PROBE_VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return json({ error: 'Falta configurar las claves de prueba.' }, 503)
  const body = await request.text()
  if (body.length > 4096) return json({ error: 'Suscripción inválida.' }, 400)
  let value: unknown
  try { value = JSON.parse(body) } catch { return json({ error: 'Suscripción inválida.' }, 400) }
  const subscription = parseProbeSubscription(value)
  if (!subscription) return json({ error: 'Usá la suscripción de Chrome del dispositivo de prueba.' }, 400)
  try {
    await webPush.sendNotification(subscription, JSON.stringify({ type: 'android-probe' }), {
      vapidDetails: { subject, publicKey, privateKey }, TTL: 60, timeout: 10_000,
    })
    // El proveedor aceptó el mensaje; verlo en el teléfono es una prueba aparte.
    return json({ accepted: true })
  } catch {
    return json({ error: 'No se pudo enviar. Revisá las claves o renová la suscripción.' }, 502)
  }
}
