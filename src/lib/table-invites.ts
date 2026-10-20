export const INVITE_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function invitationPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const token = value.startsWith('/invitar/') ? value.slice('/invitar/'.length) : value
  return INVITE_TOKEN.test(token) ? `/invitar/${token.toLowerCase()}` : null
}

// Sólo destinos conocidos: nunca aceptar una URL externa desde next o una cookie.
export function authDestination(value: unknown): string {
  if (value === '/android' || value === '/eliminar-cuenta') return value
  return invitationPath(value) ?? '/lobby'
}

export function invitationAuthLink(page: '/login' | '/register', next: unknown): string {
  const destination = invitationPath(next)
  return destination ? `${page}?next=${encodeURIComponent(destination)}` : page
}

export interface TableInvitePreview {
  mode: '1v1' | '2v2'
  name: string
  creator_username: string
  bet: number
  target_score: number
  time_limit: number
  occupied: number
  capacity: number
  available: boolean
  destination: string | null
}
