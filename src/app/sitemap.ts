import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// sitemap.xml: la lista de páginas que le proponemos a Google para indexar.
// Solo van las páginas públicas (la app detrás del login no se indexa).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/como-se-juega-al-truco`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jugar-al-truco-online-gratis`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
