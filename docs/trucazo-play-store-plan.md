# Trucazo en Google Play — revisión y plan propuesto

Revisión original: 28 de septiembre de 2026. Última actualización del plan: 9 de octubre de 2026.

Repositorio de referencia: `santibpapa/trucazo`, rama `master`. La revisión original corresponde al commit `1138de8f29248960a80d5796d01122467866257d`, con el PR #96 integrado; no representa necesariamente el estado actual.

Estado: **implementación iniciada el 09/10/2026 por pedido del dueño**. La base web PR 1A ya está integrada en el [PR #106](https://github.com/santibpapa/trucazo/pull/106), merge `250acfa`. La segunda entrega prepara el prototipo Android PR 1B desde ese `master`; la elección de arquitectura sigue pendiente de pruebas instaladas. **La eliminación de cuentas (PR 4 del plan) ya está integrada en el PR #101**, commit `953ea31`, merge `1be62d2`: no repetir desarrollo ni SQL. No se verificó producción, Play Console ni un APK en teléfono.

## Ejecución iniciada — 09/10/2026

### Primera entrega: PR 1A — Base web de arranque sin conexión

**PR de GitHub:** [#106 — Play Store 1A: base web de arranque sin conexión](https://github.com/santibpapa/trucazo/pull/106). Código inicial: `e3f3a1f`. **Integrado el 09/10/2026**, merge `250acfa`; confirmado al iniciar PR 1B. Despliegue en producción no comprobado.

**Alcance:** `src/app/manifest.ts`, `src/components/RegisterSW.tsx`, `public/sw.js`, `public/offline.html`, cabeceras en `next.config.mjs`, pruebas y este documento. No incluye todavía un paquete Android ni la campaña jugable offline. La autorización para comenzar corresponde al pedido del dueño del 09/10; el texto de retoma histórico al final no es una autorización pendiente.

- Manifest con `id: '/'`, `scope: '/'` e idioma `es-AR`. Se conserva la portada como entrada de la PWA existente y su identidad; el identificador del paquete Android es una decisión distinta.
- Pantalla de recuperación pública y autocontenida, con los colores actuales. Al fallar una navegación, permite reintentar la URL de la partida/torneo original. No requiere Next.js, fuentes, imágenes ni datos de cuenta para mostrarse.
- Caché limitada a `/offline.html`, descargada sin credenciales. Las navegaciones online siempre consultan la red; sesiones, cartas, partidas, perfiles, APIs, OAuth y respuestas RSC no se guardan.
- Instalación del worker solo se completa tras descargar la pantalla; actualización sin caché HTTP. Limpiar versiones anteriores de la pantalla no borra las futuras cachés de campaña ni otras cachés del origen.
- Pruebas de comportamiento del worker y una prueba técnica real en Chromium. El navegador usa un perfil temporal y un registro ficticio de IndexedDB: sirve para estudiar reapertura y persistencia, **no es el guardado de campaña implementado**. La comprobación de APIs push no equivale a recibir una notificación.
- Verificación de navegador en un workflow separado, solo al cambiar esta base o al ejecutarlo manualmente. No agrega la instalación de Chromium a cada PR del juego.

**Pasos manuales de esta entrega:** ninguno de SQL, claves, Supabase o Play Console. Al incorporar el PR, esperar el despliegue web. En futuras modificaciones de `offline.html`, incrementar `SHELL_CACHE` en `sw.js`. El primer arranque de una instalación sin preparación y sin red todavía no puede ser cubierto por el worker web; debe resolverse/probarse al empaquetar Android.

**Comprobación desde el celular, después del despliegue:** abrir Trucazo con internet y esperar a que termine de cargar; cerrar, activar modo avión y reabrir. Debe aparecer «No pudimos conectar». Volver a tener internet y tocar «Volver a intentar». Esto verifica recuperación, no una partida offline.

**Pruebas ejecutadas el 09/10:** `npm run check:pwa` (8 pruebas), `npx tsc --noEmit`, `npm run lint`, build de producción con claves ficticias y `node --import tsx scripts/check-agent-readiness.ts`: aprobadas, con los avisos de hooks ya existentes en GameClient/LobbyClient. `check:pwa:browser` pasó con Chromium 153 y Playwright 1.62.1: sin conexión tras preparación, reinicio del proceso con perfil persistente, IndexedDB ficticio, APIs sin caché, URL de reintento y primer arranque sin preparación. Se comprobó además el build real de Next: registro desde AppRuntime, manifest, cabeceras, recuperación offline y retorno online; inspección visual a 360×640. La descarga habitual de Chromium no funcionó en este entorno; se usó un ejecutable de prueba externo mediante `PWA_BROWSER_EXECUTABLE`. No se generó/probó APK, envío push, motor offline ni sincronización.

**Reproducir las pruebas de navegador en una computadora/CI:** `npm ci`, `npx playwright install --with-deps chromium`, `npm run check:pwa` y `npm run check:pwa:browser`. No requiere cuentas, claves de producción ni un servidor de Supabase. El fixture HTTP y el perfil temporal se crean y borran dentro de la prueba.

### Segunda entrega: PR 1B — Prototipo Android y prueba local

**PR de GitHub:** [#108 — Play Store 1B: prototipo Android con cuenta, guardado local y prueba push](https://github.com/santibpapa/trucazo/pull/108). Implementación `074ada7`, rama `codex/android-twa-prototype`, a partir de `250acfa`. Abierto para revisión; no integrado ni desplegado por esta sesión. **No dar por cerrada la viabilidad TWA hasta completar las pruebas en Android físico.** Instrucciones completas, configuración y matriz de aceptación: [`android/README.md`](../android/README.md).

**Alcance implementado:** generación reproducible con Bubblewrap Core 1.27.0 y lockfile separado; APK debug y AAB sin firma de publicación; entrada `/android` validada en servidor con cuenta registrada; destino de contraseña/Google y contexto Android por pestaña, conservando invitados web; ruta de asociación `/.well-known/assetlinks.json`; prueba local optativa de administración con IndexedDB, preparación completa y reapertura offline; permiso/suscripción/baja y envío de una notificación real de prueba desde servidor a FCM. Suscripciones no guardadas en el backend y sin eventos de torneos ni campañas promocionales.

**Identificador:** `ar.com.trucazo.prototype` es provisional. El dueño pidió explicar el identificador antes de decidir; la propuesta `ar.com.trucazo.app` **no se consideró aprobada**. El paquete de prueba permite continuar sin fijar el identificador de publicación.

**Separación del alcance:** el contador local es ficticio y no modifica progreso ni recompensas. No se portó el motor, no se descargan rivales para jugar offline y no se sincronizan resultados. Campaña sin chat escrito; motor/UI de partidas online sin cambios. PR 2/3 siguen pendientes para recuperación de contraseña, correos/enlaces externos, destinos de torneo/partida, suspensión y navegación completos. La eliminación existente se conserva.

**Herramientas y compatibilidad:** Gradle 8.11.1, plugin Android 8.9.1 y Android Browser Helper 2.7.4 del generador fijado; API objetivo/compilación 36 y mínimo API 24, por requisito de la biblioteca actual. Se conserva el icono del repo; su recorte instalado todavía debe comprobarse. El origen de apertura configurado es **`https://www.trucazo.com.ar`**: asociar ese origen, no asumir que asociar solo el dominio sin www alcanza.

**Construcción Android ejecutada en esta sesión:** `assembleDebug bundleRelease` terminó con `BUILD SUCCESSFUL`; APK debug y AAB generados. `apksigner verify --print-certs` comprobó la firma debug real; `aapt dump badging` verificó paquete provisional, versión `0.1.0`/código 1, mínimo 24, objetivo 36 y `POST_NOTIFICATIONS`. `certificate.mjs` extrajo la huella del certificado usado. SDK y JDK completo se prepararon localmente; se reparó un archivo incompleto del JDK descargado antes de la compilación final. Esto demuestra construcción/firma, no instalación ni recepción de notificaciones.

**Validaciones de esta entrega:** 8 pruebas de base PWA y 4 pruebas de Android (asociación, rechazo de URLs arbitrarias de push, contexto por pestaña y worker/notificación); TypeScript, lint y build de Next con claves ficticias; versiones markdown; navegador Chromium 153 para preparación interrumpida/completa, guardado del contador, cierre del proceso, reapertura desde `/android` offline y cambio de identidad ficticia. La prueba de navegador usa una API de identidad simulada, no credenciales reales. El build real de Next se comprueba además sin sesión para entrada sin invitado, web independiente, registro, callback y rechazos de API. La instalación estándar de Chromium volvió a fallar en este entorno; se usó `PWA_BROWSER_EXECUTABLE` con un ejecutable disponible. Lint mantiene los avisos preexistentes de GameClient/LobbyClient.

**Pendiente para cerrar PR 1 / arquitectura:** instalar el APK en Android, comprobar dominio/firma sin barra del navegador, contraseña y Google reales, reapertura tras reiniciar teléfono, almacenamiento y permisos, notificación visible con app abierta/cerrada y su destino, cambio/salida de cuenta. Un envío aceptado por FCM no se registra como recepción. No se creó cuenta de Play ni se subió ningún paquete. La arquitectura sigue candidata.

**SQL:** ninguno. **Configuración externa pendiente:** después de integrar y desplegar, `ANDROID_SHA256_FINGERPRINTS` con la huella real del APK que se va a instalar; para push de prueba, `ANDROID_PROBE_VAPID_PUBLIC_KEY`, `ANDROID_PROBE_VAPID_PRIVATE_KEY` y `ANDROID_PROBE_VAPID_SUBJECT`. No se configuraron certificados ni claves en producción por esta sesión. Los pasos para obtenerlos están en `android/README.md`. Los certificados debug de GitHub pueden cambiar entre construcciones; no son los de Play App Signing.

**Retoma inmediata:** revisar el PR 1B/merge actual, completar la matriz física de `android/README.md` y registrar resultados. Si TWA satisface las pruebas, continuar con el motor local y bots sobre las reglas actuales, diseñando a la vez el contrato de sincronización. Si falla la prueba de arquitectura, reevaluar Capacitor con el caso observado antes de fijar el paquete definitivo.

### Evidencia del código actual y orden actualizado

| Área | Evidencia al 09/10 | Consecuencia |
| --- | --- | --- |
| Motor y bots | `play_card`, `bot_step`, `start_campaign_duel` y recompensas en `supabase/schema/functions.sql`; `/historia` solicita `get_campaign_map` y `start_campaign_duel`. | Descargar imágenes no permite jugar. Portar reglas y bots en bloques propios; online continúa bajo autoridad SQL. |
| Reglas actuales | PR #104 integrado; tercera parda favorece a quien ganó la primera baza. Pruebas en `scripts/sim.ts` y `supabase/tests/tercera_parda.sql`. | El motor local debe partir de estas reglas corregidas y demostrar equivalencia, no copiar la revisión vieja. |
| Arranque | Next.js con rutas dinámicas, middleware y cookies; worker anterior sin caché. | Pantalla local autocontenida ahora; para campaña, una entrada local que no dependa del render de servidor ni de validar la sesión en cada arranque. |
| Eliminación | PR #101; `/eliminar-cuenta`, `/api/account/delete`, `docs/eliminar-cuenta.md`, `20261001184850_account_deletion.sql`. | Desarrollo cerrado. URL para Play: `https://www.trucazo.com.ar/eliminar-cuenta`; falta regresión instalada, no otra migración. |
| Identidad Android | Prototipo reproducible de PR 1B, paquete provisional, entrada www y ruta de asociación por huella real. | Asociación/instalación física y paquete definitivo pendientes; no inventar huellas. |
| Push | PR 1B agrega suscripción/baja y envío de prueba solo para administración; sin almacenamiento de suscripciones ni eventos productivos. | Verificar recepción/permiso en Android; implementación completa de push sigue pendiente. |

Se mantiene **TWA como candidata**, aprovechando la descarga inicial online aceptada. La documentación de Chrome confirma que renderiza en el navegador; Chromium documenta delegación de notificaciones mediante `TrustedWebActivityService`. Esto respalda una prueba, no certifica el resultado en Trucazo. Fuentes revisadas el 09/10: [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/), [delegación de permisos](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/android/java/src/org/chromium/chrome/browser/browserservices/permissiondelegation/README.md), [persistencia web](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

La persistencia de IndexedDB/Cache Storage debe comprobarse y solicitarse al descargar la campaña; el navegador puede denegar almacenamiento persistente. No prometer que sobreviva a borrar datos o desinstalar. No guardar cookies/tokens en el paquete de campaña.

Orden de ejecución desde esta entrega (las etiquetas históricas se conservan):

1. **PR 1A, integrado como #106:** base de arranque web y pruebas de caché/persistencia.
2. **PR 1B, abierto como #108:** prototipo TWA reproducible, firma de prueba, asociación del dominio, cuenta y flujo local mínimo; notificación de prueba preparada. **Siguiente acción: revisión/merge, configuración y pruebas instaladas de `android/README.md`.** Definir el identificador con el dueño antes de fijarlo. Si no satisface reapertura/persistencia/push, revisar Capacitor.
3. **Motor local y bots:** portar el motor de campaña y decisiones de rivales con pruebas contra el SQL actual, incluidos los desempates corregidos. No modificar motor/UI online para simular offline.
4. **Descarga, identidad y guardado:** recursos versionados, instalación completa/incompleta, partida recuperable y datos separados por cuenta; integrar entrada local sin sesión renovada por red. Campaña sin chat escrito.
5. **Sincronización:** validar en el servidor el historial de acciones/repartos autorizados y acreditar una sola vez; nunca confiar en saldos o victorias enviados por el cliente. Concretar el contrato y conflictos junto con el motor, antes de publicar el formato de guardado. Requiere SQL nuevo y pruebas de reintentos y dos dispositivos.
6. **PR 2/3 y push:** completar recuperación de acceso, enlaces, suspensión/reconexión, suscripciones, baja y eventos aprobados. Algunas partes se anticipan en PR 1B para validar TWA.
7. **PR 5/6/7:** moderación, privacidad/ficha y construcción/publicación; regresiones de eliminación existente. Mantener las pruebas y requisitos externos del resto de este documento.

La pantalla de recuperación no reemplaza ninguno de los bloques de campaña offline. La cantidad final de PRs depende de separar motor, bots, sincronización y moderación en cambios revisables.

## Punto de retoma

- Se conservan las siete etapas originales: PR 4 implementado y seis etapas base por revisar/completar. Los números son etiquetas del plan, no números reales de PR de GitHub.
- **Alcance confirmado:** campaña offline desde la primera versión, con conexión inicial para descargar, progreso y recompensas sincronizados al reconectar, cuenta obligatoria en la app y notificaciones push en el lanzamiento.
- No exigir crear una cuenta nueva a jugadores existentes: pueden iniciar sesión. La preparación requiere conexión, pero la campaña descargada debe poder abrirse después sin validar la sesión por red en cada arranque. No se autorizó quitar invitados de la web.
- Antes de iniciar el empaquetado, validar técnicamente TWA con campaña local, persistencia y push. La descarga inicial aceptada permite estudiar este camino; no garantiza por sí sola su viabilidad con el repositorio actual.
- Al retomar, comparar este documento con el `master` actual y descontar cualquier otro trabajo ya integrado. No repetir implementación ni SQL de eliminación de cuentas.
- Las fuentes y requisitos externos pertenecen a la revisión original salvo la consulta del 08/10 sobre público objetivo, clasificación y contacto de desarrollador. Volver a verificarlos antes de publicar.

### Decisiones confirmadas por el dueño — 08/10/2026

| Tema | Decisión |
| --- | --- |
| Campaña offline | Incluida en la primera versión. |
| Preparación inicial | Con internet para acceder con cuenta y descargar lo necesario. |
| Sincronización | Progreso y recompensas se sincronizan con la cuenta al volver a tener conexión; falta diseñar validación y conflictos, no volver a preguntar si se quiere sincronizar. |
| Acceso a la app | Cuenta obligatoria, sin modo invitado en Android. Cuentas existentes válidas; web sin cambios de política no solicitados. |
| Push | Incluidas en el lanzamiento; permiso opcional para el jugador, no condición para jugar. |
| Play Console | No existe cuenta; hay que crearla. No se creó ninguna en esta sesión. |
| Nombre indicado | Santiago Barbeira Papalia. Confirmar coincidencia con documentación al verificar la identidad. |
| Distribución | Intención de disponibilidad mundial, sujeta a países habilitados y requisitos aplicables. No implica traducir la app a todos los idiomas. |
| Público | El dueño propuso tentativamente 14–65 y pidió sugerencias. Recomendación: sin límite superior; edad mínima y grupos de Play aún por confirmar. |
| Soporte | Falta elegir y comprobar un correo atendido. Candidato: hola@trucazo.com.ar; que sea remitente no prueba recepción/atención. |

## Camino técnico candidato: TWA con offline y push, pendiente de prueba

La revisión original propuso una **Trusted Web Activity (TWA)**, generada con Bubblewrap: una aplicación instalable desde Google Play que presenta la web de Trucazo utilizando un navegador compatible, sin la barra de direcciones dentro del dominio verificado. Con las decisiones confirmadas, evaluar este camino junto con motor local, descarga de campaña, persistencia, sincronización y push. Una versión solo online ya no satisface el lanzamiento solicitado.

Para el objetivo actual —facilitar encontrar, instalar y abrir el juego— es el camino que mejor aprovecha lo construido. Se conservan el diseño, las cuentas, las monedas, el progreso, los torneos, los rivales y el servidor. Los jugadores de Android y de la web siguen compartiendo las mismas mesas. La mayoría de las mejoras del juego seguirían llegando con los despliegues web; los cambios del paquete Android se publicarían en Play.

Sin el trabajo adicional de campaña offline, la aplicación seguiría necesitando conexión y dependería del sitio y del navegador compatible. En la revisión original, la campaña también dependía del servidor. Instalar desde Play no agrega juego sin conexión, notificaciones push ni mejoras automáticas de velocidad. La TWA cubre Android; una futura publicación en la App Store requeriría otro trabajo. Ver la sección de campaña sin internet antes de elegir el empaquetado definitivo.

La asociación del dominio y la firma debe verificarse: si falla, puede aparecer la interfaz del navegador. Los flujos externos de autenticación pueden mostrar una pestaña de navegador legítima. Fuentes: [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/), [Bubblewrap y asociación del dominio](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

## Comparación de caminos

| Camino | Encaje con este repositorio | Evaluación |
| --- | --- | --- |
| TWA + Bubblewrap | Mantiene Next.js en Vercel y Supabase; reutiliza la aplicación web completa. | Recomendación inicial para la versión online. La campaña offline requiere trabajo propio y preparación local previa. |
| Capacitor con interfaz empaquetada | Exige adaptar la separación entre cliente y servidor, acceso, cookies, rutas y recursos. Aporta integración mediante plugins nativos. | Evaluarlo si se exige campaña offline desde el primer arranque tras instalar, integraciones nativas o una estrategia conjunta con iOS. No resuelve por sí solo el motor offline. |
| Interfaz nueva en React Native/Flutter | Podría conservar parte del servidor, pero supone rehacer pantallas, navegación e integración del juego. | Requiere otro alcance y otra estimación. |

Trucazo usa páginas dinámicas de servidor, cookies, middleware y rutas `/api`. No es una web estática lista para copiar dentro de Capacitor. Next.js documenta esas restricciones en su [exportación estática](https://nextjs.org/docs/app/guides/static-exports). Además, Capacitor describe `server.url` como una opción de recarga durante desarrollo, no destinada a producción: no conviene basar la propuesta en configurar una URL y dar por resuelta la integración. [Configuración de Capacitor](https://capacitorjs.com/docs/config).

## Hallazgos del repositorio

Los caminos de esta tabla son relativos a la raíz del repositorio revisado el 28 de septiembre. Son una referencia histórica que debe contrastarse con el código actual, no una auditoría renovada. Se actualizó el estado de eliminación de cuentas según lo informado por el dueño.

| Área | Lo que existe | Trabajo pendiente |
| --- | --- | --- |
| PWA | `src/app/manifest.ts`, iconos 192/512, modo `standalone`, `InstallButton.tsx`, `RegisterSW.tsx`. | Identidad estable, alcance, entrada Android, iconos adaptativos y configuración del paquete. Verificar recortes de iconos en dispositivos. |
| Sin conexión | `public/sw.js` deja pasar todo a la red; no implementa caché ni pantalla de recuperación. | Pantalla propia de desconexión y reintento, incluyendo el primer arranque sin red. Evitar almacenar partidas o respuestas autenticadas como si fueran estáticas. |
| Android | No se encontró proyecto Android, configuración Bubblewrap/Capacitor, archivo `assetlinks.json` ni proceso de construcción Android. | Crear el paquete, firma, asociación del dominio y artefactos de distribución. |
| Acceso | Email/usuario y contraseña; Google mediante Supabase; invitado; cookies de sesión. La raíz ya envía al lobby a cuentas registradas con sesión. | Validar Google dentro de TWA, persistencia, confirmación de email y enlaces que regresan a la app. Agregar recuperación de contraseña: no se encontró ese flujo. |
| Destino después del acceso | `src/app/auth/callback/route.ts` dirige al lobby. El login también termina allí. | Conservar el destino permitido cuando el usuario llega a un torneo o partida y debe autenticarse. |
| Regreso al juego | 2vs2 tiene recuperación por `online`, foco y visibilidad. 1v1 tiene Realtime y consultas de respaldo cada 2,5 segundos, sin el mismo manejo explícito de regreso. | Verificar suspensión, bloqueo, reconexión, reloj y cartas actuales en ambos modos. Esto es un riesgo a probar, no un fallo demostrado en Android. |
| Invitados | `GuestSessionGuard.tsx` usa un marcador que vence a los 90 segundos y lo comprueba al montar. | Probar recuperación tras suspensión o recreación de la app; no convertir automáticamente una interrupción breve en pérdida de acceso. |
| Interfaz móvil | Altura adaptable, zonas seguras, bloqueo de scroll en partida y chat sensible al teclado. | Pruebas Android: gesto Atrás, teclado, barras del sistema, pantalla chica y fuentes grandes, conservando la mesa en una pantalla. |
| Eliminación de cuenta | Implementada según confirmación del dueño del 8 de octubre. No se inspeccionó la implementación en esta actualización. | No rehacer. Localizar cambios existentes y comprobar el acceso desde la app y la URL web para la ficha durante las pruebas de publicación. |
| Relaciones entre datos | La revisión original detectó referencias a perfiles y distintos comportamientos de borrado. La eliminación ya fue implementada después. | Revisar las pruebas de la solución existente; mantener regresiones de integridad de historiales ajenos, grupos y torneos. No inferir que sigue faltando una migración. |
| Chat y contenido de usuarios | Chat global con borrado propio/admin. Chat de mesa con límites y opción para silenciar avisos. Avatares, nombres y descripciones de grupos. | Denunciar contenido y usuarios, bloquear interacciones, aceptación de reglas y administración de reportes. Silenciar avisos no equivale a bloquear a un usuario. |
| Privacidad | Existen `/privacidad`, `/terminos` y `/contacto`. | Ajustar canales de soporte, responsable, conservación y datos declarados. La política menciona caché del service worker, pero el código actual no la implementa. |
| Tienda | Los artículos se compran con monedas internas mediante funciones de Supabase. No se encontró cobro con dinero real ni SDK de anuncios en el código revisado. | La estimación asume que se conserva ese modelo. Monetización posterior requiere revisar alcance y políticas. |
| Notificaciones | Correos y avisos dentro del juego en la revisión original. | Push incluidas en el lanzamiento por decisión del dueño; revisar si ya existe trabajo posterior antes de implementar. |
| Verificaciones | CI de aplicación y PostgreSQL, incluyendo chat, torneos y motor. | Agregar construcción Android y pruebas en teléfono. Las comprobaciones actuales no prueban una TWA instalada. |

## Alcance base: 7 etapas originales, 1 implementada

Quedan **seis etapas base por revisar/completar**, sujetas al estado actual del repositorio. Esto no garantiza seis PRs nuevos: pueden reducirse por trabajo ya integrado o dividirse por complejidad, especialmente moderación. La campaña offline no está incluida en esta cuenta. Cada PR nuevo debe documentar pasos manuales y, solo cuando corresponda, la migración SQL nueva que el dueño debe aplicar.

El lanzamiento ahora también incluye los bloques de campaña offline (estimación anterior: 5–7 PRs) y push (aproximadamente 2). La suma bruta sería 13–15 PRs restantes, **no un presupuesto validado**: hay solapamientos y falta revisar `master`. Replanificar el orden antes de implementar; no conservar un primer lanzamiento online como atajo de alcance.

| Etapa | Estado de planificación | Condición para retomarla |
| --- | --- | --- |
| PR 1 — Base Android | PR 1A integrado; prototipo PR 1B preparado, validación instalada pendiente | Completar prueba TWA con flujo local, cuenta y notificación real en Android. |
| PR 2 — Acceso y enlaces | Pendiente de contrastar con `master` | Reutilizar los flujos ya implementados. |
| PR 3 — Recuperación Android | Pendiente de contrastar con `master` | Distinguir reconexión online de juego offline real. |
| PR 4 — Eliminación | Implementado, confirmado por el dueño | Solo localizar evidencia y realizar regresiones de lanzamiento. |
| PR 5 — Moderación | Pendiente de contrastar con `master` | Definir alcance y conservar reglas de chat actuales. |
| PR 6 — Privacidad y ficha | Pendiente de contrastar con `master` | Incorporar el flujo de eliminación existente sin duplicarlo. |
| PR 7 — Publicación | Pendiente de contrastar con `master` | Pruebas instaladas, firma, Play Console y requisitos vigentes. |

### PR 1 — Base Android y prueba de viabilidad

**Precondición:** revisar motor, bots, arranque, persistencia y push con el alcance confirmado. Lo siguiente describe el camino TWA candidato; si la prueba exige otra arquitectura, reformular la etapa antes de implementar el paquete definitivo.

**Entrega:** proyecto TWA reproducible dentro del mismo repositorio, versión de Bubblewrap fijada, configuración de Android, iconos iniciales y manifest web ajustado. Definir identificador de aplicación definitivo; una posibilidad a confirmar es `ar.com.trucazo.app`.

Preparar la asociación `https://trucazo.com.ar/.well-known/assetlinks.json` y distinguir certificados de pruebas, carga y firma de Google Play. Las huellas reales se obtienen de los certificados correspondientes; no se inventan. Preparar APK para instalación de prueba y construcción de AAB, el paquete de publicación.

**Cierre:** abrir en un Android físico, comprobar asociación del dominio y acceso con Google/contraseña. Como prueba de arquitectura, demostrar descarga inicial y reapertura offline de un flujo mínimo local, guardado durable y viabilidad de push. La campaña completa y sincronización se cierran en sus bloques, pero no elegir empaquetado basándose solo en una partida online.

**Complejidad:** media. **SQL esperado:** ninguno por el empaquetado.

### PR 2 — Acceso y enlaces

**Entrega:** recuperar contraseña; revisar confirmación de correo y cierre de sesión; volver al destino correcto después del login; abrir enlaces autorizados de Trucazo en la aplicación instalada. Ocultar las invitaciones redundantes a instalar dentro de la app.

Conservar cuentas y progreso existentes. La app requiere registro o acceso con cuenta existente: quitar la entrada de invitado en Android sin cambiar la web por defecto. Validar el recorrido desde correo externo y Google; permitir únicamente destinos internos válidos en el retorno del login. Preparar identidad local vinculada a la cuenta para campaña descargada, sin obligar a renovar por red el token de sesión antes de cada partida offline. Al reconectar, validar la sesión antes de sincronizar.

**Cierre:** entrar con una cuenta existente, registrar una nueva, cerrar y reabrir, recuperar acceso desde correo y abrir un torneo sin perder el destino. Comprobar que no hay acceso como invitado en Android y que la campaña preparada abre en modo avión. Probar expiración de sesión, cierre de sesión, cambio de cuenta y eliminación: no mezclar guardados ni sincronizar a otra cuenta. La revocación remota solo podrá conocerse al reconectar.

**Complejidad:** media. **Configuración externa:** posibles ajustes de URLs permitidas y correos de Supabase. No se asumieron ya correctos en esta revisión.

### PR 3 — Comportamiento Android y recuperación

**Entrega:** recuperación coherente en 1v1 y 2vs2; estado de conexión; reintento; entrada sin red; regreso tras suspensión; navegación Atrás y cierre de paneles. Revisión del teclado, audio, selector de imágenes y zonas seguras.

En el alcance online base, agregar únicamente la caché necesaria para la pantalla de desconexión y, si se justifica, recursos estáticos versionados. Las sesiones, APIs, cartas y resultados de partidas online deben conservar su autoridad en el servidor. No prometer que el turno online se pausa al salir de la app: siguen rigiendo los plazos del juego. La campaña offline tendrá un motor local separado según el alcance acordado; una pantalla de desconexión no equivale a poder jugar sin internet.

**Cierre:** cambiar entre Wi-Fi y datos, activar modo avión, bloquear el teléfono, abrir otra app y volver; verificar que se recuperan turno, cartas y resultado sin duplicar jugadas. Probar un primer arranque sin red además del regreso tras una sesión previa. Mesa 1v1/2vs2 completa y legible sin scroll.

**Complejidad:** media/alta. **SQL:** solo si las pruebas justifican un ajuste puntual de recuperación o tiempos del servidor.

### PR 4 — Eliminación de cuenta y datos — IMPLEMENTADO

**Estado:** implementado e integrado en el PR #101, commit `953ea31`, merge `1be62d2`. Rutas `/eliminar-cuenta`, `/api/account/delete` y `/api/account/cleanup`; instrucciones y alcance en `docs/eliminar-cuenta.md`. Se da por cerrada esta etapa de desarrollo del plan; no crear otro PR de eliminación ni repetir migraciones. La revisión del 09/10 no comprobó despliegue/SQL en producción.

**Al retomar:** localizar la implementación y su documentación en el repositorio actualizado, registrar la URL web de eliminación y los cambios asociados. Si falta evidencia de aplicación de SQL o despliegue, dejarlo como verificación pendiente, sin asumir que el trabajo no existe ni volver a ejecutar operaciones destructivas.

**Regresión antes de publicar:** comprobar que el flujo existente puede iniciarse desde la app y desde la web indicada en Play Console. En un entorno autorizado y con una cuenta descartable, verificar eliminación de datos/archivos, invalidación de sesiones, solicitudes repetidas e integridad de datos de terceros. Nunca borrar una cuenta real para probar. Documentar cualquier retención y plazo que efectivamente tenga la implementación.

**Trabajo nuevo estimado:** ninguno para reconstruir la funcionalidad. Cualquier defecto demostrado se tratará como corrección puntual. La confirmación de implementación no equivale a una certificación de cumplimiento de Google Play. [Requisito oficial a verificar antes de publicar](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

### PR 5 — Denuncias, bloqueos y moderación

**Entrega:** reportar mensajes y usuarios, bloquear usuarios y administrar denuncias. Cubrir chat global, chat de partida y contenido de perfil/grupos accesible en la app. Incorporar aceptación de reglas antes de crear contenido, también para usuarios que entran con Google y cuentas existentes.

Definir el alcance del bloqueo de mensajes e invitaciones sin modificar arbitrariamente los cruces competitivos. El administrador necesita revisar evidencias y aplicar medidas. El chat de mesa se purga a las 72 horas: conservar de forma restringida la evidencia denunciada por un plazo definido, si es necesaria para resolver el reporte.

**Cierre:** un bloqueo persiste al reabrir; el contenido bloqueado deja de mostrarse donde corresponde; el reporte llega a administración; personas ajenas no pueden leer evidencias privadas. Una medida de moderación se aplica efectivamente.

Se mantiene el comportamiento vigente: texto libre en mesas 1v1 y 2vs2 con o sin bots; bots sin respuestas escritas; campaña sin chat escrito. [Política de contenido de usuarios](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en).

**Complejidad:** alta. **SQL esperado:** sí. Es el candidato principal a dividir en dos PRs si queda demasiado grande.

### PR 6 — Privacidad, soporte y preparación de la ficha

**Entrega:** actualizar privacidad, términos y contacto; poner soporte privado accesible; documento de datos para completar Play Console; textos de la ficha y materiales gráficos basados en la aplicación real. Registrar público objetivo y países elegidos.

Reutilizar el flujo de eliminación ya implementado y su URL pública. Ajustar los textos a su funcionamiento real; no crear una segunda vía técnica ni describirlo como función futura.

Declarar lo que trata la aplicación completa: cuentas, fotos, mensajes, estadísticas, analítica y proveedores configurados. Revisar la clasificación por edades contestando sobre el contenido real del juego, las monedas ficticias y el chat; la clasificación se obtiene del cuestionario, no se supone por ser un juego de cartas.

**Cierre:** enlaces públicos accesibles, ficha coherente con la app y decisiones de conservación/moderación implementadas. Preparar instrucciones y cuenta de prueba sin privilegios administrativos para los revisores de Google. La titularidad y las declaraciones de Play Console las confirma el dueño.

**Complejidad:** media. **SQL esperado:** normalmente ninguno adicional.

Fuentes: [Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [clasificación](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en), [acceso para revisión](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).

### PR 7 — Construcción de publicación y cierre de pruebas

**Entrega:** AAB de publicación, numeración de versiones, firma y asociación con el certificado de Play App Signing; automatización de construcción, documentación de publicación y lista de pruebas. Guardar claves fuera del repositorio. Ejecutar el trabajo Android cuando cambien sus archivos o en una publicación, para evitar alargar cada PR de contenido web.

La revisión original propuso **Android 16 / API 36 como mínimo** como API objetivo. Es una referencia histórica, no una comprobación renovada: verificar y registrar el requisito vigente al preparar el AAB. La API objetivo no equivale a la versión mínima de Android compatible, que es otra decisión. [Requisito oficial](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

**Cierre técnico:** instalar desde el canal de pruebas de Play, verificar firma y dominio, y completar la matriz de pruebas inferior. Documentar qué se revierte en Vercel y qué exige un nuevo paquete Android.

**Cierre de lanzamiento:** completar las pruebas y revisiones de Play Console, resolver hallazgos y publicar. Estas acciones y esperas no se convierten en automáticas por mergear un PR; pueden producir correcciones posteriores.

**Complejidad:** media más validación en dispositivos. **SQL:** solo correcciones demostradas.

## Pruebas necesarias antes de publicar

| Flujo | Resultado a comprobar |
| --- | --- |
| Instalación desde Play | Icono correcto, asociación verificada, apertura y reapertura sin errores. |
| Acceso | Google, email/usuario, registro obligatorio o cuenta existente, sin invitado Android, recuperación, cierre y retorno de correo; web sin regresiones. |
| Cuentas existentes | Mismas monedas, medallas, progreso y estadísticas al acceder desde Android y web. |
| 1v1 | Personas y bots; reconexión; revancha; abandono; relojes y fin de partida. |
| 2vs2 | 1 persona + 3 bots, 2 + 2, 3 + 1 y 4 personas; recuperación, turnos y resultados. |
| Campaña | Descarga inicial autenticada, partida y reapertura offline, progreso durable, sincronización validada sin duplicar recompensas; sin chat escrito. |
| Push | Permiso aceptado/denegado, preferencias, app cerrada, destino correcto, duplicados, logout y cambio de cuenta. |
| Torneos | Detalle, inscripción, check-in, acceso al cruce, regreso y premios. |
| Chat | Teclado y botón Enviar; invitados sin escritura; bots sin texto; denuncias y bloqueos. |
| Suspensión/red | Bloqueo del teléfono, otra aplicación, Wi-Fi/datos y arranque sin internet. |
| Navegación | Atrás, enlaces de correo, paneles, subida de avatar y regreso al juego. |
| Pantallas | Android de gama media, pantalla chica, Android reciente, gestos y botones de navegación. |
| Privacidad | Eliminación real, canales de soporte y ausencia de datos personales en evidencias públicas. |

Las verificaciones automatizadas de SQL se mantienen. No sustituyen los recorridos anteriores en una aplicación instalada.

## Pasos fuera del repositorio

Los importes, plazos y umbrales siguientes son los registrados en la revisión original. Confirmarlos en la documentación oficial y en la cuenta concreta antes de iniciar la publicación.

1. Crear la cuenta de desarrollador de Google Play: el dueño confirmó que no tiene una. Elegir tipo de cuenta según la titularidad real y completar verificación; no se creó ni pagó nada en esta sesión. La revisión original registró **US$25 una sola vez**; verificar importe al realizar el alta. [Alta de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
2. Nombre indicado: Santiago Barbeira Papalia. Confirmar los datos legales, el correo público atendido y la titularidad; elegir identificador definitivo y conservar claves de carga de forma segura.
3. Preparar pruebas internas y luego cerradas. Para cuentas personales creadas después del 13/11/2023, Google exige al menos **12 testers inscritos continuamente durante 14 días** antes de solicitar acceso a producción. Hay que probar y recopilar resultados; cumplir el mínimo habilita la solicitud, no garantiza aprobación. [Pruebas requeridas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
4. Aplicar las migraciones SQL indicadas por cada PR y configurar los valores externos documentados. El repositorio no despliega automáticamente el backend.
5. Completar ficha, países, público, clasificación, datos, privacidad y acceso para revisión. Subir el AAB y atender la revisión.

Conviene iniciar el alta y reunir testers temprano. El plazo total depende tanto del desarrollo como del período de pruebas y la revisión de Google; esta propuesta no fija una fecha de aprobación.

## Campaña sin internet — incluida en el lanzamiento

El dueño confirmó campaña offline en la primera versión, descarga inicial con internet, sincronización posterior y cuenta obligatoria. No confundir este pedido con mostrar una pantalla de desconexión o guardar imágenes: reglas y rivales deben funcionar en el dispositivo sin llamadas al servidor.

### Condiciones confirmadas y diseño técnico pendiente

1. Primera versión: offline incluido, no opcional posterior.
2. Antes de jugar offline: entrar con una cuenta y descargar la campaña con internet. Mostrar descarga completa/incompleta, permitir reintentar y no prometer disponibilidad si faltan recursos.
3. Al reconectar: sincronizar progreso y recompensas con la misma cuenta. Diseñar reintentos idempotentes, validación de resultados y conflictos entre dispositivos; no limitar a progreso aislado sin aprobación.
4. Cuenta obligatoria en la app; no pedir volver a registrarse a jugadores existentes. Definir manejo local de logout, cambio de cuenta y expiración de sesión sin romper el uso offline autorizado.

Se aceptó preparación online previa: evaluar campaña web offline con caché y persistencia local dentro del camino TWA. Capacitor sigue siendo alternativa técnica si la prueba muestra limitaciones, no una obligación deducida del pedido. **Ninguno de los empaquetados traslada automáticamente las reglas y bots que en la revisión original dependían del servidor.** Validar con código actualizado antes de comprometer la solución.

### Desglose preliminar: 5–7 PRs adicionales

Es una estimación orientativa que requiere una nueva revisión técnica. Puede solaparse con acceso, recuperación y empaquetado de las seis etapas base; no sumar las cifras como un presupuesto cerrado.

| Bloque | Entrega prevista |
| --- | --- |
| Motor local | Reglas de campaña ejecutables sin red y pruebas de equivalencia con las reglas actuales. |
| Rivales locales | Decisiones de bots en el dispositivo y pruebas de dificultad/comportamiento. |
| Recursos y arranque | Pantallas, cartas, sonidos y contenido disponibles según el requisito de primer arranque acordado. |
| Guardado local | Partida/progreso durables, recuperación al cerrar, versionado y migración de partidas guardadas. |
| Sincronización | Identidad, reintentos sin duplicados, conflictos entre dispositivos y recompensas según la decisión del dueño. Puede necesitar dividirse. |
| Integración y pruebas | Separación clara entre campaña local y modalidades online; modo avión, cierre forzado, actualización y reconexión. Puede integrarse en otros bloques. |

Los resultados guardados en un dispositivo pueden alterarse: sincronizar no significa confiar automáticamente en el saldo o las victorias enviados por el cliente. Diseñar validación y acreditación única de recompensas, tratamiento de resultados inválidos y conflictos. Si la solución necesita límites de producto, proponerlos al dueño antes de aplicarlos. No prometer prevención total de trampas offline. Mantener campaña sin chat escrito.

**Aceptación mínima:** descargar tras acceder con cuenta, terminar partidas en modo avión, cerrar y reabrir conservando el avance y volver a internet sin duplicar resultados ni perder progreso. Explicar qué ocurre al desinstalar o borrar datos locales; no prometer recuperación en la nube antes de sincronizar.

## Trabajo de código y pruebas en computadora

La preparación de cambios de código, tests y documentación puede separarse de la validación Android. En cada sesión de ChatGPT Work se debe comprobar primero qué acceso al repositorio y herramientas de construcción están disponibles; no dar por generado o probado un APK solo porque el código esté listo.

| Etapas | Trabajo preparable sobre el repositorio | Cuándo usar computadora/dispositivo |
| --- | --- | --- |
| PR 1 | Configuración, manifest, asociación del dominio y pasos de construcción. | Para construir e instalar con herramientas Android si no están disponibles en la sesión; comprobar firma y acceso. |
| PR 2, 5 y 6 | Flujos de acceso, moderación, textos, tests y documentación. | Para recorridos reales de correo/Google, formularios de Play Console y comprobaciones finales. |
| PR 3 | Recuperación, navegación y pruebas automatizadas. | Para suspensión, teclado, Atrás, red, audio y comportamiento instalado. |
| PR 4 | No repetir: localizar lo implementado y revisar evidencia. | Solo regresiones autorizadas con una cuenta de prueba. |
| PR 7 | Configuración de publicación, automatización y lista de pruebas. | Firma, subida a Play Console, instalación desde el canal de pruebas y validación final. |
| Campaña offline y push | Motor, bots, persistencia, sincronización, entrega de notificaciones y tests con el alcance confirmado. | Modo avión, cierre forzado, pérdida de proceso, rendimiento, permiso de notificaciones y actualizaciones. |

El emulador de Android Studio en la PC sirve como entorno de desarrollo y pruebas; confirmar sistema operativo y recursos de esa PC antes de indicar una instalación concreta. No sustituye una prueba final en un teléfono Android real, especialmente para rendimiento, suspensión y cambios de conexión.

## Push — incluidas en el lanzamiento

**Estimación orientativa: 2 PRs adicionales.** Uno para permisos, suscripciones, baja y entrega; otro para eventos, preferencias y pruebas con app cerrada. Propuesta inicial de eventos, todavía no aprobada en detalle: check-in de torneo, cruce listo e invitación. Definir categorías, frecuencia y enlaces; no activar por defecto campañas promocionales no acordadas. El jugador puede denegar el permiso y seguir jugando. Evitar duplicados y envíos vinculados a una cuenta tras cerrar sesión. No se consideran resueltas por los emails actuales. Validar el flujo en el empaquetado elegido. [Referencia Android](https://developer.android.com/reference/androidx/browser/trusted/TrustedWebActivityService).

## Otros opcionales
- **Cobros, anuncios o suscripciones:** nueva evaluación de producto, políticas e integración antes de estimar.
- **App Store:** planificación específica para iOS.

## Soporte, países y público objetivo

**Soporte** significa un canal privado y atendido para que los jugadores informen problemas de acceso, errores, denuncias o dudas. No requiere contratar personal ni un sistema de tickets para empezar. Propuesta: usar `hola@trucazo.com.ar` si el dueño recibe y responde ahí; de lo contrario, elegir otra casilla. Probar recepción y respuesta antes de publicarla. Google exige un correo de contacto para la app; el teléfono de verificación de la cuenta no es lo mismo que ofrecer atención telefónica a jugadores. [Soporte oficial](https://support.google.com/googleplay/android-developer/answer/113477?hl=en).

**Identidad:** el nombre indicado es Santiago Barbeira Papalia. Si publica como persona y no mediante una entidad, evaluar cuenta personal y confirmar esa titularidad en el alta. El nombre de desarrollador puede diferir del legal, pero Google verifica identidad y muestra determinados datos legales y de contacto; no prometer anonimato ni que elegir una marca oculte esos datos. La cuenta no está creada. [Información requerida](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).

**Países:** se registra la intención de publicar mundialmente, en los países donde Play permita distribuir la app y se cumplan los requisitos aplicables. No se decidió una traducción ni atención multilingüe. Revisar especialmente privacidad y tratamiento de menores antes de marcar todos los mercados; disponibilidad mundial no equivale a aprobación universal automática.

**Edades: propuesta, no decisión cerrada.** El dueño sugirió 14–65. Recomiendo no fijar un máximo de 65: permitir también adultos mayores y conservar la interfaz legible. Como producto, 14 años en adelante puede mantenerse como propuesta, condicionada a revisar protección de menores, chat, datos y contenido reales antes de fijar la edad mínima.

Play Console utiliza franjas, entre ellas 13–15, 16–17 y 18 o más, no un selector exacto «14–65». Declarar los grupos realmente contemplados no implementa por sí solo una restricción de edad de 14 años. La clasificación del contenido se obtiene por separado mediante el cuestionario; no puede prometerse una clasificación determinada solo por elegir un público. Las reglas relativas a menores varían según el país. No marcar solo adultos para evitar obligaciones si en realidad se pretende admitir adolescentes. Fuentes consultadas el 08/10/2026: [público objetivo](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en), [clasificación de contenido](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en).

## Decisiones que todavía faltan

1. Correo de soporte atendido: confirmar si será `hola@trucazo.com.ar` y quién revisará mensajes y denuncias.
2. Edad mínima final y público declarado, después de revisar chat, datos y contenido. Propuesta inicial: 14+ sin máximo, no aprobada todavía.
3. Tipo de cuenta de Play Console según la titularidad real; completar luego alta, verificación y datos de contacto. El nombre ya fue indicado; no volver a preguntar si existe cuenta.
4. Eventos concretos de push y preferencias: proponer un alcance acotado para lanzamiento. Su inclusión ya está aprobada.
5. Identificador definitivo de aplicación; la propuesta `ar.com.trucazo.app` sigue sin confirmar. PR 1B usa `ar.com.trucazo.prototype` hasta esa decisión; el dueño pidió explicación antes de decidir.

La elección de empaquetado, formato de guardado, validación de recompensas y resolución de conflictos son trabajo técnico a proponer con evidencia del repo. No exigir que el dueño elija herramientas o algoritmos sin explicar las consecuencias.

## Instrucciones para la próxima sesión

1. Leer este documento y las instrucciones `AGENTS.md` del repositorio; abrir el estado actual de `master`, respetando cambios ajenos. Si no hay acceso, solicitar el repositorio o su conexión; no asumir que queda una copia de la sesión anterior.
2. Comparar las etapas con lo ya integrado. Localizar la eliminación de cuentas implementada y registrar PR/commit, rutas y documentación encontrados, sin reconstruirla ni ejecutar SQL por duplicado. Distinguir siempre código integrado de despliegue verificado.
3. Tomar como definitivas las decisiones de alcance de esta versión: campaña offline desde lanzamiento, descarga inicial online, sincronización, cuenta obligatoria en Android y push. No volver a hacer esas mismas preguntas.
4. Revisar motor, bots, recursos, identidad local, persistencia, sincronización y push; realizar propuesta de prueba técnica TWA y reformular arquitectura/orden de PRs según evidencia. No continuar automáticamente con el plan histórico de empaquetar una app solo online.
5. La implementación fue autorizada el 09/10/2026. Continuar con el próximo bloque del orden actualizado, explicando archivos, criterios de aceptación, pruebas y pasos manuales. PR 1A integrado; PR 1B prepara prototipo y pruebas, sin cerrar viabilidad instalada ni campaña offline. La retoma inmediata es su matriz en `android/README.md`; después motor/bots y contrato de sincronización. Publicar en Play es una etapa posterior.
6. Mantener el diseño actual, mesa completa sin scroll y diseño 2vs2 sin cambios no solicitados. Chat escrito en 1v1/2vs2 con personas o bots, bots sin escribir y campaña sin chat escrito. Explicar instrucciones sin asumir conocimientos de programación.
7. Al cerrar cada etapa, actualizar aquí su estado y evidencia: PR/commit real, pruebas ejecutadas, SQL o configuración pendientes y próximo paso. No presentar pruebas no realizadas como aprobadas.

### Texto para iniciar la próxima sesión

> Continuemos Google Play desde el estado actualizado del repositorio. PR 1A ya está integrado como #106; revisá el estado del PR 1B y leé android/README.md para completar configuración y pruebas instaladas antes de dar por elegida TWA. No rehagas la eliminación del PR #101. Si la prueba Android pasa, seguí con motor local/bots y diseño del contrato de sincronización. La primera versión incluye campaña offline con descarga inicial online, progreso/recompensas sincronizados, cuenta obligatoria Android y push; cuentas existentes válidas y web con invitados. Conservá diseño y reglas de chat. No tengo Play Console. El identificador del prototipo es provisional; ar.com.trucazo.app sigue sin confirmar. Quedan soporte, edad mínima, tipo de cuenta y eventos push. Actualizá pruebas/evidencia sin confundir build del APK con instalación ni contador de prueba con campaña offline terminada.

### Registro de actualización

- **28/09/2026:** revisión original de repositorio y plan de siete etapas.
- **08/10/2026:** PR 4 marcado como implementado por confirmación del dueño; seis etapas base restantes sujetas a revisión; incorporadas las decisiones pendientes de campaña offline, la separación entre trabajo de código y pruebas Android y las instrucciones de retoma. Solo se actualizó este documento.
- **08/10/2026, decisiones posteriores:** confirmados offline desde la primera versión, descarga inicial online, sincronización, cuenta obligatoria Android y push en lanzamiento; Play Console por crear, nombre Santiago Barbeira Papalia y distribución mundial. Público 14–65 recibido como propuesta, con recomendación de no fijar máximo; soporte pendiente. Actualizadas instrucciones de retoma para no repetir preguntas ya respondidas. No se modificó código, no se creó cuenta externa ni se publicaron datos.
- **09/10/2026:** el dueño pidió comenzar. Contrastado `master` en `d4aef04`; registrada eliminación del PR #101 y desempate del PR #104. Base web PR 1A abierta como [PR #106](https://github.com/santibpapa/trucazo/pull/106), código `e3f3a1f`, con las pruebas registradas arriba. Separado su cierre del prototipo Android PR 1B, motor, bots, descarga y sincronización. No se aplicó SQL ni se publicó en Play.
- **09/10/2026, segunda etapa:** confirmado merge de #106 en `250acfa`; abierto [PR #108](https://github.com/santibpapa/trucazo/pull/108), implementación `074ada7`, con generación Android, cuenta, asociación por certificado real y prueba aislada de guardado/push. APK debug y AAB construidos; firma y metadatos comprobados. Paquete provisional porque no se confirmó identificador definitivo. Actualizada la retoma y los pasos externos en `android/README.md`. Sin SQL, configuración productiva, instalación en teléfono ni publicación en Play.
