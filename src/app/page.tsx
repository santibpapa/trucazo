import Link from 'next/link'
import { Logo, CoinIcon, buttonClass } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import GoogleButton from '@/components/GoogleButton'
import InstallButton from '@/components/InstallButton'
import TrackedLink from '@/components/TrackedLink'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createPublicMetadata } from '@/lib/seo'

const description =
  'Jugá al truco argentino online desde el navegador. Partidas 1 contra 1, modo invitado, mesas con amigos y desafíos contra la computadora.'

export const metadata = createPublicMetadata({
  title: 'Trucazo — Truco argentino online, gratis y 1 contra 1',
  description,
  path: '/',
  type: 'website',
})

const productJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoGame',
      name: 'Trucazo',
      url: SITE_URL,
      description,
      genre: ['Juego de cartas', 'Estrategia', 'Multijugador'],
      gamePlatform: 'Navegador web',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web',
      inLanguage: 'es-AR',
      playMode: ['SinglePlayer', 'MultiPlayer'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ARS' },
    },
    {
      '@type': 'WebApplication',
      name: 'Trucazo',
      url: SITE_URL,
      description,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Cualquier sistema con navegador moderno',
      browserRequirements: 'Requiere JavaScript y un navegador moderno',
      inLanguage: 'es-AR',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ARS' },
    },
  ],
}

const learningLinks = [
  { href: '/como-se-juega-al-truco', label: 'Reglas completas', text: 'Empezá desde cero y entendé cada etapa de una mano.' },
  { href: '/orden-cartas-truco', label: 'Orden de las cartas', text: 'Consultá qué carta mata a cuál con una tabla clara.' },
  { href: '/calculadora-envido', label: 'Calculadora de envido', text: 'Elegí tus tres cartas y calculá el tanto al instante.' },
  { href: '/pardas-truco-reglas', label: 'Pardas', text: 'Resolvé quién gana cuando una o más bazas empatan.' },
]

export default function Home() {
  return (
    <main className="min-h-screen">
      <JsonLd data={productJsonLd} />

      <section className="min-h-[92vh] flex flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-5 animate-fade-up">
          <Logo size="lg" />
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-5xl text-balance">
              Truco argentino online, mano a mano y sin vueltas
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-muted">
              Jugá desde el navegador contra otras personas o la computadora. Entrá como
              invitado, creá una mesa con amigos o avanzá por el Modo Historia.
            </p>
          </div>
        </div>

        {/* data-md="skip": botones de acceso. No son contenido legible, así que
            la versión markdown para agentes los descarta. */}
        <div data-md="skip" className="flex w-full max-w-xs flex-col gap-3 animate-fade-up">
          <GuestButton
            variant="primary"
            size="lg"
            label="Jugar ahora sin registrarme"
            source="home_hero"
          />
          <TrackedLink
            href="/register"
            event="register_cta_click"
            source="home_hero"
            className={buttonClass('ghost', 'lg', true)}
          >
            Crear cuenta
          </TrackedLink>

          <div className="flex items-center gap-3 py-1 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
          </div>

          <GoogleButton variant="secondary" size="lg" />
          <Link href="/login" className={buttonClass('ghost', 'lg', true)}>
            Ya tengo cuenta
          </Link>
          <InstallButton />
        </div>

        <p className="inline-flex items-center gap-2 text-sm text-subtle animate-fade-up">
          Cada jugador nuevo arranca con
          <span className="inline-flex items-center gap-1.5 font-semibold text-gold">
            <CoinIcon size={14} /> 1.000 monedas ficticias
          </span>
        </p>
      </section>

      <div className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
        <section className="border-t border-line py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Qué es Trucazo</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">
            El truco que conocés, disponible en el celular o la computadora
          </h2>
          <div className="mt-6 grid gap-5 text-cream/90 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-lg font-bold text-gold">Partidas 1 contra 1</h3>
              <p className="mt-2 leading-relaxed">
                Elegí partidas a 15 o 30 puntos, con envido, real envido, falta envido,
                truco, retruco y vale cuatro. La variante de Trucazo se juega sin flor.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-lg font-bold text-gold">Personas, amigos o CPU</h3>
              <p className="mt-2 leading-relaxed">
                Buscá mesa, creá una partida privada para compartir o practicá contra
                rivales controlados por computadora.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-lg font-bold text-gold">Gratis y sin apuestas</h3>
              <p className="mt-2 leading-relaxed">
                Las monedas forman parte del juego: son ficticias, no se compran ni se
                convierten en dinero real.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Aprender</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream">
                Guías claras para sentarte a jugar
              </h2>
            </div>
            <Link href="/como-se-juega-al-truco" className="font-semibold text-gold hover:underline">
              Ver la guía completa →
            </Link>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {learningLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-gold/50"
              >
                <h3 className="font-display text-lg font-bold text-cream">{item.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gold/30 bg-gold-soft/30 px-6 py-10 text-center sm:px-10">
          <h2 className="font-display text-3xl font-bold text-cream">Elegí cómo querés jugar</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Podés entrar sin cuenta para probar una partida. Si te registrás, guardás tu
            perfil, monedas, historial, amistades y progreso del Modo Historia.
          </p>
          <nav className="mt-7 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <Link href="/jugar-truco-sin-registrarse" className="text-gold hover:underline">Sin registrarme</Link>
            <Link href="/jugar-truco-con-amigos" className="text-gold hover:underline">Con amigos</Link>
            <Link href="/truco-contra-computadora" className="text-gold hover:underline">Contra la computadora</Link>
            <Link href="/modo-historia-truco" className="text-gold hover:underline">Modo Historia</Link>
          </nav>
        </section>
      </div>

      <footer data-md="skip" className="border-t border-line px-5 py-7 text-sm text-subtle sm:px-8">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2">
          <Link href="/acerca-de-trucazo" className="hover:text-gold">Acerca de</Link>
          <Link href="/contacto" className="hover:text-gold">Contacto</Link>
          <Link href="/privacidad" className="hover:text-gold">Privacidad</Link>
          <Link href="/terminos" className="hover:text-gold">Términos</Link>
        </nav>
      </footer>
    </main>
  )
}
