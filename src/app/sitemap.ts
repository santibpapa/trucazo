import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const LAST_UPDATED = '2026-08-15'

const routes: { path: string; priority: number; frequency: 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '', priority: 1, frequency: 'weekly' },
  { path: '/como-se-juega-al-truco', priority: 0.9, frequency: 'monthly' },
  { path: '/jugar-al-truco-online-gratis', priority: 0.9, frequency: 'monthly' },
  { path: '/orden-cartas-truco', priority: 0.9, frequency: 'monthly' },
  { path: '/calculadora-envido', priority: 0.9, frequency: 'monthly' },
  { path: '/envido-real-envido-falta-envido', priority: 0.8, frequency: 'monthly' },
  { path: '/pardas-truco-reglas', priority: 0.8, frequency: 'monthly' },
  { path: '/truco-dos-jugadores', priority: 0.8, frequency: 'monthly' },
  { path: '/jugar-truco-sin-registrarse', priority: 0.8, frequency: 'monthly' },
  { path: '/jugar-truco-con-amigos', priority: 0.8, frequency: 'monthly' },
  { path: '/truco-contra-computadora', priority: 0.8, frequency: 'monthly' },
  { path: '/modo-historia-truco', priority: 0.8, frequency: 'monthly' },
  { path: '/acerca-de-trucazo', priority: 0.5, frequency: 'yearly' },
  { path: '/contacto', priority: 0.4, frequency: 'yearly' },
  { path: '/privacidad', priority: 0.3, frequency: 'yearly' },
  { path: '/terminos', priority: 0.3, frequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(route => ({
    url: SITE_URL + route.path,
    lastModified: LAST_UPDATED,
    changeFrequency: route.frequency,
    priority: route.priority,
  }))
}
