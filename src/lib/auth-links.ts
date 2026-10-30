import { invitationPath } from './table-invites'

// Sólo destinos del juego. Nunca aceptar una URL libre después de autenticarse.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const destination = new RegExp(`^/(game/(?:parejas/)?${UUID}|torneos(?:/${UUID}(?:/partidas/${UUID})?)?|lobby|historia(?:/offline)?|profile|ranking|tienda|android|eliminar-cuenta|comunidad|convivencia|resena(?:\\?game=${UUID})?|email/preferencias(?:\\?token=${UUID})?)$`, 'i')
export const MOBILE_SCHEME = 'ar.com.trucazo.capacitor.dev'
export const MOBILE_RELEASE_SCHEME = 'ar.com.trucazo.app'
export function authDestination(value: string | null | undefined): string | null {
  return invitationPath(value) ?? (value && destination.test(value) ? value : null)
}
export function authDestinationCookie(cookies: string): string | null {
  const value = cookies.split(';').map(value => value.trim()).find(value => value.startsWith('trucazo_auth_next='))?.slice('trucazo_auth_next='.length)
  try { return authDestination(value ? decodeURIComponent(value) : null) }
  catch { return null }
}
export function parseAppLink(value: string): { path: string; params: URLSearchParams } | null {
  try {
    const url = new URL(value)
    if (url.username || url.password || url.port) return null
    const native = [MOBILE_SCHEME + ':', MOBILE_RELEASE_SCHEME + ':'].includes(url.protocol) && url.hostname === 'auth' && url.pathname === '/callback'
    const web = url.protocol === 'https:' && ['www.trucazo.com.ar', 'trucazo.com.ar'].includes(url.hostname)
    if (native || (web && url.pathname === '/auth/mobile')) {
      const fragment = new URLSearchParams(url.hash.slice(1))
      if (url.hash && (!fragment.has('error') || Array.from(fragment.keys()).some(key => !['error', 'error_code', 'error_description'].includes(key)))) return null
      for (const key of ['error', 'error_code']) if (fragment.has(key)) url.searchParams.set(key, fragment.get(key)!)
      return { path: '/auth/mobile', params: url.searchParams }
    }
    if (web && url.pathname === '/email/preferencias' && !url.hash && url.searchParams.size === 1
      && url.searchParams.has('token') && authDestination(url.pathname + url.search)) return { path: url.pathname + url.search, params: url.searchParams }
    if (web && authDestination(url.pathname) && !url.search && !url.hash) return { path: url.pathname, params: url.searchParams }
  } catch { /* Enlace ajeno o mal formado. */ }
  return null
}
