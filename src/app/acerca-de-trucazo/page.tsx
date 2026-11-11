import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/acerca-de-trucazo'
const title = 'Acerca de: cómo nació y cómo funciona'
const description =
  'Qué es Trucazo, cómo creció desde mayo de 2026, cómo se cuida que el juego sea limpio y cómo se prueban sus reglas de truco argentino.'

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

      <Section title="Cómo empezó y cómo creció">
        <p>
          Trucazo empezó a construirse en mayo de 2026 como un mano a mano en el
          navegador. Desde entonces creció de a una pieza por vez:
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li><strong>Junio de 2026:</strong> las reglas pasan a decidirse en el servidor, no en el teléfono de cada jugador.</li>
          <li><strong>Julio:</strong> llegan la comunidad, el chat y el Modo Historia por provincias.</li>
          <li><strong>Agosto:</strong> el Modo Historia suma la ruta de la Patagonia.</li>
          <li><strong>Septiembre:</strong> se suman el truco en parejas, 2 vs 2, los torneos y la ruta del noroeste, con la que el Modo Historia llega a 15 provincias y 66 rivales.</li>
          <li><strong>Octubre:</strong> las mesas se pueden compartir con un enlace.</li>
        </ul>
      </Section>

      <Section title="Un juego limpio">
        <p>
          El servidor es el árbitro. Cada carta jugada, cada canto y cada punto se
          deciden ahí, no en tu dispositivo. Por eso las cartas de tu rival no viajan a
          tu celular hasta que las juega o las muestra por el envido, y nadie puede
          cambiar el marcador desde su navegador.
        </p>
        <p>
          Las monedas son ficticias y no se pueden pasar de una cuenta a otra, así que no
          hay nada que ganar haciendo trampa. Para el trato entre jugadores rigen las{' '}
          <Link href="/convivencia" className="text-gold underline underline-offset-2">normas de convivencia</Link>,
          y quien tiene cuenta puede denunciar o bloquear a otra persona. La denuncia
          es privada: no se informa quién la hizo.
        </p>
      </Section>

      <Section title="Cómo se prueban las reglas">
        <p>
          Más de 30 pruebas automáticas arman una copia vacía de la base de datos y
          juegan sobre ella. Revisan, por ejemplo, que el
          envido nunca pase de 33, cómo se resuelve una tercera baza parda, que una
          partida en parejas se juegue de punta a punta y que los torneos armen bien sus
          cruces. Las pruebas corren en cada cambio propuesto, antes de que llegue al
          sitio.
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
