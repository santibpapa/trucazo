import { createClient, type User } from '@supabase/supabase-js'

export const DELETION_CONFIRMATION = 'ELIMINAR'

export function validDeletionRequest(request: Request, body: unknown): body is { confirmation: string; password?: string } {
  const origin = request.headers.get('origin')
  const data = body as { confirmation?: unknown; password?: unknown } | null
  return origin === new URL(request.url).origin
    && request.headers.get('content-type')?.includes('application/json') === true
    && data?.confirmation === DELETION_CONFIRMATION
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

export async function verifyDeletionIdentity(user: User, password?: string) {
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
  return hasRecentSignIn(user)
}
