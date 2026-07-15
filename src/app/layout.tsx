import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import GuestSessionGuard from '@/components/GuestSessionGuard'
import RegisterSW from '@/components/RegisterSW'
import { SITE_URL, GOOGLE_SITE_VERIFICATION } from '@/lib/site'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sora',
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
    'Jugá al truco argentino online, gratis y sin descargar nada. Partidas 1 contra 1 a 15 o 30 puntos, con envido y truco, contra rivales de verdad. El de siempre, como siempre.',
  applicationName: 'Trucazo',
  keywords: [
    'truco',
    'truco argentino',
    'truco online',
    'jugar al truco',
    'truco gratis',
    'truco 1 contra 1',
    'truco online argentina',
    'envido',
    'juego de cartas argentino',
  ],
  authors: [{ name: 'Trucazo' }],
  creator: 'Trucazo',
  // URL canónica: le dice a Google cuál es la dirección "oficial" de la portada.
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: SITE_URL,
    siteName: 'Trucazo',
    title: 'Trucazo — Truco argentino online, gratis y 1 contra 1',
    description:
      'Jugá al truco argentino online, gratis y sin descargar nada. Partidas 1 contra 1 contra rivales de verdad. El de siempre, como siempre.',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
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
        {/* Cierra sesiones de invitado heredadas de una visita anterior */}
        <GuestSessionGuard />
        {/* Registra el service worker (permite instalar la web como app) */}
        <RegisterSW />
        {children}
        {/* Métricas de velocidad reales (se ven en el panel de Vercel) */}
        <SpeedInsights />
      </body>
    </html>
  )
}
