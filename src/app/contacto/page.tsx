import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/contacto'
const title = 'Contacto y soporte de Trucazo'
const description =
  'Canales oficiales para enviar comentarios, reportar un problema técnico o consultar sobre Trucazo.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function ContactoPage() {
  return (
    <SeoPageLayout
      title="Contacto y soporte"
      breadcrumb="Contacto"
      intro="Elegí el canal según lo que necesites. No publiques contraseñas, tokens, datos privados ni capturas que expongan información personal."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ContactPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR' }} />
      <JsonLd data={createBreadcrumbJsonLd('Contacto', path)} />

      <Section title="Problemas técnicos">
        <p>
          El canal público verificable del proyecto es el{' '}
          <a href="https://github.com/santibpapa/trucazo/issues" className="text-gold underline underline-offset-2" rel="noopener noreferrer">
            registro de incidencias en GitHub
          </a>
          . Antes de crear una, revisá si otra persona informó el mismo problema.
        </p>
        <p>
          Incluí qué estabas haciendo, qué esperabas que ocurriera, qué ocurrió y el
          dispositivo/navegador utilizado. Ocultá cualquier dato sensible.
        </p>
      </Section>

      <Section title="Comentario después de una partida">
        <p>
          La pantalla de{' '}
          <Link href="/resena" className="text-gold underline underline-offset-2">reseña de Trucazo</Link>{' '}
          permite calificar la experiencia, describir un inconveniente y adjuntar hasta
          tres imágenes. Se accede normalmente al terminar una partida y no se indexa en
          buscadores.
        </p>
      </Section>

      <Section title="Privacidad o eliminación de datos">
        <p>
          Para una consulta relacionada con datos personales, abrí una incidencia en el
          repositorio indicando únicamente que necesitás un canal privado. No publiques
          allí tu email, identificador de cuenta ni otra información personal. Revisá
          antes la{' '}
          <Link href="/privacidad" className="text-gold underline underline-offset-2">política de privacidad</Link>.
        </p>
      </Section>

      <Section title="Canales oficiales">
        <p>
          Este sitio y el repositorio enlazado arriba son los canales confirmados. No se
          presume que aplicaciones o perfiles homónimos en otras plataformas pertenezcan
          a Trucazo si no están enlazados desde estas páginas.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
