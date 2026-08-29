import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  classifyAcquisition,
  describeUserAgent,
  isLikelyBot,
} from '@/lib/analytics/source'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENTS = new Set(['page_view', 'guest_session_started', 'register_completed', 'game_started'])

type Payload = {
  eventId?: unknown
  visitorId?: unknown
  sessionId?: unknown
  eventName?: unknown
  path?: unknown
  siteHost?: unknown
  referrerHost?: unknown
  utmSource?: unknown
  utmMedium?: unknown
  utmCampaign?: unknown
  utmContent?: unknown
  properties?: unknown
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent')
  if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 })

  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 8_192) return NextResponse.json({ error: 'Pedido demasiado grande.' }, { status: 413 })

  const body = await request.json().catch(() => null) as Payload | null
  const parsed = validate(body)
  if (!parsed) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })

  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  const admin = createAdminClient()
  if (!admin) return new NextResponse(null, { status: 204 })

  const acquisition = classifyAcquisition({
    utmSource: text(body?.utmSource, 80),
    utmMedium: text(body?.utmMedium, 80),
    utmCampaign: text(body?.utmCampaign, 120),
    utmContent: text(body?.utmContent, 120),
    referrerHost: text(body?.referrerHost, 160),
    siteHost: text(body?.siteHost, 160),
  })
  const agent = describeUserAgent(userAgent)
  const country = countryCode(request.headers.get('x-vercel-ip-country'))

  const { error } = await admin.rpc('record_analytics_event', {
    p_event_id: parsed.eventId,
    p_visitor_id: parsed.visitorId,
    p_session_id: parsed.sessionId,
    p_event_name: parsed.eventName,
    p_path: parsed.path,
    p_user_id: user?.id ?? null,
    p_source: acquisition.source,
    p_medium: acquisition.medium,
    p_campaign: acquisition.campaign,
    p_content: acquisition.content,
    p_referrer_host: acquisition.referrerHost,
    p_country_code: country,
    p_device_type: agent.device,
    p_browser: agent.browser,
    p_operating_system: agent.operatingSystem,
    p_properties: parsed.properties,
  })

  if (error) {
    console.error('No se pudo registrar analítica:', error.message)
    return new NextResponse(null, { status: 204 })
  }
  return new NextResponse(null, { status: 204 })
}

function validate(body: Payload | null) {
  if (!body) return null
  const eventId = uuid(body.eventId)
  const visitorId = uuid(body.visitorId)
  const sessionId = uuid(body.sessionId)
  const eventName = text(body.eventName, 40)
  const path = text(body.path, 300)
  if (!eventId || !visitorId || !sessionId || !eventName || !EVENTS.has(eventName)) return null
  if (!path?.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return null

  const rawProperties = body.properties
  const properties = rawProperties && typeof rawProperties === 'object' && !Array.isArray(rawProperties)
    ? Object.fromEntries(Object.entries(rawProperties).slice(0, 12).flatMap(([key, value]) => {
        if (typeof value === 'string') return [[key.slice(0, 40), value.slice(0, 160)]]
        if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
          return [[key.slice(0, 40), value]]
        }
        return []
      }))
    : {}
  if (JSON.stringify(properties).length > 2_000) return null

  return { eventId, visitorId, sessionId, eventName, path, properties }
}

function uuid(value: unknown) {
  return typeof value === 'string' && UUID.test(value) ? value : null
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null
}

function countryCode(value: string | null) {
  return value && /^[A-Z]{2}$/i.test(value) ? value.toUpperCase() : null
}
