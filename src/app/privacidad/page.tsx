import Link from 'next/link'
import SeoPageLayout, { Section } from '@/components/SeoPageLayout'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/site'
import { createBreadcrumbJsonLd, createPublicMetadata } from '@/lib/seo'

const path = '/privacidad'
const title = 'Política de privacidad de Trucazo'
const description =
  'Qué datos utiliza Trucazo para cuentas, partidas, comunidad, analítica y soporte; para qué se usan y qué opciones tiene el usuario.'

export const metadata = createPublicMetadata({ title, description, path, type: 'website' })

export default function PrivacidadPage() {
  return (
    <SeoPageLayout
      title="Política de privacidad"
      breadcrumb="Privacidad"
      intro="Esta página explica en lenguaje claro qué información necesita Trucazo para funcionar. Última actualización: 15 de agosto de 2026."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR', dateModified: '2026-08-15' }} />
      <JsonLd data={createBreadcrumbJsonLd('Política de privacidad', path)} />

      <Section title="Datos que puede tratar el servicio">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li><strong>Cuenta:</strong> email, identificador de autenticación y nombre de usuario.</li>
          <li><strong>Perfil:</strong> avatar, monedas ficticias, personalización, amistades, grupos, medallas y progreso.</li>
          <li><strong>Juego:</strong> mesas, partidas, cartas necesarias durante la partida, resultados, tiempos y estadísticas.</li>
          <li><strong>Comunidad:</strong> mensajes, presencia y relaciones que el usuario decide utilizar.</li>
          <li><strong>Soporte:</strong> puntuaciones, comentarios e imágenes enviadas voluntariamente.</li>
          <li><strong>Datos técnicos:</strong> información de navegación y rendimiento generada al visitar el sitio.</li>
        </ul>
      </Section>

      <Section title="Para qué se utilizan">
        <p>
          Se usan para autenticar, crear el perfil, conectar rivales, aplicar las reglas,
          guardar progreso, ofrecer funciones sociales, prevenir abuso, investigar
          errores y medir de manera agregada el uso y rendimiento del sitio.
        </p>
      </Section>

      <Section title="Modo invitado">
        <p>
          El invitado no entrega email ni contraseña, pero el sistema crea una cuenta
          anónima y un perfil temporal para identificarlo dentro de la partida. El
          navegador guarda un marcador local de actividad para cerrar sesiones invitadas
          antiguas. Ese perfil no está pensado como almacenamiento permanente.
        </p>
      </Section>

      <Section title="Proveedores técnicos">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li><strong>Supabase:</strong> autenticación, base de datos, funciones en servidor y almacenamiento de archivos.</li>
          <li><strong>Vercel:</strong> alojamiento, entrega del sitio, analítica y métricas de rendimiento.</li>
          <li><strong>Google:</strong> autenticación opcional cuando se elige “Continuar con Google”.</li>
          <li><strong>Web3Forms:</strong> aviso opcional de nuevas reseñas cuando esa integración está configurada.</li>
        </ul>
        <p>
          Cada proveedor puede procesar datos técnicos según sus propias políticas y la
          configuración utilizada por Trucazo.
        </p>
      </Section>

      <Section title="Almacenamiento local y PWA">
        <p>
          El navegador puede guardar preferencias, datos de sesión y recursos necesarios
          para la aplicación instalable. El service worker permite cachear archivos para
          mejorar carga y acceso. Borrar los datos del sitio desde el navegador elimina
          esos elementos locales, aunque no necesariamente los datos asociados a una
          cuenta registrada en el servidor.
        </p>
      </Section>

      <Section title="Conservación, seguridad y decisiones del usuario">
        <p>
          La información se conserva mientras resulte necesaria para brindar el servicio,
          mantener la integridad de las partidas, resolver incidentes o cumplir
          obligaciones aplicables. Ningún sistema es completamente infalible; Trucazo
          aplica controles técnicos y limita el acceso según el tipo de dato.
        </p>
        <p>
          Podés evitar crear una cuenta usando el modo invitado, no utilizar funciones
          sociales, no adjuntar imágenes y borrar el almacenamiento local. Para consultar,
          corregir o solicitar la eliminación de datos asociados a una cuenta, seguí el
          canal indicado en{' '}
          <Link href="/contacto" className="text-gold underline underline-offset-2">Contacto</Link>.
        </p>
      </Section>

      <Section title="Cambios en esta política">
        <p>
          Si cambian las funciones o proveedores, esta página debe actualizarse con una
          nueva fecha. Los cambios materiales se comunicarán dentro del sitio cuando sea
          razonablemente posible.
        </p>
      </Section>
    </SeoPageLayout>
  )
}
