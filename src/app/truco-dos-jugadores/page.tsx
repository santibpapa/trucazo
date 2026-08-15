import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { createArticleJsonLd, createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/truco-dos-jugadores'
const title = 'Truco para dos jugadores: reglas del mano a mano'
const description =
  'Cómo jugar al truco argentino entre dos: reparto, mano y pie, envido, bazas, pardas, puntaje y diferencias con equipos.'

export const metadata = createPublicMetadata({ title, description, path })

export default function TrucoDosPage() {
  return (
    <SeoPageLayout
      title="Cómo jugar al truco entre dos"
      breadcrumb="Truco para dos jugadores"
      intro="El truco mano a mano conserva el envido, el bluff y las tres bazas, pero elimina compañeros, señas y decisiones de equipo. Es la modalidad principal de Trucazo."
    >
      <JsonLd data={createArticleJsonLd({ headline: title, description, path })} />
      <JsonLd data={createBreadcrumbJsonLd('Truco para dos jugadores', path)} />

      <Section title="Preparación">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Usen un mazo español de 40 cartas.</li>
          <li>Elijan una partida a 15 o 30 puntos.</li>
          <li>Repartan tres cartas a cada jugador, de a una.</li>
          <li>Quien está a la derecha del repartidor es mano y juega primero.</li>
          <li>Al terminar, cambia el repartidor y se alterna la mano.</li>
        </ul>
      </Section>

      <Section title="Cómo transcurre cada mano">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>Antes de jugar la primera carta puede proponerse el envido.</li>
          <li>La mano abre la primera baza y el pie responde con cualquier carta.</li>
          <li>La carta más alta según la jerarquía gana la baza.</li>
          <li>Quien gana abre la siguiente; una parda mantiene la salida anterior.</li>
          <li>La mano termina cuando alguien asegura la mayoría de las bazas.</li>
        </ol>
      </Section>

      <Section title="Envido en el mano a mano">
        <p>
          Ambos comparan el mejor tanto de sus tres cartas. La mano declara primero y
          gana los empates. En Trucazo se puede cantar envido, real envido o falta envido
          durante la primera baza, antes de jugar la propia carta.
        </p>
        <p>
          La{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora</Link>{' '}
          ayuda a practicar la cuenta y la{' '}
          <Link href="/envido-real-envido-falta-envido" className="text-gold underline underline-offset-2">tabla de cantos</Link>{' '}
          muestra cuánto se arriesga.
        </p>
      </Section>

      <Section title="Qué cambia frente al truco en equipos">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-surface2 text-cream"><tr><th className="p-3">Mano a mano</th><th className="p-3">En equipos</th></tr></thead>
            <tbody className="divide-y divide-line">
              <tr><td className="p-3">Cada decisión es propia.</td><td className="p-3">Los cantos representan al equipo.</td></tr>
              <tr><td className="p-3">No existen señas a compañeros.</td><td className="p-3">Las señas coordinan las cartas del equipo.</td></tr>
              <tr><td className="p-3">La mano resuelve todos los empates.</td><td className="p-3">Importa el orden completo alrededor de la mesa.</td></tr>
              <tr><td className="p-3">Se reparten seis cartas en total.</td><td className="p-3">Se ven más cartas y cambia la lectura del mazo.</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Consejos para empezar">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Aprendé primero las cuatro cartas bravas y los grupos que empatan.</li>
          <li>No muestres siempre la fuerza de tu mano: el rival aprende tus patrones.</li>
          <li>Recordá qué cartas ya salieron para estimar qué puede quedar.</li>
          <li>Usá la posición de mano: desempata el envido y las triples pardas.</li>
        </ul>
      </Section>

      <Section title="Jugar la modalidad">
        <p>
          Trucazo está diseñado alrededor del 1 contra 1. Podés{' '}
          <Link href="/jugar-truco-sin-registrarse" className="text-gold underline underline-offset-2">probar como invitado</Link>,{' '}
          <Link href="/jugar-truco-con-amigos" className="text-gold underline underline-offset-2">crear una mesa con un amigo</Link>{' '}
          o practicar contra la computadora.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
