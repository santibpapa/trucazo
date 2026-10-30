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
      path={path}
      title="Términos de uso"
      breadcrumb="Términos"
      intro="Condiciones de convivencia y funcionamiento para la web y Android. Antes de aportar contenido se pide aceptar las normas. Última actualización: 16 de octubre de 2026."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR', dateModified: '2026-10-16' }} />
      <JsonLd data={createBreadcrumbJsonLd('Términos de uso', path)} />

      <Section title="Uso permitido">
        <p>
          Trucazo ofrece una experiencia recreativa de truco argentino. Debés utilizarla
          de manera lícita, respetuosa y sin interferir con el servicio ni con otras
          personas.
        </p>
        <p>El servicio está dirigido a personas de 16 años o más. Si tu país o la tienda exige una edad mayor, se aplica ese límite. No está dirigido a niños; no solicitamos fecha de nacimiento ni afirmamos verificar la edad documentalmente.</p>
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

      <Section title="Monedas y partidas sin dinero real">
        <p>
          Las monedas y recompensas son elementos ficticios del juego. No tienen valor
          monetario, no representan depósitos, no se convierten en dinero y no pueden
          retirarse. Trucazo no ofrece apuestas con dinero real.
        </p>
        <p>En algunas mesas se arriesgan monedas ficticias y se ganan o pierden según el resultado. No se compran con dinero real, no se transfieren entre personas ni se canjean por bienes de valor. La tienda sólo permite adquirir personalización con esas monedas. No hay anuncios, cobros ni suscripciones.</p>
      </Section>

      <Section title="Torneos">
        <p>
          La inscripción y el check-in siguen los plazos publicados en cada torneo.
          El administrador puede reprogramar, cancelar, pausar, descalificar o reemplazar
          participantes según las reglas del torneo. Las partidas en curso pueden ser
          observadas por usuarios registrados, que solo ven las cartas ya jugadas.
          Los premios son monedas ficticias e insignias del perfil.
        </p>
      </Section>

      <Section title="Contenido y convivencia">
        <p>
          Las funciones sociales no deben usarse para amenazas, hostigamiento, spam,
          discriminación, publicación de datos personales ni contenido ilegal. Al enviar
          comentarios o imágenes de soporte, garantizás que podés compartirlos y permitís
          que se usen para investigar el problema informado.
        </p>
        <p>No se admite contenido sexual ni suplantación. Las normas abarcan nombres de personas y mesas, fotos, chats, grupos, invitaciones, novedades y reseñas. Podés denunciar desde el contenido o buscar el nombre exacto en <Link href="/convivencia" className="text-gold underline">Convivencia</Link>. Cada cuenta puede enviar hasta diez denuncias por día; reenviar el mismo contenido no crea otra. La denuncia es privada y la persona señalada no recibe la identidad de quien denunció.</p>
        <p>Bloquear funciona en ambos sentidos: oculta los mensajes del chat global y de mesa, elimina la amistad y solicitudes, cancela invitaciones a jugar pendientes con su reembolso e impide nuevos contactos, invitaciones a grupos y mesas casuales compartidas, incluso con código. Desbloquear no restaura amistades. Los grupos ya compartidos, perfiles, ranking e identidades de participantes siguen visibles. Una partida iniciada y los cruces de torneo continúan con sus reglas y puntajes. Silenciar sólo apaga los avisos del chat de esa mesa.</p>
        <p>Administración revisa las denuncias y puede cerrarlas sin sanción, retirar el contenido o retirarlo y restringir aportes sociales durante siete días. La restricción permite seguir jugando, denunciar y bloquear. La resolución se consulta en Convivencia; no se sanciona automáticamente por recibir denuncias. Para pedir revisión de una medida usá <Link href="/contacto" className="text-gold underline">Contacto</Link>.</p>
      </Section>

      <Section title="Disponibilidad y cambios">
        <p>
          El servicio puede modificarse, interrumpirse temporalmente o corregir datos de
          juego para mantener seguridad e integridad. Se intenta conservar perfiles y
          progreso, pero no se garantiza disponibilidad ininterrumpida ni ausencia total
          de errores.
        </p>
        <p>Historia sin conexión conserva partidas en ese dispositivo. Los premios oficiales sólo se acreditan cuando el servidor acepta los resultados al sincronizar. Desinstalar, borrar los datos locales o eliminar la cuenta puede perder resultados todavía sin sincronizar. Cerrar sesión conserva el guardado oculto para volver a entrar.</p>
      </Section>

      <Section title="Propiedad y código">
        <p>Las ilustraciones de la baraja GNU son de <a href="https://commons.wikimedia.org/wiki/File:Baraja_espa%C3%B1ola_completa.png" className="text-gold underline" rel="noopener noreferrer">Germarquezm y Basquetteur</a>, bajo <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.es" className="text-gold underline" rel="noopener noreferrer">CC BY-SA 3.0</a>. Se adaptaron a archivos por carta, tamaño y formato WebP; esas adaptaciones conservan la misma licencia. La atribución no implica respaldo de sus autores a Trucazo.</p>
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
