import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/truco-contra-computadora'
const title = 'Jugar al truco contra la computadora online'
const description =
  'Practicá truco argentino frente a bots: partidas rápidas 1 contra 1, mesas en parejas 2 vs 2 con los lugares completados por la máquina o rivales progresivos en el Modo Historia.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

// Los estilos salen de `campaign_rivals.strategy_profile` y de cómo los usa
// `_northwest_plan` en la base. Si cambia el cerebro de los bots, revisar acá.
const estilos = [
  {
    nombre: 'Paciente',
    texto: 'Espera una mano clara antes de cantar truco. Cuando canta, casi siempre tiene con qué sostenerlo.',
  },
  {
    nombre: 'Agresivo',
    texto: 'Canta truco con manos más justas y miente más que el promedio. Te obliga a decidir seguido.',
  },
  {
    nombre: 'Marcador',
    texto: 'Mira el tanteador: si va perdiendo se anima más, y si va ganando cuida la ventaja.',
  },
  {
    nombre: 'Calculador',
    texto: 'Juega por números: canta cuando sus chances de ganar la mano son buenas y casi nunca miente.',
  },
  {
    nombre: 'Farolero',
    texto: 'Es el que más miente. Puede cantar con cartas flojas, así que no le creas cada canto.',
  },
]

const faqs = [
  {
    q: '¿La computadora ve mis cartas?',
    a: 'No. Cada bot decide sólo con sus tres cartas y con las que ya se jugaron sobre la mesa, igual que una persona. El servidor guarda tu mano aparte y el bot no la puede leer.',
  },
  {
    q: '¿Puedo elegir la dificultad?',
    a: 'En el Modo Historia sí: elegís a qué rival desafiar y los del final del recorrido son más difíciles. En la partida rápida del lobby la dificultad no se elige.',
  },
  {
    q: '¿Necesito una cuenta para jugar contra la computadora?',
    a: 'No. Podés entrar como invitado y jugar al instante. Con una cuenta guardás monedas, fama y el avance del Modo Historia entre visitas.',
  },
  {
    q: '¿Se juega con plata?',
    a: 'No. Las monedas de Trucazo son ficticias: no se compran ni se cambian por dinero real.',
  },
]

export default function ContraComputadoraPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Jugar al truco contra la computadora"
      breadcrumb="Truco contra la computadora"
      intro="Trucazo incluye rivales controlados por computadora para empezar sin esperar a otra persona. Podés jugar una partida rápida o avanzar por una campaña con dificultad creciente."
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR' }} />
      <JsonLd data={createBreadcrumbJsonLd('Truco contra la computadora', path)} />
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
      <PlayNowBlock text="Entrá al lobby y usá “Jugar ya” para encontrar una partida disponible." source="contra_cpu_hero" />

      <Section title="Tres formas de enfrentar bots">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Partida rápida</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">“Jugar ya” abre una mesa a 30 puntos. Si en unos segundos no se sienta nadie, entra un jugador de la casa para que no te quedes esperando.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Mesa en parejas</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">En una mesa 2 vs 2 podés completar con bots los lugares que falten, sea uno solo o los tres, y empezar sin esperar a nadie.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Modo Historia</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Una campaña por 15 provincias argentinas, de Buenos Aires a Jujuy, con 66 rivales de dificultad, personalidad y recompensas progresivas.</p>
          </div>
        </div>
      </Section>

      <Section title="Cómo piensa la computadora">
        <p>
          Los rivales de Trucazo no juegan al azar ni hacen trampa. En cada turno miran
          lo mismo que miraría una persona sentada a la mesa:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>
            <strong>Sus tres cartas.</strong> Calculan su tanto de envido y qué tan
            probable es ganar la mano con lo que les queda.
          </li>
          <li>
            <strong>Las cartas que ya salieron.</strong> Si ya jugaste un ancho, saben
            que no lo tenés más, y ajustan la carta que tiran.
          </li>
          <li>
            <strong>El tanteador.</strong> Los bots del lobby y de la Ruta del Noroeste
            no regalan la partida: si rechazar un canto te da los puntos que te faltan,
            lo aceptan aunque tengan poco.
          </li>
          <li>
            <strong>Su personalidad.</strong> Dos bots con la misma mano pueden decidir
            distinto: uno se anima a mentir y otro espera una mano mejor.
          </li>
        </ul>
        <p>
          Antes de un canto importante se toman unos segundos, como una persona que lo
          piensa. Pueden aceptar, rechazar o subir el envido y el truco, mentir con
          cartas flojas e irse al mazo cuando la mano no da para más.
        </p>
      </Section>

      <Section title="Cinco estilos de rival">
        <p>
          En la Ruta del Noroeste del Modo Historia (La Rioja, Catamarca, Tucumán, Salta
          y Jujuy), cada rival juega con uno de estos estilos, y los bots del lobby
          también. Conocerlo te dice qué esperar de sus cantos:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {estilos.map(({ nombre, texto }) => (
            <div key={nombre} className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-semibold text-gold">{nombre}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{texto}</p>
            </div>
          ))}
        </div>
        <p>
          Los rivales de las provincias anteriores se diferencian por su dificultad y
          por qué tanto les gusta mentir y apostar fuerte.
        </p>
      </Section>

      <Section title="Los rivales difíciles aprenden de vos">
        <p>
          En el Modo Historia, Trucazo lleva la cuenta de cómo jugás: qué tan seguido
          cantás, cuántas veces cantás con cartas flojas y cuántas decís «no quiero».
          Los rivales más difíciles usan esa información a medida que ganás fama y
          jugás más manos.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Si mentís mucho, te creen menos y aceptan más tus cantos.</li>
          <li>
            Si cantás poco y rechazás seguido, te ven como un rival que se asusta: te
            van a apretar con más cantos y más mentiras.
          </li>
        </ul>
        <p>
          Por eso, contra los últimos rivales del recorrido, repetir siempre la misma
          jugada sale caro. Cambiá el ritmo: cantá algunas manos medianas y no mientas
          siempre en el mismo momento.
        </p>
      </Section>

      <Section title="Consejos para ganarle a la computadora">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>
            <strong>Usá la primera baza para informarte.</strong> La carta que tira el
            bot te dice mucho de lo que le queda.
          </li>
          <li>
            <strong>Mirá el tanteador antes de cantar.</strong> Cerca del final, cada
            «no quiero» puede valer la partida. Si te faltan pocos puntos, el rival no
            puede rechazar tus cantos; si le faltan pocos a él, vos tampoco.
          </li>
          <li>
            <strong>No te vayas al mazo con cualquier mano floja.</strong> Le da al
            rival un punto, o lo que vale el truco aceptado, y los rivales que te leen
            lo notan.
          </li>
          <li>
            <strong>Desconfiá cuando te quieren una falta envido.</strong> Es la
            apuesta más grande del envido y la computadora sólo la acepta con un tanto
            muy alto.
          </li>
          <li>
            <strong>Identificá al farolero.</strong> Si un rival canta mucho y pierde
            seguido al mostrar, aceptale más.
          </li>
        </ol>
        <p>
          La{' '}
          <Link href="/como-ganar-al-truco" className="text-gold underline underline-offset-2">guía de estrategia</Link>{' '}
          explica estas ideas con más detalle y ejemplos de manos.
        </p>
      </Section>

      <Section title="Para qué sirve practicar así">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Memorizar el orden de las cartas sin presión.</li>
          <li>Entender cuándo se cierra una mano por parda.</li>
          <li>Practicar los valores y respuestas del envido.</li>
          <li>Probar bluffs y observar cómo cambia el riesgo del rival.</li>
          <li>Jugar a cualquier hora, aunque no haya otras personas conectadas.</li>
        </ul>
      </Section>

      <Section title="Practicar en parejas con bots">
        <p>
          En una mesa 2 vs 2 los bots pueden ser rivales o tu compañero. Si te toca un
          compañero bot, los cantos los respondés vos mientras puedas: el bot no
          contesta por vos. Es una buena forma de aprender cómo cambia el truco de a
          cuatro, donde el tanto del equipo es el mejor de los dos y irse al mazo cierra
          la mano para la pareja.
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

      <Section title="Herramientas para aprender">
        <p>
          Antes o durante tus primeras partidas, consultá el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>,
          calculá una mano en la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>,
          revisá el{' '}
          <Link href="/modo-historia-truco" className="text-gold underline underline-offset-2">recorrido del Modo Historia</Link>{' '}
          o mirá cómo funciona el{' '}
          <Link href="/truco-en-parejas" className="text-gold underline underline-offset-2">truco en parejas</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
