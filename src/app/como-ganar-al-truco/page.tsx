import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/como-ganar-al-truco'
const title = 'Cómo ganar al truco: estrategia y consejos'
const description =
  'Estrategia de truco argentino: con cuánto querer el envido, qué carta tirar en la primera baza, cuándo cantar truco, cómo mentir y cómo leer el tanteador.'

export const metadata = createPublicMetadata({ title, description, path })

// Calculado sobre las 9.880 manos posibles de 3 cartas (mazo de 40), contra
// todas las manos que puede tener el rival con las 37 cartas restantes.
// Columnas: tanto, % de manos con ese tanto o más, % que gana siendo pie
// (pierde los empates), % que gana siendo mano (gana los empates).
const envidoOdds: [number, number, number, number][] = [
  [33, 2, 99, 100],
  [32, 3, 97, 99],
  [31, 6, 95, 97],
  [30, 9, 92, 95],
  [29, 13, 87, 92],
  [28, 17, 83, 87],
  [27, 25, 75, 83],
  [26, 32, 68, 75],
  [25, 38, 62, 68],
  [24, 43, 56, 61],
  [23, 48, 51, 56],
  [22, 52, 48, 51],
  [21, 56, 44, 47],
  [20, 60, 40, 43],
  [7, 70, 32, 41],
  [6, 79, 22, 29],
  [5, 86, 14, 20],
  [4, 91, 9, 13],
]

// Diferencia de puntos: querer gana o pierde lo que se juega; no querer
// regala lo que vale el rechazo. Querer conviene si la probabilidad de ganar
// supera (en juego − rechazo) / (2 × en juego).
const quieroMath = [
  { canto: 'Envido', rechazo: '1', juego: '2', minimo: 'más de 1 de cada 4' },
  { canto: 'Real envido', rechazo: '1', juego: '3', minimo: 'más de 1 de cada 3' },
  { canto: 'Truco', rechazo: '1', juego: '2', minimo: 'más de 1 de cada 4' },
  { canto: 'Retruco', rechazo: '2', juego: '3', minimo: 'más de 1 de cada 6' },
  { canto: 'Vale cuatro', rechazo: '3', juego: '4', minimo: 'más de 1 de cada 8' },
]

const faqs = [
  {
    q: '¿Con cuánto conviene querer un envido?',
    a: 'Contra una mano cualquiera, con 27 ganás 3 de cada 4 veces aunque seas pie, y con 25 ganás 6 de cada 10. Si el rival cantó primero, pedí un poco más, porque quien canta suele tener tanto.',
  },
  {
    q: '¿Cuál es la mejor mano del truco?',
    a: 'Para el truco, el ancho de espada, el ancho de basto y el 7 de espada: las tres cartas más altas del mazo. Para el envido, el 7 y el 6 del mismo palo, que suman 33.',
  },
  {
    q: '¿Es mejor ser mano o pie?',
    a: 'Cada lugar tiene su ventaja. La mano gana los empates del envido y la mano completa si las tres bazas son pardas. El pie ve la primera carta del rival antes de jugar la suya.',
  },
  {
    q: '¿Cuándo conviene irse al mazo?',
    a: 'Antes de que haya un truco aceptado, irse al mazo le da un solo punto al rival. Sirve para cortar una mano que viene muy mal. Con el truco ya aceptado no ahorra puntos: cuesta lo mismo que perder la mano.',
  },
  {
    q: '¿Se puede ganar sin mentir?',
    a: 'Sí, pero cuesta más. Si nunca mentís, el rival aprende que cada canto tuyo es en serio y te rechaza justo cuando tenés buenas cartas. Una mentira de vez en cuando hace que también te quieran cuando tenés con qué.',
  },
]

export default function ComoGanarPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Cómo ganar al truco: estrategia y consejos"
      breadcrumb="Cómo ganar al truco"
      intro="Las reglas se aprenden en una tarde; ganar seguido lleva más. Esta guía junta las decisiones que más pesan en una partida: con cuánto querer, qué carta tirar, cuándo cantar y cómo leer al rival. Vale para el mano a mano y tiene un apartado para parejas."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Cómo ganar al truco', path)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }}
      />

      <Section title="Lo esencial">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Antes de tirar, medí tu mano dos veces: una para el envido y otra para el truco.</li>
          <li>Con 27 o más de tanto, el envido suele ser tuyo aunque seas pie.</li>
          <li>Decir «no quiero» también cuesta puntos: querer conviene más seguido de lo que parece.</li>
          <li>Ganar la primera baza vale mucho: si después hay parda, la mano es tuya.</li>
          <li>Mentí poco, en momentos creíbles y no siempre igual.</li>
          <li>Cerca del final de la partida, el tanteador manda más que las cartas.</li>
        </ul>
      </Section>

      <Section title="Antes de tirar: tu mano vale dos veces">
        <p>
          El envido y el truco miden cosas distintas, y una misma mano puede ser
          excelente para uno y mala para el otro. Por eso conviene hacerse dos preguntas
          apenas levantás las cartas.
        </p>
        <p>
          <strong>¿Cuánto tengo de envido?</strong> Sumá las dos cartas más altas del
          mismo palo y agregá 20; las figuras valen cero. Si no tenés dos del mismo palo,
          vale tu carta más alta del 1 al 7. Si dudás, probá la mano en la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>.
        </p>
        <p>
          <strong>¿Cuántas cartas que matan tengo?</strong> Para el truco sirve agrupar
          las cartas en cuatro escalones:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-gold">Bravas</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Ancho de espada, ancho de basto, 7 de espada y 7 de oro. Ganan casi siempre.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-gold">Buenas</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Los 3 sólo pierden contra las cuatro bravas; los 2, también contra los 3. Entre iguales empatan.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-gold">Medias</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Anchos falsos (1 de oro y de copa), 12, 11 y 10. Ganan bazas contra cartas bajas.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-gold">Bajas</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Los 7 falsos (copa y basto), 6, 5 y 4. Sirven para el envido o para tirar sin perder nada.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p><strong>Ejemplo:</strong> 7, 6 y 5 de copa.</p>
          <p className="mt-1 text-cream/90">
            Tenés 33 de envido, el máximo posible, pero para el truco es una de las peores
            manos: tres cartas bajas. Cantá el envido con todo y no te entusiasmes con el
            truco.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p><strong>Ejemplo:</strong> ancho de espada, ancho de basto y 3 de oro.</p>
          <p className="mt-1 text-cream/90">
            Son tres palos distintos: apenas 3 de envido. Pero para el truco es casi
            imbatible. No cantes envido; guardá la energía para el truco y el retruco.
          </p>
        </div>
      </Section>

      <Section title="Con cuánto querer el envido">
        <p>
          Calculamos todas las manos posibles de tres cartas y las comparamos con todas
          las que puede tener el rival. La tabla dice qué tan seguido gana cada tanto
          contra una mano cualquiera. Siendo mano ganás los empates; siendo pie, los
          perdés.
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="bg-surface2 text-cream">
              <tr>
                <th className="p-2.5 sm:p-3">Tanto</th>
                <th className="p-2.5 sm:p-3">Manos con eso o más</th>
                <th className="p-2.5 sm:p-3">Ganás de pie</th>
                <th className="p-2.5 sm:p-3">Ganás de mano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {envidoOdds.map(([tanto, alMenos, pie, mano]) => (
                <tr key={tanto} className={tanto === 27 ? 'bg-gold-soft/40' : undefined}>
                  <td className="p-2.5 font-semibold text-gold sm:p-3">{tanto}</td>
                  <td className="p-2.5 sm:p-3">{alMenos}%</td>
                  <td className="p-2.5 sm:p-3">{pie}%</td>
                  <td className="p-2.5 sm:p-3">{mano}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Lo que enseña la tabla:</p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>27 es la línea.</strong> Sólo una de cada cuatro manos llega, y con
            eso ganás 3 de cada 4 veces aunque seas pie.
          </li>
          <li>
            <strong>Del 20 al 26 es zona gris.</strong> Ser mano te suma entre 3 y 7
            puntos de porcentaje: la misma mano vale más si sos mano.
          </li>
          <li>
            <strong>Sin dos cartas del mismo palo perdés la mayoría.</strong> Con 7,
            siendo pie, ganás 1 de cada 3; con 5, 1 de cada 7. Ahí el envido sirve más
            para mentir que para mostrar.
          </li>
          <li>
            <strong>Con 33 siendo mano ganás siempre:</strong> nadie te supera y los
            empates son tuyos.
          </li>
        </ul>
        <p>
          Una advertencia: la tabla vale contra una mano cualquiera. Si el rival cantó
          envido o te aceptó, su mano ya no es cualquiera: quien canta suele tener tanto.
          En esos casos pedí dos o tres puntos más de lo que dice la tabla.
        </p>
      </Section>

      <Section title="La cuenta del «quiero»">
        <p>
          Rechazar un canto no es gratis: le da puntos al rival. Si comparás lo que
          perdés al decir «no quiero» con lo que se juega al aceptar, aparece el mínimo
          de chances que necesitás para que querer convenga:
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-cream">
              <tr>
                <th className="p-2.5 sm:p-3">Canto</th>
                <th className="p-2.5 sm:p-3">No quiero: das</th>
                <th className="p-2.5 sm:p-3">Quiero: se juegan</th>
                <th className="p-2.5 sm:p-3">Conviene querer si ganás</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quieroMath.map(row => (
                <tr key={row.canto}>
                  <td className="p-2.5 font-semibold text-cream sm:p-3">{row.canto}</td>
                  <td className="p-2.5 sm:p-3">{row.rechazo}</td>
                  <td className="p-2.5 sm:p-3">{row.juego}</td>
                  <td className="p-2.5 sm:p-3">{row.minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Con un envido simple, por ejemplo, rechazar te cuesta un punto seguro. Querer
          te hace ganar o perder dos. Si ganás más de una de cada cuatro veces, a la
          larga te conviene querer. Cuanto más sube el truco, más barato es aceptar,
          porque el rechazo ya vale casi lo mismo que perder.
        </p>
        <p>
          Esta cuenta mira sólo la diferencia de puntos. Cerca del final de la partida
          cambia, como se explica más abajo.
        </p>
      </Section>

      <Section title="La primera baza">
        <p>
          La primera baza define mucho más que un tercio de la mano. Quien la gana
          tiene la parda a favor: si la segunda empata, la mano es suya. Además, el
          envido se canta en la primera baza, antes de que quien canta tire su carta.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>Siendo mano con una brava y dos medias,</strong> salí con una media.
            Ves qué tiene el rival sin gastar tu mejor carta.
          </li>
          <li>
            <strong>Siendo mano con dos bravas,</strong> podés ganar la primera con una
            y quedarte la otra para cantar truco con la parda a favor.
          </li>
          <li>
            <strong>Siendo pie, matá con la carta justa.</strong> Si el rival tiró un
            12, alcanza con un 2 o un 3: no gastes el ancho.
          </li>
          <li>
            <strong>Si no podés ganarla, tirá tu carta más baja.</strong> Perder con un
            4 o con un 12 es lo mismo; la diferencia es lo que te queda para después.
          </li>
          <li>
            <strong>Empardar puede ser buena idea.</strong> Si sólo podés empatar la
            primera pero guardás la mejor carta, la parda deja todo para la segunda, y
            ahí sos favorito.
          </li>
        </ul>
        <p>
          Todos los casos de empate están en la guía de{' '}
          <Link href="/pardas-truco-reglas" className="text-gold underline underline-offset-2">pardas</Link>.
        </p>
      </Section>

      <Section title="Cuándo cantar truco">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>Con dos cartas buenas o mejores.</strong> Una sola brava no alcanza
            si las otras dos son bajas: el rival puede ganarte dos bazas.
          </li>
          <li>
            <strong>Después de ganar la primera,</strong> con una buena carta guardada.
            Es el momento más fuerte: al rival le hace falta ganar las dos que quedan.
          </li>
          <li>
            <strong>Ojo con cantarlo en la primera baza.</strong> Si el rival todavía
            puede cantar envido, va a resolverse primero. Le das la chance de cobrar el
            tanto antes de contestarte.
          </li>
          <li>
            <strong>El retruco, con la mano casi asegurada.</strong> Por ejemplo, si
            ganaste la primera y guardás el ancho de espada.
          </li>
          <li>
            <strong>Recordá las cartas que salieron.</strong> Si ya se jugaron el ancho
            de espada y el de basto, tu 7 de espada pasa a ser la carta más alta que
            queda.
          </li>
        </ul>
      </Section>

      <Section title="Mentir sin que te descubran">
        <p>
          En el truco la mentira está permitida y es parte del juego. Lo difícil no es
          mentir, sino que te crean.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>Contá una historia coherente.</strong> Si en la primera tiraste un 4
            y perdiste, cantar truco dice que tenés con qué ganar las dos bazas que quedan.
            ¿Es creíble con lo que ya mostraste?
          </li>
          <li>
            <strong>Aprovechá la debilidad del rival.</strong> Si dijo «son buenas» o
            tiró una carta baja, tiene menos para sostener un canto.
          </li>
          <li>
            <strong>Mentí donde descubrirte cuesta poco.</strong> Un truco de mentira
            rechazado te da un punto; aceptado y perdido te cuesta dos.
          </li>
          <li>
            <strong>No mientas siempre en el mismo momento.</strong> Los rivales
            aprenden. En Trucazo, los{' '}
            <Link href="/truco-contra-computadora" className="text-gold underline underline-offset-2">rivales difíciles de la computadora</Link>{' '}
            también llevan la cuenta de cuánto mentís.
          </li>
        </ul>
      </Section>

      <Section title="Leer el tanteador">
        <p>
          Al principio de la partida cada mano vale parecido. Cerca del final, no:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>La falta envido cambia de valor.</strong> Vale lo que le falta al
            que va ganando para terminar. Con el tanteador en cero define la partida
            entera; si el puntero está a dos puntos, vale dos.
          </li>
          <li>
            <strong>Si la gana el que va adelante, se termina la partida.</strong> Por
            eso, yendo arriba, una falta envido con buen tanto puede cerrarla de un
            saque. Yendo abajo, aceptarla es jugarte todo: querela sólo con mucho tanto.
          </li>
          <li>
            <strong>Si al rival le falta un punto,</strong> cualquier «no quiero» lo hace
            ganar. Tenés que querer todo y jugarlo con las cartas.
          </li>
          <li>
            <strong>Si a vos te faltan pocos,</strong> pasa lo mismo al revés: el rival no
            puede rechazar tus cantos sin perder. Cantá con lo que tengas.
          </li>
          <li>
            <strong>El mazo a tiempo ahorra puntos.</strong> Antes de un truco aceptado,
            irte al mazo le da un solo punto al rival. Con el truco aceptado ya no ahorra
            nada.
          </li>
        </ul>
      </Section>

      <Section title="En parejas, todo cuesta un poco más">
        <p>
          En el 2 vs 2 el tanto de cada equipo es el mejor de sus dos jugadores. Eso
          sube la vara: contra dos rivales hace falta más tanto para ganar el envido.
        </p>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p>
            <strong>Con 27 de tanto</strong> le ganás a una mano cualquiera 75 de cada 100
            veces, pero al mejor de dos rivales sólo unas 56. Con 25 bajás de 62 a 38.
            En las dos cuentas los empates se toman como perdidos.
          </p>
        </div>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Irte al mazo cierra la mano para los dos: pensalo antes que en el mano a mano.</li>
          <li>Quien juega último en su equipo ve casi todas las cartas antes de decidir.</li>
          <li>Si tu compañero ya gana la baza, guardá tu carta buena para la siguiente.</li>
        </ul>
        <p>
          Las reglas completas de la modalidad están en la guía de{' '}
          <Link href="/truco-en-parejas" className="text-gold underline underline-offset-2">truco en parejas</Link>.
        </p>
      </Section>

      <Section title="Errores comunes">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Rechazar envidos por miedo con 25 o 26, cuando la cuenta dice que conviene querer.</li>
          <li>Gastar una carta brava en una baza que ya estaba ganada o perdida.</li>
          <li>Querer cantar envido después de haber tirado tu primera carta: ya no se puede.</li>
          <li>Irse al mazo apenas llegan cartas bajas, aunque tengas buen tanto.</li>
          <li>Mentir siempre en la misma situación, hasta que el rival lo nota.</li>
          <li>Olvidarse del tanteador y regalar el punto que le faltaba al rival.</li>
        </ul>
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

      <Section title="De dónde salen los números">
        <p>
          La tabla del envido sale de calcular las 9.880 manos posibles de tres cartas
          en un mazo de 40 y compararlas con todas las manos que puede tener el rival
          con las 37 cartas restantes. La cifra de parejas sale de simular 600.000
          repartos de cuatro manos. La cuenta del «quiero» compara la diferencia de
          puntos entre aceptar y rechazar, sin contar el final de la partida.
        </p>
        <p>
          Las reglas que se usan son las de Trucazo: sin flor, a 15 o 30 puntos. Si
          recién empezás, leé primero{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">cómo se juega al truco</Link>{' '}
          y el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
