import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// sitemap.xml: la lista de páginas que le proponemos a Google para indexar.
// Hoy la única con contenido público es la portada. Cuando sumemos páginas
// públicas (ej: "cómo se juega", "reglas del truco"), se agregan acá.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
