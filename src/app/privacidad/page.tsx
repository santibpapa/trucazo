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
      path={path}
      title="Política de privacidad"
      breadcrumb="Privacidad"
      intro="Esta página explica qué información utilizan la web y la app Android de Trucazo. Última actualización: 16 de octubre de 2026."
      showPlayCta={false}
      showByline={false}
    >
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE_URL + path, inLanguage: 'es-AR', dateModified: '2026-10-16' }} />
      <JsonLd data={createBreadcrumbJsonLd('Política de privacidad', path)} />

      <Section title="Datos que puede tratar el servicio">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          <li><strong>Cuenta:</strong> email, identificador de autenticación y nombre de usuario. Si elegís una contraseña, Supabase Auth la procesa para autenticarte; Trucazo no la guarda en texto legible en la app.</li>
          <li><strong>Perfil:</strong> avatar, monedas ficticias, personalización, amistades, grupos, medallas y progreso.</li>
          <li><strong>Juego:</strong> mesas, partidas, cartas necesarias durante la partida, resultados, tiempos y estadísticas.</li>
          <li><strong>Comunidad:</strong> mensajes, presencia y relaciones que el usuario decide utilizar.</li>
          <li><strong>Soporte:</strong> puntuaciones, comentarios e imágenes enviadas voluntariamente.</li>
          <li><strong>Convivencia:</strong> versión y fecha de aceptación de normas, bloqueos, denuncias con motivo y detalle, copia del contenido señalado, referencias de sus imágenes y decisiones de administración.</li>
          <li><strong>Datos técnicos:</strong> páginas visitadas, origen aproximado de la visita, campaña, país, tipo de dispositivo, navegador y rendimiento.</li>
          <li><strong>Historia sin internet:</strong> cuenta propietaria, progreso oficial descargado, partidas, jugadas, resultados pendientes y comprobantes de sincronización. Los premios oficiales los valida el servidor al volver a conectar.</li>
          <li><strong>Avisos Android:</strong> identificadores de instalación, token de recepción, cuenta vinculada, permisos, preferencias, eventos y estado de entrega. No contienen tu contraseña ni las cartas ocultas.</li>
        </ul>
      </Section>

      <Section title="Qué ven otras personas">
        <p>El nombre, avatar, personalización, ranking y resultados públicos son visibles para otros jugadores. Los mensajes se comparten con quienes acceden al chat correspondiente; las fotos de soporte y las denuncias son privadas para administración. No publiques datos personales en chats, nombres o imágenes. No vendemos datos ni mostramos anuncios.</p>
        <p>Al ingresar con Google se recibe la identidad básica y el email de esa cuenta. Si Google entrega una foto y todavía no tenés una propia, se incorpora como avatar visible del perfil; podés reemplazarla desde tu perfil.</p>
        <p>Las amistades y relaciones sociales pertenecen al juego: no leemos la agenda del teléfono. Los nombres que buscás se envían al servicio para devolver coincidencias y pueden figurar en sus registros técnicos; no mantenemos un historial propio de búsquedas.</p>
      </Section>

      <Section title="Notificaciones y permisos de Android">
        <p>Los avisos son opcionales: podés rechazar el permiso o apagarlos desde Perfil → Notificaciones o desde Android. Se utilizan para invitaciones privadas y avisos de check-in o cruce de torneo, según tus preferencias. Desactivar un aviso no impide jugar. Al cerrar sesión se desvincula esta instalación; al eliminar la cuenta se borran sus dispositivos y preferencias del servidor.</p>
        <p>El registro de dispositivos inactivos y los eventos vencidos se limpian tras 30 días. Firebase recibe identificadores de instalación y recepción y datos técnicos para entregar los avisos; no usamos Firebase Analytics, Crashlytics ni exportación de entregas a BigQuery. Los avisos pueden aparecer en la pantalla bloqueada según tu configuración de Android.</p>
        <p>La app usa internet, estado de conexión y notificaciones, además de los permisos técnicos de recepción de Firebase. No solicita acceso general a cámara, micrófono, contactos, ubicación ni biblioteca de fotos. Al adjuntar una imagen elegís el archivo mediante el selector del sistema; sólo se envía lo que seleccionás.</p>
      </Section>

      <Section title="Denuncias y bloqueos">
        <p>Las denuncias y su evidencia sólo pueden revisarlas administradores. Quien denuncia ve el estado y la respuesta de su propio caso; la persona denunciada no ve quién lo reportó. Guardamos una copia del texto aunque se limpie el chat y copias reducidas privadas de las imágenes disponibles en nuestro almacenamiento. Las imágenes externas pueden dejar de estar disponibles. Si falla una copia, el texto de la denuncia sigue guardado y se informa el fallo.</p>
        <p>Las denuncias se eliminan a los 180 días desde su recepción o a los 90 días desde su resolución, lo que ocurra primero, mediante una limpieza diaria. El plazo permite investigar y revisar decisiones sin conservar evidencia indefinidamente. Los bloqueos duran hasta desbloquear o eliminar la cuenta; la aceptación de normas dura mientras exista la cuenta. Las restricciones sociales vencen a los siete días. Supabase almacena estos datos; no se agregó un proveedor de moderación.</p>
      </Section>

      <Section title="Para qué se utilizan">
        <p>
          Se usan para autenticar, crear el perfil, conectar rivales, aplicar las reglas,
          guardar progreso, ofrecer funciones sociales, prevenir abuso, investigar
          errores y medir de manera agregada el uso y rendimiento del sitio.
        </p>
        <p>
          Si la cuenta tiene un email confirmado, Trucazo también puede usarlo para
          comunicar novedades e invitar a volver cuando todavía no se jugó o pasó un
          período de inactividad. Cada mensaje permite desactivar uno o ambos tipos de
          correo de forma inmediata.
        </p>
        <p>
          Los torneos pueden generar anuncios, confirmaciones, recordatorios de check-in,
          avisos de partidas y cambios de fecha. Podés desactivar esos emails desde el enlace
          de preferencias de cada mensaje. Los avisos dentro del juego se guardan con su estado
          de lectura. En partidas de torneo, otros usuarios registrados pueden ver puntajes,
          participantes y cartas ya jugadas; las cartas de la mano permanecen ocultas.
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
          <li><strong>Google Firebase Cloud Messaging e Installations:</strong> entrega opcional de notificaciones Android y sus identificadores de instalación y recepción.</li>
          <li><strong>Web3Forms:</strong> aviso opcional de nuevas reseñas cuando esa integración está configurada.</li>
          <li><strong>Resend:</strong> entrega de novedades, invitaciones para volver, avisos del ranking y correos de torneos cuando esa integración está configurada.</li>
        </ul>
        <p>
          Cada proveedor puede procesar datos técnicos según sus propias políticas y la
          configuración utilizada por Trucazo.
        </p>
        <p>Las peticiones a estos servicios incluyen datos de conexión, como la dirección IP y características del cliente. Pueden procesarse fuera de tu país. Las reseñas notificadas por email pueden incluir el comentario y enlaces temporales a las imágenes; esos correos se usan para atender soporte, no para publicar tus archivos.</p>
      </Section>

      <Section title="Anuncios opcionales y vidas de Historia">
        <p>
          Si los anuncios están habilitados, al quedarte sin vidas podés elegir ver uno
          de Google Ad Manager para recuperar una vida. Google puede tratar datos técnicos
          y usar almacenamiento del navegador según la configuración publicitaria y tus
          opciones de consentimiento. Podés esperar la recarga gratuita o pedir ayuda a un amigo.
        </p>
        <p>Guardamos el estado de vidas, los pedidos de ayuda y la acreditación de recompensas
          para evitar duplicados. El navegador puede conservar un comprobante pendiente para
          reintentar una acreditación si se corta la conexión.</p>
        <p>Más información en la <a className="underline" href="https://policies.google.com/technologies/ads" rel="noreferrer" target="_blank">política de publicidad de Google</a>.</p>
      </Section>

      <Section title="Almacenamiento local y PWA">
        <p>
          El navegador puede guardar preferencias, datos de sesión y recursos necesarios
          para la aplicación instalable. También guarda identificadores aleatorios de
          visitante y sesión para distinguir personas aproximadas de simples recargas de
          página. Trucazo no guarda la dirección IP ni el user-agent completo en su
          analítica propia. El service worker permite cachear archivos para
          mejorar carga y acceso. Borrar los datos del sitio desde el navegador elimina
          esos elementos locales, aunque no necesariamente los datos asociados a una
          cuenta registrada en el servidor.
        </p>
        <p>Android conserva su propia sesión, preferencias, identificadores de analítica, la última pantalla permitida por cuenta e Historia en el almacenamiento privado de la app. La última pantalla no incluye contraseñas ni tokens. Los recursos del juego están incluidos en el APK y el progreso usa SQLite, una base local. Cerrar sesión oculta Historia y permite recuperarla al volver a entrar; no la borra. Las copias automáticas y el traslado de esos datos entre teléfonos están deshabilitados. Desinstalar o borrar los datos de la app elimina el progreso que sólo estaba en ese teléfono.</p>
        <p>La analítica propia registra pantallas y eventos de uso también en Android. Se excluyen administración y los parámetros de enlaces de acceso. Vercel Analytics y las métricas web de rendimiento se usan en el sitio; no se incluye su SDK en el APK.</p>
      </Section>

      <Section title="Conservación, seguridad y decisiones del usuario">
        <p>
          La información se conserva mientras resulte necesaria para brindar el servicio,
          mantener la integridad de las partidas, resolver incidentes o cumplir
          obligaciones aplicables. Los eventos detallados de navegación, las sesiones y
          los identificadores de visitantes inactivos se eliminan automáticamente cuando
          superan los 365 días. Ningún sistema es completamente infalible; Trucazo aplica
          controles técnicos y limita el acceso según el tipo de dato.
        </p>
        <p>
          Podés eliminar tu cuenta desde el perfil o desde{' '}
          <Link href="/eliminar-cuenta" className="text-gold underline underline-offset-2">Eliminar mi cuenta</Link>,
          sin tener la aplicación instalada. Se borran el acceso, email, perfil,
          archivos propios, progreso, monedas, mensajes, reseñas, relaciones,
          preferencias y registros de navegación vinculados. Los resultados
          compartidos se conservan sin tu identidad como “Cuenta eliminada”.
        </p>
        <p>La evidencia privada de denuncias puede conservar texto, imágenes y referencias anteriores al borrado durante los plazos de 180/90 días indicados arriba, para prevenir abuso y revisar decisiones. Eliminar una cuenta no retira esa evidencia antes de su vencimiento.</p>
        <p>El borrado desde la app también elimina Historia de esa cuenta en este teléfono y apaga su recepción de avisos. Los resultados sin sincronizar se pierden: podés volver a Historia y sincronizar antes de confirmar. Los guardados de otras cuentas se conservan. Un equipo totalmente desconectado no puede enterarse del borrado: al reconectarse se rechaza el acceso y se oculta el guardado de la cuenta eliminada. Podés borrar los datos de ese equipo desde Android o el navegador.</p>
        <p>
          Normalmente el borrado termina al confirmar. Si un proveedor falla, se
          conserva temporalmente el identificador y la lista de archivos pendientes
          para reintentar; ambos se eliminan al completar el proceso. Si no termina
          dentro de 48 horas o no podés entrar, escribí a{' '}
          <a href="mailto:hola@trucazo.com.ar" className="text-gold underline underline-offset-2">hola@trucazo.com.ar</a>
          {' '}desde el email de tu cuenta. Los proveedores pueden conservar copias
          de seguridad o registros durante sus propios plazos de conservación.
          Para consultar o corregir datos, visitá{' '}
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
