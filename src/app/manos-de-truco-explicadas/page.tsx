import Image from 'next/image'
import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPublicMetadata,
} from '@/lib/seo'

const path = '/manos-de-truco-explicadas'
const title = 'Manos de truco explicadas: ocho jugadas paso a paso'
const description =
  'Ocho manos de truco argentino jugadas de punta a punta: pardas, envido de 33, cuánto vale la falta envido, tener el quiero, el envido va primero e irse al mazo.'

export const metadata = createPublicMetadata({ title, description, path })

const linkClass = 'text-gold underline underline-offset-2'

type Suit = 'espada' | 'basto' | 'oro' | 'copa'
type PlayingCard = [value: number, suit: Suit]

function cardName([value, suit]: PlayingCard) {
  return `${value} de ${suit}`
}

function Hand({ label, cards }: { label: string; cards: PlayingCard[] }) {
  return (
    <figure className="flex-1 min-w-0">
      <figcaption className="text-sm font-semibold text-gold">{label}</figcaption>
      <div className="mt-2 flex gap-2">
        {cards.map(card => (
          <Image
            key={cardName(card)}
            src={`/cartas/${card[1]}_${String(card[0]).padStart(2, '0')}.webp`}
            alt={cardName(card)}
            width={56}
            height={86}
            className="h-auto w-12 rounded-md sm:w-14"
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-subtle">{cards.map(cardName).join(', ')}</p>
    </figure>
  )
}

type Example = {
  id: string
  title: string
  setup: string
  mine: PlayingCard[]
  rival: PlayingCard[]
  steps: string[]
  lesson: string
}

// Cada paso se contrastó el 24/11/2026 con las funciones del juego en
// producción: play_card (bazas y pardas), sing_envido y _envido_quiero_value
// (cadenas, falta envido), envido_say (empates, «son buenas», irse al mazo con
// el envido querido), sing_truco (tener el quiero) e irse_al_mazo. Si cambia
// una regla, revisar también esta página.
const examples: Example[] = [
  {
    id: 'matar-con-lo-justo',
    title: '1. Matar con lo justo y cantar con la primera ganada',
    setup: 'Partida a 30, vas 4 a 6. Sos pie: el rival juega primero. Ninguno de los dos tiene tanto para cantar envido.',
    mine: [[1, 'basto'], [3, 'copa'], [4, 'oro']],
    rival: [[2, 'espada'], [7, 'oro'], [12, 'basto']],
    steps: [
      'El rival abre con el 2 de espada.',
      'Lo matás con el 3 de copa. Alcanza, y te guardás el ancho de basto. Matarlo con el ancho era gastar tu mejor carta en una baza que ganabas igual con el 3.',
      'Ganaste la primera, así que abrís la segunda. Antes de tirar cantás truco: si ganás esta baza la mano es tuya, y tu ancho de basto sólo pierde contra el ancho de espada.',
      'El rival dice quiero: la mano pasa a valer 2. Como él aceptó, ahora el retruco es suyo y lo podría cantar antes de tirar su carta. No lo hace.',
      'Tirás el ancho de basto y él responde con el 7 de oro, que es la cuarta carta del mazo. Perdió la segunda y con ella la mano: te llevás 2 puntos y quedás 6 a 6.',
    ],
    lesson: 'Matá con la carta más baja que gane la baza. Y con la primera ganada más una carta brava, el truco es casi seguro: acá sólo perdías si el rival tenía el ancho de espada entre sus dos cartas, y de las 36 que no veías esa posibilidad es de 2 en 36, menos del 6 %.',
  },
  {
    id: 'parda-en-primera',
    title: '2. Parda en primera: la segunda vale toda la mano',
    setup: 'Sos mano. Nadie canta nada: los dos tantos son bajos.',
    mine: [[3, 'oro'], [7, 'espada'], [5, 'copa']],
    rival: [[3, 'basto'], [1, 'copa'], [6, 'oro']],
    steps: [
      'Abrís con el 3 de oro y el rival tira el 3 de basto. Todos los treses tienen el mismo puesto, así que la baza queda parda.',
      'Después de una parda abre de nuevo la mano: vos. Y desde ahora rige una regla corta: quien gane la segunda se lleva la mano.',
      'Por eso tirás tu mejor carta, el 7 de espada. Sólo le ganan los dos anchos verdaderos, el de espada y el de basto.',
      'El rival tiene el 1 de copa, un ancho falso, que pierde contra el 7 de espada. Ganaste la segunda y la mano terminó ahí: el 5 de copa ni se juega.',
    ],
    lesson: 'Con la primera parda, en la segunda va la carta más alta que tengas. Guardarla para la tercera no sirve, porque si perdés la segunda no hay tercera. Si la segunda también sale parda, define la tercera; y si las tres son pardas, gana quien es mano.',
  },
  {
    id: 'tercera-parda',
    title: '3. Una baza para cada uno y la tercera parda',
    setup: 'Sos pie. Otra vez nadie canta: lo que importa acá es el orden de las bazas.',
    mine: [[7, 'oro'], [5, 'espada'], [4, 'copa']],
    rival: [[3, 'espada'], [12, 'oro'], [4, 'basto']],
    steps: [
      'El rival abre con el 3 de espada y lo matás con el 7 de oro: la primera es tuya.',
      'Abrís la segunda con el 5 de espada y el rival la gana con el 12 de oro. Van una baza cada uno, y como él ganó la segunda, él abre la tercera.',
      'Tira el 4 de basto. A vos te queda el 4 de copa, que no le gana a casi nada. Pero acá no hace falta ganar: alcanza con empatar.',
      'Tirás el 4 de copa y la tercera queda parda. Con una baza para cada uno y la tercera parda, gana quien hizo la primera: vos.',
    ],
    lesson: 'La primera baza vale doble, porque desempata. Por eso conviene pelearla: si después hay una parda en cualquier momento, la mano es de quien la ganó.',
  },
  {
    id: 'envido-de-33',
    title: '4. Treinta y tres siendo pie: ¿quiero o subir?',
    setup: 'Partida a 15, 3 a 3. Sos pie. Tus dos copas suman 7 + 6 + 20: 33, el tanto más alto que existe.',
    mine: [[7, 'copa'], [6, 'copa'], [12, 'espada']],
    rival: [[7, 'oro'], [12, 'oro'], [2, 'basto']],
    steps: [
      'El rival, que es mano, canta envido antes de tirar su primera carta.',
      'Con 33 podrías decir quiero y jugar por 2 puntos. Pero conviene subir, porque el rival cantó y su tanto seguramente es bueno. Cantás real envido: si no quiere, cobrás 2, lo del envido que ya estaba aceptado; si quiere, la cadena vale 5.',
      'El rival quiere. La mano declara primero y dice 27: el 7 de oro más el 12, que vale cero, más 20. Vos tocás Tengo y el juego dice 33.',
      'Ganás 5 puntos y quedás 8 a 3. Al terminar la mano, el juego muestra en la mesa el 7 y el 6 de copa, las cartas que forman tu tanto. El 12 de espada sigue tapado.',
    ],
    lesson: 'Con 33 siendo pie ganás 99 de cada 100 veces: perdés sólo si el rival también tiene 33, porque los empates del envido los gana la mano. ¿Y la falta envido? Acá valía 12 puntos, lo que le falta al puntero para llegar a 15: si te la querían ganabas la partida, y si no, cobrabas los mismos 2 que con el real envido. El real envido busca que te digan quiero; la falta, terminar el partido. Con 27, casi nadie quiere una falta.',
  },
  {
    id: 'cuanto-vale-la-falta',
    title: '5. Cuánto vale la falta envido',
    setup: 'Partida a 30. Vas 22 a 12: vos estás en las buenas y el rival todavía en las malas. Sos mano y tus dos bastos suman 28.',
    mine: [[5, 'basto'], [3, 'basto'], [1, 'oro']],
    rival: [[7, 'espada'], [3, 'espada'], [11, 'copa']],
    steps: [
      'El rival canta falta envido de entrada.',
      'La falta vale lo que le falta al puntero para ganar. El puntero sos vos: 30 menos 22 son 8 puntos. No son 18, lo que le falta a él: se cuenta siempre con el que va adelante, aunque la cante el que va atrás.',
      'Si no querés, el rival suma 1, porque era el primer canto. Si querés y ganás, sumás 8, llegás a 30 y la partida termina en ese instante, sin jugar las cartas. Si querés y perdés, él suma 8.',
      'Con 28 siendo mano ganás casi 9 de cada 10 envidos contra una mano cualquiera, pero quien canta una falta no suele tener una mano cualquiera. Querés igual: es la chance de cerrar la partida.',
      'Declarás 28 y el rival dice 30: el 7 y el 3 de espada. Él suma 8 y queda 20 a 22. Te alcanzó con un solo canto.',
    ],
    lesson: 'La falta la cuenta el puntero. Para el que va adelante es un riesgo acotado; para el que va atrás es jugarse la partida, porque si pierde le da al rival justo los puntos que le faltaban. Cerca del final vale poco: en una partida a 15 que va 13 a 10, la falta vale sólo 2.',
  },
  {
    id: 'tener-el-quiero',
    title: '6. Tener el quiero: quién puede subir',
    setup: 'Partida a 15, 9 a 9. Sos mano y tenés el ancho de espada, la carta más alta del truco.',
    mine: [[1, 'espada'], [2, 'oro'], [11, 'copa']],
    rival: [[7, 'espada'], [3, 'copa'], [5, 'basto']],
    steps: [
      'Antes de tirar cantás truco, y el rival dice quiero. La mano vale 2.',
      'Tirás el 2 de oro y el rival lo mata con el 3 de copa. Él ganó la primera y abre la segunda.',
      'Te gustaría retrucar: tenés el ancho de espada y sabés que la segunda es tuya. Pero no podés. Cantaste truco y él lo quiso, así que la próxima subida es de él: él tiene el quiero.',
      'El rival canta retruco y tira el 7 de espada. Vos decís quiero y la mano pasa a valer 3. Ahora el quiero es tuyo: el vale cuatro sólo lo podés cantar vos.',
      'Matás el 7 con el ancho de espada: una baza cada uno y abrís la tercera. Podrías cantar vale cuatro, pero tu última carta es un 11 y no sabés qué le queda al rival. No lo cantás. Tirás el 11 de copa y él tiene el 5 de basto, que pierde: sumás 3 y quedás 12 a 9.',
    ],
    lesson: 'Después de un quiero, la siguiente subida le toca a quien aceptó. Si cantaste truco y te lo quisieron, esperá: cuando el rival cante retruco decidís si querés, si no querés o si subís a vale cuatro. Al responder un canto también se puede subir directo: un truco se puede contestar con retruco.',
  },
  {
    id: 'el-envido-va-primero',
    title: '7. Te cantan truco y tenés 30: el envido va primero',
    setup: 'Sos pie. Tus espadas suman 6 + 4 + 20: 30. Para el truco, en cambio, tus cartas son flojas.',
    mine: [[6, 'espada'], [4, 'espada'], [12, 'oro']],
    rival: [[5, 'oro'], [10, 'oro'], [1, 'basto']],
    steps: [
      'El rival, que es mano, abre cantando truco antes de tirar.',
      'Todavía estás en la primera baza y no tiraste ninguna carta, así que podés cantar envido antes de contestar el truco. Lo cantás, y el truco queda en espera.',
      'El rival quiere el envido y declara 25: el 5 de oro más el 10, que vale cero, más 20. Vos decís 30 y sumás 2.',
      'Ahora sí respondés el truco. Con un 6, un 4 y un 12, y un rival que cantó primero, decís no quiero: él suma 1 y la mano termina.',
    ],
    lesson: 'Si te cantan truco en la primera baza y tenés tanto, cantá el envido antes de responder. Si contestabas primero, lo perdías: con el truco querido ya no se puede cantar envido, y con el truco rechazado la mano termina. Así, la mano te dejó 2 a 1 en vez de 0 a 1.',
  },
  {
    id: 'irse-al-mazo',
    title: '8. Irse al mazo sin regalar el envido',
    setup: 'Sos pie y tus bastos suman 6 + 5 + 20: 31. Para el truco tenés casi nada.',
    mine: [[6, 'basto'], [5, 'basto'], [4, 'oro']],
    rival: [[7, 'copa'], [2, 'copa'], [1, 'espada']],
    steps: [
      'El rival canta envido y vos decís quiero. La mano declara primero: 29.',
      'Te toca declarar. Además de Tengo podés irte al mazo, y con estas cartas para el truco te dan ganas. Pero si te vas ahora, el rival cobra el envido querido más la mano: 3 puntos para él.',
      'Tocás Tengo: el juego dice 31 y sumás 2.',
      'Después el rival canta truco. Con un 6, un 5 y un 4 no le ganás a casi nada: decís no quiero y él suma 1. Es lo mismo que cuesta irse al mazo sin truco aceptado: 1 punto.',
    ],
    lesson: 'Irse al mazo no borra lo que ya estaba querido. Con el envido aceptado y sin declarar, el rival cobra ese envido aunque te vayas. Primero declarás, después te vas: acá fue +2 y −1 en vez de −3.',
  },
]

const faqs = [
  {
    q: '¿Quién gana la mano si la primera baza es parda?',
    a: 'La segunda baza decide: quien la gane se lleva la mano. Si la segunda también es parda, define la tercera, y si las tres quedan pardas gana quien es mano.',
  },
  {
    q: '¿Cuántos puntos vale la falta envido?',
    a: 'Lo que le falta al que va adelante para ganar la partida. En una partida a 30 que va 22 a 12, la falta vale 8 para cualquiera de los dos que la gane. Rechazada de entrada da 1 punto.',
  },
  {
    q: '¿Se puede cantar envido después de que te cantan truco?',
    a: 'Sí, si todavía estás en la primera baza y no tiraste ninguna carta. Se resuelve primero el envido y después se contesta el truco. Con el truco ya querido, el envido no se puede cantar.',
  },
  {
    q: '¿Cuánto cuesta irse al mazo?',
    a: 'Lo que estaba en juego: 1 punto sin truco aceptado, o el valor del truco aceptado. Si el envido estaba querido y todavía no se declararon los tantos, el rival cobra también ese envido.',
  },
]

export default function ManosExplicadasPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Manos de truco explicadas"
      breadcrumb="Manos explicadas"
      intro="Las reglas se entienden mejor jugando. Acá hay ocho manos de truco argentino, jugadas de punta a punta, con las cartas de los dos lados y lo que conviene hacer en cada paso. Todas siguen las reglas de Trucazo: mano a mano, a 15 o 30 puntos y sin flor."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Manos de truco explicadas', path)} />
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

      <Section title="Cómo leer los ejemplos">
        <p>
          En cada mano vas a ver tus tres cartas y las del rival. En una partida de
          verdad las del rival no se ven: acá están para que se entienda por qué salió
          cada baza. Las decisiones se toman con lo que se ve en la mesa en ese
          momento.
        </p>
        <p>
          Si una palabra no te suena —mano, pie, parda, tener el quiero—, está en el{' '}
          <Link href="/glosario-truco" className={linkClass}>glosario del truco</Link>.
          Para saber qué carta le gana a cuál, tené a mano el{' '}
          <Link href="/orden-cartas-truco" className={linkClass}>orden de las cartas</Link>.
        </p>
      </Section>

      {examples.map(example => (
        <Section key={example.id} title={example.title}>
          <div id={example.id} className="scroll-mt-6 flex flex-col gap-4">
            <p>{example.setup}</p>
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row">
              <Hand label="Tus cartas" cards={example.mine} />
              <Hand label="Las del rival" cards={example.rival} />
            </div>
            <ol className="list-decimal pl-5 flex flex-col gap-2">
              {example.steps.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="rounded-2xl border border-gold/30 bg-surface2 p-4">
              <strong className="text-gold">Lo que deja: </strong>
              {example.lesson}
            </p>
          </div>
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

      <Section title="Para seguir">
        <p>
          Los porcentajes del envido salen de la tabla de la{' '}
          <Link href="/como-ganar-al-truco" className={linkClass}>guía de estrategia</Link>,
          calculada sobre todas las manos posibles. Los casos raros de empates están en
          la <Link href="/pardas-truco-reglas" className={linkClass}>guía de pardas</Link>{' '}
          y todas las combinaciones de cantos, en la{' '}
          <Link href="/envido-real-envido-falta-envido" className={linkClass}>tabla del envido</Link>.
        </p>
        <p>
          En{' '}
          <Link href="/truco-en-parejas" className={linkClass}>parejas</Link>{' '}
          valen las mismas reglas, con dos jugadores por equipo y el envido declarado
          por los cuatro. Si recién empezás, arrancá por{' '}
          <Link href="/como-se-juega-al-truco" className={linkClass}>cómo se juega al truco</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
