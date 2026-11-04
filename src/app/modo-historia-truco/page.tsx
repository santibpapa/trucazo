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
  'Recorré 15 provincias argentinas jugando al truco contra 66 rivales con dificultad creciente, recompensas, fama y progresión.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

// Datos de `campaign_provinces` y `campaign_rivals` en producción (04/11/2026).
// Si se suma una provincia o cambian los puntos o premios, actualizar esta tabla.
const provincias: [string, string, string][] = [
  ['Buenos Aires', '0', '50–150'],
  ['Santa Fe', '150', '170–400'],
  ['Córdoba', '250', '240–700'],
  ['Mendoza', '850', '750–1.500'],
  ['Santiago del Estero', '1.300', '1.300–2.500'],
  ['La Pampa', '3.000', '500–650'],
  ['Neuquén', '4.800', '600–750'],
  ['Río Negro', '7.600', '700–850'],
  ['Chubut', '11.000', '800–950'],
  ['Tierra del Fuego', '15.000', '900–1.500'],
  ['La Rioja', '17.500', '1.600–1.900'],
  ['Catamarca', '22.000', '2.000–2.300'],
  ['Tucumán', '26.000', '2.400–2.700'],
  ['Salta', '31.000', '2.800–3.100'],
  ['Jujuy', '36.500', '3.200–3.800'],
]

export default function ModoHistoriaPage() {
  return (
    <SeoPageLayout
      path={path}
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
          <li>Al ganar recibís monedas y puntos; con los puntos desbloqueás rivales y provincias nuevas.</li>
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
        <p>
          A medida que avanzás te hacés una fama, y los rivales más difíciles la usan
          para leerte: si mentís mucho o te achicás seguido, se dan cuenta. En{' '}
          <Link href="/truco-contra-computadora" className="text-gold underline underline-offset-2">cómo juega la computadora</Link>{' '}
          están los cinco estilos de rival y qué esperar de cada uno.
        </p>
      </Section>

      <Section title="15 provincias y 66 rivales">
        <p>
          El recorrido va de Buenos Aires a Jujuy, pasando por la Patagonia. Buenos
          Aires tiene seis rivales; las cuatro provincias siguientes, cinco cada una; y
          las diez del sur y el noroeste, cuatro. Cada provincia se abre al juntar los
          puntos que pide, y los premios crecen a medida que avanzás:
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-cream">
              <tr>
                <th className="p-2.5 sm:p-3">Provincia</th>
                <th className="p-2.5 sm:p-3">Puntos para entrar</th>
                <th className="p-2.5 sm:p-3">Monedas por victoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {provincias.map(([nombre, puntos, monedas]) => (
                <tr key={nombre}>
                  <td className="p-2.5 font-semibold text-cream sm:p-3">{nombre}</td>
                  <td className="p-2.5 sm:p-3">{puntos}</td>
                  <td className="whitespace-nowrap p-2.5 sm:p-3">{monedas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>En Buenos Aires se juega a 15 puntos; desde Córdoba, todos los duelos son a 30.</li>
          <li>Para entrar a La Pampa, además de los puntos, hay que vencer a Don Salvador, el Mudo, en Santiago del Estero.</li>
          <li>Las cinco provincias del noroeste (de La Rioja a Jujuy) piden vencer antes a Irene, la Antártica, en Tierra del Fuego.</li>
          <li>Desde La Pampa todos los rivales juegan en la dificultad más alta.</li>
        </ul>
        <p>
          Los duelos se presentan como una campaña: no son páginas públicas ni perfiles
          de personas reales.
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
          antes de enfrentar a los rivales más difíciles. Para los duelos del final, la{' '}
          <Link href="/como-ganar-al-truco" className="text-gold underline underline-offset-2">guía de estrategia</Link>{' '}
          explica con cuánto querer el envido y cuándo cantar truco.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
