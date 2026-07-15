import type { Metadata } from 'next'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Cómo se juega al truco: reglas fáciles (envido y truco)',
  description:
    'Aprendé a jugar al truco argentino desde cero: el orden de las cartas, cómo se cuenta el envido, el truco, retruco y vale cuatro, y cómo se gana. Explicado simple, con ejemplos.',
  alternates: { canonical: '/como-se-juega-al-truco' },
  openGraph: {
    type: 'article',
    url: `${SITE_URL}/como-se-juega-al-truco`,
    title: 'Cómo se juega al truco: reglas fáciles',
    description:
      'El orden de las cartas, el envido, el truco y cómo se gana. Explicado simple, con ejemplos.',
  },
}

// Ranking real del juego (espejo de src/lib/truco.ts): de la más fuerte a la
// más débil. Se muestra como lista para que se entienda el orden.
const ranking: string[] = [
  '1 de espada (el «ancho de espada», la carta más fuerte)',
  '1 de basto (el «ancho de basto»)',
  '7 de espada',
  '7 de oro',
  'Los 3 (cualquier palo)',
  'Los 2 (cualquier palo)',
  '1 de oro y 1 de copa (los «anchos falsos»)',
  'Los 12 (rey)',
  'Los 11 (caballo)',
  'Los 10 (sota)',
  '7 de copa y 7 de basto',
  'Los 6',
  'Los 5',
  'Los 4 (las cartas más débiles)',
]

// Preguntas frecuentes → se usan en pantalla y también como datos
// estructurados (FAQ) para que Google pueda mostrarlas destacadas.
const faqs: { q: string; a: string }[] = [
  {
    q: '¿Con cuántas cartas se juega al truco?',
    a: 'Con la baraja española de 40 cartas, pero se sacan los 8 y los 9. A cada jugador se le reparten 3 cartas por mano.',
  },
  {
    q: '¿Cuál es la carta más fuerte del truco?',
    a: 'El 1 de espada, conocido como el «ancho de espada» o «el macho». Le siguen el 1 de basto, el 7 de espada y el 7 de oro.',
  },
  {
    q: '¿Cómo se cuenta el envido?',
    a: 'Si tenés dos cartas del mismo palo, sumás sus valores y le agregás 20 (las figuras 10, 11 y 12 valen 0). Si no tenés dos del mismo palo, vale tu carta más alta. El máximo es 33.',
  },
  {
    q: '¿A cuántos puntos se juega?',
    a: 'Se juega a 15 puntos (partida corta) o a 30 puntos (partida larga). El primero que llega, gana.',
  },
]

export default function ComoSeJuegaPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  // Migas de pan: le muestra a Google la ruta "Inicio › Cómo se juega al truco".
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Cómo se juega al truco',
        item: `${SITE_URL}/como-se-juega-al-truco`,
      },
    ],
  }

  return (
    <SeoPageLayout
      title="Cómo se juega al truco"
      intro="El truco es EL juego de cartas argentino: mentira, señas y aguante. Acá te lo explicamos desde cero, en criollo, para que en cinco minutos estés listo para sentarte a la mesa."
    >
      {/* Datos estructurados para Google (no se ven en pantalla) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Section title="Lo básico">
        <p>
          El truco se juega con la baraja española de 40 cartas, pero se sacan
          los 8 y los 9 (quedan 40 menos esos: los 1, 2, 3, 4, 5, 6, 7, 10, 11 y
          12 de cada palo). Se reparten <strong>3 cartas a cada jugador</strong>.
        </p>
        <p>
          La partida se juega a <strong>15 puntos</strong> (corta) o a{' '}
          <strong>30 puntos</strong> (larga). Gana el primero que llega. Los
          puntos se ganan con el <strong>envido</strong> y con el{' '}
          <strong>truco</strong>, que te explicamos abajo.
        </p>
      </Section>

      <Section title="El orden de las cartas (de la más fuerte a la más débil)">
        <p>
          En el truco las cartas no valen por su número: hay un orden especial
          que conviene aprender de memoria. Estas son, de la más fuerte a la más
          débil:
        </p>
        <ol className="flex flex-col gap-1.5">
          {ranking.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-gold font-semibold tabular-nums w-6 shrink-0">
                {i + 1}º
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="El envido">
        <p>
          El envido se canta al principio de la mano y compara los puntos que
          tenés con tus cartas. Se cuenta así:
        </p>
        <ul className="flex flex-col gap-1.5 list-disc pl-5">
          <li>
            Si tenés <strong>dos cartas del mismo palo</strong>: sumás sus
            valores y le agregás <strong>20</strong>.
          </li>
          <li>
            Las <strong>figuras (10, 11 y 12) valen 0</strong> para el envido.
          </li>
          <li>
            Si no tenés dos del mismo palo, vale <strong>tu carta más alta</strong>.
          </li>
        </ul>
        <p>
          Ejemplo: 5 y 6 de oro = 5 + 6 + 20 ={' '}
          <strong className="text-gold">31 de envido</strong>. El máximo posible
          es 33. El que tiene más puntos, gana el envido.
        </p>
      </Section>

      <Section title="El truco, el retruco y el vale cuatro">
        <p>
          El truco es la apuesta por ganar la mano. Se cantan por turnos y cada
          uno sube lo que está en juego:
        </p>
        <ul className="flex flex-col gap-1.5 list-disc pl-5">
          <li>
            <strong>Truco</strong>: vale 2 puntos.
          </li>
          <li>
            <strong>Retruco</strong> (lo sube el rival): vale 3 puntos.
          </li>
          <li>
            <strong>Vale cuatro</strong> (la última subida): vale 4 puntos.
          </li>
        </ul>
        <p>
          Cuando alguien canta, el otro puede <strong>querer</strong> (aceptar),{' '}
          <strong>no querer</strong> (se rinde y el otro se lleva los puntos) o{' '}
          <strong>subir la apuesta</strong>. Acá es donde entra el bluff: podés
          cantar truco con cartas malas para asustar al rival.
        </p>
      </Section>

      <Section title="Cómo se gana la mano">
        <p>
          Cada mano se juega en tres «vueltas»: en cada una, los dos tiran una
          carta y gana la más fuerte según el orden de arriba.{' '}
          <strong>El que gana dos de las tres vueltas, gana la mano</strong> y se
          lleva los puntos del truco.
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
