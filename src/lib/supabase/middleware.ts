import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Red de seguridad para el login con Google (OAuth): a veces Supabase nos
  // devuelve el ?code=… a la raíz del sitio (Site URL) en vez de a la página de
  // vuelta. Si vemos un código en cualquier página que no sea /auth/callback,
  // lo reenviamos ahí para completar el login del lado del servidor.
  const oauthCode = request.nextUrl.searchParams.get('code')
  if (oauthCode && request.nextUrl.pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  const pathname = request.nextUrl.pathname
  const privatePaths = [
    '/admin',
    '/lobby',
    '/game',
    '/profile',
    '/ranking',
    '/tienda',
    '/comunidad',
    '/historia',
  ]
  const isPrivate = privatePaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`),
  )
  const isApi = pathname.startsWith('/api/') || pathname === '/auth/callback'
  const hasSupabaseSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))
  const mayRedirectAuthenticatedUser = ['/', '/login', '/register'].includes(pathname)

  // Una visita nueva a contenido público no necesita tocar Supabase. Esto mantiene
  // rápidas e independientes las landings, guías, imágenes OG, sitemap y robots.
  // Si existe una cookie o la ruta es privada/API, sí refrescamos y validamos sesión.
  if (!isPrivate && !isApi && !(mayRedirectAuthenticatedUser && hasSupabaseSessionCookie)) {
    return NextResponse.next({ request })
  }

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

  if (!user && isPrivate) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión de cuenta real, la home, /login y /register redirigen al lobby
  // (no hace falta volver a entrar; si no, la home muestra botones de login a
  // alguien que ya entró). Los INVITADOS (sesión anónima) sí pueden pasar: si
  // tocan "Iniciar sesión" es porque quieren entrar con su cuenta de verdad, y
  // al hacerlo la sesión de invitado se reemplaza.
  if (user && !user.is_anonymous && mayRedirectAuthenticatedUser) {
    const url = request.nextUrl.clone()
    url.pathname = '/lobby'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
