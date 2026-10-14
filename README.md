# Trucazo

Truco argentino online, a 15 o 30 puntos y sin flor, con monedas ficticias.
Dos modalidades: **1 contra 1** (mano a mano) y **2 vs 2** (en parejas, cuatro jugadores).
Construido con Next.js (App Router), React, TypeScript y Supabase (Auth + Postgres + Realtime).

## Stack

- **Next.js 14** (App Router, Server Components + Client Components)
- **TypeScript** (modo `strict`)
- **Tailwind CSS** para los estilos
- **Supabase**: autenticación, base de datos Postgres, suscripciones Realtime y funciones RPC (`security definer`)

## Requisitos previos

- Node.js 18.18+ (recomendado 20+)
- Un proyecto de Supabase

## Configuración

1. Instalá las dependencias:

   ```bash
   npm install
   ```

2. Creá un archivo `.env.local` en la raíz con las claves de tu proyecto de Supabase:

   ```bash
   # Imprescindibles
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>

   # Opcionales
   NEXT_PUBLIC_SITE_URL=https://trucazo.com.ar   # para el sitemap y los links absolutos
   NEXT_PUBLIC_ENABLE_TOURNAMENTS=false           # mantener apagado hasta el lanzamiento del PR 5
   SUPABASE_SERVICE_ROLE_KEY=<tu-service-role>   # entrar con nombre de usuario (solo servidor)
   TELEGRAM_BOT_TOKEN=<token>                    # aviso cuando alguien crea una mesa
   TELEGRAM_CHAT_ID=<chat>
   RESEND_API_KEY=<clave-de-resend>                # novedades y recordatorios por email
   EMAIL_FROM=Trucazo <hola@trucazo.com.ar>        # remitente verificado en Resend
   CRON_SECRET=<secreto-largo-y-aleatorio>          # protege la tarea diaria de email
   EMAIL_MAX_PER_RUN=90                             # opcional: límite de envíos diarios
   NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=<clave>      # aviso por mail de las reseñas
   ```

   > `SUPABASE_SERVICE_ROLE_KEY` **nunca** lleva el prefijo `NEXT_PUBLIC_`: se saltea toda
   > la seguridad de la base y solo puede vivir del lado del servidor.

3. Asegurate de tener configurado en Supabase:
   - El esquema: ver [`supabase/schema/README.md`](supabase/schema/README.md), que explica
     cómo armar la base entera desde cero (lo automatiza `scripts/rebuild-db.sh`).
   - **Realtime habilitado** en las tablas `games` y `tables` (la partida y el lobby
     dependen de las suscripciones a cambios). Esto se activa a mano en el panel.
   - El **cron** de `sweep_stale_games` y `sweep_stale_tables`, cada 5 minutos.
   - El dominio `trucazo.com.ar` verificado en Resend para poder enviar desde
     `hola@trucazo.com.ar`. El cron de Vercel se configura solo desde `vercel.json`
     y corre todos los días a las 9:00 de Argentina (12:00 UTC).
   - Las campañas para volver a jugar se crean, editan, activan y pausan desde
     `/admin/emails`. Los dos ejemplos iniciales quedan pausados hasta que el admin
     los revise y los active.

## Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — sirve el build de producción
- `npm run lint` — ESLint (config de Next)
- `npm run check:rpc-allowlist` — avisa si alguna función del servidor quedó abierta al cliente
- `npx tsx scripts/sim.ts` — comprueba que la lógica de truco del cliente y su espejo en SQL coincidan
- `scripts/rebuild-db.sh` — arma la base entera desde cero en un PostgreSQL de prueba

Todo esto lo corre solo GitHub en cada Pull Request (ver `.github/workflows/ci.yml`),
más las pruebas de seguridad de `supabase/tests/`.

## Estructura

```
src/
  app/                 rutas (home, login, register, lobby, game/[id])
  components/
    ui/                primitivas de interfaz (Button, Panel, Modal, …)
    game/              cartas (PlayingCard, CardBack)
  lib/
    truco.ts           mazo, reparto, ranking de cartas y envido
    types.ts           tipos de dominio (Game, Table, Profile, …)
    tables.ts          helpers de mesas
    supabase/          clientes de Supabase (browser / server / middleware)
public/cartas/         las 40 cartas en WebP ({palo}_{valor}.webp)
supabase/
  schema/              cómo armar la base desde cero
  migrations/          el historial de cambios del backend
  tests/               pruebas de seguridad (SQL)
scripts/               herramientas sueltas (reconstruir la base, simulaciones)
```

## Notas de diseño

- **Toda la lógica del juego vive en el servidor**, en funciones `security definer` de
  Postgres: repartir, jugar una carta, envido, truco, puntajes y monedas. El cliente
  llama RPCs y muestra lo que le devuelven. **No metas reglas de truco en el cliente.**
- `src/lib/truco.ts` solo tiene utilidades de presentación (ranking, imágenes), y su
  lógica está **espejada en SQL**. Si cambiás una, cambiá la otra: `scripts/sim.ts`
  compara las dos y el CI se pone en rojo si se desalinean.
- Las manos viven en `game_hands`, con RLS por jugador y **fuera de Realtime**, para
  que no se filtren las cartas del rival. Nunca en la fila de `games`.
- Las pantallas privadas se protegen en `src/lib/supabase/middleware.ts`, con la lista
  `privatePaths`. **Si agregás una pantalla privada nueva, sumala a esa lista** o queda
  sin protección.
- Cada jugador nuevo arranca con 1.000 monedas.
- El backend **no tiene deploy automático**: cada migración se corre a mano en el SQL
  Editor de Supabase. Nunca se edita una migración ya aplicada; se agrega una nueva.

## Seguimiento automático de reseñas

Implementado el 12/10/2026 por pedido del dueño. Revisión del agente **lunes,
miércoles y viernes a las 09:00 de Argentina** mediante una tarea de ChatGPT en
la nube, independiente de esta PC. El agente investiga y documenta; las correcciones
del juego se trabajan por separado. No envía correos ni contacta jugadores.

- Fuente: `public.feedback` de Supabase; nunca depender de los emails Web3Forms.
- Estado privado: `feedback_internal.reviews`, `findings`, `issues` y `runs`.
- Una reseña puede aportar varios hallazgos. Cada problema conserva un issue
  estable en GitHub, también si se cierra y luego reaparece.
- Cola por ID, sin ventana de fechas: las pendientes de ejecuciones anteriores
  se recuperan. La primera revisión cubrió las **23 reseñas existentes**, dejó
  **24 hallazgos en 9 asuntos agrupados** y terminó sin pendientes de lectura.
  Siete asuntos requieren trabajo o más información; tercera parda quedó
  comprobada como resuelta en 360 escenarios; el pedido de participación en chat
  quedó registrado sin implementar respuestas de bots, por decisión de producto.
- Concesión exclusiva de 2 horas, renovable; recuperación de agentes interrumpidos,
  reintento con espera y relectura cuando cambian las puntuaciones/comentario/capturas.
  Se marca revisada sólo después de guardar todos los hallazgos y comprobar GitHub.
- Issues públicos con paráfrasis técnicas y referencias opacas a reseñas: no
  publicar nombres, emails, IDs de usuario, conversaciones, imágenes privadas ni
  URLs firmadas. Distinguir reseñas repetidas de usuarios distintos.
- No confundir `reviewed` con problema resuelto. `needs_info` conserva lo que falta
  y su issue abierto. Capturas inaccesibles bloquean el cierre de la reseña, se
  reintentan y se informan; nunca afirmar que se vieron imágenes sin verlas.
- Se avisan fallos y acumulación (>50 pendientes o antigüedad >7 días). Una
  ejecución omitida por el programador sólo se detecta en el próximo arranque;
  no hay un segundo agente permanente. Accesos de GitHub/Supabase deben seguir
  conectados. La tarea puede terminar parcial por límites de ejecución y retomar
  pendientes en el próximo horario.

Contrato operativo del agente: [`scripts/feedback-review-agent.txt`](scripts/feedback-review-agent.txt).
La tarea carga este contrato y puede seguir una versión actualizada sin rehacerla.
La guía central es este README; no crear documentos de estado paralelos.

Migración reproducible: `20261012020747_feedback_review_tracking.sql`. En producción
se aplicó el mismo SQL en cinco bloques (`feedback_private_schema`,
`feedback_review_tracking`, `feedback_review_claims`, `feedback_review_findings`,
`feedback_review_completion`) porque el conector falló al recibirlo completo.
No hay que volver a correrla para activar la tarea. La foto está en
`supabase/schema/feedback_review.sql`; la reconstrucción y el CI incluyen la prueba
`supabase/tests/feedback_review.sql`. Todas las funciones son `security invoker`,
con `search_path` vacío, schema privado y RLS sin políticas para jugadores.

Validación realizada: suite de seguimiento dentro de una transacción con ROLLBACK
(lotes, exclusión de ejecuciones, reintentos, varios hallazgos, ediciones, recuperación,
cierre parcial, deduplicación, borrado en cascada y permisos); allowlist de RPCs
aprobada; primera revisión real terminada con `completed`, 23 revisadas y 0 pendientes.

## Corrección de cierres y presencia — 13/10/2026

La investigación confirmó dos causas independientes. Una victoria que cambia el
podio disparaba un `DELETE` sin filtro en `refresh_ranking_top3`: la protección
`safeupdate` lo rechazaba al confirmar la transacción y revertía toda la jugada.
Pausar los emails no evita ese error. La nueva migración limita el borrado a los
puestos 1–3, conservando los permisos privados y el comportamiento de los avisos.

Los latidos `touch_presence` y `touch_online` creaban una consulta del SDK sin
esperarla: no enviaban solicitudes. Ahora se ejecutan al entrar y cada 8/30 segundos.
Una partida con presencia reciente queda fuera del barrido; las abandonadas siguen
anulándose con su reembolso. No se cambian las reglas del juego ni el cron.

Pruebas: `scripts/check-presence.ts` ejecuta los efectos originales con el SDK real
y red simulada; falla antes del arreglo y verifica entrada, intervalos, salida y
reintento. El CI instala una versión fija de `pg-safeupdate` en su PostgreSQL
descartable. `supabase/tests/game_completion_presence.sql` reproduce el fallo
anterior y verifica victoria, podio por desempate, monedas, historial, cierre
idempotente, presencia reciente y reembolso único por ausencia real.

**Aplicación pendiente en producción:**

1. En GitHub, abrí `supabase/migrations/20261013185704_ranking_top3_safeupdate.sql`
   y copiá todo su contenido.
2. En Supabase, entrá al proyecto de Trucazo → **SQL Editor** → **New query**,
   pegá el contenido y apretá **Run**. Este paso actualiza el backend; el PR no lo
   aplica automáticamente.
3. Incorporá el PR y verificá el despliegue del sitio. Comprobá una victoria que
   cambie el podio y una partida de más de 15 minutos sin anulación inesperada.

Último traspaso: arreglo preparado desde `master` de GitHub, sin los cambios locales
futuros. Retomar esta misma corrección: revisar los controles del PR y aplicar la
migración indicada antes de dar el incidente por resuelto en producción.

## Capturas de reseñas y lectura privada — 14/10/2026

Las imágenes se subían correctamente, pero Storage sólo concedía INSERT. La
creación de URLs firmadas del correo necesita SELECT: ahora cada sesión puede leer
sólo los archivos de su propia carpeta en feedback-images. El bucket sigue privado;
el correo conserva sus enlaces de siete días. Si falla alguna firma, el aviso indica
que esa captura está guardada y que su enlace no está disponible, en vez de decir
que no hay imágenes. El guardado de la reseña sigue siendo independiente del correo.

El agente programado de ChatGPT mantiene lunes/miércoles/viernes 09:00 de Argentina.
Lee cada imagen con un ticket de 256 bits emitido por SQL administrativo para una
reseña reclamada por la ejecución activa. El ticket dura diez minutos, sirve una
vez y se invalida si cambia la reseña, termina su revisión o vence la ejecución.
El registro guarda sólo SHA-256 del token. La Edge Function feedback-image consume
el ticket y descarga únicamente esa imagen con una clave interna de Supabase.
No entrega esa clave al agente, no recibe rutas arbitrarias y no necesita PC,
credenciales locales ni nuevas variables en Vercel. Respuestas sin caché y sin
referer; no admite SVG/HTML. El contrato contiene la lectura visual por HTTP del
entorno en la nube y su manejo de errores. No usar web.open para esta imagen
binaria si lo rechaza; usar fetch + emitImage o un navegador de la nube.

### Estado de Supabase e instalación en otro entorno

**Aplicado en producción**, con feedback-image ACTIVE. No hace falta volver a
correr SQL en el proyecto de Trucazo. Los cambios se aplicaron en cinco bloques:
feedback_image_owner_read (20261014133748), feedback_image_ticket_table
(20261014135215), feedback_image_ticket_privileges (20261014135223),
feedback_image_ticket_consume (20261014140841) y feedback_image_ticket_issue
(20261014140919). La migración consolidada reproducible es
20261014133748_feedback_private_image_access.sql; la foto es
supabase/schema/feedback_images.sql. Las funciones son INVOKER con search_path
vacío; el schema interno y sus tablas permanecen cerrados a anon/authenticated.
La única RPC puente, consume_feedback_image_ticket, tiene EXECUTE sólo para
service_role. La función de emisión ni siquiera se concede a service_role.

Para reproducirlo en otro proyecto:

1. Aplicar primero el seguimiento de reseñas y luego la migración consolidada en
   Supabase → SQL Editor → New query → pegar el archivo → Run.
2. Desplegar supabase/functions/feedback-image/index.mjs y handler.mjs como
   feedback-image. Usar supabase/config.toml: verify_jwt=false porque la función
   valida su propio ticket privado de un uso, no porque permita lectura pública.
3. Usar SUPABASE_URL y SUPABASE_SECRET_KEYS.default del entorno interno de Edge;
   se conserva compatibilidad con SUPABASE_SERVICE_ROLE_KEY. No copiar claves al
   agente, al navegador, a variables NEXT_PUBLIC ni a GitHub.
4. Cambiar en el contrato únicamente la URL del proyecto de destino.

La reconstrucción y el CI incluyen supabase/tests/feedback_images.sql. La prueba
con ROLLBACK pasó en Supabase: aislamiento de dueño/tercero/anon, rechazo de
reseñas o índices ajenos, token no guardado en claro, replay, vencimiento, edición
y revisión cerrada. scripts/check-feedback-images.mjs prueba la respuesta de
imagen, autorización antes de descargar, credenciales legacy/modernas, métodos,
formatos inseguros y fallos del proveedor de enlaces. Se abrieron los dos adjuntos
reales mediante la Edge Function y se comprobó su lectura visual. La emisión y
lectura de imágenes quedan auditadas por ejecución/reseña; los registros de
tickets tienen la misma eliminación en cascada que el seguimiento.

El asesor de seguridad sólo señala RLS sin políticas para image_tickets, que es
intencional en este schema administrativo cerrado:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
No se añaden políticas de jugador para silenciar ese aviso.

Las dos reseñas que bloqueaban #118 se completaron con evidencia privada y
actualizaciones en #109, #110, #111 y #114. Una imagen confirma DELETE requires a
WHERE clause; la otra muestra turno rival a 0 segundos. Completar su lectura no
resuelve automáticamente los bugs históricos ni demuestra regresión del parche
#120. Las capturas, rutas, tokens e identidades no se publican.
