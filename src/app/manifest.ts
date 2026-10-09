import type { MetadataRoute } from 'next'

// Ficha de la app para poder "instalarla" en el celular/compu (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Conserva la identidad de las instalaciones existentes aunque luego
    // Android use una entrada distinta de la portada.
    id: '/',
    name: 'Trucazo',
    short_name: 'Trucazo',
    description: 'Truco argentino online, gratis, 1 contra 1 o en parejas. El de siempre, como siempre.',
    start_url: '/',
    scope: '/',
    lang: 'es-AR',
    display: 'standalone',
    background_color: '#1A0F10',
    theme_color: '#1A0F10',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
