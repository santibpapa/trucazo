import Image from 'next/image'
import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/orden-cartas-truco'
const title = 'Orden de las cartas del truco: cuál gana a cuál'
const description =
  'Tabla completa del orden de cartas del truco argentino, desde el ancho de espada hasta los 4, con empates y ejemplos.'

export const metadata = createPublicMetadata({ title, description, path })

const ranks = [
  { rank: 1, cards: '1 de espada', name: 'Ancho de espada o macho' },
  { rank: 2, cards: '1 de basto', name: 'Ancho de basto o hembra' },
  { rank: 3, cards: '7 de espada', name: 'Siete bravo' },
  { rank: 4, cards: '7 de oro', name: 'Siete bravo' },
  { rank: 5, cards: 'Todos los 3', name: 'Empatan entre sí' },
  { rank: 6, cards: 'Todos los 2', name: 'Empatan entre sí' },
  { rank: 7, cards: '1 de oro y 1 de copa', name: 'Anchos falsos' },
  { rank: 8, cards: 'Todos los 12', name: 'Reyes' },
  { rank: 9, cards: 'Todos los 11', name: 'Caballos' },
  { rank: 10, cards: 'Todos los 10', name: 'Sotas' },
  { rank: 11, cards: '7 de copa y 7 de basto', name: 'Sietes falsos' },
  { rank: 12, cards: 'Todos los 6', name: 'Empatan entre sí' },
  { rank: 13, cards: 'Todos los 5', name: 'Empatan entre sí' },
  { rank: 14, cards: 'Todos los 4', name: 'Las más bajas' },
]

const bravas = [
  { src: '/cartas/espada_01.webp', alt: '1 de espada, la carta más alta del truco', label: '1 de espada' },
  { src: '/cartas/basto_01.webp', alt: '1 de basto, segunda carta más alta del truco', label: '1 de basto' },
  { src: '/cartas/espada_07.webp', alt: '7 de espada, tercera carta más alta del truco', label: '7 de espada' },
  { src: '/cartas/oro_07.webp', alt: '7 de oro, cuarta carta más alta del truco', label: '7 de oro' },
]

export default function OrdenCartasPage() {
  return (
    <SeoPageLayout
      title="Orden de las cartas del truco"
      breadcrumb="Orden de las cartas"
      intro="En el truco argentino no gana siempre el número más alto. El 1 de espada es la carta máxima y los 4 son las más bajas. Esta tabla muestra la jerarquía completa usada por Trucazo."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Orden de las cartas del truco', path)} />

      <Section title="Las cuatro cartas bravas">
        <p>
          Estas cuatro cartas tienen palo y posición propios. Ninguna otra carta puede
          empatarlas.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {bravas.map(card => (
            <figure key={card.src} className="rounded-2xl border border-line bg-surface p-3 text-center">
              <Image
                src={card.src}
                alt={card.alt}
                width={180}
                height={270}
                className="mx-auto h-auto w-full max-w-32 rounded-lg"
              />
              <figcaption className="mt-2 text-sm font-semibold text-gold">{card.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Tabla completa: de mayor a menor">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[34rem] text-left">
            <thead className="bg-surface2 text-sm text-cream">
              <tr>
                <th scope="col" className="p-3">Puesto</th>
                <th scope="col" className="p-3">Carta o grupo</th>
                <th scope="col" className="p-3">Nombre o aclaración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {ranks.map(row => (
                <tr key={row.rank}>
                  <th scope="row" className="p-3 font-semibold text-gold">{row.rank}º</th>
                  <td className="p-3 font-medium text-cream">{row.cards}</td>
                  <td className="p-3 text-muted">{row.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Cómo comparar dos cartas">
        <p>
          Buscá ambas cartas en la tabla. La que aparece más arriba gana. El palo sólo
          cambia la fuerza de los cuatro bravos, los anchos falsos y los sietes falsos.
          En los demás grupos, las cartas empatan aunque tengan palos distintos.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-cream">7 de oro contra cualquier 3</h3>
            <p className="mt-1 text-sm text-muted">Gana el 7 de oro: está 4º y los 3 están 5º.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-cream">3 de copa contra 3 de basto</h3>
            <p className="mt-1 text-sm text-muted">Empatan: todos los 3 comparten el mismo rango.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-cream">1 de oro contra 12</h3>
            <p className="mt-1 text-sm text-muted">Gana el 1 de oro, aunque sea un ancho falso.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-cream">7 de copa contra 6</h3>
            <p className="mt-1 text-sm text-muted">Gana el 7 de copa: los sietes falsos están sobre los 6.</p>
          </div>
        </div>
      </Section>

      <Section title="Orden para el truco y valor para el envido">
        <p>
          Son dos cosas distintas. La jerarquía de esta página decide quién gana una
          baza. Para calcular el envido, el 1 al 7 vale su número y las figuras valen
          cero. Por eso el 7 de oro es muy fuerte en una baza y además suma 7 para el
          tanto.
        </p>
        <p>
          Probá tus cartas en la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">
            calculadora de envido
          </Link>{' '}
          o repasá las{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">
            reglas completas del truco
          </Link>
          .
        </p>
      </Section>

      <Section title="Qué pasa cuando las cartas empatan">
        <p>
          Si ambos jugadores tiran cartas del mismo rango, la baza queda parda. El
          resultado de la mano depende de las otras bazas y de quién era mano. La{' '}
          <Link href="/pardas-truco-reglas" className="text-gold underline underline-offset-2">
            guía de pardas
          </Link>{' '}
          explica cada combinación.
        </p>
      </Section>

      <Section title="Fuente y modalidad">
        <p>
          La jerarquía coincide con la implementación de Trucazo y con el reglamento de
          truco argentino publicado por{' '}
          <a href="https://www.pagat.com/put/truco_ar.html" className="text-gold underline underline-offset-2" rel="noopener noreferrer">
            Pagat
          </a>
          . Trucazo utiliza un mazo español de 40 cartas y juega sin flor.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
