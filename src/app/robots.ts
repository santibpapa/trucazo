import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// robots.txt: le indica a Google (y a otros buscadores) qué puede recorrer.
// La portada "/" es la única página pública con contenido; el resto está detrás
// del login o son pantallas de la app, así que no tiene sentido indexarlas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/login',
        '/register',
        '/lobby',
        '/profile',
        '/tienda',
        '/comunidad',
        '/historia',
        '/resena',
        '/game/',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
