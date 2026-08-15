import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { createArticleJsonLd, createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/pardas-truco-reglas'
const title = 'Pardas en el truco: reglas y todos los casos'
const description =
  'Aprendé quién gana cuando una baza queda parda: primera, segunda o tercera parda, dos empates y triple parda.'

export const metadata = createPublicMetadata({ title, description, path })

const cases = [
  ['A gana la primera; segunda parda', 'Gana A. Ya tenía la ventaja de la primera.'],
  ['Primera parda; A gana la segunda', 'Gana A. La primera quedó empatada y la segunda define.'],
  ['A gana la primera; B gana la segunda', 'Se juega la tercera; quien la gana se lleva la mano.'],
  ['Primera y segunda pardas', 'Se juega la tercera; quien la gana se lleva la mano.'],
  ['Primera parda; segunda parda; tercera parda', 'Gana el jugador mano.'],
  ['A gana la primera; B gana la segunda; tercera parda', 'Gana A, porque ganó antes su baza.'],
]

export default function PardasPage() {
  return (
    <SeoPageLayout
      title="Pardas en el truco: quién gana"
      breadcrumb="Pardas en el truco"
      intro="Una parda ocurre cuando las cartas más fuertes de una baza tienen el mismo rango. La clave es recordar que el empate favorece a quien ya había ganado antes; sin ventaja previa, manda la siguiente baza o la mano."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Pardas en el truco', path)} />

      <Section title="Regla corta">
        <p>
          Si una baza queda parda, conserva la ventaja quien ganó una baza anterior. Si
          todavía nadie tenía ventaja, la siguiente baza define. Si las tres quedan
          pardas, gana el jugador mano.
        </p>
      </Section>

      <Section title="Todos los casos">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="bg-surface2 text-cream"><tr><th className="p-3">Secuencia</th><th className="p-3">Resultado</th></tr></thead>
            <tbody className="divide-y divide-line">
              {cases.map(([sequence, result]) => (
                <tr key={sequence}><th scope="row" className="p-3 font-medium text-cream">{sequence}</th><td className="p-3 text-muted">{result}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Qué cartas producen una parda">
        <p>
          Dos cartas empatan cuando comparten posición en la jerarquía. Un 3 de oro
          empata con un 3 de copa; un 12 con cualquier otro 12. En cambio, el 1 de espada
          no empata con otro 1 porque los cuatro ases ocupan posiciones diferentes.
        </p>
        <p>
          Consultá el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden completo de las cartas</Link>{' '}
          para identificar cada grupo.
        </p>
      </Section>

      <Section title="Quién abre después de una parda">
        <p>
          Vuelve a salir quien había abierto la baza empatada. En la primera baza esa
          persona es la mano. Cuando una baza tiene ganador, ese jugador abre la siguiente.
        </p>
      </Section>

      <Section title="Ejemplo paso a paso">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>La mano juega un 3 y el pie responde con otro 3: primera parda.</li>
          <li>La mano vuelve a abrir y juega un 6; el pie gana con un 7 falso.</li>
          <li>La partida termina ahí: el pie gana la mano gracias a la segunda baza.</li>
        </ol>
        <p>
          Si en el segundo paso ambos hubieran jugado un 6, la segunda también quedaba
          parda y la tercera decidía.
        </p>
      </Section>

      <Section title="Fuente y modalidad">
        <p>
          Los casos reflejan la lógica de partidas mano a mano de Trucazo y coinciden con
          el{' '}
          <a href="https://www.pagat.com/put/truco_ar.html" className="text-gold underline underline-offset-2" rel="noopener noreferrer">reglamento argentino de Pagat</a>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
