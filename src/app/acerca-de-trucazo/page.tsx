import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/acerca-de-trucazo'
const title = 'Acerca de Trucazo'
const description =
  'Conocé qué es Trucazo, qué modalidades de truco implementa —mano a mano y en parejas—, cómo se desarrolla y cuáles son sus principios editoriales.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function AcercaPage() {
  return (
    <SeoPageLayout
      path={path}
      title="Acerca de Trucazo"
      breadcrumb="Acerca de Trucazo"
      intro="Trucazo es un proyecto argentino independiente para aprender y jugar al truco desde el navegador, mano a mano o en parejas."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR', about: { '@type': 'VideoGame', name: 'Trucazo', url: SITE_URL } }} />
      <JsonLd data={createBreadcrumbJsonLd('Acerca de Trucazo', path)} />

      <Section title="Qué ofrece">
        <p>
          El juego funciona en celulares y computadoras con un navegador moderno. Se juega
          sin flor, a 15 o 30 puntos, en dos modalidades: mano a mano (1 contra 1) y en
          parejas (2 vs 2, cuatro jugadores). Incluye partidas con personas, mesas privadas,
          bots, Modo Historia, perfiles, comunidad y elementos de personalización.
        </p>
        <p>
          Puede utilizarse como PWA —una aplicación web instalable—, pero no hace falta
          descargar nada para empezar.
        </p>
      </Section>

      <Section title="Gratis y sin apuestas reales">
        <p>
          Trucazo usa monedas ficticias para organizar partidas y recompensas. No se
          convierten en dinero, no pueden retirarse y no representan una apuesta con
          valor económico real.
        </p>
      </Section>

      <Section title="Cómo se mantiene el contenido">
        <p>
          Las guías describen primero la variante implementada por el juego y señalan
          cuando una regla tradicional puede variar entre mesas. Se contrastan con el
          código público del proyecto y fuentes externas especializadas. No se publican
          reseñas, cifras de uso ni reconocimientos inventados.
        </p>
      </Section>

      <Section title="Proyecto y desarrollo">
        <p>
          El código fuente y el historial de desarrollo están disponibles en el{' '}
          <a href="https://github.com/santibpapa/trucazo" className="text-gold underline underline-offset-2" rel="noopener noreferrer">
            repositorio oficial de Trucazo en GitHub
          </a>
          . Allí pueden verificarse las funcionalidades y reportarse problemas técnicos.
        </p>
      </Section>

      <Section title="Contacto y políticas">
        <p>
          Para soporte o comentarios, visitá la página de{' '}
          <Link href="/contacto" className="text-gold underline underline-offset-2">contacto</Link>.
          También podés consultar la{' '}
          <Link href="/privacidad" className="text-gold underline underline-offset-2">política de privacidad</Link>{' '}
          y los{' '}
          <Link href="/terminos" className="text-gold underline underline-offset-2">términos de uso</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
