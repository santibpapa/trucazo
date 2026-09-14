import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { createArticleJsonLd, createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/truco-en-parejas'
const title = 'Truco en parejas: cómo jugar 2 vs 2 con cuatro jugadores'
const description =
  'Cómo se juega al truco argentino de a cuatro: quién es compañero de quién, orden de la mesa, envido declarado por turno, truco por equipo y puntaje compartido.'

export const metadata = createPublicMetadata({ title, description, path })

const faqs = [
  {
    q: '¿Quién es mi compañero en el truco 2 vs 2?',
    a: 'El jugador que tenés enfrente. Los cuatro se sientan alternados, de modo que nunca quedás al lado de tu compañero: a tu izquierda y a tu derecha siempre hay un rival.',
  },
  {
    q: '¿Cuántas cartas se reparten?',
    a: 'Tres a cada uno, igual que en el mano a mano. Entre los cuatro se reparten doce de las cuarenta cartas del mazo español.',
  },
  {
    q: '¿El envido lo canta uno solo o todo el equipo?',
    a: 'Lo canta un jugador, pero compromete a su equipo. Al momento de declarar, cada uno dice su tanto por turno empezando por la mano, y solo canta el número si supera al mejor declarado hasta ahí. Si no lo supera, dice son buenas.',
  },
  {
    q: '¿Qué pasa si un jugador se va al mazo?',
    a: 'Se cierra la mano completa y los puntos en juego van al equipo contrario. No es una decisión individual: arrastra también a tu compañero, así que conviene pensarla.',
  },
  {
    q: '¿Se puede jugar 2 vs 2 con señas?',
    a: 'En una mesa de bar las señas son parte del juego. En Trucazo no existen: no hay canal privado entre compañeros y todo lo que se escribe en el chat rápido lo ve la mesa entera.',
  },
  {
    q: '¿Puedo jugar en parejas si me faltan jugadores?',
    a: 'Sí. Al armar la mesa podés completar los lugares vacíos con bots, así sea uno solo o los tres. La partida arranca cuando los cuatro asientos están ocupados.',
  },
]

export default function TrucoEnParejasPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Cómo jugar al truco en parejas (2 vs 2)"
      breadcrumb="Truco en parejas"
      intro="El truco de a cuatro es el que se juega en las mesas de bar y en los campeonatos: dos parejas, cartas que se cuidan entre compañeros y cantos que comprometen a todo el equipo. Esta guía explica cómo funciona y cómo jugarlo en Trucazo."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Truco en parejas', path)} />

      <Section title="Cómo se arma la mesa">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Juegan cuatro personas: dos equipos de dos.</li>
          <li>Los compañeros se sientan enfrentados, nunca uno al lado del otro.</li>
          <li>Cada jugador tiene un rival a su izquierda y otro a su derecha.</li>
          <li>Se usa un mazo español de 40 cartas y se reparten tres a cada uno.</li>
          <li>Quien está a la derecha del repartidor es mano y abre la primera baza.</li>
          <li>La mano se corre un lugar en cada reparto, siempre en el mismo sentido.</li>
        </ul>
        <p>
          Esa disposición cruzada es la clave de la modalidad: como entre dos compañeros
          siempre juega un rival, el que va último de su equipo en cada baza tiene la
          ventaja de ver más cartas antes de decidir.
        </p>
      </Section>

      <Section title="Cómo se juega cada mano">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>La mano abre la baza y los demás juegan en orden alrededor de la mesa.</li>
          <li>Gana la baza la carta más alta de las cuatro, según la jerarquía de siempre.</li>
          <li>La baza es del equipo, no del jugador: da lo mismo cuál de los dos la ganó.</li>
          <li>Quien ganó abre la siguiente baza; si hubo parda, sigue abriendo el mismo de antes.</li>
          <li>El equipo que se lleva dos de las tres bazas gana la mano.</li>
        </ol>
        <p>
          Los empates funcionan igual que en el{' '}
          <Link href="/truco-dos-jugadores" className="text-gold underline underline-offset-2">mano a mano</Link>,
          con una aclaración: si cada equipo ganó una baza y la tercera queda parda, la
          mano es para el que ganó la primera. El detalle completo de esos casos está en{' '}
          <Link href="/pardas-truco-reglas" className="text-gold underline underline-offset-2">la guía de pardas</Link>.
        </p>
      </Section>

      <Section title="El envido de a cuatro">
        <p>
          Acá está la diferencia más grande con el mano a mano. El envido lo canta un
          jugador, pero cuando se acepta juegan los cuatro tantos, y se declaran de a uno
          siguiendo el orden de la mesa desde quien es mano.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>El primero en hablar canta su tanto, sea el que sea.</li>
          <li>Los siguientes solo cantan su número si supera al mejor declarado hasta ese momento.</li>
          <li>Si no lo supera, dicen son buenas y no revelan cuánto tienen.</li>
          <li>En caso de empate gana el que declaró primero, es decir el más cercano a la mano.</li>
        </ul>
        <p>
          Por eso conviene escuchar antes de hablar: cuando tu compañero ya cantó un tanto
          alto, tu número deja de importar y lo único que hacés al decirlo es regalarle
          información al rival. La{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>{' '}
          sirve para practicar la cuenta, y en{' '}
          <Link href="/envido-real-envido-falta-envido" className="text-gold underline underline-offset-2">la tabla de cantos</Link>{' '}
          está cuánto se arriesga con cada uno.
        </p>
      </Section>

      <Section title="El truco es del equipo">
        <p>
          Cuando alguien canta truco, retruco o vale cuatro, el canto queda a nombre de su
          equipo. Responde el equipo contrario, y con que conteste uno de los dos alcanza:
          esa respuesta obliga también a su compañero.
        </p>
        <p>
          Lo mismo pasa al irse al mazo. No es una retirada personal: cierra la mano
          entera y le entrega los puntos al otro equipo, con las cartas de tu compañero
          adentro. Es la decisión que más conviene pensar dos veces en esta modalidad.
        </p>
      </Section>

      <Section title="Qué cambia frente al mano a mano">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-surface2 text-cream"><tr><th className="p-3">Mano a mano</th><th className="p-3">En parejas</th></tr></thead>
            <tbody className="divide-y divide-line">
              <tr><td className="p-3">Se ven seis cartas por mano.</td><td className="p-3">Se ven doce: hay mucha más información en la mesa.</td></tr>
              <tr><td className="p-3">Cada canto es una decisión propia.</td><td className="p-3">Cada canto compromete al compañero.</td></tr>
              <tr><td className="p-3">El envido lo comparan dos tantos.</td><td className="p-3">Se declaran por turno y muchos dicen son buenas.</td></tr>
              <tr><td className="p-3">Irse al mazo te afecta solo a vos.</td><td className="p-3">Irse al mazo entrega la mano de los dos.</td></tr>
              <tr><td className="p-3">Ganás o perdés por tu cuenta.</td><td className="p-3">El puntaje es compartido: se gana y se pierde en pareja.</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Consejos para jugar en pareja">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Si tu compañero ya está ganando la baza, guardá la carta buena para la próxima.</li>
          <li>Fijate en qué lugar de la ronda te toca jugar: ir último es una ventaja, usala.</li>
          <li>Antes de cantar truco pensá si tu compañero puede sostenerlo, no solo tus tres cartas.</li>
          <li>Cuando el rival canta son buenas, ya sabés que su tanto es bajo. Anotalo mentalmente.</li>
          <li>No cantes el envido por costumbre: en la mesa de a cuatro hay más tantos altos dando vueltas.</li>
        </ul>
      </Section>

      <Section title="Jugar 2 vs 2 en Trucazo">
        <p>
          En el lobby, tocá Crear mesa y elegí la modalidad 2vs2 · Parejas. Vas a ver la
          mesa desde arriba con un lugar por lado: tocás uno para sentarte y el que te
          queda enfrente es tu compañero.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Podés dejar la mesa abierta o hacerla privada y pasar el código a tus amigos.</li>
          <li>Los lugares que falten se completan con bots, así no esperás a nadie.</li>
          <li>Se juega a 15 o a 30 puntos, con el mismo reloj por jugada que el mano a mano.</li>
          <li>Cada uno pone su apuesta en monedas y la pareja que gana se lleva el pozo.</li>
          <li>Hay un chat rápido con frases de mesa, pero lo lee todo el mundo: no hay señas.</li>
        </ul>
        <p>
          Si nunca jugaste, conviene empezar por{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">las reglas generales</Link>{' '}
          y por el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>.
          También podés{' '}
          <Link href="/jugar-truco-sin-registrarse" className="text-gold underline underline-offset-2">probar como invitado</Link>{' '}
          antes de crear una cuenta.
        </p>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="flex flex-col gap-4">
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
