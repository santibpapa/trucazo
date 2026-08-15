import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import AppRuntime from '@/components/AppRuntime'
import { SITE_URL, GOOGLE_SITE_VERIFICATION } from '@/lib/site'
import './globals.css'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  // Base para armar URLs absolutas (canónicas, imágenes, etc.).
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Trucazo — Truco argentino online, gratis y 1 contra 1',
    // Las demás páginas se ven como "Lobby · Trucazo", "Tienda · Trucazo", etc.
    template: '%s · Trucazo',
  },
  description:
    'Jugá al truco argentino online, gratis y sin descargar nada. Partidas 1 contra 1 a 15 o 30 puntos, con envido y truco, contra personas o la computadora.',
  applicationName: 'Trucazo',
  authors: [{ name: 'Trucazo' }],
  creator: 'Trucazo',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: SITE_URL,
    siteName: 'Trucazo',
    title: 'Trucazo — Truco argentino online, gratis y 1 contra 1',
    description:
      'Jugá al truco argentino online, gratis y sin descargar nada. Partidas 1 contra 1 contra personas o la computadora.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trucazo — Truco argentino online',
    description:
      'Jugá al truco argentino online, gratis y 1 contra 1. El de siempre, como siempre.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Verificación de Google Search Console (se completa con la variable de Vercel).
  verification: { google: GOOGLE_SITE_VERIFICATION },
  // La app ya es oscura de fábrica: este "candado" hace que la extensión
  // Dark Reader se desactive sola acá (si no, re-pinta y rompe los colores).
  other: { 'darkreader-lock': '' },
}

// Declara la app como oscura (emite <meta name="color-scheme" content="dark">).
// Es la señal estándar para que el navegador NO auto-oscurezca/invierta la web.
// viewportFit 'cover': en modo app (iPhone) el contenido usa toda la pantalla y el
// navegador expone las "zonas seguras" (notch, barra de inicio) vía env(safe-area-*),
// que usamos en el body y en la barra inferior del lobby para no quedar recortados.
export const viewport: Viewport = {
  colorScheme: 'dark',
  viewportFit: 'cover',
}

// Datos estructurados de marca: le dicen a Google quién es Trucazo (el sitio
// y la organización detrás). Aparecen en todas las páginas.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Trucazo',
  url: SITE_URL,
  inLanguage: 'es-AR',
}
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Trucazo',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description:
    'Proyecto argentino de truco online para jugar en el navegador contra personas o rivales controlados por computadora.',
  foundingLocation: {
    '@type': 'Country',
    name: 'Argentina',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    url: `${SITE_URL}/contacto`,
    contactType: 'Soporte',
    availableLanguage: 'es',
  },
  sameAs: ['https://github.com/santibpapa'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" className={geist.variable}>
      <body className="min-h-screen bg-base font-sans text-cream antialiased">
        {/* Datos estructurados de marca para Google (no se ven en pantalla) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* Runtime de la app: el guard de Supabase solo carga en rutas de juego. */}
        <AppRuntime />
        {children}
        {/* Métricas de velocidad reales (se ven en el panel de Vercel) */}
        <SpeedInsights />
        {/* Analítica de visitas y páginas (panel de Vercel) */}
        <Analytics />
      </body>
    </html>
  )
}
