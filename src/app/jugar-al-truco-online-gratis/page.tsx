import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import GuestButton from '@/components/GuestButton'
import TrackedLink from '@/components/TrackedLink'
import JsonLd from '@/components/JsonLd'
import { buttonClass } from '@/components/ui'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/jugar-al-truco-online-gratis'
const title = 'Jugar al truco online gratis y sin descargar'
const description =
  'Jugá al truco argentino online gratis desde el navegador. Entrá sin registrarte, enfrentá personas o CPU y creá mesas privadas con amigos.'

export const metadata = createPublicMetadata({
  title,
  description,
  path,
  type: 'website',
})

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description,
  url: SITE_URL + path,
  inLanguage: 'es-AR',
  isPartOf: { '@type': 'WebSite', name: 'Trucazo', url: SITE_URL },
  about: { '@type': 'VideoGame', name: 'Trucazo', url: SITE_URL },
}

const reasons = [
  {
    title: 'Sin descargar',
    text: 'Funciona en el navegador del celular o la computadora. También puede instalarse como PWA para tener un acceso directo.',
  },
  {
    title: 'Sin registro obligatorio',
    text: 'El modo invitado crea una sesión temporal y te lleva directo al lobby. Una cuenta sirve para conservar tu progreso.',
  },
  {
    title: 'Varias formas de jugar',
    text: 'Podés buscar rival, crear una mesa privada, practicar contra bots o avanzar por el Modo Historia.',
  },
  {
    title: 'Sin dinero real',
    text: 'Las monedas son ficticias y forman parte del juego. No se compran, no se retiran y no representan una apuesta real.',
  },
]

export default function JugarOnlinePage() {
  return (
    <SeoPageLayout
      title="Jugar al truco online gratis"
      breadcrumb="Jugar al truco online gratis"
      intro="Entrá desde el navegador y jugá una partida 1 contra 1. No necesitás descargar una aplicación ni crear una cuenta para probar Trucazo."
    >
      <JsonLd data={webPageJsonLd} />
      <JsonLd data={createBreadcrumbJsonLd('Jugar al truco online gratis', path)} />

      <section className="rounded-2xl border border-gold/30 bg-gold-soft/35 p-6 text-center">
        <h2 className="font-display text-2xl font-bold text-cream">Sentate a la mesa ahora</h2>
        <p className="mt-2 text-muted">
          El modo invitado es gratuito y temporal. Registrarte es opcional.
        </p>
        <div className="mx-auto mt-5 flex max-w-sm flex-col gap-3">
          <GuestButton
            variant="primary"
            size="lg"
            label="Jugar ahora sin registrarme"
            source="jugar_online_hero"
          />
          <TrackedLink
            href="/register"
            event="register_cta_click"
            source="jugar_online_hero"
            className={buttonClass('ghost', 'lg', true)}
          >
            Crear cuenta
          </TrackedLink>
        </div>
      </section>

      <Section title="Por qué jugar en Trucazo">
        <div className="grid gap-4 sm:grid-cols-2">
          {reasons.map(item => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-semibold text-gold">{item.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-cream/90">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cómo empezar">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>Entrá como invitado o iniciá sesión con tu cuenta.</li>
          <li>Usá “Jugar ya”, buscá una mesa o creá una partida privada.</li>
          <li>Elegí una partida a 15 o 30 puntos y jugá cada mano.</li>
        </ol>
        <p>
          Si todavía no conocés las reglas, empezá por{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">
            cómo se juega al truco
          </Link>
          . También podés consultar el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">
            orden de las cartas
          </Link>{' '}
          durante tus primeras partidas.
        </p>
      </Section>

      <Section title="Elegí tu modalidad">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/jugar-truco-sin-registrarse" className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Probar sin registro</h3>
            <p className="mt-1 text-sm text-muted">Entrá con un perfil temporal y conocé el lobby.</p>
          </Link>
          <Link href="/jugar-truco-con-amigos" className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Jugar con amigos</h3>
            <p className="mt-1 text-sm text-muted">Creá una mesa privada y compartí el código.</p>
          </Link>
          <Link href="/truco-contra-computadora" className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Jugar contra la CPU</h3>
            <p className="mt-1 text-sm text-muted">Practicá con bots sin esperar a otra persona.</p>
          </Link>
          <Link href="/modo-historia-truco" className="rounded-2xl border border-line bg-surface p-5 hover:border-gold/50">
            <h3 className="font-semibold text-cream">Modo Historia</h3>
            <p className="mt-1 text-sm text-muted">Recorré Argentina enfrentando rivales progresivos.</p>
          </Link>
        </div>
      </Section>

      <Section title="Qué guarda una cuenta">
        <p>
          El invitado sirve para probar el juego de inmediato. Una cuenta registrada
          conserva tu nombre, monedas, historial de partidas, amistades, personalización,
          medallas y progreso de campaña entre visitas.
        </p>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="font-semibold text-cream">¿Trucazo es realmente gratis?</h3>
            <p className="mt-1">Sí. Las monedas son ficticias y no se apuesta dinero real.</p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">¿Tengo que instalar una app?</h3>
            <p className="mt-1">No. Funciona en el navegador; instalar la PWA es opcional.</p>
          </div>
          <div>
            <h3 className="font-semibold text-cream">¿Siempre juego contra otra persona?</h3>
            <p className="mt-1">No. Hay partidas entre personas y modos contra rivales controlados por computadora.</p>
          </div>
        </div>
      </Section>
    </SeoPageLayout>
  )
}
