import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Página de vuelta del login con Google (y cualquier OAuth).
 * Google manda al usuario acá con un ?code=… ; lo canjeamos por una sesión,
 * nos aseguramos de que tenga perfil (con 1.000 monedas si es nuevo) y lo
 * mandamos al lobby.
 *
 * Importante: las cookies de sesión se escriben DIRECTO sobre la respuesta de
 * redirección (igual que en middleware.ts). Si se usa el helper de next/headers,
 * la cookie no viaja con el redirect y el usuario llega "sin sesión" al lobby.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Respuesta que devolvemos; el cliente de Supabase escribe las cookies acá.
  const response = NextResponse.redirect(`${origin}/lobby`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Igual que en middleware.ts: además de la respuesta, actualizamos las
          // cookies del request para que las llamadas de ESTE handler que vienen
          // después del canje (crear el perfil) ya salgan autenticadas. Sin esto,
          // el insert del perfil corría sin sesión y la RLS lo rechazaba.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`)
  }
  const user = data.user

  // Foto que Google nos comparte (si la tiene). Supabase la deja en user_metadata.
  const googlePhoto =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null

  // ¿Ya tiene perfil? (puede haberlo creado el trigger handle_new_user). Si no,
  // lo creamos con un nombre a partir del email y 1.000 monedas por defecto.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const base = (user.email?.split('@')[0] || 'Jugador').slice(0, 16)
    let created = false
    for (let i = 0; i < 6 && !created; i++) {
      const username = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`
      const { error: pErr } = await supabase
        .from('profiles')
        .insert({ id: user.id, username, coins: 1000, avatar_url: googlePhoto })
      if (!pErr) created = true
      else if (pErr.code !== '23505') break // error real: cortamos y mandamos al lobby igual
    }
  } else if (!existing.avatar_url && googlePhoto) {
    // Usuario de Google que ya existía sin foto: le ponemos la de Google por
    // defecto (no pisa una foto propia que ya haya subido). Vía función de
    // servidor porque profiles no permite UPDATE directo (RLS).
    await supabase.rpc('set_avatar_url', { p_url: googlePhoto })
  }

  return response
}
