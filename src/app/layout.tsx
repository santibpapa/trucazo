import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import GuestSessionGuard from '@/components/GuestSessionGuard'
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
  title: 'Trucazo',
  description: 'Truco argentino online',
  // La app ya es oscura de fábrica: este "candado" hace que la extensión
  // Dark Reader se desactive sola acá (si no, re-pinta y rompe los colores).
  other: { 'darkreader-lock': '' },
}

// Declara la app como oscura (emite <meta name="color-scheme" content="dark">).
// Es la señal estándar para que el navegador NO auto-oscurezca/invierta la web.
export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-base font-sans text-cream antialiased">
        {/* Cierra sesiones de invitado heredadas de una visita anterior */}
        <GuestSessionGuard />
        {children}
        {/* Métricas de velocidad reales (se ven en el panel de Vercel) */}
        <SpeedInsights />
      </body>
    </html>
  )
}
