import Image from 'next/image'
import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/modo-historia-truco'
const title = 'Modo Historia de Trucazo: campaña contra rivales'
const description =
  'Recorré provincias argentinas jugando al truco contra rivales con dificultad creciente, recompensas, fama y progresión.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function ModoHistoriaPage() {
  return (
    <SeoPageLayout
      title="Modo Historia de Trucazo"
      breadcrumb="Modo Historia"
      intro="Una campaña de truco mano a mano por Argentina. Cada parada presenta un rival con personalidad, dificultad y recompensa propias."
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR' }} />
      <JsonLd data={createBreadcrumbJsonLd('Modo Historia de Trucazo', path)} />

      <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
        <Image
          src="/lobby/banner-historia.webp"
          alt="Mapa del Modo Historia de Trucazo con un camino y rivales de dificultad creciente"
          width={1536}
          height={768}
          className="h-auto w-full"
          priority
        />
        <figcaption className="px-4 py-3 text-sm text-muted">La campaña avanza por provincias y rivales desbloqueables.</figcaption>
      </figure>

      <PlayNowBlock text="Entrá al lobby y abrí Modo Historia para comenzar el recorrido." source="historia_publica_hero" />

      <Section title="Cómo funciona la campaña">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>Elegís el primer rival disponible en el mapa.</li>
          <li>Jugás una partida mano a mano con el objetivo definido para ese duelo.</li>
          <li>Al ganar recibís monedas y desbloqueás el siguiente desafío.</li>
          <li>La dificultad y el comportamiento de los rivales cambian a medida que avanzás.</li>
          <li>Tu progreso y fama quedan asociados al perfil.</li>
        </ol>
      </Section>

      <Section title="Rivales con personalidad">
        <p>
          La campaña no usa un único bot repetido. Cada personaje tiene nombre,
          ilustración, frases, dificultad y parámetros de decisión. Algunos aceptan más
          desafíos, otros cuidan las monedas o ajustan su juego según tu reputación.
        </p>
      </Section>

      <Section title="Provincias y progresión">
        <p>
          El recorrido disponible incluye mapas de Buenos Aires, Santa Fe, Córdoba,
          Mendoza y Santiago del Estero. Los duelos se presentan como una campaña: no
          son páginas públicas ni perfiles de personas reales.
        </p>
      </Section>

      <Section title="¿Hace falta una cuenta?">
        <p>
          Para conservar desbloqueos, fama, monedas y avance entre visitas conviene usar
          una cuenta registrada. Podés conocer primero el juego con el modo invitado,
          pero su sesión es temporal.
        </p>
      </Section>

      <Section title="Prepararte para los desafíos">
        <p>
          Repasá las{' '}
          <Link href="/truco-dos-jugadores" className="text-gold underline underline-offset-2">reglas del mano a mano</Link>,
          el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>{' '}
          y los{' '}
          <Link href="/pardas-truco-reglas" className="text-gold underline underline-offset-2">casos de parda</Link>{' '}
          antes de enfrentar a los rivales más difíciles.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
