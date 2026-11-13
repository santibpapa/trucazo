import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Logo, CoinIcon, buttonClass } from '@/components/ui'
import GuestButton from '@/components/GuestButton'
import GoogleButton from '@/components/GoogleButton'
import InstallButton from '@/components/InstallButton'
import TrackedLink from '@/components/TrackedLink'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createPublicMetadata } from '@/lib/seo'

const description =
  'Jugá al truco argentino online, gratis y sin descargar nada. Entrá sin registrarte y jugá 1 contra 1 o en parejas 2 vs 2, contra personas o la computadora.'

// El título arranca con la marca porque la mayoría de las visitas llegan
// buscando "trucazo", pero sigue con "Jugar al truco...": de las diez búsquedas
// que más nos muestran, cinco empiezan con "jugar". La portada es la única
// página que compite por esas, así que el verbo tiene que estar acá. "1 vs 1 y
// 2 vs 2" pasó a la descripción el 11/11: con eso el título llegaba a 65
// caracteres y Google lo mostraba cortado.
export const metadata = createPublicMetadata({
  title: 'Trucazo: jugar al truco argentino online gratis',
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
  { href: '/como-se-juega-al-truco', label: 'Reglas completas' },
  { href: '/orden-cartas-truco', label: 'Orden de las cartas' },
  { href: '/calculadora-envido', label: 'Calculadora de envido' },
  { href: '/pardas-truco-reglas', label: 'Pardas' },
  { href: '/envido-real-envido-falta-envido', label: 'Envido y sus cantos' },
  { href: '/como-ganar-al-truco', label: 'Cómo ganar al truco' },
]

const features = [
  { href: '/truco-en-parejas', title: 'Mano a mano o en parejas', text: '1 contra 1 o 2 vs 2, a 15 o 30 puntos, sin flor.' },
  { href: '/jugar-truco-con-amigos', title: 'Con amigos o contra la computadora', text: 'Mesa privada con código, o un rival de la casa si no hay nadie.' },
  { href: null, title: 'Torneos', text: 'Llave, cruces en vivo y podio. Para anotarte necesitás cuenta.' },
]

// Preguntas plegadas: ocupan una línea cada una y Google lee la respuesta
// igual, porque es un <details> real. Cada respuesta se comprobó contra el
// juego (detalle en docs/operacion.md#portada-2026-11-11).
const faqs: { q: string; a: ReactNode }[] = [
  {
    q: '¿Trucazo es gratis? ¿Las monedas valen plata?',
    a: 'Es gratis: no hay cobros ni suscripciones. Las monedas son ficticias. Se ganan jugando, no se compran con dinero real, no se pasan a otras personas ni se cambian por nada de valor. En la tienda sirven para personalizar tu perfil y tu mesa.',
  },
  {
    q: '¿Hay que descargar algo?',
    a: 'No. Se juega desde el navegador del celular o de la computadora. Si querés, podés instalarlo desde el mismo navegador para abrirlo con un toque, como una aplicación.',
  },
  {
    q: '¿Se juega con flor?',
    a: (
      <>
        No. Trucazo usa la variante sin flor, a 15 o 30 puntos, con envido, real envido,
        falta envido, truco, retruco y vale cuatro. Las{' '}
        <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">reglas completas</Link>{' '}
        explican cada canto.
      </>
    ),
  },
  {
    q: '¿Cómo juego con mis amigos?',
    a: (
      <>
        En el lobby creás una mesa privada, elegís mano a mano o en parejas, el puntaje y
        el tiempo por jugada, y compartís el código. En parejas, los lugares que falten se
        pueden completar con bots.{' '}
        <Link href="/jugar-truco-con-amigos" className="text-gold underline underline-offset-2">Paso a paso</Link>.
      </>
    ),
  },
  {
    q: '¿Qué pasa si se me corta internet?',
    a: 'La partida sigue. Cada jugada tiene 15 o 30 segundos, según la mesa: si se te vence, vas al mazo en esa mano, y al tercer vencimiento perdés la partida. Si volvés a entrar antes, seguís desde donde estabas.',
  },
  {
    q: '¿Cuánto dura una partida?',
    a: 'Depende del puntaje. En los mano a mano jugados entre octubre y noviembre de 2026, la mitad de las partidas a 15 puntos terminó en menos de 4 minutos, y la mitad de las de 30 puntos, en menos de 7.',
  },
  {
    q: '¿Qué es el Modo Historia?',
    a: (
      <>
        Una campaña mano a mano por 15 provincias, de Buenos Aires a Jujuy, contra 66
        rivales con nombre, cara y forma de jugar propias. Al ganar sumás monedas y puntos
        que abren provincias nuevas.{' '}
        <Link href="/modo-historia-truco" className="text-gold underline underline-offset-2">Ver el recorrido</Link>.
      </>
    ),
  },
  {
    q: '¿Necesito una cuenta?',
    a: 'Para probar, no: entrás como invitado. Con una cuenta guardás perfil, monedas, historial, amistades y progreso del Modo Historia, y podés anotarte en torneos. Si te registrás durante la visita de invitado, lo que jugaste pasa a tu cuenta.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen">
      <JsonLd data={productJsonLd} />

      <section className="min-h-[92vh] flex flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-5">
          <Logo size="lg" />
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-5xl text-balance">
              Jugá al truco argentino online, mano a mano o en parejas
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-muted">
              Jugá 1 contra 1 o 2 vs 2 desde el navegador, sin descargar nada, contra otras
              personas o la computadora. Entrá como invitado, creá una mesa con amigos o
              avanzá por el Modo Historia.
            </p>
          </div>
        </div>

        {/* data-md="skip": botones de acceso. No son contenido legible, así que
            la versión markdown para agentes los descarta. */}
        <div data-md="skip" className="flex w-full max-w-xs flex-col gap-3">
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

        <p className="inline-flex items-center gap-2 text-sm text-subtle">
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
            El truco que conocés, en el celular o la computadora
          </h2>

          <Link
            href="/modo-historia-truco"
            className="group relative mt-7 block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-gold/50"
          >
            <Image
              src="/lobby/banner-historia.webp"
              alt="Mapa del Modo Historia con un camino entre rivales que juegan al truco"
              width={2172}
              height={724}
              sizes="(min-width: 1024px) 976px, 100vw"
              className="aspect-[2/1] w-full object-cover object-left sm:aspect-[3/1]"
            />
            {/* En pantallas anchas el texto va sobre la mitad derecha del
                dibujo, que está vacía a propósito. */}
            <div className="p-5 sm:absolute sm:inset-y-0 sm:right-0 sm:flex sm:w-[44%] sm:flex-col sm:justify-center sm:p-8">
              <h3 className="font-display text-lg font-bold text-gold">Modo Historia</h3>
              <p className="mt-1 text-cream/90">
                Una campaña por 15 provincias y 66 rivales, cada uno con su forma de jugar.
              </p>
              <p data-md="skip" className="mt-2 text-sm font-semibold text-gold group-hover:underline">Ver el recorrido →</p>
            </div>
          </Link>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {features.map(item => {
              const body = (
                <>
                  <h3 className="font-display text-base font-bold text-cream">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                </>
              )
              return item.href ? (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-gold/50"
                >
                  {body}
                </Link>
              ) : (
                <div key={item.title} className="rounded-2xl border border-line bg-surface p-4">
                  {body}
                </div>
              )
            })}
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
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {learningLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-16 items-center rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:border-gold/50"
              >
                <h3 className="font-display text-base font-bold leading-snug text-cream">{item.label}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Dudas</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-cream">Preguntas frecuentes</h2>
          <div className="mt-7 divide-y divide-line rounded-2xl border border-line bg-surface">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-cream [&::-webkit-details-marker]:hidden">
                  <h3>{q}</h3>
                  <span aria-hidden="true" data-md="skip" className="shrink-0 text-xl leading-none text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-cream/90">{a}</p>
              </details>
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
            <Link href="/truco-en-parejas" className="text-gold hover:underline">En parejas (2 vs 2)</Link>
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
