import { loginWithUsername } from '@/lib/login-username'
import { androidOptions, androidOriginAllowed, androidResponse } from '@/lib/android-api'

export const dynamic = 'force-dynamic'
export const OPTIONS = androidOptions

export async function POST(request: Request) {
  if (!androidOriginAllowed(request)) return androidResponse(request, { ok: false }, 403)
  const result = await loginWithUsername(request, 'tokens')
  return androidResponse(request, await result.json(), result.status)
}
