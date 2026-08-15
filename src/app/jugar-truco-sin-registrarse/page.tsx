import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import PlayNowBlock from '@/components/PlayNowBlock'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/jugar-truco-sin-registrarse'
const title = 'Jugar al truco sin registrarse: modo invitado'
const description =
  'Probá Trucazo sin crear una cuenta. Entrá como invitado, conocé el lobby y jugá al truco argentino desde el navegador.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description,
  url: SITE_URL + path,
  inLanguage: 'es-AR',
}

export default function SinRegistroPage() {
  return (
    <SeoPageLayout
      title="Jugar al truco sin registrarse"
      breadcrumb="Jugar sin registrarse"
      intro="El modo invitado crea un perfil temporal y te lleva al lobby sin pedir email ni contraseña. Sirve para probar una partida antes de decidir si querés una cuenta."
    >
      <JsonLd data={pageJsonLd} />
      <JsonLd data={createBreadcrumbJsonLd('Jugar al truco sin registrarse', path)} />
      <PlayNowBlock
        title="Entrar como invitado"
        text="Se crea una sesión anónima y temporal con 1.000 monedas ficticias."
        source="sin_registro_hero"
      />

      <Section title="Qué podés hacer como invitado">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Entrar al lobby y jugar partidas 1 contra 1.</li>
          <li>Elegir mesas a 15 o 30 puntos.</li>
          <li>Usar envido, real envido, falta envido y toda la cadena del truco.</li>
          <li>Conocer la experiencia antes de entregar datos de registro.</li>
        </ul>
      </Section>

      <Section title="Qué diferencia tiene una cuenta">
        <p>
          Una cuenta registrada conserva entre visitas tu nombre, monedas, historial,
          amistades, grupos, personalización, medallas y progreso del Modo Historia. La
          sesión invitada está pensada para una visita y puede cerrarse al abandonar el
          sitio o después de quedar inactiva.
        </p>
      </Section>

      <Section title="Privacidad del modo invitado">
        <p>
          No solicita email ni contraseña. El sistema igualmente necesita crear un
          identificador anónimo y un perfil temporal para ubicarte en una partida,
          actualizar el marcador y aplicar las reglas del juego. Consultá la{' '}
          <Link href="/privacidad" className="text-gold underline underline-offset-2">política de privacidad</Link>{' '}
          para conocer los datos técnicos utilizados.
        </p>
      </Section>

      <Section title="Antes de la primera partida">
        <p>
          Si nunca jugaste, guardá a mano el{' '}
          <Link href="/orden-cartas-truco" className="text-gold underline underline-offset-2">orden de las cartas</Link>{' '}
          y la{' '}
          <Link href="/calculadora-envido" className="text-gold underline underline-offset-2">calculadora de envido</Link>.
          La guía de{' '}
          <Link href="/como-se-juega-al-truco" className="text-gold underline underline-offset-2">reglas completas</Link>{' '}
          explica el resto.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
