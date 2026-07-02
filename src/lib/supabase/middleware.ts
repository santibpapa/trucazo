import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const privatePaths = ['/lobby', '/game', '/profile']
  const isPrivate = privatePaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isPrivate) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión de cuenta real, /login y /register redirigen al lobby (no hace
  // falta volver a entrar). Los INVITADOS (sesión anónima) sí pueden pasar: si
  // tocan "Iniciar sesión" es porque quieren entrar con su cuenta de verdad, y
  // al hacerlo la sesión de invitado se reemplaza.
  if (user && !user.is_anonymous && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/lobby'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}