import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Fecha del último cambio real de cada página. Google confía más en un dato
// estable que en "la fecha de hoy" (que cambiaba en cada publicación). Cuando
// le cambies el contenido a una página, actualizá SU fecha (dejá las otras).
const LASTMOD = {
  home: '2026-07-15',
  comoSeJuega: '2026-07-15',
  jugarGratis: '2026-07-15',
}

// sitemap.xml: la lista de páginas que le proponemos a Google para indexar.
// Solo van las páginas públicas (la app detrás del login no se indexa).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LASTMOD.home,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/como-se-juega-al-truco`,
      lastModified: LASTMOD.comoSeJuega,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jugar-al-truco-online-gratis`,
      lastModified: LASTMOD.jugarGratis,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
