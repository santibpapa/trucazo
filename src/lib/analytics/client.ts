'use client'

export type AnalyticsEvent =
  | 'page_view'
  | 'guest_session_started'
  | 'register_completed'
  | 'game_started'

type StoredSession = { id: string; lastSeen: number }

const VISITOR_KEY = 'trucazo:analytics-visitor'
const SESSION_KEY = 'trucazo:analytics-session'
const SESSION_TIMEOUT = 30 * 60 * 1000

export function trackFirstParty(
  eventName: AnalyticsEvent,
  properties: Record<string, string | number | boolean | null> = {},
) {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return

  const visitorId = storedUuid(VISITOR_KEY)
  const sessionId = activeSessionId()
  if (!visitorId || !sessionId) return

  const params = new URLSearchParams(window.location.search)
  const referrerHost = safeReferrerHost(document.referrer)
  const payload = {
    eventId: randomUuid(),
    visitorId,
    sessionId,
    eventName,
    path: window.location.pathname.slice(0, 300),
    siteHost: window.location.hostname,
    referrerHost,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    properties,
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}

function activeSessionId() {
  const now = Date.now()
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as StoredSession | null
    if (stored && isUuid(stored.id) && now - stored.lastSeen < SESSION_TIMEOUT) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: stored.id, lastSeen: now }))
      return stored.id
    }

    const id = randomUuid()
    if (!id) return null
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastSeen: now }))
    return id
  } catch {
    return null
  }
}

function storedUuid(key: string) {
  try {
    const current = localStorage.getItem(key)
    if (current && isUuid(current)) return current
    const id = randomUuid()
    if (!id) return null
    localStorage.setItem(key, id)
    return id
  } catch {
    return null
  }
}

function randomUuid() {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function safeReferrerHost(referrer: string) {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname
  } catch {
    return null
  }
}
