import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from './server'

// Un Authorization presente siempre manda: un token inválido nunca cae a cookies.
export async function createApiClient(request: Request) {
  const authorization = request.headers.get('authorization')
  if (authorization === null) return createClient()
  const token = authorization.match(/^Bearer (\S+)$/i)?.[1] ?? 'invalid'
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}
