import type { Metadata } from 'next'
import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Jugar al truco online gratis, 1 contra 1',
  description:
    'Jugá al truco argentino online, gratis y sin descargar nada. Partidas 1 contra 1 a 15 o 30 puntos, con envido y truco, contra rivales de verdad. Creá tu cuenta y sentate a la mesa.',
  alternates: { canonical: '/jugar-al-truco-online-gratis' },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/jugar-al-truco-online-gratis`,
    title: 'Jugar al truco online gratis, 1 contra 1',
    description:
      'Truco argentino online, gratis y sin descargar. 1 contra 1 contra rivales de verdad.',
  },
}

const razones: { titulo: string; texto: string }[] = [
  {
    titulo: 'Gratis y sin descargar',
    texto:
      'Se juega desde el navegador, en el celular o la compu. No hay que instalar ninguna app ni pagar nada.',
  },
  {
    titulo: '1 contra 1, contra rivales de verdad',
    texto:
      'Nada de bots aburridos: jugás mano a mano contra otra persona, en tiempo real.',
  },
  {
    titulo: 'El truco de siempre',
    texto:
      'Baraja española, envido, truco, retruco y vale cuatro. A 15 o 30 puntos, como en la mesa de tu casa.',
  },
  {
    titulo: 'Arrancás con 1.000 monedas',
    texto:
      'Cada jugador nuevo recibe 1.000 monedas ficticias para jugar. Sin plata real, solo por el gusto de ganar.',
  },
]

const faqs: { q: string; a: string }[] = [
  {
    q: '¿Es gratis jugar al truco en Trucazo?',
    a: 'Sí, es totalmente gratis. Se juega con monedas ficticias, no con dinero real, y no hace falta descargar ninguna aplicación.',
  },
  {
    q: '¿Necesito descargar una app?',
    a: 'No. Trucazo funciona directo desde el navegador del celular o la computadora. También podés «instalarlo» como app desde el navegador si querés el acceso directo.',
  },
  {
    q: '¿Contra quién juego?',
    a: 'Contra otra persona, 1 contra 1 y en tiempo real. Podés jugar contra alguien al azar o invitar a un amigo.',
  },
]

export default function JugarOnlinePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <SeoPageLayout
      title="Jugar al truco online gratis"
      intro="Truco argentino, 1 contra 1, gratis y sin descargar nada. El de siempre, como siempre: envido, truco y ganas de ganar. Sentate a la mesa en 30 segundos."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Section title="Por qué jugar en Trucazo">
        <div className="grid sm:grid-cols-2 gap-4">
          {razones.map(({ titulo, texto }) => (
            <div
              key={titulo}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <h3 className="font-semibold text-gold">{titulo}</h3>
              <p className="mt-1.5 text-cream/90 text-[15px] leading-relaxed">
                {texto}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cómo empezar">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>Creá tu cuenta gratis (o entrá con Google en un toque).</li>
          <li>Buscás partida y te sentás a la mesa contra un rival.</li>
          <li>Cantás envido, truco, y a llevarte los puntos.</li>
        </ol>
        <p className="mt-2">
          ¿No sabés las reglas o querés repasarlas?{' '}
          <Link
            href="/como-se-juega-al-truco"
            className="text-gold underline underline-offset-2 hover:text-gold-600"
          >
            Mirá cómo se juega al truco
          </Link>
          .
        </p>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="flex flex-col gap-5">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-cream">{q}</h3>
              <p className="mt-1 text-cream/90">{a}</p>
            </div>
          ))}
        </div>
      </Section>
    </SeoPageLayout>
  )
}
