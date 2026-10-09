import type { PushSubscription } from 'web-push'

// El prototipo de Android se prueba con Chrome/FCM. No aceptar una URL libre
// enviada por el cliente: el servidor no debe convertirse en un proxy HTTP.
export function parseProbeSubscription(value: unknown): PushSubscription | null {
  if (!value || typeof value !== 'object') return null
  const data = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (typeof data.endpoint !== 'string' || data.endpoint.length > 2048) return null
  try {
    const url = new URL(data.endpoint)
    if (url.protocol !== 'https:' || url.hostname !== 'fcm.googleapis.com'
      || url.port || url.username || url.password || url.hash
      || !/^\/(wp|fcm\/send)\/[A-Za-z0-9_:\-]+$/.test(url.pathname) || url.search) return null
  } catch { return null }
  const key = data.keys?.p256dh
  const auth = data.keys?.auth
  if (typeof key !== 'string' || typeof auth !== 'string'
    || !/^[A-Za-z0-9_-]{87}$/.test(key) || !/^[A-Za-z0-9_-]{22}$/.test(auth)) return null
  return { endpoint: data.endpoint, keys: { p256dh: key, auth } }
}

export function androidAssetLinks(packageId: string, fingerprints: string | undefined) {
  const values = (fingerprints ?? '').split(',').map(value => value.trim()).filter(Boolean)
  if (!values.length || !values.every(value => /^([A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(value))) return []
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: packageId, sha256_cert_fingerprints: Array.from(new Set(values.map(value => value.toUpperCase()))) },
  }]
}
