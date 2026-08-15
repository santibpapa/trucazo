import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/truco-contra-computadora'
const title = 'Jugar al truco contra la computadora online'
const description =
  'Practicá truco argentino 1 contra 1 frente a bots: partidas rápidas en el lobby o rivales progresivos en el Modo Historia.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function ContraComputadoraPage() {
  return (
    <SeoPageLayout
      title="Jugar al truco contra la computadora"
      breadcrumb="Truco contra la computadora"
      intro="Trucazo incluye rivales controlados por computadora para empezar sin esperar a otra persona. Podés jugar una partida rápida o avanzar por una campaña con dificultad creciente."
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR' }} />
      <JsonLd data={createBreadcrumbJsonLd('Truco contra la computadora', path)} />
      <PlayNowBlock text="Entrá al lobby y usá “Jugar ya” para encontrar una partida disponible." source="contra_cpu_hero" />

      <Section title="Dos formas de enfrentar bots">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Partida rápida</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">El lobby puede completar una mesa con un bot para que el juego empiece sin una espera larga.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-gold">Modo Historia</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Una campaña por provincias argentinas presenta rivales con dificultad, personalidad y recompensas progresivas.</p>
          </div>
        </div>
      </Section>

      <Section title="Qué sabe hacer la computadora">
        <p>
          Los rivales evalúan la fuerza de sus cartas y el envido, pueden aceptar,
          rechazar o subir desafíos, irse al mazo y variar su riesgo según la dificultad.
          No conocen tus cartas: toman decisiones con la información disponible para un
          jugador y con parámetros propios de cada rival.
        </p>
      </Section>

      <Section title="Para qué sirve practicar así">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Memorizar el orden de las cartas sin presión.</li>
          <li>Entender cuándo se cierra una mano por parda.</li>
          <li>Practicar los valores y respuestas del envido.</li>
          <li>Probar bluffs y observar cómo cambia el riesgo del rival.</li>
        </ul>
      </Section>

      <Section title="Herramientas para aprender">
        <p>
          Antes o durante tus primeras partidas, consultá el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>,
          calculá una mano en la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>{' '}
          y revisá el{' '}
          <Link href="/modo-historia-truco" className="text-gold underline underline-offset-2">recorrido del Modo Historia</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
