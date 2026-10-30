import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validCompatibility } from '@/lib/app-compatibility'

// Bearer Android. Las lecturas y las vías de recuperación mantienen contrato v1.
// Las RPC directas se controlan además dentro de Postgres, por sesión Auth.
export async function checkApiCompatibility(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization || ['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null
  if (['/api/android/login', '/api/android/historia', '/api/account/delete', '/api/uploads/cleanup',
    '/api/analytics', '/api/community/report', '/api/community/report-images'].includes(new URL(request.url).pathname)) return null
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.rpc('app_compatibility')
  // La ruta conserva su respuesta normal para identidades inválidas.
  if (error && ['42501', 'PGRST301', 'PGRST303'].includes(error.code)) return null
  if (error || !validCompatibility(data)) return NextResponse.json({ error: 'No pudimos comprobar la versión. Reintentá.' }, { status: 503 })
  if (!data.compatible) return NextResponse.json({ code: 'app_update_required', error: 'Actualizá Trucazo para continuar.', updateUrl: data.updateUrl }, { status: 426 })
  return null
}
