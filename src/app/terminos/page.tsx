import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/terminos'
const title = 'Términos de uso de Trucazo'
const description =
  'Condiciones básicas para utilizar Trucazo, sus cuentas, monedas ficticias, funciones sociales y contenidos.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function TerminosPage() {
  return (
    <SeoPageLayout
      title="Términos de uso"
      breadcrumb="Términos"
      intro="Al utilizar Trucazo aceptás estas condiciones básicas de convivencia y funcionamiento. Última actualización: 15 de agosto de 2026."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR', dateModified: '2026-08-15' }} />
      <JsonLd data={createBreadcrumbJsonLd('Términos de uso', path)} />

      <Section title="Uso permitido">
        <p>
          Trucazo ofrece una experiencia recreativa de truco argentino. Debés utilizarla
          de manera lícita, respetuosa y sin interferir con el servicio ni con otras
          personas.
        </p>
      </Section>

      <Section title="Cuentas y acceso">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li>Sos responsable de mantener seguras tus credenciales.</li>
          <li>No debés intentar acceder a cuentas, partidas o datos ajenos.</li>
          <li>El nombre, avatar y mensajes no deben suplantar, acosar ni vulnerar derechos.</li>
          <li>Las sesiones invitadas son temporales y pueden cerrarse por inactividad.</li>
          <li>Puede limitarse el acceso ante fraude, abuso, explotación de errores o incumplimiento grave.</li>
        </ul>
      </Section>

      <Section title="Monedas, recompensas y ausencia de apuestas">
        <p>
          Las monedas y recompensas son elementos ficticios del juego. No tienen valor
          monetario, no representan depósitos, no se convierten en dinero y no pueden
          retirarse. Trucazo no ofrece apuestas con dinero real.
        </p>
      </Section>

      <Section title="Contenido y convivencia">
        <p>
          Las funciones sociales no deben usarse para amenazas, hostigamiento, spam,
          discriminación, publicación de datos personales ni contenido ilegal. Al enviar
          comentarios o imágenes de soporte, garantizás que podés compartirlos y permitís
          que se usen para investigar el problema informado.
        </p>
      </Section>

      <Section title="Disponibilidad y cambios">
        <p>
          El servicio puede modificarse, interrumpirse temporalmente o corregir datos de
          juego para mantener seguridad e integridad. Se intenta conservar perfiles y
          progreso, pero no se garantiza disponibilidad ininterrumpida ni ausencia total
          de errores.
        </p>
      </Section>

      <Section title="Propiedad y código">
        <p>
          La marca, interfaz, ilustraciones y contenidos pertenecen a sus respectivos
          titulares. El código publicado en el{' '}
          <a href="https://github.com/santibpapa/trucazo" className="text-gold underline underline-offset-2" rel="noopener noreferrer">repositorio oficial</a>{' '}
          se rige por los avisos y condiciones presentes allí.
        </p>
      </Section>

      <Section title="Privacidad y contacto">
        <p>
          El tratamiento de información se explica en la{' '}
          <Link href="/privacidad" className="text-gold underline underline-offset-2">política de privacidad</Link>.
          Para consultas o reportes, usá los canales de{' '}
          <Link href="/contacto" className="text-gold underline underline-offset-2">contacto</Link>.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
