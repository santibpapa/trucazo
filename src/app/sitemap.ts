import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { PUBLIC_ROUTES } from '@/lib/routes'

const LAST_UPDATED = '2026-08-15'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(route => ({
    url: SITE_URL + route.path,
    lastModified: LAST_UPDATED,
    changeFrequency: route.frequency,
    priority: route.priority,
  }))
}
