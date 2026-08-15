import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Las páginas utilitarias y privadas pueden rastrearse para que los buscadores
// lean su meta noindex o su redirección al login. robots.txt no se usa como
// mecanismo de privacidad. Las APIs sí quedan fuera del rastreo.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
