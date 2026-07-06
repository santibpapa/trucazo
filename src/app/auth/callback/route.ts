import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Página de vuelta del login con Google (y cualquier OAuth).
 * Google manda al usuario acá con un ?code=… ; lo canjeamos por una sesión,
 * nos aseguramos de que tenga perfil (con 1.000 monedas si es nuevo) y lo
 * mandamos al lobby.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // ¿Ya tiene perfil? (puede haberlo creado el trigger handle_new_user). Si no,
  // lo creamos con un nombre a partir del email y 1.000 monedas por defecto.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const base = (user.email?.split('@')[0] || 'Jugador').slice(0, 16)
    let created = false
    for (let i = 0; i < 6 && !created; i++) {
      const username = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`
      const { error: pErr } = await supabase
        .from('profiles')
        .insert({ id: user.id, username, coins: 1000 })
      if (!pErr) created = true
      else if (pErr.code !== '23505') break // error real: cortamos y mandamos al lobby igual
    }
  }

  return NextResponse.redirect(`${origin}/lobby`)
}
