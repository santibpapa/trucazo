import { NextResponse } from 'next/server'
import { createClient as createSupabaseServer } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// Entrar con NOMBRE DE USUARIO (el login con email no pasa por acá).
//
// Antes lo resolvía el navegador: le preguntaba a la base "¿cuál es el email de
// este usuario?" y después iniciaba sesión con ese email. El problema es que esa
// pregunta la podía hacer cualquiera, para cualquier usuario, y así se armaba la
// lista de usuario → email de todos los jugadores.
//
// Ahora lo resuelve el servidor con una llave privada que nunca sale de Vercel.
// El email no vuelve al navegador: acá mismo se inicia la sesión y se devuelve
// solamente "listo" o "no". Todos los errores contestan lo mismo, así que no se
// puede usar como detector de qué usuarios existen.

const VENTANA_MS = 60_000
const MAX_INTENTOS = 10

// Freno simple contra prueba y error. Vive en la memoria de esta instancia: no
// es una defensa fuerte (en serverless hay varias instancias y se reinician),
// es un techo barato. La defensa real la pone Supabase Auth, que limita los
// intentos de contraseña por su cuenta.
const intentos = new Map<string, { n: number; hasta: number }>()

function pasaElFreno(ip: string): boolean {
  const ahora = Date.now()
  const previo = intentos.get(ip)
  if (!previo || ahora > previo.hasta) {
    intentos.set(ip, { n: 1, hasta: ahora + VENTANA_MS })
    return true
  }
  previo.n += 1
  return previo.n <= MAX_INTENTOS
}

// Siempre la misma respuesta ante cualquier fallo: usuario inexistente,
// contraseña errada o formato inválido dan exactamente lo mismo.
function generico() {
  return NextResponse.json({ ok: false }, { status: 401 })
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sin-ip'
  if (!pasaElFreno(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 40) return generico()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Si todavía no se cargó la llave de servicio, avisamos distinto para que la
  // pantalla pueda decir "entrá con tu email" en vez de "contraseña incorrecta".
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, reason: 'sin-config' }, { status: 503 })
  }

  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: email, error } = await admin.rpc('get_login_email', { p_username: username })
  if (error || typeof email !== 'string' || !email) return generico()

  // La sesión se crea acá, del lado del servidor: deja las cookies puestas y el
  // navegador queda logueado sin haber visto nunca el email.
  const supabase = await createSupabaseServer()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return generico()

  return NextResponse.json({ ok: true })
}
