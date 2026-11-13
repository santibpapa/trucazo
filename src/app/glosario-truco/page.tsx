import type { ReactNode } from 'react'
import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/glosario-truco'
const title = 'Glosario del truco: qué significa cada palabra'
const description =
  'Qué es ser mano o pie, una parda, «son buenas», tener el quiero, el vale cuatro o las malas y las buenas: el vocabulario del truco argentino, explicado.'

export const metadata = createPublicMetadata({ title, description, path })

const linkClass = 'text-gold underline underline-offset-2'

type Term = { id: string; term: string; def: ReactNode }

// Cada definición se contrastó con las funciones del juego (sing_truco,
// envido_say, irse_al_mazo) y con las otras guías del sitio, para no
// contradecirlas. Si cambia una regla, revisar también esta página.
const groups: { title: string; terms: Term[] }[] = [
  {
    title: 'Las cartas',
    terms: [
      {
        id: 'mazo-espanol',
        term: 'Mazo español',
        def: 'La baraja con la que se juega: 40 cartas, cuatro palos y en cada palo el 1, 2, 3, 4, 5, 6, 7, 10, 11 y 12. Si la baraja trae los 8 y los 9, se sacan antes de empezar.',
      },
      {
        id: 'palo',
        term: 'Palo',
        def: 'Cada una de las cuatro familias del mazo: espada, basto, oro y copa. En el truco el palo importa dos veces: para saber cuáles son las cartas bravas y para el envido, que sólo junta cartas del mismo palo.',
      },
      {
        id: 'ancho-de-espada',
        term: 'Ancho de espada o macho',
        def: 'El 1 de espada, la carta más alta del truco. Le gana a todas y no puede quedar empatada con ninguna.',
      },
      {
        id: 'ancho-de-basto',
        term: 'Ancho de basto o hembra',
        def: 'El 1 de basto, la segunda carta más alta. Sólo la mata el ancho de espada.',
      },
      {
        id: 'sietes-bravos',
        term: 'Sietes bravos',
        def: 'El 7 de espada, tercero en el orden, y el 7 de oro, cuarto. Se les dice bravos para separarlos de los otros dos sietes, que valen mucho menos.',
      },
      {
        id: 'cartas-bravas',
        term: 'Cartas bravas',
        def: 'Las cuatro que mandan: ancho de espada, ancho de basto, 7 de espada y 7 de oro. Cada una tiene su propio puesto en el orden, así que nunca empatan entre ellas.',
      },
      {
        id: 'anchos-falsos',
        term: 'Anchos falsos',
        def: 'El 1 de oro y el 1 de copa. Pierden contra cualquier 3 y cualquier 2, y empatan entre sí.',
      },
      {
        id: 'sietes-falsos',
        term: 'Sietes falsos',
        def: 'El 7 de copa y el 7 de basto. En el truco están entre las cartas flojas: sólo les ganan a los 6, los 5 y los 4. Para el envido, en cambio, valen 7 como cualquier siete.',
      },
      {
        id: 'figuras',
        term: 'Figuras',
        def: 'El 10 (sota), el 11 (caballo) y el 12 (rey). En el truco están en la mitad de la tabla, por debajo de los anchos falsos; para el envido valen cero.',
      },
      {
        id: 'orden-de-las-cartas',
        term: 'Orden de las cartas',
        def: (
          <>
            La jerarquía que decide qué carta gana: no manda el número sino el puesto
            de cada carta. Está completa en la{' '}
            <Link href="/orden-cartas-truco" className={linkClass}>tabla del orden de las cartas</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: 'La mano y las bazas',
    terms: [
      {
        id: 'repartir',
        term: 'Repartir o dar',
        def: 'Entregar tres cartas a cada jugador. En una mesa de bar reparte una persona y el turno de dar va rotando; en Trucazo reparte el juego solo, con el mazo mezclado en cada mano.',
      },
      {
        id: 'mano-ronda',
        term: 'Mano (la ronda)',
        def: 'Cada reparto, desde que llegan las tres cartas hasta que se anotan los puntos. Una partida tiene muchas manos, y cada mano tiene hasta tres bazas.',
      },
      {
        id: 'mano-jugador',
        term: 'Mano (el jugador)',
        def: 'Quien juega primero en esa mano. Tiene dos ventajas: gana los empates del envido y se lleva la mano si las tres bazas quedan pardas. En Trucazo el lugar de mano cambia en cada reparto; en parejas se corre un asiento por vez.',
      },
      {
        id: 'pie',
        term: 'Pie',
        def: 'En el mano a mano, quien juega segundo: tira después de ver la carta del rival. En parejas se le dice pie al último de cada equipo en jugar, el que más cartas ve antes de decidir.',
      },
      {
        id: 'baza',
        term: 'Baza',
        def: 'Cada ronda en la que todos tiran una carta; la gana la carta más alta. Quien la gana abre la siguiente. Una mano se define con dos bazas ganadas, o antes si hay pardas.',
      },
      {
        id: 'primera',
        term: 'Primera, segunda y tercera',
        def: 'Los nombres de las tres bazas. «Hacer primera» es ganar la primera baza, y vale mucho: si después hay una parda, la mano es tuya.',
      },
      {
        id: 'matar',
        term: 'Matar',
        def: 'Ganarle a una carta con otra más alta. El 3 mata al 2, el ancho de basto mata al 7 de espada y el ancho de espada mata a todas.',
      },
      {
        id: 'parda',
        term: 'Parda',
        def: (
          <>
            Baza empatada: las cartas más altas de cada lado tienen el mismo puesto,
            como un 3 de oro y un 3 de copa. La parda favorece a quien ya había ganado
            una baza; si nadie la tenía, define la siguiente. Todos los casos están en
            la{' '}
            <Link href="/pardas-truco-reglas" className={linkClass}>guía de pardas</Link>.
          </>
        ),
      },
      {
        id: 'empardar',
        term: 'Empardar',
        def: 'Tirar a propósito una carta del mismo puesto que la del rival para que la baza quede parda. Le sirve a quien ganó la primera: con la segunda parda, la mano ya es suya y no hace falta gastar una carta alta.',
      },
      {
        id: 'irse-al-mazo',
        term: 'Irse al mazo',
        def: (
          <>
            Abandonar la mano: dejás tus cartas sin mostrarlas y el rival cobra lo
            que estaba en juego. En Trucazo eso es 1 punto si no había un truco
            aceptado, o el valor del truco aceptado. Si el envido ya estaba querido y
            faltaba decir los tantos, el rival cobra también ese envido. Con un canto
            del rival sin contestar, primero hay que responderlo. En{' '}
            <Link href="/truco-en-parejas" className={linkClass}>parejas</Link>{' '}
            irse al mazo cierra la mano para todo el equipo.
          </>
        ),
      },
    ],
  },
  {
    title: 'Cantar y responder',
    terms: [
      {
        id: 'cantar',
        term: 'Cantar',
        def: 'Proponer una apuesta: envido, truco o cualquiera de sus subidas. En la mesa se dice en voz alta; en Trucazo se canta con los botones que aparecen en tu turno.',
      },
      {
        id: 'quiero',
        term: 'Quiero',
        def: 'Aceptar un canto. Se juega lo que vale: en el envido se comparan los tantos y en el truco se sigue jugando la mano por más puntos.',
      },
      {
        id: 'no-quiero',
        term: 'No quiero',
        def: 'Rechazar un canto. Se termina ahí y el que cantó cobra el valor del rechazo: 1 punto en un primer canto, o lo que ya estaba aceptado si era una subida. Un truco rechazado cierra la mano; un envido rechazado, no.',
      },
      {
        id: 'subir',
        term: 'Subir',
        def: 'Responder un canto con otro más grande: un envido con un real envido, un truco con un retruco. Subir acepta lo anterior, así que si el rival no quiere la subida, te llevás lo que ya estaba en juego.',
      },
      {
        id: 'mentir',
        term: 'Mentir',
        def: (
          <>
            Cantar sin tener con qué, para que el rival se asuste y diga que no. Es
            parte del juego y no tiene castigo. Lo único que no se puede es declarar un
            tanto que no tenés, porque al final hay que mostrarlo. Cuándo conviene
            está en la{' '}
            <Link href="/como-ganar-al-truco" className={linkClass}>guía de estrategia</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: 'El envido',
    terms: [
      {
        id: 'tanto',
        term: 'Tanto',
        def: (
          <>
            Los puntos de envido de tu mano. Con dos cartas del mismo palo se suman y
            se agregan 20; las figuras valen cero. Sin dos del mismo palo, vale la
            carta más alta del 1 al 7. Por eso el tanto va de 0 a 7 o de 20 a 33, y no
            existe un tanto de 8 a 19. Probalo en la{' '}
            <Link href="/calculadora-envido" className={linkClass}>calculadora de envido</Link>.
          </>
        ),
      },
      {
        id: 'envido',
        term: 'Envido',
        def: 'El canto que pone en juego el tanto. Aceptado vale 2 puntos para quien tenga más; rechazado, 1 para quien cantó. Se canta en la primera baza, antes de tirar tu primera carta.',
      },
      {
        id: 'envido-envido',
        term: 'Envido envido',
        def: 'Contestar un envido con otro envido. Si se acepta, la cadena vale 4 puntos; si se rechaza, quien subió cobra 2.',
      },
      {
        id: 'real-envido',
        term: 'Real envido',
        def: 'Canto de 3 puntos. Puede ir solo o encima de un envido: envido y real envido aceptados suman 5.',
      },
      {
        id: 'falta-envido',
        term: 'Falta envido',
        def: (
          <>
            El canto más grande del envido: vale los puntos que le faltan al que va
            adelante para ganar la partida. Muchas veces define el partido entero.
            Rechazada de entrada da 1 punto; si subía otros cantos, da lo que ya
            estaba aceptado. Todas las combinaciones están en la{' '}
            <Link href="/envido-real-envido-falta-envido" className={linkClass}>tabla de cantos del envido</Link>.
          </>
        ),
      },
      {
        id: 'el-envido-va-primero',
        term: 'El envido va primero',
        def: 'Si en la primera baza te cantan truco y todavía podías cantar envido, podés cantarlo antes de contestar el truco. Primero se resuelve el envido y después se sigue con el truco.',
      },
      {
        id: 'tengo',
        term: 'Tengo (decir el tanto)',
        def: 'Con el envido querido, cada uno dice su número, empezando por la mano. En Trucazo el botón «Tengo» dice tu tanto verdadero: el juego lo calcula con tus cartas, así que no hay forma de declarar uno falso.',
      },
      {
        id: 'son-buenas',
        term: 'Son buenas',
        def: 'Lo que dice quien no puede superar el tanto ya declarado: reconoce que pierde sin decir su número, y así no le da pistas al rival sobre sus cartas. En el mano a mano lo dice el pie, porque la mano siempre declara primero.',
      },
      {
        id: 'en-mesa',
        term: 'En mesa',
        def: 'Quien gana el envido tiene que poder probar su tanto. Al terminar la mano baja a la mesa las cartas que lo forman y se anuncia, por ejemplo, «33 en mesa». En Trucazo lo hace el juego solo y muestra únicamente esas cartas, no la mano entera.',
      },
    ],
  },
  {
    title: 'El truco',
    terms: [
      {
        id: 'truco',
        term: 'Truco',
        def: 'Además de ser el nombre del juego, es el canto que sube la mano de 1 a 2 puntos. Si se rechaza, quien cantó cobra 1 y la mano termina.',
      },
      {
        id: 'retruco',
        term: 'Retruco',
        def: 'La subida del truco: la mano pasa a valer 3. Si se rechaza, quien lo cantó cobra 2.',
      },
      {
        id: 'vale-cuatro',
        term: 'Vale cuatro',
        def: 'El último escalón: la mano vale 4 puntos. Si se rechaza, quien lo cantó cobra 3. No hay nada más arriba.',
      },
      {
        id: 'tener-el-quiero',
        term: 'Tener el quiero',
        def: 'Después de un truco aceptado, sólo puede subir la apuesta quien lo aceptó. Si cantaste truco y te dijeron «quiero», el retruco ya no es tuyo: lo puede cantar tu rival cuando le toque. Trucazo aplica esta regla en todas las mesas.',
      },
    ],
  },
  {
    title: 'El tanteador y la partida',
    terms: [
      {
        id: 'tanteador',
        term: 'Tanteador',
        def: 'El marcador. En la mesa de bar se lleva con fósforos o porotos: con fósforos se arman cuadraditos de cinco, cuatro lados y una diagonal. En Trucazo lo lleva el juego y se ve siempre en la mesa.',
      },
      {
        id: 'a-15-o-a-30',
        term: 'A 15 o a 30',
        def: 'Los dos largos de partida. A 15 es la corta; a 30, la completa y tradicional. En Trucazo se elige al crear la mesa.',
      },
      {
        id: 'malas-y-buenas',
        term: 'Malas y buenas',
        def: 'En la partida a 30, los primeros 15 puntos son las malas y los otros 15, las buenas. «Estar en las buenas» es haber pasado los 15. Una partida a 15 se juega sólo con las malas.',
      },
      {
        id: 'puntero',
        term: 'Puntero',
        def: 'Quien va adelante en el tanteador. Sus puntos son los que cuentan para calcular la falta envido.',
      },
      {
        id: 'partida',
        term: 'Partida o chico',
        def: 'El juego completo, hasta llegar a 15 o 30. En muchas mesas se le dice chico, y es común jugar al mejor de tres chicos.',
      },
    ],
  },
  {
    title: 'En parejas',
    terms: [
      {
        id: 'companero',
        term: 'Compañero',
        def: (
          <>
            Tu pareja en el 2 vs 2, que se sienta enfrente: a tus costados siempre hay
            un rival. Las bazas y los puntos son del equipo, no de cada uno. La
            modalidad completa está en la guía de{' '}
            <Link href="/truco-en-parejas" className={linkClass}>truco en parejas</Link>.
          </>
        ),
      },
      {
        id: 'envido-de-a-cuatro',
        term: 'Envido de a cuatro',
        def: 'En parejas el envido lo canta uno, pero cuando se acepta se declaran los cuatro tantos por turno desde la mano. Cada uno dice su número sólo si supera al mejor dicho hasta ahí; si no, dice «son buenas».',
      },
      {
        id: 'senas',
        term: 'Señas',
        def: 'Gestos secretos entre compañeros para avisarse qué cartas tienen, como levantar las cejas o guiñar un ojo. En la mesa de bar son parte del juego y cada grupo tiene las suyas. En Trucazo no hay señas: no existe un canal privado y el chat lo lee toda la mesa.',
      },
    ],
  },
  {
    title: 'Variantes que Trucazo no usa',
    terms: [
      {
        id: 'flor',
        term: 'Flor',
        def: 'Tres cartas del mismo palo. En las mesas que la juegan, quien la tiene la canta y cobra puntos aparte del envido. Trucazo se juega sin flor: con tres cartas del mismo palo, tu tanto se arma con las dos más altas.',
      },
      {
        id: 'contraflor',
        term: 'Contraflor y contraflor al resto',
        def: 'Las respuestas cuando los dos tienen flor: la contraflor sube la apuesta y la contraflor al resto se juega la partida. Sin flor, no existen.',
      },
      {
        id: 'falta-a-la-partida',
        term: 'Falta envido a la partida',
        def: 'En algunas mesas, si los dos están todavía en las malas, la falta envido gana la partida entera. Trucazo usa siempre la misma cuenta: lo que le falta al puntero para llegar.',
      },
      {
        id: 'mazo-en-primera',
        term: 'Irse en primera «son dos»',
        def: 'En algunas mesas, irse al mazo en la primera baza sin que se haya cantado el envido le da al rival un punto más, por el envido que no se jugó. En Trucazo no: el rival cobra sólo lo que valía la mano.',
      },
    ],
  },
]

const faqs = [
  {
    q: '¿Qué significa «son buenas» en el truco?',
    a: 'Que reconocés que el tanto del rival es mejor que el tuyo. Lo dice quien no puede superar el número ya declarado, y sirve para perder el envido sin contar qué cartas tenés.',
  },
  {
    q: '¿Qué es ser mano en el truco?',
    a: 'Ser quien juega primero en ese reparto. La mano gana los empates del envido y se lleva la mano completa si las tres bazas quedan pardas. El otro jugador es el pie, que tira después de ver la primera carta.',
  },
  {
    q: '¿Qué quiere decir «tener el quiero»?',
    a: 'Que te toca a vos subir la apuesta. Cuando un truco se acepta, sólo quien lo aceptó puede cantar retruco; y si se acepta el retruco, sólo quien lo aceptó puede cantar vale cuatro.',
  },
  {
    q: '¿Cuál es la diferencia entre el truco y el envido?',
    a: 'Son dos apuestas distintas dentro de la misma mano. El envido compara los tantos, que salen de sumar cartas del mismo palo, y se resuelve en la primera baza. El truco apuesta quién gana las bazas, y se puede cantar en cualquier baza, cuando te toca jugar.',
  },
]

export default function GlosarioPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Glosario del truco"
      breadcrumb="Glosario del truco"
      intro="El truco tiene su propio idioma: se canta, se quiere, se emparda y uno se va al mazo. Acá está cada palabra que vas a escuchar en una mesa, explicada en pocas líneas y con la regla que usa Trucazo cuando hay variantes: a 15 o 30 puntos y sin flor, mano a mano o en parejas."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Glosario del truco', path)} />
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

      {groups.map(group => (
        <Section key={group.title} title={group.title}>
          <dl className="flex flex-col gap-4">
            {group.terms.map(({ id, term, def }) => (
              <div key={id} id={id} className="scroll-mt-6">
                <dt className="font-semibold text-cream">{term}</dt>
                <dd className="mt-1 text-cream/90">{def}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ))}

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

      <Section title="Fuente y alcance">
        <p>
          Las definiciones siguen las reglas que aplica Trucazo y coinciden con el{' '}
          <a href="https://www.pagat.com/put/truco_ar.html" className={linkClass} rel="noopener noreferrer">reglamento de truco argentino de Pagat</a>.
          Algunas palabras cambian de una provincia a otra o de una mesa a otra; cuando
          una regla tiene variantes, se aclara cuál usa Trucazo.
        </p>
        <p>
          Si recién empezás, seguí por{' '}
          <Link href="/como-se-juega-al-truco" className={linkClass}>cómo se juega al truco</Link>,
          que explica las reglas en orden.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
