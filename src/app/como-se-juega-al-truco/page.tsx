import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/como-se-juega-al-truco'
const title = 'Cómo se juega al truco argentino: reglas y ejemplos'
const description =
  'Aprendé las reglas del truco argentino: orden de cartas, envido, real envido, falta envido, pardas, mano, truco y puntajes.'

export const metadata = createPublicMetadata({ title, description, path })

const ranking = [
  '1 de espada (ancho de espada)',
  '1 de basto (ancho de basto)',
  '7 de espada',
  '7 de oro',
  'Todos los 3',
  'Todos los 2',
  '1 de oro y 1 de copa (anchos falsos)',
  'Todos los 12 (reyes)',
  'Todos los 11 (caballos)',
  'Todos los 10 (sotas)',
  '7 de copa y 7 de basto (sietes falsos)',
  'Todos los 6',
  'Todos los 5',
  'Todos los 4',
]

const faqs = [
  {
    q: '¿Con cuántas cartas se juega al truco?',
    a: 'Con un mazo español de 40 cartas: cuatro palos con 1, 2, 3, 4, 5, 6, 7, 10, 11 y 12. Si se parte de una baraja de 48, se retiran los cuatro 8 y los cuatro 9. Cada jugador recibe tres cartas.',
  },
  {
    q: '¿Cuál es la carta más fuerte?',
    a: 'El 1 de espada, llamado ancho de espada o macho. Después vienen el 1 de basto, el 7 de espada y el 7 de oro.',
  },
  {
    q: '¿Qué pasa si dos cartas empatan?',
    a: 'La baza es parda. La mano completa se define a favor de quien ganó antes otra baza; si las tres quedan pardas, gana el jugador mano.',
  },
  {
    q: '¿Trucazo se juega con flor?',
    a: 'No. La modalidad implementada por Trucazo es mano a mano y sin flor. En una mesa tradicional la flor puede acordarse como variante antes de empezar.',
  },
]

export default function ComoSeJuegaPage() {
  return (
    <SeoPageLayout
      title="Cómo se juega al truco argentino"
      breadcrumb="Cómo se juega al truco"
      intro="El objetivo es sumar puntos ganando el envido y las bazas del truco. En Trucazo se juega 1 contra 1, a 15 o 30 puntos y sin flor. Esta guía explica esa modalidad y marca dónde existen variantes tradicionales."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Cómo se juega al truco', path)} />

      <Section title="Lo esencial en un minuto">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Se reparten <strong>tres cartas</strong> a cada jugador.</li>
          <li>Cada mano puede tener hasta <strong>tres bazas</strong>.</li>
          <li>El envido compara los tantos; el truco apuesta quién gana la mano.</li>
          <li>La primera persona que llega a 15 o 30 puntos, según la mesa, gana.</li>
          <li>La mentira es válida: podés desafiar aunque tus cartas sean malas.</li>
        </ul>
      </Section>

      <Section title="El mazo correcto: 40 cartas">
        <p>
          El truco argentino usa un mazo español de <strong>40 cartas</strong>. Cada uno
          de sus cuatro palos —espada, basto, oro y copa— tiene 1, 2, 3, 4, 5, 6, 7,
          10, 11 y 12.
        </p>
        <p>
          Si tenés una baraja española completa de 48 cartas, retirás los ocho 8 y 9:
          así quedan las 40 cartas necesarias. La baraja comercial de 40 ya viene sin
          esos valores.
        </p>
      </Section>

      <Section title="Orden de las cartas, de mayor a menor">
        <p>
          El número no alcanza para saber qué carta gana. Este es el orden completo
          usado por Trucazo:
        </p>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {ranking.map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="w-7 shrink-0 font-semibold tabular-nums text-gold">
                {index + 1}º
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        <p>
          Las cartas dentro de un mismo grupo empatan entre sí. Por ejemplo, un 3 de
          copa y un 3 de oro producen una parda. Consultá la{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">
            tabla visual del orden de cartas
          </Link>{' '}
          para ver comparaciones concretas.
        </p>
      </Section>

      <Section title="Mano, pie y quién juega primero">
        <p>
          En una partida de dos, <strong>mano</strong> es quien abre la primera baza y
          tiene prioridad cuando los tantos del envido empatan. El otro jugador es el
          <strong> pie</strong>. En Trucazo el rol de mano alterna al terminar cada mano.
        </p>
        <p>
          Quien gana una baza abre la siguiente. Si la baza es parda, vuelve a abrir el
          jugador que había salido en esa baza; en la primera, ese jugador es la mano.
        </p>
      </Section>

      <Section title="Cómo se gana una mano y cómo funcionan las pardas">
        <p>
          Normalmente gana quien se lleva dos de las tres bazas. Pero una parda puede
          cerrar la mano antes:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Si ganás la primera y la segunda es parda, ganás la mano.</li>
          <li>Si la primera es parda y ganás la segunda, ganás la mano.</li>
          <li>Si cada jugador gana una de las dos primeras, la tercera define.</li>
          <li>Si dos bazas son pardas y sólo una tiene ganador, gana quien ganó esa baza.</li>
          <li>Si las tres bazas son pardas, gana la mano.</li>
        </ul>
        <p>
          La guía de{' '}
          <Link href="/pardas-truco-reglas" className="text-gold underline underline-offset-2">
            pardas en el truco
          </Link>{' '}
          reúne todos los casos en una tabla.
        </p>
      </Section>

      <Section title="Cómo se calcula el envido">
        <p>
          Para cada carta, el 1 al 7 vale su número y las figuras 10, 11 y 12 valen
          cero. Después se aplica una de estas dos reglas:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            Con dos o tres cartas del mismo palo, elegís las dos de mayor valor,
            las sumás y agregás 20.
          </li>
          <li>
            Sin dos cartas del mismo palo, vale la carta numérica más alta.
          </li>
        </ul>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p><strong>Ejemplo:</strong> 6 y 5 de oro + 12 de copa.</p>
          <p className="mt-1 text-gold">6 + 5 + 20 = 31 de envido.</p>
        </div>
        <p>
          El máximo es 33: 7 y 6 del mismo palo. En un empate gana el jugador mano.
          Podés comprobar cualquier combinación en la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">
            calculadora de envido
          </Link>
          .
        </p>
      </Section>

      <Section title="Envido, real envido y falta envido">
        <p>
          El envido se propone durante la primera baza, antes de que quien canta juegue
          su primera carta. Si había un truco pendiente, el envido se resuelve primero.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-surface2 text-cream">
              <tr>
                <th className="p-3">Canto aceptado</th>
                <th className="p-3">Puntos</th>
                <th className="p-3">Si se rechaza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr><td className="p-3">Envido</td><td className="p-3">2</td><td className="p-3">1</td></tr>
              <tr><td className="p-3">Real envido</td><td className="p-3">3</td><td className="p-3">1</td></tr>
              <tr><td className="p-3">Envido + envido</td><td className="p-3">4</td><td className="p-3">2 al rechazar la subida</td></tr>
              <tr><td className="p-3">Envido + real envido</td><td className="p-3">5</td><td className="p-3">2 al rechazar la subida</td></tr>
              <tr><td className="p-3">Falta envido</td><td className="p-3">Lo que le falta al puntero</td><td className="p-3">El valor ya aceptado, o 1 si fue directo</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          En Trucazo, la falta envido aceptada vale los puntos que le faltan al jugador
          que va adelante para alcanzar el objetivo de la mesa. Mirá la{' '}
          <Link href="/envido-real-envido-falta-envido" className="text-gold underline underline-offset-2">
            guía completa de cantos y puntajes
          </Link>{' '}
          para ver cadenas y rechazos.
        </p>
      </Section>

      <Section title="Truco, retruco y vale cuatro">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="bg-surface2 text-cream">
              <tr>
                <th className="p-3">Estado</th>
                <th className="p-3">Si se acepta</th>
                <th className="p-3">Si se rechaza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr><td className="p-3">Sin canto</td><td className="p-3">1 punto</td><td className="p-3">—</td></tr>
              <tr><td className="p-3">Truco</td><td className="p-3">2 puntos</td><td className="p-3">1 punto</td></tr>
              <tr><td className="p-3">Retruco</td><td className="p-3">3 puntos</td><td className="p-3">2 puntos</td></tr>
              <tr><td className="p-3">Vale cuatro</td><td className="p-3">4 puntos</td><td className="p-3">3 puntos</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Ante cada desafío podés aceptar, rechazar o subir cuando corresponde. El
          bluff aparece porque no hace falta tener cartas fuertes para cantar.
        </p>
      </Section>

      <Section title="Partidas a 15 o 30 puntos">
        <p>
          Trucazo permite elegir una partida corta a 15 o una completa a 30. En el
          tanteador tradicional de 30, los primeros 15 puntos son las
          <strong> malas</strong> y los siguientes 15 las <strong>buenas</strong>.
          Una partida a 15 termina al completar el primer tramo.
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

      <Section title="Fuentes y alcance">
        <p>
          Esta guía describe la modalidad que implementa Trucazo y fue contrastada con
          el reglamento de truco argentino editado por John McLeod en{' '}
          <a
            href="https://www.pagat.com/put/truco_ar.html"
            className="text-gold underline underline-offset-2"
            rel="noopener noreferrer"
          >
            Pagat
          </a>
          . Algunas mesas tradicionales acuerdan variantes —en especial la flor y el
          valor de la falta envido— antes de repartir.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
