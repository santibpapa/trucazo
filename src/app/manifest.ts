import type { MetadataRoute } from 'next'

// Ficha de la app para poder "instalarla" en el celular/compu (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trucazo',
    short_name: 'Trucazo',
    description: 'Truco argentino online, gratis y 1 contra 1. El de siempre, como siempre.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1A0F10',
    theme_color: '#1A0F10',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
