import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { PUBLIC_ROUTES } from '@/lib/routes'

export default function sitemap(): MetadataRoute.Sitemap {
  // La fecha sale de cada página (PUBLIC_ROUTES), no una sola para todo el
  // sitio: si no, una página nueva se anuncia con la fecha de las viejas.
  return PUBLIC_ROUTES.map(route => ({
    url: SITE_URL + route.path,
    lastModified: route.updated,
    changeFrequency: route.frequency,
    priority: route.priority,
  }))
}
