import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { preferredRepresentation } from '@/lib/accept'
import { PUBLIC_PATHS, markdownSlug } from '@/lib/routes'

// Además de refrescar la sesión de Supabase, el middleware decide en qué formato
// servir las páginas públicas.
//
// Un agente de IA puede pedir la misma dirección con la cabecera
// "Accept: text/markdown" y recibir el texto sin la interfaz, en vez del HTML.
// Es la convención de acceptmarkdown.com. Las personas con navegador siguen
// recibiendo HTML exactamente igual que antes.

/** '/pardas-truco-reglas' → '/pardas-truco-reglas'; '/' → '' (como en routes.ts). */
function normalizarCamino(pathname: string): string {
  if (pathname === '/') return ''
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export async function middleware(request: NextRequest) {
  const camino = normalizarCamino(request.nextUrl.pathname)
  const esContenidoPublico = PUBLIC_PATHS.includes(camino)

  // El resto del sitio (lobby, partidas, perfil, APIs) no cambia en nada.
  if (!esContenidoPublico) {
    return await updateSession(request)
  }

  const formato = preferredRepresentation(request.headers.get('accept'))

  // El cliente pidió explícitamente algo que no sabemos producir y no dejó
  // alternativa. Corresponde decirlo, no mandarle HTML como si nada.
  if (formato === null) {
    return new NextResponse(
      'No puedo servir esta página en el formato pedido. Disponibles: text/html, text/markdown.\n',
      {
        status: 406,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          Vary: 'Accept',
        },
      },
    )
  }

  if (formato === 'markdown') {
    const destino = request.nextUrl.clone()
    destino.pathname = `/_md/${markdownSlug(camino)}.md`

    const respuesta = NextResponse.rewrite(destino)
    respuesta.headers.set('Content-Type', 'text/markdown; charset=utf-8')
    respuesta.headers.set('Vary', 'Accept')
    return respuesta
  }

  // HTML, el caso de siempre: nada cambia respecto de antes.
  //
  // NOTA sobre el "Vary: Accept" en las respuestas HTML. Lo ideal sería que también
  // lo llevaran, para avisarle a las cachés intermedias que esta dirección puede
  // devolver dos formatos distintos. No se puede: Next 14 escribe su propia
  // cabecera Vary ("RSC, Next-Router-State-Tree, ...") DESPUÉS del middleware y pisa
  // cualquier valor que pongamos acá. Se probó desde el middleware y desde
  // next.config: en los dos casos gana Next.
  //
  // Se podría forzar desde la configuración de Vercel, pero eso reemplazaría la
  // cabecera de Next y rompería su cacheo interno de navegación. No compensa.
  //
  // En la práctica el riesgo es chico: este middleware decide el formato en CADA
  // pedido y antes de la caché, así que la versión HTML y la markdown viven en
  // direcciones internas distintas y no pueden mezclarse. La versión markdown sí
  // lleva su "Vary: Accept", que es donde más importa.
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
