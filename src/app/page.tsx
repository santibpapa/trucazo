import Link from 'next/link'
import { Logo, CoinIcon, buttonClass } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import GoogleButton from '@/components/GoogleButton'
import InstallButton from '@/components/InstallButton'
import { SITE_URL } from '@/lib/site'

// Datos estructurados: le dicen a Google (y a ChatGPT) que Trucazo es un juego.
const gameJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Trucazo',
  url: SITE_URL,
  description:
    'Truco argentino online, gratis y 1 contra 1, con envido y truco, contra rivales de verdad.',
  genre: ['Juego de cartas', 'Multijugador'],
  gamePlatform: 'Navegador web',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  inLanguage: 'es-AR',
  playMode: 'MultiPlayer',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'ARS' },
}

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-10 p-6 text-center">
      {/* Datos estructurados para Google (no se ven en pantalla) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }}
      />

      {/* Encabezado principal de la página, para Google y lectores de pantalla.
          No se ve (el logo grande cumple el rol visual), pero le da a la portada
          el <h1> descriptivo que antes le faltaba. */}
      <h1 className="sr-only">
        Trucazo — Truco argentino online, gratis y 1 contra 1
      </h1>

      <div className="flex flex-col items-center gap-5 animate-fade-up">
        <Logo size="lg" />
        <p className="text-muted max-w-xs text-balance">
          Truco argentino. El de siempre, como siempre. Sentate a la mesa.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-up">
        <Link href="/login" className={buttonClass('primary', 'lg', true)}>
          Iniciar sesión
        </Link>
        <Link href="/register" className={buttonClass('ghost', 'lg', true)}>
          Crear cuenta
        </Link>

        <div className="flex items-center gap-3 py-1 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
        </div>

        <GoogleButton variant="secondary" size="lg" />
        <GuestButton variant="ghost" size="lg" />
        <InstallButton />
      </div>

      <p className="inline-flex items-center gap-2 text-sm text-subtle animate-fade-up">
        Cada jugador nuevo arranca con
        <span className="inline-flex items-center gap-1.5 text-gold font-semibold">
          <CoinIcon size={14} /> 1.000
        </span>
      </p>

      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-subtle animate-fade-up">
        <Link href="/como-se-juega-al-truco" className="hover:text-gold transition-colors">
          Cómo se juega al truco
        </Link>
        <Link href="/jugar-al-truco-online-gratis" className="hover:text-gold transition-colors">
          Jugar al truco online gratis
        </Link>
      </nav>
    </main>
  )
}
