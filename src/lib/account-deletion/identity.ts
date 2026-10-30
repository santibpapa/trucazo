import { createClient, type User } from '@supabase/supabase-js'

export const DELETION_CONFIRMATION = 'ELIMINAR'

export function validDeletionRequest(request: Request, body: unknown): body is { confirmation: string; password?: string; owner?: string } {
  const origin = request.headers.get('origin')
  const data = body as { confirmation?: unknown; password?: unknown; owner?: unknown } | null
  return (origin === new URL(request.url).origin
      || origin === 'https://localhost' && /^Bearer \S+$/i.test(request.headers.get('authorization') ?? ''))
    && request.headers.get('content-type')?.includes('application/json') === true
    && data?.confirmation === DELETION_CONFIRMATION
    && (data.owner === undefined || typeof data.owner === 'string' && /^[0-9a-f-]{36}$/i.test(data.owner))
    && (data.password === undefined || typeof data.password === 'string' && data.password.length <= 1024)
}

export function needsPassword(user: User) {
  return user.identities?.some(identity => identity.provider === 'email') === true
    && !user.identities.some(identity => identity.provider === 'google')
}

/** last_sign_in_at es de Auth, no de metadata editable ni del refresh del JWT. */
export function hasRecentSignIn(user: User, now = Date.now()) {
  const signedIn = Date.parse(user.last_sign_in_at ?? '')
  return Number.isFinite(signedIn) && signedIn <= now && now - signedIn < 10 * 60 * 1000
}

export function hasRecentGoogleSignIn(user: User, claims: { sub?: string; amr?: unknown } | undefined, now = Date.now()) {
  return claims?.sub === user.id && hasRecentSignIn(user, now) && Array.isArray(claims.amr)
    && claims.amr.some((entry: { method?: unknown; timestamp?: unknown }) => entry.method === 'oauth'
      && typeof entry.timestamp === 'number' && entry.timestamp * 1000 <= now && now - entry.timestamp * 1000 < 600000)
}

export async function verifyDeletionIdentity(user: User, password?: string, claims?: { sub?: string; amr?: unknown }) {
  if (needsPassword(user)) {
    if (!user.email || !password) return false
    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const result = await verifier.auth.signInWithPassword({ email: user.email, password })
    const valid = !result.error && result.data.user?.id === user.id
    if (result.data.session) await verifier.auth.signOut({ scope: 'local' })
    return valid
  }
  // La fecha global del usuario no acredita que ESTA sesión volvió a Google.
  return hasRecentGoogleSignIn(user, claims)
}
