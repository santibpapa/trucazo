# Android — app instalada y Google Play

[Volver al README](../README.md) · Documento principal de Android. Actualización de organización: **13/10/2026**. Las evidencias conservan sus fechas y entornos; esta reorganización no ejecutó una etapa, SQL ni un despliegue.

<a id="android-estado-actual"></a>

## Estado actual

- **Integración a `master`, 30/10/2026:** las fuentes de la app (PR #145 hasta `a357cd8`, con el menú) entran a `master` mediante el [PR #147](https://github.com/santibpapa/trucazo/pull/147). Desde ese merge, la web publicada vuelve a salir de `master`. Las seis migraciones de la app ya estaban aplicadas en producción (11/10, 15/10 y 27/10): no repetirlas. Guía permanente: [Cómo llegan los cambios](#como-llegan-los-cambios).
- **ANDROID-01 a ANDROID-17 cerradas (27/10/2026).** Candidato final **0.17.4/código22**, `ar.com.trucazo.app`, firmado con la misma clave de16. [Acta y alcance de pruebas](#android-17-acta-2026-10-27); [último traspaso17](#android-17-traspaso-2026-10-27). Redmi14C/Android16/WebView155: lobby **1,915/2,043/1,860s**, Historia sin red con reinicio/partida/sincronización, Google/recuperación/borrado válidos. Push privado recibido/tocado, partidas app/web y sistema comprobados. Batería19 aceptada como referencia:3puntos en18,5min de lobby/brillo máximo/WiFi,24–28°C. Cinco guardados originales intactos; tresQA conservadas. CI `fbf98fc` aprobado yPR145 en borrador/sin merge; producciónHTTPS autorizada `575bedc` activa. Confirmación de email y push público apagados. **ANDROID-18 pendiente, sin iniciar; nada publicado en Play.**
- **Adaptación posterior a17, 27/10:** menú principal aprobado por el dueño, implementado en23 y pulido en **0.17.6/código24**, misma firma y paquete. Campaña, Multijugador, Ajustes y Salir; botones ilustrados, sin indicador de conexión. [Alcance, artefactos y comprobaciones](#android-menu-principal). La aceptación física anterior sigue correspondiendo a22; esta adaptación no inicia18 ni cambia sus números.
- **Cuentas permanentes de prueba desde el 14/10:** `androidqa1`, `androidqa2` y `androidqa3`, con ingreso automático comprobado en web y APK. QA3 fue autorizada y creada por el formulario normal para aceptar el alta de 07. Reemplazan el ingreso personal para las pruebas habituales. [Accesos privados y uso](#android-qa-accounts).
- APK Capacitor de trabajo **0.14.0/código 14**, actualizado sin borrar datos durante15, con eliminación local por cuenta, privacidad y licencias empaquetadas. Atrás, ventanas accesibles, mesa adaptada al alto útil y recepción nativa protegida por cuenta conservados. Convivencia, comunidad, soporte, preferencias, ayuda y administración de las etapas previas conservados. Torneos/espectador, parejas y perfil/ranking/tienda comparten presentación y controladores con la web; Historia online y descarga se eligen dentro de la app. Conserva15 provincias/66 rivales, SQLite, sincronización de06 y acceso de07. [Aceptación y cierre de15](#android-etapa-15); [pruebas y límites de06](#android-06-sync).
- Aceptación push en emuladores Android 11/API30 y Android 16/API36, ambos WebView 133, con API Next local, Supabase y FCM reales. Las rutas nuevas aún no están desplegadas; el APK debug local no está listo para Google Play. Teléfono físico y matriz integral siguen en las etapas correspondientes.
- **Conservar:** testin SQLite revisión299, 0 pendientes y 5 comprobantes, 960 monedas/24 puntos oficiales. La partida abierta se conservó al actualizar y después terminó 0–15; sus registros no se borraron antes de confirmar. Chrome conserva sesión y guardado separados, sin cambios. TWA, claves y trabajo local conservados. Las dos migraciones de Historia se aplicaron el 11/10: no repetirlas ni copiar la base de Chrome.
- Entorno de esta PC comprobado en ANDROID-01 el 12/10: Java 21/Gradle separados, WebView oficial 133 y segundo AVD API 36 preparado y arrancado por separado. No repetir BIOS ni reinstalar por rutina.
- Base firmada **0.16.1/código17** y candidato aceptado **0.17.4/código22** conservados para comparación; candidato actual del menú **0.17.6/código24**, mínimoAPI29/objetivo36, separado del QA14. [Artefactos de16](#android-etapa-16), [aceptación de17](#android-etapa-17) y [adaptación del menú](#android-menu-principal). Los códigos de versión no son números de etapa. Cuenta Play Console y distribución/firma de Play siguen en18; activación pública de push según el plan. Soporte atendido y mínimo16 confirmados en15; clasificación y mercados dependen del formulario real de Play.
- **Ampliación del plan, 20/10/2026:** [compatibilidad entre versiones de app y servidor en17](#android-17-compatibilidad), implementada y con pruebas aisladas aprobadas; falta completar aceptación con servicios públicos. [Procedimiento para futuras actualizaciones en20](#android-20-actualizaciones) todavía pendiente. Se mantienen01–16 cerradas y17 en curso.

- **Sincronización local del 21/10:** mejoras de GitHub hasta `38002ae` integradas con las fuentes Android; [respaldo, alcance y pruebas](#android-sync-github-2026-10-21). Los artefactos firmados de16 y las apps instaladas conservan su versión anterior. Preparar un candidato firmado actualizado para aceptar esta integración en17.

## Próximo paso y cómo retomar

**Próxima etapa: ANDROID-18, todavía sin iniciar.** Leer primero la [adaptación del menú principal](#android-menu-principal) y el [último traspaso17](#android-17-traspaso-2026-10-27). Comprobar servidor, cinco guardados originales, tresQA, artefactos24 y configuración vigente;22 conserva la aceptación física anterior. Después revisar PlayConsole/cuenta/registro del paquete antes de coordinar el canal interno con autorización del dueño. Revalidar el menú24 en teléfono y con la firma/distribución dePlay al obtenerla. Conservar producción575, firma de subida, contratos v1 y mínima17; no retirar versiones ni repetir SQL/Firebase/retornos. Email y push público apagados.

Para ese trabajo consultar también [Juego](juego.md) y [Backend](backend.md). Ranking y recepción de presencia ya corregidos/comprobados: consultar el [estado vigente de Operación](operacion.md#correccion-cierres-presencia) para su aceptación pendiente de podio y partida larga; no repetir la migración.

> Comenzá ANDROID-18. 01–17 cerradas. Leé AGENTS.md, README.md, la adaptación del menú principal y el último traspaso de17 del27/10 en docs/android.md. Primero comprobá servidor, cinco guardados, tresQA y candidato firmado0.17.6/código24. Revalidá el menú en teléfono; después revisá PlayConsole y coordiná el canal interno. Conservá email y push público apagados, firma y contratos compatibles; no publiques en producciónPlay.

<a id="como-llegan-los-cambios"></a>

## Cómo llegan los cambios a la web y a la app — guía práctica

Escrita el 30/10/2026 a partir del diseño de compatibilidad de ANDROID-17. Es la base
del [procedimiento permanente de ANDROID-20](#android-20-actualizaciones); su ensayo
completo por el canal de Play sigue pendiente en 18–20.

**La idea en una frase:** hay una sola cocina (Supabase y los servicios de Vercel) y
dos formas de servir. La web es una pizarra que se reescribe en cada publicación; la
app es un menú impreso que cada jugador se lleva y cambia recién cuando actualiza.

### Qué vive dónde

| Pieza | Dónde corre | Cómo se publica un cambio | Cuándo lo ven los jugadores |
| --- | --- | --- | --- |
| Reglas, monedas, premios, partidas (SQL) | Supabase, compartido | El dueño corre una migración nueva en el SQL Editor | Al instante, en la web y en todas las apps |
| Pantallas de la web | Vercel, `www.trucazo.com.ar` | Merge a `master`: Vercel publica solo | En la próxima carga de la página |
| Servicios web que llama la app: `/api/android/*` (login, historia, push, preferencias, admin-emails), `/api/community/*`, `/api/account/delete`, `/api/uploads/cleanup`, `/api/analytics` | Vercel, en la misma publicación que la web | Merge a `master` | Al instante, también para apps viejas |
| Pantallas de la app | Dentro del APK/AAB (la app importa las de `src/` y suma las suyas de `apps/mobile/src`) | Versión nueva firmada y subida a Play | Cuando cada persona actualiza: días o semanas, y algunas nunca |

La carpeta `android/` y el workflow `android.yml` son del prototipo TWA de septiembre;
la app real es `apps/mobile` (Capacitor).

### La regla de oro

Supabase y los servicios de Vercel tienen que seguir funcionando para **la versión de
la app más vieja que todavía se admite** (`app_compatibility.policy.minimum_code`,
hoy **17**). Mientras no haya nada publicado en Play, esa exigencia alcanza a los APK
de prueba instalados (QA y teléfono del dueño); desde la primera publicación alcanza
a jugadores reales.

### Los cuatro tipos de cambio

1. **Arreglo interno** (misma función, mismos parámetros, misma forma de respuesta;
   por ejemplo, un envido mal sumado): migración nueva. Llega a todos al instante. No
   hace falta versión nueva de la app.
2. **Algo nuevo en el servidor:** se agrega. Función nueva, parámetro opcional con
   valor por defecto o campo nuevo en la respuesta. Nunca renombrar, borrar ni cambiar
   el tipo de lo existente. Las apps viejas ignoran lo que no conocen.
3. **Cambio de pantalla:** en la web se publica con el merge. En la app entra en la
   próxima versión: como reutiliza las pantallas de `src/`, el próximo APK lo trae
   solo. Si es sólo para la app, va con una prop opcional cuyo valor por defecto deja
   la web igual (así se hizo el menú principal).
4. **Cambio que rompe, cuando no hay otra salida:** en pasos separados, sin apurarlos.
   1. Migración que acepta lo viejo y lo nuevo a la vez.
   2. Versión nueva de la app que usa lo nuevo, publicada y descargable en Play.
   3. Subir la versión mínima (ver abajo). Las apps viejas pueden terminar la partida
      en curso y sincronizar la campaña, pero no empezar otra.
   4. Recién después, otra migración que retira lo viejo.

### El freno de versión mínima

Aplicado en producción el 27/10/2026 (`20261027005516_android_version_compatibility.sql`
y `20261027013911_android_compatibility_service_role.sql`; no repetirlas). La app
informa su código de versión al entrar. Si está por debajo del mínimo, el servidor
rechaza crear o sumarse a mesas, pedir revancha, comprar o abrir campañas nuevas,
aunque alguien saltee el aviso. Igual deja terminar la partida activa, sincronizar la campaña sin internet y
leer datos, y la app muestra «Actualizá Trucazo» con el enlace a Play.

Para subirlo, **sólo cuando la versión nueva ya se pueda descargar desde Play**, el
dueño copia esto en Supabase → SQL Editor → New query, cambia `25` por el código nuevo
y toca Run:

```sql
update app_compatibility.policy
set minimum_code = 25,
    replacement_code = 25,
    replacement_url = 'https://play.google.com/store/apps/details?id=ar.com.trucazo.app',
    replacement_available = true
where singleton;
```

Para deshacerlo: `update app_compatibility.policy set minimum_code = 17 where singleton;`

Dos cuidados técnicos:
- El freno ocupa el único «control previo» de PostgREST (`pgrst.db_pre_request`). Si
  otro cambio necesita uno, hay que sumarlo dentro de `app_compatibility.check_request`,
  no reemplazarlo; la migración original se frena sola si encuentra otro.
- La lista de funciones permitidas a una versión retirada está escrita en
  `check_request`. Una función nueva queda bloqueada para versiones retiradas, que es
  lo esperable.

### Lista de control para cada cambio

- ¿Toca SQL o `src/app/api/`? ¿Cambia el nombre, los parámetros o la forma de
  respuesta de algo que ya existe? Si es así, es del tipo 4.
- ¿Toca pantallas de `src/`? Revisar que el workflow «Android Capacitor» del PR quede
  en verde, además de la revisión automática de siempre.
- En la descripción del PR: **«¿Necesita versión nueva de la app? sí/no»**.
- Para sacar una versión de la app:
  1. Subir `versionCode` y `versionName` en `apps/mobile/android/app/build.gradle` y
     `version` en `apps/mobile/package.json`. Tienen que coincidir: Gradle lo verifica.
  2. Construir con `apps/mobile/scripts/build-release.ps1` en la PC del dueño, donde
     vive la firma (ver [firma y construcción de 16](#android-etapa-16)).
  3. Inspeccionar con `inspect-release.ps1` y subir el AAB a Play (canal interno,
     cerrado o producción, según la etapa).
- Subir la versión mínima sólo en cambios del tipo 4. Un cambio compatible del
  servidor nunca obliga a actualizar.

<a id="android-menu-principal"></a>

## Menú principal — adaptación posterior a17 — 27/10/2026

**Pedido y alcance:** el dueño aprobó agregar una entrada de videojuego antes de continuar Android. No es ANDROID-18. La cuenta sigue siendo obligatoria; el inicio habitual autenticado muestra **Modo Campaña**, **Multijugador**, **Ajustes** y **Salir**, cada uno con una descripción breve. Las partidas abiertas y los enlaces de invitación conservan su destino directo.

**Implementado:** `MainMenu.tsx` y su hoja de estilos reutilizan marca, salón y paleta existentes. Campaña abre el mapa y el motor local ya preparados, tanto con como sin conexión, con la sincronización existente al recuperar red; la primera preparación requiere cuenta e internet. “Historia” pasa a mostrarse como “Modo Campaña” en esta entrada y mapa Android; las rutas anteriores siguen siendo compatibles. El lobby vuelve al menú mediante su marca y Atrás. Ajustes permite cambiar el sonido con persistencia y abrir notificaciones/cuenta con regreso a Ajustes. Salir minimiza la app y conserva la sesión. Al reiniciar, las pantallas comunes vuelven al menú; las partidas online y una campaña con duelo abierto conservan recuperación. Los componentes compartidos mantienen sus valores predeterminados para la web. Sin cambios de reglas, motor, contratos, SQL ni servicios publicados.

**Artefactos:** candidato firmado **0.17.5/código23**, `ar.com.trucazo.app`, API29/36 y misma firma de16/22. [APK](../android/artifacts/menu-principal/trucazo-0.17.5-release.apk), **17.194.488 bytes**, SHA256 `7fcbb159a4e1c42769aaf46b3e4eb03c507f6c7e4941c05de19ed67061f03afc`; [AAB](../android/artifacts/menu-principal/trucazo-0.17.5-release.aab), **10.493.381 bytes**, SHA256 `fe78bd8781923b1a04cacaf199d967bbeadd59a1fbd35161d64a6af5e36d7596`. Inspección aprobada: firma original, API HTTPS, versión23, sin depuración ni claves privadas, alineación16KB. Inventario y compilación en `android/generated/android-main-menu-release23-{inventory.json,inspection.log,build.log}`. No reemplazar los artefactos históricos22.

**Comprobado:** tipos aprobados; lint sin errores, con las seis advertencias previas de hooks. `npm --prefix apps/mobile run check:menu` usa UI/SDK reales y servicios simulados: menú completo sin scroll en **320×568,360×640,393×852,568×320 y640×360**, sin precargar el lobby, aviso sin red, preparación inicial protegida, sonido persistente, salida conservando sesión y regreso desde el lobby. El mismo ensayo verifica descarga incompleta, guardado, cierre/reapertura sin red con sesión vencida y aislamiento A/B. `check-session.mjs --sync`: respuesta perdida, reintentos, fallo al guardar confirmación, versión incompatible y cambio de cuenta conservan la cola y evitan premios duplicados. `check-version-browser.mjs`: el menú no elimina el control de compatibilidad de Multijugador ni la recuperación de partidas.

**Aceptación instalada:** los dos emuladores se actualizan22→23 mediante `install -r`, sin desinstalar ni borrar datos. `check-main-menu-device.mjs before/after <serial>` registra identidad y hashes de los cinco dueños conocidos (un guardado presente por emulador), y recorre menú, sonido, cuenta, notificaciones, lobby, enlace Android de invitación ficticio, modo sin red, Atrás, Salir y arranque en frío. Evidencias `android-main-menu-emulator-{5554,5556}-{before.json,after.json,installed.png}`. El QA14 original y Chrome se mantienen separados. La aceptación física de17 corresponde a22; el menú23 necesita comprobarse en teléfono al continuar18. No se repiten pruebas de Google/push/batería de17 ni se atribuyen a23. Sin publicación en Play, envío externo ni despliegue web por esta adaptación.

**Pulido pedido por el dueño — 27/10/2026, candidato24:** se retira todo el indicador de conexión del inicio. Campaña y Multijugador incorporan el arte existente y las cartas, doble marco dorado, relieve y fondos vino; Ajustes y Salir llevan medallones más discretos. Respuesta al tocar, foco visible y movimiento reducido; imágenes locales con prioridad, sin animación de entrada ni efectos continuos. Sólo presentación y eliminación del dato visual; navegación, guardados y juego conservados. Decisión copiada en las convenciones de Diseño y su espejo técnico.

**Artefactos24:** **0.17.6/código24**, misma firma, paquete y API29/36. [APK](../android/artifacts/menu-principal/trucazo-0.17.6-release.apk),17.195.128bytes, SHA256 `537dbd6df5456a8b84f15cf0e3b6658341edfdeeee93d4ae781ec7c1856998ca`; [AAB](../android/artifacts/menu-principal/trucazo-0.17.6-release.aab),10.494.043bytes, SHA256 `6a1e9b922c7c4dc8538126bb37c35e64a1b1005859a7dd5b1f5deb6a98258e89`. Inspección de firma, privacidad, API y16KB aprobada. Compilación e inventario en `android/generated/menu-polish24/release24-{build.log,inventory.json,inspection.log}`; artefactos22/23 conservados.

**Verificado24:** TypeScript aprobado; lint dirigido a los dos componentes editados sin errores ni advertencias. Revisión React de estructura, accesibilidad, imágenes iniciales y movimiento completada. `check:menu` aprobado en los mismos cinco tamaños, con todas las imágenes cargadas, sin indicador de conexión online/offline y cuatro opciones sin scroll; preparación, sonido, sesión, recuperación offline y aislamiento A/B conservados. Capturas y resultados separados en `android/generated/menu-polish24/`. La aceptación de teléfono físico sigue siendo la de22; revalidar el menú24 al continuar18.

**Instalado24:** actualización23→24 en Android11 y16 aprobada, con identidad y bytes de las campañas intactos. Menú completo (568px/640px útiles), imágenes cargadas, sin indicador de conexión; Ajustes, cuenta/notificaciones, regreso del lobby, invitación directa, campaña sin red, Atrás, Salir y reapertura en frío aprobados. Evidencias `menu-polish24/android-main-menu-emulator-{5554,5556}-{before.json,after.json,installed.png}`. Firma y controles de publicación conservados; sin envío a Play ni despliegue web por este pulido.

**Entrega de fuentes en GitHub — 30/10/2026:** el dueño pidió subir todo el trabajo pendiente, incluido el menú, a `codex/android-17-acceptance` ([PR #145](https://github.com/santibpapa/trucazo/pull/145)). La entrega sobre `fbf98fc` reúne 32 archivos de código, pruebas y documentación: menú24, navegación, cierre de17 y controles web compartidos. Esta autorización reemplaza la restricción histórica de subir la documentación completa registrada en el traspaso17. Claves, `.env.local`, certificados, `google-services.json`, APK/AAB, cachés y carpetas temporales quedan fuera del commit. La rama `master` se conserva intacta y el PR sigue sin merge.

**Verificación de esta entrega:** Node24.22.1; TypeScript, compilación de Historia/interfaz móvil y compatibilidad en navegador aprobados. ESLint sin errores, con las seis advertencias de hooks ya registradas. El ensayo `check-session.mjs --menu` aprobó los cinco tamaños, sesión, guardado offline y aislamiento A/B al repetirlo; el primer intento agotó la espera al cambiar al lobby. Evidencia local en `android/generated/github-upload-20261030/`. Revisión de 985 archivos candidatos, sin credenciales detectadas ni rutas prohibidas. Esta subida no inicia18 ni reemplaza la aceptación física pendiente del menú24.

## Sincronización de GitHub con Android — 21/10/2026

<a id="android-sync-github-2026-10-21"></a>

**Alcance cerrado:** integrar las mejoras de GitHub en esta carpeta conservando el desarrollo Android. No se ejecutó ni cerró ANDROID-17. Base local original `f873a36`; GitHub `origin/master` en `38002ae` (73 commits posteriores, incluido PR #141).

**Respaldo anterior a la integración:** rama local `backup/android-antes-sync-20261021`, commit `a98f3c7`, con las fuentes Android y la documentación que estaban sin guardar en Git. Copia adicional de 364 archivos y manifiesto de hashes en `android/generated/github-sync-20261021/`. No borrar esa rama ni copiar sus archivos encima de la integración para retomar. Las carpetas locales `.task-work/` y `.pnpm-store/` se conservaron fuera del commit.

**Resultado:** fuentes de web y Android integradas en `master` local. Se mantiene Next.js15.5.28 y se incorporan las dependencias nuevas, Node24.22.1 y las mejoras remotas: invitaciones por enlace, Chat/Amigos, globos en mesa, nombres de bots, carga del lobby, recuperación de reparto/turnos/envido y capturas privadas. La app reconoce `/invitar/`, conserva el destino al ingresar y comparte enlaces con el dominio público. Historia online conserva la integración de vidas según la bandera del servidor; no se activaron vidas ni anuncios. Historia sin conexión, SQLite, retorno de sesión, convivencia, notificaciones y pantallas Android se preservan. El catálogo y las reglas SQL siguen sus fuentes existentes; no se agregó ni aplicó una migración por esta sincronización.

**Verificado localmente:** compilación Next de producción, tipos, ESLint sin errores (seis advertencias previas), interfaz empaquetada, `cap sync android` y `gradle assembleDebug --offline` aprobados. APK de prueba en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, sin instalar. 27 programas de comprobación aprobados: recuperación, envido, invitaciones, presencia, lista de RPC permitidas, chat/rendimiento en navegador; ingreso e invitación dentro de la app, 1v1/parejas y perfil en navegador; reglas aisladas de 1v1/parejas/Historia/torneos/comunidad/seguridad/push y campaña/sincronización sin conexión. El ensayo del motor offline cubrió 29.871 transiciones y 222 partidas de los 66 rivales. Registros en la carpeta de respaldo, archivos `checks-*.json` y `*.log`.

**Límites:** las pruebas SQL usaron bases PGlite descartables; no se ejecutó la reconstrucción completa del CI de PostgreSQL ni pruebas nuevas contra producción. No hubo push, PR, despliegue, cambios en Supabase/Firebase, instalación en emulador/teléfono ni cambios de firma. El APK debug confirma empaquetado; no reemplaza la aceptación física ni los APK/AAB firmados de16. El reloj 1v1 de la web parte del servidor; la app conserva una referencia inicial del teléfono y después mide tiempo transcurrido, por lo que el desfase inicial del reloj del dispositivo queda para la aceptación de17.

**Continuidad:** 01–16 cerradas, 17 pendiente. Leer el traspaso16 junto con esta entrada; preparar un candidato actualizado y comprobar sus servicios HTTPS, compatibilidad entre versiones y guardados antes de la aceptación integral de17. Los archivos locales ya contienen la integración; no volver a traer los cambios mediante reemplazo de carpetas.

## Guía de lectura

- [Plan vigente y tabla de veinte etapas](#android-etapas-finales).
- [Traspasos y evidencia de las etapas cerradas](#android-traspasos): la última entrada define el punto de continuidad.
- [Decisión de Capacitor](#capacitor): diagnóstico y alcance aceptado; su estado inicial es histórico.
- [Historia sin internet y sincronización](#historia-sin-internet): decisiones, evolución web y pruebas; la adaptación nativa vigente está en 04 y 06.
- [Construcción del prototipo TWA](#construir-android): referencia anterior, separada de Capacitor.
- [Preparación y traslado de PC](#estado-pc): historial del entorno; el inventario de ANDROID-01 y el último traspaso reemplazan sus pendientes antiguos.

Las rutas de código escritas entre comillas o como código parten de la raíz del repositorio. Actualizar aquí estado, decisiones, pruebas y traspasos Android. Consultar los registros antiguos únicamente para la evidencia correspondiente; no volver a ejecutar pendientes ya resueltos.

<a id="android"></a>

## Android, Google Play e Historia sin internet

Hay un APK TWA de referencia y un primer APK Capacitor instalados por separado. El lanzamiento incluye Historia completa sin conexión, preparación inicial online, sincronización de progreso y premios, cuenta obligatoria Android y notificaciones. Mapa, motor, guardado y sincronización ya se ensayaron en Chrome Android contra Supabase, con las dos migraciones aplicadas. El dueño aceptó avanzar con **Capacitor** para una app con interfaz empaquetada e independiente de la aplicación Chrome en Android modernos. El 12/10, ANDROID-02 comprobó el arranque local instalado sin Chrome ni red; acceso y juego todavía corresponden a las siguientes etapas. El siguiente capítulo contiene la retoma vigente; las entregas TWA posteriores se conservan como historial. No se publicaron estos cambios.

**Lectura vigente:** el resumen anterior conserva el contexto del 12/10. El estado del 14/10 y los traspasos del plan siguiente definen qué está cerrado y qué falta.

<a id="android-etapas-finales"></a>

### Android final: etapas para trabajar en sesiones distintas — 11/10/2026

**Pedido del dueño:** poder iniciar una sesión diciendo «Estamos en la etapa X, empezá a llevarla a cabo», sin reconstruir el plan ni repetir lo realizado. Este es el **plan vigente de ejecución Android**. El capítulo [Capacitor](#capacitor) conserva el diagnóstico y las decisiones técnicas de partida; las antiguas etiquetas PR 1–7 y las etapas de torneos no son estos números.

**Estado al crear este plan:** análisis y documentación terminados; **ANDROID-01 a ANDROID-20 pendientes**. No se comenzó una implementación nueva ni se verificó nuevamente producción. Las pruebas de Historia existentes son base aprovechable, pero no cierran automáticamente una etapa de Capacitor.

**Estado vigente, 16/10/2026:** ANDROID-01 a ANDROID-16 cerradas; 17–20 pendientes. Candidato firmado preparado, con pasos de servicios HTTPS identificados para resolver antes de su aceptación. Sin publicación ni comienzo de17. Leer el último traspaso antes de continuar.

**Qué significa versión final:** misma experiencia de juego y diseño que la página, cuentas y partidas compartidas con la web, 1v1/2vs2/torneos, Historia de 66 rivales preparada con internet y después recuperable sin red, sincronización sin premios duplicados, funciones sociales y personalización existentes, acceso completo, notificaciones y obligaciones de privacidad/convivencia. La tienda conserva monedas ficticias; no se agregan cobros, anuncios, suscripciones, iOS ni nuevas modalidades. Las adaptaciones de Android incluyen teclado, Atrás, permisos y barras del sistema; no autorizan otro diseño ni quitar funciones para facilitar el empaquetado.

#### Cómo iniciar y cerrar una sesión

1. Leer `AGENTS.md`, el estado actual, este capítulo, la etapa solicitada y el último [traspaso Android](#android-traspasos). «Etapa X» en el contexto de esta entrega significa **ANDROID-XX**.
2. Comprobar sus dependencias y archivos reales, incluidos cambios locales. Si una previa tiene un pendiente necesario, resolverlo y registrarlo antes de continuar. Si ya está cerrada, conservar sus decisiones y hacer sólo la regresión que el cambio actual justifique.
3. Al comenzar, indicar en español simple el objetivo, los límites y cómo se comprobará el cierre. Implementar la etapa solicitada; no absorber silenciosamente las siguientes ni detenerse por una elección técnica que pueda resolverse con la evidencia existente.
4. Usar cuentas de prueba y separar pruebas locales, emulador, teléfono, servidor real y Play. Cada resultado debe decir cuál de esos entornos cubre. Un build no acredita instalación; una respuesta del proveedor push no acredita recepción.
5. Al terminar, actualizar la fila de estado y el traspaso **en docs/android.md**. Usar `Pendiente`, `En curso`, `Preparada; falta paso externo` o `Cerrada`. Sólo cerrar cuando se cumplan sus criterios; si falta teléfono, acceso personal, SQL o aprobación de Google, dejar exactamente ese pendiente y el trabajo técnico terminado.
6. **Regla expresa del dueño, 14/10/2026, vigente hasta ANDROID-20:** cada sesión se dedica exclusivamente a una etapa y continúa hasta completarla y verificar el cierre. No terminar por iniciativa del agente con pendientes ni pasarlos a otra sesión. Coordinar aquí mismo accesos personales, preguntas, aprobaciones y esperas, y seguir trabajando; no empezar la etapa siguiente. Sólo el dueño puede pedir interrumpir o cambiar este alcance.
7. Recién al completar la etapa asignada, enviar la respuesta final y un texto breve para iniciar la etapa siguiente: estado alcanzado, próxima etapa, lectura de `AGENTS.md` y del último traspaso de docs/android.md, y primer paso concreto. Actualizar también la frase de ejemplo de abajo. Si el dueño pide interrumpir antes del cierre, registrar qué falta y el mismo número a continuar. Este requisito no se aplica fuera de ANDROID-01 a ANDROID-20 salvo pedido explícito del dueño.

El pedido actual autoriza **este análisis y su documentación**. Cuando el dueño pida ejecutar una etapa, trabajar dentro del alcance descrito. El agente prepara los cambios y pruebas; el dueño realiza accesos personales, pago/verificación y los pasos de panel que no estén disponibles al agente, con instrucciones concretas. La publicación pública pertenece a ANDROID-20. No contactar jugadores, enviar campañas ni invitar testers por herramientas sin instrucciones del dueño.

#### Análisis del trabajo que falta

| Área | Evidencia revisada | Necesidad para la versión final |
| --- | --- | --- |
| Empaquetado | `apps/mobile/` y primer APK Capacitor creados/probados en 02; `android/` y su workflow TWA conservados. WebView 133 verificado en 01/02. | Ampliar las pantallas empaquetadas en las etapas siguientes y preparar la entrega firmada en 16. |
| Sesiones y servicios | Login usa email/Supabase o `/api/login-usuario`; este último inicia sesión dejando cookies. Historia y eliminación usan cliente servidor. | Sesión propia de la app y transporte autenticado para servicios remotos, sin filtrar emails ni llaves privadas. Definir orígenes/destinos y CORS cuando corresponda. Mantener cookies y callbacks web. |
| Recuperación y Google | Hay botón Google y callback web; la revisión de las rutas de acceso no encontró un recorrido completo de recuperación de contraseña. | Alta/confirmación, ingreso, recuperación, retorno OAuth y enlaces instalados con cuenta existente, en frío y en caliente. Confirmar cada recorrido real; una cuenta Google no necesita inventar contraseña. |
| Juego y campaña | SQL online, mesa/mapa compartidos y motor offline probados; exportación y sincronización aplicadas y ensayadas. | Portar consultas/controladores y almacenamiento al entorno nativo. Repetir pruebas relevantes de privacidad, durabilidad, premios, versiones y mezcla web/app en Capacitor. |
| Pantallas | Perfil/ranking/torneos tienen páginas servidor; tienda y otras pantallas usan navegación Next, recursos y cliente web. | Inventario completo y adaptación de todas las funciones accesibles según el rol. Reutilizar la presentación y conservar estados/validaciones del servidor. |
| Contenido de usuarios | Chat global, chat de mesa, nombres, avatares, reseñas e imágenes; silenciar chat y límites de envío. La búsqueda no encontró un sistema dedicado de denuncias/bloqueos. | Comprobar de nuevo antes de implementar y completar denuncia, bloqueo y resolución por administración. Silenciar una mesa y publicar un correo de soporte no cierran por sí solos este trabajo. |
| Notificaciones | Existe prueba Web Push; no integración Capacitor/FCM ni suscripciones productivas por dispositivo. | Registro/baja de dispositivos, entrega real, eventos acordados, preferencias y enlaces, sin duplicados o avisos de la cuenta anterior. |
| Datos y eliminación | Páginas de privacidad/términos y eliminación implementadas; analítica propia, Vercel, uploads y servicios externos existentes. | Declaración basada en el APK final y sus proveedores; nuevos datos de push/denuncias/guardado; borrado remoto/local y regresión de cuentas Google. |
| Entrega | Hay CI web/SQL y workflow TWA con Node 20/JDK 17; todavía no hay paquete Capacitor release. | Validaciones propias de app, dependencias fijadas, firma, versiones, paquete final, reglas de actualización y artefactos reproducibles. Backend sigue sin despliegue SQL automático. |
| Google Play | Cuenta, paquete final, soporte, edades y eventos push pendientes. | Alta/verificación, ficha, formularios, acceso del revisor, prueba distribuida por Play y proceso de producción. Las esperas externas deben tener responsables y condiciones de cierre. |

**Requisitos comprobados el 11/10/2026:** para nuevas apps de teléfonos, Google exige objetivo **Android 16/API 36** desde el 31/08/2026; volver a verificar al producir el artefacto. El mínimo de Android compatible es otra decisión y no se deduce del objetivo. [Requisito oficial de API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

Android requiere revisar compatibilidad con páginas de memoria de **16 KB**, incluyendo las bibliotecas que agreguen los plugins. Si todo el paquete es Java/Kotlin sin bibliotecas nativas C/C++, la documentación indica que ya soporta ese tamaño, aunque recomienda probarlo. Inspeccionar el artefacto real; no agregar trabajo NDK si no contiene esas bibliotecas. Android 16 también cambia las barras y el manejo de Atrás, por lo que el emulador Android 11 no cubre toda la aceptación. [Compatibilidad 16 KB](https://developer.android.com/guide/practices/page-sizes), [cambios Android 16](https://developer.android.com/about/versions/16/behavior-changes-16).

Google exige moderación adecuada al contenido aportado por usuarios, con mecanismos dentro de la app para reportar y bloquear según sus interacciones. La aplicación comparte ese contenido con la web, así que implementar la protección en el servidor y su acceso en ambas interfaces. La declaración de datos también incluye los SDK/proveedores utilizados; los textos actuales deben contrastarse con el comportamiento final. [Contenido de usuarios](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Para cuentas personales nuevas, Google exige actualmente al menos **12 testers adheridos de forma continua durante 14 días** en prueba cerrada antes de solicitar acceso a producción. No equivale a aprobación automática: importa la prueba realizada y Google puede pedir más trabajo. El alta de Play tiene una tarifa única publicada de **US$25** y verificaciones de identidad/contacto y, para nuevas cuentas personales, acceso a un Android mediante la app de Play Console. Confirmar condiciones y cargos al hacer el alta; el dueño la realiza con su titularidad real. [Prueba cerrada](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [alta de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).

La verificación de desarrollador/registro de paquetes Android comenzó su aplicación regional el 30/09/2026 en Brasil, Indonesia, Singapur y Tailandia. Para distribución por Play, revisar el estado que muestra **Play Console** para la cuenta y el paquete; no crear otra consola por rutina. La intención de distribución mundial exige comprobar ese estado y los mercados realmente habilitados. [Verificación Android](https://developer.android.com/developer-verification/guides).

#### Inventario que debe quedar cubierto

| Conjunto de pantallas/acciones | Etapas responsables |
| --- | --- |
| Arranque, ingreso por email/usuario, alta, Google, confirmación, recuperación y salida | 02, 03 y 07 |
| Lobby, crear/unirse a mesa, mesa privada, invitaciones, 1v1 con personas/bots, resultado y revancha | 03 y 05 |
| Historia online/offline, descarga, 15 provincias/66 rivales, requisitos, puntos, estilo, premios y revanchas | 04, 06 y 08 |
| Parejas: todas las composiciones permitidas, mesa completa, chat/frases, resultado y recuperación | 09 |
| Torneos: central, inscripción/equipo, espera, check-in, avisos, grupos/llaves, partida, espectador y premios | 10 |
| Perfil, avatar, historial, estadísticas, medallas, ranking, misiones/cofres y tienda/equipamiento | 08 |
| Comunidad, chat global, amigos, grupos, invitaciones, reseña/soporte e imágenes | 11 y 12 |
| Administración permitida por rol, incluida gestión de torneos, personas, comunidad y correos | 10–12; conservar controles de acceso y evitar envíos reales de campaña en las pruebas |
| Ayuda/reglas, acerca de, contacto, privacidad, términos, preferencias y eliminación | 07, 11 y 15; mismo contenido accesible desde la app |
| Notificaciones, enlaces, Atrás, teclado, audio, suspensión, red, accesibilidad y actualizaciones | 07, 13, 14, 16–18 |

ANDROID-01 convierte este inventario en una lista de rutas y acciones reales. Si encuentra otra función accesible de la web, asignarla a la etapa correspondiente y anotarla; no excluirla silenciosamente. Las páginas públicas pueden conservar su servidor como fuente, pero las pantallas de juego/usuario deben quedar dentro de la app. Un enlace externo de identificación o soporte se identifica como tal.

#### Mapa de etapas y estado

| Etapa | Entrega al cerrar | Dependencia | Estado |
| --- | --- | --- | --- |
| [ANDROID-01](#android-etapa-01) | Inventario, entorno y punto de partida comprobados | Estado actual | Cerrada (12/10/2026) |
| [ANDROID-02](#android-etapa-02) | Primer APK Capacitor local que abre desde su ícono | 01 | Cerrada (12/10/2026) |
| [ANDROID-03](#android-etapa-03) | Cuenta existente, sesión propia, servicios y lobby reales | 02 | Cerrada (13/10/2026) |
| [ANDROID-04](#android-etapa-04) | Tobías instalado, descarga y cierre/retoma sin red | 03 | Cerrada (13/10/2026) |
| [ANDROID-05](#android-etapa-05) | 1v1 online compartido con la web | 03 y 04 | Cerrada (13/10/2026) |
| [ANDROID-06](#android-etapa-06) | Premios, sincronización y guardados versionados comprobados | 04 y 05 | Cerrada (14/10/2026) |
| [ANDROID-07](#android-etapa-07) | Google, alta, recuperación y enlaces de acceso completos | 06 | Cerrada (14/10/2026) |
| [ANDROID-08](#android-etapa-08) | Perfil, economía, progreso, ranking y personalización completos | 07 | Cerrada (15/10/2026) |
| [ANDROID-09](#android-etapa-09) | Parejas completas y compatibles con jugadores web | 08 | Cerrada (15/10/2026) |
| [ANDROID-10](#android-etapa-10) | Torneos y espectadores completos | 09 | Cerrada (15/10/2026) |
| [ANDROID-11](#android-etapa-11) | Comunidad, funciones sociales, soporte y resto de rutas | 10 | Cerrada |
| [ANDROID-12](#android-etapa-12) | Denuncias, bloqueos y administración de convivencia | 11 | Cerrada |
| [ANDROID-13](#android-etapa-13) | Push nativa con eventos y recepción real | 12 | Cerrada (15/10/2026) |
| [ANDROID-14](#android-etapa-14) | Comportamiento Android y presentación pulidos | 13 | Cerrada el 16/10; límites aceptados, medición física acordada para 17 |
| [ANDROID-15](#android-etapa-15) | Privacidad, borrado y revisión de seguridad/contenido cerrados | 14 | Cerrada |
| [ANDROID-16](#android-etapa-16) | Candidato de entrega firmado y reproducible | 15 y decisiones finales | Cerrada (16/10/2026) |
| [ANDROID-17](#android-etapa-17) | Candidato completo probado, incluido teléfono físico | 16 | Cerrada (27/10/2026) |
| [ANDROID-18](#android-etapa-18) | Ficha y canal interno Play con instalación real | 17; alta puede prepararse antes | Pendiente |
| [ANDROID-19](#android-etapa-19) | Prueba cerrada y acceso a producción resueltos | 18 | Pendiente |
| [ANDROID-20](#android-etapa-20) | Publicación acordada, instalación pública y entrega final | 19 y pedido de publicación | Pendiente |

**Hitos:** al cerrar 06 hay una primera prueba instalada con juego online, Historia y premios reales. Al cerrar 17 hay un **candidato final entregable** firmado y probado, con sus límites documentados. Al cerrar 18 está probado además con la firma/distribución de Play. Al cerrar 20 hay una publicación real; la aprobación y los tiempos de Google son externos.

<details>
<summary>Ver alcance exacto, inicio y cierre de las 20 etapas</summary>

<a id="android-etapa-01"></a>

#### ANDROID-01 — Inventario y entorno de trabajo

**Empieza con:** este plan y el checkout local actual. No necesita una cuenta de Play ni iniciar una sesión administradora de Trucazo.

**Trabajo:** revisar cambios locales, versiones, scripts, generación de recursos y evidencia de Historia; registrar qué está implementado, aplicado en Supabase, probado y todavía sólo local. Completar el inventario de rutas/acciones y su etapa responsable. Comprobar Node, JDK, SDK/Gradle requeridos por la versión Capacitor seleccionada; actualizar/verificar el proveedor WebView oficial del emulador conservando datos. Identificar visor, procesos/puentes activos y cómo iniciarlos/cerrarlos sin atajos que interfieran al escribir. Planificar un segundo entorno Android moderno para pruebas de API 36 sin exigir ejecutar dos emuladores simultáneos.

**Verificación y final:** herramientas compatibles comprobadas; WebView efectivo apto para la interfaz; emulador/visor utilizables; compilación/validaciones de base pertinentes registradas y diferencias preexistentes identificadas. Inventario completo con responsables, cuentas de prueba disponibles y necesidades de teléfono/segundo dispositivo anotadas. No dejar una incompatibilidad del entorno oculta para 02.

**Entrega a 02:** versiones elegidas, comandos de preparación, ubicación de herramientas, estado de datos y decisiones/propuestas de estructura e identificador provisional. En esta etapa se prepara el entorno; la creación del proyecto Capacitor pertenece a 02.

<a id="android-01-inventario"></a>

##### Inventario comprobado — 12/10/2026

Revisión del checkout `master`, HEAD `2ecd674eaeee0f797a854db544c1a1e02c489f7d`, con los cambios locales anteriores conservados. Se encontraron **40 páginas y 20 manejadores de rutas** (`route.ts`/`route.tsx`), además de manifest, sitemap, robots y archivos públicos. Las filas siguientes cubren todas esas rutas; los números corresponden a ANDROID-XX. Este inventario describe la web existente y asigna su adaptación; no afirma que esas pantallas ya estén dentro de Capacitor.

| Ruta o superficie real | Acciones/datos que se deben conservar | Responsable |
| --- | --- | --- |
| `/` | Portada, ingreso/alta/Google, enlaces a guías; invitado e instalación PWA siguen disponibles en la web. Entrada instalada con cuenta obligatoria. | 02, 03, 07 |
| `/login`, `/api/login-usuario` | Email o nombre de usuario y contraseña, error genérico, sesión, regreso al destino. La API de usuario deja cookies; falta adaptar sesión propia sin devolver emails. | 03, 07 |
| `/register`, `/auth/callback` | Nombre disponible, alta, confirmación de correo, Google, canje del código y destinos permitidos. Recuperación de contraseña completa todavía no encontrada en el código. | 07 |
| `/lobby` | Perfil/saldo, mesas abiertas, crear/unirse, código privado, CPU, 15/30, apuesta ficticia, mesa activa, invitaciones, salida, bono, acceso a Historia/torneos/misiones. `LobbyClient.tsx`, RPC `create_table`, `join_table`, `join_table_by_code`, `claim_bonus`. | 03; mesas 05/09; economía 08; social 11 |
| `/game/[id]` | Espera/cancelación, mano privada, carta, envido/declaración/truco/mazo, abandono, tiempo/presencia, bot, frases/chat, resultado, revancha y reseña. `GameClient.tsx`, `GameTable.tsx`, `FinishScreen.tsx`; RPC y Realtime existentes. | 05; chat 11/12; Android 14 |
| `/historia`, `/android/historia/index.html` | Mapa/provincias/rivales, requisitos, fama/estilo/ranking, duelo online, preparación, guardado por cuenta, pendientes, premios, sincronización y revancha. `HistoriaScreen.tsx`, `HistoriaClient.tsx`, `src/offline-campaign/`. | 04, 06, 08 |
| `/android`, `/api/android/historia` | Entrada y descarga/sincronización del ensayo actual. API GET/POST con cookies, cuenta registrada, catálogo/hash, avatar y validador SQL. Reutilizar contrato y reglas; adaptar transporte/origen, worker y entrada. | 03, 04, 06 |
| `/android/tobias.html`, `/api/android/tobias`, `/api/android/probe` | Ensayos anteriores de motor/descarga y diagnóstico guardado/Web Push con acceso restringido. Conservar como herramientas; no usar el diagnóstico como menú final. | 02–06; referencia push 13 |
| `/game/parejas/[id]`, panel `TeamTables` en lobby | Código, sentarse/cambiar asiento, añadir/quitar CPU según permiso, comenzar, dejar espera, snapshot/mano, acciones/frases/chat, presencia, abandono y resultado. `TeamGameClient.tsx`, `TeamWaitingRoom.tsx`, RPC `team_*`. | 09; convivencia 11/12 |
| `/torneos` | Central, filtros/listado, estados, acceso desde lobby, avisos y lectura de notificaciones. `TournamentsHub.tsx`, `TournamentLobbyAccess`, `TournamentNotifications`. | 10; push 13 |
| `/torneos/[id]` | Inscripción individual/pareja, invitar/aceptar/rechazar compañero, retiro, espera/check-in, horarios, grupos/llaves, entrar al cruce, premios. `TournamentDetail.tsx`, `Competition.tsx`, `src/lib/tournaments.ts`. | 10 |
| `/torneos/[id]/partidas/[matchId]` | Espectador con snapshot permitido, actualización y regreso al torneo; no mostrar manos privadas. `SpectatorClient.tsx`. | 10 |
| `/profile` | Avatar y upload, saldo, estadísticas, últimas 20 partidas, vitrina/equipamiento de medallas, acceso a eliminación. `AvatarUploader`, `MedalsShowcase`, `profiles`, `game_history`, RPC `player_medals`/`set_active_medal`. | 08; selector de imágenes 14; borrado 15 |
| `/ranking` | Clasificación online, posición propia, nombres/avatares/medallas; ranking de Historia dentro del mapa con `get_campaign_ranking`. | 08 |
| `/tienda` | Catálogos/propiedad de salones, marcos y accesorios; comprar con monedas ficticias, equipar/quitar y conservar saldo oficial. RPC `buy_*`/`set_active_*`. | 08 |
| Misiones/cofres, paneles en lobby y resultado | Objetivos diarios/semanales/racha, progreso, premio y reclamo único: `src/components/objectives/`, `get_my_objectives`, `claim_objective_reward`. No hay página separada. | 08 |
| `/comunidad` — Chat | Lista/envío de mensajes globales, presencia, actualización y límites; administrador puede borrar mensaje o limpiar chat. `ChatGlobal`, `send_chat_message`, `delete_chat_message`, `clear_chat`. | 11, 12 |
| `/comunidad` — Amigos e invitaciones | Buscar por usuario, solicitar/aceptar/rechazar/eliminar amistad, invitar/cancelar/responder invitación de juego; avisos también en lobby. `FriendsPanel`, `src/lib/useCommunity.ts`. | 11, 12; destino de enlace 07 |
| `/comunidad` — Grupo | Crear, invitar/responder, ver miembros, salir; expulsar/eliminar según rol. `GroupPanel`, RPC existentes de comunidad. No hay ruta `/grupos` separada. | 11, 12 |
| `/comunidad` — Novedades | Leer publicaciones; publicar/borrar con rol administrador. `NewsPanel`, tabla `news`, `publish_news`, `delete_news`. | 11, 12 |
| `/resena` | Calificar, comentario, hasta tres imágenes, envío y regreso a partida/lobby (`?game=...`). Storage privado `feedback-images`, `submit_feedback`, envío a Web3Forms existente. | 11, 12, 15 |
| `/admin`, `/admin/persona/[id]` | Estadísticas por período, personas, ficha/historial/reseñas e imágenes según permisos. `Tablero`, `Personas`, `Ficha`, RPC `admin_stats`/`admin_player`. | 11, 12 |
| `/admin/analytics` | Panel de mediciones/filtros con autorización administrativa; analítica de juego y ruta `/api/analytics` permanecen en servidor. | 11, 15 |
| `/admin/torneos`, `/admin/torneos/nuevo`, `/admin/torneos/[id]` | Crear/editar/publicar/reprogramar/cancelar/borrar, comenzar/pausar/reanudar, reemplazar/descalificar, reintentar cruce/aviso y monitor. API `tournament_admin_*`; conservar permisos y no enviar avisos reales por rutina de prueba. | 10 |
| `/admin/emails`, `/api/admin/email-campaigns`, `/api/admin/news-campaign`, `/api/admin/ranking-campaign` | Listar/crear/editar/activar/pausar campañas y configuración de novedades/ranking. Sigue siendo administración autorizada; no activar campañas durante pruebas Android. | 11; datos/proveedores 15 |
| `/email/preferencias`, `/api/email/preferences` | Enlace desde correo con token, preferencias de novedades/retorno/ranking/torneos, guardar o baja total. Conserva validación en servidor; regreso/enlace accesible desde app. | 07, 11, 15 |
| `/eliminar-cuenta`, `/api/account/delete`, `/api/account/cleanup` | Reautenticación por contraseña o Google, confirmación, eliminación y limpieza diferida. PR #101 integrado: reutilizar. Revisar además borrado del nuevo guardado IndexedDB y tokens nativos; el formulario actual limpia Storage/cachés pero no borra esa base. No ejecutar borrado de testin como prueba de inventario. | 07, 15 |
| `/calculadora-envido` | Selector de tres cartas y tanto calculado; herramienta interactiva existente que también debe quedar accesible. | 11 |
| `/como-se-juega-al-truco`, `/orden-cartas-truco`, `/envido-real-envido-falta-envido`, `/pardas-truco-reglas` | Guías, orden y reglas de cantos/pardas, enlaces cruzados; conservar contenido del servidor y navegación/regreso. | 11 |
| `/truco-dos-jugadores`, `/truco-en-parejas`, `/truco-contra-computadora`, `/jugar-truco-con-amigos`, `/jugar-truco-sin-registrarse`, `/modo-historia-truco` | Páginas explicativas públicas y enlaces a jugar; el acceso sin registro se conserva en la web y se adapta a cuenta obligatoria al entrar desde app. | 07, 11 |
| `/acerca-de-trucazo`, `/contacto`, `/privacidad`, `/terminos` | Información, GitHub Issues y correo externo, privacidad/términos accesibles. Soporte atendido y edades siguen sin confirmar; revisar textos/proveedores del APK final. | 11, 15 |
| `/api/notify-mesa` | Aviso de mesa actual mediante reclamación SQL y Telegram del servidor. Mantener permisos; no exponer credenciales ni efectuar envíos de prueba en esta etapa. | 05; revisión 15 |
| `/api/email/cron`, `/api/email/news`, `/api/email/ranking`, `/api/email/tournament` | Trabajos de envío, autenticación interna, reintentos/preferencias. Son servicios del servidor, no pantallas ni APIs para llamar desde el APK. | 10/11; revisión 15 |
| `/llms.txt`, `/og`, sitemap, robots, manifest, `/.well-known/assetlinks.json`, `/offline.html`, `sw.js` | Publicación web/SEO, imágenes al compartir, asociación Android y recuperación PWA. Conservar; la app usa recursos locales y enlaces verificados. El worker web no reemplaza almacenamiento/push nativos. | enlaces 07; recursos 02; entrega 16 |
| Sonido, instalación, sesión y mediciones transversales | `sounds.ts`, `AppRuntime`, `AndroidSessionGuard`, `GuestSessionGuard`, `AnalyticsTracker`, `RegisterSW`, Vercel Analytics/Speed Insights. Adaptar sólo lo necesario y comprobar privacidad; no montar automáticamente todo el layout servidor dentro del APK. | 02/03, 13/14/15 |

**Diferencias identificadas, con responsable:** no se encontró recuperación de contraseña completa (07), denuncia/bloqueo dedicado (12) ni FCM/registro de dispositivos nativos (13). La limpieza de eliminación debe incorporar el guardado de Historia y los datos nuevos (15). El selector/upload de avatares y las imágenes de reseñas necesitan prueba con permisos/teclado Android (14/15). La calculadora, las preferencias por enlace y la administración de correos quedan incluidas explícitamente; no se descartan por ser rutas menos visibles. Los enlaces Google, correo y GitHub son externos y deben indicarse como tales. Son pendientes de las etapas correspondientes, no nuevos cambios implementados en 01.

##### Entorno elegido y continuidad de datos — 12/10/2026

- **WebView resuelto:** Android 11 pasó de `com.google.android.webview` **83.0.4103.106** a **133.0.6943.137**, código **694313738**, extraído junto con Trichrome de la imagen Google Play oficial API 36 r07. Ambos requieren Android 10/API 29 y contienen x86_64; la firma de WebView coincide con la del proveedor 83 preinstalado (`6faf3c4140407473400934d117815a21af1cfefc5c0bee61c858bc3d72ba6fe5`). La firma de Trichrome (`b6198a8d5689b62b96a0aa3829ce2cc67d59497f78c469f8792b2cd9255490a1`) coincide con el certificado exigido en el manifest del WebView 133. `apksigner verify` aprobó ambos y las instalaciones `adb install -r` terminaron en Success. SHA-256 de APKs: WebView `f369ca9e7dabe828e2c3a1419d4e1bc165bf75ea98093f8e790e1949818409ce`, Trichrome `2a58eda6dd7239f1fcff7efeb8835f973d52539c237fc5c65aacfa833259069d`. Archivos en `android/generated/environment/webview/`, fuera de Git.
- **Proveedor efectivo y prueba:** `dumpsys webviewupdate` confirmó WebView 133 válido/habilitado, con **2 de 2 relros terminados**. Se abrió la entrada de Historia en `org.chromium.webview_shell`, herramienta nativa ya instalada, sin cuenta ni descarga. La captura y el protocolo de diagnóstico directo comprobaron interfaz visible, `100dvh` igual a la altura disponible (**495 px**), `structuredClone`, ResizeObserver, Web Crypto y escritura/lectura confirmada en una base IndexedDB de prueba que se eliminó al finalizar. Esa prueba de entorno no acredita durabilidad tras cierres ni campaña autenticada dentro de Capacitor (04). Playwright no pudo conectar a WebView por una función de gestión de contexto no soportada; se usó el protocolo directo de la página, sin modificar WebView. [Requisitos del proveedor](https://chromium.googlesource.com/chromium/src/+/main/android_webview/docs/webview-providers.md).
- **Capacitor seleccionado: `8.5.3`** para `@capacitor/core`, `@capacitor/cli` y `@capacitor/android`, contrastados en el registro oficial npm y sus fuentes. Node existente **24.16.0**, npm **11.13.0**, compatibles con Node 22+. Instalar con versiones exactas y lockfile en **02**; no se instalaron estos paquetes en 01.
- **Java separado:** Temurin JDK **21.0.12.1+1**, incluido `javac`, en `android/generated/environment/jdk-21.0.12.1+1`. El código Android de Capacitor 8.5.3 compila como Java 21; el mínimo Java 17 del plugin de construcción no basta para ese código. **Gradle 8.14.3** descargado y ejecutado con ese JDK; AGP **8.13.0**, SDK Platform **36 revisión 2** y Build Tools **35.0.0** existentes y compatibles. Emulador **37.2.12.0**, command-line tools **20.0**. No se cambió Java 17 ni el iniciador TWA. [Fuente exacta Capacitor](https://github.com/ionic-team/capacitor/blob/8.5.3/android/capacitor/build.gradle), [Gradle del template](https://github.com/ionic-team/capacitor/blob/8.5.3/android-template/gradle/wrapper/gradle-wrapper.properties), [compatibilidad AGP](https://developer.android.com/build/releases/agp-8-13-0-release-notes).
- **Construcción por consola:** SDK/JDK/Gradle están preparados sin requerir un editor gráfico. Android Studio no se encontró instalado; si se necesita abrir el proyecto con él, usar **2025.2.1 o posterior**, según Capacitor. El build real del proyecto nuevo y la descarga de sus dependencias Maven pertenecen a 02. La ejecución `gradle --version` acredita el entorno, no un APK construido.
- **Estructura técnica elegida para 02:** `apps/mobile/`, entrada React/recursos estáticos compilados con esbuild y estilos existentes; proyecto nativo `apps/mobile/android/`. Conservar Next.js para web/servicios y `android/` TWA. Identificador temporal **`ar.com.trucazo.capacitor.dev`**, distinto de `ar.com.trucazo.prototype`; no es el paquete definitivo de Play. Arranque local sin `server.url`, sin exportar toda la web. El mínimo de la primera prueba se fija en **API 29/Android 10** para la independencia de Chrome; el mínimo comercial definitivo queda en 14/16.
- **Datos actuales comprobados de sólo lectura:** Chrome está autenticado en Historia local; guardado preparado, **1.010 monedas, 22 puntos, 0 pendientes y 2 comprobantes**, partida anterior terminada. Cuenta de prueba identificada por el ensayo: **testin**. Conservar IndexedDB `trucazo-historia-local-v1`, cachés, datos del AVD, `.env.local` y certificados privados. Capacitor tendrá otro origen/almacenamiento y requerirá ingreso personal y preparación propia en 03/04; no copiar la sesión o la base de Chrome a ciegas.
- **Estado del código/servidor:** TWA y eliminación integrados en Git según el historial; motor/mapa/mesa/guardado/transporte y pruebas de Historia son cambios locales presentes, varios todavía sin versionar. Las dos migraciones de Historia están aplicadas por confirmación del dueño y ensayo real del **11/10**, no por una nueva aplicación en 01. El paquete local se regeneró idéntico: **147 archivos, 5.961.571 bytes**, digest `8c762ac0d9890e47c6d057fecedc5eaf7b3f680e69f742158bef2deddfbbe678`. No se comprobó despliegue de esos cambios en producción ni se ejecutó SQL remoto.
- **Pruebas futuras con otros equipos:** no hay teléfono físico disponible según la última retoma; conseguir uno para recepción push/suspensión/rendimiento y cierre 17. No se pidió compra. Para interacción usar otra cuenta registrada en una sesión web separada en 05/06/09; sólo testin está identificada como cuenta real disponible. Los usuarios de las pruebas PGlite son ficticios. Segundo AVD **`Trucazo_Android_16`/API 36**, Google Play x86_64 revisión 7, 720×1280, 2 núcleos y 3 GB; ejecutar alternando con Android 11, sin dos emuladores simultáneos. Android 11 no certifica barras/Atrás/permisos de Android 16.

**Regreso comprobado:** Android 16 arrancó completamente (`sys.boot_completed=1`, Android 16) y permitió extraer los paquetes oficiales; después se apagó normalmente. Se volvió a arrancar Android 11, se cerró WebView Shell y se retiró su forward de diagnóstico 9224. Chrome **124** permaneció instalado/habilitado, sin cambiar su versión ni borrar datos: Historia online volvió a abrir autenticada y el guardado repitió exactamente **1.010/22, 0 pendientes, 2 comprobantes, partida terminada**. Reverse 3000 y forward Chrome 9223 restaurados. No se deshabilitó Chrome en 01; la prueba del APK con Chrome deshabilitado corresponde a 02. Evidencia: `android/generated/android-01-data-before.json`, `android-01-data-after.json`, `android-01-webview.json`, `android-01-webview.png` y registros `android-01-*`.

**Preparación reproducible de herramientas locales:** descargas oficiales guardadas fuera de Git en `android/generated/environment/`. JDK zip SHA-256 `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`; Gradle bin SHA-256 `bd71102213493060956ec229d946beee57158dbd89d0e62b91bca0fa2c5f3531`. Se compararon antes de descomprimir. [JDK descargado](https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip), [Gradle descargado](https://services.gradle.org/distributions/gradle-8.14.3-bin.zip). La imagen [Google API 36 r07](https://dl.google.com/android/repository/sys-img/google_apis_playstore/x86_64-36_r07.zip) se contrastó con el manifiesto oficial: SHA-1 `16fa3c441d29fde6c9eea2f766eecf77032d68b4`, SHA-256 local `279c419c2829627e2bb95104f47e6de02ca9d14774506195d5db93d71bd583c8`. La carpeta no viaja con Git: al cambiar de PC volver a descargar/verificar, sin sustituir certificados o datos.

El agente carga el entorno Capacitor en cada terminal desde el proyecto:

```powershell
. ./scripts/android-env.ps1
node --version
java -version
javac -version
gradle --version
& $env:ADB devices -l
& $env:ADB -s emulator-5580 shell dumpsys webviewupdate
```

`scripts/android-env.ps1` cambia sólo esa terminal. Para construir el prototipo TWA se sigue cargando `../trucazo-entorno/entorno-trucazo.ps1` (Java 17). Los downloads, caché de Gradle y registros quedan en la carpeta ignorada existente; no se suben dependencias, claves ni evidencia de cuentas.

**Procesos/puentes al iniciar 01:** Android 11 en `emulator-5580`; servidor local ya activo `node scripts/dev.mjs --hostname 127.0.0.1 --port 3000`, HTTP 200; `adb reverse tcp:3000 tcp:3000` y forward **9223 → `chrome_devtools_remote`**. El visor estaba cerrado: se abrió y comprobó `Responding=True`, con `--shortcut-mod=lsuper --prefer-text --no-clipboard-autosync`, 15 fps, H264/OMX, Direct3D y sin audio del visor. Atajos del visor con tecla Windows; para `@` usar AltGr+Q en teclado latino. El audio del juego deberá probarse aparte en 14. No iniciar otro servidor en 3000 ni matar todos los procesos Node/adb.

Para volver a abrir Android 11 se conserva el acceso **Trucazo Android** de la carpeta proyectos. Cerrar el visor no apaga el teléfono virtual. El agente lo apaga normalmente con `& $env:ADB -s emulator-5580 emu kill`; antes de arrancar Android 16 comprobar que 5580 desapareció de `adb devices`. El segundo usa puerto 5582, `-avd Trucazo_Android_16 -no-window -no-snapshot-load -no-snapshot-save -gpu swiftshader -feature -Vulkan -cores 2 -memory 3072 -vsync-rate 30`; iniciar helpers con `Start-Process -WindowStyle Hidden` y guardar sus salidas en `android/generated/`. No usar `-wipe-data`. Para una prueba offline total retirar reverse; para restaurarlo usar `& $env:ADB -s emulator-5580 reverse tcp:3000 tcp:3000`. Forward CDP es una conexión de diagnóstico, no un enlace de publicación ni autenticación de la app.

##### Validaciones de base — 12/10/2026

| Comprobación ejecutada | Resultado y alcance |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | Aprobado sobre el checkout local. |
| `npm run lint` | Aprobado con **7 avisos preexistentes** de dependencias de efectos React: 6 en `GameClient.tsx` y 1 en `LobbyClient.tsx`; sin modificarlos. |
| `npm run build:offline-campaign` | Aprobado, paquete/hash idénticos al ensayo anterior. Compila la entrada React compartida y recursos. |
| `npm run check:offline-trial` | Aprobado: 29.871 transiciones contrastadas con SQL, 11.996 decisiones, 222 partidas completas, 66 rivales y 160 comprobaciones tácticas. Base local PGlite; no partidas productivas. |
| `npm run check:offline-campaign` | Aprobado: exportación/permisos, 59.940 desbloqueos y 1.650 premios contrastados con SQL; 6 partidas con cola/estilo/dependencias, presentación/ranking y fotos. |
| `npm run check:offline-sync` | Aprobado: 66 rivales reconstruidos, 18 adulteraciones rechazadas, cola de 66/siete lotes, cortes/reenvíos, dos dispositivos simulados, mezcla online/offline, rollback/privacidad/borrado. Son fixtures SQL locales, no aceptación Capacitor ni segundo teléfono real. |
| `npm run check:pwa`, `npm run check:android` | **8 + 4 pruebas aprobadas** de la base PWA/TWA actual. No certifican push nativa ni el nuevo APK. |
| Java/Gradle/SDK y servidor | Java/javac 21 y Gradle 8.14.3 funcionando; Platform 36/Build Tools 35 presentes; servidor existente HTTP 200. Build completo Next/APK nuevo reservado a 02, sin interferir con el servidor abierto. |

El aislamiento de comandos de esta sesión impedía a adb crear su directorio de usuario y a tsx consultar el usuario Windows (`uv_os_get_passwd`, presentado como ENOMEM). Se ejecutaron las comprobaciones necesarias con autorización de herramientas fuera de ese aislamiento y pasaron; no se cambió el juego por esos errores del entorno. Command-line tools 20 emitió un aviso de XML SDK 4 al crear API36, pero creó ambos AVD y se comprobó su listado; registrar el aviso, sin actualizar globalmente por rutina. Changelog Supabase consultado el 12/10: sin implementar cambios de Auth/Data API; revisión de grants/RLS/configuración se retoma cuando 03/15 la necesiten.

<a id="android-etapa-02"></a>

#### ANDROID-02 — Proyecto Capacitor y primer APK local

**Empieza con:** 01 cerrada y sus versiones/comandos. Usar la estructura separada propuesta o documentar un ajuste mínimo justificado antes de implementarlo.

**Trabajo:** crear paquete, lockfile, configuración, entrada React, navegación base y proyecto Android. Incluir fuentes, estilos, ícono y recursos necesarios, reutilizando componentes; adaptar enlaces/imágenes sólo donde lo requiera la entrada local. Fijar comandos para construir la interfaz, sincronizar los recursos nativos y generar/instalar un APK debug provisional. Conservar el proyecto TWA y los datos previos. Incorporar estados claros de inicio/carga/falta de conexión; preparar separaciones entre configuración local y remota.

**Verificación y final:** desde comandos documentados se genera un APK nuevo y se instala; abre desde el ícono Trucazo sin barras de navegador. Con Chrome deshabilitado en el entorno compatible, la interfaz local aparece también sin red; restaurar Chrome después. El arranque no descarga el HTML de la web ni depende de `server.url`. El proyecto web sigue construyendo/abriendo. Comprobar la presentación base contra la página al mismo tamaño.

**Entrega a 03:** rutas iniciales, identificador/firma provisional, archivos fuente y generados, comandos exactos, APK/versión y prueba de arranque. Acceso, mesas y campaña reales siguen a las etapas siguientes.

<a id="android-02-apk"></a>

##### Primer APK Capacitor — entrega comprobada el 12/10/2026

**Estado: Cerrada.** `apps/mobile/` tiene `@capacitor/core`, `@capacitor/android` y `@capacitor/cli` **8.5.3 exactos**, lockfile propio y fuentes Android versionables. Reutiliza React/esbuild/PostCSS/Tailwind del paquete raíz, fijados en su lockfile. El APK abre **`https://localhost/`**, origen interno de Capacitor que sirve los archivos incluidos; no se convirtió Next a exportación estática ni se configuró `server.url`. Se siguieron la [instalación oficial](https://capacitorjs.com/docs/getting-started) y la [configuración de Capacitor](https://capacitorjs.com/docs/config). El servidor web del puerto 3000 permanece separado.

**Presentación y rutas:** `/` y `#/login` muestran el acceso compartido `src/components/LoginScreen.tsx`; `#/register` muestra el aviso de registro pendiente y permite volver. Panel, marca, campos, botones y logo Google son los existentes, con Geist local y los estilos de la web. `src/app/login/page.tsx` conserva su controlador de acceso, invitados, Google, instalación y enlaces; sólo se extrajo la presentación compartida. En el APK, los botones informan que el acceso todavía no está conectado; **no hay sesión, consultas de cuenta ni partidas simuladas**. La carga inicial tiene texto visible y la falta de red un aviso sin animación de entrada. El acceso puede desplazarse en alturas pequeñas, como en la web; se comprobó alcanzar Google y registro. La mesa sin desplazamiento se verifica cuando se integre en 04/05.

**Recursos y configuración:** `scripts/build.ts` genera HTML/JS/CSS/fuente/ícono en `dist/`; `scripts/prepare-native.mjs` deriva íconos y marca de arranque desde `public/icon-512.png`. `cap sync android` copia esos archivos al proyecto nativo. Esas copias, dependencias, cachés, APKs y rutas locales del SDK quedan ignoradas; las fuentes Android, wrapper de Gradle y lockfile se conservan. `src/config.ts` separa el origen remoto HTTPS de la interfaz local; aún no se usa para servicios. Configuración privada Supabase y transporte se resuelven en 03; no se copió `.env.local` al paquete.

**Identidad del artefacto:** paquete **`ar.com.trucazo.capacitor.dev`**, versión **0.1.0**, `versionCode` **1**, mínimo **API29/Android10**, objetivo/compilación **API36**. El mínimo es el de esta prueba, todavía no la decisión comercial final. APK debug **9.952.782 bytes**, SHA-256 **`A281120194E96D1BCD7D033CA013C1FCDCAC8826F20965022B673DC8289B5B00`**. Certificado debug público SHA-256 **`586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`**, verificado con `apksigner`. No es firma de publicación ni se modificó la clave TWA. Archivo de construcción: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`; copia preservada de esta etapa: **`android/artifacts/ANDROID-02/trucazo-capacitor-0.1.0-debug.apk`**. Ambos fuera de Git.

**Comandos del agente desde la raíz, usando el entorno de 01:**

```powershell
. ./scripts/android-env.ps1
# En una copia nueva, instalar también las dependencias raíz con npm ci.
npm --prefix apps/mobile ci
npm --prefix apps/mobile run apk:debug
# apk:debug construye la interfaz, sincroniza y ejecuta Gradle assembleDebug.
& $env:ADB -s emulator-5580 install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
& $env:ADB -s emulator-5580 shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n ar.com.trucazo.capacitor.dev/.MainActivity
$env:PWA_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm --prefix apps/mobile run check
# Con el APK abierto: diagnóstico del WebView debug, separado del Chrome anterior.
$taskAppPid = (& $env:ADB -s emulator-5580 shell pidof ar.com.trucazo.capacitor.dev).Trim()
& $env:ADB -s emulator-5580 forward tcp:9224 localabstract:webview_devtools_remote_$taskAppPid
node apps/mobile/scripts/check-device.mjs
& $env:ADB -s emulator-5580 forward --remove tcp:9224
```

El chequeo de navegador espera la web local abierta en 3000 para comparar estilos y verificar invitados/registro; `MOBILE_WEB_ORIGIN` permite indicar otro servidor de prueba. No volver a ejecutar `cap add android` sobre el proyecto ya creado. Java 21 y Gradle 8.14.3 se seleccionan sólo en esa terminal; `apk:debug` carga también el mismo entorno. La primera construcción descargó las dependencias Maven oficiales y terminó correctamente. Mantener separados desarrollo y build de Next cuando ambos usen `.next/`: en 02 se detuvieron sólo los tres procesos identificados del servidor local, se ejecutó el build y se reinició con los mismos parámetros; no se tocaron los otros procesos Node.

| Comprobación de 02 | Resultado y alcance |
| --- | --- |
| APK debug construido e instalado | Aprobado con JDK21/Gradle8.14.3/AGP8.13/SDK36; instalación `Success` en Android11/API30, `emulator-5580`. |
| Arranque desde ícono con Chrome deshabilitado | Aprobado: cierre forzado sólo del APK nuevo, ícono localizado en el cajón y toque real; actividad `ar.com.trucazo.capacitor.dev/.MainActivity`, WebView133 activo. Sin barras de navegador. |
| Arranque sin red | Aprobado en modo avión, Wi-Fi/datos deshabilitados y reverse 3000 retirado: Android informó `Active default network: none`, la interfaz apareció y sus recursos sólo pertenecieron a `https://localhost`. El forward de diagnóstico no sirve HTML ni conecta servicios. |
| Aviso de conexión y presentación | Corregida la detección inicial agregando el permiso normal `ACCESS_NETWORK_STATE`; sin ese permiso WebView informaba conectado en modo avión. Prueba final `navigator.onLine=false`, aviso visible, fuente/colores correctos. Barras Android oscuras mediante tema y SystemBars integrado de Capacitor8; no se ocultaron controles del sistema. |
| Comparación con web | Aprobada a 360×640: misma fuente Geist, tamaños, colores, bordes, espaciados y ancho de panel/campos; capturas inspeccionadas. APK visible a 360×568 útiles dentro de pantalla360×640; registro alcanzable al desplazar el acceso. |
| Navegación y ausencia de carga remota | Navegación registro/volver, aviso offline y botón sin red aprobados en navegador local; cero peticiones remotas y cero errores JS. Invitado web y enlace de registro comprobados en contexto separado. |
| Regresión web | TypeScript aprobado; lint/build Next completos aprobados con los **7 avisos de hooks preexistentes**. Generación markdown:18 archivos. Paquete Historia raíz conserva digest `8c762ac0d9890e47c6d057fecedc5eaf7b3f680e69f742158bef2deddfbbe678`. |
| APK y dependencias | Firma debug verificada, archivos locales dentro del APK y sin entradas `lib/` C/C++. `npm audit --omit=dev`:0 avisos. Auditoría completa:3 avisos moderados en cadena CLI→xcode→uuid, herramientas de desarrollo/iOS que no entran al APK; conservar versión acordada y revisar antes de16, sin aplicar el downgrade automático que propone npm. |
| Restauración de datos | Chrome124 habilitado de nuevo, modo avión0, Wi-Fi/datos y reverse 3000 restaurados; Historia local autenticada repitió **1.010 monedas, 22 puntos, 0 pendientes, 2 comprobantes,partida terminada**. TWA y AVD conservados. |

**Evidencia privada/local:** `android/generated/android-02-browser.json`, `android-02-base-browser.png`, `android-02-base-web.png`, `android-02-device-offline.json`, `android-02-apk-offline.png`, `android-02-apk-offline-footer.png`, `android-02-offline-launcher.xml`, `android-02-data-before.json`, `android-02-data-after.json`, `android-02-artifact.json`, logs `android-02-apk-build.log` y `android-02-web-build.log`. La prueba instalada cubre Android11/WebView133; API36, teclado/Atrás completo, teléfono físico, acceso y juego siguen en sus etapas. Cero SQL nuevo, despliegue, publicación o envío a terceros.

<a id="android-etapa-03"></a>

#### ANDROID-03 — Cuenta existente, sesión y servicios reales

**Empieza con:** 02 cerrada y la cuenta de prueba existente. El dueño ingresa personalmente cuando haga falta.

**Trabajo:** adaptar acceso por email y por nombre de usuario, sesión persistida y renovación; conservar la privacidad del email del login por usuario. Crear el cliente de la app y el transporte hacia Supabase/API, con validación real de identidad en el servidor. Resolver origen local, direcciones HTTPS, CORS cuando corresponda y los endpoints que hoy dependen de cookies, empezando por preparación de Historia. Reutilizar autorización RPC/RLS. Llevar al lobby las consultas iniciales, presencia y enlaces con el diseño actual; evitar el guard de invitados del entorno web en Android.

**Verificación y final:** ingreso por ambos identificadores, error de credenciales sin revelar usuarios, cierre/arranque con sesión conservada, renovación, logout y cambio A/B comprobados. Perfil/saldo/lobby corresponden a la cuenta autenticada y la API de Historia reconoce esa cuenta. Sin login no se accede a datos privados; APK y logs no contienen llaves privilegiadas. El login web y sus invitados siguen funcionando.

**Entrega a 04:** contrato de sesión/servicios y configuración necesaria, evidencias de autenticación y pasos personales pendientes resueltos. Google, alta y recuperación completa pertenecen a 07.

<a id="android-03-sesion"></a>

##### Sesión y servicios — avance del 12/10/2026

**Estado actual al 13/10: ANDROID-03 cerrada.** Código y APK debug instalados; aceptación con cuentas reales terminada en el entorno local. El dueño configuró la clave privada únicamente en `.env.local` ignorado y entró personalmente por email y usuario. Resolución privada del usuario y errores reales401 uniformes comprobados; la clave no aparece en los 11 archivos de recursos nativos. Perfil/saldo/Historia, persistencia, renovación, logout y cambio testin→santib→testin comprobados en el ensayo siguiente. Chrome conserva su sesión y guardado. ANDROID-04 habilitada; la aceptación del destino HTTPS se repetirá cuando se desplieguen las rutas nuevas dentro del plan. No pedir contraseña o llave por chat.

**Contrato implementado:**

- `apps/mobile/src/services.ts` crea una única instancia Supabase con almacenamiento de sesión propio del WebView, clave **`trucazo:mobile:auth:v1`**, persistencia y renovación del SDK. No se leen/copían cookies o bases de Chrome/TWA. `@capacitor/app` **8.1.2 exacto**, con lockfile, pausa la renovación al suspender y la reactiva al volver; el regreso también pide actualizar el lobby. Logout usa `scope: local`, conservando otras sesiones de la cuenta.
- Email autentica contra Supabase. Usuario llama **`POST /api/android/login`** con `{username,password}`; el servidor reutiliza `get_login_email` sólo con llave privada y autentica con la pública. Después de comprobar contraseña devuelve exclusivamente `{access_token,refresh_token}`; nunca entrega un campo email ni objeto de usuario. Los tokens pertenecen al usuario autenticado y pueden contener sus propias claims. Desconocido/contraseña incorrecta tienen la misma respuesta `401`; falta de configuración es `503`, límite de intentos `429`. El cliente usa `setSession` para conservar y renovar esa sesión. `src/lib/login-username.ts` comparte el controlador; `/api/login-usuario` mantiene su contrato web `{ok:true}` y cookies.
- `apiRequest` envía **`Authorization: Bearer <access_token>`**, sin cookies web. Android utiliza `CapacitorHttp` integrado en core; navegador de pruebas usa fetch sin credenciales. `src/lib/supabase/api.ts` crea el cliente de servidor con la llave pública y ese token; `getUser()` verifica identidad en Supabase y RPC/RLS siguen limitando los datos. Un Authorization presente pero inválido **nunca** cae a una cookie válida. `/api/android/historia` conserva GET/POST y validaciones de catálogo, grant y cola; acepta ahora tokens además de las cookies web existentes.
- Origen interno **`https://localhost`** permitido para CORS, sin comodín ni cookies de terceros; preflight permite GET/POST/OPTIONS y Authorization/Content-Type. Orígenes externos rechazados. Sólo desarrollo admite localhost/127.0.0.1 de pruebas. Respuestas de cuenta/sesión llevan `no-store`. El transporte y el lector de lobby descartan respuestas cuando cambió la cuenta.
- `apps/mobile/src/main.tsx` protege las pantallas con la sesión propia y monta el **mismo `LobbyClient` de la web**, con perfil/saldo, mesas, partida pendiente, medalla, objetivos y cruce de torneo consultados en paralelo después de validar usuario. Los hooks existentes hacen presencia (`touch_online`), comunidad y Realtime; las suscripciones se retiran al desmontar/cambiar cuenta. `navigation.tsx` adapta Link/Image/navegación al hash local; no se carga HTML remoto ni se usa el guard web de invitados. Recursos de lobby/cofre están incluidos. Flags públicos de parejas/torneos consultados en Vercel y copiados a `.env.local`: ambos `true`.
- Las pantallas siguientes muestran un aviso provisional. Los callbacks opcionales en `LobbyClient`/`TeamTables` interceptan crear/unirse/jugar antes de mutar mesas o saldo; la web conserva su comportamiento. El botón temporal «Comprobar conexión» de Historia sólo pide `identity=1`; reemplazar esa presentación en 04. La sesión se conserva sin red y se informa que el lobby necesita conexión; no se cachea un perfil ajeno como saldo real.
- `allowBackup=false` evita la copia habitual de datos del prototipo con sesión. Las reglas completas de almacenamiento/transferencia/restauración Android siguen en 04. El build sólo inserta una lista explícita de variables públicas, rechaza una llave privilegiada como pública y comprueba que la llave privada local, si existe, no aparezca en el bundle.

**Configuración del ensayo:** predeterminado **`https://www.trucazo.com.ar`**. El APK de esta entrega se construyó con **`MOBILE_API_ORIGIN=http://localhost:3000`** y usa `adb reverse tcp:3000 tcp:3000` para los servicios locales; Auth, datos y Realtime siguen conectados al Supabase real por HTTPS. Es una excepción local debug: la configuración Android permite HTTP sólo al dominio localhost y sólo en `src/debug/`. No hay `server.url`. Las rutas nuevas **no se desplegaron**; un APK con el origen predeterminado necesitará que se publiquen esos servicios antes de su aceptación remota. No confundir esta construcción local con un candidato Play independiente del puente adb.

**Artefacto instalado:** `ar.com.trucazo.capacitor.dev`, **0.2.0**, `versionCode` **2**, API mínima29/objetivo36, Android11/API30 con WebView133. APK **10.007.209 bytes**, SHA-256 **`4E62BAA78FC2FC94E478F12173093A3E33237E05F960130126A037A8C7C2231E`**. Misma firma debug de 02, SHA-256 **`586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`**; instalación con `-r`, sin limpiar datos. Copia **`android/artifacts/ANDROID-03/trucazo-capacitor-0.2.0-debug-local.apk`**, fuera de Git. APK con 11 archivos en assets/public y sin bibliotecas C/C++ en `lib/`. TWA y artefacto 02 conservados.

| Comprobación de 03 | Resultado y límite |
| --- | --- |
| `npm --prefix apps/mobile run check:session` | Aprobado. Interfaz empaquetada y SDK real con proveedor simulado: email/usuario, error uniforme, cierre/reapertura de navegador persistente, renovación de sesión vencida, aviso sin red, salida local, cambio A/B, identidad de Historia y bloqueo de mutaciones de juego. Otro fixture ejercita handlers reales: tokens sólo tras autenticar, contrato cookies web, CORS y ausencia de fallback a cookies con bearer inválido. **No prueba dos cuentas reales ni renovación instalada.** |
| `npm --prefix apps/mobile run check` | Aprobado. Formulario local sin peticiones remotas, estilos iguales a web 360×640, registro/volver y aviso offline. Web normal conserva invitado y registro; no se inició una cuenta de invitado en producción. |
| Servidor local con Supabase real | GET Historia sin sesión/token inválido:401. OPTIONS interno204, externo403. El503 por falta de llave del12/10 quedó resuelto el 13/10: configuración privada válida, contraseña incorrecta/usuario desconocido401 uniforme, ingreso personal por usuario200. |
| APK instalado | Build e instalación Success; origen `https://localhost`, Android11/WebView133 comprobados. Aceptación 13/10 aprobada: ingreso personal email/usuario, perfil/saldo e identidad/preparación de Historia, cierre/arranque, renovación forzada contra Supabase real, logout local y cambio entre dos cuentas. [Evidencia instalada](#android-03-sesion). |
| Regresión web y campaña | TypeScript, lint y build Next completos aprobados, con los 7 avisos de hooks preexistentes. `check:offline-sync`: 66 rivales reconstruidos en SQL, 18 adulteraciones rechazadas, reintentos, dos dispositivos/mezcla online-offline, privacidad, rollback y borrado aprobados en base local de pruebas. Digest del paquete Historia conserva `8c762ac0d9890e47c6d057fecedc5eaf7b3f680e69f742158bef2deddfbbe678`. |
| Preservación/seguridad | Chrome conserva testin: 1.010 monedas, 22 puntos, 0 pendientes, 2 comprobantes y partida terminada. Dependencias del APK: `npm audit --omit=dev` sin avisos. Los 3 moderados de la cadena CLI de 02 siguen siendo herramientas de desarrollo. Sin SQL nuevo, despliegue, commit/PR, publicación ni envío a terceros. |

**Configuración privada resuelta por el dueño el 13/10:** clave existente `service_role` de [API Keys del proyecto](https://supabase.com/dashboard/project/uqhsyayfvhwlduioghtu/settings/api-keys), únicamente en `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` ignorado. Para restaurar otro entorno local, el dueño copia esa clave directamente al archivo y guarda, sin enviarla por chat ni incorporarla a Git. El código existente de username ya requería esta variable; no crear/rotar llaves por rutina. El agente comprueba sólo presencia y funcionamiento, nunca imprime el valor. No repetir este paso en esta PC.

**Comandos de retoma del agente:**

```powershell
. ./scripts/android-env.ps1
# Usar un único Next local en 127.0.0.1:3000. No compartir .next entre dev y build.
$env:PWA_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm --prefix apps/mobile run check:session
npm --prefix apps/mobile run check
& $env:ADB -s emulator-5580 reverse tcp:3000 tcp:3000
# Reconstruir el APK local sólo si cambia código/configuración pública:
$env:MOBILE_API_ORIGIN = 'http://localhost:3000'
npm --prefix apps/mobile run apk:debug
& $env:ADB -s emulator-5580 install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
& $env:ADB -s emulator-5580 shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n ar.com.trucazo.capacitor.dev/.MainActivity
# Con el dueño ya ingresado personalmente:
$taskAppPid = (& $env:ADB -s emulator-5580 shell pidof ar.com.trucazo.capacitor.dev).Trim()
& $env:ADB -s emulator-5580 forward tcp:9224 localabstract:webview_devtools_remote_$taskAppPid
node apps/mobile/scripts/check-device-session.mjs --authenticated
```

Para la aceptación real: comprobar ingreso por usuario y por email; comparar cuenta/saldo y `identity=1`; pedir preparación real GET Historia sin reemplazar los guardados de Chrome; forzar cierre sólo de Capacitor y abrir desde su ícono; comprobar renovación, logout local y cambio entre dos cuentas de prueba. Pedir al dueño cada acceso personal que haga falta. No borrar datos ni copiar su sesión de Chrome para evitar ese paso. El diagnóstico de dispositivo muestra sólo identidad/estado/saldo, nunca token/email/contraseña. Repetir la comprobación web pertinente al cerrar 03.

**Evidencia privada/local:** `android/generated/android-03-session-fixture.json`, `android-03-server-fixture.json`, `android-03-fixture-lobby.png`, `android-03-device-login.json/png`, logs `android-03-apk-build.log` y `android-03-web-build.log`. Las capturas/formulario y lobby simulado se inspeccionaron visualmente. El conflicto de dos servidores Next IPv4/IPv6 se corrigió deteniendo sólo los procesos identificados de esta carpeta; después del build se restauró uno con los parámetros anteriores, `127.0.0.1:3000`. WebView/Chrome/red/guardados no se reinicializaron. adb/tsx/build necesitaron el mismo acceso al entorno Windows fuera del aislamiento documentado en 01/02; no se cambió el código por esos fallos.

Documentación oficial consultada: [sesiones Supabase](https://supabase.com/docs/guides/auth/sessions), [renovación](https://supabase.com/docs/reference/javascript/auth-startautorefresh), [API Keys](https://supabase.com/docs/guides/getting-started/api-keys), [Capacitor HTTP](https://capacitorjs.com/docs/apis/http), [ciclo de la app](https://capacitorjs.com/docs/apis/app). Changelog Supabase del12/10 revisado: sin cambiar APIs ni migraciones por esta etapa. API Keys revisada de nuevo el 13/10; aceptación instalada y renovación real completadas a continuación.

##### Aceptación instalada — cierre del 13/10/2026

- El emulador existente estaba iniciado con `-no-window`. Se cerró y arrancó el mismo AVD Android11/puerto5580 con ventana visible, sin limpiar datos ni instalar otra copia. Servidor Next único en `127.0.0.1:3000`, reverse3000 y diagnósticos9223/9224 restaurados. El dueño ingresó por email en el formulario nativo.
- APK real: origen `https://localhost`, plataforma Android, cuenta **testin** `29476689-d94b-4c1f-b7e7-5b23123de001`. Perfil/lobby y API autenticada coinciden: **1.010 monedas, 22 puntos**. GET identidad Historia 200; GET preparación real 200 con autorización, versiones `historia-local-v1`/`historia-bots-v1`, **15 provincias y 66 rivales**. La respuesta no se guardó como campaña ni sustituyó IndexedDB de Chrome.
- Cierre forzado exclusivamente de Capacitor y reapertura con intent MAIN/LAUNCHER: vuelve al lobby sin pedir contraseña. Renovación comprobada con Supabase real: se adelantó sólo `expires_at` en el almacenamiento propio del APK, se dejó confirmar la escritura al pasar a segundo plano y se reabrió; token distinto y vencimiento nuevo, misma cuenta/saldo. Es un ensayo de renovación forzada, no una espera hasta el vencimiento natural del JWT. El primer intento cerrado inmediatamente no confirmó la escritura y se descartó como evidencia.
- Diagnóstico corregido: el lobby tiene campos de búsqueda/texto, por eso se detecta el ingreso por `input[name=password]` y se espera su carga antes de verificar. `check-device-session.mjs --authenticated --prepare-history` comprueba preparación real; `check-device-renewal.mjs` comprueba renovación sin imprimir/exportar tokens. Estos cambios son de diagnóstico y no requieren reconstruir el APK.
- Chrome después del reinicio sigue con **1.010 monedas, 22 puntos, 0 pendientes, 2 comprobantes y partida terminada**. TWA y datos locales conservados. `.env.local` sigue ignorado; el dueño completó su línea privada, sin mostrar la clave. Sin SQL, deploy, publicación ni cambios de juego.
- Logout desde el menú real del APK: almacenamiento de sesión vacío, formulario visible y GET Historia sin sesión 401. Chrome después de esa salida sigue autenticado como testin: identidad Historia 200 y mismo avance; la sesión nativa es independiente. Se dejó Capacitor en el formulario para el próximo ingreso personal.
- Configuración e ingreso por usuario resueltos: la consulta privada `get_login_email` para testin devuelve un identificador válido, sin imprimir el email. API nativa con contraseña incorrecta y usuario desconocido devuelve exactamente 401 `{ok:false}`; después el ingreso personal por usuario devuelve200 y crea la sesión propia de testin en el APK. Perfil/saldo e identidad Historia vuelven a coincidir. Se comprobó que ninguno de los 11 recursos nativos contiene la clave privada local; no se reconstruyó ni reinstaló el APK.
- Cambio real **testin→santib→testin aprobado**. El dueño hizo cada ingreso personalmente. B=`9370e685-9dd0-4fab-a1a4-721a60f7d3dd`, santib:220 monedas/0 puntos; perfil, identidad y preparación Historia 200 corresponden a B, catálogo 15/66. Al salir se vacían sesión y ambos campos de ingreso. Regreso a A: misma identidad testin,1.010 monedas/22 puntos y API Historia 200; no se mezclaron datos. Chrome siguió autenticado como A y conservó0 pendientes/2 comprobantes/partida terminada.
- Evidencia: `android/generated/android-03-device-email-history.json`, `android-03-device-reopened.json`, `android-03-device-renewal.json`, `android-03-device-after-renewal.json`, `android-03-device-logout.json`, `android-03-web-after-native-logout.json`, `android-03-username-server-real.json`, `android-03-device-username.json`, `android-03-device-account-b.json/png`, `android-03-device-account-a-return.json`, `android-03-device-account-switch.json`, `android-03-web-after-account-switch.json`, `android-03-data-preserved-final.txt` y captura `android-03-device-authenticated.png` inspeccionada. Hash del APK repite el artefacto0.2.0 original. **No quedan pasos personales pendientes de 03 en este entorno.** Rutas nuevas sin deploy; su aceptación remota sigue ligada a la publicación correspondiente, y Historia instalada/guardado empiezan en 04.

<a id="android-etapa-04"></a>

#### ANDROID-04 — Historia instalada y guardado real

**Empieza con:** 03 cerrada, exportación autenticada disponible y motor/mapa/mesa existentes. Mantener el formato y las reglas verificadas salvo una necesidad documentada.

**Trabajo:** adaptar la preparación inicial y recursos al APK; elegir y comprobar el almacenamiento de la app para campaña, partida, revisiones y cola. Abrir el mapa real de 15 provincias/66 rivales; integrar Tobías con la mesa compartida. Confirmar cada guardado antes de avanzar la jugada y conservar el estado previo ante fallos. Separar cuentas, sesión y progreso; definir las reglas de backup/restauración de Android para no copiar sesiones/autorizaciones entre identidades o revivir guardados incompatibles.

**Verificación y final:** descarga real completa/incompleta; entrar en modo avión quitando el puente adb; jugar Tobías, forzar cierre durante carta, canto y respuesta del bot, volver desde el ícono y recuperar exactamente lo confirmado. Completar victoria y derrota; reinicio del equipo, sesión vencida sin red, cambio de cuenta y fallo de espacio/escritura sin mezclar ni perder partidas. El diseño conserva controles/cantos dentro de una pantalla. El registro queda pendiente de acreditación hasta 06.

**Entrega a 05/06:** almacenamiento elegido y motivo, esquema/versión, pruebas de interrupción, estado de cuenta y pendientes, API usada y artefacto instalado. La selección de todos los rivales debe estar conectada al motor; la regresión completa de campaña se cierra en 06/08/17.

<a id="android-04-guardado"></a>

##### Implementación y pruebas de ANDROID-04 — 13/10/2026

**Estado: ANDROID-04 cerrada.** Integración, pruebas offline y regreso personal testin→santib→testin aprobados. La prueba usa Android 11/API 30 y WebView 133 del AVD existente, con Supabase real y API Next local. No acredita teléfono físico, otras versiones Android ni destino HTTPS desplegado; continúan en la matriz de etapas posteriores.

**Primero se comprobó el guardado propio:** el WebView nativo empezó sin bases de Historia y devolvió `false` al pedir almacenamiento web persistente. Se eligió SQLite incorporado en Android, sin dependencia adicional ni biblioteca nativa empaquetada. `CampaignStorePlugin.java` guarda en `no_backup/trucazo-historia-v1.db`, esquema 1: `campaigns(owner, revision, body)` y `meta(id, owner)` para la identidad activa. Antes de integrar mapa/mesa, un snapshot real de testin se escribió en esa base y se recuperó con el mismo hash después del cierre forzado y arranque MAIN/LAUNCHER. No se importaron cookies, sesión ni IndexedDB de Chrome.

- Cada reemplazo exige cuenta activa, dueño del registro y revisión anterior exacta. SQLite confirma una transacción completa con `synchronous=FULL` antes de responder; el controlador sólo entonces muestra la carta, canto, respuesta o resultado. Un rechazo conserva el estado previo y detiene los turnos automáticos. El cambio de cuenta cancela el controlador/timers y oculta el registro anterior sin borrarlo.
- Se mantienen `historia-local-v1` y `historia-bots-v1`, el motor de los 66 rivales y el mismo mapa/mesa de la web. `prepareSavedCampaign` comparte la combinación de descarga oficial con partida, cola y comprobantes locales; IndexedDB sigue siendo el almacenamiento de la web. El APK usa `apps/mobile/src/campaign-storage.ts` y `History.tsx`.
- El APK incluye catálogo congelado y recursos de cartas, avatares, mapa, mesa y sonidos. Verifica el hash de cada recurso antes de solicitar `GET /api/android/historia` con la sesión propia; exige identidad, autorización, versiones y catálogo compatibles antes de guardar. Una preparación incompleta no reemplaza la anterior. Los 66 rivales se seleccionan mediante el catálogo existente y pasan por el mismo motor.
- La identidad local permite abrir una Historia preparada con la sesión vencida y sin red. Las peticiones remotas conservan la validación/renovación del SDK de Supabase. El APK no envía la cola ni concede premios oficiales en 04; esa conexión corresponde a 06.

**Backup, actualización y restauración por cuenta:** se conserva `allowBackup=false`, se excluyen los dominios de datos en `backup_rules.xml` y en `data_extraction_rules.xml` para nube/transferencia, y la base reside en `no_backup`. Actualizar el mismo paquete/firma con instalación `-r` conserva sesión, partida y cola; se comprobó con el APK final. Desinstalar o borrar los datos elimina lo aún no sincronizado: en una instalación nueva hay que ingresar personalmente y descargar el avance oficial de esa cuenta. No se restaura una autorización/sesión desde otro equipo ni se mezcla una campaña con otra identidad. Un formato/motor/esquema incompatible se conserva y bloquea su apertura; su migración y convivencia entre versiones pertenecen a 06. No se ensayó una transferencia física entre teléfonos.

| Prueba | Evidencia y alcance |
| --- | --- |
| Preparación completa real | Testin y santib reciben 15 provincias/66 rivales con autorización de su propia cuenta; cada registro queda en SQLite separado. |
| Preparación incompleta y reintento | Un recurso ausente simulado en el WebView rechaza la preparación sin alterar el guardado real. Además se retiró reverse3000 antes de la descarga real de santib: API inaccesible, sin registro parcial; restaurar el puente y reintentar prepara su campaña. Testin conserva el mismo hash y cuatro resultados. |
| Modo avión sin puente | Reverse3000 retirado, mapa/mesa/recursos disponibles y partidas completas contra Tobías. Victoria **16–1** y derrota **0–15**; las otras dos derrotas del ensayo también quedaron en la cola. La estrategia que facilita la victoria sólo se inyecta en el diagnóstico debug; no entra al APK. |
| Carta, canto y respuesta del bot | Después de cada acción confirmada se suspende y fuerza el cierre exclusivamente de Capacitor; al abrir desde el lanzador se recupera el mismo hash. Otro corte inmediato durante una respuesta, sin esperar confirmación, recupera íntegro el estado anterior. |
| Reinicio y vencimiento offline | Se adelantó únicamente `expires_at` de la sesión propia y se reinició sin red: abre la campaña sin pedir contraseña y conserva el hash. Reinicio completo del emulador Android también lo conserva. Vencimiento forzado, no espera al vencimiento natural del JWT; al restaurar internet el SDK renueva y la API devuelve200. |
| Fallo de almacenamiento | Base y journal reales temporalmente de sólo lectura, con la app detenida: SQLite rechaza su apertura para escribir y la UI muestra el error. Restaurar permisos y reabrir conserva el hash. El fixture de navegador también rechaza la escritura de una acción sin avanzarla. No se llenó el disco del equipo. |
| Cuenta A/B/A | El dueño hace los ingresos personales testin→santib→testin tras cada salida del menú real. B empieza sin campaña de A y obtiene su descarga propia (220 monedas/0 puntos). Al regresar a A reaparece «Continuar partida»: revisión263, partida abierta y 4 pendientes con el mismo hash; B también conserva su hash/revisión0. Perfil oficial de A sigue en 1.010 monedas/22 puntos; API identidad200. |
| Diseño y regresión | Mesa nativa completa a 360×568, incluidos cantos, sin cartas/imágenes ausentes ni controles fuera de pantalla. Fixture compartido verifica cuatro tamaños, estados de mesa y dos escritores; capturas nativas inspeccionadas. |

**Pruebas automatizadas aprobadas:** TypeScript; lint/build Next (7 avisos de hooks preexistentes); `check:session`, `check`, `check:history` de mobile; campaña/reglas contra SQL (59.940 desbloqueos, 1.650 recompensas y 6 partidas); regresión de navegador de campaña (147 recursos íntegros, mapa, mesa, resultados, aislamiento y fallos de guardado). `check:history` usa UI/SDK reales y dos cuentas simuladas con IndexedDB: es regresión del controlador, separada de la aceptación real SQLite del emulador. No hubo SQL nuevo, cambio del servidor de reglas, deploy ni publicación.

**Artefacto instalado:** paquete provisional `ar.com.trucazo.capacitor.dev`, **0.3.0/código 3**, actualización sobre 03 sin borrar datos. `android/artifacts/ANDROID-04/trucazo-capacitor-0.3.0-debug-local.apk`: **15.771.816 bytes**, SHA-256 `18319F1DF19E60D0DD07FA80A1A48FE260002D44B7644A6018C1F79272D70A7B`. 154 entradas de recursos locales y ninguna biblioteca añadida en `lib/`; SQLite pertenece al sistema Android. Paquete TWA separado y archivos/cambios locales conservados. La API de este debug usa `http://localhost:3000` por adb reverse, mientras Auth/datos usan Supabase HTTPS real: no es candidato Play ni prueba de las rutas nuevas en producción.

**Datos y evidencia para 05/06:** testin conserva en SQLite **4 resultados pendientes (3 derrotas/1 victoria)**, sin comprobantes nativos y sin sincronizar; 24 puntos proyectados frente a los 22 oficiales, 1.010 monedas oficiales y 0 monedas pendientes (Tobías ya estaba vencido oficialmente). Partida abierta `54bc65ed-9bb1-4234-a27b-1bddfcaed656`, revisión263, 0–0 y 3 acciones; hash `ab5ebf30e53c7d198b2a013b902adfedcb616bdebb12eb4e5761c803da3ef1a0`. Santib tiene revisión0, sin partida ni cola, 220 monedas/0 puntos. Chrome conserva su sesión de testin, 0 pendientes, 2 comprobantes y partida terminada, hash `13862fa63e34860049dcdbc528f689e4d376e7c8b38908dffdc125d9387a220c`. No mezclar esos tres registros.

Evidencia local ignorada en `android/generated/android-04-*`: almacenamiento inicial/reapertura; `cuts.json`, `immediate-cut.json`, `write-failure.json`, `incomplete.json`; `device-play-win.json/png`, `device-play-loss.json/png`, `device-expired.json/png`, `device-reboot.json`; `controller-fixture.json`, `account-a-before.json`, `account-b-isolation.json`, `account-b-download-cut.json`, `account-b-prepared.json`, `account-a-return-session.json`, `account-switch-real.json`, `account-a-return.png`, `chrome-preserved.json` y `chrome-after-account-switch.json`. Esta última confirma identidad200 y el mismo hash/contadores después de ambas salidas nativas y de reabrir Chrome. Para diagnosticar Chrome usar una pestaña activa: las antiguas suspendidas pueden no responder. Los diagnósticos guardan contadores/hashes/capturas; no exportan sesiones ni tokens.

<a id="android-etapa-05"></a>

#### ANDROID-05 — Juego online 1v1

**Empieza con:** 03 y 04 cerradas. La presentación local existe; el servidor SQL sigue siendo la autoridad online.

**Trabajo:** adaptar lobby y controlador 1v1: crear/unirse a mesa pública/privada, entrar por invitación, obtener mano propia, RPC de acciones, Realtime, relojes, bot, resultado y revancha. Reutilizar reglas del servidor y la mesa, separando únicamente dependencias Next/sesión/navegación necesarias. Recuperar el snapshot al regresar de suspensión/reconexión y retirar suscripciones al salir. Conservar chat/frases actuales; su protección adicional queda en 12.

**Verificación y final:** partida completa a 15 y 30 contra bot y partida entre app y web con dos cuentas; carta, envido/falta, truco/retruco/vale cuatro, mazo, pardas, tiempos y abandono contrastados con SQL. Cada jugador accede sólo a su mano; no ampliar Realtime a manos ocultas. Red interrumpida y regreso no duplican acciones ni premios. Resultado/revancha y vuelta al lobby usan saldo real. Mesa completa también en cantos con más opciones.

**Entrega a 06:** flujo online probado, acciones/consultas adaptadas, casos SQL contrastados, artefacto y límites de la prueba. Parejas y torneos se implementan en 09 y 10.

<a id="android-05-online"></a>

##### Implementación y pruebas de ANDROID-05 — 13/10/2026

**ANDROID-05 cerrada; sigue ANDROID-06.** GitHub incorporado hasta `f873a36`: siete commits desde `2ecd674`, sin commit nuevo ni pérdida de trabajo local. Respaldo byte a byte de 314 archivos en `android/generated/pre-android-05-github/` y stash `pre-ANDROID-05 GitHub update 2026-10-13` conservados; el stash ya se restauró, no volver a aplicarlo. El único conflicto fue README: se conservó la organización local y los capítulos nuevos de GitHub se llevaron a [Operación](operacion.md#correccion-cierres-presencia). SQL de ranking aplicado comprobado por lectura; no repetir la migración.

- **Controlador compartido:** `apps/mobile/src/OnlineGame.tsx` monta el mismo `GameClient`, espera y cancelación de la web. `loadGame` valida usuario y pertenencia a la mesa, llama `start_game` idempotente y consulta en paralelo mano propia, presentación y medallas. Supabase utiliza la sesión propia de 03; no cookies de Chrome. Las reglas, premios y reparto siguen en SQL.
- **Entradas:** crear pública/privada, código y revancha usan el lobby existente. Invitaciones 1v1 recibidas se muestran en el lobby nativo con la tarjeta compartida de FriendsPanel, porque Comunidad corresponde a 11. Parejas se intercepta antes de mutar; torneos siguen en 10. El router hash es estable y las suscripciones se retiran al desmontar.
- **Recuperación:** foco, regreso de Android y conexión vuelven a leer estado y mano propia. Descartan estados antiguos por fecha y no repiten acciones del jugador; reactivan bot/reparto que fallaron con red. El reloj conserva sólo su ancla visual por cuenta/partida/turno en LocalStorage; no contiene cartas, autorización o reglas y no modifica el plazo SQL. Regresión reprodujo 26→30 antes del arreglo y conserva el tiempo después.
- **Presentación:** mesa/cantos entran en 360×568 sin desplazar. El resultado compacto mantiene sus controles visibles y los objetivos se abren desde un botón con el mismo componente/reclamos; no se eliminan recompensas. Los cierres por tiempo/abandono explican el motivo, evitando decir que un marcador inferior ganó por puntaje. Respuestas de acciones atrasadas no reabren una partida terminada ni muestran un error de jugada en el resultado.

| Prueba | Evidencia y límite |
| --- | --- |
| App↔web real | Dueño ingresó personalmente como santib en el navegador de Codex; APK conservó testin. Privada de 10 a 15, código, carta, envido/tantos, truco/retruco/vale cuatro, suspensión y privacidad. `9a4797e3-c81d-43d4-a245-f47727d8a636` cerró por tres tiempos de testin, 8–7; ganador santib según SQL. Revancha `5af7d85d-e5fb-41d2-97c1-395f708f073f` abierta en ambos, mano alternada y cierre normal 0–15 por falta. |
| Bots en APK real | Pública a 15 contra Dai_Corrientes: `5f94d06e-c66c-46eb-9c30-1e9177adb26d`, 1–15, 12 manos y dos tiempos durante diagnóstico. Al principio no había bot libre; llamada idempotente de diagnóstico lo sentó después. Pública a 30 con entrada automática: `1da1fc5b-2753-4f11-8d7b-a7e409a54871`, 12–30, 32 manos, 93 controles y cero tiempos. Los tres bots reales pueden estar ocupados; no forzar una asignación desde el cliente. |
| Red y preservación | Modo avión real, Wi-Fi/datos retirados: APK muestra offline. Regreso recupera el cierre 12–30 y el mismo saldo, sin premio nuevo. Guardado SQLite de testin conserva revisión263, partida abierta y cuatro pendientes con el hash de 04; Chrome conserva su hash, 0 pendientes/2 comprobantes y sesión. Un ensayo adicional de cronómetro en APK cayó entre manos (contador nulo) y no acredita el mismo turno; la regresión del reloj sí pasa en la UI empaquetada. Repetir esa medición continua dentro de 14/17. |
| Privacidad real | Con token propio de testin: una fila de su mano, cero filas al pedir la de santib. Publicación Realtime de `game_hands`: cero. No se amplió acceso ni replicación. |
| UI/SDK + PostgreSQL aislado | `npm --prefix apps/mobile run check:online`: funciones vigentes y RLS en PGlite; Auth/Community/WebSocket simulados, sin triggers de ranking/objetivos. Privada/código/invitación, carta/cantos, resultado/revancha, abandono, recuperación de bot/reparto y reloj sin reinicio. SQL cubre falta, tres pardas, plazo no vencido, tres tiempos, premios idempotentes y dos bots completos 15/30. Seis opciones de canto caben en 360×568, 360×640 y 390×844. |
| Regresión | Sesión, handlers de login y cambio A/B con proveedores simulados, Historia empaquetada, TypeScript, lint (7 avisos previos), builds Next/APK y presencia SDK real aprobados. La salida espera terminar su limpieza antes de mostrar otro ingreso. Se mantienen chat/frases y los componentes/SQL existentes; no se enviaron mensajes manuales ni se ensayó teléfono físico. |

**Datos para 06:** SQLite testin: revisión263, partida `54bc65ed-9bb1-4234-a27b-1bddfcaed656` abierta (0–0, 3 acciones), 4 pendientes/0 comprobantes, 24 puntos proyectados/22 oficiales, hash `ab5ebf30e53c7d198b2a013b902adfedcb616bdebb12eb4e5761c803da3ef1a0`. La quinta mesa de diagnóstico `1816b77b-c9cd-4ad1-9162-73cc9ab366c7` cerró 2–2 por tres tiempos: no quedó online abierta. Saldo oficial testin **960** (cinco apuestas de 10 perdidas); santib **250**. El snapshot offline conserva sus 1.010 de la descarga anterior: 06 debe actualizarlo con el saldo oficial sin borrar cola/partida. Santib SQLite de 04 no se activó ni escribió. Chrome sigue 0 pendientes/2 comprobantes/partida terminada, hash `13862fa63e34860049dcdbc528f689e4d376e7c8b38908dffdc125d9387a220c`; su snapshot también conserva 1.010/22. No importar ninguno al otro origen.

**Artefacto final instalado:** paquete provisional `ar.com.trucazo.capacitor.dev`, **0.4.0/código 4**, actualizado con la misma firma sin borrar datos. `android/artifacts/ANDROID-05/trucazo-capacitor-0.4.0-debug-local.apk`: **15.801.827 bytes**, SHA-256 `5E39D264FDB5DA4CB5C0FBE73E77762D45451B7A92474097B3F3D198B391548B`. Certificado debug SHA-256 `586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`; sin dependencias nativas nuevas. En el APK final, resultado a 360×568 sin scroll (alto 568), objetivos accesibles en ventana y todos los botones dentro de la pantalla; regreso al lobby con 960 monedas. Última lectura del guardado tras esta instalación conserva exactamente el hash y cuatro pendientes.

**Evidencia local ignorada:** `android/generated/android-05-*`, especialmente `native-before.json`, `controller-fixture.json`, `rules-fixture.json`, `real-resume-privacy.json`, `real-bot-15.json`, `real-bots.json`, `final-network-off.json`, `final-reconnect.json`, `chrome-preserved.json`, `final-preservation.json`, `final-result-layout.json` y `final-objectives.json`; capturas de mesa/cantos/resultados y logs de construcción. `final-clock-before.json` con contador nulo es diagnóstico inconcluso, no aceptación del reloj. Guardados no sincronizados, sin SQL nuevo, deploy, publicación o commit/PR. Auth/datos usan Supabase HTTPS; API del APK debug continúa `http://localhost:3000` por reverse. Destino HTTPS desplegado, teléfono y otras versiones Android corresponden a la matriz posterior.

<a id="android-etapa-06"></a>

#### ANDROID-06 — Sincronización, premios y versiones de Historia

**Empieza con:** 04/05 cerradas y cola real producida por la app. Las dos migraciones de Historia ya aplicadas se reutilizan.

**Trabajo:** conectar envío/confirmación de registros con autorización de la nueva sesión, comprobantes únicos y actualización del snapshot. Conservar la cola hasta guardar la confirmación y explicar conflictos sin borrar progreso. Mantener lotes/límites y validación SQL del motor congelado. Definir conservación de motor/catálogo para partidas abiertas y registros de versiones anteriores, migración del guardado y orden compatible de cambios entre APK y backend. Si hace falta SQL, crear migración nueva y actualizar la foto del esquema; el dueño la aplica manualmente.

**Verificación y final:** una victoria/derrota real sincronizada; respuesta perdida después de aceptación y reenvío del mismo registro sin duplicar premio; sesión vencida, A/B, primera victoria en dos dispositivos/sesiones, mezcla online/offline, topes de revancha, desbloqueos y estilo. Validar rechazo de registros alterados y rollback de lotes en una base de prueba. Probar actualización conservando partida y cola. Cubrir 66 rivales con pruebas de reglas/selección pertinentes y recorridos instalados representativos por región, sin exigir 66 partidas manuales por rutina.

**Entrega a 07:** primer ensayo Capacitor completo, saldo/progreso oficiales verificados y política de compatibilidad. La prueba de arquitectura inicial queda comprobada para esos flujos; acceso Google y el resto del producto siguen pendientes.

<a id="android-06-sync"></a>

##### Implementación y aceptación parcial de ANDROID-06 — 13/10/2026

**Estado al 13/10: en curso; cerrada el 14/10 según la [aceptación final](#android-06-cierre).** Envío y confirmación integrados y aceptados en el APK 0.5.0 con Supabase real y API Next local. En esa sesión quedaron pendientes primera victoria simultánea y mezcla online/offline reales; sus equivalentes ya pasaban en PostgreSQL aislado secuencial. El ingreso personal de santib no se recibió entonces y fue reemplazado el 14/10 por las cuentas QA autorizadas. El registro siguiente conserva la evidencia inicial, sin convertir sus pendientes antiguos en trabajo vigente.

**Primero se leyó el guardado sin modificarlo:** revisión 263, hash `ab5ebf30e53c7d198b2a013b902adfedcb616bdebb12eb4e5761c803da3ef1a0`, partida `54bc65ed-9bb1-4234-a27b-1bddfcaed656` abierta 0–0/3 acciones y cuatro resultados de 04. La actualización 0.4.0→0.5.0 conservó exactamente ese hash, partida, cola y sesión. Después se continuó la misma partida por la UI de ensayo y terminó 0–15/38 acciones; no se reinició ni reemplazó su reparto. El diagnóstico de derrota acortó las esperas visuales del bot únicamente en el WebView debug; ese código no entra al APK.

**Conexión mínima:** `History.tsx` reutiliza `synchronize`, `apiRequest` y `POST /api/android/historia` existentes. Intenta al completar el resultado, preparar, reabrir Historia o recuperar conexión/regresar a Android. Guarda toda la confirmación con la misma cuenta/revisión antes de retirar la cola. Cuenta cambiada, respuesta incompatible, error remoto o escritura rechazada dejan los registros para su dueño. La partida abierta debe terminar con su motor/descarga original antes de enviar; la pantalla lo explica. Reintento manual disponible en el menú. Lotes existentes de hasta diez registros y límites de transporte conservados; premios/reglas siguen en SQL. No se creó ni aplicó SQL nuevo.

**Aceptación real:** el servidor confirmó los cuatro registros previos (derrotas 5–15, 9–15, 0–15 y victoria 16–1) y la derrota final 0–15. Se interceptó sólo la respuesta 200, después de aceptar, y el APK conservó cinco pendientes/0 comprobantes, revisión 298/hash `d5de2ad3abdd58da4d33dc03a82dc19a8d43fabce64bee48b8e62bfc0b97d598`. Modo avión, Wi-Fi/datos apagados y reverse 3000 retirado; cierre forzado/reapertura conservaron ese mismo hash. Se adelantó `expires_at` local a 1 sin alterar el token; al restaurar red el SDK renovó y reenvió los mismos identificadores. SQLite confirmó cinco comprobantes, 0 pendientes, revisión 299; saldo 960/24 coincide con el perfil oficial. La victoria es revancha: +2 puntos, 0 monedas. El perfil, estilo y progreso oficiales completos antes/después del reintento son idénticos: 2 victorias frente a Tobías y 2 puntos de revancha; no duplicó premios ni estilo.

**Compatibilidad y orden de actualizaciones:** permanecen esquema SQLite 1, `historia-local-v1` y `historia-bots-v1`; no hay cambio de formato ni migración de datos en esta entrega. Las propiedades opcionales anteriores continúan admitidas. Guardado y resultados conservan su motor/catálogo y autorización hasta terminar y confirmar; renovar con partida/cola no reemplaza esa base. El lector nativo comprueba también versiones de la partida y cada pendiente. Ensayo instalado simuló formatos/motores incompatibles sólo en la respuesta de lectura: los cuatro casos se bloquearon sin escribir SQLite. Una confirmación de catálogo/motor distinto se rechaza sin retirar la cola. Para una futura versión: primero mantener/instalar en backend el validador del motor anterior y el nuevo; luego entregar un APK que pueda terminar/enviar lo anterior o una migración probada y transaccional. No retirar motor/validador/catálogo anteriores mientras queden guardados pendientes. Actualmente sólo existe v1: no se presenta como implementada una migración hacia un motor futuro.

| Verificación | Resultado y alcance |
| --- | --- |
| UI/SDK móvil | `npm --prefix apps/mobile run check:sync`: espera con partida abierta, pérdida de respuesta, reinicio, fallo de escritura después de aceptar, respuesta incompatible y cambio A→B durante envío. Tres comprobantes únicos; cero errores. Auth/aceptación simulados y almacenamiento IndexedDB aislado, separados de la prueba real SQLite. |
| SQL de sincronización | `npm run check:offline-sync`: cadena de 66 rivales y siete lotes, corte/reintento, otras 66 partidas reconstruidas, 18 adulteraciones rechazadas, primera victoria desde dos descargas, mezcla online/offline, estilo, rollback total, permisos y versiones. PGlite secuencial; falta simultaneidad real. |
| Reglas/selección | `check:offline-campaign`: 59.940 desbloqueos y 1.650 premios iguales al SQL, seis partidas con cola/dependencias/estilo. |
| Regiones en APK | Presentación de un rival por cada una de 15 provincias en WebView 360×568, incluyendo 15/30 y Noroeste: controles dentro de pantalla e imágenes completas. Progreso ficticio sólo en memoria, sin red/escritura; no son 15 partidas reales ni desbloqueos oficiales. |
| Actualización/durabilidad | Misma firma y `install -r`; partida/cola conservadas antes de terminar. Respuesta perdida, cierre forzado offline y vencimiento local forzado/renovación real aceptados. |
| Regresión | TypeScript, lint (siete avisos preexistentes), sesión/handlers de login y construcción del APK aprobados. No se reconstruyó `.next` con el servidor abierto: las API de esta entrega no cambiaron. |

**Estado final a conservar:** testin SQLite revisión 299, cinco comprobantes, 0 pendientes, partida terminada 0–15, 960 monedas/24 puntos oficiales; hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`. Santib SQLite revisión 0/hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e`, sin partida/cola y su snapshot 220/0, sin escritura. Chrome revisión 158, 0 pendientes/2 comprobantes/partida terminada, hash `13862fa63e34860049dcdbc528f689e4d376e7c8b38908dffdc125d9387a220c`, idéntico antes/después; su snapshot 1.010/22 es histórico, no el saldo oficial actual. No importar ni restaurar ninguno entre orígenes.

**Artefacto:** `ar.com.trucazo.capacitor.dev`, 0.5.0/código 5, 15.586.933 bytes. `android/artifacts/ANDROID-06/trucazo-capacitor-0.5.0-debug-local.apk`, SHA-256 `7F805E9C8439BEE2D800EF013C637FE41211F1BBBA33EE6C36B02CCEB3994E43`; mismo certificado debug de 05. Ninguna dependencia nativa nueva. No hubo commit/PR, despliegue ni publicación. APK debug y API local por reverse no son candidato Play; destino HTTPS, teléfono físico y matriz Android siguen en las etapas posteriores.

**Evidencia ignorada:** `android/generated/android-06-*`: `native-before.json`, `update-preserved.json`, `real-lost-response.json`, `real-accepted-before-retry.json`, `real-offline-reopened.json`, `real-confirmed.json/png`, `real-final.json/png`, `idempotence-renewal.json`, `native-compatibility.json`, `native-regions.json`, `controller-fixture.json` y `chrome-before.json`/`chrome-final.json`. Diagnósticos reproducibles en `apps/mobile/scripts/check-device-sync.mjs`, `check-device-compatibility.mjs`, `check-device-regions.mjs` y `check-device-history.mjs --play-loss --android-06`. Los diagnósticos no exportan sesión ni cartas. Al finalizar se forzó sólo la reapertura normal de Capacitor para retirar los ensayos temporales; quedó testin en lobby, red/reverse 3000/forward 9224 restaurados, Chrome y TWA conservados, servidor local intacto.

**Continuación del 13/10 — prueba simultánea preparada; falta ingreso personal.** Se volvió a ejecutar `. ./scripts/android-env.ps1` y `node apps/mobile/scripts/check-device-sync.mjs summary`: revisión 299/hash final idéntico, cinco comprobantes, cero pendientes y saldo oficial 960/24; estilo y progreso coinciden con Supabase. Santib SQLite conserva su hash. La nueva sesión de Codex no tenía pestañas: se abrió `http://localhost:3000/login`, se pidió el ingreso personal de santib y se conservó la pestaña. No se recibió ese ingreso ni se cambió la cuenta del APK durante esta continuación. ANDROID-06 sigue en curso; 07 no habilitada.

Para producir evidencia de solicitudes realmente superpuestas se preparó `apps/mobile/scripts/campaign-sync-gate.mjs`, puente HTTP ligado sólo a `127.0.0.1:3002` hacia Next local en 3000. Empieza desarmado. Al armarlo, retiene dos POST reales, comprueba la misma cuenta mediante la API, sesiones web-cookie/native-bearer, descargas/partidas distintas y una victoria proyectada inicial frente al mismo rival. Libera ambos cuerpos intactos sin esperar la respuesta del primero. Registra únicamente identificadores, transportes, tiempos, comprobantes y saldos en `android/generated/android-06-concurrent-transport.json`; no guarda credenciales, cuerpos ni cartas. Un envío solitario vence a los 25 segundos sin llegar a Supabase. Cancelación/desconexión retiran la espera. El puente no cambia reglas ni premios y no demuestra por sí solo concurrencia dentro de Postgres: la evidencia real debe mostrar solicitudes en vuelo superpuestas y resultados oficiales correctos.

`apps/mobile/scripts/route-device-sync-gate.mjs enable <owner>` desvía sólo los POST de Historia de `CapacitorHttp` al puente, dentro del WebView debug y con la sesión propia; rechaza otra cuenta. `restore` o la reapertura normal retiran el desvío. Se ensayó temporalmente con testin mediante un POST sin credenciales ni registros: llegó al puente/API y devolvió 401. Se restauró inmediatamente. No se enviaron partidas ni se alteraron guardados. Para la web, navegar después del login a `http://localhost:3002/android/historia/index.html`: usa las cookies de su ingreso personal y un IndexedDB separado por puerto. No importar SQLite, Chrome ni tokens. El puente adapta exclusivamente su origen web local al de la API local; la lista de orígenes de producción no se modifica.

**Verificación de la herramienta, no de la aceptación real:** `node android/generated/android-06-gate-smoke.mjs` pasó contra un servidor HTTP ficticio separado, sin Supabase: primer envío retenido, cuerpos/autorizaciones intactos, solicitudes superpuestas, cuentas distintas rechazadas antes de enviar y cancelación sin envío. Evidencia ficticia separada en `android-06-gate-smoke.json` y `android-06-gate-fixture-transport.json`. Comprobación de sintaxis de los dos scripts aprobada. El recorrido HTTP local comprobó la página preparada (200) y API sin acceso (401); no se reconstruyó `.next`, APK ni se repitieron pruebas ya aceptadas.

**Recorrido de aceptación preparado, ejecutado el 14/10 y conservado como historial:**

1. Usar `androidqa1` (o `androidqa2`) en web y APK mediante los [scripts de ingreso QA](#android-qa-accounts); cada origen inicia su propia sesión. El pedido del 14/10 reemplaza el acceso personal pendiente de santib. Leer saldo/progreso actuales antes de elegir rival. Tobías y Doña Rosa requieren 0 puntos; usar rivales todavía sin victoria oficial, sin reiniciar ni compensar progreso si el estado cambió.
2. Iniciar `node apps/mobile/scripts/campaign-sync-gate.mjs`; conectar `adb reverse tcp:3002 tcp:3002`; activar el desvío con el UUID de la cuenta QA elegida. Preparar Historia por la UI en APK y web del puerto 3002, comprobando autorizaciones distintas de la misma cuenta antes de ganar. No escribir filas, semillas, marcadores ni resultados.
3. Armar mediante POST local a `/__android06/arm` antes de terminar. Obtener una victoria jugando en cada sesión contra el mismo rival. Si un envío vence mientras se termina el otro, su cola sigue pendiente; reintentar por ambos controles cuando estén listos. Si hubo derrotas o más de un registro, desarmar y confirmar esos resultados normales antes de preparar un nuevo par. No forzar el cierre de una partida ni borrar resultados para ajustarlos a la herramienta.
4. Aceptar el par sólo con dos respuestas válidas y tiempos superpuestos: un comprobante paga el premio inicial y el otro 0 monedas/puntos de revancha; dos victorias oficiales, monedas iniciales una sola vez y estilo sumado una vez por registro. Verificar los dos guardados confirmados contra el perfil oficial. El snapshot de la primera respuesta puede preceder al segundo avance; actualizar por la UI después de confirmar las dos colas para comprobar el saldo final común.
5. Mezcla online/offline: descargar en el APK antes de una primera victoria online frente a otro rival aún no vencido. Conservar su resultado offline sin enviarlo; ganar jugando el duelo online por la web, y luego reconectar/confirmar el APK. El avance offline debe pasar a premio de revancha sin volver a cobrar monedas, conservando el estilo de ambos. Reenvío/pérdida de respuesta ya aceptados no requieren repetición por rutina.
6. Restaurar el desvío y retirar sólo reverse 3002; conservar reverse 3000, forwards existentes y servidor Next. Registrar evidencia real y guardados finales. Cerrar 06/habilitar 07 únicamente cuando ambos recorridos queden aceptados. No hubo SQL nuevo, commit/PR, despliegue ni publicación en esta preparación.

<a id="android-06-cierre"></a>

##### ANDROID-06 cerrada — simultaneidad y mezcla real aceptadas — 14/10/2026

**Cerrada.** Se completaron los dos recorridos que faltaban con APK Capacitor 0.5.0/código 5 en Android 11/WebView 133, web Next local y Supabase real. Se conservan la implementación, compatibilidad y pruebas anteriores de 06; no se repitieron por rutina ni se reconstruyó `.next`/APK. ANDROID-07 queda habilitada, sin comenzar su implementación en este cierre.

**Primera victoria simultánea, QA1:** web del puerto 3002 y APK ingresaron por separado con `androidqa1`, prepararon autorizaciones distintas antes de la primera victoria y jugaron contra Tobías por sus controles normales. Ambos terminaron 16–0/43 acciones. El puente liberó ambos POST juntos a las 17:43:17.153 UTC; las dos solicitudes estuvieron en vuelo superpuestas. La API devolvió 200 en ambas: registro nativo `cedf8249-c6b5-4cf4-8fec-2c19fceed983` recibió 50 monedas/24 puntos y registro web `667b1fb1-6424-44e8-8196-56a0f6b2e23e` recibió 0 monedas/2 puntos. Supabase quedó en 1.050 monedas/26 puntos, dos victorias y dos puntos de revancha. Una consulta de lectura comparó los siete contadores de estilo con la suma de los dos registros aceptados: todos coinciden, sin duplicarlos. Se acredita concurrencia de solicitudes reales; no se instrumentó el interior de Postgres para afirmar ejecución SQL paralela.

El snapshot de la primera respuesta nativa todavía mostraba 24 puntos/una victoria, porque precedía al segundo avance. Se actualizó mediante la UI después de confirmar ambas colas; el guardado nativo y el web terminaron con el mismo saldo 1.050/26, dos victorias y estilo completo. Native revisión 46/hash `1c01989ab72beebedd2cea02e3c691d8c42fb635ce09020854e3ca39e531f99a`; web revisión 45. Cada origen conserva su propio comprobante y cero pendientes; no se copiaron datos/sesiones entre orígenes.

**Mezcla online/offline, QA2:** el APK descargó su base antes de ganar. Wi-Fi/datos apagados, puente 3000/3002 retirado y `navigator.onLine=false`; ganó 17–0/43 acciones y guardó el registro `43d5f643-9f52-4858-a110-0c31d0584a8d`. Quedó revisión 44, un pendiente, cero comprobantes y hash `df310fbbf1b5f05979bed4d8295e0bc42d5c452ff94c58f45cdfa7485e62b5db`. La proyección local era 50 monedas/25 puntos. El emulador se reabrió después de las interrupciones con exactamente ese hash, sin red ni envío.

En paralelo se jugó por la web online con la misma cuenta y sólo sus cartas propias. La primera mesa `5644edd0-1101-47e4-8789-933defdce285` se había cerrado 0–0 por inactividad durante una interrupción; QA2 seguía oficialmente en 1.000/0/sin victorias. Se abrió y completó la nueva mesa `8c006ee0-0286-4e53-b9dc-b4d14afdab4a`, victoria 15–10: 50 monedas/21 puntos iniciales. Luego se restauraron red y reverse 3000: el APK confirmó automáticamente su mismo pendiente con **0 monedas/2 puntos de revancha**. Resultado oficial y SQLite: **1.050 monedas/23 puntos, dos victorias, cero pendientes y un comprobante**, revisión 45/hash `be4d53d687c8880b28d0d3f4b570127f677155becc0e26e89aa012ecb6d4d7d7`. Los siete contadores de estilo equivalen exactamente a lo acumulado online más la diferencia local de la descarga; se conservó el estilo online completo.

**Alcance del ensayo:** automatización tocó controles normales; el servidor validó/reconstruyó los resultados offline y calculó todos los premios. No se fabricaron marcadores, se editaron semillas/progreso ni se compensaron monedas. El diagnóstico offline consulta el estado local completo para escoger acciones legales; el online consultó sólo la mano propia y el estado público. Las adaptaciones fueron de la herramienta de prueba: toque del rival animado y espera de la mesa antes de leerla. No se cambió la lógica/UI del producto ni se leen cartas privadas del rival online.

**Preservación final comprobada:** testin SQLite revisión 299/hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`, cinco comprobantes/cero pendientes; santib revisión 0/hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e`, intactos. Chrome personal/TWA no se operaron, ni sus guardados se importaron. Accesos QA privados conservados, ambas cuentas siguen con permisos ordinarios. APK queda en Historia de QA2; red y reverse 3000 restaurados, forward 9224 y Next local conservados. Puente de prueba apagado y desvíos temporales retirados. Sin migración nueva, commit/PR, deploy ni publicación.

**Evidencia ignorada:** `android/generated/android-06-concurrent-before.json`, `concurrent-after.json`, `concurrent-transport.json`, `concurrent-web-result.png`, `concurrent-native-result.png`, `mixed-online-result.json/png`, `mixed-before-reconnect.json`, `mixed-confirmed.json/png`, `real-mixed-final.json/png`, `real-stage-closed.json/png`, `final-check.json` y sus diagnósticos `.mjs`. Los nombres abreviados conservan el prefijo `android-06-`. La evidencia de la herramienta ficticia sigue separada de estos resultados reales. `qa-accounts.mjs check`, comparación de guardados con oficial, sintaxis de diagnósticos y `git diff --check` aprobados; pruebas de reglas, compatibilidad y fallos ya aceptadas permanecen según el capítulo anterior. Reapertura normal final retiró todos los helpers/desvíos temporales del WebView y conservó exactamente el hash de QA2.

<a id="android-qa-accounts"></a>

##### Cuentas reutilizables de QA — 14/10/2026

**Pedido expreso del dueño:** crear dos usuarios de prueba para utilizar hasta terminar la app, evitando ingresos personales reiterados. Creación e ingreso automático aceptados; este apartado reemplaza los pedidos anteriores de ingresar personalmente con santib para las pruebas habituales. Para concurrencia de primera victoria se usa **una misma cuenta** en web y APK con sesiones/descargas independientes; para duelos o cambio A/B se usan los dos usuarios.

| Cuenta | UUID | Estado inicial comprobado |
| --- | --- | --- |
| `androidqa1` | `b00d207b-8d36-4b59-8479-346b91ce762d` | 1.000 monedas, 0 puntos, sin progreso, jugador registrado; no admin/bot |
| `androidqa2` | `ebf2c130-304d-431f-9754-110715ca2892` | 1.000 monedas, 0 puntos, sin progreso, jugador registrado; no admin/bot |
| `androidqa3` | `2c9dd1e8-a39b-41e7-af2a-f67502691795` | 1.000 monedas, 0 puntos, sin progreso; alta normal autorizada en 07; no admin/bot |

Las dos QA originales se crearon con Supabase Auth Admin mediante la llave local existente; el trigger normal creó sus perfiles y monedas iniciales. Emails técnicos en `qa.trucazo.test`, sin buzón real, confirmados exclusivamente para QA. Sin cambios al registro del producto, privilegios, esquema, reglas, monedas/progreso de otras cuentas ni `.env.local`. Novedades, recordatorios, ranking y torneos por email desactivados para esos UUID y marca administrativa `qa_purpose=android-app-acceptance`. No se enviaron invitaciones ni mensajes. Su creación original es anterior a 07; Google/recuperación real se aceptaron después con el dueño y el alta inmediata con QA3, según el cierre de 07.

**Ampliación autorizada en 07:** QA3 se creó mediante el formulario del APK con confirmación apagada, no mediante Auth Admin. El trigger normal creó un único perfil, sesión inmediata y 1.000 monedas. Nombre duplicado rechazado e ingreso posterior con usuario/contraseña comprobado. Sus cuatro preferencias de correo se desactivaron y su marca administrativa identifica el uso QA. QA1/QA2 conservan sus UUID, progreso, contraseñas y saldos finales de 06. No recrear QA3 para repetir el alta.

**Accesos privados:** `android/generated/private/android-qa-accounts.json` conserva `accounts` con QA1/QA2 y `registrationAccount` con QA3, sus contraseñas aleatorias, IDs y destino Supabase. La carpeta tiene permisos de lectura/escritura sólo para el usuario Windows del dueño y SYSTEM; archivo y perfiles de navegador están excluidos de Git, comprobado con `git check-ignore`. Conservar esta carpeta aunque se limpien otros archivos generados. No imprimir, adjuntar, subir ni copiar las contraseñas a documentación/chat/APK. La llave administrativa sólo se lee en Node local para preparar/verificar QA, nunca se guarda en ese archivo ni se envía al navegador. Las sesiones nuevas usan el ingreso normal y la llave pública.

**Herramientas para el agente (el dueño no ejecuta estos comandos):**

- `node apps/mobile/scripts/qa-accounts.mjs check`: comprobar ingreso, perfil y progreso de las tres cuentas sin imprimir credenciales ni cambiar saldos. `provision` se usó para QA1/QA2; reutiliza los IDs existentes sin restablecer contraseñas ni progreso. QA3 sólo se creó con autorización específica y el formulario de 07. No crear cuentas nuevas por sesión ni borrar las actuales para repetir una primera victoria.
- Cargar `. ./scripts/android-env.ps1` y `$env:PWA_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'`. La web debe estar abierta en 3000 con el build del último traspaso; usar su ruta `TRUCAZO_NEXT_DIST_DIR` al ejecutar `next start`. `.next` original conserva la compilación anterior; no reconstruir una carpeta con su servidor abierto.
- `node apps/mobile/scripts/qa-login.mjs web 1` (o `web 2`, `web 3`): llenar el formulario con el archivo privado y comprobar lobby/identidad. Usa Chrome sin ventana, con perfil persistente separado `android/generated/private/qa-web-N`. No opera Chrome personal ni el navegador de Codex. Para el puente, definir temporalmente `$env:ANDROID_QA_WEB_ORIGIN = 'http://localhost:3002'`; ese origen también inicia su sesión propia. Retirar la variable al terminar.
- `node apps/mobile/scripts/qa-login.mjs native 1` (o `native 2`, `native 3`): llenar el formulario normal del APK debug y comprobar el lobby. Si está otra cuenta, el agente usa primero su menú Perfil → Cerrar sesión, que cierra sólo esta instalación y conserva SQLite. El script se niega a cerrar/interrumpir otra cuenta automáticamente. No importar tokens web al APK ni entre perfiles.

**Verificado durante la preparación de QA:** ambas cuentas autenticadas/confirmadas, perfiles ordinarios y preferencias de email desactivadas; ingresos por formulario y lobby web con identidad de API 200, e ingresos A→B en APK 0.5.0. En el primer intento web de A, la herramienta escribió antes de conectar React al formulario; se agregó espera de hidratación al diagnóstico y el segundo intento pasó. No se modificó UI de producción. Sintaxis de scripts aprobada. Las partidas y aceptación posteriores se registran en el [cierre de 06](#android-06-cierre); el saldo inicial de esta tabla es histórico y no debe restaurarse.

**Preservación y entorno final:** APK en lobby de `androidqa2`; testin SQLite revisión 299/hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`, 0 pendientes/5 comprobantes, y santib revisión 0/hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e` idénticos después del cambio normal de cuentas. Sesión personal de testin cerrada sólo en el APK; web/Chrome/TWA y sus guardados no se operaron. AVD `Trucazo_Android_11` reabierto sin wipe; serial actual `emulator-5554`, reverse 3000 y forward 9224 restablecidos. Next local en 3000 abierto con la compilación existente; puente/reverse 3002 todavía apagados. No hubo reconstrucción, migración, commit/PR, despliegue ni publicación.

**Evidencia ignorada y sin credenciales:** `android/generated/android-qa-accounts-check.json`, `android-qa-web-1-login.png`, `android-qa-web-2-login.png`, `android-qa-native-2-login.png`, `android-qa-native-preserved.json` y `android-06-real-qa-before.json/png`. Los perfiles persistentes guardan sus propias sesiones en la carpeta privada.

<a id="android-etapa-07"></a>

#### ANDROID-07 — Alta, Google, recuperación y enlaces

**Empieza con:** 06 cerrada y sesión/transporte establecidos. Revisar callback, plantillas y configuración real antes de duplicar funciones.

**Trabajo:** completar registro según la configuración elegida, Google mediante flujo admitido, recuperación de contraseña, cambio permitido y retorno a la app. Conservar soporte de confirmación para cuando se habilite; el dueño decidió mantenerla apagada el 14/10. Manejar cancelaciones, enlaces vencidos/usados, app cerrada/abierta y destino protegido tras login. Definir enlaces de partida/torneo y fallback web cuando la app no esté instalada. Permitir sólo destinos válidos; configurar redirecciones Supabase/Google y Android App Links/esquema que corresponda con pasos concretos. Conservar el callback web. Identificar qué certificados/configuración deberán repetirse con paquete/firma finales en 16/18.

**Verificación y final:** registro con sesión inmediata según la decisión vigente y recuperación con correo real de prueba; confirmación cubierta con proveedor simulado mientras siga desactivada. Login Google real, cancelación y retorno frío/caliente sin crear cuentas duplicadas; ingreso normal y web conservados. Probar enlaces válidos/ajenos/vencidos, recuperación abierta fuera de la app y vuelta a partida tras acceso. Una cuenta Google puede reautenticarse con Google para acciones sensibles. No incorporar formulario OAuth embebido no admitido ni pedir credenciales en el chat.

**Entrega a 08:** matriz de accesos/enlaces aprobada, URLs/certificados públicos y configuración aplicada o pendiente claramente identificada. [Redirecciones Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [App Links](https://developer.android.com/training/app-links/verify-applinks).

<a id="android-07-acceso"></a>

##### ANDROID-07 — acceso y enlaces aceptados; cierre — 14/10/2026

**Estado: cerrada; siguiente sesión ANDROID-08.** Alta inmediata real, Google abierto/cerrado, recuperación recibida y cambio personal, enlaces resueltos por el manifest y vuelta a una mesa existente tras login aceptados en APK/web. QA3 creada con autorización específica y reutilizable; las QA anteriores y los cuatro guardados finales de 06 permanecen intactos. Resend aplicado; confirmación apagada por decisión del dueño. La entrega a 08 exige identificar configuración aplicada o pendiente: el archivo de asociación pasó en servidor local con el certificado real debug y preservación de TWA; su publicación con paquete/firma finales se registra para 16/18, sin atribuir verificación pública inexistente ni publicar el sitio desde esta etapa.

**Configuración inicial comprobada en el panel del proyecto `uqhsyayfvhwlduioghtu`:** alta, email y Google habilitados; confirmación de email **desactivada**, invitados habilitados para la web y vinculación manual desactivada. `Site URL` es `https://trucazo.com.ar`. Las tres redirecciones previas eran `https://trucazo.com.ar/auth/callback`, `http://localhost:3000/auth/callback` y `https://trucazo.com.ar/**`. Las plantillas **Confirm sign up** y **Reset password** usan `{{ .ConfirmationURL }}` y se conservaron. Al empezar usaba correo incorporado, con sus límites; **después se aplicó Resend**, según la aceptación de abajo. [Restricciones oficiales de correo](https://supabase.com/docs/guides/auth/auth-smtp).

**Aplicado realmente:** el dueño autorizó guardar cuatro retornos locales y el panel confirmó **siete URLs en total**. Se agregaron los siguientes; `\?` representa el signo de pregunta literal, y `**` permite los parámetros de vuelta del SDK, manteniendo fija la página:

```text
http://localhost:3000/auth/mobile
http://localhost:3000/auth/mobile\?**
http://localhost:3000/recuperar-cuenta
http://localhost:3000/recuperar-cuenta\?**
```

**Implementación:** `apps/mobile/src/Register.tsx` crea la cuenta mediante Supabase y el trigger existente, sin insertar otro perfil. Respeta registro con sesión inmediata o con confirmación pendiente. `src/components/RecoveryScreen.tsx` comparte solicitud de enlace, nueva contraseña y repetición entre web/app. La app conecta esas acciones en `apps/mobile/src/auth.ts`; la web incorpora `/recuperar-cuenta` y el enlace «Olvidé mi contraseña». Sólo un retorno de recuperación verificado, de la misma cuenta y vigente, permite enviar el cambio a Supabase. El cambio común de contraseña puede completarse mediante ese recorrido; una cuenta Google conserva su ingreso con Google y la reautenticación web de eliminación.

**Google y retorno:** plugin oficial `@capacitor/browser` **8.0.5 exacto** abre Chrome Custom Tabs; no hay formulario Google dentro del WebView. El SDK usa **PKCE**: guarda en la app una comprobación que sólo ella puede presentar al canjear el código. El retorno HTTPS `/auth/mobile` ofrece «Abrir Trucazo» y transporta sólo el código de un uso, flujo, identificador del SDK y un identificador aleatorio del intento. No importa cookies/tokens de Chrome. El esquema provisional es `ar.com.trucazo.capacitor.dev://auth/callback`. Se atienden `appUrlOpen` y `getLaunchUrl` para app abierta/cerrada, cancelación, enlaces usados/vencidos, reenvío del mismo retorno y cambio de cuenta. El puente evita que el guard web intente canjear el código del APK. Esas URLs no envían analítica; tienen `no-referrer`, `no-store` y `noindex`, y el puente retira el código de la barra/historial al preparar el botón. [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Browser](https://capacitorjs.com/docs/apis/browser), [App](https://capacitorjs.com/docs/apis/app).

**Enlaces:** `src/lib/auth-links.ts` admite sólo destinos locales completos: lobby/Historia, acceso Android, eliminación web, partida con UUID y torneo/espectador con UUID. Los enlaces externos admiten únicamente HTTPS en `trucazo.com.ar` o `www.trucazo.com.ar`; se rechazan dominios parecidos, credenciales, puertos, rutas incompletas y destinos externos. Android declara `/game/`, `/torneos/` y `/auth/mobile`. Antes del login, la app conserva el destino y lo abre después; el servidor vuelve a comprobar el acceso a la mesa. La web conserva su callback/cookies y recuerda destinos protegidos, incluyendo torneos, sin permitir una redirección libre. Los detalles de torneo se implementan en 10; aquí se acredita recepción/destino y el aviso de pantalla pendiente.

**Fallback y otro navegador:** sin la app, el enlace HTTPS queda en la web. El puente permite iniciar el acceso o recuperación desde ese navegador. Un código PKCE iniciado en la app se completa en esa instalación; si se abre en otro dispositivo sin ella, se solicita un enlace nuevo desde su navegador. El dueño probó correo real fuera del APK, en Gmail de Chrome del mismo emulador, y volvió mediante «Abrir Trucazo» para cambiar su contraseña. No se hace pasar un código ligado a la app por una sesión web.

**Asociación preparada, no publicada:** el manifest usa `autoVerify`. `/.well-known/assetlinks.json` ahora puede sumar Capacitor mediante `ANDROID_CAPACITOR_PACKAGE_ID` y `ANDROID_CAPACITOR_SHA256_FINGERPRINTS`, conservando la asociación TWA existente. Consulta real del 14/10: `https://www.trucazo.com.ar/.well-known/assetlinks.json` devolvió HTTP 200 y `[]`. Por eso los ensayos de intent dirigidos a la actividad **no acreditan apertura automática desde un enlace HTTPS**. No se cambió Vercel ni se publicaron estas rutas. Al autorizar una entrega web controlada se deberán añadir los retornos de `www` correspondientes y servir la asociación; repetir con paquete, esquema y certificados finales/de Play en 16/18. El callback Google sigue siendo el de Supabase (`https://uqhsyayfvhwlduioghtu.supabase.co/auth/v1/callback`); no se requiere poner el esquema de la app como callback de Google Cloud.

| Verificación | Resultado y alcance |
| --- | --- |
| Guardados antes/después de actualizar e ingresar | Testin 299/hash final de 06/cinco comprobantes/960–24; santib 0/hash final; QA1 46/1.050–26 y QA2 45/1.050–23. Los cuatro hashes idénticos, cero pendientes. |
| Ingreso real QA | Ambas cuentas en web nueva, con sus perfiles privados; QA2 en APK por formulario normal. Sin importar sesiones entre orígenes. |
| Alta inmediata real | QA3 creada una vez desde el formulario del APK: sesión inmediata, un único perfil ordinario, 1.000 monedas/0 puntos, ningún correo de confirmación necesario. Nombre duplicado rechazado; ingreso posterior por usuario/contraseña y web comprobados. Acceso privado conservado para reutilizarla. |
| Registro con/sin confirmación, Google y recuperación | SDK real/proveedor **simulado**: prueba PKCE, confirmación pendiente y sesión inmediata, Google externo sin alta adicional, cambio de contraseña sólo tras verificar, reenvío idempotente, vencidos/usados y destinos ajenos. No envía correos ni modifica passwords reales. |
| Puente y recuperación web | Build Next real/proveedor **simulado**: HTTPS, error en fragmento, fallback, código de la app protegido del guard de Chrome, recuperación conservada por middleware, recarga, contraseñas distintas rechazadas y envío de cambio. Sin tráfico de analítica de acceso. |
| Intents instalados | APK 0.6.0/Android 11: partida/torneo válidos resueltos por el manifest (`-p`, sin forzar actividad), en frío/caliente; callbacks inválidos/host ajeno rechazados por el cliente. Destino conservado tras login QA2. Esta prueba no certifica asociación pública del dominio. |
| Mesa existente tras login | Mesa privada QA3, sin rival: app y web vuelven a «Esperando rival» después de ingresar. QA2 ajena vuelve al lobby sin entrar. Mesas de prueba canceladas por RPC normal, reembolso completo y QA3 en 1.000; cero partidas iniciadas. |
| Fallback/configuración de enlaces | Navegador sin APK: destino solicitado otra vez tras login, mesa inexistente rechazada de forma segura, torneo exige ingreso y recuperación pública conserva sus encabezados. Ruta assetlinks real en servidor aislado: huella coincide con el APK y conserva entrada TWA simulada. Configuración pública final identificada para 16/18, sin deploy. |
| Google instalado | Chrome Custom Tab/cancelación con Atrás, ingreso con app abierta, persistencia al reabrir y retorno OAuth con app cerrada aceptados. Antes del retorno frío se verificó proceso detenido; después abrió PID nuevo 15746→29107. Auth/perfil SantiBP del 04/07/2026, administrador, sin intento pendiente ni perfil nuevo. |
| Recuperación real | SMTP Resend guardado/verificado. Dueño autorizó recuperar SantiBP; perfil administrador comprobado y solicitud por formulario normal. Resend marcó Delivered; dueño recibió en Gmail fuera del APK, volvió a la app y cambió personalmente la contraseña. Lobby/identidad/permisos conservados, sin intento pendiente. No se leyó la contraseña. |
| Regresión/compilación | Tipos y build Next aprobados; lint con los siete avisos previos. Pruebas de sesión de 03, presentación web/app a 360×640, aviso offline y cuatro pruebas Android aprobadas. Sin repetir por rutina el motor/SQL de 06. |

**Entorno:** APK debug local **0.6.0/código 6**, paquete `ar.com.trucazo.capacitor.dev`, mínimo API29/objetivo API36, Android 11/WebView 133, `emulator-5554`. Certificado debug SHA-256 `586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`, el mismo de 02; no es la firma de Play. Artefacto final de **16.031.147 bytes**, SHA-256 **`2fff6ae75dee8fb2daab208b0ce761550ddeef80ede51cacfa5e609472ce3154`**, conservado en `android/artifacts/ANDROID-07/trucazo-capacitor-0.6.0-debug.apk`; metadatos en `android/generated/android-07-artifact.json`. Recursos JS del artefacto y del build final coinciden. La web nueva se construye en `android/generated/android-07-next` mediante `TRUCAZO_NEXT_DIST_DIR`; `.next` original no se reemplazó (BUILD_ID conservado `cDvhWqzQ5qXlTsReAnKa2`). Se usa el puerto 3000 con reverse del emulador; el servidor temporal 3002 se cerró. El agregado automático de tipos de esa carpeta a `tsconfig.json` se retira después del build, conservando la configuración original. Sin SQL nuevo, reset de cuentas, commit/PR, deploy público ni Play.

**Evidencia ignorada:** `android/generated/android-07-preserved.json`, `auth-fixture.json`, `web-fixture.json`, `native-links.json`, `google-cancel.json`, `registration-real.json`, `delivery.json`, `assetlinks-debug.json`, `real-table-return.json`, capturas de registro/recuperación/puente/destinos, `redirects-proposed.png` y `redirects-applied.png`; los nombres abreviados llevan `android-07-`. Credenciales/perfiles siguen en la carpeta privada de QA. Herramientas versionables: `apps/mobile/scripts/check-auth.mjs`, `check-auth-web.mjs`, `check-device-links.mjs`, `check-device-preserved.mjs`, `check-registration.mjs`, `check-auth-delivery.mjs` y `check-auth-table-return.mjs`. Ningún acceso de diagnóstico entra al bundle.

**Aplicación de 07 y configuración para el candidato final:**

1. **Google real: aceptado.** App abierta/cerrada, cancelación, perfil existente y persistencia comprobados. No repetirlo por rutina ni iniciar autorizaciones que queden esperando al dueño. Reutilizar QA para las pruebas habituales; la sesión personal actual permanece abierta.
2. **Correo real/SMTP: aplicado y probado.** El dueño informó que suele agotar la cuota diaria y autorizó conectar Resend para pruebas. Se leyó Free, 11/100 diario y 449/3.000 mensual antes del ensayo; dominio `trucazo.com.ar` verificado. Creó/pegó/guardó personalmente una clave `Trucazo Auth ANDROID-07`, Sending access, limitada al dominio. Tras recargar Supabase se comprobó SMTP activado: `hola@trucazo.com.ar`, Trucazo, `smtp.resend.com`, 465, usuario `resend`, intervalo 60 segundos y contraseña almacenada oculta. Se entregó un correo real de recuperación. No hay clave en archivos locales/chat. **Confirm email sigue apagado:** el dueño eligió mantenerlo así; se canceló el borrador sin guardarlo y se verificó 0/Save changes deshabilitado. Conservar registro de acceso inmediato; no volver a exigir confirmación como condición de 07.
3. **Registro y recuperación: aceptados.** Recuperación real de SantiBP desde correo fuera del APK hasta contraseña y lobby. QA3 autorizada expresamente y creada por formulario del APK con sesión inmediata; duplicado rechazado e ingreso normal posterior comprobado. QA1/QA2 conservados. Confirmación cubierta por SDK/proveedor simulado mientras esté desactivada. Vencidos/usados y recuperación web están comprobados con proveedor simulado; no se presentan como correos reales recibidos.
4. **App Links/configuración pública para 16/18:** funcionalidad de recepción/destino probada en 07 por manifest y esquema propio, incluido Google/correo desde Chrome. `check-auth-delivery.mjs` verificó la ruta assetlinks real con la huella del APK y compatibilidad TWA; el navegador sin APK conservó el destino y su autorización. La entrega a 08 permite configuración aplicada o pendiente identificada. Al fijar el paquete/firma final en 16, servir la asociación en ambos hosts y comprobar verificación automática; repetir con la firma de Play en 18. El dominio publicado sigue sin esa asociación: **no se certificó su autoapertura HTTPS**. No publicar el sitio ni un APK debug para convertir esta configuración final en un requisito artificial de 07.

**Valores públicos preparados y comprobados:** `ANDROID_CAPACITOR_PACKAGE_ID=ar.com.trucazo.capacitor.dev` y `ANDROID_CAPACITOR_SHA256_FINGERPRINTS=58:6E:7E:A7:5F:29:10:8F:3F:1D:85:31:0D:89:3D:23:5C:F2:23:60:DD:C7:49:D9:F5:E4:09:72:4F:A4:02:A6`. La ruta suma la entrada Capacitor a TWA, no la reemplaza. `android/generated/android-07-assetlinks-debug.json` contiene sólo la entrada debug real, sin la huella TWA ficticia usada en el ensayo. Para la entrega HTTPS añadir los retornos exactos `/auth/mobile` y `/recuperar-cuenta` de `https://www.trucazo.com.ar`, con sus variantes `\?**`, conservando los siete actuales. Mantener el callback de Google Cloud en Supabase. Antes del candidato final reemplazar paquete/esquema debug donde corresponda, volver a generar las huellas de subida/Play y comprobar ambos hosts; los valores actuales no son la identidad final de Play.

**Correo y cuota:** [Resend documenta](https://resend.com/docs/knowledge-base/account-quotas-and-limits) 100 mensajes por día y 3.000 por mes en Free; el día se reinicia a las 00:00 UTC (21:00 Argentina). Son cuotas de la cuenta: una clave nueva para Auth no reserva mensajes separados. Los planes transaccionales pagos no tienen tope diario, pero mantienen cuota mensual. [Supabase recomienda separar Auth de campañas](https://supabase.com/docs/guides/auth/auth-smtp). Se reutilizó Resend para pruebas por autorización expresa; no se contrató un plan ni se pausaron campañas. [Datos SMTP oficiales](https://resend.com/docs/send-with-smtp). La clave quedó sólo en Supabase/Resend. Evidencia: `android/generated/android-07-resend-usage.png`, `android-07-smtp-applied.png` y `android-07-recovery-delivery.json`; `smtp-prepared.png` y `resend-key-prepared.png` son borradores anteriores. Confirmación desactivada por decisión del dueño; recuperación envía correo cuando se solicita.

**Primer control al retomar (lo ejecuta el agente):** cargar `. ./scripts/android-env.ps1`, comprobar el serial y servidor local, ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `qa-accounts.mjs check`. Para construir la web usar `$env:TRUCAZO_NEXT_DIST_DIR='android/generated/android-07-next'` antes de `npm run build`, con el servidor de esa carpeta detenido. Para iniciarla usar la misma variable y `next start -p 3000`. Para el APK usar `$env:MOBILE_API_ORIGIN='http://localhost:3000'` y `npm --prefix apps/mobile run apk:debug`; instalar con `adb install -r`, actualizar el forward 9224 al PID actual y verificar otra vez. `check:auth` usa proveedor simulado; `check:auth:web` requiere el servidor Next nuevo. No reenviar resultados confirmados ni desinstalar para probar enlaces.

**Continuación del 14/10 — primer ingreso personal Google:** el dueño completó Google pero recibió el ingreso web. Se leyó sólo la dirección de retorno, con códigos/cookies ocultos: Supabase devolvió `invalid_request`, `bad_oauth_state`, **`OAuth state has expired`**, en la raíz publicada. El intento preparado llevaba aproximadamente 33 minutos; el APK conservaba su intento pero no tenía sesión Google. El código oficial de Auth comprueba el vencimiento antes de recuperar el destino del intento, por eso esta falla volvió a `Site URL`; no acredita un defecto del retorno local ni se canjeó un código vencido para crear sesión. [Implementación oficial](https://github.com/supabase/auth/blob/master/internal/api/external.go). Se abrió un intento nuevo por el botón normal, cerrando sólo el popup de pruebas y conservando el ingreso de Google en Chrome. No se cambiaron contraseñas, duración de seguridad, URLs, APK ni lógica de juego. Guardados nuevamente idénticos. Evidencia sin credenciales: `android/generated/android-07-google-retry.json`; se pidió completar el intento fresco y tocar «Abrir Trucazo». Para próximas pruebas personales, abrir Google cuando el dueño esté listo, sin dejar la autorización estacionada durante el trabajo técnico.

**Segundo intento personal del mismo día:** el dueño informó que también demoró en completar el nuevo intento. La dirección de retorno volvió a confirmar `bad_oauth_state` / `OAuth state has expired`, sin sesión en el APK. Se cerró únicamente el popup y se dejó el ingreso nativo con «Continuar con Google» habilitado, **sin iniciar otra autorización**. El dueño debe tocar ese botón cuando esté listo, elegir la misma cuenta y tocar «Abrir Trucazo» al regresar. Así el intento comienza en su momento de uso. Evidencia: `android/generated/android-07-google-ready-button.json` (`owner: null`, `googleButtonReady: true`, `newAttemptStarted: false`). La aceptación personal sigue pendiente; no se modificaron los vencimientos ni la configuración para evitar esta protección.

**Primer hito personal del mismo día — Google real:** el dueño inició el recorrido cuando estaba listo y confirmó que Google abrió el lobby. El agente comprobó mediante `GET /auth/v1/user` que la sesión pertenece a **SantiBP**, UUID `d1512143-e3c0-44c3-8f2c-8904197f5fdb`, con identidades email/Google y cuenta creada el **04/07/2026**. La consulta de `profiles` devolvió ese mismo UUID y perfil de julio: se reutilizó el perfil existente. Lobby visible, sin intento pendiente; después de detener/reabrir el proceso del APK, la identidad seguía verificada y el lobby volvió sin pedir ingreso. La ruta inicial vacía es el lobby normal, además de `#/lobby`; el primer diagnóstico esperaba sólo el hash y se corrigió esa expectativa y la espera de arranque, sin cambiar el producto. Los cuatro guardados finales de 06 conservaron sus hashes y cero pendientes. Evidencia sin credenciales: `android/generated/android-07-google-persist.json` y `android-07-preserved.json`. En ese momento estaban pendientes Google en frío y SMTP; ambos se aceptaron después, en el siguiente registro. Se revisó [la configuración documentada de Resend](backend.md#configuracion-base) y se comprobó que no había `RESEND_API_KEY` ni `EMAIL_FROM` en el entorno local.

**Aceptación final del mismo día — SMTP, recuperación y Google en frío:** el dueño autorizó Resend y completó personalmente creación/pegado/guardado de la clave limitada; Supabase recargado confirmó el cambio. Autorizó recuperar su cuenta administradora SantiBP: se comprobó `is_admin`, se pidió el enlace mediante el formulario normal, Resend informó **Delivered** y el dueño confirmó recepción, vuelta desde Gmail de Chrome a la app, contraseña nueva y lobby. El agente verificó identidad, perfil/permisos, ausencia de intento pendiente y los cuatro hashes intactos. No leyó ni almacenó la contraseña. Después se acordó repetir Google con app cerrada: salida local normal, Google en Chrome, APK detenido con PID 15746 ausente y Chrome todavía abierto. «Abrir Trucazo» inició PID **29107** y volvió al mismo UUID/perfil administrador, sin intento pendiente. Evidencia: `android/generated/android-07-recovery-request.json`, `android-07-recovery-delivery.json`, `android-07-native-identity.json`, `android-07-google-cold-prepared.json`, `android-07-google-cold-return.json` y `android-07-preserved.json`. La nueva contraseña personal no pertenece al archivo privado de QA; esas cuentas conservan sus accesos. Finalmente el dueño eligió **mantener Confirm email apagado**: se canceló el borrador sin guardarlo y se comprobó el valor 0, con Save changes deshabilitado (`android-07-confirm-email-off.png`). La confirmación era un punto del plan original, no una exigencia técnica del APK; queda apartada de la aceptación real mientras siga desactivada. No crear una cuenta nueva ni exigir activar ese ajuste para justificar una prueba.

**Cierre de 07 del mismo día — alta y destinos reales:** tras el pedido expreso de completar cada etapa en su propia sesión, se guardó la regla en AGENTS/CLAUDE/README y este plan. El dueño autorizó QA3 para la única alta necesaria: formulario instalado → sesión inmediata → perfil único ordinario con 1.000 monedas/0 puntos. Duplicado rechazado y login posterior por usuario/contraseña en app/web aprobados. Enlaces válidos se resolvieron por el manifest; ajenos/callbacks inválidos se rechazaron. Una mesa privada existente de QA3 recibió el destino tras login en app y web; QA2 ajena fue rechazada. Las mesas transitorias de comprobación se cancelaron por la función normal, con reembolso completo, cero partidas y saldo final 1.000. El fallback sin APK y el archivo de asociación local con certificado real pasaron; se identificó con precisión qué se aplica con el paquete/firma finales en 16/18 conforme al criterio de entrega de 07. Última verificación: QA1 1.050/26, QA2 1.050/23 y QA3 1.000/0; cuatro hashes de 06 idénticos, todos sin pendientes, credenciales privadas con ACL conservada. APK final en lobby de QA2; servidores temporales de prueba cerrados y Next 3000 original de 07 conservado. No se empezó 08 ni hubo nueva compilación de APK, SQL de esquema, commit/PR, deploy ni publicación. **ANDROID-07 cerrada; próxima sesión 08.**

<a id="android-etapa-08"></a>

#### ANDROID-08 — Perfil, progreso y personalización

**Empieza con:** 07 cerrada y servicios autenticados disponibles.

**Trabajo:** adaptar perfil, avatar/historial/estadísticas/medallas, ranking, tienda, equipamiento y los objetivos/cofres vigentes accesibles desde el lobby. Llevar consultas de páginas servidor a un flujo autorizado de la app. Conservar precios, saldos, premios y reclamos bajo SQL. Completar Historia online y selección de campaña offline, requisitos, tutoriales, provincias, revanchas y presentación del progreso confirmado/pendiente. Usar íconos, fuentes, cosméticos, imágenes y sonidos compartidos.

**Verificación y final:** inventario del conjunto cubierto, sin enlaces a pantallas faltantes. Perfil/ranking/historial coinciden con web; compra/equipamiento con monedas ficticias se refleja en ambas interfaces y en la mesa. Reclamos repetidos de cofre/recompensa no duplican saldo; guardado/actualización no reinicia misiones o tutoriales de otra cuenta. Foto actualizable y cacheada por dueño para Historia. Desbloqueos/revanchas y 15/30 siguen reglas oficiales; recorridos por cada región y límites automatizados registrados.

**Entrega a 09:** lista de pantallas/acciones cerradas, comparaciones visuales y movimientos de saldo de prueba. No agregar monetización o misiones nuevas.

<a id="android-08-perfil"></a>

##### Perfil, economía e Historia — cierre del 15/10/2026

**Estado: ANDROID-08 cerrada.** Se comprobó primero el servidor de 07, los cuatro hashes finales de 06 y el ingreso normal de las tres QA. Se relevó la implementación web antes de adaptar la app. La entrega conserva reglas, precios, premios, ranking y catálogos; no agrega misiones, cobros ni modalidades. No se empezó 09 ni se publicó.

| Pantallas/acciones de 08 | Implementación y aceptación |
| --- | --- |
| `/profile` | Foto, saldo, estadísticas, últimas 20 partidas, medallas ganadas/bloqueadas y selección de destacada. `ProfileScreen` y `loadProfile` compartidos con web. La acción de eliminación abre explícitamente el navegador; su integración final pertenece a 15. |
| `/ranking` | Mismo top 50 online, orden, efectividad, medallas y fila propia que la web; no confundir con el ranking de Historia. `RankingScreen` y `loadRanking` compartidos. |
| `/tienda` | Catálogos completos de salones, marcos y accesorios; saldo insuficiente, compra, uso, retiro y vista previa de mesa. `TiendaClient` y `loadShop` compartidos. Compras/equipamiento validados por RPC, sin cálculo de saldo oficial en la app. |
| Lobby/cofre | Se reutilizan bono, misiones diarias, desafío semanal, racha, reclamo y saldo existentes. El cliente sólo presenta lo confirmado por SQL. No se reemplazó el catálogo ni se crearon objetivos nuevos. |
| `/historia` | Mapa online, fama/estilo, ranking de Argentina, provincias, requisitos, primera partida y revancha. Consulta `get_campaign_map` y llama `start_campaign_duel`; el servidor decide acceso y objetivo 15/30. La mesa recibe también el retrato del rival. |
| `/historia/offline` | Descarga, actualización, mapa/mesa guardados y sincronización de 06. Acceso desde Historia online y desde el lobby sin red; permite volver a online. La ventana de guardado distingue puntos confirmados, puntos en este dispositivo y monedas pendientes. |
| Cuenta/actualización | Los tutoriales y avisos del mapa ahora se separan por dueño en web/app; no se borran claves históricas. La primera visita bajo ese alcance es propia de cada cuenta. Actualizar la descarga conservó misiones, desafío semanal, racha y todas las claves de tutorial. Foto descargada dentro del guardado privado del dueño. |

**Cambios concretos:** las páginas servidor usan consultas compartidas en `src/lib/player-data.ts`, en paralelo cuando son independientes. La app autentica, monta la misma presentación y descarta cargas si cambia la identidad. Incluye estilos de perfil/ranking/tienda y los recursos reales. Se corrigió el inicio de Historia web: la RPC devuelve una fila `games`, por lo que se navega a `data.id`; antes convertía la fila entera en dirección. La app usa el mismo contrato. Los destinos internos nuevos se conservan tras ingreso sin aceptar URLs libres. No se modificó SQL de producción.

**Aceptación real:** APK Android 11/WebView 133, **360×568**, Next local y Supabase real. QA1/QA2/QA3 ingresaron sin recrearlas. Perfil, historial, ranking y tienda dieron el mismo contenido en web/app; tipografía, color, tamaño y geometría de perfil coincidieron. Capturas revisadas de perfil, ranking, tienda, vista previa, mapa, foto y mesa equipada. QA3 abrió a Tobías online a 15 con Cafetín, marco Bronce, botella y foto propia; todos los controles dentro de pantalla. La partida se terminó por abandono normal, sin premio ni cambio de monedas. No se acredita con esto un teléfono físico, Android 16 ni Play: siguen en sus etapas asignadas.

| Movimiento real QA3 | Antes | Importe | Después |
| --- | ---: | ---: | ---: |
| Comprar Cafetín | 1.000 | −250 | 750 |
| Comprar marco Bronce | 750 | −200 | 550 |
| Comprar botella de agua | 550 | −150 | 400 |

Cada compra repetida se rechazó y conservó el saldo. Los cosméticos y la foto se confirmaron en la web y la mesa. QA3 queda con **400 monedas/0 puntos**, sin premios inventados ni ajuste administrativo. Descarga propia inicial revisión 0; actualización con el APK final revisión **1**, foto JPEG cacheada, 15 provincias/66 rivales y cero pendientes. Reapertura en **modo avión real**: mapa disponible, foto aún en el guardado y sin recursos faltantes. La red volvió a su estado normal.

**Pruebas automatizadas:** `check:player` usa interfaz empaquetada/SDK y PostgreSQL descartable con funciones vigentes; Auth/PostgREST se simulan y no son pruebas de producción. Cubre historial privado, catálogo/equipamiento, compra doble, propiedad ajena, fondos insuficientes, bono único, cofre visible y doble reclamo sin doble saldo. El cofre acreditó 20 una vez; tres compras locales de 100 dejaron 1.720 desde 2.000. Separación A/B y aviso offline aprobados. Las 66 aperturas/revanchas SQL, incluyendo acceso directo bloqueado y metas 15/30, pasaron. `check:offline-campaign`: **59.940 desbloqueos y 1.650 premios** iguales al SQL. Recorrido de mesa por las **15 provincias en el WebView instalado**, progreso alto sólo en memoria: controles completos, cero imágenes faltantes, guardado idéntico. Regresiones `check:history`, `check:sync` y acceso/destinos con proveedor simulado aprobadas. Tipos, build Next y APK aprobados; lint mantiene sólo los siete avisos previos. No se reabrió Google/correo reales ni se enviaron campañas.

**Guardados finales:** los cuatro de 06 conservan exactamente sus hashes, revisiones y comprobantes. QA3 añade `95048fc6d7a300b74df251d1d7c9a657c96b898ae23f4776b67ebe66a73d1f6c`, revisión 1, cero pendientes/recibos, 400/0. `check-device-preserved.mjs` ahora comprueba los cinco y escribe `android/generated/android-08-preserved.json`. Consulta final de servidor: testin 960/24, santib 250/0, QA1 1.050/26, QA2 1.050/23 y QA3 400/0. El guardado antiguo de santib sigue con su foto histórica de saldo 220, sin actualizarlo o confundirlo con el saldo actual del servidor. No se importó la base o sesión de Chrome. Credenciales y perfiles QA siguen privados, sin reset.

**Artefacto y servidor:** APK debug **0.7.0/código 7**, paquete `ar.com.trucazo.capacitor.dev`, API29 mínimo/API36 objetivo, **15.829.408 bytes**, SHA-256 **`cdced0ce94767ed9f7c631b655c01783c68beed4a414f16106e2b2e748d10f96`**. Firma debug verificada, idéntica a las etapas previas (`586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`). Copia en `android/artifacts/ANDROID-08/trucazo-capacitor-0.7.0-debug.apk`; metadatos en `android/generated/android-08-artifact.json`. Instalado con `adb install -r`, sin desinstalar. Next final en puerto **3000**, `TRUCAZO_NEXT_DIST_DIR=android/generated/android-08-next`, build **`U0c8TsR_qB1KJVhzNPYy7`**; PID en `android/generated/android-08-live.pid` (4916 al cierre). Servidores 07 y preview 3002 cerrados por PID identificado; `.next` original intacto. Reverse 3000/forward 9224 conservados. Ningún commit/PR, migración remota, deploy ni publicación.

**Evidencia local ignorada:** `android/generated/android-08-` + `native-player.json` (compras/foto), `native-player-final.json` (comparación final de las tres QA), `native-campaign-player.json` (descarga), `offline-reload.json`, `refresh-preserved.json`, `native-regions.json`, `player-rules.json`, `player-browser.json`, `preserved.json`, `artifact.json` y logs/capturas del mismo prefijo. `qa3-equipped-online-table.png` conserva la aceptación de mesa. El primer recorrido instalado terminó esa partida y falló después al buscar demasiado pronto el botón de descarga; se corrigió la espera del diagnóstico y se completó sólo la descarga, sin repetir la partida. Los errores de preparación de fixtures locales se corrigieron antes de aceptar sus resultados. Las mediciones generales de la app siguen asignadas a 15; el ensayo de cofre simula la recepción de analítica sin enviar tráfico real.

<a id="android-etapa-09"></a>

#### ANDROID-09 — Parejas completas

**Empieza con:** 08 cerrada, 1v1 estable y documentación de [parejas](juego.md#parejas) leída desde su entrega final.

**Trabajo:** adaptar entrada y controlador 2vs2, puestos/equipos, composición con bots, controles, cantos/respuestas/declaraciones, chat/frases, relojes, resultado y revancha. Conservar presentación y contratos SQL existentes, privacidad de `team_hands` y comportamiento de compañeros/bots. Integrar recuperación, invitaciones y equipos con el lobby de la app.

**Verificación y final:** todas las composiciones permitidas con bots y personas, 15/30, turnos/cantos/mazo/pardas/tiempos según pruebas SQL vigentes; premio único del equipo. Al menos una mesa mixta app/web completa con cuentas de prueba, y desconexión/reingreso de un jugador. Manos privadas, controles de cuatro puestos y cantos largos visibles en una pantalla. Chat escrito permitido según reglas; campaña sigue sin chat escrito.

**Entrega a 10:** matriz de composiciones/casos aprobada, evidencia de mesa mixta y pendientes previos descartados con fecha. No reimplementar las reglas de una auditoría histórica ya resuelta.

<a id="android-09-parejas"></a>

##### Parejas en la app — aceptación del 15/10/2026

**Estado: ANDROID-09 cerrada.** Servidor de 08 y los cinco guardados comprobados antes de adaptar. Se leyó la entrega final de parejas y el comportamiento de bots en Juego. La app monta `TeamGameClient`, su espera, puestos, presentación, chat y resultado compartidos con la web. `loadTeamGame` consulta snapshot/perfil en paralelo y descarta respuestas si cambia la cuenta; no calcula reglas ni premios. Entrada desde creación, mesas públicas, código privado, «Volver a mi mesa» y enlaces de acceso. La recuperación al volver de una suspensión consulta el estado confirmado. El build incluye estilos de parejas y la bandera del chat escrito existente; Historia continúa sin chat escrito.

**Contrato conservado:** compañeros 0/2 y 1/3; prioridad humana, cartas privadas, cantos, declaraciones, reloj, mazo y monedas siguen en SQL. La entrega vigente no tiene revancha automática ni invitación directa a parejas: repetir es volver al lobby y crear otra mesa; invitar es compartir su código. Se comprueba ese recorrido sin agregar reglas/RPC nuevas. La espera abre visible, conforme a la regla de rendimiento del proyecto. Sin migraciones remotas, cambios de confirmación/SMTP, cuentas nuevas ni publicación.

| Composición permitida | SQL aislado a 15 y 30 | Aceptación instalada |
| --- | --- | --- |
| Cuatro personas | Aprobada | Cubierta por SQL/UI; se reutilizan sólo las tres QA reales |
| Tres personas y un bot | Aprobada | APK QA3 + web QA1/QA2, mismo Supabase real |
| Dos personas compañeras y dos bots | Aprobada | Controlador compartido; matriz SQL |
| Dos personas rivales y dos bots | Aprobada | Dos clientes empaquetados y SQL en navegador |
| Una persona y tres bots | Aprobada | APK QA3 a 30, resultado por puntos y cero vencimientos |

**Pruebas aisladas:** `npm --prefix apps/mobile run check:team` ejecuta `supabase/tests/team_games.sql` en PGlite con Auth/cron de prueba y el esquema necesario para parejas, sin los triggers externos de estadísticas/medallas del 1v1. Pasa motor, diez partidas completas (cinco composiciones × 15/30), relojes 15/30, declaraciones, interrupción del truco por envido, mazo en seis estados, nueve patrones de rondas/pardas, privacidad/RLS, versión vieja, acción repetida, pagos, tres vencimientos, recuperación, abandono, mantenimiento y pedidos/nombres/frases de bots. El chat escrito comprueba permisos, respuesta única al reintento y conservación de versión/reloj. No certifica concurrencia entre conexiones a Supabase.

**Interfaz empaquetada:** creación, asientos/bots/inicio, siete permisos de respuesta, chat escrito/frases, red/recarga, resultado y regreso aprobados con SQL real y Auth/PostgREST/WebSocket simulados. Controles completos sin desplazamiento en **360×568, 320×568, 768×1024 y 640×360**. Regresión 1v1 completa aprobada, incluidos red, resultado y revancha; acceso/destinos con proveedor simulado, presentación, tipos y build Next/APK aprobados. Lint conserva los siete avisos previos. El comprobador de RPC reconoce la ubicación compartida de `get_login_email` desde 07: **98 RPC cliente y siete sólo servidor**, sin cambiar permisos.

**Aceptación real:** APK Android 11/WebView 133, 360×568, Next local y Supabase real. Mesa privada con QA3 en app y QA1/QA2 en web; chat escrito recibido en ambos sentidos, envido declarado en orden, truco suspendido/retomado y cartas jugadas mediante controles normales. Los siete permisos de respuesta entran completos en el APK, sin desplazamiento ni imágenes faltantes. Cierre forzado del proceso nativo y reingreso desde «Volver a mi mesa» conservan exactamente asiento, mano, jugadas y hora de inicio del turno. La partida definitiva termina por puntos con cero vencimientos de las tres personas. Después se vuelve al lobby, se crea otra mesa a 30, se elige otro puesto y se completa con tres bots: resultado por puntos, cero vencimientos, nombres distintos, frases y respuesta del compañero a «¿Qué hago?» comprobados. Repetir dos veces una acción de cierre de ambas partidas conserva los saldos.

| Partida real (apuesta 10 por persona) | Resultado | Registro |
| --- | --- | --- |
| Primera mixta, diagnóstico interrumpido y retomado | QA1 + Tincho_Ok 15; QA3 + QA2 14 | `b16007d8-be9a-4f64-a1d9-dd1923a79176` |
| Mixta definitiva, cierre/reapertura aceptados | QA1 + Dai_Corrientes 15; QA3 + QA2 5 | `26db3dae-735d-473e-9cff-dce6ceb8213e` |
| APK y tres bots a 30 | QA3 + Pipa_Ok 15; Beto.Truco + ElPolacoDani 30 | `02ad45c3-8d05-4996-9d67-0865199eedb1` |

La primera mesa tuvo vencimientos durante los fallos del diagnóstico (QA1 dos, QA2 uno); se conservó y terminó por puntos. No se reinició ni compensó el resultado. Las dos aceptaciones posteriores tienen cero vencimientos. Saldos reales desde el inicio de 09: QA1 **1.050 → 1.070**, QA2 **1.050 → 1.030**, QA3 **400 → 370**. Cada ganador humano cobra 20 tras apostar 10; no se ajustaron monedas por administración. Puntos/progreso de Historia sin cambios. Los cinco guardados repiten los hashes de 08, revisiones **299/0/46/45/1**, pendientes **0** y comprobantes **5/0/1/1/0**. Sus fotos de saldo anteriores se conservan deliberadamente; el lobby consulta el saldo actual del servidor. Confirmación de correo apagada (`mailer_autoconfirm=true`) comprobada de sólo lectura. Teléfono físico, API36 instalada y Play conservan sus etapas posteriores; no son pendientes de este cierre.

**Artefacto local:** APK debug **0.8.0/código 8**, mínimo API29/objetivo API36, **16.073.744 bytes**, SHA-256 **`2cf55e58d34c18d7904d101d0ddc5c2133ee1d2b6dc36e7320406af3e6102f18`**. Firma debug idéntica a 08. Copia en `android/artifacts/ANDROID-09/trucazo-capacitor-0.8.0-debug.apk`; metadatos en `android/generated/android-09-artifact.json`. Instalado por `adb install -r`, sin borrar datos. Next en 3000 con `TRUCAZO_NEXT_DIST_DIR='android/generated/android-09-next'`, build **`G_WQSACAkqg94_8gNockE`**, PID **8592** en `android/generated/android-09-live.pid`. Preview 3002 cerrado al terminar; `.next` original, TWA, Chrome, claves y perfiles QA conservados. Reverse 3000/forward 9224 activos; APK en lobby QA3 sin mesa abierta. Sin commit/PR, migración remota, deploy ni publicación.

**Evidencia de trabajo:** `android/generated/android-09-rules.json`, `android-09-browser.json`, `android-09-long-*.png`, `android-09-auth.log`, `android-09-1v1-*.log`, `android-09-preserved.json`, `android-09-first-mixed.json`, `android-09-real*.json/png/log` y registros de build. Credenciales y perfiles QA continúan en su carpeta privada ignorada. Los fallos de espera del diagnóstico se registran en los logs; no se atribuyen al motor ni se borran sus partidas.

<a id="android-etapa-10"></a>

#### ANDROID-10 — Torneos y espectadores

**Empieza con:** 09 cerrada y contrato vigente de [torneos](juego.md#torneos) leído; su backend ya está implementado.

**Trabajo:** llevar central/detalle, inscripción individual/en pareja, espera, check-in, avisos, calendario, grupos/llaves, entrada/reingreso a partidas, resultados y premios. Adaptar espectador autorizado sin cartas ocultas. Conservar rutas y acciones administrativas de torneo según rol, recuperación de enlaces y estados de pausa/cancelación/reprogramación. Reutilizar el backend; no ejecutar nuevamente sus migraciones ni habilitar torneos reales para un ensayo.

**Verificación y final:** recorrido completo de torneo 1v1 y 2vs2 en entorno/cuentas de prueba, incluida inscripción, check-in, acceso a mesa, cierre y premio único. Probar cupo/espera, falta de check-in, compañero desconectado, torneo pausado/cancelado y espectador app/web con snapshot público. Administración sólo accesible al rol válido; un usuario normal no obtiene permisos por navegar a la ruta. Correos/eventos se prueban sin contactar terceros no autorizados.

**Entrega a 11:** rutas/estados cubiertos, torneos y resultados de prueba identificados, entorno y límites de aceptación. Recepción push nativa pertenece a 13.

<a id="android-10-torneos"></a>

##### Torneos y espectador — cierre del 15/10/2026

**Estado: ANDROID-10 cerrada.** Primero se comprobó Next de 09, el ingreso de las tres QA y los cinco hashes de 08; después se leyó la entrega vigente de torneos en Juego. Se reutilizan sus componentes y RPC, sin migraciones nuevas ni cambios de reglas. No se empezó 11, no se crearon torneos en Supabase ni se publicó.

| Rutas y acciones | Adaptación y aceptación |
| --- | --- |
| `/torneos` | Central compartida, próximos/en juego/anteriores, calendario y avisos de inscripción, cruce, reprogramación y cancelación. La central vacía coincide entre APK QA3 y web QA1/QA2 contra Supabase real. |
| `/torneos/[id]` | Inscripción individual, invitación/aceptación de pareja, espera, check-in, participantes, premios, grupos y llaves. Entrada, espera de los demás y regreso a mesas 1v1/parejas existentes. Recarga, pérdida/retorno de red y reapertura consultan el estado del servidor. |
| `/torneos/[id]/partidas/[matchId]` | Mismo espectador público en app/web; valida que el cruce pertenezca al torneo del enlace. Marcador, jugadores y cartas ya jugadas, con actualización automática; sin manos ocultas. Vista compacta compartida, sin desplazamiento ni cartas cortadas en cuatro tamaños. |
| `/admin/torneos`, `/nuevo`, `/[id]` | Listado, formulario y controlador web compartidos: crear/editar/publicar, agenda, cancelar/borrar, inicio/pausa/reanudación, reemplazos/descalificación, reintentos y monitor. Se verifica `profiles.is_admin` antes de cargar; las RPC mantienen su control independiente. Acceso ordinario rechazado en APK y SQL; rol administrador probado sólo en la base aislada. |
| Enlaces y estados | Manifest admite también la central `/torneos`. Destinos de detalle/espectador conservados; enlace con app cerrada conserva QA3. Torneo/cruce inexistente muestra error recuperable. Pausa conserva el contrato vigente: los cruces abiertos continúan y la ronda siguiente espera; ahora también se explica al jugador. Cancelación/reprogramación y avisos comprobados. |

**Pruebas SQL aisladas:** `check-tournament-rules.ts` ejecuta las cinco suites existentes `tournaments`, `tournaments_competition`, `tournaments_teams`, `tournaments_final` y `tournaments_delete`. Pasan cupos/espera, check-in ausente y reemplazos, compañero ausente/plantel incompleto, grupos/clasificación, ausencia, pausa/reanudación, descalificación, acceso/RLS, apuestas cero, estadísticas/misiones, cierre y premios únicos, agenda/cancelación/correos, espectador y borrado lógico sin perder premios. `tournamentFixture` monta los contratos en PGlite, con Auth/cron locales y `net.http_post` bloqueado. No prueba concurrencia entre conexiones a Supabase ni entrega real de email.

**Recorridos de interfaz:** `check-tournament-browser.mjs`, desde la raíz o mediante `npm --prefix apps/mobile run check:tournaments`, usa el SDK y la interfaz empaquetada con PostgreSQL real local; Auth/PostgREST/WebSocket son andamiaje de prueba. Se repite con `--device` en el APK Android 11/WebView 133: sesión real QA3 conservada, REST de juego/torneos interceptado únicamente durante el ensayo y restaurado al terminar. QA1/QA2 y los participantes adicionales son identidades representadas en esa base local, sin altas remotas. Inscripción, pareja, check-in explícito tras reprogramar, espera por cupo, acceso, falta de compañero, pausa, carta jugada mediante el control, espectador app/web, reingreso, resultado y posiciones finales aprobados. También formulario administrativo guardado/publicado en la base descartable y rechazo ordinario. La pérdida/retorno de red del WebView se simuló mediante diagnóstico, sin modificar Android permanentemente.

Para recorrer todas las rondas sin volver a ensayar cientos de manos, los cierres restantes usan los mismos helpers SQL internos que llaman los motores; **no se presentan como partidas completas jugadas manualmente ni competencias remotas**. Se repiten los cierres y se conservan saldos/premios únicos. Los motores completos ya aceptados se regresaron aparte. Los torneos aislados finales del APK quedaron identificados así; desaparecen al cerrar PGlite, con su evidencia JSON conservada:

| Modalidad/formato | Jugadores | Torneo aislado | Premios individuales |
| --- | ---: | --- | ---: |
| 1v1, eliminación | 4 | `8c578057-aba7-44de-8438-7fea04a92b57` | 3 |
| Parejas, eliminación | 8 | `48b3679b-a16d-4044-9dd2-1cf820a24ded` | 6 |
| 1v1, grupos + eliminación | 8 | `b85dd208-4bf8-4ed3-8121-f683e40943fa` | 3 |
| Parejas, grupos + eliminación | 16 | `77d5acac-903a-4297-8924-05413a3bb4dd` | 6 |

El espectador con cartas entra completo en **320×568, 360×568, 768×1024 y 640×360**; también se comprobó el WebView instalado de 360×568. No se agregó scroll, ocultamiento de controles ni un diseño alternativo para la app. Regresiones de acceso con proveedor simulado, 1v1 y parejas aprobadas; tipos, contratos de torneos/RPC, build Next y APK aprobados. Lint conserva los siete avisos previos. Los errores iniciales del andamiaje (tablas de prueba faltantes, diálogo de publicación, CORS del diagnóstico y espera de confirmación de carta) se corrigieron antes de aceptar resultados; la revisión visual corrigió el espectador largo. Los logs locales conservan el diagnóstico disponible, sin partidas remotas creadas ni compensaciones.

**Lecturas reales finales:** `check-device-tournaments.mjs` verifica central vacía en las tres QA, detalle inválido en caliente, espectador inválido en frío, identidad conservada y rol rechazado. La RPC real y la consulta administrativa confirman **cero torneos ANDROID-10 y cero inscripciones QA**; el torneo histórico cancelado/borrado no se reactivó. Los emails técnicos `.test` de QA están excluidos por el contrato de elegibilidad de torneos; se mantuvieron así y la competencia se probó en el entorno aislado. No cambiar sus emails/permisos para repetir esta aceptación. `GET /auth/v1/settings` devuelve `mailer_autoconfirm=true`: **Confirm email sigue apagado**. No se enviaron correos ni se tocó SMTP/Google/recuperación.

**Datos conservados:** los cinco guardados repiten exactamente los hashes de 08, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0**. QA3 conserva descarga, foto y equipamiento. Saldos/puntos oficiales sin cambios durante 10: testin **960/24**, santib **250/0**, QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**. Las fotos históricas de saldo del guardado se conservaron; Chrome/TWA y sus datos no se operaron. APK final en lobby QA3, sin mesa ni torneo abierto, red y puentes restaurados.

**Artefacto final:** APK debug **0.9.0/código 9**, paquete `ar.com.trucazo.capacitor.dev`, API29 mínimo/API36 objetivo, **16.116.083 bytes**, SHA-256 **`69ad19378efa3ffe6f299750fc0678b6977f40b8015cd704afd09674c164fcfe`**. Firma debug verificada e idéntica a 09 (`586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`). Instalación mediante `adb install -r`, sin desinstalar. Copia `android/artifacts/ANDROID-10/trucazo-capacitor-0.9.0-debug.apk`; metadatos `android/generated/android-10-artifact.json`. Next final en **3000**, `TRUCAZO_NEXT_DIST_DIR='android/generated/android-10-next-final'`, build **`Co_1AbIoLxEHllX8SmVgT`**, PID **20228** en `android/generated/android-10-live.pid`. Se cerraron sólo los servidores locales identificados de 09 y el primer build de 10. `.next` original y compilaciones anteriores conservadas; no queda servidor de pruebas temporal.

**Evidencia ignorada:** `android/generated/android-10-` + `rules.json`, `browser.json`, `native.json`, `real.json`, `preserved.json`, `artifact.json`, logs de build/regresión y capturas `native-*`, `real-*`, `*-spectator-*`. `--device` sólo funciona con el WebView debug conectado a 9224; su interceptor no forma parte del APK. Teléfono físico, API36 instalada, push, paquete/firma final y Play conservan sus etapas posteriores. No hubo commit/PR, migración remota, deploy ni publicación.

<a id="android-etapa-11"></a>

#### ANDROID-11 — Comunidad, funciones sociales y rutas restantes

**Empieza con:** 10 cerrada y el inventario actualizado de 01/08/10.

**Trabajo:** adaptar comunidad/chat global, amigos, grupos, presencia/invitaciones, reseña/soporte con imágenes, preferencias y páginas de ayuda/reglas/contacto. Completar las rutas administrativas existentes permitidas por rol que aún falten, sin exponer claves o ejecutar campañas de prueba contra destinatarios reales. Revisar enlaces internos/externos y todos los accesos de menús. Conservar semántica de silenciar chat, bots sin texto libre y campaña sin chat escrito.

**Verificación y final:** flujos sociales entre dos cuentas, chat con autorización/límites, cambios de presencia, invitaciones y regreso a juego. Subida/cancelación de avatar e imagen de soporte desde selector Android; fallo/red sin archivos huérfanos innecesarios; imagen/URL accesible sólo según la política existente. Envío de soporte se verifica con destinatario de prueba autorizado. Inventario completo sin funciones omitidas, rutas rotas o pantallas de usuario reemplazadas por otro diseño.

**Entrega a 12:** superficies de contenido de usuarios, roles y proveedores/datos utilizados; todas las pantallas adaptadas. No marcar comunidad lista para lanzamiento hasta cerrar moderación en 12.

<a id="android-11-comunidad"></a>

##### ANDROID-11 — avance y aceptación del 15/10/2026

**Estado: Cerrada.** Inventario de 01 y traspaso de 10 contrastados antes de adaptar. Servidor 3000 respondió 200; cinco guardados conservaron hashes/revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0**. Las tres QA ingresaron con saldos **1.070/26, 1.030/23, 370/0**; confirmación de email leída apagada, sin cambiar SMTP/configuración. El dueño confirmó la recepción del único aviso de soporte autorizado; enlace temporal e imagen privada comprobados técnicamente.

| Superficie relevada | Adaptación de 11 |
| --- | --- |
| Comunidad, chat global, amigos, grupos, presencia e invitaciones | Componentes web originales, RPC y Realtime existentes dentro del APK; identidad de la sesión propia. Solicitud/aceptación, eliminar amistad, crear/invitar/unirse/salir/eliminar grupo y rechazar/cancelar juego comprobados app QA3/web QA1 contra Supabase real, sin cambios de monedas. Chat/novedades y aceptación de juego hasta mesa/resultados comprobados con SQL aislado; no se publicaron mensajes ni novedades reales. |
| Reseña y soporte con imágenes | `ResenaScreen` compartida; regreso conserva el identificador de partida y el agradecimiento. `/api/feedback` acepta cookies web o Bearer de app y conserva la RPC/validaciones. El servidor prepara enlaces temporales a las imágenes propias; la app/navegador envía el aviso Web3Forms, como exige el proveedor. El aviso sigue siendo opcional: un fallo o espera no convierte una reseña guardada en otro envío ni borra sus imágenes. |
| Subidas y cancelación | Selector real de Android para foto y adjunto; cancelar conserva el borrador. Se conserva el formulario durante el refresco al volver del selector. `/api/uploads/cleanup` comprueba dueño y referencias antes de retirar una subida fallida: no borra foto activa ni imágenes de reseñas ya guardadas. Foto de prueba QA2 restaurada a null y archivo temporal retirado; QA3 conserva su foto/equipamiento. |
| Preferencias | Pantalla web reutilizada; API de lectura/escritura por cuenta o token del enlace. Guardar y baja total reales mantienen las cuatro opciones QA apagadas. Enlace frío de preferencias y comunidad en caliente aceptados en APK, sin imprimir tokens. |
| Ayuda y contenido | Calculadora, cuatro guías, seis páginas explicativas, acerca de/contacto/privacidad/términos con los componentes originales empaquetados. Calculadora conserva selección, enlaces de ejemplos y URL pública para compartir. Accesos desde menú del lobby e índice de ayuda; enlaces externos identificados. Eliminación conserva su salida al navegador y la adaptación completa corresponde a 15. |
| Administración pendiente de 10 | Estadísticas/filtros/personas/ficha, adquisición y correos dentro de la app. Pantallas reutilizadas; lectura de correos y cambios usan transporte autenticado con comprobación de rol en servidor. Rechazo de las tres rutas de campañas y lectura administrativa comprobado con QA ordinaria real; paneles y borrador inactivo verificados en APK con REST/API ficticios, sin conceder permisos ni activar campañas reales. |
| Servicios restantes del inventario | Jobs de email, Telegram, analítica, SEO, asociación Android y herramientas de diagnóstico siguen como servicios/herramientas; no se transforman en botones del APK. Ningún envío de campaña, torneo real, migración ni publicación en 11. |

**Superficies que recibe 12:** chat global y de mesa, nombres/fotos, amistades e invitaciones, nombres/descripciones/miembros de grupos, novedades por administrador y reseñas con imágenes privadas. Se conservan silencio del chat, bots sin texto libre y campaña sin chat escrito; denuncia/bloqueo no se implementan en 11. Proveedores: Supabase Auth/Postgres/Realtime/Storage; Web3Forms para el aviso existente; Capacitor HTTP/Browser y almacenamiento de Historia existentes. SMTP Resend de acceso permanece intacto. No se agregó un proveedor nuevo.

**Pruebas ya aceptadas:** SQL social vigente en PGlite; UI empaquetada 320/360/768 sin desbordes; APK con servicios reales y tres QA; selector Android de foto/adjunto y conservación del borrador; fallo controlado de guardar foto con subida/limpieza reales; CORS, sesión inválida, rol y privacidad de imágenes; enlaces frío/caliente; regresión de acceso con proveedor simulado; contratos Android/RPC; TypeScript y lint con siete avisos previos. Evidencia privada/local en `android/generated/android-11-*`, sin claves ni tokens en los informes. Dos reseñas técnicas QA2 identificadas como pruebas quedaron guardadas con una imagen cada una, **sin avisos por correo** en el servidor de ensayo.

**Aviso autorizado, 15/10:** el dueño respondió «Si, autorizo» al único aviso al correo actual de reseñas. Se guardó una sola reseña QA3 (`4004b732-4833-455a-83b6-83b341afc9d0`) con imagen privada. El primer intento desde servidor no fue aceptado; el diagnóstico público devolvió 403/Cloudflare. La [documentación de Web3Forms](https://docs.web3forms.com/getting-started/troubleshooting) exige envío desde navegador salvo configuración de pago. Se corrigió el recorrido y se envió desde el WebView el aviso de esa misma reseña, sin volver a guardarla: HTTP 200, `success=true`, «Form submitted successfully!». Asunto «Nueva reseña de Trucazo», comentario «ANDROID-11 QA autorizada 15/10/2026». No hubo más avisos reales. Evidencia sin claves/URLs firmadas en `android-11-authorized-notice.json`; los scripts ignorados de este envío son de uso único, no repetirlos.

**Recepción confirmada después del diagnóstico:** inicialmente el dueño informó que no llegó a `trucazo.web@gmail.com`; la captura de Principal mostraba avisos hasta el 13/10. Diagnóstico de sólo lectura: la clave pública local es válida, no tiene espacios y coincide exactamente con la del formulario de producción (`android-11-notice-config.json`). Después de pedir búsqueda en todo Gmail, el dueño confirmó «Listo, ya llegó». No se atribuye la demora a Spam ni a otra causa sin evidencia. No se repitió el envío, no se creó otra reseña y no se cambió de proveedor/destinatario. La recepción es confirmación humana; el HTTP 200 previo acreditaba sólo aceptación del proveedor.

**Cierre aceptado en esta misma sesión, 15/10:** recepción confirmada por el dueño; imagen comprobada por el agente mediante enlace temporal: HTTP 200, tipo PNG y bytes idénticos al archivo de ensayo. Acceso público rechazado y una sola reseña coincidente en la base. El override vacío del ensayo se retiró sólo después de la autorización; no cambió la configuración productiva. La corrección final pasó interfaz/SQL aislados, build Next, tipos/lint y construcción/actualización de APK. Handler real con Auth/Storage reales y RPC interceptada comprobó el payload y enlace privado sin crear reseñas ni avisos adicionales. APK final recorrió comunidad, contacto, reseña, preferencias, rechazo de administración y regreso a lobby; cinco guardados y tres QA comprobados otra vez, idénticos. Servidor/build/hash del APK coinciden en la comprobación de cierre (`android-11-close.json`). ANDROID-12 no se comenzó.

**Artefacto y entorno final de aceptación:** APK debug **0.10.0/código 10**, paquete `ar.com.trucazo.capacitor.dev`, SHA-256 `733c97f5332ce8ade910e22aba958b61cc27eba09f8d084fb3593dcd6829c5e0`; firma debug anterior conservada (`586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`). Instalación como actualización aceptada, API objetivo 36/mínima 29; emulador Android 11/WebView 133 `emulator-5554`. Next final 3000: `TRUCAZO_NEXT_DIST_DIR=android/generated/android-11-next-notice`, build `vQ01k7FbBgh1XaNoA18y7`, PID **24044** en `android/generated/android-11-live.pid`. No reconstruir esa carpeta mientras se use. Servidores auxiliares 3002/3003 y builds anteriores cerrados por PID identificado; reverse 3000→3000 y forward 9224 restaurados al proceso nuevo. APK en lobby QA3, sin mesa real abierta; cinco guardados y saldos oficiales idénticos al inicio. El override local `WEB3FORMS_ACCESS_KEY=''` se retiró después de la autorización; el aviso sale desde WebView/navegador y no desde Node. El artefacto anterior `6f17c28d…` fue reemplazado por esta corrección comprobada; no publicarla todavía.

**Comprobaciones reproducibles desde la raíz:** `npm run check:android:community` (SQL/enlaces/UI aislados, incluidos corte/reintento de reseña y limpieza), `node apps/mobile/scripts/check-device-community.mjs` (flujo privado real entre QA, con origen QA correcto), `check-community-server.mjs` (requiere notificador apagado), `check-device-community-isolated.mjs` (administración ficticia dentro del APK), `check-device-upload-failure.mjs` y `check-device-community-links.mjs` (QA2 y archivo de ensayo indicados en sus fuentes). No repetir los ensayos remotos por rutina: guardan reseñas técnicas o crean y retiran relaciones QA. Regresión `check-auth.mjs` con proveedor simulado, `check:android`, `check:rpc-allowlist` (98 cliente/7 servidor), `check:match-chat`, TypeScript, lint y builds aprobados. No repetir Google/alta/recuperación reales ni aplicar SQL. Informes principales: `android-11-artifact.json`, `android-11-preserved.json`, `android-11-real.json`, `android-11-rules.json`, `android-11-browser.json`, `android-11-server.json`, `android-11-images.json`, `android-11-native-admin.json` y `android-11-links.json`.

<a id="android-etapa-12"></a>

#### ANDROID-12 — Denuncias, bloqueo y convivencia

**Empieza con:** 11 cerrada, inventario de contenido y canal de soporte propuesto. Revalidar si apareció una implementación posterior antes de crear tablas/UI.

**Trabajo:** sistema mínimo de denuncia de contenido/usuario, bloqueo/desbloqueo y consulta/resolución por administración. Definir qué significa bloquear en chat, perfiles, amistades, invitaciones y mesas; no alterar turnos/puntajes de una partida ya iniciada para ocultar a un rival. Conservar evidencia suficiente para investigar incluso si el chat tiene limpieza automática; establecer acceso privado y retención justificada. Pedir aceptación de normas antes de aportar contenido y ofrecer motivos/resultados claros. Aplicar protección de servidor y acciones equivalentes en web/app.

**Verificación y final:** usuario A denuncia/bloquea B; no obtiene reportes privados de otros ni permisos administrativos; B no evita el bloqueo por otra ruta de interacción cubierta. Administración recibe, revisa y resuelve un caso de prueba; contenido sancionado se trata según lo definido. Reintentos/abuso de reportes controlados. Términos, controles y funcionamiento coinciden; silenciar chat sigue siendo una opción distinta. SQL nuevo probado, aplicado por el dueño y esquema actualizado antes de certificar el flujo real.

**Entrega a 13:** política exacta de bloqueo/denuncias, retención, datos nuevos, responsable que atenderá reportes y pruebas. Si falta responsable o aplicación de SQL, dejar `Preparada; falta paso externo`.

##### ANDROID-12 — cierre y aceptación del 15/10/2026

Primera comprobación: servidor 3000 HTTP 200, emulador `emulator-5554`, reverse 3000 y forward 9224 activos. Cinco guardados con hashes idénticos a 08, revisiones 299/0/46/45/1, cero pendientes y comprobantes 5/0/1/1/0; `android/generated/android-12-before-preserved.json`. Tres QA con ingreso normal y saldos 1.070/26, 1.030/23 y 370/0. Confirmación apagada leída de `/auth/v1/settings`, sin tocar configuración.

Búsqueda en código, migraciones y tablas/funciones públicas y privadas del servidor real: no existía un sistema posterior de denuncias/bloqueos. Inventario de 11 contrastado; también se cubrieron nombres de mesas 1v1/parejas encontrados en el código. Migración nueva generada con CLI 2.121.0: `20261015145540_community_safety.sql`, **aplicada por el dueño con Success el 15/10 y comprobada contra Supabase real**; copia de la foto en `supabase/schema/community_safety.sql`, con el mismo SHA-256 `cf6ab34add0adf1a8bb927da22f9f07f9d33f6a46937843ae33ce45c7f31a808`. Su base requiere el esquema/migraciones anteriores, igual que los módulos de parejas y chat. La reconstrucción incremental sigue usando el historial; no aplicar la foto como segunda migración ni repetir el archivo aplicado.

**Política verificada:** normas `2026-10-15` aceptadas explícitamente antes de aportar contenido. Denunciar, bloquear y jugar no obligan a aceptarlas. Bloqueo bilateral: chat global/de mesa filtrado por servidor, amistades/solicitudes retiradas, invitaciones de juego canceladas y reembolsadas, nuevos contactos/grupos/mesas casuales impedidos por cualquier ruta, incluidos códigos y terceros de un grupo. Grupos ya compartidos, perfiles, ranking y participantes siguen visibles. Partidas ya iniciadas y cruces de torneo siguen sus reglas; silencio de mesa conserva su significado. Una restricción social retira el contenido señalado y dura siete días; no impide jugar, denunciar o bloquear. Nombres automáticos de mesa se neutralizan si falta aceptación o hay restricción, sin impedir jugar.

**Denuncias y datos:** motivo/detalle, autor/contenido señalado, copia del texto y referencias originales; las imágenes propias disponibles se copian reducidas a JPEG en el registro privado, sin un depósito ni proveedor nuevos. Sólo el servidor puede adjuntar/leer esas copias y sólo administración puede pedirlas. Fallar la imagen conserva el texto y avisa. Hasta diez casos por cuenta/24 horas; reintentar el mismo contenido devuelve el mismo caso, y un cambio del contenido permite otro. Quien denuncia ve sólo su estado/respuesta; la persona señalada no recibe su identidad. Administración tiene cola, evidencia, reseñas privadas recientes y cierre sin sanción/retirada/retirada más restricción. Limpieza diaria por cron a 180 días de recepción o 90 desde resolución, lo que venza primero; las copias se eliminan con el caso. Normas/privacidad explican estos efectos y vías de revisión.

**Convivencia aplicada en piloto, sin publicación:** `community_safety.settings.enforce_rules=false` deja la exigencia SQL en piloto para las tres QA, identificadas por su marca administrativa confiable. Conserva el comportamiento de la web pública vieja. La interfaz local nueva pide aceptación a todas las cuentas antes de sus aportes; bloqueo, privacidad y sanciones del servidor ya se implementan para sus usuarios. Antes de publicar esa interfaz en 20, preparar/aplicar una migración nueva que active `enforce_rules=true` coordinada con la publicación. No activarlo ahora ni confundir el piloto con un lanzamiento público.

**Aceptación técnica:** SQL PGlite con permisos reales: privacidad, normas, idempotencia, abuso, reembolso, bloqueo bilateral, códigos, grupos por terceros, parejas, chat, partidas intactas, todas las superficies y retención. Handlers reales con Auth/Storage dobles comprobaron JPEG privado, permisos, CORS, reintento, texto conservado y error de imagen. UI empaquetada + SQL local y APK instalado probaron denuncia/bloqueo/desbloqueo/normas/resolución administrativa ficticia; no se concedieron roles reales. 320/360/768 y capturas revisadas, formulario compacto con todos los botones accesibles. Regresión de comunidad 11 completa, contratos de chat/RPC (105 cliente/8 sólo servidor), tipos/lint y builds aprobados; siete avisos de lint preexistentes. Informes `android-12-rules.json`, `android-12-api.json`, `android-12-browser.json`, `android-12-native-isolated.json`.

**Entorno final:** APK debug 0.11.0/código 11, SHA-256 `888bd36588e867278f5d3b9842db46eb7df7e07529e8462c745f6bfa5546a905`, firma anterior `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`, actualizado en Android 11/WebView 133. Cinco guardados y saldos/roles QA idénticos después de instalar. Next final 3000, `TRUCAZO_NEXT_DIST_DIR=android/generated/android-12-next-final`, build `81TP85L-hWxfQFQ7c1exn`, PID 24076 en `android/generated/android-12-live.pid`; no reconstruir esa carpeta mientras se use. Servidores anteriores 24044/13932 detenidos por PID verificado. Reverse 3000→3000 y forward 9224 actuales; QA3 en lobby. Chrome/TWA no operados.

**Aceptación real y cierre:** el dueño confirmó «ya corri el sql, me dio success» y «las denuncias las reviso yo». Responsable operativo: el dueño, con la administración existente; no se fijó una frecuencia adicional. QA1 web denunció el perfil de QA3 en el APK: un único caso privado `4a0b7585-e086-461e-a7db-bcd7c66c7a09`, copia JPEG conservada y reintento con el mismo identificador. El bloqueo rechazó el contacto desde la ruta alternativa del APK; después se desbloqueó. Las tres QA no accedieron a casos ajenos ni administración; imágenes privadas rechazadas también por cookie/API nativa. Autorreporte nativo rechazado sin crear otro caso. Consulta y resolución reales mediante RPC con contexto SQL del administrador existente SantiBP; interfaz administrativa positiva probada en APK con datos aislados, sin asignar roles ni simular una sesión administrativa real. Caso cerrado sin sanción (`dismiss`) con respuesta «Prueba ANDROID-12 verificada; cerrada sin sanción ni infracción real.», visible para QA1 web. Ningún bloqueo/restricción QA pendiente; saldos/roles intactos. Informe `android/generated/android-12-real.json`.

**Comprobación de servidor y datos:** cinco tablas privadas con RLS y sin permisos de tabla para clientes; lectura de medios reservada al servidor, cron diario activo y piloto `enforce_rules=false`. Los avisos nuevos del asesor son los esperados para cinco tablas privadas sin políticas cliente y siete RPC autenticadas con autorización interna; no se ampliaron permisos de tablas. Cinco guardados idénticos, cero pendientes y confirmación apagada al cierre; evidencia `android-12-preserved.json`, `android-12-artifact.json` y `android-12-close.json` en `android/generated/`. ANDROID-12 cerrada: sin correos ni contenido público de ensayo, sin publicación y sin comenzar 13.

<a id="android-etapa-13"></a>

#### ANDROID-13 — Notificaciones nativas

**Empieza con:** 12 cerrada y eventos/frecuencia acordados con el dueño; la inclusión de push ya está decidida y no se pregunta nuevamente.

**Trabajo:** integrar plugin Android/FCM, proyecto/configuración correspondiente, permisos, tokens por usuario/dispositivo, renovación, logout/baja, preferencias y destinos. Backend de entrega con autorización, reintentos y deduplicación de eventos; reutilizar los eventos de torneos/invitaciones acordados, evitando promociones no pedidas. Guardar credenciales de envío sólo en servidor; registrar configuración de Firebase y panel/SQL sin escribir secretos en la documentación. Definir qué ocurre al tocar un aviso que ya venció.

**Verificación y final:** recepción visible real con app en primer plano y en segundo plano/cerrada de forma normal, apertura del destino frío/caliente y usuario sin sesión. Permiso aceptado/denegado, token renovado, dos dispositivos, cambio A/B, baja y evento repetido. El jugador puede jugar sin permiso. No prometer entrega tras un cierre forzado del sistema: documentar sus límites y retomar registro al abrir. Confirmar en teléfono físico cuando esté disponible; envío FCM aceptado solo es evidencia de envío.

**Entrega a 14:** eventos habilitados, preferencias, configuración aplicada, casos de recepción/destino y datos agregados a la revisión de privacidad. [Plugin oficial](https://capacitorjs.com/docs/apis/push-notifications).

##### ANDROID-13 — notificaciones nativas aceptadas — 15/10/2026

**Cerrada exclusivamente 13, sin publicar ni comenzar 14.** Al iniciar se comprobaron servidor, tres QA y cinco guardados contra 08/12. Sus hashes siguen idénticos al cierre: revisiones 299/0/46/45/1, cero pendientes y comprobantes 5/0/1/1/0. Evidencias inicial/final en `android/generated/android-13-before-preserved.json` y `android-13-preserved.json`. Saldos oficiales QA1 1.070/26, QA2 1.030/23 y QA3 370/0; fotos históricas de saldo dentro de SQLite conservadas. Confirmación de email apagada y SMTP intacto.

**Acuerdo del dueño:** invitación recibida, apertura del check-in y partida de torneo lista para inscritos. Un aviso por evento y dispositivo, sin recordatorios repetidos; invitaciones como máximo una por remitente cada diez minutos y cinco por hora al destinatario. Tres preferencias independientes compartidas entre dispositivos y activación/baja por instalación, desde Perfil → Notificaciones. Sin promociones, chat ni anuncios de torneos a personas no inscritas. Vigencia: cinco minutos para invitaciones; hasta el inicio para check-in; plazo de ingreso del cruce para partida lista. Un toque vencido explica el vencimiento y abre el estado actual; sin sesión pide ingresar y con otra cuenta rechaza el destino anterior.

**Configuración aplicada:** Firebase `trucazo-1dfcc`, app QA `ar.com.trucazo.capacitor.dev`, sin Analytics; cuenta de envío dedicada `trucazo-push`, con rol FCM solicitado al dueño. Él creó el proyecto y descargó configuración/clave, comprobadas localmente. `google-services.json` fuera de Git; credencial de envío en `android/generated/private/android-push-service-account.json`, sólo para Node/servidor. `ANDROID_PUSH_SERVICE_ACCOUNT_FILE` señala ese archivo en el servidor local; para un servidor sin archivo existe `ANDROID_PUSH_SERVICE_ACCOUNT_JSON`, siempre privado. `ANDROID_PUSH_PACKAGE_ID` usa por ahora el paquete debug. Identidad final y configuración de despliegue se contrastan en 16/20; no trasladar esta clave al cliente. APK final inspeccionado: 229 entradas, sin clave privada ni cuenta de envío.

**SQL aplicado por el dueño:** `supabase/migrations/20261015231009_native_push_notifications.sql`, SHA-256 `1ce542702df37afd20d1f00eb687acc055931cbe2da88dcde4010b34123eb425`; foto idéntica en `supabase/schema/native_push.sql`. Informó resultado **schedule 13**, confirmado de sólo lectura como cron `trucazo-native-push`, id 13, cada quince segundos y sin fallos observados. **No repetir la migración.** `native_push.settings.pilot=true` limita registros/eventos a las tres QA identificadas por metadatos administrativos; `dispatch_enabled=false` evita llamadas a la API pública todavía sin desplegar. El cron prepara/limpia, y el ensayo local llamó al despachador autenticado. La activación pública corresponde al despliegue coordinado de 20 mediante cambio SQL nuevo; no encenderla durante 14.

**Implementación:** plugin oficial `@capacitor/push-notifications` 8.1.3 exacto y Firebase Messaging 25.0.1. Registro por instalación con secreto, cuenta y vinculación renovable; baja al salir, renovación del token y preferencias. SQL genera eventos desde invitaciones/check-in/cruces y los vuelve a validar al reclamar cada entrega; permisos sólo de servidor para el envío, exclusión de reclamos simultáneos, hasta seis intentos y respeto de límites/reintentos de FCM. Mensajes de datos: el servicio Android comprueba cuenta/vinculación, preferencia, vencimiento y duplicados **antes** de mostrar, aun sin WebView. Logout limpia la vinculación y los avisos locales antes de pedir la baja remota. No se cambiaron reglas ni premios del juego.

**Recepción real y destinos:** Android 11/API30 y Android 16/API36, ambos WebView 133, Supabase real y API Next local. QA3 ingresó por su formulario en ambos, sin copiar sesiones ni Historia. Invitación privada QA1→QA3 produjo dos entregas reales aceptadas por la API y dos avisos visibles: app en primer plano y segundo plano. Toque real abrió Comunidad en caliente y en frío. Otro aviso FCM se mostró con el proceso retirado de memoria en segundo plano, sin `force-stop`, y volvió a abrir Comunidad. Capturas `android-13-received-9224.png`, `-9225.png`, `android-13-received-closed.png` y destinos.

**Casos de protección reales:** permiso Android 16 denegado (`prompt-with-rationale`), lobby usable y dispositivo sin alta; después aceptado desde la pantalla normal. Preferencia de invitaciones apagada/restaurada por UI/API, otra categoría recibida y baja local comprobada sin cerrar cuenta. Token FCM realmente borrado/renovado, distinto y receptor operativo. El mismo evento enviado tres veces mantuvo una única publicación Android, con fecha de actualización intacta. Sobres QA de otra cuenta y vencidos viajaron por FCM y se descartaron; un control posterior sí llegó. Salida QA3→ingreso QA2 por formulario: avisos anteriores retirados, token actual de B no mostró el sobre tardío de A y sí recibió el suyo. Intento sin sesión pidió ingreso, entrada de otra cuenta rechazó ese destino y enlace vencido mostró explicación. Ver informes `android-13-guards.json`, `-renew.json`, `-previous-account.json`, `-preference.json` y capturas de cuenta/permisos.

**Torneos sin publicación de prueba:** apertura de check-in y cruce listo se generaron con los disparadores/consultas SQL reales en PostgreSQL PGlite descartable, recorrieron el handler real de envío y FCM y se vieron en el APK de QA2. `android-13-tournaments.json` y `android-13-tournament-received.png`. No se creó ni publicó un torneo en Supabase real ni se envió a jugadores. Las pruebas SQL aisladas cubren privacidad, dos dispositivos, límites, reintentos, cambios de agenda, confirmación de presencia y limpieza; las de API usan Auth/FCM simulados. `npm --prefix apps/mobile run check:push` ejecuta ambas sin avisos reales. Los scripts `check-device-push-*` son ensayos explícitos con QA y no deben ejecutarse por rutina.

**Cierre y límites:** invitación/mesa de ensayo retiradas y amistad previa restaurada, sin jugar una partida; saldos/roles intactos y cero entregas pendientes. QA3 queda en lobby del APK principal, notificaciones activadas y tres preferencias encendidas. Segunda instalación dada de baja y AVD Android 16 cerrado sin borrar datos. Tipos, lint web/móvil, permisos de RPC, regresión de sesión y builds Next/APK aprobados; siete avisos previos web y dos del adaptador de imágenes móvil, sin avisos nuevos. Auditoría remota: cinco tablas privadas con RLS, esquema inaccesible al cliente, cero RPC push para visitantes y tres funciones de entrega sólo servidor. Los avisos generales de [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [RPC privilegiadas autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) son intencionales: acceso por cuatro RPC que verifican identidad y propiedad, probado contra accesos ajenos. Teléfono físico/canal Play no ensayados; corresponden a la aceptación posterior. Un cierre forzado de Android o restricciones del sistema impiden prometer entrega hasta reabrir.

**Para privacidad de 15:** identificador aleatorio y secreto local de instalación, token FCM por cuenta, preferencias y registro mínimo de eventos/entregas. Sin tokens por Realtime ni a otras cuentas. Dispositivos sin renovar se limpian a treinta días; eventos, treinta días después de vencer; cascada al eliminar perfil. FCM recibe identificadores mínimos de cuenta/instalación/evento y textos fijos sin chat, cartas, emails ni nombres de jugadores. Contrastar el borrado completo y los textos públicos en 15 con este SDK/datos reales.

<a id="android-etapa-14"></a>

#### ANDROID-14 — Comportamiento Android y pulido

**Empieza con:** 13 cerrada y todas las pantallas conectadas. Se corrigen diferencias comprobadas, conservando el diseño de la página.

**Trabajo:** Atrás por botones/gestos, historial y modales, enlaces, teclado/foco/autocompletado, zonas de barras/cámara, suspensión/pérdida de proceso, audio/vibración si ya corresponden, orientación/pantallas grandes, avisos de red y errores. Tratar reconexión según estado del juego, sin ejecutar premios al tocar un botón local. Revisar accesibilidad: textos/tamaño, contraste, etiquetas, TalkBack, foco y objetivos táctiles. Medir arranque, respuesta a acciones, memoria/red y batería en dispositivo representativo; acordar y registrar presupuestos a partir de esas mediciones, corregir bloqueos y recargas innecesarias.

**Verificación y final:** Android mínimo propuesto, 11 y un sistema moderno 15/16; pantallas pequeñas, barras por gestos/botones, teclado y letra aumentada. Mesa/cantos completos sin scroll de partida; chat/menús conservan su comportamiento propio. Comparaciones visuales de cada familia de pantallas y cosméticos, recorrido TalkBack y pruebas de audio al volver de otra app. Inicio frío, suspensión y red lenta no dejan pantalla blanca ni pierden guardado. Métricas y límites aceptados anotados con modelo/versión reales.

**Entrega a 15:** matriz de dispositivos y visuales, ajustes nativos/configuración, mediciones y limitaciones conocidas. La regresión integrada del artefacto firmado se realiza en 17.

**16/10/2026 — ANDROID-14 cerrada con alcance aceptado por el dueño.** Servidor de 13 en puerto 3000 respondió 200 antes de modificar código. Cinco guardados idénticos a 08/13, revisiones 299/0/46/45/1, sin pendientes y comprobantes 5/0/1/1/0 (`android/generated/android-14-before-preserved.json`). Ingreso de las tres QA y saldos oficiales 1.070/26, 1.030/23 y 370/0 comprobados. Confirmación de email apagada y `native_push.settings` con `pilot=true`, `dispatch_enabled=false`, leídos sin cambios. No se repitieron Firebase/SQL ni envíos push.

**Cambios comprobados:** se reprodujeron Atrás sin cierre de modal, borrador de mesa perdido al volver de otra app, salida de parejas recortada en horizontal y textos de cantos cortados con letra al 130 %. Se corrigieron Atrás por capas/historial/minimización, pantalla recordada por cuenta, foco y fondo inaccesible de ventanas, orden de convivencia sobre el chat, pausa de audio al suspender/silenciar y acceso con autocompletado. En el acceso, «Siguiente» enfoca contraseña y «Ingresar» envía; comprobado con el componente real. Cantos/salida/sonido/apertura y cierre de chat usan 44 px; parejas comparte mazo/salida en su última fila, y ambas mesas colocan controles al costado en horizontales bajos. No hay scroll de partida ni se omiten respuestas del servidor. Mejorado contraste de texto terciario, errores y botones de estado, sin cambiar arte ni compras. Consultas de lobby/comunidad se detienen mientras se oculta la app; el brillo de Campaña anima sólo opacidad/transformación. Las convenciones están actualizadas en [Diseño](diseno.md#convenciones-diseno) y su copia técnica.

Android 10 con WebView 74 de fábrica quedó detenido en «Abriendo Trucazo…»: ahora `minWebViewVersion=105` abre una página local de actualización, sin borrar datos ni cargar el puente nativo. Después se instaló el WebView oficial 133 conservado y se aceptó el recorrido normal. Android 10 se verificó con ese 133; no se declara ensayado el motor 105. No se agregaron voces ni vibración de juego: el proyecto contiene carta/victoria/derrota; los MP3 de cantos siguen ausentes como en web. No se agregaron SDK, permisos ni SQL.

**Matriz técnica — emuladores, no teléfonos físicos:**

| Entorno real observado | Comprobación |
| --- | --- |
| Android 10/API29, `Trucazo_Android_10`, `emulator-5558`, modelo `Android SDK built for x86_64`, WebView 133.0.6943.137 | APK instalado y actualizado; nueve pantallas, Atrás/historial/visor, suspensión con borrador, pérdida de proceso con cuenta/pantalla, Historia propia y regreso a lobby. |
| Android 11/API30, `Trucazo_Android_11`, `emulator-5554`, modelo `sdk_gphone_x86_64`, WebView **139.0.7258.158** | Cinco guardados conservados, recorrido nativo y comparación con web; mesas 1v1/parejas con todas las respuestas y seis salones. Android actualizó el WebView desde el 133 del cierre de 13. |
| Android 16/API36, `Trucazo_Android_16`, `emulator-5556`, modelo `sdk_gphone64_x86_64`, WebView 133.0.6943.137 | Recorrido, teclado real y doble función de Atrás, cancelación del selector de foto, gesto lateral, muesca de cámara simulada, sonido real, radios apagadas, arranque offline y lectura de red lenta. |

Mesas dentro del APK, con sesión QA3 real y **todas** las solicitudes de juego interceptadas antes de salir, ejecutando reglas SQL en PGlite local: 320×496, 360×568, 640×288 y 720×1208 útiles; letra Android al **130 %** y 360×544 con muesca. Siete permisos de respuesta en parejas más salida; en 1v1 se muestran los permisos correspondientes. Sin scroll, botones/texto recortados ni imágenes rotas. Seis salones y cosméticos de ensayo locales, sin compras reales. Los relojes de los fixtures se alargaron sólo en esa base para comparar tamaños: los miles de segundos de las capturas no son configuración de producción. Evidencias `android-14-emulator-5554-layout*.json/png` y `android-14-emulator-5556-layout-cutout.json`/`cutout-*-system.png`.

**Accesibilidad y presentación:** nueve familias revisadas, ocho con comparación app↔web Next local y notificaciones propia de Android; títulos, tamaños, pesos, colores y alturas de línea iguales, más capturas pareadas. Ningún botón, enlace o campo sin nombre en los árboles accesibles de esas pantallas. Ventanas anidadas conservan foco, ocultan el fondo al lector y cierran sólo la superior. Una regresión adicional reprodujo el fondo bloqueado al cerrar juntas dos ventanas por cambio de pantalla; corregido y verificado que vuelve a recibir toques. TalkBack **16.0.0.738667889** de Android 16 activado, servicio vinculado y exploración táctil habilitada; apertura/recorrido de la ventana y árbol accesible comprobados. Servicio y ajustes restaurados. No se presenta como una escucha humana de toda la locución. Contraste medido de los pares corregidos: **5,09–6,05:1**. Informes `android-14-visual-accessibility.json`, `android-14-behavior-browser.json` y `android-14-api36-talkback-*.png/json`.

**Red, sonido y persistencia:** Android 16 con Wi-Fi/datos apagados abrió Historia, cerró/reabrió el proceso y conservó el mismo hash. Reconectar no creó premios nuevos. WAV `gano.wav` real (0,78 s) reproducido; ir a otra app lo detuvo y no se repitió al regresar; silenciar cortó la reproducción. Lectura de perfil retrasada 2 s por solicitud mostró carga y terminó en 4,66 s sin pantalla blanca. Informes `android-14-emulator-5556-audio-network.json` y `*-cold-offline.png`. Las regresiones empaquetadas de 1v1/parejas comprobaron mano/asiento/reloj, respuesta tras corte, resultados y pagos en SQL local; no se jugaron ni cerraron partidas reales nuevas en 14.

<a id="android-14-mediciones"></a>

**Mediciones y límites revisados — aceptados por el dueño el 16/10:** referencia Android 11 anterior, 360×568, renderizador SwiftShader, APK debug, servicios Next local y Supabase real. Tres arranques fríos con marca interna tras dibujar el lobby y dos cuadros; reloj del dispositivo calibrado (ida/vuelta de 35–43 ms). Los tiempos desde abrir incluyen proceso, interfaz y datos, sin sumar la espera de conexión del inspector. No equivalen a una prueba en teléfono, un ensayo de carga ni una medición de batería física.

| Medida | Resultado observado | Límite revisado aceptado |
| --- | --- | --- |
| Primer contenido desde abrir la app | 1,972–2,614 s; dentro del WebView, 0,904–1,144 s desde navegar | ≤3 s en este emulador |
| Lobby utilizable desde abrir la app | **2,691 / 2,899 / 3,597 s**, mediana 2,899 s | ≤4 s como control provisional de este emulador; **objetivo ≤3 s en teléfono**, todavía sin verificar |
| Abrir «Crear mesa», estado y dos cuadros | **0,301–0,450 s** tras el arranque; ensayo estabilizado 0,054–0,164 s con diseño normal | ≤0,5 s |
| Hilo principal, lobby en reposo/20 s | 7.270 → **2.403 ms**, reducción aproximada 67 %; estilos 724 →73 | ≤3.000 ms/20 s |
| App suspendida y transición terminada/20 s | **0 HTTP**, 0 bytes HTTP, 0 recálculos; 19,85 ms de hilo principal | Sin consultas periódicas; ≤100 ms/20 s |
| Conexión Realtime suspendida/20 s | Un latido y su respuesta, **101 bytes** en total | Latidos pequeños permitidos; no confundirlos con consultas ni afirmar red nativa total cero |
| Memoria | Heap JS 4,37–5,27 MiB; proceso principal hasta 102,1 MiB PSS | JS≤16 MiB; proceso≤128 MiB PSS |

La muestra de suspensión inicial incluyó dos consultas durante la transición a otra app; la comprobación sostenida empezó después de `document.hidden` y un segundo de margen (2,96 s totales de transición) y registró cero. El contador de red cubre HTTP/WebSocket del WebView, no los servicios nativos de Google/FCM. Informes de reposo `android-14-before-runtime.json`, `android-14-after-runtime.json` y `android-14-background-runtime.json`.

**Revisión del 16/10 en esta misma sesión:** el dueño cuestionó los 6 s y confirmó que no dispone de teléfono. Se retiró ese valor como objetivo. El cronómetro externo anterior (`android-14-startup.json`) incluía espera del inspector; una primera serie con marca interna también registró un caso real de **6,71 s**, conservado en `android-14-startup-first-internal.json`. La siguiente dio 2,92–3,82 s (`android-14-startup-before-parallel.json`). Un ensayo de lecturas paralelas no dio mejora consistente y se retiró; identidad y datos conservan su orden original. Se agregó conexión anticipada a Supabase mientras carga la interfaz, sin agregar SDK ni cambiar autorizaciones. La serie final está en `android-14-startup-internal.json`; la variación de red impide atribuirle una reducción exacta o prometer el mismo tiempo en teléfonos. Una comparación temporal del desenfoque (`android-14-dialog-cost.json`) no justificó cambiar el diseño y se restauró el CSS original.

**Aceptación expresa — 16/10/2026:** el dueño respondió «Sí, cerrá 14 con esos criterios y la batería física en 17». Quedaron aceptados los límites de la tabla, incluidos 4 s como control provisional de este emulador y objetivo de 3 s en teléfono. Por falta de equipo, batería física y comprobación del objetivo real se trasladaron a [ANDROID-17](#android-etapa-17), con su candidato firmado. **14 queda cerrada; no se certifica batería ni rendimiento físico.** No se comenzó 15 ni se publicó nada.

**Datos conservados y continuidad:** al 16/10, cinco hashes idénticos a 08/13, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0** (`android-14-preserved.json`). Saldos oficiales QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**, intactos; foto y Cafetín/Bronce/agua de QA3 conservados. Las instalaciones secundarias prepararon su propia Historia QA3, sin importar ni reemplazar las cinco del principal: Android 10 revisión 0/hash `fac415ffcb55285307badcefa23215b8fe025631d3cacb41ede3ce77b6f6ad9d`. No convertir sus fotos nuevas de 370 monedas en una actualización del guardado principal de 400. Chrome/TWA, claves y acceso personal no operados. Confirmación de email y despacho público apagados; piloto sólo QA, sin entregas pendientes ni partidas QA abiertas. No repetir SQL ni Firebase.

**Entorno de trabajo:** APK debug **0.13.0/código 13**, paquete/firma anteriores; SHA-256 `8e8714fe0842ca94d7185c80754306a68358387bdcd9bcec360cc6419c02aeea`. Next 3000, PID **21444**, `TRUCAZO_NEXT_DIST_DIR=android/generated/android-14-next-verified`, build `4HmowPM4u3x6Qgi4cNBBO`; `android-14-live.pid`. No reconstruir esta carpeta con el servidor abierto. Builds de 13 y candidatos anteriores de 14, más `.next` original, conservados. Tipos, lint web/móvil, contratos Android, allowlist **109 RPC cliente/10 servidor**, acceso simulado, 1v1/parejas locales, Next y APK aprobados; siguen siete avisos previos de lint web y dos del adaptador de imagen móvil. Sin commit/PR, despliegue ni publicación Play. El dato local nuevo para revisar en 15 es la última ruta permitida por cuenta (`trucazo:mobile:screen:<owner>`); no contiene sesión ni contraseña.

**Artefacto de cierre de 14:** copia [trucazo-capacitor-0.13.0-debug.apk](../android/artifacts/ANDROID-14/trucazo-capacitor-0.13.0-debug.apk), ignorada por Git. Firma SHA-256 anterior `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`, mínimo API29/objetivo API36. `android/generated/android-14-artifact.json` registra versión instalada, huellas de programa/CSS/HTML iguales a la construcción, paquete, entorno, pruebas y aceptación expresa del dueño. Cierre en `android/generated/android-14-close.json`, con cero pendientes de 14 y las dos verificaciones físicas trasladadas a 17. Principal `emulator-5554`, WebView PID **15970**, forward 9224 y reverse 3000 restaurados, lobby QA3 y push de esa instalación conservado activado. Android 10/16 cerrados sin borrar datos, con Historia y sesión propias y push sin activar. La actualización comprobada de Android 10 conservó exactamente su revisión 0/hash anterior; los últimos ajustes del acceso, cierre conjunto de ventanas, marca de rendimiento y conexión anticipada se comprobaron en Android 11, repitiendo el recorrido nativo y verificando programa/CSS/HTML y los cinco guardados. SQL final de sólo lectura: piloto QA, despacho apagado, cero entregas pendientes y cero partidas 1v1 QA abiertas. Confirmación de email leída apagada otra vez; foto/Cafetín/Bronce/agua de QA3 comprobados en el servidor.

<a id="android-etapa-15"></a>

#### ANDROID-15 — Privacidad, eliminación, seguridad y contenido

**Empieza con:** 14 cerrada; todos los datos y proveedores finales ya identificables. Confirmar soporte atendido y público/edad con el dueño usando el contenido real, sin dar por aprobada la propuesta 14+.

**Trabajo:** inventariar datos de cuenta, perfil/avatares, mensajes, imágenes, progreso offline, tokens de notificación, denuncias, analítica/diagnóstico y cada proveedor. Revisar permisos/SDK del APK; adaptar la analítica web si no funciona en app y justificar cualquier SDK nuevo. Actualizar privacidad/términos, conservación/borrado y contacto; preparar respuestas de Seguridad de datos y clasificación. El juego con monedas ficticias debe describirse fielmente en el cuestionario; no asegurar clasificación ni idoneidad para menores sólo porque no hay dinero real. Revisar dependencias vigentes, endpoints/RPC/RLS/Storage, manos ocultas, enlaces y logs.

**Verificación y final:** eliminación existente desde app y URL pública con cuenta de prueba autorizada, incluida reautenticación Google; limpieza local de esa cuenta, baja de push y manejo de pendientes explicados antes de borrar. Sesiones/tokens previos no permiten operaciones protegidas después de eliminar. Datos retenidos están justificados y declarados. Sin llaves privadas en artefactos, diagnósticos o fuentes públicas; permisos acordes a funciones, servicios HTTPS y autorización por dueño/rol. Formularios y textos corresponden al código final; decisiones de edades/mercados documentadas.

**Entrega a 16:** inventario de datos/permisos/proveedores, textos y borrado comprobados, decisiones de público y soporte, revisiones de seguridad y cualquier cambio aplicado. Las declaraciones en Play se cargan en 18. [Clasificación](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en), [público objetivo](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en).

En la revisión incluir navegación permitida del WebView/puente nativo, componentes Android exportados, backup/restauración, archivos subidos y derechos de uso de arte, fuentes y sonidos. La eliminación no puede avisar instantáneamente a otro equipo totalmente sin red: al reconectar debe revocar acceso/acreditaciones y limpiar u ocultar los datos de esa cuenta según la política registrada. No prometer borrado remoto inmediato de un teléfono desconectado.

##### Ejecución y cierre de15 — 16/10/2026

**Cierre verificado:** inventario y declaraciones preparados; borrado real desde APK con contraseña y desde URL pública con Google aprobados. La descartable nueva fue verificada por Auth/JWT y no era administradora. Al eliminarla desde otro navegador, el APK sin red conservó su copia; al reconectar retiró sesión, recepción local y acceso a Historia. Se acreditó el ocultamiento antes de retirar sólo esa fila. Credenciales anteriores rechazadas en lectura/escritura/renovación. SantiBP protegida, QA3 en lobby y cinco hashes intactos. Cero pendientes de15; [acta y traspaso final](#android-15-traspaso-2026-10-16). Los párrafos siguientes conservan avances parciales anteriores: este cierre y el último traspaso prevalecen sobre sus pendientes históricos.

**Decisiones del dueño:** mínimo **16 años**, distribución en **todos los países que permita Google**, condicionada a clasificación real y eventuales límites mayores. El dueño atiende `hola@trucazo.com.ar` para soporte/privacidad/eliminación. Autorizada una cuenta descartable de borrado, aparte de las tres QA; dispone de Google de prueba para el segundo recorrido. No borrar QA ni cuenta personal. Procedencia del arte confirmada: propio/generado con IA; cartas CC BY-SA3.0 y Geist OFL1.1 atribuidos por separado. No comenzar16 ni publicar; batería física y objetivo3s siguen en17.

**Control inicial:** servidor3000/PID21444/build de14 respondió200; `emulator-5554`, reverse3000 y forward9224→WebView15970 comprobados antes de tocar datos. Cinco hashes idénticos a14, revisiones299/0/46/45/1, cero pendientes, comprobantes5/0/1/1/0. `android/generated/android-15-before-preserved.json`. Tres QA autenticadas con saldos1070/26,1030/23,370/0. Confirmación de email apagada; piloto push=true, despacho=false y cero entregas/solicitudes de borrado pendientes. Sin SQL/Firebase repetidos ni avisos enviados.

| Datos | Ubicación/proveedor real | Visibilidad, conservación y eliminación |
| --- | --- | --- |
| Email, UUID, identidad Google, sesión | Supabase Auth; WebView privado/cookies web separadas; Google en navegador externo | Cuenta requerida Android, Google opcional. No contraseña persistida por Trucazo; Auth se elimina. |
| Nombre, avatar, equipo, monedas, ranking/estadísticas | Supabase Postgres/Storage; foto Google externa si se elige | Perfil público. Avatar opcional recortado JPEG256, borrado con cuenta. Resultados compartidos quedan sin identidad. |
| Partidas, cartas, progreso oficial | SQL/Realtime Supabase | Reglas/premios en servidor; manos por dueño y fuera de Realtime; espectadores sólo cartas jugadas. |
| Historia, jugadas, cola, comprobantes | SQLite `no_backup/trucazo-historia-v1.db` porUUID; IndexedDB web separada | Salir oculta. Eliminar borra sólo fila del dueño; pendientes se pierden con aviso. Otro equipo sin red oculta al reconectar. No transferencia/backups automáticos. |
| Ruta, sonido, retorno, PKCE, UUID analítica | WebView localStorage y preferencias Android | `trucazo:mobile:screen:<owner>` sólo ruta permitida, sin token/consulta. Borrado limpia ruta/cuenta; preferencias generales no son identidad. PKCE temporal. |
| Chats, amigos, grupos, invitaciones | Supabase Postgres/Realtime | Visibilidad por canal; mensajes/relaciones propios borrados. Grupos ajenos transfieren liderazgo. Convivencia de12 conservada. |
| Reseñas y hasta3 imágenes | Supabase privado; aviso Web3Forms al correo del dueño | Aviso puede incluir comentario y enlaces de imágenes por7d. No envíos nuevos en15. Copias de correspondencia requieren retiro manual del buzón/proveedor cuando corresponda. |
| Normas, bloqueos, denuncias y evidencia | `community_safety`, Supabase privado | Aceptación/bloqueos/restricción se retiran con perfil. Evidencia privada de denuncias, incluso texto/imagen/UUID anterior, permanece hasta180d de recepción o90d de resolución, primero que ocurra, por prevención de abuso/revisión. |
| Token FCM, instalación, vínculo, preferencias | Firebase Messaging25.0.1/Installations; `native_push` privado; SharedPreferences | Opcional, piloto QA. Baja local/servidor y cascada con perfil. Inactivos/eventos vencidos30d. FID es de instalación; borrar Trucazo no borra la cuenta Google. |
| Pantallas/eventos, visitante/sesión, país y cliente | Analítica propia Supabase vía Next/Vercel | Hash sin consulta y sesión Bearer; sin administración. Detalles365d; borrado vinculado a cuenta. País derivado de conexión, sin GPS; tabla propia sin IP/user-agent completo. |
| HTTPS, IP/conexión y diagnósticos | Supabase, Vercel, Google/Firebase; Resend para acceso/emails existentes | Proveedores con logs/backups y plazos propios. Vercel Analytics/Speed Insights sólo web; sin Firebase Analytics, Crashlytics o Ads en APK. Sin venta de datos, publicidad ni cobros. |

**APK y seguridad nativa:** mínimo29/objetivo36; permisos INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS, WAKE_LOCK, `com.google.android.c2dm.permission.RECEIVE` y receptor interno protegido por firma. Sin cámara, micrófono, ubicación, contactos o lectura general de fotos. MainActivity exportada para ícono/enlaces con destinos permitidos; receptor FCM exige permiso `com.google.android.c2dm.permission.SEND`; servicio propio/FileProvider no exportados. Backup/transferencia excluidos, SQLite en `no_backup`. FileProvider estrechado de almacenamiento externo completo a `external-files/Pictures/`, usado realmente por Capacitor. Sin `server.url` ni `allowNavigation` remoto: interfaz local, enlaces externos en navegador. HTTP localhost3000 sólo debug; HTTPS y WebView sin debug del candidato corresponden a16.

**Cambios preparados:** formulario compartido de eliminación web/app con Bearer/CORS; borrado SQLite/IndexedDB/ruta sólo del dueño, baja de push, aviso de pendientes y reintento de limpieza local. Google exige OAuth reciente de ESTA sesión en JWT verificado; la fecha global del usuario no basta. Canje por otra cuenta rechazado. Al volver a red/foco se valida Auth y el rechazo definitivo oculta Historia. Privacidad/términos/contacto/eliminación incluyen Android/FCM, evidencia retenida, desconexión y mínimo16; cambios locales aún sin publicar. El generador de markdown respeta ahora el directorio del build, evitando texto antiguo de `.next`.

**Dependencias:** auditoría16/10 detectó avisos críticos en Next14.2.35; actualización local a **Next15.5.28** y eslint-config equivalente, conservando React18/Tailwind3. Nueve entradas servidor adaptadas a parámetros asincrónicos. PostCSS8.5.30 (override también para Next), sharp0.35.5 y correcciones compatibles del lockfile. Auditoría de ejecución raíz y móvil: **0 avisos**. Persisten avisos de desarrollo en patrones/globs de Tailwind/ESLint y CLI→xcode→uuid: procesan fuentes/patrones del proyecto, no entradas de jugadores, y no entran al APK. Sin actualización mayor automática de Tailwind ni downgrade de Capacitor. [Aviso Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [guía Next15](https://nextjs.org/docs/app/guides/upgrading/version-15). Producción sin modificar.

**Formularios preparados para18, sin cargarlos:** declarar nombre/ID/email; fotos, mensajes/reseñas/contenido opcionales; actividad/interacciones de juego; identificadores de instalación/recepción para avisos opcionales; diagnóstico técnico y país aproximado de analítica. Finalidades: cuenta, funcionamiento, seguridad/abuso, soporte, analítica y comunicaciones elegidas. Recogida no efímera donde se guarda en servidor. Proveedores de servicio y comunicaciones iniciadas por el usuario requieren evaluar las excepciones de “compartido” del formulario real; no declarar automáticamente venta/publicidad. Eliminación desde app y `https://www.trucazo.com.ar/eliminar-cuenta`, HTTPS en candidato final; sin revisión independiente acreditada ni cobros/anuncios/suscripciones/GPS/acceso a la agenda del teléfono. Revalidar categorías exactas contra candidato16/17 e Installations transitivo. [Seguridad de datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es), [Firebase](https://firebase.google.com/docs/android/play-data-disclosure), [borrado](https://support.google.com/googleplay/android-developer/answer/13327111?hl=es).

**Clasificación preparada:** cartas/truco; monedas ficticias arriesgadas y ganadas/perdidas, sin compra, retiro, canje o premios de valor real. Declarar mecánica cuando se pregunte por apuestas simuladas; no decir “sin apuestas” sólo por ser ficticias. Interacción online, chat libre, nombres/grupos y fotos de usuarios; reportes/bloqueos/moderación. No afirmar clasificación o idoneidad sólo por no usar dinero real. Público16+, distribución mundial condicionada a Play/mercados/IARC; no se recopila fecha de nacimiento ni se afirma verificar edad. [Público](https://support.google.com/googleplay/android-developer/answer/9867159?hl=es), [clasificación](https://support.google.com/googleplay/android-developer/answer/9898843?hl=es).

**Pruebas parciales:** tipos; identidad/reintentos; handler real con Auth/Storage simulados (origen, Bearer explícito en claims, OAuth viejo rechazado aunque otro ingreso sea reciente, ID ajeno ignorado, respuesta durable202); navegador aislado con formulario real y dos guardados ficticios (aviso2 pendientes, contraseña errónea, borrado propio/conservación del otro). PKCE/Google/recuperación, contrato cookies/Bearer y convivencia/push SQL aislados pasaron, sin envíos. Next15 construido y servidor3000 reiniciado PID13748 con `android/generated/android-15-next`; build14 conservado. APK0.14.0/código14 en preparación/aceptación; borrado real descartable/Google pendiente. Evidencia `android/generated/android-15-*.json/log/png`. **15 sigue en curso.**

**Borrado real autorizado, 16/10:** descartable `androiddelete156cbb16d9`/UUID `6de94fac-3662-438b-aae1-7c5281ad1dd6`, credenciales sólo en carpeta privada ignorada. Perfil ordinario, correos apagados, avatar de ensayo, Historia descargada y recepción FCM activada sin enviar avisos. Borrado desde el formulario del APK aprobado: Auth, perfil, archivo, fila SQLite, ruta/sesión y vínculo/consentimiento push retirados; cero dispositivos residuales y cero trabajos pendientes. Sesión anterior independiente recibe401 en Historia/push, no puede modificar preferencias y no renueva el token. `android-15-deletion-real.json`. No recrear ni volver a borrar esa cuenta; las tres QA siguen intactas. Google real todavía pendiente dentro de esta sesión.

**Revisión ampliada:** lecturas reales con las tres QA rechazan administración, manos ajenas y tablas privadas de dispositivos/denuncias; las manos históricas de parejas visibles coinciden con el asiento propio. No hay tablas públicas accesibles sin RLS ni manos en Realtime. Se inspeccionaron los avisos del asesor: permisos `security definer` esperados en RPC con autorización interna; `admin_player`/`claim_table_notification` rechazan anon también en producción y `preview_table_invite` sólo expone la vista acotada de un token opaco de invitación. Los28 avisos de `search_path` corresponden a utilidades/funciones invocadoras; `force_profile_defaults` no es definer y los clientes no pueden crear objetos en `public`. Se conservan avisos de `pg_net` enpublic, tablas privadas con RLS sin política cliente y protección de contraseñas filtradas desactivada; no se presenta como asesor sin avisos ni auditoría independiente. [Referencia del asesor](https://supabase.com/docs/guides/database/database-advisors), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**Artefacto e inventario:** el APK incluye AndroidX DataStore1.1.7, Firebase Installations18.0.0 y DataTransport3.1.9 además de Messaging25.0.1. DataStore agrega `libdatastore_shared_counter.so` para arm64/armeabi/x86/x86_64: existen bibliotecas C/C++, su comprobación16KB corresponde a16 y no debe omitirse. También se exporta `androidx.profileinstaller.ProfileInstallReceiver`, protegido por `android.permission.DUMP`. Las170 entradas de código/recursos del primer inventario no coinciden con credenciales privadas locales; prefijos genéricos del SDK se distinguen de claves reales. Fuente pública y diagnósticos propios revisados:350 archivos/29 evidencias, cero coincidencias. Los archivos privados y `google-services.json` siguen ignorados. `inspect-privacy.ps1`, `android-15-apk-inventory.json`, `android-15-gradle-dependencies.log` y `android-15-source-security.json` permiten repetir el control con el artefacto final.

**Licencias:** copia oficial OFL1.1 de Geist en `src/app/fonts/OFL.txt`; avisos de los paquetes realmente empaquetados generados en `third-party-notices.txt`, accesibles sin red en Ayuda → Licencias de componentes. React18.3.1, Capacitor, Supabase y sus dependencias conservan sus textos MIT/Apache. La importación suplementaria de Vercel Analytics del componente compartido de partida se sustituye al empaquetar Android: la analítica propia sigue funcionando, sin ese SDK ni el de Speed Insights. Lista real de entradas en `android-mobile-bundle.json`, no incluida como fuente en la app. Falta respuesta del dueño sobre derechos de imágenes; no se infiere por su presencia en Git. [Geist oficial](https://github.com/vercel/geist-font).

**Detalle de aceptación de analítica:** la primera comprobación real no encontró eventos del APK. Capacitor8.5.3 usa el User-Agent de configuración, vacío por defecto, en sus solicitudes nativas; el filtro web las descarta como bot. El transporte ahora envía `x-cap-user-agent` con el WebView real, que Capacitor convierte en User-Agent. La API local con Bearer QA3/UAWebView/origenAndroid guardó una vista `/profile` en Supabase; su visitante exclusivo de ensayo se retiró sin tocar otros eventos (`android-15-analytics-api-real.json`). Falta comprobar el evento natural del APK final cuando termine el ingreso personal. No se declara finalizada esa aceptación sólo por recibir204. Privacidad aclara contraseña procesada por Auth y foto básica Google usada como avatar si no hay una propia.

Al retomar se comprobó también el transporte **CapacitorHttp del APK final instalado**, con el encabezado real del WebView, API Next y Postgres: `/profile` persistió para QA3 y se retiró sólo el visitante exclusivo del ensayo. La sesión del APK y el flujo Google no se sustituyeron por tokens QA. `android-15-analytics-native-transport-real.json`. La primera petición de diagnóstico no respondió mientras el navegador Google estaba delante; al traer Trucazo pasó, coherente con su suspensión. Google volvió a abrirse por el botón normal. Esto comprueba el transporte con un payload controlado; el evento natural de navegación sigue pendiente del ingreso.

**Logs corregidos en15:** el puente Capacitor debug registraba los datos de las peticiones, incluidos encabezados Bearer de QA: dos líneas detectadas, sin imprimir sus valores. Se fijó `loggingBehavior: none` para todos los APK, se reconstruyó e instaló conservando los cinco guardados y se retiró el búfer de logs de prueba. En la instalación se comprobó `Capacitor.isLoggingEnabled=false`; una nueva petición nativa real guardó el evento y dejó **cero líneas con Bearer**. `android-15-runtime-logs.json`. El inspector del APK exige ahora esa configuración; el escaneo de fuentes/evidencias también detecta JWT privados reales, sin confundirlos con la llave pública anon. Captura temporal de Google retirada; no se guardaron logs crudos con tokens en las evidencias públicas.

**Corrección del artefacto QA durante el ingreso personal:** al reconstruir para apagar logs se omitió `MOBILE_API_ORIGIN`; el valor por defecto apuntó a la web publicada. El dueño llegó al lobby de Chrome, pero el APK seguía sin sesión: ese intento **no acredita ingreso Google nativo** ni identifica la cuenta a borrar. Se comprobaron otra vez servidor200 y cinco hashes idénticos; se reconstruyó con `$env:MOBILE_API_ORIGIN='http://localhost:3000'` antes de `npm.cmd --prefix apps/mobile run apk:debug`, sin cambiar Auth, Firebase o SQL. El inspector ahora rechaza un APK QA de15 sin esa dirección. Recursos instalados iguales al build y observación real del botón: retorno `http://localhost:3000/auth/mobile`, ya autorizado en07 (`android-15-native-destinations.json`, sin códigos ni parámetros). Se volvió a abrir el acceso y se indicó al dueño elegir Google y luego **Abrir Trucazo**. Google nativo, cuenta autorizada y borrado siguen pendientes hasta comprobarlos. Para16 verificar retornos HTTPS del dominio/paquete final y su lista permitida, además del despliegue compatible ya previsto; no usar esta dirección QA en el candidato final.

El siguiente retorno tampoco se contó como aceptado: Chrome llegó al lobby de su sesión previa con `bad_oauth_state` / «OAuth state has expired» y el APK continuó sin usuario. Diagnóstico sin tokens: el intento local correcto llevaba **924 segundos**, con el mismo nonce que la app. Se renueva sólo cuando el dueño está listo, como última acción antes de pedir su ingreso; no dejar el selector abierto durante compilaciones, documentación u otras comprobaciones. La sesión personal previa de Chrome no se elimina ni se utiliza para borrar cuentas.

**Ingreso real confirmado después de renovar:** Auth y la firma del JWT verificaron OAuth reciente (103s), sujeto correcto y retorno dentro del APK a `/eliminar-cuenta`. Era **SantiBP**, UUID `d1512143-e3c0-44c3-8f2c-8904197f5fdb`, administradora con email/Google vinculados; se protege, se retira del formulario y se cierra sólo su sesión de esta instalación, sin borrarla ni operar la sesión previa de Chrome. `android-15-google-login-real.json`. QA3 volvió por formulario normal. Su navegación natural del APK final guardó vistas `/lobby` en Postgres por la API local: `android-15-analytics-native-real.json`; la aceptación de analítica queda cumplida, además del ensayo controlado del transporte.

**Decisiones personales recibidas a continuación:** el dueño identificó otro Google para crear y borrar una cuenta nueva de Trucazo; correo sólo en `android/generated/private/android-15-google-account.json`. El ensayo rechaza las cinco cuentas preservadas y SantiBP, administradores y una cuenta que ya existiera antes de esta autorización. Si ya existía, se presenta su estado al dueño antes de cualquier borrado. Personajes, avatares, fondos e ícono confirmados por el dueño como propios/generados con IA el16/10; se registra su declaración de procedencia, conservando por separado las cartas GNU con CC BY-SA3.0 y Geist OFL1.1. No se reemplazó arte ni se declara una auditoría jurídica independiente. El borrado Google y la reconexión se completaron después, según el cierre final; sin iniciar16 ni publicar.

**Cartas identificadas en la revisión visual:** la baraja GNU local coincide con la de Germarquezm y la versión completa de Basquetteur, publicadas en Wikimedia con CC BY-SA3.0. Se conservan las imágenes y se incorpora `public/cartas/LICENCIA.txt` con autores, fuentes, licencia, cambios de formato/tamaño y créditos anteriores; se incluye también en los avisos del APK. El as de oros y el caballo de bastos se contrastaron visualmente con la fuente. No son obra propia ni se atribuyen a Trucazo. La confirmación del dueño sobre el resto de las imágenes se recibió después y quedó registrada arriba. [Fuente base](https://commons.wikimedia.org/wiki/File:Baraja_espa%C3%B1ola.svg), [versión completa y licencia](https://commons.wikimedia.org/wiki/File:Baraja_espa%C3%B1ola_completa.png).

**Sonidos:** sólo están presentes `carta.wav`, `gano.wav` y `perdi.wav`; el archivo original `src/lib/sounds.ts` del commit de incorporación `0f83ef6` los identifica expresamente como «Neutros (los generamos nosotros)». Procedencia interna registrada en el historial, sin atribución externa declarada. Los cantos MP3 enumerados por el código no existen como archivos y no se presentan como recursos incluidos. No se cambiaron los sonidos.

**Punto de control técnico histórico de15, previo al último ingreso y al cierre del16/10:** servidor y AVD estaban apagados; se levantaron y se comprobaron primero los cinco hashes, todos idénticos y sin pendientes (`android-15-resume-preserved.json`). Se construyó e instaló la actualización debug0.14.0/código14, misma firma anterior, sin borrar datos. Copia `android/artifacts/ANDROID-15/trucazo-capacitor-0.14.0-debug.apk`, SHA256 `23acc0d6bb57091999c86734fe33ebd02887c6641caced16c07550938a028493`. Programa, CSS, HTML y licencias servidos por el APK coinciden con el build (`android-15-installed-resources.json`); cinco hashes y tres QA/saldos conservados después de instalar. Servidor final3000/PID17004, `android/generated/android-15-next-final`, build `53su4iwFit3103yw1WsAT`. No reconstruir esa carpeta con el servidor abierto. Tipos, lint (siete avisos previos), controles de identidad, formulario web/app aislado, PKCE y allowlist109/10 aprobados otra vez. Inventario final:170 entradas examinadas, cero claves privadas; fuentes/evidencias351/51 sin coincidencias. Ventana `Trucazo-Google-prueba` abierta en `emulator-5554`, ingreso OAuth iniciado por el botón normal; todavía sin cuenta ingresada. Falta identificar y autorizar el Google de prueba, reautenticación/borrado web y comprobación de su efecto al reconectar la app, evento natural de analítica, y confirmar procedencia de imágenes restantes. No se operó la sesión/guardado de Chrome ni se importaron tokens. `android-15-artifact.json` mantiene `closed=false`; no hay acta de cierre ni inicio de16. Los textos públicos nuevos y las API aún deben desplegarse con autorización antes de la aceptación/distribución; comprobar ese orden en16/17/18, sin activar push público ni confirmación de email.

**Mapa de tipos para cargar en18:** la definición de Play de “Contactos” incluye el grafo social; no depende de pedir permiso a la agenda. Declarar amistades/relaciones opcionales del juego en ese tipo. Los identificadores de visitante/sesión de analítica son automáticos aunque FCM sea opcional: al responder por el tipo agregado “IDs de dispositivo o de otro tipo”, no marcarlo enteramente opcional sólo por poder apagar avisos. No se recopila la agenda del teléfono. [Definiciones oficiales](https://support.google.com/googleplay/android-developer/answer/10787469?hl=es).

| Tipo de Play preparado | Datos concretos y condición | Finalidad |
| --- | --- | --- |
| Nombre, email, ID de usuario | Usuario/UUID/email requeridos por cuenta; identidad básica Google cuando se elige ese acceso | Cuenta, funcionamiento, seguridad; email también comunicaciones elegidas |
| Fotos | Avatar propio/Google y fotos de soporte/evidencia, opcionales | Perfil/soporte/prevención de abuso |
| Otros mensajes de la app | Chat libre, opcional | Comunicación entre jugadores/seguridad |
| Contactos | Amistades y relaciones sociales del juego, opcionales; sin acceso a agenda | Funciones sociales/seguridad |
| Interacciones y otras acciones | Pantallas/eventos automáticos; partidas, progreso, monedas y equipamiento al usar el juego | Funcionamiento, analítica y seguridad |
| Otro contenido generado | Nombres de mesas/grupos, descripciones, reseñas y denuncias, voluntarios | Funcionamiento, soporte y moderación |
| Historial de compras | Registrar la adquisición de cosméticos con monedas ficticias cuando se usa la tienda; sin tarjetas, cobros o cuentas financieras | Funcionamiento de tienda/equipamiento; contrastar la pregunta exacta de18 sin presentarlo como dinero real |
| Búsquedas en la app | Nombres buscados para personas/contactos, opcionales; sin historial propio, pero los GET incluyen el nombre en la consulta registrada por Supabase | Función social/seguridad; declarar tratamiento no efímero por los registros técnicos del proveedor |
| Ubicación aproximada | País inferido de IP en analítica, sin GPS | Analítica y diagnóstico |
| IDs de dispositivo u otros | UUID de visitante/sesión automáticos; FID/token/vínculo opcionales para notificaciones | Analítica, funcionamiento y seguridad; no publicidad |
| Diagnósticos | Datos técnicos y registros de los proveedores; sin SDK de fallos del cliente o grabación de pantalla | Operación/diagnóstico; contrastar con los SDK y registros del candidato |

Los datos que permanecen sólo en SQLite y nunca salen no se declaran por el mero almacenamiento local; los resultados/progreso que se sincronizan sí se incluyen en actividad de juego. La app no lee email del buzón, SMS, audio, vídeos, calendario, documentos o historial de navegación externo ni el inventario de apps. Los correos que envía el servicio no equivalen a leer la casilla del usuario. La declaración final debe conservar estas distinciones y los fines por tipo, además de revisar las excepciones de compartición.

La búsqueda exacta de Convivencia usa GET PostgREST con el nombre en la consulta. La documentación del proveedor confirma que sus logs de API incluyen la URL y la consulta: por eso no se prepara como tratamiento efímero aunque no exista una tabla propia de búsquedas. Privacidad aclara esta retención técnica. [Campos registrados por Supabase](https://supabase.com/docs/guides/troubleshooting/discovering-and-interpreting-api-errors-in-the-logs-7xREI9). El borrado nativo confirma después del commit SQLite y apaga primero la recepción local; si falla la escritura, muestra el reintento de limpieza sin fingir que se retiró el guardado.

<a id="android-etapa-16"></a>

#### ANDROID-16 — Identidad final, firma y candidato de entrega

**Empieza con:** 15 cerrada; identificador definitivo, nombre/ícono y mínimo compatible decididos y documentados. La propuesta inicial `ar.com.trucazo.app` fue confirmada por el dueño dentro de16; identifica las futuras instalaciones y actualizaciones.

**Trabajo:** fijar paquete y versiones, configurar ícono adaptativo/arranque y compilación objetivo vigente; preparar **AAB** (paquete que usa Play para distribuir) y APK release para pruebas locales. Firma de subida protegida, comandos reproducibles y respaldo fuera de Git de sus archivos privados; documentar ubicación/recuperación sin contraseña o clave. Ajustar configuración final de OAuth/Firebase/enlaces, separar certificados debug/subida/Play y registrar los que aún entregue Play en 18. Adaptar el workflow para Capacitor sin romper CI web/SQL; construcción de pruebas sin secretos productivos y firma sólo en entorno protegido.

**Verificación y final:** artefactos release construidos con recursos locales, configuración HTTPS real, sin servidor localhost/puente adb obligatorio, llaves privadas, menús de prueba ni debug WebView de producción. Inspectar paquete, versión, firma, permisos, ABI/bibliotecas y 16 KB cuando corresponda. Probar instalación limpia y actualización con mismo paquete/firma conservando partida/cola; el cambio de paquete provisional al final se trata como otra instalación y se sincroniza antes, sin prometer migración automática. Validaciones web/SQL/app pertinentes aprobadas; backend/configuración necesaria disponible o pendiente de aplicación identificado antes de 17.

**Entrega a 17:** candidato identificable por versión/commit o estado local/hash, AAB/APK, comandos, firma pública, inventario de configuración y orden de despliegue compatible. [Firma y Play App Signing](https://developer.android.com/studio/publish/app-signing).

**Inicio real, 16/10/2026:** servidor de15 en3000/PID17004 responde200; `emulator-5554`, reverse3000 y forward9224 al WebView14241 comprobados. Cinco guardados idénticos (revisiones299/0/46/45/1, pendientes0, comprobantes5/0/1/1/0), evidencia `android/generated/android-16-before-preserved.json`. Las tres QA ingresan y conservan1070/26,1030/23,370/0; no se igualaron las fotos históricas de SQLite al lobby. Confirmación de email leída apagada. El acceso administrativo antiguo de `.mcp.json` responde401: no acredita una relectura actual de `native_push.settings`; último control en15, sin cambios de configuración en16. HTTPS público todavía devuelve404 en `/auth/mobile`, `/api/android/historia` y `/api/android/push`, y200 con `[]` en `/.well-known/assetlinks.json`. Preparar configuración y orden compatible antes de17, sin publicar en16. Identificador propuesto, nombre/ícono y mínimo Android10 consultados al dueño dentro de esta sesión; no se consideran confirmados por el transcurso del tiempo.

Firma de subida nueva creada fuera de Git, con permisos privados, en `C:\Users\santy\Desktop\proyectos\trucazo-entorno\android-signing`; respaldo idéntico comprobado en `C:\Users\santy\Documents\Trucazo-respaldo-firma`. Contienen `trucazo-upload.jks`, `signing.properties` y certificado público `upload-certificate.pem`; las contraseñas no se imprimen ni documentan. SHA256 público `D0:B0:84:C2:71:3D:D3:79:01:84:D1:F2:D0:74:CB:E9:FA:C0:E9:D8:5A:FE:92:A3:02:B4:11:64:FA:07:28:30`; SHA1 `D1:A2:63:B2:20:72:B2:00:F0:3C:C7:F2:F7:BF:A0:59:85:3C:77:D2`. Es firma de subida/local, no la futura firma de Play. Ambas copias están en esta PC: para pérdida del equipo se necesita una copia privada externa. Recuperación: restaurar los tres archivos del respaldo y ajustar sólo `storeFile` si cambia su ubicación; no regenerar la clave para una actualización.

**Identidad confirmada por el dueño en16:** `ar.com.trucazo.app`, nombre **Trucazo**, ícono existente y mínimo **Android10/API29**. Objetivo/compilación **API36**, de acuerdo con los [requisitos vigentes de Play](https://developer.android.com/google/play/requirements/target-sdk). Ícono adaptativo y arranque locales existentes conservados. Paquete QA `ar.com.trucazo.capacitor.dev` separado mediante sufijos de compilación; no cambia de firma ni pierde datos por crear la app definitiva. Las clases Java conservan su namespace interno anterior: el identificador instalado/firmado se inspecciona como `ar.com.trucazo.app`. Cambio del provisional al definitivo = instalación diferente, sin migración automática; los cinco guardados originales ya tenían cero pendientes antes de empezar y no se copiaron.

**Configuración preparada/aplicada:** Firebase del proyecto `trucazo-1dfcc` tiene ahora el cliente final `1:440283356897:android:e5f2eebb77f3edbc95a1a0`, con SHA1/SHA256 públicos de subida; cliente QA conservado. `google-services.json` local ignorado contiene ambos clientes; copia anterior privada conservada. No se repitió SQL ni se activó despacho push. OAuth conserva navegador externo/PKCE y callback Google en Supabase; el final solicita retorno HTTPS con `app=release`, el QA conserva su recorrido anterior. El puente web elige sólo entre esos dos esquemas conocidos, sin aceptar una URL libre. Pruebas aisladas pasan para ambos paquetes y para el puente web real de Next en3004. `ANDROID_RELEASE_SHA256_FINGERPRINTS` añade el final a `assetlinks` sin quitar TWA/QA; con la huella de subida el build local devuelve exactamente esa asociación. La firma real de Play se añadirá en18, sin reemplazar la de subida.

**Antes de aceptar/distribuir en17 — orden preparado, no ejecutado en16:**

1. Conservar las migraciones de Historia, convivencia y push ya aplicadas. No volver a correrlas por cambiar el paquete. El backend conserva el motor/catálogo v1 para partidas y resultados anteriores.
2. Desplegar de forma coordinada la web/API compatible de este árbol local en Vercel, región `gru1`. Conservar las variables existentes de Supabase/SMTP/push; añadir `ANDROID_RELEASE_SHA256_FINGERPRINTS` con el SHA256 de subida anterior. No poner llaves privadas en variables `NEXT_PUBLIC_*` ni en el APK. Mantener confirmación de email y despacho público apagados. Las API Android nuevas no deben seguir devolviendo404: sin sesión corresponde401; CORS sólo debe aceptar los orígenes previstos por `src/lib/app-request.ts`.
3. En Supabase → Authentication → URL Configuration, conservar las URLs actuales y añadir, si faltan: `https://www.trucazo.com.ar/auth/mobile`, `https://www.trucazo.com.ar/auth/mobile\?**`, `https://www.trucazo.com.ar/recuperar-cuenta` y `https://www.trucazo.com.ar/recuperar-cuenta\?**`. El comodín de consultas permite nonce, PKCE y `app=release`; no cambiar el callback de Google Cloud. Configuración preparada en07 y todavía pendiente de aplicación HTTPS al iniciar16.
4. Comprobar en `www.trucazo.com.ar` y `trucazo.com.ar` la asociación HTTPS, sin ocultar redirecciones: el manifest declara ambos hosts. Servir JSON200 con paquete/huella correctos en cada host declarado o acotar los hosts antes de aceptar enlaces automáticos. El `www` público respondía200 con `[]` al iniciar16; no se acredita asociación real con un intent dirigido.
5. Releer piloto/despacho con acceso administrativo vigente (el token local antiguo responde401), comprobar retornos Google/contraseña y FCM del paquete final y ejecutar la matriz de17 en teléfono. No distribuir el QA localhost como candidato. Aún no se habilita push para jugadores ni se sube a Play.

**Construcción reproducible local:** desde la raíz en PowerShell, `./apps/mobile/scripts/build-release.ps1 -SigningProperties C:/Users/santy/Desktop/proyectos/trucazo-entorno/android-signing/signing.properties`. Usa Node24, Java21, Gradle8.14.3, plugin Android8.13.0, Capacitor8.5.3, locks y herramientas fijadas por01; regenera recursos locales e impone `MOBILE_RELEASE=1` y `MOBILE_API_ORIGIN=https://www.trucazo.com.ar`. Gradle rechaza release sin firma, recursos de QA, versión despareja o cliente Firebase final ausente. `./apps/mobile/scripts/inspect-release.ps1 -Package ar.com.trucazo.app -CertificateSha256 D0B084C2713DD3790184D1F2D074CBE9FAC0E9D85AFE92A302B41164FA072830` verifica APK/AAB, firma, permisos, secretos, ELF64, ZIP y `BundleConfig.pb`. [Verificación oficial de16KB](https://developer.android.com/guide/practices/page-sizes); `InspectBundle.java` usa el protocolo de bundletool ya incluido por Gradle, sin descargar otro ejecutable.

**Automatización preparada:** `.github/workflows/capacitor.yml` conserva los workflows web/SQL/TWA. PR construye sólo debug con valores públicos ficticios, sin firma ni servicios reales. Release es manual, sólo desde `master`, después del job debug y en el entorno `android-release`. Antes de darle acceso a secretos, configurar ese entorno en GitHub con aprobación del dueño y limitar ramas a `master`; no se creó ni ejecutó aquí. Variables públicas: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ENABLE_2VS2`, `ENABLE_TOURNAMENTS`, `ENABLE_MATCH_CHAT`. Secretos del entorno: `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS`, `GOOGLE_SERVICES_JSON`; se cargan desde los archivos privados, nunca desde el chat o Git. Firma sólo en ese job, archivos temporales con permisos privados y retiro al terminar. Artefactos con retención acotada; no publica en Play.

**Cierre verificado de16:** APK/AAB **0.16.1/código17**, `ar.com.trucazo.app`, API29/36, firma de subida anterior. APK17.134.389bytes, SHA256 `064091d7bf4ec030877d7d1e6cd196bbb385969cada4e344ae4db83cd4e38785`; AAB10.451.612bytes, SHA256 `5cc94e2e0f78ab49f7888fefd96337a8f9bed8ba3008a6fb21cab4fb79288dc0`. Copias en `android/artifacts/ANDROID-16/trucazo-0.16.1-release.{apk,aab}`. Inventario `android/generated/android-16-release-inventory.json`:357 entradas examinadas, cero coincidencias de credenciales privadas; permisos de internet/red/notificaciones/FCM y receptor interno protegido, sin cámara/micrófono/ubicación. DataStore1.1.7 aporta `libdatastore_shared_counter.so` para arm64-v8a/armeabi-v7a/x86/x86_64; los segmentos ELF64 de ARM64 y x86_64 están alineados a16384bytes en APK y AAB. `zipalign -c -P16` pasa y el AAB declara `PAGE_ALIGNMENT_16K`. No se afirma haber ejecutado un teléfono de16KB.

**Instalación/actualización reales en emulador Android11/API30:** instalación limpia de0.16.0/código16, seguida de `install -r --no-streaming` de0.16.1/código17 con mismo paquete y certificado. Una campaña **ficticia**, creada por el motor existente, tenía una partida abierta y un resultado pendiente; el plugin SQLite real conservó exactamente el cuerpo completo tras la actualización. No es una cuenta real ni una sincronización/premio oficial. El comprobador Android firmado se instaló aparte: verificó código17, `FLAG_DEBUGGABLE` apagado, WebView sin depuración, logs detallados apagados y ausencia de `server.url`. Las fases de lectura y limpieza pasaron con reverse3000 retirado; después se restauró. Se retiraron sólo la fila ficticia y `ar.com.trucazo.app.test`. Evidencias `android-16-update-release.json`, `android-16-native-{verify,cleanup}.log`; fuentes de prueba en `src/androidTest/`, nunca incluidas en APK/AAB de entrega. Candidato final queda instalado sin sesión, QA anterior en lobbyQA3, sin cambios en Chrome/TWA.

Para reproducir el ensayo en un emulador de prueba, generar el fixture con `node --import tsx apps/mobile/scripts/prepare-update-fixture.ts`; cargar `TRUCAZO_SIGNING_PROPERTIES` con la ruta privada anterior y construir `gradle -p apps/mobile/android -PtrucazoReleaseTest assembleReleaseAndroidTest --no-daemon`. El fixture no debe enviarse a Supabase. Instalar baseline y comprobador; ejecutar la clase `ar.com.trucazo.capacitor.dev.ReleaseUpdateTest` con `phase=seed`. Actualizar al candidato con la misma firma y ejecutar `phase=verify`, `expectedVersion=17`; terminar con `phase=cleanup` y retirar únicamente el paquete `.app.test`. No ejecutar `seed` sobre datos reales ni desinstalar el paquete provisional para imitar una migración.

**Regresión/cierre:** PKCE/alta/Google/recuperación aislados para ambos paquetes; puente real Next con ambos retornos, cancelación y exclusión de analítica; asociación local con huella exacta; cuatro comprobaciones Android,109RPC cliente/10sólo servidor, tipos, lint y builds web/móvil aprobados. Siete avisos web y advertencias Gradle previas conservados. Build web aislado `android/generated/android-16-next`, ID `BoNuu6CquItU7YrMBvHfw`, se probó en3004 y su proceso fue cerrado; el de15 en3000/PID17004 continúa intacto. Workflow preparado, no ejecutado en GitHub. Manifiesto de fuentes `android-16-source-manifest.json`, digest `48fb795d82950263ce71ed51111ca3ab774b17dd61aa19bcd733553945029523`; acta `android-16-close.json`. Cinco guardados idénticos y tres QA con mismos saldos al cerrar. Email releído apagado. La lectura administrativa de push falló401 y queda documentada; no hubo cambios a su configuración, despachos ni campañas. No hubo SQL de esquema, despliegue web, commit/PR, publicación ni comienzo de17. Los pasos HTTPS anteriores son requisitos identificados **antes** de aceptar/distribuir en17, conforme al alcance de16.

<a id="android-etapa-17"></a>

#### ANDROID-17 — Aceptación integral del candidato

**Inicio real, 26/10/2026:** lectura de instrucciones, traspaso16 e integración21/10 completada. Servidor anterior apagado: se reabrió en3000 con `android/generated/android-15-next-final`, sin reconstruir esa carpeta; responde200. Emulador `Trucazo_Android_11` reabierto sin wipe, QA14 conservado, reverse3000 y forward9224 restablecidos. Los cinco guardados coinciden exactamente con `android-16-preserved.json` (hash, revisión, pendientes y comprobantes); evidencia `android/generated/android-17-before-preserved.json`. Las tres QA ingresan y conservan1070/26,1030/23,370/0. Confirmación de email leída apagada; `native_push.settings` releído por conector autenticado: `pilot=true`, `dispatch_enabled=false`. Rutas HTTPS Android/puente todavía404; asociación `www`200 con `[]`, dominio raíz308 hacia `www`. Windows reconoce Redmi14C por USB, todavía sin interfaz ADB al primer control; se coordina la autorización de depuración en esta misma sesión. Sin instalación, SQL, despliegue ni publicación en este control inicial. Cambios locales previos de envido conservados.

**Empieza con:** 16 cerrada y servicios reales compatibles disponibles. Si falta aplicar/desplegar un cambio necesario, preparar/verificar ese paso antes de presentar un resultado final.

**Avance de17, 26/10/2026 (en curso):** Redmi14C `2409BRN2CA`, Android16/API36, WebView155.0.8059.43,720×1640/densidad320 conectado y autorizado por USB. Instalación limpia del APK original0.16.1/17; ingreso normal deQA1 por email y lobby Supabase HTTPS reales. Actualización física a0.17.0/18 con la misma firma conservó cuerpo exacto de partida abierta/cola ficticias (comprobador separado firmado, nunca incluidas en release ni enviadas a Supabase); fixture retirado y sesiónQA1 conservada. Interfaz del lobby a1560,9ms desde navegación: todavía no acredita arranque completo desde el ícono. Candidato0.17.1/19 construido con parejas/torneos/chat como producción y señal Android `reportFullyDrawn` al quedar el lobby utilizable; falta inspección/aceptación final. Batería inicial78%, cargando por USB; autonomía todavía sin medir.

**Servicios aplicados en17:** con aprobación expresa del dueño, cuatro retornos `www` añadidos en Supabase, conservando siete anteriores. Dueño ejecutó `20261027005516_android_version_compatibility.sql`: política mínima17 sin reemplazo ni retiro activado. Se detectó que el nuevo control previo omitía el rol interno del servidor; no se editó la migración aplicada. Dueño ejecutó la corrección nueva `20261027013911_android_compatibility_service_role.sql`; acceso interno y login real por usuario comprobados200, evidencia `android-17-service-role-corrected.json`. Prueba aislada incluye ahora ese rol. Huella pública de subida guardada en Vercel con aprobación expresa; opciones de preview pendientes hasta crear la rama autorizada `codex/android-17-acceptance`. Web/API pública aún sin despliegue Android; región productiva releída `gru1`, revisión `16b1bda` del PR143. Cambio publicado de recuperación del lobby incorporado y probado; envido adaptado previo conservado, archivo incremental alineado al canónico de GitHub con respaldo local previo en `android/generated/android-17-envido-local-before.sql`; corrección de envido ya aplicada, no repetida. Token administrativo antiguo no se reutilizó para cambiar configuración. Email y despacho público siguen apagados. Sin publicación Play.

**Contrato preparado y probado:** `trucazo-online-v1`, guardado `historia-local-v1`, motor `historia-bots-v1`, sin migración de guardados. `public.app_compatibility` vincula versión a `session_id` firmado por Auth; omitir cabeceras no retira ese vínculo. El control PostgREST rechaza operaciones nuevas desde sesiones retiradas y conserva lecturas/RLS y operaciones v1 para terminar partidas o sincronizar resultados. Middleware Next cubre escrituras Bearer; recuperación/borrado conservan acceso. Es control de compatibilidad, no certificación criptográfica del binario ni sustituto de permisos. No hay versiones previas públicas de Play:17 es base interna heredada sin registro;18/19 son bases internas comparables con registro. No retirar17 ni romper su contrato durante esta aceptación. Para futuras versiones públicas registradas, el dueño autoriza una mínima sólo tras comprobar reemplazo disponible por su canal, conservar partidas y validadores previos, y aprobar la matriz. Pruebas locales admitido/retirado/GET-RPC/cabeceras omitidas/servicio inaccesible/reintento/fin de partida/premio único pasan; evidencias `android-17-version-{sql,browser}.json`. Compatibilidad instalada con servicios nuevos, matriz integral, batería y arranque completo siguen pendientes de cierre en esta misma sesión.

**Avances iniciales del27/10/2026 — registro histórico; cierre en el acta posterior:**

- **Candidato:** APK/AAB `android/artifacts/ANDROID-17/trucazo-0.17.1-release.{apk,aab}`, 17.160.637/10.459.425 bytes. SHA256 APK `e7a33961baea06847f58ca450c446ad733e75145d20a0551518b235ee8c0c551`; AAB `ca2f86970d73c214f6a516fbafcd921f8b06c54c550656f7c80e09767d79b437`. Misma firma de16, HTTPS `www`, recursos locales y parejas/torneos/chat como producción. Inspección final aprobada: no depuración ni credenciales privadas; alineación16KB de bibliotecas y paquetes comprobada. Teléfono y emulador tienen código19; QA14 y sus cinco guardados permanecen separados.
- **Rendimiento físico:** Redmi14C/Android16, WebView155, WiFi y sesiónQA1 conservada. Tres arranques fríos hasta lobby utilizable, medidos por Android `reportFullyDrawn`: **2333,2319,2100 ms**, todos bajo3000 ms. Primer cuadro1013,1192,1016 ms. Evidencia `android-17-phone-startup.json`; no sustituirla por la marca anterior de navegación1560,9 ms. USB cargando durante este ensayo; no mide batería.
- **Juego físico real:** QA1 en Redmi contra sesiónSDK propia deQA2, partida privada15 `f4a8e6e1-de81-4968-ae3f-2a9ddc2799d8`, terminada0–15 con falta envido, declaración, manos privadas y premio único. Desfase de10 minutos simulado sólo en `Date.now` de JavaScript: reloj de partida partió del servidor; reloj Android intacto. Parejas privadas a30, tres QA y un bot: emulador `d41c2204-9e68-4ab9-85dd-d110f1d7a2ae` y teléfono `488e606e-f23a-4b5b-8c7f-eb4fa8994776`; truco aceptado y carta jugada desde el APK, controles completos sin scroll (altos568/820). Se terminaron por abandono normal para limpiar las mesas; no se presentan como partidas completas a30. Sin duplicar premios al reiterar. Evidencias `android-17-{phone,emulator}-team-real.json` y `android-17-phone-online-15.json`. Saldos QA después de estas partidas normales:1020/26,1080/23,350/0; no se compensaron ni alteraron fotos históricas de SQLite.
- **Sesión física:** renovación contra Auth HTTPS real aprobada enQA1 adelantando únicamente el vencimiento local y recargando. Token de renovación rotado, misma cuenta y lobby utilizable; no se copiaron tokens ni se cambió el reloj. Evidencia `android-17-phone-renewal.json`. CambioQA1→QA2→QA3 sigue pendiente en el firmado: el intento en emulador no completó el logout mientras la API pública nueva de push está ausente. No retirar sesiones a mano para simular el recorrido.
- **Servicios:** fuentes autorizadas subidas a `codex/android-17-acceptance`, commit `a9e6838`, sobre producción `16b1bda`. Preview construido enSão Paulo: `https://trucazo-en1u4jp9m-trucazo.vercel.app` (`dpl_4RLJUjSMVo8VJUtP7naFdwGEppYb`); asociación final con paquete/huella comprobada desde Chrome autenticado. Huella pública guardada en producción/preview; tres opciones de parejas/torneos/chat guardadas sólo para esta rama como las productivas. Preview protegido por acceso Vercel; no se desactivó esa protección. Dueño autorizó Firebase privado existente y paquete final en Vercel, todavía **sin guardar** porque falta acceso autenticado al panel. No crear otra clave. Dueño indicó **«Todavía no despliegues en producción»**: producción sigue en `16b1bda`, sin promoción ni cambio de `master`; los retornos/API nuevos del dominio público siguen pendientes. Sin publicación Play.
- **Regresión:** tipos, lint (cero errores/seis advertencias previas), construcciones, lista RPC, compatibilidad SQL/UI/Next, acceso/PKCE/recuperación, Historia/sync, reglas/interfaz de parejas y torneos, convivencia, push y privacidad aislados aprobados. Los primeros ensayos de parejas/torneos/convivencia no tenían la respuesta simulada de compatibilidad: se corrigieron sólo sus fixtures y pasaron al repetir. Comparación del `app.js` exacto del APK17 intacto y del candidato19 con el mismo SQL nuevo enPGlite: ingreso/lobby,1v1, monedas y reconexión aprobados; sólo19 ejecutó los casos nuevos de invitación/recuperación. Esos ensayos interceptan Auth/Realtime y no acreditan por sí solos toda la compatibilidad HTTPS instalada ni parejas/Historia entre versiones. API Next local de producción en3004 comprobada con identidadQA real, CORS y rechazos anónimos. No se ejecutó aún la reconstrucción completa del CI PostgreSQL.
- **Batería en curso:** el dueño reconectó USB y luego confirmó desenchufarlo para15 minutos de lobby visible con WiFi. Comprobador firmado separado registra carga, porcentaje, temperatura y contador nativo cada30 s; mantiene la pantalla encendida sólo durante este ensayo. Brillo255/manual. Se usarán exclusivamente intervalos sin carga; esperar reconexión y recuperar muestras antes de evaluar. El APK de entrega conserva su hash.

**Pendientes vigentes que impiden cerrar17:** Google/recuperación válidos; Historia fría/sync/reintentos/mezcla entre dispositivos y versiones; restantes recorridos de la matriz de torneos, perfil/social, borrado autorizado y presentación/sistema. CI completo, despliegue HTTPS autorizado, cambio entre las tres QA, enlaces físicos fríos/calientes y recepción/toque push físico ya aprobados (registro posterior abajo). La referencia física de batería ya fue aceptada. Las pruebas aisladas previas reducen regresiones, pero no se anotan como aceptación física o pública. Mantener email y push público apagados y continuar dentro de esta etapa.

**Configuración y revisión posteriores del27/10:** dueño inició sesión en Vercel y pegó personalmente el JSON existente en el campo secreto. Guardado confirmado en panel y por metadatos del conector, sin leer/revelar el valor: `ANDROID_PUSH_SERVICE_ACCOUNT_JSON` de tipoSecret en producción y preview limitado a `codex/android-17-acceptance`; `ANDROID_PUSH_PACKAGE_ID=ar.com.trucazo.app` en esos mismos destinos. No se generó otra clave. La lectura por salida de proceso fue rechazada por revisión automática y no se ejecutó. Configuración guardada no equivale a FCM aceptado en el paquete final ni a despliegue productivo. Control remoto posterior: `pilot=true`, `dispatch_enabled=false`, mínima17/reemplazo no disponible. Los cinco guardados volvieron a coincidir exactamente en `android-17-preserved-20261027.json`.

PR de prueba **[145, en borrador](https://github.com/santibpapa/trucazo/pull/145)**, commit de evidencia `db32c99`, sin merge ni publicación. La revisión completa de GitHub detectó dos fallos de preparación limpia: manifiesto generado de Historia ausente antes de tipos, y foto de sync cargada antes de que existan claves/bots de sus dependencias. Correcciones preparadas: generar manifiesto antes de tipos y dejar que la migración de sync reconstruya su bloque en el orden histórico durante `rebuild-db.sh`; no se modifica SQL aplicado ni reglas del juego. Foto inicial de tablas verificada enPGlite; repetir CI completo antes de darlo por aprobado. Historial de la regresión aislada conservado;14 pruebas aprobadas en `android-17-regression-latest.json`. Un intento de redesplegar preview fue frenado por revisión automática por destino ambiguo y otro rechazado por laAPI; no crearon despliegue. Las correcciones necesarias de esta rama construirán un preview nuevo, conservando producción `16b1bda`.

**Candidato corregido y batería aceptada —27/10, avance posterior:**

- La captura física de la mesa mostró la cabecera bajo la franja de iconos Android: la mesa fija no heredaba el margen del `body`. Caso reproducido con34px superiores/47px inferiores; se corrigió el padding de la mesa compartida usando las variables nativas con respaldo `env`. El caso falla antes y pasa después, junto con cantos largos a320/360/768 y horizontal640×360. Sin cortar controles ni agregar scroll. Nuevo **0.17.2/código20**, misma firma; código de versión20 sigue perteneciendo a la etapa17.
- APK17.160.701 bytes, SHA256 `1efe8ae829bc2ed476dd51ac2b062b55cfe22ad22e5e4656fcd5c931a32571a1`; AAB SHA256 `e6f63ff72828c9ef906e110462e7a11cbd0da4060d1bc2acee9da4103fd6dd2a`. Artefactos `android/artifacts/ANDROID-17/trucazo-0.17.2-release.{apk,aab}`; inspección de firma, empaquetado y16KB aprobada en `android-17-release-20-inspection.log`. Tipos y118RPC cliente/10servidor aprobados. Fuentes en `bd6e67a`, rama yPR145 de prueba; sin merge ni despliegue productivo.
- Actualización física19→20 conservaQA1. Parejas a30, mesa privada `bd6c76a6-e416-4b10-87cc-79e9ac131bb7`, tresQA/bot: cabecera empieza exactamente a34px, controles terminan antes de la barra inferior47px, truco/carta, mano privada y premio único aprobados; cierre por abandono normal, no partida completa a30. Saldos después:QA1=1010/26,QA2=1090/23,QA3=340/0. Perfil/ranking/tienda/torneos/convivencia abren en360×820 sin alertas ni desborde horizontal. Evidencia `android-17-phone-{team-real,screens}-20.json` y capturas. Arranques fríos completos a lobby **1819,1906,1872ms**, primer cuadro986,1018,984ms: `android-17-phone-startup-20.json`; WiFi/sesión conservada/USB cargando.
- **Batería real de19:**38 muestras válidas cada30s,18,49997min continuos sin carga,75%→72%,135,246mAh por contador Android,24→28°C (mín24/máx28), lobby visible/WiFi/brillo255 manual. Se excluyeron cinco muestras con carga de43totales. El registro continuó localmente al desenchufarUSB y se recuperó del cache del comprobador separado al reconectar. `android-17-phone-battery-{raw,prepared}.json`, `android-17-phone-battery.json` y log de recuperación. Dueño respondió **«Sí, acepto esa referencia para ANDROID-17»**, con alcance de reposo visible; autonomía total y partidas largas requieren otros ensayos. La corrección20 sólo afecta márgenes de mesa; el lobby medido conserva su código. No se extrapola duración de una carga.
- **Revisión limpia:** construcción Android y base sin conexión de GitHub aprobadas. Reconstrucción completa PostgreSQL y primeras pruebas de juego/torneos/borrado/envido aprobadas; quedó una lista de prueba que no incluía las RPC autenticadas de06/12/13 y se actualizó conforme a los grants de sus migraciones. También se corrigieron carpeta de evidencia ausente, finales de líneaLinux, comprobación del catálogo apuntando al antiguo componente y dependencias móviles en las pruebas de vidas/invitaciones. No se cambian permisos reales ni se repite SQL aplicado. Esperar el resultado delCI de `bd6e67a` antes de marcar toda la revisión aprobada.
- La revisión automática rechazó volver a subir este documento operativo completo por sus referencias internas; los avances posteriores permanecen locales. Las correcciones de fuentes/pruebas se subieron sin esos datos y el resumen vigente delPR se actualizó. Producción sigue en `16b1bda`, por indicación expresa del dueño. Los cambios de fuentes generan únicamente preview de esta rama, con Firebase ya configurado.

**Comprobaciones posteriores del27/10:** candidato20 también instalado en Android11/WebView133; parejas privadas `5006d963-da8b-414b-8b3d-c566338a5bda`, cantos y carta desde APK, controles dentro del alto568, cierre por abandono y premio único: `android-17-emulator-team-real-20.json`. En este sistema WebView ya ocupa el área entre barras y las variables seguras valen0; en Redmi valen34/47. Partida completa a15 entre **QA1 en Redmi20 y QA2 en la web pública `www`**, `74be64b8-2ad4-47c6-bfc8-8cde2260ac5e`,0–15, falta envido/declaraciones mediante controles de ambas interfaces; reloj30s aunque `Date.now` del comprobador esté adelantado10min, sin cambiar relojAndroid. Mano propia porRLS y premio único: `android-17-phone-online-15-20.json` y capturas app/web. El acceso deQA2 fue normal por formulario y su perfil; creación/unión de mesa auxiliar porRPC QA propias, no se presenta como aceptación de todo el formulario web de entrada. Dos ajustes de selector de prueba (nombre oculto en menú de escritorio y atributo ausente en la web anterior) se resolvieron; una mesa creada durante el diagnóstico se cerró por abandono normal. Saldos actuales releídos:QA1=980/26,QA2=1120/23,QA3=330/0, sin compensaciones.

**Sistema físico:** el Redmi rechazó `adb shell input` por permiso de inyección; no se amplió la seguridadUSB para sortearlo. Dueño comprobó manualmente en el candidato20: teclado deja campo/botones visibles, primerAtrás oculta teclado, segundoAtrás cierra ventana y conserva app abierta; selectorAndroid de fotos abre, se cancela sin elegir/leer imágenes, foto intacta y Atrás vuelve al lobby. Confirmaciones guardadas en `android-17-phone-{keyboard,photo-picker}-manual-20.json`; estado final del lobby comprobado por lectura delAPK. El diagnóstico de inyección no se anota como prueba automática aprobada.

**CI y preview actuales:** commit `bd6e67a`, revisiones completas **Aplicación/Base de datos aprobadas**, además deCapacitor debug, prototipo y base sin conexión; prueba aislada deVidas aprobada. Invitaciones todavía en preparación de su copia independiente: esperar su resultado. Preview **`https://trucazo-a1t5n8kf8-trucazo.vercel.app`**, `dpl_2qknJMhR93NS1dwPyHtJzstCHcHf`, listo con los ajustesFirebase guardados antes de construirlo. AsociaciónHTTPS devuelve paquete final/huella exacta y APIpush exige cuenta desde navegador con accesoVercel; no se retiró protección. Esto no acredita envío/recepciónFCM ni publica los servicios bajo `www`. API pública Android/retornos y recorridos dependientes siguen pendientes de la decisión del dueño sobre producción. Diagnósticos app/web posteriores y documentación operativa se conservan locales; no forman otro despliegue.

**Revisión de la evidencia y último ensayo aislado:** `inspect-release.ps1` tenía el nombre fijo del inventario16 y las inspecciones posteriores lo habían reemplazado por el candidato más reciente. Se separó el inventario20 y se volvió a inspeccionar el APK/AAB16 intactos desde `android/artifacts/ANDROID-16/`; sus hashes originales coinciden. `android-16-release-inventory.json` es ahora una **reinspección del27/10**, no el archivo original fechado16/10; acta16 y artefactos originales no cambiaron. El comprobador acepta `-Report` y, al omitirlo, genera un informe por código delAPK para evitar volver a pisar evidencia histórica. Inventario20 explícito: `android-17-release-20-inventory.json`; ambos tienen cero credenciales privadas encontradas.

Invitaciones aprobó1v1/2v2 públicas/privadas, compartir, invitado, entrada por email y cobro único; se detuvo en el registro porque su fixture omitía aceptar las normas de convivencia añadidas en12. Se actualizó únicamente el ensayo para comprobar primero el botón deshabilitado y luego aceptar las normas en la copia descartable. Commit **`575bedc`**: aplicaciones, base, Capacitor, prototipo, base sin conexión yVidas aprobados; falta el resultado final deInvitaciones. No cambia el binario20 ni los servicios. El último Atrás del selector se comprobó por separado con el dueño y la lectura posterior confirmó `#/lobby` visible; se conserva la observación intermedia del perfil para no confundir confirmación manual con observación automática.

**27/10,16:03UTC — revisión completa aprobada:** terminóInvitaciones con éxito en `575bedc`. Todos los controles pertinentes deGitHub están aprobados (el preview temporal específico de otra rama se omite por su condición normal). Preview final de ese commit: `https://trucazo-d7tyzl49c-trucazo.vercel.app`, `dpl_Bchf6YZnLNFCSkvAUae8HaLvdAnd`, listo. Producción releída en `dpl_2jGEQ2tfCJafmD42MrCWac6rJf77`, commit `16b1bda`, sin cambios. Comprobación pública posterior: asociación200con`[]`, APIpush404, Historiaintegración404, retorno`/auth/mobile`404. Se presentó al dueño la opción de mantener producción detenida y continuar17 después, o autorizar el despliegue concreto de `575bedc` para completar la aceptación HTTPS. **Todavía no hay nueva autorización ni se desplegó producción.** Acta parcial `android-17-acceptance-progress.json`; no es cierre de17.

**27/10 — autorización y despliegue posteriores:** el dueño respondió **«Autorizar el despliegue y seguir ahora»** para `575bedc`, reemplazando la pausa anterior de producción para este candidato. Despliegue `dpl_ErPCi4JTe2sbtARPB5CgSiaR2ZB3`, READY en `gru1`, con alias `www.trucazo.com.ar`; versión previa `dpl_2jGEQ2tfCJafmD42MrCWac6rJf77` conservada READY para rollback. `master` y PR145 siguen sin integrar. APIs públicas Historia/identidad, push, preferencias y login por usuario comprobadas200 con QA1; acceso anónimo push401 y retornos HTTPS200. Evidencia `android-17-production-api-real.json`. APK20 físico: QA1→QA2 por email→QA3 por usuario→QA1 por usuario mediante formularios normales, aprobado en `android-17-release-account-switch-20.json`. Android verificó por su proceso normal el dominio `www` y la huella final, sin forzar el estado aprobado; `android-17-phone-app-links-verified.txt`. Esto acredita asociación, todavía no todos los retornos fríos/calientes de acceso. El dueño concedió el permiso Android de notificaciones para el piloto privado; recepción FCM física todavía en comprobación. `pilot=true`, `dispatch_enabled=false`, sin confirmación de email ni publicación Play.

**27/10 — push y enlaces físicos comprobados:** permiso concedido y alta normal deQA1 porHTTPS. Invitación privada QA2→QA1; API pública de envío200/aceptado, una entrega `sent`/un intento, y aviso visible en Redmi con app en segundo plano. El dueño tocó «Te invitaron a jugar» y confirmó Amigos/invitación; lectura posterior delAPK mostró `/comunidad` y la invitaciónQA2. `android-17-phone-push-20.json`. La amistad e invitación creadas sólo para el ensayo se retiraron porRPC normales; no hubo partida ni gasto. Normas de convivencia aceptadas únicamente enQA1/QA2. Baja desde pantalla conserva sesión/lobby, limpia vínculo y avisos; QA2 no hereda consentimientoQA1. Intents sintéticos de aviso de otra cuenta rechazados y de vencido explicados, con destino actual de comunidad; son comprobaciones del enlace tardío, no nuevas recepcionesFCM. QA1/push consentido restaurados: `android-17-phone-push-edges-20.json`.

App Links HTTPS, sin forzar paquete: apertura caliente de partida inexistente rechazada con mensaje seguro; apertura fría de comunidad carga Amigos. Callbacks no solicitados de Google/caliente y recuperación/frío rechazados. `android-17-phone-links-20.json` y capturas. El primer comprobador de arranque frío reiniciaba el proceso al reconectarse y perdió el destino observado; ese intento no se contó como fallo delAPK ni como aceptación. Se corrigió para observar la pantallaAndroid antes de iniciar instrumentación y pasó. Un intento intermedio no llegó a ejecutarse por cupo agotado de revisión automática; se retomó tras el pedido del dueño. Google y recuperación válidos siguen pendientes; no confundir estos rechazos de códigos ficticios con acceso real.

**Compatibilidad instalada posterior:** APK16 original0.16.1/código17, hash original comprobado, instalado limpio en el segundo emuladorAndroid16 sin reemplazar20 ni borrar datos del teléfono/QA14. LoginQA1 normal, partida privada contraSDKQA2 `e61a9a89-1dde-4bd0-a4fa-7d880354e327`, falta envido/declaraciones desdeAPK,15–0 y cierre único con los servicios HTTPS nuevos. RLS entrega sólo mano propia; reloj30s con hora normal. No se atribuye a17 la corrección de desfase de reloj de20. Reintentar inicio no vuelve a pagar: `android-17-emulator-5556-online-15-17.json`. El build-info antiguo no incluía código; se completó desde `dumpsys package`, sin repetir la partida. Saldos despuésQA1=990/26,QA2=1110/23,QA3=330/0. ServidorQA3000 reabierto con el build conservado y los cinco guardados revalidados idénticos, `android-17-preserved-after-resume.json`.

El dueño autorizó una nueva descartable aparte de las tresQA paraGoogle/recuperación/borrado; selectorGoogle abierto por botón normal enRedmi. No usar ni borrar una cuenta anterior/personal/administradora; primero verificarAuth, fecha posterior a esta autorización y rol ordinario. Descarga física deHistoriaQA1 porHTTPS completada antes de cerrar esa sesión:66rivales/15provincias/revisión0/sin pendientes, en el paquete20 separado. Ensayo deHistoria entre17/20 iniciado en emuladores; todavía no aprobado. Detectó un defecto del comprobador separado: scripts con varias sentencias podían conservar la respuesta anterior ante error de sintaxis. Se reinicia el resultado por separado y se evalúa el script con captura de errores. Prueba específica rechaza sintaxis inválida sin devolver42anterior y admite varias sentencias: `android-17-helper-eval-fixed.json`. APK/AAB20 conservan sus hashes. Repetir la prueba deHistoria afectada; las verificaciones previas con expresiones válidas, pantallas observadas y confirmaciones manuales conservan su evidencia.

**Historia entre versiones aprobada después de la corrección:** APK17/Android16 yAPK20/Android11, QA3 en ambos, descargas HTTPS distintas con66rivales/15provincias. Corte sin red y reapertura conserva hash exacto de partida abierta; las jugadas se ejecutan por botones con estrategia automatizada de diagnóstico que conoce el estado completo (fuera delAPK), ySQL revalida las trazas. Dos victorias iniciales16–0: comprobantes reales `9c5b52a6-540a-4ec7-b928-bba1479c4639` y `fd284ffe-6b51-4153-ba8a-7de0ce41e31d`, primer premio50+0monedas y24+2puntos; saldoQA3=380/26. La última comparación de ese ensayo falló porque el límite del comprobador no se inicializaba al retomar una partida, no por doble pago. Verificación SQL de sólo lectura conservada en `android-17-history-first-award-server.json`.

Repetición completa con dos revanchas normales: ambas colas sincronizadas porWWW, una respuesta se descarta sólo **después** de recibir200/acreditación real; esa cola permanece hasta reintentar por el control normal. Reintento devuelve el comprobante y no cambia el saldo. Hashes antes/después de corte, descargas, colas, comprobantes y saldos en `android-17-history-versions-real.json`, aprobado. QA3 termina380/30, cero pendientes en ambos APK; se conserva el tope normal de puntos de revancha. Redes originales de ambos emuladores restauradas; cinco guardadosQA14 separados e intactos. Esto acredita emuladores y servicios reales, no el corte sin red en teléfono físico. Google aún no devolvió sesión alRedmi; no se contó como ingreso válido ni se creó/borró una cuenta por otra vía.

**Comunidad real revalidada en20:** APKAndroid11/WebView133 y web públicaHTTPS, QA3/QA1. Solicitud/aceptación de amistad, presencia, grupo privado (crear/invitar/unirse/salir/eliminar), permiso de tercero rechazado e invitación de juego rechazada/cancelada desde app/web, sin partida ni gasto. Preferencias de correo guardadas apagadas;20rutas públicas/privadas y permisos administrativos, calculadora y validación de reseña sin envío aprobados. `android-17-community-release20.json` y capturas. No hubo chat público ni avisos de soporte/campañas. El primer intento esperabaAmigos después de dejar la pestañaGrupo activa; se corrigió el selector del ensayo. Revisión automática detuvo la primera limpieza por falta deIDexacto; consulta de sólo lectura identificó grupo `cc04bd8f-7a75-4cd0-88c4-5b6beca86851` y amistad `c1dd31d4-c582-4106-92d6-3b511829fe4e`, creados por el propio ensayo el27/10a20:35UTC. Segunda limpieza verificó esos IDs yQA3, fue aprobada y comprobó su retiro; `android-17-community-selector-cleanup.json`. La repetición aprobada también retiró sus propios registros por controles normales.

**Perfil, economía y parejas completas en20:** avatarQA1 subido por el input real con una carta empaquetada como archivo de diagnóstico; recorteJPEG, Storage/RPC reales y foto visible también en web pública. LaAPI protege el objeto mientras está vinculado; después se restaura `avatar_url=null` y se elimina sólo ese archivo. Consulta aStorage confirma cero objetos con su ruta exacta. Selector físico/cancelación conserva la prueba manual previa; no se presenta esta asignación programática como selección Android. `android-17-player-real-20.json`. El primer archivo de ensayo no existía en los recursos web delAPK y se sustituyó; no hubo subida ni gasto en ese intento. Botella de agua150monedas ficticias comprada/equipada enapp y vista equipada enweb; repetición no descuenta otra vez, equipamiento original «ninguno» restaurado. Saldo990→840. Misión `finish_3` ya ganada reclamada por cofre normal:30monedas,840→870; repetir devuelve el mismo saldo, `android-17-objective-real-20.json`.

Parejas a30 con tresQA/bot, juego completo por puntos **31–6**, mesa `1184c009-4d53-45c8-9fef-84447c2ab865`, accionesQA1 porAPK20 y otrasQA por sesionesSDK propias, sin abandono como resultado. Mano propia porRLS, controles completos y reintento de cierre sin doble pago: `android-17-emulator-team-complete-real-20.json`. Saldos posterioresQA1=860/26,QA2=1120/23,QA3=370/30; compras, misión y apuestas normales, sin compensaciones.

**Ajustes posteriores del alto útil:** prueba de espectador de torneos con variables34/47px y padding superior34 simulados segúnRedmi/WebView155 reproduce altura854frente a820. Se reemplaza su alto de pantalla completo por el alto disponible entre barras. Candidato intermedio **0.17.3/código21** construido/inspeccionado, misma firma, cero claves privadas y16KB; APK `c73c0493c68c2bd3ddbdcb39509027a648401b2ec9339eb81a35f92e19441fcc`, AAB `456a623827e14a4a579326d5fd6e7ee52426dccbfac1620563086ba89bc9b1d5`. Conservado sin distribuir. Cuatro formatos de torneos, espectador sin manos y barras simuladas pasan en `android-17-tournament-release21-browser.json`; no se publicaron torneos reales ni se cambiaron los emails `.test` deQA.

La misma prueba en la partida deHistoria reproduce854/820 por un contenedor de alto completo alrededor de la mesa fija; se retira únicamente ese alto redundante, conservando la mesa que ya reserva las barras. `android-17-history-bars-before.log` y geometría. Se prepara **0.17.4/código22** con ambos ajustes; pendiente de inspección/aceptación al escribir esta entrada. Son códigos de app dentro deANDROID-17. Producción sigue en `575bedc`; no cambian servicios, SQL ni permisos. El intentoGoogle anterior superó su hora de validez sin retorno alAPK; se pidió disponibilidad para abrir uno nuevo. Autorización de la descartable sigue vigente, todavía sin identificar ni borrar una cuenta.

**Candidato22 comprobado — 27/10:**0.17.4/código22 construido e inspeccionado, misma firma, cero claves privadas/depuración y16KB. APK17.160.765bytes SHA256 `6c0b3bd94d09b4fb6762b58efb5528083ee13464debd0f7208a18d1ad96d20b2`; AAB10.459.569bytes SHA256 `76bd7d0f6da3b9e67f4d7f831c0ff0170dc684f70c6876975555f624cb508c4c`. Inventario y log `android-17-release-22-{inventory.json,inspection.log}`. Actualizaciones20→22/Android11 y17→22/Android16 conservan sesión y hashes exactosQA3; `android-17-update20-to22.json`, `android-17-update17-to22.json`. Los cinco originalesQA14 siguen idénticos a16, `android-17-preserved-final22.json`. Las fuentes18archivos en `fbf98fc` tienen revisión automática, Capacitor, prototipo, base offline, vidas e invitaciones aprobados; preview protegido `dpl_ACnnEcKDG9AvY8tw7JoTETE6KRCB` listo. PR145 actualizado, sigue borrador/sin merge. PermisoAndroid16 de notificaciones denegado por diálogo real enAPK22: lobby usable y sin consentimiento/vínculo, `android-17-permission-denied-release22.json`.

**Arranque frío físico22:** tres aperturas MAIN/LAUNCHER con nuevos registros AndroidFullyDrawn distintos:1915/2043/1860ms hasta lobby usable, primer cuadro1029/1019/1058ms. SesiónQA1/WiFi/USBcargando; objetivo≤3000ms aprobado. `android-17-phone-startup-22.json`. Batería19 conserva la referencia aceptada: no se repitió ni se extrapola autonomía total.

**Redmi22 — Historia real:** actualización física20→22 instalada con conservación de datos; guardadoQA1 descargado existe después. El intento de huella justo antes no se ejecutó por nombre incorrecto de variable deNode del comprobador: no se atribuye comparación byte por byte de esa actualización física. La prueba de actualización exacta sí está registrada en ambos emuladores. Ingreso normalQA1, corte realWiFi/datos, cierre/reapertura conserva hash exacto de partida y continúa sin red. Mesa820px/scroll820, márgenes34/47; todos los controles633–773px. Victoria16–0 por botones con estrategia externa de diagnóstico;47acciones, comprobante `da08e234-d790-4fe2-b3b2-28dcaf97f2ad`,0monedas/2puntos, cola confirmada cero pendientes porWWW. La fotoSQLite vieja980/26 se actualiza al saldo oficial860/28; los120de diferencia son compras/apuestas previas, no un descuento nuevo deHistoria. Redes originales restauradas. `android-17-phone-offline22.json` y captura inspeccionada. Dos detenciones del ensayo fueron del comprobador: nombre del rival y límite1MB de captura; corregidos sin borrar la partida y repetida completa. Google/recuperación/borrado siguen pendientes de la intervención personal, no se dan por aprobados.

**Google real22 aprobado:** dueño eligió el Google de prueba y confirmó regreso al lobby. Auth verificó nueva cuenta `7a025350-abc3-4dba-9fc9-2390a529c916`, creada después de la autorización, ajena a cinco dueños protegidos y al administrador, rol ordinario y OAuth17s de antigüedad en esta sesión. RetornoHTTPS válido alAPK0.17.4/22; preferencias de correo apagadas. `android-17-google-login-real.json`, sin email/tokens. Se cerró esa sesión por control normal y se pidió recuperación desde el formulario delAPK; esperando el enlace del correo del dueño. Borrado todavía no ejecutado.

<a id="android-17-acta-2026-10-27"></a>

##### Acta de aceptación — 27/10/2026 — ANDROID-17 cerrada

**Candidato final:**0.17.4/código22, API29mínimo/36objetivo, firma de subida de16 conservada. APK/AAB y hashes exactos en la entrada22 anterior y `android-17-final-audit.json`; nueva lectura de ambos archivos confirma los mismos hashes. Fuentes en `fbf98fcec1c13800c980eed48163c39bc8fb4724`, PR145 borrador/sin merge. Producción compatible autorizada en `575bedc`, regiónSãoPaulo, Firebase privado/paquete final y retornosWWW aplicados y verificados. No se hizo otro despliegue productivo al corregir los contenedores locales de22.

| Recorrido | Resultado y evidencia | Alcance |
| --- | --- | --- |
| Instalación/actualización | Firma, sin debug/secretos y16KB; `android-17-release-22-inventory.json`.17→22 y20→22 conservan sesión y hash real. | EmuladoresAndroid16/11;22 instalado también enRedmi. La comparación exacta de actualización física17→18 fue fixture;20→22 no tuvo huella previa válida. |
| Acceso y sesión | Email/usuario yA-B-C reales; Google22, recuperación por correo/contraseña e ingreso normal aprobados. `android-17-google-login-real.json`, `android-17-recovery-real.json`, `android-17-session-refresh-real.json`. | Google/PKCE/HTTPS enRedmi; renovaciónAuth/API real por sesiónSDKQA2 independiente. Confirmación de email apagada; rama confirmación probada aislada. |
|1v1/parejas | Redmi20↔web pública15puntos, parejas3QA/bot físicas y parejas completas31–6 enAndroid11;RLS/reloj/pago único. | `android-17-phone-online-15-20.json`, `android-17-phone-team-real-20.json`, `android-17-emulator-team-complete-real-20.json`; composiciones/reglas adicionales aisladas. Código de juego20 conservado en22. |
| Torneos | Cuatro formatos, inscripción/check-in/espera/excepciones/espectador/premios; sin manos ajenas ni controles fuera de pantalla. | UI empaquetada21 ySQLPGlite, `android-17-tournament-release21-browser.json`; componente idéntico en22 yCI aprobado. Listado público/roles reales comprobados; no se publicaron torneos ni se modificaron emailsQA. No es un torneo de producción. |
| Historia física22 | Descarga66/15, corteWiFi/datos, reinicio con hash exacto, victoria16–0 y comprobante real; cero pendientes. | `android-17-phone-offline22.json` y captura; estrategia externa de diagnóstico sólo pulsa botones, servidor revalida traza. |
| Sync/dos versiones | APK17 intacto/20, dos descargas, respuesta perdida después de acreditar, cola conservada y reintento sin pago duplicado. | Dos emuladores yWWW reales, `android-17-history-versions-real.json`; motores/validadores v1 conservados. |
| Compatibilidad | APK17 original funciona contra servicios nuevos; actualizaciones sin pérdida, contratosv1 y sesiones enlazadas en servidor. | `android-17-emulator-5556-online-15-17.json`; aviso retirado/rechazo remoto/fallo temporal/recuperación aprobados enPGlite e interfaz empaquetada. Política real sigue mínima17, reemplazo no disponible; no se retiró una versión real ni hay usuariosPlay previos. |
| Perfil/economía | Avatar real y web, protección/limpieza del archivo propio, agua150/repetición sin cargo, cofre30 único, equipamiento restaurado. | `android-17-player-real-20.json`, `android-17-objective-real-20.json`; compra ficticia conservada como propiedadQA1. |
| Comunidad/moderación | Amistad/grupo privado/invitaciones/permisos/rutas/preferencias conQA; recursos del ensayo retirados. Denuncia/bloqueo/resolución y roles pasan regresiónSQL/UI. | `android-17-community-release20.json`; moderación aislada en `android-17-regression-latest.json`, sin denuncia/campaña contra personas reales. |
| Push/enlaces | AvisoFCM real recibido/tocado enRedmi, Amigos/invitación correctos; baja/cambio de cuenta, enlaces fríos/calientes y permiso denegado conservan juego. | `android-17-phone-push-20.json`, `android-17-phone-push-edges-20.json`, `android-17-phone-links-20.json`, `android-17-permission-denied-release22.json`. Casos de aviso vencido/otra cuenta usan intents sintéticos. |
| Borrado/privacidad | Nueva descartableGoogle autorizada eliminada por formulario22; APIantes200/después401, tokens de acceso/renovación rechazados, guardado propio/push limpios yQA1idéntico. | `android-17-deletion-real.json`; consulta final Auth/perfil/cola=0. Formulario compartido con web, cuya eliminación real ya se verificó en15; no se afirma un segundo borrado web en17. |
| Sistema/diseño | Barras34/47 ymesa820sin scroll enRedmi22; teclado/Atrás/fotoselector manuales20; audio/accesibilidad/otros tamaños en regresiones. | `android-17-phone-offline22.json`, pruebas manuales y regresiones14/17;22 cambia sólo alto de dos contenedores respecto20. |
| Rendimiento/batería | Lobby22=1915/2043/1860ms, todos≤3000. Referencia batería19 aceptada expresamente:3puntos/18,5min, brillo máximo/WiFi24–28°C. | `android-17-phone-startup-22.json`, `android-17-phone-battery.json`. No acredita autonomía completa ni partidas largas. |
| Servicios/entrega | SQL aplicado por dueño, configuración yHTTPS reales, tipos/lint/CI pertinentes aprobados; artefactos revalidados y cinco originales idénticos. | `android-17-final-audit.json`, `android-17-preserved-final22.json`. Fuentes/clave/guardados separados; nada enPlay. |

**Recuperación y borrado final:** enlace de correo recibido enRedmi, contraseña privada generada/guardada por formulario y login normal verificados; luego el dueño confirmó de nuevo el mismoGoogle. DescargaHistoria propia antes del borrado permite comprobar su limpieza real. Primer intento devolvió rechazo genérico y no creó trabajo ni alteró Auth/perfil; reintento normal capturadoHTTP200 completó sin cambio de código/SQL. No se atribuye una causa al rechazo inicial. Access/refresh actuales rechazados después; consulta final confirma ceroAuth/perfil/trabajos de la descartable `7a025350-abc3-4dba-9fc9-2390a529c916`. La cuentaGoogle no se elimina. Archivo privado con sesión antigua retirado; no se publicaron correo/contraseñas/tokens. QA1 volvió por login normal y se navegó explícitamente al lobby, porque el destino recordado era eliminación; ningún borradoQA se solicitó.

**Estado de cierre:** QA1=860monedas/28puntos, QA2=1120/23, QA3=370/30; tres cuentas ordinarias intactas. Guardados originales deQA14 separados, hashes/revisiones/comprobantes idénticos a16. En teléfono, guardadoQA1 nuevo conserva comprobante y cero pendientes. Confirmación de email apagada; piloto push sóloQA, despacho público apagado. No se amplió seguridadUSB. Historial de salidas del paquete22 sólo muestra cierres pedidos/instrumentación/sistema, sincrash/ANRen las últimas12salidas leídas; WebView155.0.8059.43. Esto no equivale a un ensayo prolongado de estabilidad.

**Límites de la aceptación:** el alcance aislado y real figura por recorrido; las pruebas de torneos/moderación y versión retirada no se presentan como acciones productivas. No hay un defecto reproducible abierto de acceso/juego/pérdida de guardado/pago duplicado/manos expuestas/controles cortados en la matriz probada. Avisos generales deSupabaseINFO/WARN consultados al diagnosticar el rechazo no aportaronERROR ni causa del incidente; no se modificaron permisos/esquemas ajenos para silenciarlos. Auditoría deRPC/RLS de15/17 y manos propias se conserva; no es certificación de ausencia absoluta de vulnerabilidades.

**Rollback y evolución:**575bedc es la primera base productiva compatible que debe conservarse READY como punto de vuelta para siguientes cambiosAndroid. La web anterior16b1bda sigue guardada, pero carece deAPIAndroid: no usarla como rollback compatible de una app distribuida. Antes de elevar la mínima, el reemplazo debe existir en su canal y comprobar recuperación/colas/partidas según06/20.17 permanece admitida;22 no cambia contrato ni formato. Firma/distribuciónPlay, su certificado y el ensayo del canal interno corresponden a18 y todavía no se hicieron.

**Cierre:** ANDROID-17 completada. ANDROID-18 queda habilitada como siguiente etapa, sin iniciarla en esta sesión y sin publicar enPlay.


**Compromiso trasladado desde 14 — aceptado por el dueño el 16/10:** medir batería en un teléfono representativo y comprobar el objetivo de lobby utilizable en ≤3 s. El control de 4 s aceptado en el emulador debug de 14 no certifica rendimiento en teléfono. Registrar equipo/Android/WebView, red, versión del candidato, condiciones, mediciones y aceptación.

**Trabajo:** ejecutar la matriz global siguiente sobre el candidato firmado; combinar automatización útil con recorridos reales en teléfono Android y sesiones web. Inspeccionar diferencias del inventario, errores/crashes y configuración final. Corregir problemas detectados dentro de su área, volver a construir y repetir sólo la prueba afectada más la regresión necesaria; registrar la nueva versión y el traspaso actualizado. No convertir una advertencia antigua sin impacto en motivo para refactorizar todo el proyecto.

<a id="android-17-compatibilidad"></a>

**Compatibilidad web/app/servidor — requisito añadido el20/10, verificado en17 el27/10/2026:** cubrir tanto las llamadas directas a Supabase como los servicios Next/Vercel. Conservar datos al instalar una actualización no demuestra que una app anterior funcione contra un servidor nuevo.

1. **Versiones admitidas:** registrar versiones/códigos de app compatibles, versión mínima para operaciones online, criterio para retirar una versión y responsable de autorizarlo. Distinguir versión de app, formato del guardado y motor/catálogo de Historia; no deducir compatibilidad sólo del número de APK.
2. **Acuerdo entre app y servidor:** identificar consultas, funciones SQL, parámetros, respuestas, estados de partida, Realtime y acceso usados por las versiones admitidas. Los cambios deben conservar lo que esas versiones necesitan; cualquier cambio incompatible requiere transición preparada antes de aplicarlo. No mantener una vulnerabilidad para conservar una versión: preparar su retiro y la recuperación segura de datos.
3. **App anterior contra servidor nuevo:** conservar un APK anterior identificable, sin reconstruirlo con código nuevo, y probarlo junto al candidato contra la misma versión nueva de servicios/base en un entorno aislado antes de desplegar. Cubrir ingreso/renovación, lobby, 1v1/parejas app↔web y entre versiones, monedas/premios e Historia/sincronización según lo afectado. Registrar paquete, firma, configuración y versiones exactas; un QA con localhost no sustituye la aceptación HTTPS del paquete final. Antes de la primera publicación, dejar explícito que no existen versiones públicas anteriores y usar una base de prueba comparable con la misma identidad y servicios; no presentarla como compatibilidad ya probada con usuarios de Play.
4. **Actualización necesaria:** implementar y probar consulta de compatibilidad y aviso claro con enlace a la actualización. El servidor debe rechazar las operaciones incompatibles aunque se omita el aviso; cubrir también las llamadas directas a Supabase. No cortar una partida activa sin una salida definida ni borrar sesión, guardados o premios pendientes. Conservar una vía compatible y autorizada para terminar/recuperar/sincronizar lo anterior según [06](#android-06-sync). Distinguir falta de red o fallo temporal de una versión retirada; no activar una nueva mínima hasta que su reemplazo esté disponible por el canal correspondiente.
5. **Evidencia de cierre:** comprobar una versión admitida, una retirada, servicio de compatibilidad inaccesible y actualización conservando datos. Respetar la conservación de motores/validadores de [06](#android-06-sync); registrar límites y pendientes reales. Los ensayos ficticios de16 no acreditan por sí solos esta compatibilidad de servicios.

**Verificación y final:** todos los recorridos obligatorios aprobados en candidato identificado, incluidos instalación limpia/actualización, Google, partida web/app, parejas, torneos, offline frío, premios/reintentos, denuncia/bloqueo, push, eliminación y diseño, además de los criterios de compatibilidad anteriores. Pruebas en un teléfono físico y cobertura de Android moderno registradas; si faltan, la etapa queda preparada y pendiente, no cerrada. Cero defectos abiertos que pierdan datos/premios, expongan información, impidan juego/acceso o dejen controles fuera de pantalla; menores aceptados con efecto y motivo expresos.

**Entrega a 18:** **candidato final entregable** y acta de aceptación en docs/android.md, política de versiones admitidas, pruebas de compatibilidad, lista de límites/defectos aceptados, evidencias y servicios/SQL/configuración realmente aplicados. El canal Play añade una firma/distribución que todavía debe comprobarse.

<a id="android-etapa-18"></a>

#### ANDROID-18 — Play Console, ficha y canal interno

**Empieza con:** 17 cerrada para distribuir el candidato. El dueño puede anticipar alta/verificación, soporte y recopilación de testers desde 01; anotar esos pasos como preparación de esta etapa sin bloquear el trabajo provisional.

**Trabajo:** alta/verificación con titularidad real, tipo de cuenta y contacto; confirmar registro de paquete y requisitos de verificación aplicables. Crear ficha fiel, icono/imagen/capturas reales del candidato, descripción, categoría, países, público/clasificación, privacidad, Seguridad de datos y eliminación. Proporcionar en el campo privado de Play una cuenta de revisión utilizable e instrucciones de acceso; sin credenciales en la documentación y sin requerir aprobación personal para cada ingreso del revisor. Configurar Play App Signing y canal interno, subir el AAB aprobado, resolver validaciones y revisar informe previo al lanzamiento.

**Verificación y final:** instalar desde Play con su firma real, no desde adb; paquete/versión correctos, Google y App Links configurados con los certificados correspondientes, push y servicios reales funcionando. Probar un recorrido online/offline/sync y actualización distribuida por el canal, sin pérdida de datos. Ficha/formularios completos y consistentes; cuenta del revisor comprobada. No subir otro identificador o versión sin registrar el cambio. La cuenta/validación o informes externos pendientes mantienen la etapa preparada hasta completarse.

**Entrega a 19:** app/canal/versión de Play, certificado público real y configuración final, ficha/declaraciones registradas, instrucciones privadas de revisión probadas, enlaces de prueba y observaciones del informe. [Preparar la revisión](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

Comprobar los formatos/tamaños vigentes de ícono, gráfico y capturas y las declaraciones que Play muestre para esta app, incluidas anuncios, acceso, edades, clasificación y funciones/permisos aplicables. Preparar capturas de la app instalada; no presentar imágenes de funciones pendientes. Registrar la verificación de cuenta y paquete, y revisar licencias/avisos de terceros y requisitos de países. [Recursos de la ficha](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

<a id="android-etapa-19"></a>

#### ANDROID-19 — Prueba cerrada y acceso a producción

**Empieza con:** 18 cerrada y tipo de cuenta/requisitos que Play muestra para ella. El dueño identifica testers; no contactarlos automáticamente.

**Trabajo:** preparar instrucciones de instalación y un recorrido representativo para testers, canal de incidencias, control de versiones y prueba cerrada. Registrar adhesión/actividad/fechas, comentarios y correcciones. Para cuenta personal nueva, cumplir el mínimo vigente de 12 adheridos continuos durante 14 días y pruebas reales; si la cuenta final tiene requisitos diferentes, anotarlos con evidencia del panel. Solicitar acceso a producción con respuestas fieles sobre lo probado; resolver pedidos de continuidad de Google.

**Verificación y final:** período y participación válidos, incidencias de lanzamiento corregidas, candidato último aceptado y **acceso a producción concedido** por Google. Si hay cambios durante la prueba, mantener actualización/sync y revalidar lo afectado; no asegurar de antemano cómo el panel computará el período. Si falta plazo, testers o respuesta, registrar fechas exactas/acción próxima y dejar preparada. Una prueba interna no reemplaza esta condición cuando aplica.

**Entrega a 20:** versión aprobada para proponer publicación, conclusión de la prueba, estado de acceso y cualquier condición de Google. No usar «Cerrada» por haber enviado solamente la solicitud.

<a id="android-etapa-20"></a>

#### ANDROID-20 — Publicación y entrega final

**Empieza con:** 19 cerrada, candidato aceptado y pedido del dueño de publicar con países/alcance definidos. Este plan por sí solo no publica la app.

**Trabajo:** preparar la versión y notas finales, revisión de políticas/configuración, comprobación de soporte y plan para incidentes. Presentar al dueño el candidato concreto y sus condiciones antes del envío público cuando todavía no exista autorización para ese envío. Tras el pedido de publicación, enviar a revisión y seguir el resultado sin prometer fecha de aprobación. Resolver observaciones preservando guardados y compatibilidad; comprobar publicación/disponibilidad en los países acordados. Definir cómo frenar distribución y emitir una versión correctiva con código superior sin depender de un downgrade ni cambiar SQL histórico.

<a id="android-20-actualizaciones"></a>

**Procedimiento permanente de actualizaciones — añadido el 20/10/2026.** Guía práctica redactada el 30/10 en [Cómo llegan los cambios](#como-llegan-los-cambios); falta ensayarla por el canal de Play. Requisitos originales: entregar instrucciones reproducibles para cada cambio posterior en web, Supabase, servicios Vercel o app, usando la [política y pruebas de17](#android-17-compatibilidad).

1. Identificar qué plataformas/versiones afecta el cambio y qué pedidos/respuestas modifica. Distinguir una corrección interna compatible de una función que requiere pantallas/código nuevos; compartir repositorio no sincroniza las instalaciones Android.
2. Preparar primero servidor/base capaces de atender las versiones admitidas y la nueva, mediante migraciones nuevas cuando corresponda. Probar app anterior, candidata y web en entorno aislado; después aplicar/desplegar en orden compatible y registrar lo realmente aplicado. No retirar de antemano funciones, campos o permisos que las versiones admitidas todavía usan.
3. Publicar web y actualización Android por sus canales, comprobar disponibilidad real y repetir los recorridos afectados con servicios reales. Mantener la compatibilidad durante la distribución: subir un AAB no demuestra que todos hayan actualizado. Registrar en cada entrega APK/AAB, versiones de app, cambios de servicios/base y evidencia.
4. Retirar una versión sólo conforme a la política de17, con reemplazo disponible y aviso comprobado. Resolver primero partidas activas y resultados anteriores por una vía compatible; conservar los motores/validadores necesarios mientras queden guardados pendientes. No imponer una actualización por cada cambio interno compatible del servidor.
5. Ante un incidente, documentar cómo frenar distribución o la función afectada, restaurar un servicio compatible o publicar una corrección con código superior. Verificar que la recuperación atienda a las versiones ya distribuidas y conserve datos/premios; no depender de bajar la versión instalada ni de deshacer SQL a ciegas.

**Verificación y final:** enlace público y versión disponibles, instalación desde la ficha real en Android, acceso, partida y recuperación offline, confirmación de premios y push comprobados en producción con cuentas de prueba autorizadas. Compatibilidad con web intacta y procedimiento anterior documentado y ensayado en entorno de prueba, con comprobaciones de producción de los cambios realmente publicados. Registrar soporte/denuncias, firma/versionado, ubicación de artefactos y respaldos, mantenimiento de dependencias/servicios y próximos controles. Si Google sigue revisando, indicar «en revisión», no «publicada».

**Entrega final:** app Android publicada, documentación de construcción/actualización y soporte en esta guía, matriz aprobada, límites conocidos y procedimiento de mantenimiento/recuperación. La entrega no implica contratar herramientas de monitoreo ni activar mensajes promocionales nuevos.

</details>

#### Matriz global para cerrar ANDROID-17 y revalidar en Play

| Recorrido obligatorio | Criterio comprobable | Evidencia mínima |
| --- | --- | --- |
| Instalar/actualizar | Firma y versión correctas; arranque desde ícono; UI local sin Chrome en Android compatible; conserva datos en actualización | Artefacto/hash, versiones del sistema/WebView, instalación limpia y actualización |
| Acceso | Email/usuario/Google, alta/confirmación, recuperación, sesión renovada, logout/A-B y enlaces frío/caliente | Cuenta/flujo de prueba identificados sin contraseña/token, resultado real |
| Juego 1v1/2vs2 | 15/30, cantos/pardas/relojes, bots y app/web; sólo manos autorizadas; premio único | Partidas/casos y consultas de verificación, matriz de composiciones |
| Torneos | Inscripción/check-in, mesa, espectador sin manos, estados excepcionales y premio | Torneo de prueba, rol, recorrido y resultado |
| Historia | 66 rivales seleccionables según requisitos; descarga y Tobías; cierre/reinicio sin red; cambio de cuenta | Comparación del estado persistido y acciones, cobertura SQL/regiones |
| Sincronizar/actualizar | Cola confirmada una vez, respuesta perdida, dos dispositivos, mezcla online/offline y versión anterior | Comprobantes y saldos oficiales antes/después; guardado conservado |
| App anterior/servidor nuevo | Versiones admitidas funcionan con los servicios nuevos y con web según [17](#android-17-compatibilidad), incluidas llamadas directas a Supabase | APK anterior intacto y candidato identificados; versión de servicios/base y recorridos comparados |
| Versión retirada/actualización necesaria | Aviso y rechazo remoto de operaciones incompatibles; reemplazo disponible; recuperación de partida/cola; fallo de red distinguible | Casos admitido/retirado/servicio inaccesible y actualización sin pérdida de datos |
| Perfil/economía | Avatar, ranking, objetivos/cofres y compras/equipamiento coinciden con web; no duplican reclamos | Acciones, saldo y presentación comparados |
| Social/moderación | Chat/grupos/amigos y soporte; denuncia/bloqueo/resolución; permisos por rol | Dos cuentas y caso privado de prueba, efecto del bloqueo |
| Push/enlaces | Recibe y abre destino real, permiso denegado permite jugar, baja/cambio de cuenta y aviso vencido | Recepción en equipo físico; evento/token identificado sin exponerlo |
| Privacidad/borrado | Formularios corresponden a datos/SDK; eliminación app/web y limpieza local/push verificadas | Cuenta descartable autorizada, pruebas de token previo, retenciones explicadas |
| Presentación/sistema | Diseño compartido, cantos completos sin scroll, barras/teclado/Atrás/audio, accesibilidad y respuesta usable | Capturas/mediciones por tamaño/sistema y recorrido físico |
| Servicios/entrega | Backend/configuración vigentes, rollback operativo compatible, AAB sin claves privadas y pruebas pertinentes | Migraciones aplicadas, build/validaciones, configuración y hash finales |

En 18 y 20 revalidar con el paquete firmado por Play y endpoints reales. Si ese paso cambia OAuth/App Links/Firebase, repetir la prueba afectada. Conservar evidencia reproducible en carpetas de prueba/generados existentes; resumir los resultados en esta guía. No volcar mensajes privados, contraseñas, tokens o bases personales completas a la documentación.

#### Dependencias externas que conviene anticipar

| Necesidad | Cuándo prepararla | Debe estar resuelta para |
| --- | --- | --- |
| Cuenta de prueba y acceso personal | Ya hay testin; comprobar vigencia al iniciar 03, otra cuenta para interacción/pruebas | 03 y regresiones multiusuario |
| Android físico y segundo dispositivo/sesión | Desde 01: identificar disponibilidad, sin comprar por rutina | Pruebas de 06/09/13 y cierre físico de 17 |
| Soporte atendido y responsable de denuncias | Proponer temprano; probar recepción/respuesta | 12 y 15 |
| Eventos/frecuencia push | Llevar propuesta concreta del alcance existente | 13 |
| Identificador definitivo y mínimo compatible | Explicar consecuencias antes de configuraciones finales | 16 y registro en Play |
| Edades/público/países | Evaluar datos, chat y cuestionario, no sólo intención inicial | 15/18 |
| Play Console/titularidad/pago/verificación | Puede anticiparse sin subir una app incompleta | 18 |
| Testers reales | Identificarlos durante desarrollo; no esperar al final para buscarlos | 19 según requisito de la cuenta |
| SQL/panel/deploy cuando cambien | Preparar archivos/pasos y validar localmente primero; registrar confirmación real del dueño | Cierre de la etapa cuyo flujo lo necesita |

Los cambios nuevos de Supabase deben revisar documentación y changelog al implementarse. La consulta del 11/10 detectó cambios recientes en exposición automática de tablas/Data API y ajustes de PostgreSQL: validar grants/RLS y versión real cuando se creen tablas o se congele/revise lógica; no actualizar la base por rutina. El análisis actual no auditó nuevamente el proyecto remoto. [Cambios de exposición](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [cambios PostgreSQL](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

<a id="android-traspasos"></a>

#### Registro obligatorio de traspaso Android

Agregar cada entrada debajo de la anterior, con fecha e identificador. Mantener la tabla de etapas y el estado actual coherentes con la última entrada; esta sección es la fuente de continuidad de este plan. Registrar también una sesión inconclusa, con el próximo punto exacto para que otra sesión la continúe.

```text
Fecha — ANDROID-XX — nombre de etapa
Estado: Pendiente / En curso / Preparada; falta paso externo / Cerrada
Punto de partida: dependencias leídas y traspasos que condicionan esta etapa.
Cambios: archivos/rutas, decisiones tomadas y cambios locales preservados.
Artefacto/versión: paquete, versionCode, commit si existe o hash/estado local;
                   entorno, Android/WebView y dispositivo usados.
Servidor: migraciones NUEVAS, aplicación confirmada, configuración/deploy;
          distinguir pendiente de aplicado y evitar secretos.
Pruebas: comandos, recorridos reales, resultados y alcance de los fixtures.
Cierre: cada condición cumplida; defectos/pasos personales que faltan.
Datos a conservar: cuentas de prueba identificadas, guardados/colas y ubicación
                   de evidencia privada; no escribir credenciales.
Siguiente sesión: ANDROID-XX, primer archivo/acción y cómo verificarla;
                  si esta etapa cerró, indicar la siguiente habilitada.
```

**11/10/2026 — Plan de etapas Android:** análisis del repositorio y requisitos públicos completado; documentadas veinte etapas, matriz de aceptación y traspasos. Próxima etapa pendiente: **ANDROID-01**. No se ejecutó una etapa de implementación, se aplicó SQL, se creó Play Console ni se generó/publicó un APK nuevo en esta entrega.

**12/10/2026 — ANDROID-01 — Inventario y entorno de trabajo**

- **Estado: Cerrada.** Dependencias leídas: estado actual, decisión Capacitor, plan 01–20, retoma de ambas PCs y entregas de motor/mapa/diseño/sincronización, incluido ensayo testin del 11/10. Se respetó el alcance de 01; no se creó el proyecto de 02.
- **Cambios:** [inventario y comprobaciones de 01](#android-01-inventario) en esta guía; `scripts/android-env.ps1` para seleccionar Java 21/Gradle sólo en la terminal actual. Resto de cambios locales anteriores preservados. Herramientas/evidencia nuevas en `android/generated/`, ignorado; imagen/AVD 36 separados en el entorno Android existente. No hay commit/PR nuevo: HEAD continúa en `2ecd674` con trabajo local pendiente de versionar.
- **Versiones/artefacto:** Capacitor 8.5.3 seleccionado para instalar/fijar en 02, Node 24.16.0/npm 11.13.0, JDK 21.0.12.1+1, Gradle 8.14.3, AGP del template 8.13.0, Platform 36 r2, Build Tools 35.0.0. WebView oficial 133.0.6943.137 válido y ensayado en Android 11/API30. AVD API36 arrancado por separado y luego apagado. Sin APK/AAB Capacitor nuevo; TWA conservado.
- **Servidor:** cero migraciones nuevas, cero SQL/panel/deploy de esta etapa. Exportación/sincronización aplicadas el 11/10 por confirmación y ensayo anterior; no repetirlas. PGlite de pruebas aislado de Supabase. Servicios web con cookies identificados para adaptar en 03, sin cambiar su autenticación ahora.
- **Pruebas/cierre:** TypeScript, lint (7 avisos previos), construcción determinista de Historia, motor 66 rivales, campaña, sincronización, 8 pruebas PWA y 4 Android aprobados. Inventario contrastado automáticamente con los archivos: **40 páginas + 20 manejadores, ninguna ruta omitida**. Java/javac/Gradle operativos y requisitos contrastados con la versión concreta. WebView efectivo con CSS/APIs/escritura aislada aprobados; captura inspeccionada. Emulador anterior, acceso y guardado recuperados después del cambio. Límites: todavía no hay build/arranque Capacitor, aceptación física ni segundo usuario real de prueba; corresponden a las etapas siguientes.
- **Datos a conservar:** testin, `.env.local`, discos/sesión de `Trucazo_Android_11`, 0 pendientes/2 comprobantes y 1.010 monedas/22 puntos, claves privadas del respaldo, APK TWA y evidencia del ensayo anterior. Los archivos `android-01-data-*` contienen sólo contadores de prueba; no copiar tokens, mensajes o base personal al repositorio. Trucazo queda en Historia online de Chrome; API36 apagado.
- **Siguiente sesión: ANDROID-02.** Cargar `. ./scripts/android-env.ps1`; comprobar `adb devices` y WebView 133. Crear `apps/mobile/` con paquetes exactos 8.5.3/lockfile, esbuild y componentes/recursos existentes; paquete provisional `ar.com.trucazo.capacitor.dev`, mínimo inicial API29, sin alterar TWA ni exportar toda Next.js. Construir/sincronizar/instalar el primer APK debug, probar entrada desde ícono con recursos locales y Chrome deshabilitado, restaurar Chrome y comprobar web. Cuenta/lobby reales corresponden a 03. Registrar APK, hash/firma y las pruebas en docs/android.md.

**12/10/2026 — ANDROID-02 — Proyecto Capacitor y primer APK local**

- **Estado: Cerrada.** Punto de partida: ANDROID-01 y su inventario/traspaso, decisión Capacitor y alcance exacto de 02 leídos. Se preservaron los cambios locales anteriores, TWA, claves y cuenta testin. Sin commit/PR nuevo; HEAD `2ecd674`, trabajo local ampliado.
- **Cambios:** `apps/mobile/` con paquetes 8.5.3/lockfile, entrada React, navegación base, build de recursos y fuentes nativas Android; `.gitignore` ampliado. Presentación de login extraída a `src/components/LoginScreen.tsx` y logo Google reutilizable, conservando el controlador web. Estilos/fuente/ícono existentes empaquetados; Android oscuro y permiso normal de estado de red. Detalle, comandos y pruebas en [entrega de 02](#android-02-apk).
- **Artefacto:** `ar.com.trucazo.capacitor.dev`, 0.1.0/código 1, API 29 mínimo/36 objetivo; **9.952.782 bytes**, SHA-256 `A281120194E96D1BCD7D033CA013C1FCDCAC8826F20965022B673DC8289B5B00`, certificado debug público `586E7EA75F29108F3F1D85310D893D235CF22360DDC749D9F5E409724FA402A6`. Copia de etapa en `android/artifacts/ANDROID-02/trucazo-capacitor-0.1.0-debug.apk`; instalada en Android 11/API 30, WebView 133, emulator-5580. No firma/publicación de Play.
- **Servidor:** ninguna migración nueva, SQL/panel/deploy ni mensajes a terceros. Servicios/cuentas no conectados todavía en el APK. Las dos migraciones de Historia aplicadas el 11/10 se conservan; no repetirlas ni asumir que las rutas locales ya estén desplegadas en producción.
- **Pruebas/cierre:** construcción e instalación aprobadas; lanzamiento mediante toque del ícono tras cierre forzado, con Chrome deshabilitado y red completamente retirada, aprobado. Recursos del APK sólo en `https://localhost`, sin `server.url` ni HTML remoto. Aviso offline correcto después de corregir el permiso de red; capturas inspeccionadas, controles del acceso alcanzables. Comparación visual/estilos con web, navegación base, invitado web y registro aprobados; TypeScript/lint/build Next aprobados con 7 avisos previos. Dependencias del APK sin avisos de auditoría; 3 moderados sólo en herramientas CLI/iOS registrados para revisión futura. No se certificaron login real, lobby, juego, API 36 ni teléfono físico en esta etapa.
- **Datos a conservar:** testin y Chrome 124 restaurados/habilitados; Historia local mantiene 1.010 monedas, 22 puntos, 0 pendientes, 2 comprobantes y partida terminada. Modo avión apagado, Wi-Fi/datos y reverse 3000 restaurados; forward Chrome 9223 conservado y forward APK 9224 retirado al finalizar. Servidor local reiniciado después del build y accesible. Visor Trucazo muestra el nuevo APK conectado; Chrome conserva Historia en segundo plano. Evidencia `android/generated/android-02-*`, ignorada; APK en artifacts, claves/.env.local/AVD intactos.
- **Siguiente sesión: ANDROID-03.** Cargar `. ./scripts/android-env.ps1` y revisar `apps/mobile/src/main.tsx`, `src/app/login/page.tsx`, `src/app/api/login-usuario/route.ts` y `src/lib/supabase/`. Conectar ingreso por email/usuario con sesión propia y persistente, después transporte autenticado/API de Historia y lobby compartido. Resolver el origen local/CORS y la diferencia cookies/token con validación del servidor, sin devolver emails de terceros ni copiar la sesión/base de Chrome. El dueño ingresa personalmente cuando el formulario real esté listo; no pedir contraseña por chat. Verificar cierre/arranque, renovación, logout/cambio A-B y acceso web antes de cerrar 03.

**12/10/2026 — ANDROID-03 — Sesión propia, transporte y lobby; aceptación real pendiente**

- **Estado: Preparada; falta paso externo.** Dependencias: AGENTS, estado actual, alcance 03 y traspaso 02 leídos. Se conservan los cambios locales anteriores, TWA y los guardados de testin. ANDROID-04 todavía no habilitada.
- **Cambios:** cliente Supabase persistente en `apps/mobile/src/services.ts`, controlador de ingreso y lobby compartido en `main.tsx`, adaptación de navegación/presentación en `navigation.tsx`, plugin App 8.1.2 fijado, build con lista explícita de variables públicas y recursos locales de lobby/cofre. Nuevo `/api/android/login`, controlador username compartido en `src/lib/login-username.ts`, cliente servidor bearer/cookies y CORS en `src/lib/supabase/api.ts`/`src/lib/android-api.ts`; Historia conserva las validaciones y añade transporte token. Web conserva cookies/invitados. Juego y otras pantallas permanecen en sus etapas, con aviso previo a mutaciones de juego. [Contrato, pruebas y pasos exactos](#android-03-sesion).
- **Artefacto:** paquete provisional `ar.com.trucazo.capacitor.dev`, 0.2.0/código 2, API29→36, APK local debug instalado en Android11/WebView133. 10.007.209 bytes; SHA-256 `4E62BAA78FC2FC94E478F12173093A3E33237E05F960130126A037A8C7C2231E`; misma firma debug de 02. Copia ignorada `android/artifacts/ANDROID-03/trucazo-capacitor-0.2.0-debug-local.apk`. HEAD sigue en `2ecd674`; sin commit/PR nuevo.
- **Servidor/configuración:** cero SQL nuevo/migraciones/aplicación/deploy/publicación. API nueva disponible sólo en Next local; APK usa `http://localhost:3000` por adb reverse y Supabase real por HTTPS. Destino predeterminado de build sigue HTTPS. Flags públicos parejas/torneos ambos true agregados a `.env.local` ignorado. Falta `SUPABASE_SERVICE_ROLE_KEY` local para username; Vercel la tiene como secreto sin valor legible recuperable. No se copió ninguna llave privada al APK o al chat. El ingreso por email puede ensayarse ya.
- **Pruebas aprobadas:** SDK real/UI con Auth simulado (email/usuario, errores, persistencia/reapertura, renovación, offline, logout local, cambio A/B e identidad Historia); handlers reales/proveedor simulado (tokens tras credenciales, cookies web, CORS, bearer inválido sin fallback); formulario local/web y opción invitado; servidor real sin sesión: Historia 401, preflight 204/403. APK construido/instalado y formulario observado. TypeScript, lint/build Next con 7 avisos preexistentes; regresión SQL de los 66 rivales y reintentos aprobada; auditoría de dependencias productivas sin avisos. Evidencia `android/generated/android-03-*` y detalle en el capítulo.
- **Cierre pendiente:** dueño ingresa personalmente por email/usuario; completar configuración privada sólo en servidor local. Verificar en APK con cuentas reales perfil/saldo, preparación/identidad de Historia, cierre/arranque desde ícono, renovación, logout y cambio A/B; después comprobar acceso web. Los fixtures no cierran esos puntos. Rutas nativas todavía sin deploy; repetir aceptación del destino HTTPS cuando se publique dentro del plan.
- **Datos/entorno a conservar:** Chrome testin comprobado al terminar: 1.010 monedas, 22 puntos, 0 pendientes, 2 comprobantes, partida terminada. Nunca borrar/copiar su base a Capacitor. TWA, artefacto 02, certificado/AVD y Chrome permanecen. Servidor local único restaurado en `127.0.0.1:3000`, reverse 3000 conservado; forward 9224 sólo diagnóstico del APK debug.
- **Siguiente sesión: continuar ANDROID-03.** Leer este traspaso y [sesión/servicios](#android-03-sesion); comprobar configuración privada sin imprimirla y abrir el APK ya instalado para el ingreso personal. Empezar por email si username sigue sin configurar. Ejecutar `check-device-session.mjs --authenticated`, probar los recorridos reales pendientes y registrar evidencia antes de cerrar 03/habilitar 04. No rehacer 01/02 ni pedir contraseña por chat.

**13/10/2026 — ANDROID-03 cerrada — Sesión y servicios aceptados con dos cuentas reales**

- **Estado: cerrada. Próxima sesión: ANDROID-04.** El dueño ingresó por email y por nombre de usuario en el APK visible y realizó testin→santib→testin. Configuración privada local comprobada, error real 401 uniforme y clave ausente de recursos nativos. Perfil/lobby/API de Historia coinciden con cada identidad: testin 1.010 monedas/22 puntos; santib 220/0. Preparación real 200 con autorización y catálogo 15/66, cierre/reapertura, renovación real forzada y logout local aprobados. Chrome conserva su sesión y guardado (identidad Historia 200 después de salidas y cambios nativos). [Contrato y evidencia](#android-03-sesion).
- **Entorno y preservación:** mismo APK 0.2.0, AVD Android11 ahora visible, servidor único 127.0.0.1:3000 y puente adb. Chrome conserva 0 pendientes/2 comprobantes/partida terminada y el mismo avance. TWA y cambios locales conservados; sin deploy ni SQL. Diagnósticos de pantalla/espera corregidos; no cambió la app instalada.
- **Límite del ensayo:** Auth/datos/Realtime usan Supabase real HTTPS; API nativa nueva usa Next local por reverse3000. Rutas nuevas sin deploy. Este APK requiere el puente para esas API y no es candidato Play; repetir aceptación del destino HTTPS cuando se publique. No hay pasos personales pendientes de 03 en esta PC. APK conserva SHA-256 `4E62BAA78FC2FC94E478F12173093A3E33237E05F960130126A037A8C7C2231E`.
- **Primer paso de 04:** leer alcance 04 y revisar `src/lib/offline-campaign/storage.ts`, `sync.ts`, mapa/mesa compartidos y `apps/mobile/src/main.tsx`/`services.ts`. Elegir y comprobar el guardado propio del APK antes de integrar descarga, mapa 15/66 y Tobías; reutilizar motor/formato, confirmar cada escritura antes de avanzar y definir backup/restauración por cuenta. Probar modo avión quitando reverse, cortes durante acciones y vuelta desde el ícono sin mezclar ni perder partidas. Nunca copiar la sesión/base de Chrome. Capacitor queda autenticado como testin; servidor y emulador visibles siguen abiertos.

**13/10/2026 — ANDROID-04 cerrada — Historia instalada y guardado propio aceptados**

- **Estado: cerrada. Próxima sesión: ANDROID-05.** Se leyó AGENTS, alcance 04 y traspaso 03. Primero se comprobó el guardado SQLite del APK; después se integraron preparación autenticada, catálogo 15/66, mapa y mesa compartidos, selección de rivales y Tobías sin red. [Decisiones, pruebas y preservación](#android-04-guardado). El dueño completó el cambio personal testin→santib→testin y ambos registros conservaron exactamente sus hashes. No quedan pasos personales pendientes de 04 en este entorno.
- **Almacenamiento:** `CampaignStorePlugin.java`, SQLite de Android en `no_backup/trucazo-historia-v1.db`, esquema 1 y formato existente. Transacciones completas, revisión/cuenta activa y confirmación antes de mostrar cada jugada; error conserva el estado anterior. Backup/transferencia excluidos; actualizar el mismo paquete/firma conserva datos, desinstalar los elimina. Versiones incompatibles se conservan bloqueadas para resolver en 06. No se copió la sesión/base de Chrome ni se agregaron dependencias nativas de SQLite.
- **Pruebas reales:** descarga completa de ambas cuentas; descarga cortada de B sin preparación parcial y reintento exitoso; modo avión sin reverse; victoria 16–1 y derrota 0–15 contra Tobías; cierre/retoma exactos tras carta/canto/bot y corte inmediato durante respuesta; reinicio Android; vencimiento local forzado sin red; base/journal de sólo lectura rechazados y recuperación tras restaurar permisos. Fixture separado cubre recursos/snapshot incompletos, escritura fallida, dos cuentas y ausencia de POST de sincronización. Mesa completa a 360×568; capturas inspeccionadas. TypeScript, lint/build (7 avisos previos), sesión/UI móvil y regresión campaña/reglas SQL aprobados.
- **Artefacto:** `ar.com.trucazo.capacitor.dev`, 0.3.0/código 3, APK debug local instalado mediante actualización sin borrar datos. 15.771.816 bytes; SHA-256 `18319F1DF19E60D0DD07FA80A1A48FE260002D44B7644A6018C1F79272D70A7B`; copia en `android/artifacts/ANDROID-04/trucazo-capacitor-0.3.0-debug-local.apk`. Evidencia ignorada `android/generated/android-04-*`, especialmente `account-switch-real.json`. Sin commit/PR nuevo, SQL, deploy ni publicación.
- **Conservar para 06:** testin SQLite revisión 263, partida abierta `54bc65ed-9bb1-4234-a27b-1bddfcaed656` (0–0, 3 acciones), 4 resultados pendientes (3 derrotas/1 victoria), 24 puntos proyectados, 22 oficiales, 1.010 monedas y 0 monedas pendientes. Santib SQLite revisión 0, 220 monedas/0 puntos, sin partida/cola. Chrome testin conserva 0 pendientes/2 comprobantes/partida terminada, 1.010 monedas/22 puntos y el mismo hash tras el cambio nativo de cuentas. No enviar ni borrar la cola desde 05; la acreditación nativa corresponde a 06.
- **Entorno/límites:** AVD Android 11/WebView 133 conservado y visible. Next local de producción iniciado después del build en 127.0.0.1:3000; no reconstruir `.next` con ese servidor abierto. Modo avión apagado y reverse3000 restaurado; Auth/datos Supabase HTTPS real, API nueva por puente local. Rutas nuevas sin deploy, APK fuera de Play; destino remoto, teléfono físico y matriz Android continúan en etapas posteriores. TWA, claves, `.env.local`, Chrome y cambios locales previos conservados.
- **Primer paso de 05:** cargar `. ./scripts/android-env.ps1`; comprobar entorno y leer `src/app/game/[id]/GameClient.tsx`, `src/components/game/GameTable.tsx`, RPC/Realtime y `apps/mobile/src/main.tsx`/`services.ts`. Adaptar controlador/lobby 1v1 a navegación y sesión nativas con mano propia y SQL como autoridad; empezar por crear/unirse a mesa y obtener estado/mano. Reutilizar presentación, probar app↔web y bot a 15/30, suspensión/reconexión y privacidad. No rehacer Historia ni migraciones aplicadas, no modificar parejas/torneos ni absorber 06.

**13/10/2026 — ANDROID-05 cerrada — 1v1 compartido con la web aceptado**

- **Estado: cerrada. Próxima sesión: ANDROID-06.** GitHub traído a local hasta `f873a36`, con los siete commits nuevos y los cambios locales conservados. Respaldo de 314 archivos y stash guardados; el stash ya fue restaurado, no reaplicarlo. README mantiene orientación local y el contenido operativo incorporado vive en Operación.
- **Implementación:** lobby y controlador 1v1 compartidos, sesión propia, carga autorizada de mesa/mano, invitaciones recibidas en lobby, bot, revancha y recuperación al regresar/conectar. SQL sigue como autoridad y manos fuera de Realtime. Reloj visual no vuelve a 30 al recuperar el mismo turno; resultado/objetivos entran en una pantalla. [Decisiones, pruebas y límites](#android-05-online).
- **Aceptación:** testin en APK y santib en web (ingreso personal del dueño), privada/código, cantos, suspensión, privacidad, cierre y revancha; bots reales completos a 15 y 30; modo avión y recuperación sin premio nuevo. SQL/UI empaquetada cubren pardas, falta, tiempos, abandono, invitación y reintentos. Sesión/Historia, TypeScript, lint, presencia y builds aprobados. Medición continua del mismo turno en el dispositivo quedó inconclusa entre manos; repetirla en 14/17, junto con teléfono/matriz Android.
- **Artefacto instalado:** APK debug local 0.4.0/código 4, `ar.com.trucazo.capacitor.dev`, misma firma y actualización sin borrar datos. Copia `android/artifacts/ANDROID-05/trucazo-capacitor-0.4.0-debug-local.apk`, 15.801.827 bytes, SHA-256 `5E39D264FDB5DA4CB5C0FBE73E77762D45451B7A92474097B3F3D198B391548B`. Captura final `android/generated/android-05-final-native-result.png`; comprobaciones de botones/objetivos y preservación final guardadas junto a ella.
- **Conservar para 06:** SQLite testin revisión263, partida `54bc65ed-9bb1-4234-a27b-1bddfcaed656` abierta, cuatro pendientes/0 comprobantes, hash `ab5ebf30e53c7d198b2a013b902adfedcb616bdebb12eb4e5761c803da3ef1a0`, 24 puntos proyectados/22 oficiales. Saldo oficial testin960 y santib250 tras apuestas ficticias normales; snapshot testin aún1.010/22. Santib SQLite de04 no se escribió; Chrome sigue con sesión/hash propios, 0 pendientes/2 comprobantes. Ninguna mesa online quedó abierta. No importar guardados entre orígenes ni compensar saldos de prueba.
- **Entorno:** emulador Android11/WebView133 y APK testin en lobby. La pestaña temporal de Codex usada como santib ya no está disponible al cierre; esto no afecta la sesión ni el guardado de Chrome Android conservados. Red restaurada, modo avión apagado, reverse3000 activo y servidor Next local127.0.0.1:3000 conservado. No reconstruir `.next` mientras esté abierto. Auth/datos Supabase HTTPS real y API nueva mediante puente local; rutas nuevas sin deploy, APK fuera de Play. TWA, Chrome, claves y cambios previos conservados; sin SQL nuevo, commit, PR o publicación.
- **Primer paso de 06:** leer alcance06 y este traspaso; cargar `. ./scripts/android-env.ps1`. Comprobar lectura nativa/revisión/hash/cola/partida antes de modificar. Revisar `apps/mobile/src/campaign-storage.ts`, `services.ts`, `History.tsx`, `src/lib/offline-campaign/sync.ts` y API `src/app/api/android/historia/`. Conectar autorización propia, envío y confirmación sin borrar cola hasta guardar comprobantes; conservar versiones de la partida abierta y actualizar saldo oficial. Reutilizar migraciones aplicadas y validar reenvío/pérdida de respuesta, mezcla web/app y cuentas según06.

**13/10/2026 — ANDROID-06 en curso — sincronización nativa aceptada**

- **Estado: continuar ANDROID-06.** APK 0.5.0/código 5 instalado y sincronización con cuenta propia aceptada contra Supabase real. Falta aceptación simultánea de primera victoria desde dos sesiones reales y mezcla online/offline en ese entorno. Los casos equivalentes pasaron en PostgreSQL aislado secuencial; no presentarlos como concurrencia simultánea real. No avanzar a 07 hasta cerrar este punto. [Implementación, compatibilidad y evidencia](#android-06-sync).
- **Preservación y resultado real:** primero lectura idéntica a 05, revisión 263 y cuatro pendientes/partida abierta; actualización sin pérdida. Después terminó la misma partida 0–15 y se enviaron cinco registros. La respuesta 200 se perdió deliberadamente después de aceptar; cinco pendientes persistieron byte a byte tras modo avión, retiro del puente y cierre forzado. Vencimiento local adelantado/renovación real y reenvío confirmaron los mismos cinco comprobantes sin duplicar perfil, progreso ni estilo.
- **Datos finales:** testin SQLite revisión 299, 0 pendientes/5 comprobantes, 960 monedas/24 puntos oficiales; partida `54bc65ed-9bb1-4234-a27b-1bddfcaed656` terminada con 38 acciones. Hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`. No recuperar la revisión 263 desde los JSON históricos. Santib SQLite revisión 0 y hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e` intactos. Chrome mantiene sesión/0 pendientes/2 comprobantes y hash `13862fa63e34860049dcdbc528f689e4d376e7c8b38908dffdc125d9387a220c`, sin cambios; su snapshot 1.010/22 quedó antiguo y no se importó a Capacitor.
- **Verificaciones:** UI/SDK móvil cubre respuesta perdida, fallo de escritura, identidad cambiada durante envío y confirmación incompatible; SQL cubre 66 rivales, lotes, 18 adulteraciones, topes, estilo y rollback. Reglas: 59.940 desbloqueos/1.650 premios. Presentación de 15 regiones en WebView 360×568 con progreso ficticio sólo en memoria, sin escritura/envío. Formato/motor/partida/pendientes incompatibles bloqueados con base real intacta. TypeScript, lint con siete avisos previos, sesión/handlers y APK aprobados; API no cambió y `.next` no se reconstruyó.
- **Artefacto/entorno:** `android/artifacts/ANDROID-06/trucazo-capacitor-0.5.0-debug-local.apk`, 15.586.933 bytes, SHA-256 `7F805E9C8439BEE2D800EF013C637FE41211F1BBBA33EE6C36B02CCEB3994E43`, misma firma debug. Capacitor quedó reabierto normalmente como testin en lobby; red, reverse 3000, forward 9224 y servidor local conservados. Ensayos temporales retirados al reabrir. TWA, Chrome, claves y cambios locales previos intactos; sin SQL nuevo, commit/PR, despliegue ni publicación. No volver a aplicar las migraciones de Historia del 11/10.
- **Primer paso concreto de la nueva sesión:** cargar `. ./scripts/android-env.ps1`, leer este traspaso y ejecutar `node apps/mobile/scripts/check-device-sync.mjs summary` para verificar el guardado final. Comprobar el ingreso personal de santib en una pestaña separada (se dejó el login en el navegador de Codex; puede requerir reabrirlo desde la nueva sesión). Preparar la aceptación real de primera victoria desde dos sesiones y mezcla online/offline, sin fabricar victorias ni compensar saldos en producción. Mantener las dos autorizaciones y descargas separadas; si se necesita ingresar en el APK, lo hace personalmente el dueño. Registrar evidencia, cerrar 06 sólo cuando se acepte el pendiente y entonces habilitar 07. El dueño pidió crear una sesión nueva para continuar con **06**, no empezar 07.

**13/10/2026 — ANDROID-06 en curso — prueba simultánea preparada; falta ingreso personal**

- **Estado: continuar ANDROID-06.** Sincronización nativa ya aceptada; simultaneidad real y mezcla online/offline siguen pendientes. Se prepararon el puente local y el desvío temporal del WebView, con prueba HTTP ficticia y sonda nativa sin sesión aprobadas. No confundir esas pruebas de herramienta con aceptación real. [Recorrido concreto y evidencia](#android-06-sync).
- **Datos preservados:** testin revisión 299, hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`, 960/24, cinco comprobantes y cero pendientes; estilo/progreso oficiales coinciden. Santib SQLite hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e` intacto. Chrome/TWA no se operaron. No se cambiaron cuentas, partidas ni saldos.
- **Paso personal pendiente:** pestaña del navegador de Codex `http://localhost:3000/login` abierta/conservada para santib. Se pidió ingreso personal, sin recibirlo en esta continuación. No pedir ni leer la contraseña por chat. Después del ingreso web, preparar el ingreso independiente en APK; el dueño también lo completa personalmente.
- **Herramientas:** `apps/mobile/scripts/campaign-sync-gate.mjs` y `route-device-sync-gate.mjs`; pruebas ficticias y resultados separados en `android/generated/android-06-gate-*`. El puente inicia desarmado. No se dejó desvío en el APK ni reverse 3002 al terminar. Reverse 3000, forwards 9224/9223, APK 0.5.0 y Next local conservados. Sin reconstrucción de `.next`, APK, SQL nuevo, commit/PR ni publicación.
- **Primer paso siguiente:** cargar `. ./scripts/android-env.ps1`, comprobar estado/ingreso en la pestaña conservada y seguir el recorrido del capítulo 06. Iniciar el puente y su reverse sólo cuando las dos sesiones propias estén listas. Verificar solicitudes superpuestas, un solo premio inicial, estilo y mezcla real; cerrar 06 únicamente al aceptar esos pendientes. 07 continúa sin empezar.

**14/10/2026 — ANDROID-06 en curso — dos cuentas de prueba e ingreso automático aceptados**

- **Estado:** dos usuarios reutilizables creados a pedido del dueño: `androidqa1`/`androidqa2`. Ingreso automático comprobado en web y APK con credenciales privadas locales. El pedido de ingreso personal de santib queda reemplazado para las pruebas habituales. [Accesos y comandos](#android-qa-accounts).
- **Datos:** ambas cuentas empiezan con 1.000 monedas/0 puntos/sin victorias, permisos ordinarios y correos automáticos desactivados. Testin y santib conservan byte a byte sus guardados; testin 299/960/24/cinco comprobantes/cero pendientes. Ningún reset ni resultado fabricado.
- **Entorno:** APK 0.5.0 en lobby de androidqa2, emulador Android 11 `emulator-5554`, reverse 3000/forward 9224 y Next local abiertos. Puente 3002 apagado. Guardar la carpeta privada excluida de Git; scripts no imprimen sesiones ni passwords. Sin reconstrucción, SQL de esquema, commit/PR, deploy/publicación.
- **Pendiente de 06:** aceptación real de primera victoria simultánea y mezcla online/offline. El acceso ya no bloquea: el agente puede ingresar con los scripts QA. Para concurrencia usar la misma cuenta en dos sesiones propias; el segundo usuario sirve para A/B y duelos. Correo real/Google de 07 siguen como aceptación específica posterior.
- **Primer paso siguiente:** cargar entorno; comprobar `qa-accounts.mjs check` y los guardados personales mediante lectura por UUID. Dejar el APK en ingreso con salida local y ejecutar `qa-login.mjs native 1`; abrir el puente e ingresar web1 en 3002. Preparar dos descargas independientes y seguir el recorrido real de 06 sin alterar resultados/progreso. No habilitar 07 antes de cerrar los dos pendientes.

**14/10/2026 — ANDROID-06 cerrada — simultaneidad y mezcla real aceptadas**

- **Estado: cerrada; siguiente etapa ANDROID-07.** Completadas primera victoria simultánea y mezcla online/offline con dos sesiones propias, APK 0.5.0, Next local y Supabase real. No se empezaron cambios de 07. [Aceptación final](#android-06-cierre).
- **QA1 simultánea:** dos victorias 16–0, solicitudes HTTP realmente superpuestas y dos 200; nativo 50 monedas/24 puntos, web 0 monedas/2 puntos. Perfil, ambos guardados y estilo final coinciden en 1.050/26/dos victorias. Native revisión 46/hash `1c01989ab72beebedd2cea02e3c691d8c42fb635ce09020854e3ca39e531f99a`; web revisión 45. Cada origen guarda un comprobante propio y cero pendientes.
- **QA2 mezcla:** victoria descargada 17–0 quedó offline en revisión 44/hash intacto al reabrir. Victoria web online 15–10 cobró 50/21; al reconectar el mismo pendiente recibió 0/2. Perfil y SQLite 1.050/23/dos victorias, revisión 45/hash `be4d53d687c8880b28d0d3f4b570127f677155becc0e26e89aa012ecb6d4d7d7`, cero pendientes/un comprobante y suma exacta del estilo online/offline.
- **Conservar:** testin revisión 299/hash `3d5f63779e17dd9cf3d37de318022fcca96cd9534e07e77fbd75cc12745432e1`, 960/24/cinco comprobantes/cero pendientes; santib revisión 0/hash `4df9912209a64aba7af80381293a3095d92e52f05f2202b71285e4fa1cd3f19e`. Chrome/TWA/claves y cambios locales anteriores intactos. No restaurar snapshots iniciales de QA ni reenviar comprobantes aceptados.
- **Entorno final:** Android 11/WebView 133, APK en Historia de QA2, red/reverse 3000/forward 9224 y Next local conservados. Puente 3002/desvío debug retirados. Evidencia `android/generated/android-06-*`; contraseñas/perfiles QA siguen privados/excluidos de Git. Sin nueva migración, reconstrucción de `.next`/APK, commit/PR, despliegue ni publicación.
- **Primer paso de 07:** leer su alcance, cargar entorno y comprobar los estados finales por lectura; revisar callback/login/registro/recuperación, configuración real Supabase/Google y navegación Android antes de implementar. Reutilizar cuentas QA para pruebas habituales. Los accesos puntuales Google/correo real que requieran al dueño se preparan con pasos concretos; nunca pedir contraseñas por chat.

<a id="android-07-traspaso-2026-10-14"></a>

**14/10/2026 — ANDROID-07 cerrada — alta, Google, recuperación y enlaces aceptados**

- **Estado: cerrada; próxima sesión ANDROID-08.** Alta inmediata real, Google abierto/cerrado, recuperación real y destinos de enlaces tras login aceptados. Cierre de 06 conservado. [Entrega, matriz y configuración identificada](#android-07-acceso). No se implementó 08 en esta sesión. Regla permanente hasta 20: una etapa por sesión, continuar hasta completarla antes del texto final.
- **Cambios/artefacto:** APK **0.6.0/código 6** generado, firma verificada e instalado por actualización; copia final y hash en el capítulo de 07. Browser oficial 8.0.5 fijado. Callback web y modo invitado conservados. Resto de trabajo local anterior intacto; sin commit/PR.
- **Servidor aplicado:** cuatro retornos locales nuevos en Supabase, autorizados expresamente por el dueño y comprobados (siete en total). SMTP Resend activado por guardado personal de clave limitada; recarga del panel y correo real entregado/recibido lo acreditan. Plantillas y Google Cloud conservados. **Confirmación desactivada por decisión del dueño:** borrador cancelado, no pedir activarla para avanzar. Sin SQL nuevo ni deploy. Asociación pública real todavía `[]`, por lo que no se certifica apertura automática de App Links.
- **Pruebas:** Google real abierto/cerrado y cancelación con SantiBP existente; retorno frío PID 15746→29107. Recuperación recibida fuera del APK, contraseña personal y lobby administrador. QA3 creada por formulario, sesión inmediata, perfil único 1.000/0, duplicado rechazado e ingreso app/web. Enlaces resueltos por manifest, vuelta a mesa existente tras login app/web y QA ajena rechazada; mesas canceladas/reembolsadas, cero partidas. Fallback sin APK y assetlinks local con huella real/compatibilidad TWA aprobados. Se conservan las pruebas SDK/proveedor simulado de confirmación/recuperación web/PKCE/reenvíos/rechazos; tipos/build/lint con siete avisos previos, presentación compartida, sesión y cuatro pruebas Android aprobadas. La autoasociación pública no se presenta como probada: sus valores/configuración finales quedan identificados para 16/18 como permite la entrega de 07.
- **Datos preservados:** comprobados los cuatro hashes finales de 06 mediante `check-device-preserved.mjs`, antes y después del APK final y del ingreso. Testin 299/960–24/cinco comprobantes; santib 0; QA1 46/1.050–26 y QA2 45/1.050–23/un comprobante; todos sin pendientes. Chrome/TWA y perfiles web personales no se operaron; no se importaron sesiones. Accesos QA y evidencia permanecen privados/excluidos de Git.
- **Estado final de cuentas:** APK en lobby de **androidqa2**, tras salida local normal de QA3. SantiBP se usó sólo para las aceptaciones personales de Google/recuperación; perfil de julio y permisos conservados, contraseña cambiada por el dueño. QA3, UUID `2c9dd1e8-a39b-41e7-af2a-f67502691795`, queda permanente en `registrationAccount` del archivo privado; `qa-login.mjs web|native 3` disponible. QA1/QA2 permanecen en `accounts`; no recrear ni restablecer accesos. Correos de las tres QA desactivados, marca QA y ACL user/SYSTEM comprobadas. `qa-accounts.mjs check` verifica las tres.
- **Continuación personal del mismo día:** los dos intentos preparados por adelantado vencieron con `bad_oauth_state` / `OAuth state has expired`. Después el dueño inició por el botón cuando estaba listo y completó Google → «Abrir Trucazo» → lobby. Se reutilizó su perfil de julio. Ver diagnóstico y aceptación posterior en el capítulo de 07; no se ampliaron vencimientos ni se cambiaron URLs, APK o contraseñas para conseguirlo.
- **Entorno final:** Android 11 `emulator-5554`, reverse 3000/forward 9224 y visor conservados. Next nuevo abierto en 3000 desde `android/generated/android-07-next` (PID de esta sesión en `android/generated/android-07-live.pid`; último 7760). `.next` original intacto; servidor temporal 3002 cerrado. Mantener `TRUCAZO_NEXT_DIST_DIR` al iniciar la web nueva; quitarla inicia el build anterior. Dashboard Supabase autenticado conservado para continuar configuración.
- **Primer paso de 08:** leer AGENTS/README/estado y este cierre; comprobar serial, servidor, cuatro hashes e ingreso QA. Relevar perfil, progreso, economía, ranking y personalización existentes antes de adaptar sus pantallas/RPC, dentro de 08. **No reabrir Confirm email** ni repetir Google/recuperación/alta por rutina. Conservar SMTP y su cuota compartida; clave sólo en los servicios. Para 16/18 están identificados paquete, esquema, huellas y retornos HTTPS que se repiten al fijar la identidad final; no representan pruebas públicas ya aprobadas. No publicar todavía. Completar exclusivamente 08 en su sesión antes del texto para 09.

<a id="android-08-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-08 cerrada — perfil, economía, personalización e Historia**

- **Estado:** 01–08 cerradas; próxima sesión exclusivamente **ANDROID-09**. [Inventario, pruebas y entrega de 08](#android-08-perfil). Perfil/avatar/estadísticas/historial/medallas, ranking, tienda/equipamiento, cofre y selección de Historia online/offline cubiertos. No se empezó parejas ni se publicó.
- **Entorno:** APK **0.7.0/código 7** instalado por actualización, firma debug conservada. Artefacto/hash en el capítulo de 08. Android 11/WebView 133, `emulator-5554`, reverse 3000 y forward 9224. Next final en 3000 con `TRUCAZO_NEXT_DIST_DIR='android/generated/android-08-next'`; PID en `android/generated/android-08-live.pid`. Preview 3002 y servidor 07 cerrados; `.next` original conservado.
- **Datos:** cuatro guardados de 06 idénticos. QA3 tiene su propio guardado revisión **1**, hash `95048fc6d7a300b74df251d1d7c9a657c96b898ae23f4776b67ebe66a73d1f6c`, foto cacheada, Cafetín/Bronce/agua, 400 monedas/0 puntos y cero pendientes. Las compras normales fueron 250 + 200 + 150 desde 1.000; reintentos rechazados sin gasto extra. QA1 conserva 1.050/26 y QA2 1.050/23. APK final en lobby de QA3, sin partida abierta. `check-device-preserved.mjs` valida ahora los cinco; no usar la nueva descarga para reemplazar la de otra cuenta.
- **Aceptación:** las tres QA coinciden entre web y app; mesa online equipada, descarga, actualización y reapertura en modo avión aceptadas. Misiones/racha/tutoriales conservados al actualizar. Recorrido instalado por 15 provincias sin cambiar guardados; 66 aperturas/revanchas, 59.940 desbloqueos, 1.650 premios, compras, bono, cofre y privacidad probados con SQL aislado. Regresiones de sesión/Historia/sincronización y acceso simulado, tipos, lint/build y APK aprobados. El teléfono físico/API36/Play siguen en sus etapas; estas evidencias no los sustituyen.
- **Primer paso de 09:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/forward y ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Usar Chrome local con `PWA_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'` para pruebas. Leer la entrega vigente de parejas y bots en `docs/juego.md` y relevar el controlador 2vs2 antes de adaptar. Reutilizar las tres QA. Conservar **Confirm email apagado**, SMTP y accesos personales; no repetir alta/Google/recuperación, aplicar otra vez migraciones ni publicar. Completar únicamente 09 en su sesión.

<a id="android-09-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-09 cerrada — parejas app/web, bots, chat y recuperación**

- **Estado:** 01–09 cerradas; próxima sesión exclusivamente **ANDROID-10**. [Matriz, aceptación y artefacto de 09](#android-09-parejas). No se empezó torneos ni se publicó. Se reutilizan las reglas/controlador de parejas existentes; el pendiente histórico de bots que hablan queda descartado por evidencia del servidor real, sin repetir SQL.
- **Entorno:** APK **0.8.0/código 8**, actualizado sin borrar datos y con firma debug conservada. Android 11/WebView 133, `emulator-5554`, reverse 3000 y forward 9224 restablecido al nuevo proceso. Next en 3000 con `TRUCAZO_NEXT_DIST_DIR='android/generated/android-09-next'`, build `G_WQSACAkqg94_8gNockE`; PID **8592** en `android/generated/android-09-live.pid`. Servidor 08 y preview 3002 cerrados por PID identificado. `.next` original, Chrome, TWA y claves conservados.
- **Datos:** cinco guardados idénticos a 08, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0**. Evidencia `android/generated/android-09-preserved.json`. Las fotos de saldo del guardado no son el saldo actual del lobby: no actualizarlas para hacerlas coincidir. QA3 conserva foto/Cafetín/Bronce/agua y sus 66 rivales. Saldos actuales del servidor: QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**; variaciones normales por tres apuestas de 10 registradas en el capítulo de 09. Ninguna compensación administrativa. APK en lobby QA3, sin mesa abierta.
- **Aceptación:** cinco composiciones × 15/30 y reglas/privacidad/pagos/bots aprobados en PostgreSQL aislado. UI empaquetada sin desplazamiento en cuatro tamaños; APK con siete acciones visibles. Mixta definitiva **15–5** y APK + tres bots **15–30**, ambas por puntos y sin vencimientos. Chat escrito recibido app↔web; compañero bot responde frases. Cierre forzado/reingreso conserva asiento/cartas/jugadas/reloj. Dos reintentos de cierre no duplican monedas. Regresión 1v1 y acceso simulado, tipos, lint/build, permisos y firma aprobados. Los siete avisos de lint previos permanecen; teléfono/API36/Play corresponden a etapas posteriores.
- **Primer paso de 10:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/forward y ejecutar los comprobadores de cinco guardados y QA indicados en el traspaso anterior. Después leer la entrega vigente de **torneos** en `docs/juego.md` y relevar central/inscripción/controladores antes de adaptar. Reutilizar QA1/QA2/QA3; no habilitar torneos reales ni enviar campañas a terceros. **Confirm email sigue apagado**, comprobado de sólo lectura, y SMTP no cambió. No repetir alta/Google/recuperación ni migraciones. Completar únicamente 10 en su sesión y no publicar todavía.

<a id="android-10-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-10 cerrada — torneos, grupos, espectador y permisos**

- **Estado:** 01–10 cerradas; próxima sesión exclusivamente **ANDROID-11**. [Rutas, entornos y aceptación de 10](#android-10-torneos). Backend de torneos reutilizado sin migraciones. No se empezó comunidad ni se publicó.
- **Entorno:** APK **0.9.0/código 9**, actualizado sin borrar datos y con firma debug conservada. Android 11/WebView 133, `emulator-5554`, reverse 3000 y forward 9224 al proceso actual. Next final en 3000 con `TRUCAZO_NEXT_DIST_DIR='android/generated/android-10-next-final'`, build `Co_1AbIoLxEHllX8SmVgT`; PID **20228** en `android/generated/android-10-live.pid`. No reconstruir esa carpeta mientras el servidor la use. Servidores de ensayo y el anterior de 09 cerrados por PID identificado; `.next`, Chrome, TWA, claves y perfiles QA conservados.
- **Aceptación:** cinco suites SQL de torneos aprobadas. Cuatro recorridos completos de inscripción a posiciones/premios (1v1/parejas × eliminación/grupos) en PGlite e interfaz empaquetada, repetidos en APK con sesión QA3 real y REST aislado. Cierres restantes mediante helpers SQL del motor, sin declararlos partidas manuales completas. Carta por control del APK, espectador app/web sin manos privadas, check-in/espera, ausencias, pareja incompleta, pausa/agenda/cancelación, avisos y permisos aprobados. Espectador completo en cuatro tamaños y en APK. Regresiones de acceso/1v1/parejas, tipos, contratos y builds aprobados; sólo siete avisos previos de lint.
- **Producción y QA:** central real vacía coincide en APK QA3 y web QA1/QA2. Enlaces frío/caliente y rechazo de rol comprobados. Cero torneos ANDROID-10 y cero inscripciones QA en Supabase. Las direcciones `.test` no son elegibles para competir; no modificarlas ni habilitar torneos reales para repetir QA. Confirmación de correo apagada (`mailer_autoconfirm=true`) leída, SMTP intacto y ningún correo enviado.
- **Datos:** cinco hashes idénticos a 08, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0**; `android/generated/android-10-preserved.json`. Saldos del servidor sin cambios en 10: QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**. Conservar las fotos históricas de saldo de SQLite, foto/equipamiento de QA3 y todos los accesos privados. APK en lobby QA3, sin mesa abierta; red/interceptores de diagnóstico restaurados.
- **Primer paso de 11:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/forward y ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Después relevar comunidad, amigos/grupos/invitaciones, reseña/soporte, preferencias/ayuda y rutas administrativas restantes del inventario de 01. Reutilizar presentación y servicios; no tocar torneos ni enviar campañas/soporte a terceros sin destinatario autorizado. Conservar Confirm email apagado. Completar únicamente 11 en su sesión; no empezar moderación/push ni publicar.

<a id="android-11-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-11 cerrada — comunidad, soporte y rutas restantes**

- **Estado:** 01–11 cerradas; próxima sesión exclusivamente **ANDROID-12**. [Inventario, superficies de contenido, proveedores y aceptación de 11](#android-11-comunidad). Presentación web original reutilizada y autoridad SQL conservada. Sin migraciones, cambios de SMTP, campañas, publicación ni comienzo de moderación/push.
- **Entorno final:** APK debug **0.10.0/código 10**, `ar.com.trucazo.capacitor.dev`, SHA-256 `733c97f5332ce8ade910e22aba958b61cc27eba09f8d084fb3593dcd6829c5e0`; firma debug conservada `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`. Actualizado sin borrar datos en Android 11/WebView 133, `emulator-5554`. Next 3000 con `TRUCAZO_NEXT_DIST_DIR='android/generated/android-11-next-notice'`, build `vQ01k7FbBgh1XaNoA18y7`, PID **24044** en `android/generated/android-11-live.pid`. No reconstruir esa carpeta mientras el servidor la use. Reverse 3000 y forward 9224 al proceso actual; APK en lobby QA3, sin mesa abierta. Chrome, TWA, claves y trabajo local previo conservados.
- **Aceptación:** amistades/grupos/presencia/rechazo-cancelación de invitaciones reales QA3 app↔QA1 web; relaciones de ensayo retiradas. Chat global/novedades y aceptación de invitación hasta mesa/resultados con SQL aislado, sin contenido público real. Administración positiva en APK con datos ficticios y sesión real; permisos negativos con QA real, sin conceder rol. Selector Android para foto/adjunto, cancelación/borrador, fallo/limpieza, privacidad de imágenes, preferencias apagadas y enlaces frío/caliente comprobados. UI 320/360/768, acceso con proveedor simulado, contratos Android/RPC, tipos/lint/builds aprobados; siete avisos previos de lint. Teléfono físico y matriz Android quedan en sus etapas.
- **Soporte recibido:** el dueño autorizó un único aviso al correo actual y después confirmó «Listo, ya llegó». Reseña QA3 `4004b732-4833-455a-83b6-83b341afc9d0` guardada una vez, con imagen privada. Web3Forms requiere envío desde navegador/WebView; servidor prepara enlaces temporales de siete días. Descarga y bytes de la imagen comprobados, acceso público rechazado. El fallo del aviso no provoca otra reseña ni borra imágenes vinculadas. No repetir los scripts ignorados de envío único. Las dos reseñas técnicas QA2 anteriores quedaron sin avisos; no reenviarlas.
- **Datos conservados:** cinco hashes idénticos a 08, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0**; `android/generated/android-11-preserved.json`. Saldos actuales del servidor QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**, sin movimientos en 11. No reemplazar las fotos históricas de saldo de SQLite por el saldo del lobby. QA2 sin avatar temporal; QA3 conserva foto/equipamiento. **Confirm email apagado** (`mailer_autoconfirm=true`) verificado de sólo lectura al cierre. Evidencia final en `android-11-artifact.json`, `android-11-close.json`, `android-11-authorized-notice.json` y los informes del capítulo de 11; sin claves ni URLs firmadas en esos registros.
- **Primer paso de 12:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/reverse/forward y ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Después revalidar si apareció una implementación posterior de denuncias/bloqueos y contrastar el inventario de contenido de 11 antes de definir el sistema mínimo. Reutilizar las tres QA; conservar confirmación apagada. La política, retención, responsable y SQL nuevo se trabajan y verifican dentro de 12; no repetir migraciones ni avisos de 11 por rutina. Completar exclusivamente 12 y no publicar todavía.

<a id="android-12-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-12 cerrada — denuncias, bloqueos y convivencia**

- **Estado:** 01–12 cerradas; próxima sesión exclusivamente **ANDROID-13**. [Política, datos y aceptación de 12](#android-etapa-12). Responsable de revisar denuncias confirmado: el dueño. SQL aplicado por él con Success y comprobado en Supabase. No volver a ejecutar `20261015145540_community_safety.sql`; foto equivalente en `supabase/schema/community_safety.sql`. Sin publicación ni comienzo de push.
- **Aceptación:** normas antes de aportar contenido; denuncia privada con texto/imagen conservados, bloqueo bilateral, desbloqueo y administración. Pruebas aisladas de todas las superficies, abuso, retención y sanción; APK y web con tres QA reales para privacidad y rutas alternativas. Único caso QA `4a0b7585-e086-461e-a7db-bcd7c66c7a09`, resuelto sin sanción por RPC con contexto SQL del administrador existente; respuesta visible en web QA1. Administración positiva de interfaz en APK con datos aislados. Cero bloqueos/restricciones QA restantes; no repetir casos ni dar roles por rutina. Ver `android-12-real.json` y los informes de aceptación.
- **Configuración:** `community_safety.settings.enforce_rules=false` conserva el piloto SQL para las tres QA; la UI nueva local pide normas a todos. Activación global mediante migración nueva coordinada con la publicación de esa UI en 20. Cron `trucazo-community-safety-cleanup`, diario a `03:20 UTC`; retención hasta 180 días desde recepción o 90 desde cierre, lo que venza primero. Medios dentro del caso privado, sin proveedor nuevo. [Privacidad](../src/app/privacidad/page.tsx), normas y controles coinciden con la implementación.
- **Entorno final:** APK debug **0.11.0/código 11**, `ar.com.trucazo.capacitor.dev`, SHA-256 `888bd36588e867278f5d3b9842db46eb7df7e07529e8462c745f6bfa5546a905`, firma debug anterior conservada. Android 11/WebView 133, `emulator-5554`; Next 3000 con `TRUCAZO_NEXT_DIST_DIR=android/generated/android-12-next-final`, build `81TP85L-hWxfQFQ7c1exn`, PID **24076** en `android/generated/android-12-live.pid`. No reconstruir esa carpeta mientras se use. Reverse 3000→3000 y forward 9224 al proceso actual; APK en lobby QA3, sin mesa abierta. Si Android renovó el proceso, actualizar sólo el forward; no reinstalar/borrar datos. Chrome/TWA, secretos y trabajo local anterior conservados.
- **Datos conservados:** cinco hashes idénticos a 08, revisiones **299/0/46/45/1**, pendientes **0/0/0/0/0**, comprobantes **5/0/1/1/0**; `android/generated/android-12-preserved.json`. Saldos del servidor QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**, sin cambios en 12. Conservar las fotos históricas de saldo de SQLite, foto y equipamiento de QA3. **Confirm email apagado** (`mailer_autoconfirm=true`), SMTP intacto. Tipos/lint, contratos, regresión de comunidad/chat, builds Next/APK y aceptación propia aprobados; siete avisos previos de lint. Artefacto/cierre registrados en `android-12-artifact.json` y `android-12-close.json`.
- **Primer paso de 13:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/reverse/forward y ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Después revisar configuración push existente y acordar eventos/frecuencia dentro de 13, sin volver a preguntar si se incluye push. Reutilizar las tres QA, conservar confirmación apagada y completar exclusivamente 13. No repetir SQL/avisos/casos de 11–12 ni publicar todavía.

<a id="android-13-traspaso-2026-10-15"></a>

**15/10/2026 — ANDROID-13 cerrada — notificaciones nativas**

- **Estado:** 01–13 cerradas; próxima sesión exclusivamente **ANDROID-14**. [Acuerdo, configuración y aceptación de 13](#android-etapa-13). Recepción real con app abierta/en segundo plano/proceso cerrado, destinos frío/caliente, permisos, renovación, preferencias, duplicados, baja y cambio de cuenta comprobados en Android 11/16. Tres eventos acordados; no volver a preguntar si se incluye push ni sus frecuencias. Sin publicación ni comienzo de 14.
- **Aplicado:** Firebase `trucazo-1dfcc`, configuración QA y cuenta de envío privada conservadas. SQL `20261015231009_native_push_notifications.sql` aplicado por el dueño; resultado `schedule 13` confirmado como cron id 13, cada quince segundos. **No repetir SQL ni Firebase.** `native_push.settings.pilot=true`, `dispatch_enabled=false`: sólo QA y sin llamadas públicas. API nueva sólo local; activación pública coordinada con 20. Credencial de servidor en carpeta privada, fuera de Git/APK; conservarla sin imprimirla.
- **Aceptación y limpieza:** invitación privada QA1→QA3 recibida en dos instalaciones reales; check-in/cruce generados con SQL aislado y transportados por handler/FCM reales al APK QA2, sin torneo publicado. Mensajes adicionales de protección sólo a QA. Invitación/mesa y amistad de ensayo retiradas; sin partida jugada, saldos intactos y cero entregas pendientes. No ejecutar los scripts de envíos por rutina. Evidencia `android/generated/android-13-*.json/png`; artefacto y cierre en `android-13-artifact.json` y `android-13-close.json`.
- **Entorno final:** APK debug **0.12.0/código 12**, paquete `ar.com.trucazo.capacitor.dev`, SHA-256 `481601f8f5bd52fa738c80985c36666ed5e9f446067225fc9430413d749b75ea`, firma anterior `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`. Copia `android/artifacts/ANDROID-13/trucazo-capacitor-0.12.0-debug.apk`. Next 3000, `TRUCAZO_NEXT_DIST_DIR=android/generated/android-13-next`, build `_Jgnal5I8jlRrpzB_42jv`, PID **7076** en `android/generated/android-13-live.pid`. No reconstruir esa carpeta con el servidor abierto. Reverse 3000→3000 y forward 9224 al WebView **7335** al cierre; actualizar sólo el forward si Android renueva el proceso. `.next` original y builds previos conservados.
- **Dispositivos/datos:** principal `emulator-5554`, Android 11/API30/WebView133, lobby QA3 sin mesa; push activado con las tres preferencias encendidas. Android 16/API36/WebView133 `emulator-5556` se cerró sin borrar datos, sesión QA3 propia y notificaciones de esa instalación dadas de baja. Cinco hashes idénticos a 08/12: revisiones **299/0/46/45/1**, pendientes **0/0/0/0/0**, comprobantes **5/0/1/1/0**. `android-13-preserved.json`. Saldos del servidor QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**; fotos históricas de SQLite conservadas. **Confirm email apagado**, SMTP intacto. Chrome/TWA, foto/equipamiento QA3, cuentas y claves anteriores conservados.
- **Validación/límites:** tipos, lint web/móvil, allowlist de RPC, regresión de sesión, SQL/API aislados, Next/APK y aceptación FCM aprobados. Avisos previos: siete web y dos del adaptador de imágenes Android; sin avisos nuevos. Sin credencial de envío en 229 entradas del APK inspeccionadas. Teléfono físico y Play no cubiertos; aceptación posterior según el plan. No prometer entrega tras `force-stop` ni restricciones de Android. Nuevos datos/retención para 15 documentados en el cierre de 13. No hubo commit/PR, deploy web ni publicación Play.
- **Primer paso de 14:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/reverse/forward y ejecutar `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Después inventariar y verificar Atrás/gestos, teclado, suspensión, audio, pantallas y accesibilidad según 14, conservando el diseño. Reutilizar las tres QA, confirmación apagada y piloto push. Completar exclusivamente 14, sin repetir registros, SQL, Firebase ni avisos de prueba y sin publicar.

<a id="android-14-traspaso-2026-10-16"></a>

**16/10/2026 — ANDROID-14 cerrada — comportamiento, presentación y rendimiento**

- **Estado y aceptación:** 01–14 cerradas; próxima sesión exclusivamente **ANDROID-15**. [Matriz, ajustes y límites de 14](#android-etapa-14). El dueño respondió «Sí, cerrá 14 con esos criterios y la batería física en 17»: aceptó 4 s como control provisional de lobby en este emulador y objetivo de 3 s en teléfono. Batería física y comprobación del objetivo real se realizarán en [17 con el candidato firmado](#android-etapa-17); no se certificaron en 14. La propuesta inicial de 6 s quedó retirada. No se comenzó 15 ni se publicó.
- **Comportamiento aceptado:** Atrás por capas/menús/historial/minimización, foco y ventanas anidadas, cierre conjunto sin bloquear el fondo, teclado/autocompletado, recuperación de cuenta/pantalla tras pérdida de proceso y borrador tras suspensión. Audio local se detiene al suspender/silenciar; modo avión y red lenta conservan Historia sin premios nuevos. Cantos/salida/sonido/chat de 44 px, mesas 1v1/parejas completas sin scroll en pantallas bajas y horizontales, letra al 130 %, muesca y tablet. Contraste 5,09–6,05:1, nombres accesibles y servicio/recorrido TalkBack comprobados; no se presenta como escucha humana de toda la locución.
- **Entornos y alcance de las pruebas:** Android 10/API29/WebView133, Android 11/API30/WebView139 y Android 16/API36/WebView133. WebView74 de fábrica en 10 abre la página local de actualización; el recorrido normal se verificó con 133, no con el mínimo de motor 105 configurado. Nueve familias, seis salones y comparaciones app/web; juego y resultados aislados con SQL local y solicitudes interceptadas, sin nuevas partidas reales. Recursos, reglas SQL y autoridad del servidor conservados. No se agregaron voces, vibración, SDK ni permisos.
- **Mediciones:** último APK con marca interna y conexión anticipada a Supabase; lobby **2,691–3,597 s** (mediana 2,899), primer contenido desde abrir **1,972–2,614 s**, ventana **0,301–0,450 s**. Informes `android-14-startup-internal.json` y capítulo de 14; se conserva el caso lento previo de 6,71 s. Reposo visible 7.270→2.403 ms de hilo principal/20 s; suspendida estable, **cero HTTP** y 19,85 ms/20 s, con latido Realtime de 101 bytes. No equivale a batería ni red nativa total. El ensayo de lecturas paralelas se retiró por falta de mejora consistente; `getUser` y el orden original de verificación siguen conservados.
- **Artefacto final de esta etapa:** APK debug **0.13.0/código 13**, paquete `ar.com.trucazo.capacitor.dev`, SHA-256 `8e8714fe0842ca94d7185c80754306a68358387bdcd9bcec360cc6419c02aeea`; firma anterior `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`. Copia `android/artifacts/ANDROID-14/trucazo-capacitor-0.13.0-debug.apk`. Mínimo API29/objetivo API36, recursos locales; programa/CSS/HTML instalados coinciden con la construcción. Tipos, lint, contratos/RPC, regresiones propias y existentes, Next y APK aprobados; quedan siete avisos previos web y dos del adaptador de imágenes. `android-14-artifact.json` y `android-14-close.json` registran el cierre y la aceptación; no es un release ni una autorización de publicación.
- **Entorno para retomar:** Next 3000, PID **21444**, `TRUCAZO_NEXT_DIST_DIR=android/generated/android-14-next-verified`, build `4HmowPM4u3x6Qgi4cNBBO`, `android-14-live.pid`. No reconstruir esa carpeta con el servidor abierto. `.next`, build de 13 y candidatos anteriores conservados. Principal `emulator-5554`, WebView PID **15970**, forward 9224 y reverse 3000; app en segundo plano con lobby/sesión QA3 y push de esa instalación conservado activado. Si cambia el proceso, renovar sólo el forward. Android 10/16 cerrados sin borrar datos, sesión e Historia propias y push sin activar; no importar esos guardados al principal.
- **Datos y configuración conservados:** cinco hashes idénticos a 08/13, revisiones **299/0/46/45/1**, cero pendientes y comprobantes **5/0/1/1/0** (`android-14-preserved.json`). Saldos del servidor QA1 **1.070/26**, QA2 **1.030/23**, QA3 **370/0**, intactos; foto y Cafetín/Bronce/agua de QA3 conservados. Las fotos históricas de saldo de SQLite siguen sin actualizar. **Confirm email apagado**, SMTP intacto; piloto push QA y despacho público apagado, cero entregas pendientes y cero partidas QA 1v1 abiertas. Sin migraciones aplicadas, reconfiguración Firebase, avisos push, commit/PR ni despliegue en 14. Chrome/TWA y claves conservados.
- **Primer paso de 15:** cargar `. ./scripts/android-env.ps1`, comprobar servidor/serial/reverse/forward y los cinco guardados antes de tocar datos. Después leer [alcance de 15](#android-etapa-15) y contrastar APK, almacenamiento y proveedores para el inventario de privacidad. Incluir la última ruta permitida por cuenta (`trucazo:mobile:screen:<owner>`), sin contraseña/token, y los datos de push/convivencia documentados en 12/13. Reutilizar las tres QA; no borrarlas por rutina para probar eliminación: identificar y autorizar la cuenta de esa prueba dentro de 15. Conservar confirmación y despacho público apagados. No repetir SQL, Firebase, registro o avisos por rutina; completar exclusivamente 15, sin comenzar 16 ni publicar.

#### Frase que puede usar el dueño en una sesión nueva

> Comenzá ANDROID-15. 01–14 cerradas. Leé AGENTS.md, README.md y el último traspaso de 14 del 16/10 en docs/android.md. Primero comprobá servidor y cinco guardados; después revisá el APK y el almacenamiento para el inventario de datos, permisos y proveedores. Batería física y objetivo de 3 s en teléfono quedaron acordados para 17. Reutilizá las tres QA, conservá confirmación de email y despacho push público apagados. No repitas SQL ni Firebase y no publiques todavía.

Actualizar esta frase al cerrar cada sesión, según el estado y la etapa que corresponda. Si la sesión recibió sólo «etapa X», resolver el número desde este plan y el registro; no volver a analizar todo ni usar el orden histórico de PRs.

<a id="android-15-traspaso-2026-10-16"></a>

**16/10/2026 — ANDROID-15 cerrada — privacidad, eliminación, seguridad y contenido**

- **Estado:** 01–15 cerradas; próxima sesión exclusivamente **ANDROID-16**. [Inventario y aceptación de15](#android-etapa-15). Mínimo16, todos los países permitidos por Google sujetos a clasificación/mercados y restricciones mayores. El dueño atiende hola@trucazo.com.ar. Arte propio/generado con IA confirmado; baraja GNU CC BY-SA3.0, Geist OFL1.1, sonidos internos y avisos de dependencias identificados. Declaraciones preparadas para18, sin cargarlas. Sin publicación, commit/PR, SQL de esquema ni configuración Firebase nuevos en15.
- **Borrados reales:** contraseña desde APK, UUID `6de94fac-3662-438b-aae1-7c5281ad1dd6`: Auth/perfil/avatar/Historia/vínculo push retirados. Google desde URL pública existente, cuenta nueva **shakterx**, UUID `00e43baf-a9f9-4833-829c-b30f1acfdba1`: autorización, alta posterior, rol ordinario e identidad Auth/JWT verificados; el candidato acepta su OAuth reciente y el formulario público existente eliminó Auth/perfil, con cero trabajos pendientes. Su cuenta Google no fue eliminada. APK realmente sin red conservaba su copia; al reconectar pasó a login y guardado inactivo. Se probó ese ocultamiento antes de retirar sólo la fila descartable. Tokens anteriores reciben401 en Historia/push, no modifican preferencias ni renuevan sesión. Evidencias `android-15-deletion-real.json` y `android-15-google-{before,history,offline-state,web-deletion-real,after-reconnect,old-tokens}.json`. No recrear ni repetir borrado de esas cuentas.
- **Protección y restauración:** el primer Google real correspondía a **SantiBP**, administradora UUID `d1512143-e3c0-44c3-8f2c-8904197f5fdb`; no se eliminó. Perfil/rol y saldo985725/41077 intactos. APK final en lobby **QA3**, push propio consentido y logs detallados apagados. Cinco hashes/revisiones299/0/46/45/1 idénticos, cero pendientes y comprobantes5/0/1/1/0 (`android-15-preserved.json`). Servidor QA1 **1070/26**, QA2 **1030/23**, QA3 **370/0**, sin partidas nuevas. El comprobador de login QA3 dio un falso fallo al volver a Historia porque esperaba cabecera de lobby; abrir lobby confirmó la misma sesión y pasó. Chrome/TWA personales conservados; navegador temporal de borrado cerrado y perfil retirado; credenciales temporales retiradas/saneadas. OAuth vencido puede mostrar la sesión anterior de Chrome aunque el APK siga sin usuario: comprobar Auth dentro del APK y abrir Google como última acción antes del paso humano.
- **Artefacto y entorno:** debug **0.14.0/código14**, paquete `ar.com.trucazo.capacitor.dev`, SHA256 `23acc0d6bb57091999c86734fe33ebd02887c6641caced16c07550938a028493`; copia `android/artifacts/ANDROID-15/trucazo-capacitor-0.14.0-debug.apk`, firma conservada `586e7ea75f29108f3f1d85310d893d235cf22360ddc749d9f5e409724fa402a6`, API29/36. Programa/CSS/HTML/licencias instalados iguales al build; analítica natural nativa persistida en Postgres. Next15.5.28 en3000/PID17004, dist `android/generated/android-15-next-final`, build `53su4iwFit3103yw1WsAT`; no reconstruir esa carpeta con el servidor abierto. `emulator-5554`, reverse3000 y forward9224→WebView activo. Wi-Fi/datos restaurados. Para reconstruir este QA fijar **MOBILE_API_ORIGIN=http://localhost:3000**: el valor por defecto apunta a producción y no acepta estas API locales.
- **Seguridad:** inventario, backup/transferencia excluidos, FileProvider acotado y permisos justificados; sin cámara/micrófono/ubicación/contactos/lectura general de fotos. Cero líneas Bearer en logs finales; escaneo351 fuentes/64 evidencias sin credenciales privadas y APK170 entradas sin coincidencias. Auditorías de dependencias de ejecución raíz/móvil0; avisos de herramientas de desarrollo contextualizados en15. RLS/roles/manos privadas reales con3QA, contratos, identidad reciente, formularios aislados, PKCE, tipos, lint y construcciones aprobados; siete avisos web y dos de imágenes previos conservados. `android-15-final-state.json`, `android-15-artifact.json` y `android-15-close.json` guardan el cierre. Confirmación de email leída **apagada** al final; piloto QA y despacho público apagado comprobados al inicio y sin escrituras de configuración en15. Sin avisos push/campañas enviados.
- **Orden de entrega:** textos y API nuevos preparados y comprobados localmente; Google web usó la página pública **existente**, sin desplegar el candidato. Antes de distribuir el firmado, coordinar despliegue compatible y comprobar retornos HTTPS/dominio/paquete/certificados finales. No entregar el APK QA localhost como release. ABI/bibliotecas DataStore y16KB corresponden a16; aceptación del candidato firmado, **batería física y objetivo de3s en teléfono a17**; declaraciones en18. Se conserva el acuerdo de14 y no se empiezan estas etapas aquí.
- **Primer paso de16:** leer AGENTS/README, este traspaso y alcance16. Cargar `. ./scripts/android-env.ps1`; comprobar servidor/serial/reverse/forward, después `node apps/mobile/scripts/check-device-preserved.mjs` y `node apps/mobile/scripts/qa-accounts.mjs check`. Luego preparar identidad final, HTTPS y firma según16. Reutilizar las tres QA y proteger SantiBP/testin/santib, TWA/Chrome, claves y guardados. No repetir SQL/Firebase/borrados y no publicar todavía.

#### Frase para la sesión siguiente

> Comenzá ANDROID-16. 01–15 cerradas. Leé AGENTS.md, README.md y el último traspaso de15 del16/10 en docs/android.md. Primero comprobá servidor y cinco guardados; después prepará identidad final, HTTPS y firma del candidato según16. Reutilizá las tres QA y conservá confirmación de email y push público apagados. Batería física y objetivo de3s en teléfono siguen en17. No publiques todavía.

<a id="android-16-traspaso-2026-10-16"></a>

**16/10/2026 — ANDROID-16 cerrada — identidad, firma y candidato preparado**

- **Estado:** 01–16 cerradas; próxima sesión exclusivamente **ANDROID-17**. Dueño confirmó `ar.com.trucazo.app`, Trucazo, ícono actual y Android10 mínimo. [Construcción, pruebas y orden de servicios de16](#android-etapa-16). No se publicó ni se comenzó17.
- **Candidato:**0.16.1/código17, API29/36. [APK firmado](../android/artifacts/ANDROID-16/trucazo-0.16.1-release.apk), SHA256 `064091d7bf4ec030877d7d1e6cd196bbb385969cada4e344ae4db83cd4e38785`; [AAB firmado](../android/artifacts/ANDROID-16/trucazo-0.16.1-release.aab), SHA256 `5cc94e2e0f78ab49f7888fefd96337a8f9bed8ba3008a6fb21cab4fb79288dc0`. Árbol local sin commit, digest de fuentes `48fb795d82950263ce71ed51111ca3ab774b17dd61aa19bcd733553945029523`. Recursos locales/HTTPS real, sin debug ni secretos; APK y AAB/ELF64 alineados16KB. El número de código17 es una versión Android, no inicio de la etapa17.
- **Firma y recuperación:** firma de subida/local SHA256 `D0:B0:84:C2:71:3D:D3:79:01:84:D1:F2:D0:74:CB:E9:FA:C0:E9:D8:5A:FE:92:A3:02:B4:11:64:FA:07:28:30`. Clave/configuración privadas en `C:\Users\santy\Desktop\proyectos\trucazo-entorno\android-signing`, respaldo idéntico en `C:\Users\santy\Documents\Trucazo-respaldo-firma`. No regenerar para actualizar ni subir archivos privados a Git. La firma de Play se obtendrá/configurará en18. Comandos reproducibles e inventario en el capítulo de16.
- **Aplicado y preparado:** Firebase final registrado y SHA1/SHA256 de subida añadidos; cliente QA conservado. No se repitió SQL ni se cambió despacho. OAuth/puente web/assetlinks para el paquete final preparados y probados localmente; no desplegados. Workflow Capacitor separado preparado; entorno protegido/secretos GitHub aún no configurados ni ejecutados. Mantener los workflows web/SQL/TWA.
- **Aceptado en16:** instalación limpia0.16.0→actualización0.16.1 con misma firma conservó cuerpo exacto de partida/cola ficticias en SQLite; sin reverse3000, WebView debug ni logs detallados. Fixture y comprobador retirados. No acredita batería/teléfono, matriz integral ni Google/FCM real del paquete final. Son17; distribución y firma de Play,18. `android-16-release-inventory.json`, `android-16-update-release.json`, `android-16-close.json` y manifiesto de fuentes conservan evidencia.
- **Protegido al cerrar:** QA0.14.0/código14 en lobbyQA3, emulador5554, reverse3000 y forward9224 restaurados. Cinco guardados con los mismos hashes, revisiones299/0/46/45/1, pendientes0 y comprobantes5/0/1/1/0 (`android-16-preserved.json`). QA1 1070/26, QA2 1030/23, QA3 370/0, sin nuevas partidas/premios. Fotos históricas de SQLite conservadas. Chrome/TWA y cuentas personales intactos. Next3000/PID17004/dist `android/generated/android-15-next-final`, build `53su4iwFit3103yw1WsAT`, sigue activo: no reconstruir esa carpeta. Servidor de verificación3004 cerrado.
- **Primer paso de17:** cargar `. ./scripts/android-env.ps1`; comprobar3000, serial/reverse/forward, cinco guardados y tres QA como en el traspaso de15. Después revisar/coordinar el orden HTTPS de16: despliegue web/API compatible, variable pública de asociación final, retornos permitidos de `www` y asociación en ambos hosts. Hoy las API públicas nuevas/puente retornan404 y assetlinks200con`[]`; el candidato construido no demuestra que esos servicios estén publicados. Releer piloto/despacho con acceso vigente: token administrativo antiguo devuelve401, último control válido en15 y cero cambios en16. Confirmación de email releída apagada al cerrar16; SMTP intacto. No repetir SQL/Firebase/borrados. Luego ejecutar aceptación integral en teléfono, batería y lobby≤3s sobre el candidato firmado; no usar el QA localhost para certificarlo. No publicar en Play.

#### Frase para la sesión siguiente

> Comenzá ANDROID-17. 01–16 cerradas. Leé AGENTS.md, README.md y el último traspaso de16 del16/10 en docs/android.md. Primero comprobá servidor y cinco guardados; después revisá y coordiná los pasos HTTPS pendientes antes de aceptar el candidato firmado0.16.1. Reutilizá las tres QA; mantené confirmación de email y push público apagados. Incluí teléfono físico, batería y lobby≤3s. No publiques en Play.

**20/10/2026 — Ampliación documental del plan — compatibilidad de futuras actualizaciones**

- **Pedido del dueño:** incorporar en17 la política de versiones admitidas, prueba de app anterior contra servidor nuevo y actualización necesaria; en20, el procedimiento permanente para cambios compartidos entre web y Android.
- **Preparado:** [criterios obligatorios de17](#android-17-compatibilidad), dos recorridos de la matriz y [procedimiento de20](#android-20-actualizaciones). La protección de Historia de06 sigue vigente; conservar datos al actualizar no sustituye probar compatibilidad con servicios nuevos.
- **Estado:** sólo documentación; sin implementar controles, ejecutar pruebas de app/servidor, SQL, despliegues ni publicación. 01–16 siguen cerradas; 17 sigue pendiente. Retomar desde el traspaso de16 y cerrar también estos requisitos antes de aceptar el candidato.

<a id="android-17-traspaso-2026-10-27"></a>

**27/10/2026 — ANDROID-17 cerrada — aceptación del candidato firmado y HTTPS reales**

- **Punto de partida/cierre:**16 y su traspaso16/10, integración21/10 y compatibilidad añadida20/10 leídos. Servidor3000/QA14/cinco guardados comprobados antes y después; 17 cerrada con [acta y matriz](#android-17-acta-2026-10-27). Sin comenzar18.

- **Candidato:**0.17.4/código22 `ar.com.trucazo.app`, API29/36; [APK](../android/artifacts/ANDROID-17/trucazo-0.17.4-release.apk), SHA256 `6c0b3bd94d09b4fb6762b58efb5528083ee13464debd0f7208a18d1ad96d20b2`; [AAB](../android/artifacts/ANDROID-17/trucazo-0.17.4-release.aab), SHA256 `76bd7d0f6da3b9e67f4d7f831c0ff0170dc684f70c6876975555f624cb508c4c`. Firma pública de16 conservada, clave privada intacta fueraGit. Fuente `fbf98fc`, CI aprobado, PR145 borrador/sin merge. Documentación operativa actualizada localmente; no volver a subirla completa por el rechazo previo de revisión automática.

- **Servidor aplicado:**migraciones nuevas `20261027005516_android_version_compatibility.sql` y `20261027013911_android_compatibility_service_role.sql`, corridas por dueño y verificadas. Política mínima17/sin reemplazo/retirada; contratos `trucazo-online-v1`, `historia-local-v1`, `historia-bots-v1`. Despliegue productivo autorizado `575bedc`, `dpl_ErPCi4JTe2sbtARPB5CgSiaR2ZB3`, SãoPaulo. Cuatro retornosWWW conservando siete previos, huella pública, FirebaseJSONSecret/paquete final y flags depreview aplicados. No repetir ni mostrar secretos.575 es base de rollback Android compatible; versión anterior16b1bda carece de estasAPI.

- **Pruebas:** Redmi14C/Android16/WebView155:Google/recuperación/borrado22, Historia offline frío22, lobby22≤3s; batería19 aceptada con alcance acotado. PushFCM20 recibido/tocado, app/web1v1 y parejas/sistema20. APK17 original con servicios nuevos y actualización17/20→22 conservando bytes en emuladores11/16; respuesta perdida y premio único, comunidad/perfil/economía. Torneos/moderación/retirada y variantes porUI/SQLaislados; alcances explícitos enacta. Nada instalado porPlay ni firmaPlay comprobada.

- **Datos protegidos:**cinco originales `android-17-preserved-final22.json` idénticos a16; tresQA vivas, saldos860/28,1120/23,370/30. DescartableGoogle nueva creada/recuperada/borrada con autorización; Auth/perfil/cola0, tokens inválidos, guardadoQA1 intacto. Teléfono22 en lobbyQA1, emuladores22, QA14 separado. Emailconfirmationfalse, `pilot=true`, `dispatch_enabled=false`; no cuentas personales, claves, APK/AAB, sesiones ni guardados enGit.

- **Primer paso de18:** leer esta acta y comprobar3000, cinco originales por lectura, QA y hashes22; revisar estado real dePlayConsole/titularidad/paquete antes de coordinar canal interno. RevalidarGoogle/AppLinks/push/offline/actualización con firmaPlay después de obtenerla. Conservar la firma de subida y contratos anteriores; no elevarmínima ni publicarproducción por rutina.

#### Frase para la sesión siguiente

> Comenzá ANDROID-18. 01–17 cerradas. Leé AGENTS.md, README.md y el último traspaso de17 del27/10 en docs/android.md. Primero comprobá servidor, cinco guardados, tresQA y candidato firmado0.17.4/código22; después revisá PlayConsole y coordiná el canal interno. Conservá email y push público apagados, firma y contratos compatibles; no publiques en producciónPlay.


## Decisiones de partida e historial Android

Los registros siguientes conservan decisiones, pruebas y planes anteriores con sus fechas. Sus estados iniciales y pendientes no reemplazan la tabla vigente ni el último traspaso.

<a id="capacitor"></a>

### Capacitor: decisión y pasos para empezar — 11/10/2026

**Decisión aceptada:** después de comparar dependencias y contras, el dueño pidió dejar todo preparado en esta guía para empezar con Capacitor. El camino elegido es una prueba de Android con las pantallas y recursos incluidos en la app, reutilizando la interfaz web. Su adopción para lanzamiento se confirma con una prueba instalada completa. **Estado de esta entrega: planificación y continuidad; no se instalaron paquetes, no se creó el proyecto Capacitor ni se construyó otro APK.** Esta decisión reemplaza a TWA como próximo trabajo. No volver a pedirle que elija una herramienta ni dedicar la próxima sesión a quitar las barras del prototipo TWA. Para ejecutar por sesiones usar [ANDROID-01 a ANDROID-20](#android-etapas-finales); este capítulo explica el punto de partida.

<details>
<summary>Ver contenido completo: retoma para Capacitor</summary>

#### Qué debe cumplir

- Abrir desde el ícono de **Trucazo** y mantener las pantallas del juego dentro de la app. Conservar mapa, lobby, mesa, cartas, tipografía, cosméticos, sonidos, controles y navegación de la web; no crear otro tema ni un menú de demostración como interfaz final.
- Jugar online en las mismas mesas y con las mismas cuentas, progreso y monedas. Las reglas online y los premios continúan bajo autoridad del servidor SQL, con `game_hands` privado y fuera de Realtime.
- Descargar/preparar Historia una vez con internet y una cuenta registrada; después jugar los 66 rivales, cerrar/retomar y sincronizar sin duplicados. Antes de esa preparación, mostrar la necesidad de conectar; no inventar una cuenta o progreso offline.
- Funcionar sin la aplicación Chrome en Android modernos, usando **WebView**, el componente de Android que muestra la interfaz dentro de la app. El acceso con Google puede requerir una pantalla externa de identificación o una integración nativa; esto se resuelve y explica aparte del funcionamiento del juego.
- Conservar cuenta obligatoria en Android, invitados en la web, campañas sin chat escrito y reglas actuales de chat online. Push sigue incluida en el lanzamiento y el jugador puede denegar su permiso.

#### Punto de partida que ya funciona

| Trabajo existente | Archivos o evidencia que se aprovechan |
| --- | --- |
| Mapa y mesa con el diseño real | `src/components/historia/HistoriaScreen.tsx`, `src/components/game/GameTable.tsx`, `FinishScreen.tsx`, `useGameAnnouncements.ts`, estilos y recursos de `public/`. |
| Historia offline | `src/offline-campaign/`, `src/lib/offline-campaign/` y `src/lib/offline-trial/`. Modelo y motor se reutilizan; transporte, entrada y almacenamiento se adaptan al entorno instalado. |
| Construcción de recursos | `scripts/build-offline-campaign.ts`: catálogo contrastado con SQL, hashes y 147 archivos, 5.961.571 bytes en el último paquete. `public/android/historia/` es generado; cambiar las fuentes y reconstruir. |
| API y reglas oficiales | `src/app/api/android/historia/route.ts`; RPC `prepare_offline_campaign` y `sync_offline_campaign`; validador privado `offline_replay_v1`, comprobantes únicos y reglas congeladas de la versión actual. |
| SQL ya aplicado | El dueño confirmó Success para `20261011092658_offline_campaign_export.sql` y `20261011123215_offline_campaign_sync.sql`. Se usaron con una cuenta real. No repetirlos ni editar estos archivos aplicados. |
| Juego online | `src/app/lobby/LobbyClient.tsx`, `src/app/game/[id]/GameClient.tsx`, cliente Supabase/RPC/Realtime y páginas servidor correspondientes. La presentación compartida no equivale por sí sola a haber portado sus consultas, navegación y controladores. |
| Pruebas de reglas y recuperación | `scripts/check-offline-trial*`, `check-offline-campaign*`, `check-offline-sync*`, pruebas Android/web existentes y comparaciones visuales. No repetir toda la batería por rutina; ejecutar las relevantes según lo cambiado. |
| Ensayo real anterior | Cuenta de prueba **testin**, ingreso personal, primera victoria 16–8 y derrota 12–16, recuperación tras cierre nativo en modo avión, corte de respuesta y reenvíos. Supabase confirmó un premio de 50 monedas y 22 puntos, saldo final 1.010/22. En esa comprobación quedaron cero pendientes; releer el estado real antes de otra prueba. |

La evidencia del ensayo está en `android/generated/ensayo-real-android.json`, `ensayo-real-reintento-android.json`, `ensayo-real-online.json` y capturas, **fuera de Git**. El repositorio tiene muchos cambios locales y archivos nuevos de las entregas anteriores: revisar `git status`, conservarlos y no iniciar con reset/clean ni reconstruir Historia desde cero. No asumir que todo este desarrollo ya está en GitHub o desplegado.

#### Entorno y primer control técnico

Proyecto: `C:\Users\santy\Desktop\proyectos\trucazo`. Herramientas existentes: `C:\Users\santy\Desktop\proyectos\trucazo-entorno`; su `entorno-trucazo.ps1` configura Node, Java, SDK y adb. Comprobado al preparar esta nota: **Node 24.16.0, JDK 17.0.20.1, SDK Platform 36 y Android 11 `emulator-5580`**. El visor scrcpy muestra la ventana Trucazo; no repetir BIOS, borrar datos o reinstalar el emulador por rutina.

**Hallazgo inicial del 11/10, resuelto en ANDROID-01 el 12/10:** `adb shell dumpsys webviewupdate` informaba **Android System WebView 83.0.4103.106**. Chrome se había actualizado a 124, pero eso no actualizó WebView. El proveedor ahora es **133.0.6943.137**, oficial, con firma/dependencia verificadas y prueba real de `dvh`/APIs/IndexedDB; consultar [entorno y evidencia de 01](#android-01-inventario). No volver a instalar 83 ni juzgar el diseño con ese proveedor viejo. Al probar el APK con Chrome deshabilitado en 02, restaurar después su estado anterior y comprobar que la web sigue accesible.

Consultar versiones oficiales al empezar y fijar las seleccionadas con lockfile. La documentación consultada presenta Capacitor 8 con Node 22+, Android Studio 2025.2.1+, compilación/objetivo API 36 y un proyecto Gradle distinto del generado por Bubblewrap. Comprobar el JDK y las herramientas que requiere la versión concreta, sin asumir que el JDK del prototipo anterior basta ni cambiar globalmente su entorno. El Android 11 actual sirve para la primera prueba. Capacitor distingue Android 7–9, donde Chrome puede proveer WebView, de Android 10+, donde usa Android System WebView: definir y probar el mínimo final antes de prometer independencia de Chrome en todos los teléfonos. La prueba inicial apunta a Android 10+; no se aprobó aún una exclusión definitiva de versiones anteriores. [Entorno Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup), [actualización 8](https://capacitorjs.com/docs/updating/8-0), [compatibilidad Android](https://capacitorjs.com/docs/android).

Para verificar el entorno al retomar, el agente puede usar PowerShell desde el proyecto:

```powershell
. 'C:/Users/santy/Desktop/proyectos/trucazo-entorno/entorno-trucazo.ps1'
node --version
java -version
& "$env:ANDROID_HOME/platform-tools/adb.exe" devices
& "$env:ANDROID_HOME/platform-tools/adb.exe" -s emulator-5580 shell dumpsys webviewupdate
```

El servidor de desarrollo anterior usó `node scripts/dev.mjs --hostname 127.0.0.1 --port 3000`, la configuración privada `.env.local` y `adb reverse tcp:3000 tcp:3000`. Comprobar si sigue activo antes de iniciarlo de nuevo. `localhost:3000` sirvió para Chrome; **no es la dirección de publicación ni el servidor local de archivos de Capacitor**. Quitar el puente adb también al probar una caída total de red en la nueva app.

#### Separación mínima de la app y la web

Estructura adoptada en **ANDROID-02, 12/10**: **`apps/mobile/`**, con paquete/configuración/lockfile de Capacitor y su proyecto nativo en `apps/mobile/android/`. La interfaz se genera en `apps/mobile/dist/`, fuera de Git. `android/` conserva el prototipo TWA, su generación, certificados y pruebas. El identificador provisional `ar.com.trucazo.capacitor.dev` permite instalar ambos prototipos sin reemplazar datos. El identificador definitivo para Play, incluido `ar.com.trucazo.app`, continúa sin confirmar.

Construir una entrada React local y archivos estáticos para `webDir`, reutilizando el compilador y componentes existentes cuando resulte simple. Next.js 14 sigue atendiendo la web y sus servicios en el servidor: no convertir toda la web a exportación estática para obtener un APK. Sus páginas con cookies, middleware, rutas dinámicas y peticiones autenticadas no se pueden copiar directamente dentro de Capacitor. Adaptar sólo los puntos necesarios: navegación/`next/link`, `next/navigation`, imágenes/recursos, creación de cliente, consultas iniciales y llamadas al servidor. No montar una abstracción general para plataformas futuras.

La interfaz empaquetada debe arrancar sin contactar al sitio para cargar su HTML. `server.url` sirve para desarrollo según Capacitor; no usarla como solución de producción ni dar por completada la migración por abrir la web en un WebView. El mapa y la mesa siguen siendo compartidos entre web y app. [Configuración Capacitor](https://capacitorjs.com/docs/config), [límites de exportación Next.js](https://nextjs.org/docs/app/guides/static-exports).

#### Acceso, datos y guardado que se deben adaptar

**Sesión:** el cliente web usa `@supabase/ssr`, y servidor/middleware/callback leen cookies. La nueva app tiene almacenamiento propio, no hereda automáticamente el login de Chrome. Empezar con la cuenta de prueba existente; el dueño ingresa personalmente y no se piden contraseñas por chat. Preparar un cliente y persistencia de sesión adecuados al entorno nativo, conservar autorización por usuario en RPC/RLS y adaptar las API necesarias para validar esa sesión sin romper las cookies de la web. Mantener claves privilegiadas y validación de premios en el servidor. Elegir el transporte concreto al implementar, aprovechando los RPC actuales en lugar de duplicar lógica SQL.

**Direcciones y conexión:** la interfaz de Capacitor tiene un origen local propio, distinto de `www.trucazo.com.ar` y del servidor de desarrollo en el puerto 3000. Definir direcciones explícitas de los servicios remotos y verificar los permisos para consultar desde ese origen (CORS), autenticación y conexiones Realtime. La API actual de Historia usa el cliente servidor con cookies; no asumir que acepta el token de la nueva app sin adaptarla y comprobarlo. Preferir HTTPS y no habilitar accesos generales ni eludir la validación del usuario para resolver una prueba.

**Google y enlaces:** configurar el regreso a la app y manejar apertura en frío/en caliente, recuperación de contraseña y enlaces válidos de partidas/torneos. Verificar la documentación vigente de Supabase/Google; no incrustar el formulario de Google en un WebView no admitido ni prometer que ningún acceso mostrará una pantalla externa. Cualquier cambio de URL permitida o configuración se documenta con pasos exactos para el dueño cuando haga falta. El callback web existente se conserva para la web. [Acceso móvil Supabase](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

**Preparación offline:** incluir los recursos de la interfaz en el APK y reutilizar la descarga autenticada de catálogo/perfil/avance/autorización. Validar compatibilidad de catálogo, motor y hashes antes de reemplazar un paquete; cachear la foto propia por cuenta. La preparación sigue necesitando internet. Reemplazar la dependencia de mensajes del service worker, `Cache Storage` y URLs relativas al sitio por el mecanismo local que use la app; el worker actual conserva su función para la web/PWA.

**Partidas:** decidir y comprobar almacenamiento durable dentro de la app; evaluar IndexedDB en WebView o almacenamiento nativo transaccional sin dar ninguno por certificado. Mantener el mismo `Campaign`/`Trial`, revisión y comprobantes; confirmar el guardado antes de avanzar la jugada, conservar pendientes si falla espacio/escritura y cerrar/retomar sin repetir bots. Guardado y sesión son datos distintos. Un cierre de sesión oculta los registros de su dueño; cambiar de cuenta no los mezcla ni los borra. Una sesión vencida por falta de red no impide continuar la campaña ya preparada.

**Sincronización y actualizaciones:** reutilizar los registros inmutables, referencia de descarga/semilla, secuencia, dependencias, versión, validación SQL y comprobantes únicos. Conservar la cola hasta confirmar y guardar todo; probar respuesta perdida y reintentos en el nuevo transporte. Actualizar el APK no debe descartar una partida abierta, el motor que necesita para terminar ni los pendientes de versiones anteriores. Los datos locales de Chrome y de Capacitor no se consideran intercambiables: para el primer ensayo, comprobar/sincronizar primero los pendientes anteriores y descargar de nuevo con la misma cuenta; no borrar ni copiar a ciegas su base local. [Almacenamiento Capacitor](https://capacitorjs.com/docs/guides/storage).

#### Hitos de la primera prueba y verificación

Estos seis hitos describen el objetivo técnico inicial. El orden de trabajo por sesiones, los límites y las condiciones de cierre están en [ANDROID-01 a ANDROID-20](#android-etapas-finales); usar esos identificadores al implementar. La primera prueba jugable corresponde a las etapas 01–06 y no completa por sí sola el lanzamiento.

| Paso | Entrega concreta | Verificación necesaria |
| --- | --- | --- |
| 1. Entorno y arranque | WebView compatible, proyecto separado, dependencias fijadas, APK debug provisional con recursos locales. | Instalar y abrir desde su ícono con Chrome deshabilitado; sin barra de direcciones, sin `server.url` para el arranque y con interfaz visible aun sin red. Una pantalla de conexión previa a preparar la cuenta es válida; un contador ficticio no certifica Historia. |
| 2. Cuenta y lobby | Acceso de cuenta existente, sesión propia y lobby con el diseño compartido y datos reales. | Ingresar, cerrar/abrir, renovar sesión, salir/cambiar cuenta; mantener invitados web. Comprobar Google y retorno aparte, sin exigir cuenta administradora para jugar. |
| 3. Juego online | Entrada a una mesa, datos iniciales, llamadas RPC, mano propia, Realtime, controles y recuperación. | Completar un 1v1 contra bot y una regresión con jugadores web cuando estén disponibles; reglas/puntajes del servidor, privacidad de manos, regreso de suspensión y mesa completa sin scroll. Expandir luego la regresión de parejas/torneos. |
| 4. Historia instalada | Preparación autenticada, mapa real, Tobías y motor de los 66 rivales con guardado durable. | Modo avión y puente adb quitado; cierre forzado durante carta/canto/respuesta, vuelta desde ícono y reinicio; recuperar el estado exacto sin repetir acciones. Completar victoria/derrota y después 15/30 puntos, desbloqueos y revancha. |
| 5. Premios y versiones | Cola y transporte reales hacia el validador SQL vigente; actualización conservando el guardado. | Perder respuesta después de aceptar, reenviar el mismo registro, verificar un solo premio/comprobante y saldo/progreso/estilo oficiales; mezclar online/offline, dos dispositivos y actualización del APK con una partida y pendientes. |
| 6. Viabilidad completa | Google/enlaces, Atrás, teclado, barras del sistema, audio, notificación real, resto de pantallas y prueba física cuando haya teléfono. | Flujo completo instalado, paridad visual web/app y partida en una pantalla también durante los cantos. Registrar versiones, artefacto, firma, pasos y límites. Emulador no certifica rendimiento o suspensión de un teléfono físico. |

**Primera entrega que se busca al retomar:** un APK Capacitor instalado y probado con cuenta real, lobby, un duelo online y Tobías offline que cierra/retoma y confirma premios. Se puede construir en los pasos anteriores, pero no dar esa prueba por completa con sólo compilar o abrir una pantalla. Si una parte falla, registrar la causa y corregir antes de adoptar el empaquetado para lanzamiento. El agente hace la preparación técnica; al dueño se le dan sólo pasos personales concretos cuando sean necesarios.

#### Push y publicación siguen abiertos

Capacitor necesita su integración nativa de notificaciones; la prueba Web Push/VAPID del prototipo anterior no certifica ese camino. En Android el plugin oficial usa FCM: revisar proyecto/configuración Firebase para el identificador provisional y luego el definitivo, permiso, token por usuario/dispositivo, baja/cambio de cuenta y apertura al destino. Ver una notificación real con app abierta/cerrada; un envío aceptado no demuestra recepción. Denegar el permiso debe permitir jugar. Los eventos concretos y su frecuencia siguen pendientes de acordar; no activar promociones nuevas. [Plugin de notificaciones](https://capacitorjs.com/docs/apis/push-notifications).

Después de validar la arquitectura, completar todas las pantallas y regresiones, privacidad/moderación, eliminación de cuenta ya implementada, enlaces, ficha, firma y canal de pruebas de Play. Siguen pendientes Play Console, identificador definitivo, soporte atendido, edad mínima/público y detalle de push. No rehacer eliminación ni reiniciar progreso por cambiar el contenedor. iOS no forma parte de esta primera prueba Android. Verificar requisitos vigentes de Play al publicar; este plan no publica, no cambia configuración productiva ni autoriza subir un AAB por sí solo.

#### Texto para retomar

> Retomemos Trucazo con Capacitor. El proyecto está en C:\Users\santy\Desktop\proyectos\trucazo. Leé AGENTS.md, este capítulo y el plan Android por sesiones de docs/android.md. Consultá la tabla de ANDROID-01 a ANDROID-20 y los traspasos; empezá por la primera etapa pendiente, hoy ANDROID-06, y respetá su alcance y cierre. Quiero la app idéntica a la página, instalable desde su ícono y sin depender de la aplicación Chrome en Android modernos. Aprovechá mapa, mesa, motor offline de 66 rivales, guardado, API y validador SQL ya implementados. Las dos migraciones de Historia ya se aplicaron y el ensayo real con testin confirmó cierre/retoma, premios y reintentos sin duplicados; no lo rehagas desde cero. Conservá funcionamiento web, cuentas, monedas, manos privadas y reglas SQL. Trabajá localmente, respetá los cambios existentes, explicame en español simple y actualizá estado y traspaso en docs/android.md. No publiques todavía ni me pidas contraseñas.

</details>

<a id="plan-android"></a>

### Plan, decisiones, pruebas e Historia sin internet

Plan actualizado al 15/10/2026 con ANDROID-01 a ANDROID-13 cerradas, después del ensayo autenticado de Historia, el primer APK [Capacitor](#android-02-apk), la [aceptación real de sesión/servicios](#android-03-sesion), el [guardado/Historia propios del APK](#android-04-guardado), el [1v1 app↔web/bots](#android-05-online), la [sincronización/concurrencia real](#android-06-cierre), el [acceso/enlaces de 07](#android-07-acceso), [perfil/economía de 08](#android-08-perfil), [parejas de 09](#android-09-parejas), [torneos/espectador de 10](#android-10-torneos), [comunidad/soporte/rutas de 11](#android-11-comunidad), [denuncias/bloqueos de 12](#android-etapa-12) y [notificaciones nativas de 13](#android-etapa-13). La ejecución vigente por sesiones está en [ANDROID-01 a ANDROID-20](#android-etapas-finales), próxima 14. Distinguir entregas integradas, pruebas del equipo anterior y propuestas que todavía requieren desarrollo; la arquitectura TWA que se describe como candidata en entregas anteriores es historial.

Procedencia anterior: `docs/trucazo-play-store-plan.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan, decisiones, pruebas e Historia sin internet</summary>

<a id="plan-android-trucazo-en-google-play-revision-y-plan-propuesto"></a>

### Trucazo en Google Play — revisión y plan propuesto

Revisión original: 28 de septiembre de 2026. Última actualización del plan: 10 de octubre de 2026.

Repositorio de referencia: `santibpapa/trucazo`, rama `master`. La revisión original corresponde al commit `1138de8f29248960a80d5796d01122467866257d`, con el PR #96 integrado; no representa necesariamente el estado actual.

Estado: **implementación iniciada el 09/10/2026 por pedido del dueño**. La base web PR 1A ya está integrada en el [PR #106](https://github.com/santibpapa/trucazo/pull/106), merge `250acfa`. La segunda entrega prepara el prototipo Android PR 1B desde ese `master`; la elección de arquitectura sigue pendiente de pruebas instaladas. **La eliminación de cuentas (PR 4 del plan) ya está integrada en el PR #101**, commit `953ea31`, merge `1be62d2`: no repetir desarrollo ni SQL. No se verificó producción, Play Console ni un APK en teléfono.

<a id="plan-android-ejecucion-iniciada-09102026"></a>

#### Ejecución iniciada — 09/10/2026

<a id="plan-android-primera-entrega-pr-1a-base-web-de-arranque-sin-conexion"></a>

##### Primera entrega: PR 1A — Base web de arranque sin conexión

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

<a id="plan-android-segunda-entrega-pr-1b-prototipo-android-y-prueba-local"></a>

##### Segunda entrega: PR 1B — Prototipo Android y prueba local

**PR de GitHub:** [#108 — Play Store 1B: prototipo Android con cuenta, guardado local y prueba push](https://github.com/santibpapa/trucazo/pull/108). Implementación `074ada7`, rama `codex/android-twa-prototype`, a partir de `250acfa`. Integrado en `master` como merge `978b166`, confirmado al actualizar la copia local el 09/10/2026. Despliegue completo y matriz de funcionamiento en Android todavía pendientes. **No dar por cerrada la viabilidad TWA hasta completar las pruebas en Android físico.** Instrucciones completas, configuración y matriz de aceptación: [[Construcción del APK y pruebas Android](#construir-android)](#construir-android).

**Alcance implementado:** generación reproducible con Bubblewrap Core 1.27.0 y lockfile separado; APK debug y AAB sin firma de publicación; entrada `/android` validada en servidor con cuenta registrada; destino de contraseña/Google y contexto Android por pestaña, conservando invitados web; ruta de asociación `/.well-known/assetlinks.json`; prueba local optativa de administración con IndexedDB, preparación completa y reapertura offline; permiso/suscripción/baja y envío de una notificación real de prueba desde servidor a FCM. Suscripciones no guardadas en el backend y sin eventos de torneos ni campañas promocionales.

**Identificador:** `ar.com.trucazo.prototype` es provisional. El dueño pidió explicar el identificador antes de decidir; la propuesta `ar.com.trucazo.app` **no se consideró aprobada**. El paquete de prueba permite continuar sin fijar el identificador de publicación.

**Separación del alcance:** el contador local es ficticio y no modifica progreso ni recompensas. No se portó el motor, no se descargan rivales para jugar offline y no se sincronizan resultados. Campaña sin chat escrito; motor/UI de partidas online sin cambios. PR 2/3 siguen pendientes para recuperación de contraseña, correos/enlaces externos, destinos de torneo/partida, suspensión y navegación completos. La eliminación existente se conserva.

**Herramientas y compatibilidad:** Gradle 8.11.1, plugin Android 8.9.1 y Android Browser Helper 2.7.4 del generador fijado; API objetivo/compilación 36 y mínimo API 24, por requisito de la biblioteca actual. Se conserva el icono del repo; su recorte instalado todavía debe comprobarse. El origen de apertura configurado es **`https://www.trucazo.com.ar`**: asociar ese origen, no asumir que asociar solo el dominio sin www alcanza.

**Construcción Android ejecutada en esta sesión:** `assembleDebug bundleRelease` terminó con `BUILD SUCCESSFUL`; APK debug y AAB generados. `apksigner verify --print-certs` comprobó la firma debug real; `aapt dump badging` verificó paquete provisional, versión `0.1.0`/código 1, mínimo 24, objetivo 36 y `POST_NOTIFICATIONS`. `certificate.mjs` extrajo la huella del certificado usado. SDK y JDK completo se prepararon localmente; se reparó un archivo incompleto del JDK descargado antes de la compilación final. Esto demuestra construcción/firma, no instalación ni recepción de notificaciones.

**Validaciones de esta entrega:** 8 pruebas de base PWA y 4 pruebas de Android (asociación, rechazo de URLs arbitrarias de push, contexto por pestaña y worker/notificación); TypeScript, lint y build de Next con claves ficticias; versiones markdown; navegador Chromium 153 para preparación interrumpida/completa, guardado del contador, cierre del proceso, reapertura desde `/android` offline y cambio de identidad ficticia. La prueba de navegador usa una API de identidad simulada, no credenciales reales. El build real de Next se comprueba además sin sesión para entrada sin invitado, web independiente, registro, callback y rechazos de API. La instalación estándar de Chromium volvió a fallar en este entorno; se usó `PWA_BROWSER_EXECUTABLE` con un ejecutable disponible. Lint mantiene los avisos preexistentes de GameClient/LobbyClient.

**Pendiente para cerrar PR 1 / arquitectura:** instalar el APK en Android, comprobar dominio/firma sin barra del navegador, contraseña y Google reales, reapertura tras reiniciar teléfono, almacenamiento y permisos, notificación visible con app abierta/cerrada y su destino, cambio/salida de cuenta. Un envío aceptado por FCM no se registra como recepción. No se creó cuenta de Play ni se subió ningún paquete. La arquitectura sigue candidata.

**SQL:** ninguno. **Configuración externa pendiente:** después de integrar y desplegar, `ANDROID_SHA256_FINGERPRINTS` con la huella real del APK que se va a instalar; para push de prueba, `ANDROID_PROBE_VAPID_PUBLIC_KEY`, `ANDROID_PROBE_VAPID_PRIVATE_KEY` y `ANDROID_PROBE_VAPID_SUBJECT`. No se configuraron certificados ni claves en producción por esta sesión. Los pasos para obtenerlos están en [Construcción del APK y pruebas Android](#construir-android). Los certificados debug de GitHub pueden cambiar entre construcciones; no son los de Play App Signing.

**Retoma de aquella entrega (09/10, histórica):** revisar el PR 1B/merge actual, completar la matriz física de [Construcción del APK y pruebas Android](#construir-android) y registrar resultados. Si TWA satisface las pruebas, continuar con el motor local y bots sobre las reglas actuales, diseñando a la vez el contrato de sincronización. Si falla la prueba de arquitectura, reevaluar Capacitor con el caso observado antes de fijar el paquete definitivo. La retoma vigente del 11/10 está en [Capacitor](#capacitor).

<a id="plan-android-prueba-en-windows-local-09102026"></a>

##### Prueba en Windows local — 09/10/2026

Por pedido del dueño, se inició la prueba desde la carpeta local actualizada a `978b166`. Se instalaron las dependencias Android fijadas, Java 17 portable, SDK Platform 36 y Build Tools 35.0.0; se generó el proyecto con la configuración existente, sin editar fuentes generadas ni cambiar el identificador provisional.

- `assembleDebug --no-daemon`: **BUILD SUCCESSFUL**, 31 tareas, 7 min 42 s. APK en `android/generated/app/build/outputs/apk/debug/app-debug.apk`, 6.034.334 bytes; SHA-256 `19F55B18ACF22D96E1336DD0D1FB69611D1593B196F1CE1F527910E1B0891EFF`.
- `certificate.mjs`: firma del APK verificada, asociación guardada en `android/artifacts/assetlinks-debug.json`. Huella debug local: `D4:56:DC:6E:B3:5B:F9:10:9A:14:69:36:94:C5:6B:55:3B:B8:C2:DD:1D:6D:5B:35:1F:26:A5:DB:BB:E9:6A:E4`. Es pública; el keystore privado queda fuera de Git.
- `aapt dump badging`: paquete `ar.com.trucazo.prototype`, versión `0.1.0`/código 1, mínimo API 24, objetivo/compilación API 36 y permiso `POST_NOTIFICATIONS`.
- El emulador existente `Medium_Phone_API_37.0` no arrancó: virtualización del firmware desactivada y aceleración no disponible. El dueño eligió habilitar el emulador. Windows Hypervisor Platform se habilitó con permiso de administrador y sin reinicio automático. Falta activar Virtualization Technology en el BIOS de la HP y reiniciar; luego repetir `emulator -accel-check`, arrancar, instalar y probar. No se modificaron opciones de firmware.
- Comprobación pública puntual del sitio: `/android` responde HTTP 200; `/.well-known/assetlinks.json` responde HTTP 200 con `[]`. Falta configurar la asociación real del APK. No se modificó Vercel, no se desplegó, no se aplicó SQL y no se subió a Play.

**Resultado:** APK construido y firma/metadatos comprobados. **Instalación, acceso real, guardado offline, reinicio, recepción push y viabilidad TWA siguen sin verificar.** El build de esta prueba solo generó el APK debug; el AAB de publicación no se construyó.

<a id="plan-android-continuacion-de-la-prueba-local-10102026"></a>

##### Continuación de la prueba local — 10/10/2026

- El dueño activó Virtualization Technology. WHPX 10.0.19045 está instalado y utilizable; el bloqueo de virtualización está resuelto.
- El mismo APK debug local se instaló con resultado Success en Android 17/API 37 (Chrome 145.0.7632.218), Android 15/API 35 (Chrome 124.0.6367.219) y Android 11/API 30.
- Android 17 mostró ANR de Google Play Services, System UI, Chrome y Process system. Su navegador llegó al acceso Android, pero la pantalla no quedó operativa. Android 15 con gráficos host también mostró ANR del lanzador y del sistema; Windows alcanzó 100 % de CPU.
- Android Emulator 37.2.12 con ventana informó fallo al cargar opengl32sw. Android 15 sin ventana, con SwiftShader y Vulkan desactivado, arrancó en 89,7 s; persistieron ANR de System UI y problemas de dibujo/captura. No registrar ese intento como estable.
- Se preparó scrcpy 5.0.1 desde su repositorio oficial, con SHA-256 verificado. Su visor Direct3D inició, pero informó un error de captura/codificación. No se usó para introducir credenciales. [Documentación del visor](https://github.com/Genymobile/scrcpy).
- Se instaló la imagen oficial Android 11/API 30, Google Play x86_64, revisión 10. AVD Trucazo_Android_11: pantalla 720×1280, densidad 320, dos núcleos y 2048 MB, gráficos host y Vulkan desactivado. Un aviso de crash pendiente de Android 15 demoró el primer arranque; el siguiente arranque completo tardó 65,6 s.
- Android 11 permitió abrir y enfocar el formulario en https://www.trucazo.com.ar/login?android=1. El dueño inició sesión y confirmó acceso; se observó el lobby y la campaña. CPU en reposo medida en 25–31 %, con un pico de 100 % al abrir el teclado. Esto no demuestra estabilidad prolongada.
- La imagen Android 11 trae Chrome 83.0.4103.106: el mapa quedó recortado con ese navegador. El código usa dvh, disponible desde Chrome 108; este caso exige actualizar el navegador antes de evaluar el diseño actual. [Unidades de pantalla en Chrome](https://developer.chrome.com/blog/new-in-chrome-108).
- Se recuperaron Chrome 124.0.6367.219 y su TrichromeLibrary de la imagen oficial Android 15 ya instalada. Se verificaron sus firmas y mínimo API 29, compatible con Android 11. Ambas instalaciones finalizaron con Success, manteniendo el paquete y sin borrar datos. Tras actualizar, Chrome volvió a solicitar acceso; no registrar la sesión anterior como conservada.
- Se volvió a verificar https://www.trucazo.com.ar/.well-known/assetlinks.json: HTTP 200 con []. La asociación de la huella real sigue pendiente y se observa la barra de Chrome. El APK abre la web publicada aunque el código y la construcción se trabajen localmente.

- Durante la prueba de cierre/reapertura con gráficos host, Windows registró APPCRASH de qemu-system-x86_64.exe en atio6axx.dll (controlador AMD), código c0000005, el 10/10 a las 12:50:56. La partida de prueba quedó interrumpida por ese fallo del entorno.
- Android 11 se reinició con SwiftShader, sin ventana del emulador y a 30 Hz; arrancó en 48,1 s. Se abrió scrcpy con Direct3D, H264/OMX.google.h264.encoder, 720×1280, 15 fps, sin audio ni sincronización automática del portapapeles. El visor inició sin el error de codificación de Android 15 y su ventana se llama Trucazo.
- Tras ese reinicio, la entrada Android reconoció la cuenta sin pedir otro acceso. Al entrar se recuperó la pantalla de la partida: terminó por inactividad durante la desconexión, 1–2. Se volvió al modo Historia. Esto comprueba conservación de cuenta y recuperación online de la pantalla tras el reinicio; no guardado local ni una partida completa a 15 puntos.
- Se observó CPU alta durante el arranque/carga por software. La prueba funcional básica no certifica estabilidad prolongada ni rendimiento final.

**Estado:** instalación, acceso, navegación de campaña, reparto, jugada de carta, respuesta del bot, canto de Truco y conservación de cuenta tras reinicio comprobados en Android 11/Chrome 124. El prototipo queda abierto en la ventana Trucazo. El dueño confirmó que ve el mapa y que tocar Buenos Aires abre sus rivales; visor e interacción comprobados por el dueño. Faltan Google OAuth, partida completa, asociación del certificado, guardado/reapertura offline, recepción push y matriz completa de viabilidad TWA. No se modificó Vercel, no se desplegó, no se aplicó SQL ni se publicó en Play. El dueño confirmó que no dispone de Android físico/USB; continuar las pruebas en esta PC.

<a id="plan-android-evidencia-del-codigo-actual-y-orden-actualizado"></a>

##### Evidencia del código actual y orden actualizado

| Área | Evidencia al 09/10 | Consecuencia |
| --- | --- | --- |
| Motor y bots | `play_card`, `bot_step`, `start_campaign_duel` y recompensas en `supabase/schema/functions.sql`; `/historia` solicita `get_campaign_map` y `start_campaign_duel`. | Descargar imágenes no permite jugar. Portar reglas y bots en bloques propios; online continúa bajo autoridad SQL. |
| Reglas actuales | PR #104 integrado; tercera parda favorece a quien ganó la primera baza. Pruebas en `scripts/sim.ts` y `supabase/tests/tercera_parda.sql`. | El motor local debe partir de estas reglas corregidas y demostrar equivalencia, no copiar la revisión vieja. |
| Arranque | Next.js con rutas dinámicas, middleware y cookies; worker anterior sin caché. | Pantalla local autocontenida ahora; para campaña, una entrada local que no dependa del render de servidor ni de validar la sesión en cada arranque. |
| Eliminación | PR #101; `/eliminar-cuenta`, `/api/account/delete`, [Eliminación, reintentos y soporte](operacion.md#eliminacion-cuenta), `20261001184850_account_deletion.sql`. | Desarrollo cerrado. URL para Play: `https://www.trucazo.com.ar/eliminar-cuenta`; falta regresión instalada, no otra migración. |
| Identidad Android | Prototipo reproducible de PR 1B, paquete provisional, entrada www y ruta de asociación por huella real. | Asociación/instalación física y paquete definitivo pendientes; no inventar huellas. |
| Push | PR 1B agrega suscripción/baja y envío de prueba solo para administración; sin almacenamiento de suscripciones ni eventos productivos. | Verificar recepción/permiso en Android; implementación completa de push sigue pendiente. |

**Evaluación histórica del 09/10:** se mantuvo TWA como candidata, aprovechando la descarga inicial online aceptada. La documentación de Chrome confirma que renderiza en el navegador; Chromium documenta delegación de notificaciones mediante `TrustedWebActivityService`. Esto respalda una prueba, no certifica el resultado en Trucazo. La decisión posterior es comenzar con [Capacitor](#capacitor). Fuentes revisadas el 09/10: [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/), [delegación de permisos](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/android/java/src/org/chromium/chrome/browser/browserservices/permissiondelegation/README.md), [persistencia web](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

La persistencia de IndexedDB/Cache Storage debe comprobarse y solicitarse al descargar la campaña; el navegador puede denegar almacenamiento persistente. No prometer que sobreviva a borrar datos o desinstalar. No guardar cookies/tokens en el paquete de campaña.

Orden de ejecución de la entrega anterior, conservado como historial (las etiquetas históricas se conservan). La decisión del 11/10 y el orden vigente están en [Capacitor](#capacitor); motor, descarga y sincronización ya avanzaron y no deben repetirse desde cero:

1. **PR 1A, integrado como #106:** base de arranque web y pruebas de caché/persistencia.
2. **PR 1B, integrado como #108 (merge `978b166`):** prototipo TWA reproducible, firma de prueba, asociación del dominio, cuenta y flujo local mínimo; notificación de prueba preparada. **Siguiente acción: completar partida/reapertura en Android 11, asociar el certificado real y completar las pruebas instaladas de [Construcción del APK y pruebas Android](#construir-android).** Definir el identificador con el dueño antes de fijarlo. Si no satisface reapertura/persistencia/push, revisar Capacitor.
3. **Motor local y bots:** reglas y decisiones de los 66 rivales contrastadas localmente con el SQL vigente el 11/10; incluye desempates corregidos, rasgos y lectura de estilo. Entrada del motor preparada; integración al mapa completo en el bloque siguiente. No modificar motor/UI online para simular offline.
4. **Descarga, identidad y guardado:** recursos versionados, instalación completa/incompleta, partida recuperable y datos separados por cuenta; integrar entrada local sin sesión renovada por red. Campaña sin chat escrito.
5. **Sincronización:** validar en el servidor el historial de acciones/repartos autorizados y acreditar una sola vez; nunca confiar en saldos o victorias enviados por el cliente. Concretar el contrato y conflictos junto con el motor, antes de publicar el formato de guardado. Requiere SQL nuevo y pruebas de reintentos y dos dispositivos.
6. **PR 2/3 y push:** completar recuperación de acceso, enlaces, suspensión/reconexión, suscripciones, baja y eventos aprobados. Algunas partes se anticipan en PR 1B para validar TWA.
7. **PR 5/6/7:** moderación, privacidad/ficha y construcción/publicación; regresiones de eliminación existente. Mantener las pruebas y requisitos externos del resto de este documento.

La pantalla de recuperación no reemplaza ninguno de los bloques de campaña offline. La cantidad final de PRs depende de separar motor, bots, sincronización y moderación en cambios revisables.

<a id="plan-android-punto-de-retoma"></a>

#### Punto de retoma

**Retoma vigente:** seguir el [estado actual](#android-estado-actual) y el [último traspaso de15](#android-15-traspaso-2026-10-16), no este orden histórico de TWA. Cada sesión completa su etapa antes del texto final; los traspasos y condiciones del plan vigente definen la continuidad.

- Se conservan las siete etapas originales: PR 4 implementado y seis etapas base por revisar/completar. Los números son etiquetas del plan, no números reales de PR de GitHub.
- **Alcance confirmado:** campaña offline desde la primera versión, con conexión inicial para descargar, progreso y recompensas sincronizados al reconectar, cuenta obligatoria en la app y notificaciones push en el lanzamiento.
- No exigir crear una cuenta nueva a jugadores existentes: pueden iniciar sesión. La preparación requiere conexión, pero la campaña descargada debe poder abrirse después sin validar la sesión por red en cada arranque. No se autorizó quitar invitados de la web.
- Validar Capacitor con acceso real, partida online y campaña local con cierre/retoma y sincronización. La viabilidad para lanzamiento requiere esas pruebas instaladas y luego la integración nativa de push.
- Al retomar, comparar este documento con el checkout local y sus cambios sin guardar en Git, además de lo integrado en `master`. No borrar trabajo local ni repetir implementación o SQL de eliminación de cuentas e Historia ya aplicados.
- Las fuentes y requisitos externos pertenecen a la revisión original salvo la consulta del 08/10 sobre público objetivo, clasificación y contacto de desarrollador. Volver a verificarlos antes de publicar.

<a id="plan-android-decisiones-confirmadas-por-el-dueno-08102026"></a>

##### Decisiones confirmadas por el dueño — 08/10/2026

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

<a id="plan-android-camino-tecnico-candidato-twa-con-offline-y-push-pendiente-de-prueba"></a>

#### Camino técnico anterior: TWA con offline y push

**Historial:** la recomendación siguiente corresponde al prototipo anterior. El dueño aceptó comenzar con [Capacitor](#capacitor) el 11/10 para conservar el diseño web sin depender de la aplicación Chrome en Android modernos.

La revisión original propuso una **Trusted Web Activity (TWA)**, generada con Bubblewrap: una aplicación instalable desde Google Play que presenta la web de Trucazo utilizando un navegador compatible, sin la barra de direcciones dentro del dominio verificado. Con las decisiones confirmadas, evaluar este camino junto con motor local, descarga de campaña, persistencia, sincronización y push. Una versión solo online ya no satisface el lanzamiento solicitado.

Para el objetivo actual —facilitar encontrar, instalar y abrir el juego— es el camino que mejor aprovecha lo construido. Se conservan el diseño, las cuentas, las monedas, el progreso, los torneos, los rivales y el servidor. Los jugadores de Android y de la web siguen compartiendo las mismas mesas. La mayoría de las mejoras del juego seguirían llegando con los despliegues web; los cambios del paquete Android se publicarían en Play.

Sin el trabajo adicional de campaña offline, la aplicación seguiría necesitando conexión y dependería del sitio y del navegador compatible. En la revisión original, la campaña también dependía del servidor. Instalar desde Play no agrega juego sin conexión, notificaciones push ni mejoras automáticas de velocidad. La TWA cubre Android; una futura publicación en la App Store requeriría otro trabajo. Ver la sección de campaña sin internet antes de elegir el empaquetado definitivo.

La asociación del dominio y la firma debe verificarse: si falla, puede aparecer la interfaz del navegador. Los flujos externos de autenticación pueden mostrar una pestaña de navegador legítima. Fuentes: [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/), [Bubblewrap y asociación del dominio](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

<a id="plan-android-comparacion-de-caminos"></a>

#### Comparación de caminos

**Consulta sobre dependencia de Chrome, 11/10/2026:** instalar el APK TWA no elimina su dependencia de un navegador compatible; asociar dominio/firma sólo permite mostrarlo sin las barras. El dueño preguntó si esa dependencia sería permanente y si realmente es instalable. Explicar que ambas cosas pueden coexistir: el prototipo es una aplicación instalable que utiliza el navegador para ejecutar sus pantallas. Si el requisito es funcionar sin la aplicación Chrome, hay que reevaluar el empaquetado, no dar la asociación como solución suficiente. Capacitor con interfaz empaquetada es una alternativa para conservar el diseño y el motor existente, pero requiere adaptar acceso, rutas, relación con el servidor y almacenamiento y luego repetir las pruebas instaladas. Su documentación distingue Android 7–9 (Chrome puede proveer WebView) de Android 10+ (Android System WebView); no prometer independencia de Chrome para todas las versiones manteniendo automáticamente el mínimo actual. Esta consulta no cambió aún la arquitectura ni generó otro APK. Fuentes primarias comprobadas: [TWA](https://developer.chrome.com/docs/android/trusted-web-activity/), [Capacitor Android](https://capacitorjs.com/docs/android), [WebView de Android](https://developer.android.com/develop/ui/views/layout/webapps/webview).

| Camino | Encaje con este repositorio | Evaluación |
| --- | --- | --- |
| TWA + Bubblewrap | Mantiene Next.js en Vercel y Supabase; reutiliza la aplicación web completa. | Recomendación inicial y prototipo anterior. Depende de un navegador compatible; se conserva como referencia. |
| Capacitor con interfaz empaquetada | Exige adaptar la separación entre cliente y servidor, acceso, cookies, rutas y recursos. Aporta integración mediante plugins nativos. | Prueba instalada aceptada el 11/10; próxima tarea según el capítulo Capacitor. Reutilizar el motor y guardado existentes. Mantener la preparación inicial online y verificar la independencia de Chrome en Android modernos. |
| Interfaz nueva en React Native/Flutter | Podría conservar parte del servidor, pero supone rehacer pantallas, navegación e integración del juego. | Requiere otro alcance y otra estimación. |

**Contras de Capacitor para este repositorio, revisadas el 11/10/2026 (evaluación, no cambio de arquitectura):** el costo principal es adaptar la aplicación web dinámica a una interfaz empaquetada. La revisión confirmó sesiones con cookies en `src/lib/supabase/server.ts`, renovación en middleware, retorno de Google en `src/app/auth/callback/route.ts` y datos iniciales de Historia obtenidos por el servidor. Esas piezas no pueden copiarse como archivos estáticos dentro del APK; deben conservar su servidor o cambiar su integración con la app. La configuración oficial de Capacitor no recomienda `server.url` para producción, por lo que apuntar el contenedor a la web no resuelve por sí solo el objetivo de una app independiente.

Además habrá que mantener el proyecto Android y sus plugins, preparar nuevas versiones para cambios de interfaz empaquetada y repetir la matriz de cuentas, navegación, suspensión, sonidos, guardado y sincronización en WebView. Los ensayos actuales en Chrome no certifican ese entorno. El guardado importante merece una elección y prueba propias; Capacitor ofrece APIs web y opciones nativas, pero no vuelve permanente automáticamente la base actual. Los diseños compartidos, motor offline y validador SQL se pueden reutilizar: no se plantea rehacer todo el juego. No se midieron aún tamaño ni rendimiento de un APK Capacitor, así que no afirmar que será más lento, más pesado o más rápido. El acceso con Google requiere un flujo admitido por Google y puede usar una pantalla externa o integración nativa; cambiar el empaquetado no autoriza incrustar su formulario en cualquier WebView. Fuentes: [restricciones de exportación Next.js](https://nextjs.org/docs/app/guides/static-exports), [configuración Capacitor](https://capacitorjs.com/docs/config), [construcción y mantenimiento](https://capacitorjs.com/docs/basics/workflow), [almacenamiento](https://capacitorjs.com/docs/guides/storage), [OAuth de Google](https://developers.google.com/identity/protocols/oauth2/native-app).

Trucazo usa páginas dinámicas de servidor, cookies, middleware y rutas `/api`. No es una web estática lista para copiar dentro de Capacitor. Next.js documenta esas restricciones en su [exportación estática](https://nextjs.org/docs/app/guides/static-exports). Además, Capacitor describe `server.url` como una opción de recarga durante desarrollo, no destinada a producción: no conviene basar la propuesta en configurar una URL y dar por resuelta la integración. [Configuración de Capacitor](https://capacitorjs.com/docs/config).

<a id="plan-android-hallazgos-del-repositorio"></a>

#### Hallazgos del repositorio

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

<a id="plan-android-alcance-base-7-etapas-originales-1-implementada"></a>

#### Alcance base: 7 etapas originales, 1 implementada

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

<a id="plan-android-pr-1-base-android-y-prueba-de-viabilidad"></a>

##### PR 1 — Base Android y prueba de viabilidad

**Precondición:** revisar motor, bots, arranque, persistencia y push con el alcance confirmado. Lo siguiente describe el camino TWA candidato; si la prueba exige otra arquitectura, reformular la etapa antes de implementar el paquete definitivo.

**Entrega:** proyecto TWA reproducible dentro del mismo repositorio, versión de Bubblewrap fijada, configuración de Android, iconos iniciales y manifest web ajustado. Definir identificador de aplicación definitivo; una posibilidad a confirmar es `ar.com.trucazo.app`.

Preparar la asociación `https://trucazo.com.ar/.well-known/assetlinks.json` y distinguir certificados de pruebas, carga y firma de Google Play. Las huellas reales se obtienen de los certificados correspondientes; no se inventan. Preparar APK para instalación de prueba y construcción de AAB, el paquete de publicación.

**Cierre:** abrir en un Android físico, comprobar asociación del dominio y acceso con Google/contraseña. Como prueba de arquitectura, demostrar descarga inicial y reapertura offline de un flujo mínimo local, guardado durable y viabilidad de push. La campaña completa y sincronización se cierran en sus bloques, pero no elegir empaquetado basándose solo en una partida online.

**Complejidad:** media. **SQL esperado:** ninguno por el empaquetado.

<a id="plan-android-pr-2-acceso-y-enlaces"></a>

##### PR 2 — Acceso y enlaces

**Entrega:** recuperar contraseña; revisar confirmación de correo y cierre de sesión; volver al destino correcto después del login; abrir enlaces autorizados de Trucazo en la aplicación instalada. Ocultar las invitaciones redundantes a instalar dentro de la app.

Conservar cuentas y progreso existentes. La app requiere registro o acceso con cuenta existente: quitar la entrada de invitado en Android sin cambiar la web por defecto. Validar el recorrido desde correo externo y Google; permitir únicamente destinos internos válidos en el retorno del login. Preparar identidad local vinculada a la cuenta para campaña descargada, sin obligar a renovar por red el token de sesión antes de cada partida offline. Al reconectar, validar la sesión antes de sincronizar.

**Cierre:** entrar con una cuenta existente, registrar una nueva, cerrar y reabrir, recuperar acceso desde correo y abrir un torneo sin perder el destino. Comprobar que no hay acceso como invitado en Android y que la campaña preparada abre en modo avión. Probar expiración de sesión, cierre de sesión, cambio de cuenta y eliminación: no mezclar guardados ni sincronizar a otra cuenta. La revocación remota solo podrá conocerse al reconectar.

**Complejidad:** media. **Configuración externa:** posibles ajustes de URLs permitidas y correos de Supabase. No se asumieron ya correctos en esta revisión.

<a id="plan-android-pr-3-comportamiento-android-y-recuperacion"></a>

##### PR 3 — Comportamiento Android y recuperación

**Entrega:** recuperación coherente en 1v1 y 2vs2; estado de conexión; reintento; entrada sin red; regreso tras suspensión; navegación Atrás y cierre de paneles. Revisión del teclado, audio, selector de imágenes y zonas seguras.

En el alcance online base, agregar únicamente la caché necesaria para la pantalla de desconexión y, si se justifica, recursos estáticos versionados. Las sesiones, APIs, cartas y resultados de partidas online deben conservar su autoridad en el servidor. No prometer que el turno online se pausa al salir de la app: siguen rigiendo los plazos del juego. La campaña offline tendrá un motor local separado según el alcance acordado; una pantalla de desconexión no equivale a poder jugar sin internet.

**Cierre:** cambiar entre Wi-Fi y datos, activar modo avión, bloquear el teléfono, abrir otra app y volver; verificar que se recuperan turno, cartas y resultado sin duplicar jugadas. Probar un primer arranque sin red además del regreso tras una sesión previa. Mesa 1v1/2vs2 completa y legible sin scroll.

**Complejidad:** media/alta. **SQL:** solo si las pruebas justifican un ajuste puntual de recuperación o tiempos del servidor.

<a id="plan-android-pr-4-eliminacion-de-cuenta-y-datos-implementado"></a>

##### PR 4 — Eliminación de cuenta y datos — IMPLEMENTADO

**Estado:** implementado e integrado en el PR #101, commit `953ea31`, merge `1be62d2`. Rutas `/eliminar-cuenta`, `/api/account/delete` y `/api/account/cleanup`; instrucciones y alcance en [Eliminación, reintentos y soporte](operacion.md#eliminacion-cuenta). Se da por cerrada esta etapa de desarrollo del plan; no crear otro PR de eliminación ni repetir migraciones. La revisión del 09/10 no comprobó despliegue/SQL en producción.

**Al retomar:** localizar la implementación y su documentación en el repositorio actualizado, registrar la URL web de eliminación y los cambios asociados. Si falta evidencia de aplicación de SQL o despliegue, dejarlo como verificación pendiente, sin asumir que el trabajo no existe ni volver a ejecutar operaciones destructivas.

**Regresión antes de publicar:** comprobar que el flujo existente puede iniciarse desde la app y desde la web indicada en Play Console. En un entorno autorizado y con una cuenta descartable, verificar eliminación de datos/archivos, invalidación de sesiones, solicitudes repetidas e integridad de datos de terceros. Nunca borrar una cuenta real para probar. Documentar cualquier retención y plazo que efectivamente tenga la implementación.

**Trabajo nuevo estimado:** ninguno para reconstruir la funcionalidad. Cualquier defecto demostrado se tratará como corrección puntual. La confirmación de implementación no equivale a una certificación de cumplimiento de Google Play. [Requisito oficial a verificar antes de publicar](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

<a id="plan-android-pr-5-denuncias-bloqueos-y-moderacion"></a>

##### PR 5 — Denuncias, bloqueos y moderación

**Entrega:** reportar mensajes y usuarios, bloquear usuarios y administrar denuncias. Cubrir chat global, chat de partida y contenido de perfil/grupos accesible en la app. Incorporar aceptación de reglas antes de crear contenido, también para usuarios que entran con Google y cuentas existentes.

Definir el alcance del bloqueo de mensajes e invitaciones sin modificar arbitrariamente los cruces competitivos. El administrador necesita revisar evidencias y aplicar medidas. El chat de mesa se purga a las 72 horas: conservar de forma restringida la evidencia denunciada por un plazo definido, si es necesaria para resolver el reporte.

**Cierre:** un bloqueo persiste al reabrir; el contenido bloqueado deja de mostrarse donde corresponde; el reporte llega a administración; personas ajenas no pueden leer evidencias privadas. Una medida de moderación se aplica efectivamente.

Se mantiene el comportamiento vigente: texto libre en mesas 1v1 y 2vs2 con o sin bots; bots sin respuestas escritas; campaña sin chat escrito. [Política de contenido de usuarios](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en).

**Complejidad:** alta. **SQL esperado:** sí. Es el candidato principal a dividir en dos PRs si queda demasiado grande.

<a id="plan-android-pr-6-privacidad-soporte-y-preparacion-de-la-ficha"></a>

##### PR 6 — Privacidad, soporte y preparación de la ficha

**Entrega:** actualizar privacidad, términos y contacto; poner soporte privado accesible; documento de datos para completar Play Console; textos de la ficha y materiales gráficos basados en la aplicación real. Registrar público objetivo y países elegidos.

Reutilizar el flujo de eliminación ya implementado y su URL pública. Ajustar los textos a su funcionamiento real; no crear una segunda vía técnica ni describirlo como función futura.

Declarar lo que trata la aplicación completa: cuentas, fotos, mensajes, estadísticas, analítica y proveedores configurados. Revisar la clasificación por edades contestando sobre el contenido real del juego, las monedas ficticias y el chat; la clasificación se obtiene del cuestionario, no se supone por ser un juego de cartas.

**Cierre:** enlaces públicos accesibles, ficha coherente con la app y decisiones de conservación/moderación implementadas. Preparar instrucciones y cuenta de prueba sin privilegios administrativos para los revisores de Google. La titularidad y las declaraciones de Play Console las confirma el dueño.

**Complejidad:** media. **SQL esperado:** normalmente ninguno adicional.

Fuentes: [Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [clasificación](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en), [acceso para revisión](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).

<a id="plan-android-pr-7-construccion-de-publicacion-y-cierre-de-pruebas"></a>

##### PR 7 — Construcción de publicación y cierre de pruebas

**Entrega:** AAB de publicación, numeración de versiones, firma y asociación con el certificado de Play App Signing; automatización de construcción, documentación de publicación y lista de pruebas. Guardar claves fuera del repositorio. Ejecutar el trabajo Android cuando cambien sus archivos o en una publicación, para evitar alargar cada PR de contenido web.

La revisión original propuso **Android 16 / API 36 como mínimo** como API objetivo. Es una referencia histórica, no una comprobación renovada: verificar y registrar el requisito vigente al preparar el AAB. La API objetivo no equivale a la versión mínima de Android compatible, que es otra decisión. [Requisito oficial](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

**Cierre técnico:** instalar desde el canal de pruebas de Play, verificar firma y dominio, y completar la matriz de pruebas inferior. Documentar qué se revierte en Vercel y qué exige un nuevo paquete Android.

**Cierre de lanzamiento:** completar las pruebas y revisiones de Play Console, resolver hallazgos y publicar. Estas acciones y esperas no se convierten en automáticas por mergear un PR; pueden producir correcciones posteriores.

**Complejidad:** media más validación en dispositivos. **SQL:** solo correcciones demostradas.

<a id="plan-android-pruebas-necesarias-antes-de-publicar"></a>

#### Pruebas necesarias antes de publicar

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

<a id="plan-android-pasos-fuera-del-repositorio"></a>

#### Pasos fuera del repositorio

Los importes, plazos y umbrales siguientes son los registrados en la revisión original. Confirmarlos en la documentación oficial y en la cuenta concreta antes de iniciar la publicación.

1. Crear la cuenta de desarrollador de Google Play: el dueño confirmó que no tiene una. Elegir tipo de cuenta según la titularidad real y completar verificación; no se creó ni pagó nada en esta sesión. La revisión original registró **US$25 una sola vez**; verificar importe al realizar el alta. [Alta de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
2. Nombre indicado: Santiago Barbeira Papalia. Confirmar los datos legales, el correo público atendido y la titularidad; elegir identificador definitivo y conservar claves de carga de forma segura.
3. Preparar pruebas internas y luego cerradas. Para cuentas personales creadas después del 13/11/2023, Google exige al menos **12 testers inscritos continuamente durante 14 días** antes de solicitar acceso a producción. Hay que probar y recopilar resultados; cumplir el mínimo habilita la solicitud, no garantiza aprobación. [Pruebas requeridas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
4. Aplicar las migraciones SQL indicadas por cada PR y configurar los valores externos documentados. El repositorio no despliega automáticamente el backend.
5. Completar ficha, países, público, clasificación, datos, privacidad y acceso para revisión. Subir el AAB y atender la revisión.

Conviene iniciar el alta y reunir testers temprano. El plazo total depende tanto del desarrollo como del período de pruebas y la revisión de Google; esta propuesta no fija una fecha de aprobación.

<a id="historia-sin-internet"></a>

<a id="plan-android-campana-sin-internet-incluida-en-el-lanzamiento"></a>

#### Campaña sin internet — incluida en el lanzamiento

Fecha: 10/10/2026. Revisión del repositorio local: `2ecd674`.

Esta sección conserva el diseño del 10/10 y el avance local del 11/10 registrado más abajo. Historia completa y sus premios oficiales todavía dependen del servidor; el ensayo separado contra Tobías ya permite jugar y guardar sin conexión.

<a id="plan-android-que-ya-esta-decidido"></a>

##### Qué ya está decidido

- Historia completa sin internet forma parte del primer lanzamiento Android.
- Antes de usarla, el jugador entra con su cuenta y descarga el contenido con conexión. Las cuentas existentes sirven.
- El avance y las recompensas se sincronizan con esa misma cuenta cuando vuelve internet.
- Se mantienen los rivales, las dificultades y las reglas de premios actuales. Historia sigue sin chat escrito.
- El empaquetado Android definitivo sigue sujeto a las pruebas pendientes. La prueba actual de guardado con un contador no es una partida offline.

El alcance anterior ya estaba confirmado en este plan. Los detalles siguientes son recomendaciones de esta revisión, no nuevas decisiones atribuidas al dueño.

<a id="plan-android-recorrido-recomendado-para-el-jugador"></a>

##### Recorrido recomendado para el jugador

1. **Preparar Historia.** Desde Historia, tocar «Descargar para jugar sin internet». Mostrar avance de descarga y permitir reintentar. Al terminar de verificar todos los archivos y guardar el avance de la cuenta, mostrar «Historia lista para jugar sin internet».
2. **Jugar.** Al abrir sin conexión, entrar al mismo mapa y elegir entre los rivales disponibles. Poder disputar partidas completas, cantar envido y truco, irse al mazo, ganar, perder y jugar revanchas.
3. **Seguir avanzando.** Las victorias guardadas permiten continuar localmente y desbloquear rivales con las mismas condiciones actuales. Mostrar un aviso pequeño: «Sin conexión · avance guardado en este dispositivo».
4. **Cerrar y retomar.** Guardar cada acción aceptada, incluidas las del bot. Si se cierra la app o se reinicia el dispositivo, ofrecer «Continuar partida» con las mismas cartas, marcador y canto pendiente. Recomiendo pausar la partida offline al salir, sin perder por tiempo mientras la app está cerrada; este es un comportamiento propuesto, distinto del reloj de la partida online actual.
5. **Confirmar al reconectar.** Enviar automáticamente los resultados pendientes y mostrar «Sincronizando…». Al recibir la confirmación del servidor, actualizar premios, puntos, fama y desbloqueos. Si falla la conexión, conservar los resultados y permitir «Reintentar».

No hace falta que el jugador haga una acción en la PC para desarrollar esta primera parte. La revisión del diseño y las pruebas automáticas pueden avanzar antes de la próxima prueba manual Android.

<a id="plan-android-premios-conservar-las-reglas-actuales"></a>

##### Premios: conservar las reglas actuales

| Resultado | Regla vigente que debe respetar el modo offline |
| --- | --- |
| Primera victoria contra un rival | Monedas del rival y puntos base con el adicional por diferencia de marcador. |
| Revancha ganada | Sin monedas adicionales; puntos de revancha con el límite acumulado actual de ese rival. |
| Derrota | Sin premio de victoria. |
| Mismo resultado enviado otra vez | Devolver la confirmación anterior, sin acreditarlo nuevamente. |
| Primer triunfo contra el mismo rival en dos dispositivos | Acreditar una sola primera victoria; tratar la otra victoria válida como revancha según el estado oficial. |

Referencia exacta: `finish_game`, en `supabase/migrations/20260705_campana_provincias_1_backend.sql`.

- Primera victoria: `base + round(base × 0,20 × margen / max(objetivo, 1))`, con margen no negativo.
- Revancha: `max(0, min(floor(base × 0,10), floor(base × 0,30) − puntos_de_revancha_ya_acumulados))`.

No sumar el saldo completo que envía un dispositivo. El servidor calcula cada premio a partir de partidas validadas y del progreso oficial actual.

**Propuesta de presentación:** separar «Monedas disponibles» de «Premios por confirmar». Los premios offline se ven al ganar, pero se incorporan al saldo utilizable cuando el servidor los confirma. El avance local permite seguir jugando Historia mientras espera. No modificar ni reducir los premios como solución técnica sin acordarlo con el dueño.

El ranking global se actualiza después de sincronizar. Sin conexión, mostrar la última consulta con su fecha o un mensaje para conectarse; no presentar una posición vieja como actual. Fama y estilo pueden mostrar su estimación local, identificando el avance pendiente.

<a id="plan-android-situaciones-que-hay-que-resolver"></a>

##### Situaciones que hay que resolver

| Situación | Comportamiento propuesto |
| --- | --- |
| Primera instalación sin conexión y sin preparación | Explicar que hace falta conectarse una vez y descargar Historia. |
| Descarga cortada | Conservar la versión anterior completa, si existe. No mostrar la nueva como lista. |
| Vuelve internet durante una partida offline | Terminar con el mismo motor y las mismas cartas. Sincronizar al terminar; no cambiar el duelo a mitad de mano. |
| Se corta internet durante una partida online | Conservar la recuperación online actual. No inventar una continuación local de cartas y decisiones que pertenecen al servidor. La continuidad automática de ese duelo requiere un protocolo adicional y no queda resuelta por esta propuesta. |
| La sesión vence mientras no hay conexión | Permitir continuar la campaña preparada para esa identidad local. Pedir acceso con la misma cuenta antes de subir resultados; el dato local no autoriza operaciones en el servidor. |
| Cierre de sesión o cambio de cuenta | Detener el envío, ocultar las partidas de la cuenta anterior y no mezclar avances. Proponer conservar pendientes por cuenta hasta recuperar el acceso. Antes de borrar datos locales deliberadamente, explicar si hay resultados sin confirmar. |
| Se pierde la respuesta de una sincronización exitosa | Reintentar con el mismo identificador de partida; recuperar el comprobante ya guardado. |
| Se juega con la misma cuenta en otro dispositivo | Incorporar los resultados aceptados al estado oficial y recalcular la proyección local. No sobrescribir toda la cuenta con una copia vieja. |
| Un resultado previo es rechazado | Conservar el registro y explicar el motivo. Las partidas dependientes de su desbloqueo quedan pendientes de revisión; no acreditar una cadena imposible ni borrar silenciosamente las partidas. |
| Se actualiza el juego con una partida pendiente | Conservar la versión necesaria para terminarla y validarla, o realizar una migración comprobada. Nunca borrar pendientes al renovar la descarga. |
| Falta espacio o falla el guardado | Informar el problema y no seguir mostrando jugadas como guardadas. Antes de avanzar, comprobar la escritura. |
| Se desinstala la app o se borran los datos del navegador | Los resultados que ya se sincronizaron siguen en la cuenta. No prometer recuperar partidas que existían únicamente en el dispositivo. |

<a id="plan-android-que-falta-construir"></a>

##### Qué falta construir

<a id="plan-android-1-motor-de-campana-independiente"></a>

###### 1. Motor de campaña independiente

Crear un motor local exclusivo de Historia, separado de las partidas online. El servidor continúa siendo la autoridad del progreso oficial, de las monedas y de las partidas online. La necesidad de ejecutar reglas en el dispositivo es específica del alcance offline ya acordado; no trasladar reglas a `GameClient.tsx` ni cambiar el juego online para simular desconexión.

Portar desde las migraciones actuales, no solo desde la foto de `supabase/schema/` ni desde un simulador viejo. Cubrir reparto, turnos, bazas y pardas, envido y falta envido, truco y retruco/vale cuatro, mazo, cierre de mano y objetivo de 15/30. Incluir la corrección vigente: una tercera baza parda favorece a quien ganó la primera cuando corresponde.

Para los bots, portar también sus estrategias actuales, rasgos, conocimiento del estilo del jugador y comportamiento por dificultad. La última redefinición encontrada de `bot_step` está en `20260923121000_campana_noroeste_estrategia.sql`; sus ayudantes del Noroeste se corrigen después en `20260923160014_campana_noroeste_tactica_verificada.sql`, que también debe tomarse como fuente. No reemplazar todos los rivales por un bot genérico para declarar Historia completa.

Separar decisiones de juego de animaciones y esperas visuales. Inyectar un generador de azar reproducible y versionado para poder recuperar exactamente una partida y contrastar sus decisiones. Las pruebas comparan estados y acciones con el SQL actual en una base aislada; el simulador TypeScript por sí solo no demuestra equivalencia con el servidor.

<a id="plan-android-2-paquete-completo-de-historia"></a>

###### 2. Paquete completo de Historia

Preparar una descarga versionada con pantallas, cartas, imágenes de rivales, mapa, tipografías, sonidos usados por la campaña, reglas y estrategias. Enumerar recursos y comprobar integridad antes de activar una versión. Medir el tamaño del paquete real antes de publicar una cifra de descarga.

Exportar además una copia inicial del avance de la cuenta y los datos necesarios para continuar: rivales vencidos, puntos, acumulados de revancha, señales de estilo, requisitos de provincias/rivales y configuración de bots.

**Hallazgo concreto:** la respuesta actual de `get_campaign_map` no basta como paquete offline. Incluye el mapa y estados de desbloqueo calculados, pero no expone todas sus dependencias, los acumulados de revancha ni toda la estrategia que usa el bot. Hay que preparar una exportación específica, autenticada y versionada. La condición `required_rival_id` de una provincia debe formar parte del cálculo local; no sustituirla por «vencer a toda la provincia anterior».

Mantener la caché de recursos públicos separada del guardado privado por cuenta. No cachear HTML autenticado de Next, sesiones, respuestas de Supabase, cartas de partidas online, OAuth ni respuestas RSC. La implementación actual de `public/sw.js` ya protege esos límites; extenderla con una lista explícita de recursos de Historia y una entrada offline autocontenida.

<a id="plan-android-3-guardado-durable-por-cuenta"></a>

###### 3. Guardado durable por cuenta

Usar IndexedDB para el estado de campaña, la partida abierta y la cola de resultados. Guardar conjuntamente estado y registro de acciones antes de mostrar la acción como completada. Registrar identificador único de partida, dueño, rival, versiones, estado del azar, secuencia de acciones y estado de sincronización.

Guardar los turnos del bot con el mismo cuidado: después de reabrir no puede jugar dos veces ni recibir otra mano. Si había una decisión pendiente, continuar desde el último estado confirmado. Coordinar pestañas o instancias para impedir dos escritores sobre la misma partida.

Solicitar almacenamiento persistente donde esté disponible y comprobar el resultado, sin prometer que siempre se concede. Esta API permite que el navegador acepte o rechace la solicitud. [Documentación de StorageManager.persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). IndexedDB aporta almacenamiento estructurado y transacciones. [Documentación de IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

<a id="plan-android-4-sincronizacion-validada"></a>

###### 4. Sincronización validada

Diseñar una entrada de servidor específica para resultados offline. Comprobar identidad autenticada, versión admitida, rival, desbloqueo y secuencia válida antes de acreditar. Recalcular marcador, premio y señales de estilo; no aceptar como prueba el saldo o el indicador «gané» del cliente.

Guardar un comprobante por cuenta e identificador de partida con unicidad en la base. En una misma transacción, registrar la aceptación y actualizar progreso/premios; un reintento devuelve ese comprobante. Serializar las acreditaciones de campaña que afecten al mismo progreso, incluida su interacción con las partidas online, para respetar el tope de revancha y evitar carreras entre dispositivos.

Enviar los resultados de cada dispositivo en orden y declarar sus dependencias de desbloqueo. Después de recibir el estado oficial, reconstruir la estimación usando solamente los pendientes restantes. Si otra partida ya cobró la primera victoria, explicar el ajuste a revancha y conservar el registro de ambas victorias válidas.

Disparar reintentos al abrir la app, volver a primer plano y comprobar que el servidor responde. No confiar solo en `navigator.onLine` ni en tareas de fondo: Background Sync tiene disponibilidad limitada. [Documentación de Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API).

**Límite que debe comprobarse antes de activar monedas:** reproducir un registro permite detectar acciones imposibles, pero no demuestra que un humano haya jugado honestamente ni impide mirar cartas locales. Un hash local tampoco prueba honestidad. Hace falta un ensayo del validador, del origen del reparto y de las decisiones del bot para concretar qué puede verificar el servidor. No prometer protección total contra trampas offline ni introducir límites de partidas, caducidades o menores premios sin acordarlos.

Las nuevas funciones SQL deben tener permisos mínimos y revisar su identidad y datos de entrada. Si usan `security definer`, fijar `search_path` y restringir quién puede ejecutarlas. [Guía oficial de funciones de Supabase](https://supabase.com/docs/guides/database/functions). Crear migraciones nuevas; el dueño las aplica con instrucciones concretas cuando corresponda. Esta propuesta no aplica cambios a producción.

<a id="plan-android-primer-trabajo-concreto"></a>

##### Primer trabajo concreto

El ensayo local con **Tobías, el Novato**, está implementado con reglas completas y guardado real; sus pruebas se registran debajo. Después cubrir los demás rivales y toda la campaña; Tobías es una etapa de desarrollo, no una reducción del primer lanzamiento.

| Orden | Resultado que permite pasar a la siguiente etapa |
| --- | --- |
| 1. Equivalencia de reglas y bot | Casos reproducibles coinciden con el SQL vigente, incluidas pardas, cantos y cierres a 15/30. |
| 2. Partida local y guardado | Tobías juega un duelo completo sin llamadas de red; cierre/reapertura recupera cada estado de prueba. |
| 3. Paquete y campaña completa | Descarga interrumpida/completa, rivales, estilo y desbloqueos funcionan localmente con el catálogo vigente. |
| 4. Validación y premios | Servidor de prueba acepta resultados válidos, rechaza registros imposibles y no duplica premios al reintentar o usar dos dispositivos. |
| 5. Android | Modo avión, reinicio, pérdida de proceso, vuelta de conexión y actualización pasan en el emulador; queda pendiente la prueba final en un teléfono real. |

No estimar una fecha de entrega hasta cerrar la equivalencia del motor y el ensayo de validación. Mantener una sola pantalla de juego, controles completos y el diseño actual, también con cantos abiertos.


<a id="ensayo-tobias-local"></a>

##### Ensayo local contra Tobías — 11/10/2026

**Implementado localmente:** duelo completo a 15 o 30, envido/envido-envido/real/falta, declaración de tantos y «son buenas», truco/retruco/vale cuatro, mazo, pardas, cierre y siguiente mano. Conserva la corrección de tercera parda. Tobías usa su rama actual del bot: dificultad 1, mentiroso 1 y agresivo 2; la lectura de fama/estilo es cero en este nivel. No sustituye los demás rivales ni completa Historia.

**Recorrido para probarlo en esta PC:**

1. Abrir la web local e iniciar sesión con una cuenta registrada. No entrar como invitado.
2. Abrir `/android` y tocar **«Ensayo sin internet · Tobías»**, o ir a `/android/tobias.html`.
3. Tocar **«Descargar ensayo con mi cuenta»** mientras hay internet. La entrada de servidor valida la cuenta y comprueba que la configuración vigente de Tobías siga coincidiendo con el ensayo.
4. Elegir **«Jugar a 15»** o **«Jugar a 30»**. Después de preparar, las jugadas y el bot funcionan sin consultar al servidor.
5. Tocar **«Pausar»**, cerrar y abrir sin red desde `/android`: aparece **«Continuar partida»**. Se conservan las cartas, los puntos, el canto y el estado del azar. No corre un reloj de abandono mientras está cerrada u oculta.

El APK instalado sigue abriendo la web publicada; este desarrollo local no aparece automáticamente en ese APK. No se desplegó, no se publicó en Play y no hay SQL nuevo para ejecutar. Para iniciar la copia local, `npm run dev` genera el paquete antes de arrancar; `npm run build` también lo genera. Los archivos generados de `public/android/tobias*` no se versionan.

**Guardado:** IndexedDB separado por cuenta, con estado y registro de acciones en una misma transacción, semilla inicial, estado actual del azar, versión, identificador de partida y revisión. La pantalla solo confirma una jugada después de que termina la escritura. Los turnos del bot usan el mismo mecanismo. Una revisión vieja o una cuenta que cambió no pueden escribir; se conserva el último guardado si falla el almacenamiento. Los resultados terminados se archivan con la partida, como `trial-only`: **no dan monedas, puntos oficiales, fama ni desbloqueos y no se envían a Supabase**. No presentarlos como premios pendientes ya aceptables para la futura sincronización.

**Paquete:** entrada HTML pública y programa con las 40 cartas y la imagen de Tobías incorporadas. Tamaño medido en esta construcción: **1.286.172 bytes** entre HTML y programa, más el pequeño manifiesto. Cada archivo se comprueba por tamaño y SHA-256 antes de activar el paquete. Una descarga cortada o alterada conserva el paquete completo anterior. La caché contiene solo esos recursos públicos; la API de identidad y el juego online no se cachean. Al volver internet, una partida iniciada aquí continúa con este motor.

**Pruebas aprobadas:**

- `npm run check:offline-trial`: **4.516 transiciones** contra PostgreSQL en memoria y **829 decisiones de Tobías**, más **24 partidas completas a 15/30** reproducidas exactamente desde su semilla y registro. Incluye los 15 caminos de pardas con ambos jugadores como mano, valores 1/2/4, cierre al objetivo, cadenas de envido aceptadas/rechazadas, tantos empatados, mazo declarando y prioridad del envido sobre el truco.
- `npm run check:offline-trial:browser`: navegador Edge/Playwright con identidad ficticia, descarga interrumpida y comprobación de integridad, cierre completo del navegador y reapertura offline desde `/android`, recuperación de cinco estados de carta/canto/declaración, respuesta del bot sin duplicar, dos escritores, fallo de almacenamiento, cambio de cuenta y rechazo de identidad. Victoria a 15 y derrota a 30 desde los botones de la pantalla, sin llamadas de juego durante los duelos.
- Mesa sin desplazamiento, también con cinco opciones de envido, en **320×568, 360×640, 412×915 y 640×360**. Capturas inspeccionadas en `android/generated/tobias-360x640.png` y `tobias-envido-320x568.png`.
- TypeScript, build de Next con claves ficticias, ocho comprobaciones PWA, cuatro Android y prueba de rutas del build real: aprobados. Lint conserva los siete avisos anteriores en GameClient/LobbyClient, sin avisos nuevos. La entrada real local devuelve HTML 200 y preparación 401 sin cuenta; no permite descargar bajo identidad anónima.

**Límites de la comparación:** las reglas se cargan directamente de las funciones vigentes del repositorio, recorriendo las migraciones en orden, en una base aislada con PGlite 0.5.8. El reparto de prueba fija las mismas manos y el bot recibe el mismo flujo de azar; no se afirma que una semilla local reproduzca `random()` de producción. `finish_game` se aísla para comprobar ganador y puntaje, y `_record_style` se reemplaza por una operación vacía: premios, reputación y permisos del backend no quedan certificados por esta prueba. Al terminar por cartas, el ensayo conserva la última carta para mostrarla aunque el SQL cierra sin guardarla en `games`. Cuando hay combinaciones empatadas para probar el envido, se comprueba que ambas prueben el mismo tanto; el SQL no fija qué palo empatado elige primero.

**Pendiente al cerrar este primer ensayo:** probar descarga con la cuenta real del dueño y este ensayo local en el emulador, con modo avión y cierre de proceso. Después extender al catálogo completo, exportación inicial del avance, rasgos/estrategias de los demás rivales y desbloqueos; construir el validador de resultados y la sincronización oficial con comprobantes únicos y acreditación que no se repita. Integrar el ciclo completo de cambio/cierre de cuenta y actualización de paquetes. La entrega siguiente resuelve el motor de los demás rivales y actualiza el orden mientras el dueño está remoto. No declarar viable la TWA ni lista la versión de Play basándose solo en estas pruebas de navegador.

**Archivos del ensayo:** `src/lib/offline-trial/{engine,storage}.ts`, `src/offline-trial/{app.ts,tobias.html}`, `src/app/api/android/tobias/route.ts`, `scripts/build-offline-trial.mjs` y las dos comprobaciones `scripts/check-offline-trial*`. La mesa online `GameClient.tsx`, las RPC y las migraciones existentes no se modificaron.


<a id="motor-bots-historia-local"></a>

##### Motor de los 66 rivales — 11/10/2026

El dueño autorizó avanzar con los demás bots mientras deja pendiente el ensayo personal en el emulador. **Implementado y probado localmente:** los 46 rivales clásicos usan sus dificultades, mentira, agresividad y lectura de fama/estilo; los 20 del Noroeste usan las cinco estrategias vigentes y la corrección táctica posterior del 23/09. Esta entrega prepara el motor; la pantalla descargable sigue ofreciendo solamente Tobías. No hay selección completa de rivales, desbloqueos ni premios oficiales todavía.

`src/lib/offline-trial/bots.ts` recibe únicamente las cartas propias del bot, las cartas públicas, el marcador y el estilo registrado. La rama clásica replica `_bot_step_pre_noroeste`; la del Noroeste replica `_northwest_card_choice` y `_northwest_plan` vigentes, incluidas las 27 combinaciones de bazas, valoración de una carta ya tirada, parda que permite cerrar, 33 siendo mano y riesgo de conceder el último punto al rechazar. Sus probabilidades son las estimaciones del SQL, no acceso a la mano humana.

`createBotTrial` recibe la ficha del rival y una copia inicial de puntos/estilo. El estado `historia-bots-v1` conserva esa ficha, el estilo inicial y sus contadores actuales, el azar y las acciones; cantar, rechazar y repartir actualizan los contadores igual que `_record_style`. Esto permite serializar y retomar el motor sin cambiar de rival o personalidad, y reconstruir el duelo usando solamente su registro guardado. Los 20 rivales del Noroeste mantienen su objetivo de 30. Se conserva por separado `tobias-v1`, con las decisiones originales para las partidas guardadas del primer ensayo. La integración de los nuevos estados a IndexedDB y a la descarga completa corresponde al próximo bloque; el guardado público de Tobías sigue admitiendo su versión original.

**Verificación:**

- `npm run check:offline-trial`: **29.871 transiciones**, **11.996 decisiones** y **222 partidas completas** contra PostgreSQL aislado: 24 del ensayo original y tres escenarios de estilo por cada uno de los 66 rivales. Se reconstruye cada duelo desde su semilla, configuración inicial y acciones; se serializa entre jugadas y se cambia la mano humana oculta para comprobar que no altera decisiones ni consumo de azar del bot.
- **160 comprobaciones tácticas adicionales** del Noroeste, con los 20 rivales: cantos tras tirar la última carta, parda que cierra sin gastar el ancho, no regalar el punto final al rechazar, falta con 33 siendo mano, diferencia siendo pie y real envido cerca del objetivo. Comparan decisiones y elección de carta con las funciones SQL actuales.
- Las fichas de los 66 se cargan de las sentencias de contenido del historial SQL, no de valores inventados para las pruebas. Ahora se ejecuta `_record_style` real y se comparan sus siete contadores después de cada acción. `finish_game` sigue aislado: premios, cambios de puntos oficiales y permisos de producción quedan fuera de esta comparación.
- Tobías en Edge: descarga interrumpida/integridad, reapertura offline de cinco estados, bot sin duplicación, dos escritores, falta de espacio, separación de cuentas, cuatro tamaños y duelos completos a 15/30 sin llamadas de juego: aprobados. Paquete regenerado: **1.293.224 bytes** entre HTML/programa, más manifiesto; reemplaza la medida de la construcción anterior.
- TypeScript, ocho pruebas PWA y cuatro Android aprobados. Lint conserva los siete avisos anteriores en GameClient/LobbyClient, sin avisos nuevos.

**Próximo trabajo desde remoto:** preparar el paquete/mapa completo y la exportación autenticada del avance inicial (puntos, rivales vencidos, acumulados de revancha, estilo y requisitos), conectar la elección de rival al motor y conservar sus estados por cuenta. Luego construir el validador y sincronización oficial. La descarga con cuenta real, modo avión y cierre de proceso en el emulador queda pendiente hasta que el dueño pueda hacer su acceso personal. El juego online, las RPC, las migraciones existentes y el APK instalado no se modificaron en esta ampliación; no hubo despliegue ni SQL en producción.

<a id="mapa-historia-local"></a>

##### Mapa completo y avance por cuenta — 11/10/2026

**Implementado y verificado localmente**, por pedido del dueño desde el celular: descarga de Historia completa, elección de provincia/rival, duelo con su personalidad y objetivo, guardado de cada acción y avance local. La entrada `/android` agrega «Historia sin internet», que abre `/android/historia/index.html`. El ensayo anterior de Tobías conserva su pantalla, formato y base local propios.

**Paquete:** `npm run build:offline-campaign` arma **129 archivos, 4.401.125 bytes (4,4 MB)**, más el manifiesto: mapa argentino, 15 imágenes de provincia, 66 retratos, 40 cartas, fuente local, tres sonidos existentes, pantalla, programa y catálogo. El catálogo se reconstruye de las sentencias de contenido de las migraciones, incluyendo rasgos, estrategias, premios, puntajes y rivales requeridos. No se inventa otro listado de personajes. Las voces que ya faltaban en el proyecto no se generan ni se piden por red desde esta pantalla.

El worker verifica tamaño y SHA-256 de cada archivo antes de marcar el paquete completo. Una descarga cortada o corrupta conserva el paquete anterior. Los archivos públicos se sirven desde su caché en la pantalla local; las páginas online, APIs, sesión, partidas y respuestas privadas siguen fuera de esa caché. Al abrir `/android` sin red, se ofrece Historia si se preparó su paquete completo, antes del ensayo y la prueba del contador.

**Cuenta y guardado:** una base IndexedDB separada conserva la foto oficial inicial, puntos proyectados, estilo, rivales vencidos, acumulado de revanchas, partida abierta y resultados pendientes. Cada resultado incluye el duelo reconstruible (versión, configuración inicial, semilla, azar y acciones) y los identificadores de los resultados anteriores de los que depende. Una sola transacción guarda la jugada y su eventual cierre/premio pendiente; una revisión consecutiva y la identidad activa impiden que dos ventanas acepten el mismo cambio. La pantalla avanza recién después de que la escritura termina. Cerrar o cambiar de cuenta oculta el guardado anterior y lo conserva separado; al volver con esa cuenta puede recuperarse. La identidad se comprueba al abrir, preparar, volver a la pantalla o recuperar internet, sin llamadas de juego durante los turnos.

**Progreso y premios:** las victorias locales abren provincias/rivales con las mismas condiciones de puntos y rival requerido que `get_campaign_map`; los rivales ya vencidos conservan su revancha libre. Se proyectan la primera victoria con plus de marcador y las revanchas con su tope actual; las derrotas no dan premio. «Monedas disponibles» conserva el saldo oficial descargado, y «por confirmar» muestra lo ganado en este dispositivo. Ninguna moneda offline se acredita, se gasta ni se envía todavía al servidor. Renovar dentro de esta misma versión conserva la base inicial, la partida y la cola pendiente; no reemplaza todo con una foto nueva mientras hay resultados por validar. Las migraciones entre futuras versiones del motor y la reconciliación con otros dispositivos siguen pendientes.

**Descarga autenticada preparada:** `/api/android/historia` verifica la cuenta mediante `getUser` y usa `export_offline_campaign()` para obtener una foto consistente de puntos, monedas, progreso, acumulados de revancha, estilo y catálogo. No recibe un usuario a elección del cliente, no exporta correos ni sesiones y responde con `no-store`. Compara el catálogo con la construcción local y rechaza discrepancias antes de preparar la cuenta. La función SQL exige una cuenta registrada, rechaza bots y solo permite ejecución a `authenticated`; sus consultas privadas se limitan a `auth.uid()`.

La migración nueva es **`supabase/migrations/20261011092658_offline_campaign_export.sql`**. **No está aplicada a Supabase.** Sin ella, la descarga con una cuenta real explica que falta la actualización del servidor; no muestra una preparación exitosa. Se actualizó la foto en `supabase/schema/` y el soporte local para los datos de sesión; no se modificó ninguna migración anterior.

Cuando el dueño vuelva a tener acceso a la PC, aplicar únicamente esta migración nueva:

1. Abrir el proyecto correcto en Supabase → **SQL Editor** → **New query**.
2. Abrir `supabase/migrations/20261011092658_offline_campaign_export.sql`, copiar todo su contenido y pegarlo en esa consulta.
3. Tocar **Run**. Esta función solo lee el avance; no reinicia Historia ni entrega premios.
4. La prueba con la app requerirá también publicar estos cambios o abrir la versión local: el APK actual abre la web publicada. No se realizó ninguna publicación en esta entrega.

**Pruebas completadas:**

- `npm run check:offline-campaign`: exportación y permisos (sin cuenta, invitado, bot, A/B, datos ausentes), catálogo idéntico al SQL, **59.940 comprobaciones de desbloqueo** en umbrales y condiciones narrativas, **1.650 cálculos de premio** contra `finish_game` real (margen, revancha, topes y repetición), y seis duelos con estilo, cola y dependencias persistibles. La repetición comprueba la función de premios online existente; **no certifica una sincronización offline todavía inexistente**.
- `npm run check:offline-campaign:browser`: navegador Edge con cuentas ficticias, descarga cortada/corrupta, archivos completos y caché sin respuestas privadas; mapa con 15 provincias; cierre/reapertura sin conexión desde `/android`; cinco estados con cantos y declaraciones; mesa completa en **360×640, 393×852, 320×568 y 640×360**. Victoria de Tobías **15–13**, desbloqueo local de Santa Fe y derrota del Olivarero **9–30**, con sus premios/ausencia de premio guardados. Renovación conserva pendientes, dos escritores aceptan solo una revisión, fallo de espacio conserva la jugada anterior y cambio/cierre de cuenta oculta A sin mezclar sus resultados con B. Capturas revisadas en `android/generated/historia-*.png`.
- Regresión del motor: **29.871 transiciones, 11.996 decisiones, 222 partidas y 160 casos tácticos**, iguales al SQL vigente del repositorio. Ocho pruebas PWA, cuatro Android y sus recorridos de navegador aprobados; la mesa online no se modificó.
- Regresión del ensayo anterior: descarga, recuperación de cinco estados, concurrencia, falta de espacio y cuentas aprobados; partidas por pantalla a 15 (**15–13**) y 30 (**19–30**) sin red. Servidor local de Next: API de descarga e identidad devuelve **401/no-store** sin sesión; pantalla/manifiesto públicos devuelven **200** y `/android` redirige al acceso (**307**). Lista de permisos RPC aprobada, incluyendo la función nueva.
- Construcción completa de Next aprobada, incluyendo la API nueva; TypeScript aprobado. Lint conserva siete avisos preexistentes en GameClient/LobbyClient. El catálogo esperado queda incluido en el programa del servidor al construir, sin depender de leer un archivo público fuera del paquete de Vercel.

**Próximo bloque desde remoto:** construir el validador que reconstruye las partidas y el registro de comprobantes únicos, luego sincronizar pendientes con la misma cuenta y recalcular sus premios/desbloqueos desde el progreso oficial. Probar reintentos, respuesta perdida, primera victoria desde dos dispositivos, mezcla online/offline y cadenas dependientes rechazadas. Sigue pendiente el acceso personal y modo avión/cierre forzado en el emulador. Esta entrega no aplicó SQL, no desplegó, no cambió el APK instalado ni confirma todavía la aceptación final de TWA o Google Play.

**Archivos de este bloque:** `src/lib/offline-campaign/{model,storage}.ts`, `src/offline-campaign/{app.ts,historia.html}`, `src/app/api/android/historia/route.ts`, `scripts/offline-catalog.ts`, construcción y las dos comprobaciones `scripts/check-offline-campaign*`, worker y enlace Android. Los archivos públicos de Historia se regeneran en `predev` y `build` y no se versionan.

<a id="historia-diseno-compartido"></a>

##### App con el diseño real de la web — 11/10/2026

**Decisión confirmada por el dueño:** la app debe ser idéntica a la página en apariencia y experiencia. La interfaz verde del ensayo era provisional para probar reglas y almacenamiento; queda reemplazada en Historia completa por las pantallas reales del proyecto. Esta entrega es local: el APK instalado y la web publicada todavía conservan su versión anterior.

**Integración:** `HistoriaScreen` conserva el mapa, posiciones, provincias, retratos, niebla, tutorial, fama, estilo, ranking y ficha de rival de la web. `GameTable` conserva mesa, marcador, cartas, dorsos, avatares, marcos, medallas, accesorios, controles y carteles. Web y offline usan esos mismos componentes, el CSS existente, los seis salones y la fuente real. Los anuncios de cantos y la pausa de los bots también se comparten. La pantalla final usa `FinishScreen`. No se creó otro tema ni otra colección de imágenes para la app.

Con internet, `/android` lleva directamente a `/lobby?android=1`; el marcador mantiene el acceso Android sin invitados. Desde Historia se abre «Jugar sin internet». Sin red, la entrada recupera el paquete descargado como antes. El ensayo aislado de Tobías y el contador siguen disponibles para sus pruebas históricas, sin enlaces en el inicio normal de Android.

**Descarga y presentación propia:** el paquete ahora incluye **147 archivos, 5.958.185 bytes (6 MB)**, más el manifiesto, con CSS, seis salones, texturas de mesa y siete accesorios. La fuente local usa la misma declaración que la web compilada. La API autenticada descarga el nombre, salón, marco, medalla, accesorio y foto del perfil propio en paralelo con la exportación del avance. La foto se guarda dentro del estado privado de esa cuenta, fuera de la caché pública; solo se admite el almacenamiento de avatares propio o Google, tipos de imagen conocidos y hasta 2 MB. Actualizar la presentación conserva la partida abierta y los resultados pendientes. No se necesita otra migración para estos datos del perfil.

**Diferencias funcionales necesarias sin conexión:** «Guardar y salir» conserva el duelo, en lugar de abandonarlo; la descarga y su estado están en un pequeño control del mapa. Los premios locales siguen por confirmar y las reseñas requieren sincronizar. La mesa offline no impone el reloj de desconexión del servidor. El ranking offline refleja la foto descargada y el avance de este dispositivo. Estas diferencias no cambian la estética ni convierten premios locales en saldo oficial.

El juego online conserva las RPC, suscripción a cambios, reloj, control de cartas privadas, chat y validación SQL. El controlador offline conserva el motor ya contrastado con SQL y confirma cada acción únicamente después de guardarla. No se modificaron reglas, funciones del servidor ni migraciones aplicadas.

**Verificación local:**

- `npm run check:offline-campaign:visual`: **48 comparaciones** contra las pantallas originales de la web del commit `2ecd674eaeee0f797a854db544c1a1e02c489f7d`: mapa, provincia, rival, seis salones y tres estados de envido/truco, en los cuatro tamaños indicados abajo. Se exigen iguales geometría, textos, imágenes y estilos; las capturas permiten hasta un nivel medio de color sobre 255 por suavizado del navegador. Se compara en reposo y se excluyen únicamente el control específico de descarga/guardado y la etiqueta de salida. No certifica la interfaz del APK instalado ni una partida online en producción. Capturas en `android/generated/visual-historia/`.
- Campaña en Edge: descarga de los 147 archivos con integridad, mapa completo, cierre y reapertura offline desde `/android`, recuperación de cinco estados, mesa y cantos sin desplazamiento en **360×640, 393×852, 320×568 y 640×360**. Tobías **15–13** con premio en cola y desbloqueo local; Olivarero **9–30** sin premio. Actualización conserva pendientes; concurrencia, falta de espacio y separación de cuentas aprobadas.
- SQL aislado: exportación/permisos, **59.940 desbloqueos**, **1.650 premios**, seis duelos y proyección de fama/estilo/ranking contra las funciones vigentes. Se verificaron también las restricciones de descarga de avatares. La sincronización oficial sigue sin implementar.
- Build completo de Next y comprobación de tipos aprobados. Lint mantiene los siete avisos preexistentes. Ocho pruebas PWA, cuatro Android, permisos RPC y recorridos de navegador PWA/Android aprobados. El build real conserva acceso Android sin invitados, web independiente y rechazo de APIs sin cuenta.

**Pendiente:** validador de partidas y sincronización con comprobantes únicos, prueba con cuenta real y modo avión/cierre forzado en el emulador, integración publicada y aceptación de TWA/Google Play. La migración de exportación indicada en el bloque anterior sigue sin aplicar. No hubo publicación, instalación de un APK nuevo ni cambios en datos de producción.

**Archivos:** componentes compartidos en `src/components/historia/HistoriaScreen.tsx`, `src/components/game/{GameTable.tsx,useGameAnnouncements.ts}` y `src/lib/bot-presentation.ts`; controlador y pantallas en `src/offline-campaign/{app.tsx,OfflineApp.tsx,OfflineGame.tsx,views.ts,historia.html}`; API, avatar privado, construcción y comprobaciones `scripts/check-offline-campaign*`. Los archivos públicos y capturas de prueba se regeneran y no se versionan.

<a id="plan-android-pruebas-de-aceptacion"></a>

<a id="historia-sincronizacion"></a>

##### Validación y sincronización de Historia — 11/10/2026

**Implementado y verificado localmente:** al terminar una partida o recuperar internet, la app envía sus resultados guardados. El servidor reconstruye el reparto, cada jugada humana, cada decisión del bot, marcador y estilo; recién después usa `finish_game` para acreditar el premio vigente. Cada partida deja un comprobante único. Reenviarla devuelve ese comprobante y no suma otra vez puntos, monedas, victorias ni estilo. Esta entrega completa el bloque que figuraba pendiente en las entregas anteriores del mismo día; no está aplicada ni publicada.

**Descarga reconocida por el servidor:** `prepare_offline_campaign()` conserva la foto inicial de la cuenta y devuelve una referencia y una semilla. Cada duelo deriva su reparto de esa descarga y de su número consecutivo. SQL comprueba también las partidas anteriores necesarias para abrir un rival y la configuración/lectura original del bot. No acepta como prueba un saldo ni un premio enviado por el cliente.

**Reglas SQL privadas y versionadas:** `offline_replay_v1` ejecuta una copia de las reglas vigentes dentro de tablas privadas de trabajo; las filas se crean y eliminan en la misma transacción. No usa cartas de partidas online, no publica manos por Realtime y no expone sus tablas ni ayudantes a las cuentas. La instalación compara los cuerpos de 25 funciones con el SQL contrastado del repositorio y se detiene si difieren. Antes de aplicarla a producción, esa comprobación debe pasar contra el servidor real. No se consultó ni modificó la base de producción en este bloque.

Una cadena de 66 duelos encontró un desempate poco frecuente del Noroeste que los ensayos anteriores no alcanzaban: las cuentas exactas del cliente y las divisiones decimales de PostgreSQL podían preferir cartas distintas. El motor offline ahora reproduce los 20 decimales que usa SQL, incluidos los desempates. **Las reglas y decisiones online permanecen iguales.** El paquete actual contiene **147 archivos, 5.961.574 bytes**, más el manifiesto; se regenera al construir.

**Premios y mezcla de dispositivos:** el estado oficial decide si una victoria es primera o revancha. Dos descargas que proyectaban su primera victoria contra el mismo rival reciben una sola entrega de monedas; la segunda victoria válida recibe los puntos de revancha y respeta su tope actual. Los contadores de estilo se agregan por diferencia verificada, preservando lo jugado online. Los locks de estilo/perfil serializan la acreditación por cuenta; `finish_game` incorpora el lock del perfil en su rama de Historia. No cambian fórmulas ni importes.

**Reintentos y guardado:** se envían lotes de hasta diez registros y 2 MB por petición (son límites de transporte, no de partidas jugables). La cola local permanece íntegra hasta confirmar todos los resultados y guardar la foto oficial renovada. Un corte entre lotes, una respuesta perdida, cierre del navegador, falta de espacio o conflicto entre ventanas permite reenviar los mismos identificadores. Un lote inválido no acredita parcialmente sus partidas; el registro rechazado y sus dependientes quedan conservados. Una partida abierta termina con su mismo motor antes de sincronizar. Se comprueba la identidad antes del envío y antes del guardado final; cerrar sesión oculta y conserva los pendientes de su dueño.

Los guardados del prototipo anterior no tienen una descarga reconocida: pueden terminarse y se conservan como ensayos al actualizar la descarga, **sin convertirlos retroactivamente en premios oficiales**. La actualización no borra sus registros. La pantalla final distingue premios pendientes de acreditados y permite ir a la reseña de la partida confirmada. Mapa y mesa siguen usando el diseño compartido.

**Pruebas de este bloque:**

- `check:offline-sync`: 66 rivales por separado y una cadena de 66 duelos con proyección/dependencias, a 15/30 puntos; 18 adulteraciones rechazadas (identidad, cartas, azar, turnos, versión, estilo, configuración, premio y dependencias); reenvío exacto, siete lotes con corte/reintento entre lotes, identificador reutilizado con otro contenido, rollback de un lote, dos dispositivos y victoria online entre descarga/sincronización. La foto devuelta coincide con el saldo ya acreditado. Permisos privados, rechazo de invitado/bot/cuenta ausente, borrado de comprobantes al eliminar el perfil y negativa a instalar reglas distintas. PostgreSQL real aislado mediante PGlite, sin credenciales.
- `check:offline-sync:browser`: Edge → API local de prueba → las funciones SQL reales. Descarga, cierre/reapertura sin red, resultado aceptado con respuestas cortadas (incluido el reintento del navegador), recuperación del comprobante sin duplicar saldo, fallo de escritura y posterior reintento, partida abierta que no se sincroniza a mitad del duelo y cierre de sesión mientras llega una respuesta. La cuenta es ficticia; no sustituye la prueba autenticada contra Supabase.
- Regresión aprobada: **29.871 transiciones, 11.996 decisiones, 222 partidas y 160 casos tácticos** contra SQL; **59.940 desbloqueos y 1.650 premios**, más seis duelos; campaña en Edge con guardado, aislamiento de cuentas y cuatro tamaños; **48 comparaciones visuales** idénticas a la web. Construcción completa de Next y tipos; lint con los siete avisos preexistentes; **98 RPC cliente y siete sólo servidor**. El build real rechaza GET/POST de Historia sin sesión y conserva acceso Android, registro y retorno de autenticación.

**Límites de la verificación:** PGlite ejecuta transacciones de forma secuencial; los casos de dos dispositivos y mezcla online/offline verifican los premios en esos recorridos, pero no certifican concurrencia simultánea contra Supabase. Quedan esa prueba, tiempos del validador con el límite real del servidor y modo avión/cierre forzado en Android. Reconstruir jugadas prueba consistencia y premios; un dispositivo offline contiene el motor y las cartas, por lo que no demuestra que un cliente modificado haya jugado sin inspeccionarlas. La validación no se presenta como un sistema infalible contra trampas. Versiones futuras del motor/catálogo requerirán mantener su validador o una migración comprobada de pendientes.

**Pasos de integración, en este orden (los dos SQL y el primer ensayo autenticado quedaron comprobados el 11/10; resta la matriz Android):**

1. Cuando corresponda integrar el backend, abrir Supabase → **SQL Editor** → **New query**, copiar completo `supabase/migrations/20261011092658_offline_campaign_export.sql` y tocar **Run**.
2. En otra consulta nueva, copiar completo `supabase/migrations/20261011123215_offline_campaign_sync.sql` y tocar **Run**. No reinicia Historia. Si informa «Regla SQL distinta», conservar el mensaje y comparar el servidor antes de continuar; no quitar el control.
3. Usar una versión local accesible por Android o publicar estos cambios cuando el dueño lo indique. El APK instalado abre la web publicada y no incorpora este trabajo por haberlo construido en la PC.
4. Con la cuenta real, descargar Historia, jugar en modo avión, cerrar/retomar y reconectar; verificar una sola acreditación, combinación online/offline y dos dispositivos. Completar después la matriz de navegación, enlaces, notificaciones y viabilidad TWA para Play.

**No se aplicó SQL, no se desplegó ni se instaló otro APK.** Mientras el dueño siga remoto, se pueden continuar los ensayos locales de recuperación, navegación y enlaces Android sin pedirle que use la PC.

**Retoma personal del 11/10/2026:** el dueño volvió a la PC. Se confirmó el arranque completo de `emulator-5580`; Chrome todavía muestra su bienvenida inicial. Se inició la versión de desarrollo con la configuración privada existente en `http://127.0.0.1:3000`, se comprobó respuesta HTTP 200 de la entrada Android y del paquete de Historia y se conectó `localhost:3000` del emulador mediante `adb reverse`. Se abrió el visor Trucazo y se envió a Chrome la dirección `http://localhost:3000/android`. Se prepararon en Codex el primer SQL y el editor del proyecto correcto de Supabase. Las dos migraciones continúan pendientes; no se hizo login ni descarga con cuenta real. Completar personalmente la bienvenida y el ingreso, aplicar los dos SQL en el orden indicado y continuar la prueba. Durante el ensayo sin conexión hay que quitar el puente `adb reverse`: el modo avión por sí solo no corta esa conexión por USB con la PC. Este acceso local sirve para probar el navegador Android; el APK instalado sigue apuntando a la web publicada.

**Archivos:** migración nueva y foto de `supabase/schema/`; API `src/app/api/android/historia/route.ts`; modelo, guardado y envío en `src/lib/offline-campaign/`; controlador/pantallas en `src/offline-campaign/`; precisión del bot en `src/lib/offline-trial/bots.ts`; comprobaciones `scripts/check-offline-sync*` y su base aislada en `scripts/offline-sync-fixture.ts`. docs/android.md conserva la continuidad de Android; README.md orienta hacia los demás temas.

**Integración iniciada el 11/10/2026:** el dueño confirmó **Success** al ejecutar manualmente `20261011092658_offline_campaign_export.sql` en el editor SQL de Supabase. Se preparó el segundo archivo, `20261011123215_offline_campaign_sync.sql`, para ejecutar en una consulta nueva. Su aplicación y el ensayo con cuenta real siguen pendientes. La confirmación de la primera actualización proviene del dueño; todavía no se verificaron las RPC con una sesión real en Android.

Al ejecutar el segundo SQL, el editor mostró el aviso «Potential issues detected», con operaciones destructivas y tablas sin RLS. Se revisó el archivo: activa RLS para todas las tablas nuevas mediante el bloque dinámico `do $security$`, revoca el acceso directo a su esquema privado y sólo incluye borrados dentro de la función que limpia sus datos temporales de validación. No ejecuta un borrado de progreso al aplicar la migración. Para este archivo completo elegir **Run without RLS**: conserva el SQL preparado, que ya incluye su propia protección. La aplicación sigue pendiente hasta confirmar el resultado.

**SQL aplicado y comprobación contra Supabase, 11/10/2026:** el dueño confirmó **Success** también para `20261011123215_offline_campaign_sync.sql`. Esto completa los pasos 1 y 2 y supera el control de coincidencia de las 25 reglas SQL incluido en la migración. Se comprobó por la API real, usando sólo la clave pública y sin sesión, que `prepare_offline_campaign` y `sync_offline_campaign` existen y responden 401/42501 por falta de permisos; el esquema privado `offline_replay_v1` responde 406/PGRST106 porque no está expuesto. Estas consultas no crearon partidas ni premios. El servidor local responde, el puente al emulador sigue activo y el visor Trucazo está abierto; Chrome continúa en su bienvenida. Próximo: completar personalmente esa bienvenida, entrar a `http://localhost:3000/android` con la cuenta real y descargar Historia. Todavía no se hizo ese ingreso ni se verificaron descarga, premios o recuperación real en Android. No hubo publicación ni cambio de APK.

**Teclado y recuperación del visor, 11/10/2026:** el dueño informó cierres al intentar escribir `@` con combinaciones de Q. En la comprobación posterior ya no estaban Android, el visor ni el servidor local. Se actualizaron sólo las opciones de scrcpy en el iniciador existente `trucazo-entorno/iniciar-trucazo.ps1`: `--shortcut-mod=lsuper` reserva los atajos del visor para la tecla Windows y `--prefer-text` envía letras como texto para evitar interferencias al escribir caracteres especiales. La ayuda de scrcpy confirma ambas opciones y el iniciador pasó su comprobación de sintaxis. Se recuperaron el arranque completo de Android, la ventana Trucazo, el servidor local con HTTP 200 y el puente `localhost:3000`; se volvió a abrir la entrada Android local. No se reinstaló ni se borró el emulador. Indicar **AltGr + Q** en un teclado latino (Alt derecho); la prueba personal de escritura e ingreso sigue pendiente.

**Bloqueo de Android recuperado, 11/10/2026:** ante el aviso del dueño, el registro de Android mostró un SIGSEGV en `system_server`, dentro de `MotionEvent_obtainAsCopy`, y scrcpy registró `DeadSystemException` al inyectar eventos táctiles. Android reinició sus servicios y volvió a la pantalla principal; no se confirmó la causa inicial. Se reconectó sólo el visor, conservando el emulador, y se abrió de nuevo la entrada local. Se comprobaron la ventana Trucazo respondiendo, HTTP 200, la pantalla real de login y un desplazamiento táctil que dejó visible **Continuar con Google**, sin nuevos errores del visor durante esa comprobación. El ingreso personal y la estabilidad prolongada siguen pendientes. No se borraron datos ni se modificó el juego. Referencia del error: [Android Developers — DeadSystemException](https://developer.android.com/reference/android/os/DeadSystemException).

**Primer ensayo autenticado en Android, 11/10/2026:** el dueño ingresó personalmente con su cuenta de prueba existente **testin**. La API real descargó 15 provincias y 66 rivales; la cuenta empezó con 960 monedas y cero puntos de Historia. Se abrió Tobías, se guardó tras su primera carta, se activó modo avión, se apagaron Wi-Fi/datos y se retiró `adb reverse` para cortar también el puente con la PC. Se forzó el cierre nativo de Chrome y se reabrió el paquete guardado. El contenido completo de la partida mantuvo el mismo SHA-256, `navigator.onLine` fue falso y la API resultó inaccesible. Se continuó desde la interfaz normal, sin adelantar los tiempos del bot ni usar sus cartas para elegir jugadas. La victoria **16–8**, con 70 acciones registradas y cantos de envido/truco, quedó pendiente offline; al reconectar Supabase validó el registro y emitió un comprobante: **50 monedas y 22 puntos**, saldo oficial 1.010/22 y cero partidas pendientes. El mapa pasó a 1/6 en Buenos Aires. El primer intento automático de medir una respuesta cortada terminó antes del envío; esa sincronización sí llegó al servidor y se confirmó normalmente. Se inició una revancha separada para verificar el corte/reintento sin confundirlo con este resultado.

**Altura de la pantalla corregida durante ese ensayo:** la clase `min-h-screen` del cuerpo imponía 568 px con sólo 512 px disponibles cuando Chrome mostraba sus barras. Los controles de la mesa entraban, pero el documento dejaba una franja vacía y permitía desplazamiento. Se cambió por `min-h-dvh` en la entrada offline y en el layout compartido de la web. El ensayo real midió documento y viewport iguales, **360 × 512**, con cartas y todos los botones dentro de pantalla; la entrada online respondió 200 con la misma clase. No se ocultan ni recortan controles. Se regeneró el paquete: **147 archivos, 5.961.571 bytes**, digest `8c762ac0d9890e47c6d057fecedc5eaf7b3f680e69f742158bef2deddfbbe678`. Actualizar la descarga conservó intacta la partida ya abierta. La prueba usa Chrome Android con el servidor local; todavía no certifica el APK publicado, TWA ni un teléfono físico. La evidencia queda en `android/generated/ensayo-real-*`, fuera de Git. No hubo publicación ni otro APK.

**Corte de respuesta, reenvíos y regreso online comprobados, 11/10/2026:** la revancha también sobrevivió al cierre nativo sin red con el mismo estado, y terminó en derrota **12–16**, con 83 acciones. Se dejó que el servidor aceptara su registro y se cortó la respuesta 200 antes de entregarla a la app. La reconexión provocó un reintento automático: se recibió el mismo comprobante, la cola quedó en cero y existe un solo comprobante local de esa partida. El observador de pruebas esperaba un botón de reintento manual que ya había desaparecido por esa confirmación automática; se contrastó el guardado real y el comprobante contra la respuesta interceptada para verificar el resultado. Además se reenviaron **dos veces la victoria original** por la API autenticada: las dos devolvieron su mismo comprobante de 50 monedas/22 puntos y conservaron exactamente saldo, progreso y contadores de estilo. Saldo final oficial y local: **1.010 monedas y 22 puntos**, con dos partidas distintas confirmadas. Los POST reales de aceptación tardaron 678 ms y 988 ms en este ensayo; esto verifica duelos individuales, no el tiempo máximo de un lote de diez.

Se volvió al lobby online desde Android y se abrió Historia por su enlace normal: ambas pantallas cargaron y la campaña mostró el mismo saldo y avance confirmado. El cuerpo de la página online usa también `min-h-dvh`. El visor no registró nuevos errores durante los dos duelos; no sustituye una prueba prolongada ni la comprobación final en un teléfono físico. Chrome quedó en Historia online, con la cuenta testin y la conexión restaurada. Evidencia principal: `android/generated/ensayo-real-reintento-android.json`, `ensayo-real-online.json` y capturas del resultado, mesa y mapa. **Próximo, definido después de este ensayo:** comenzar la prueba instalada de [Capacitor](#capacitor), reutilizando estos resultados y verificando navegación/Atrás, suspensión/cantos, enlaces, actualizaciones, mezcla online/offline y dos dispositivos dentro de la nueva app. Push requiere integración nativa. Este bloque completa el primer ensayo jugable con guardado real y premios contra Supabase. No hubo publicación, nueva migración ni cambio de APK.

##### Pruebas de aceptación

- Descargar con una cuenta, cerrar, activar modo avión y abrir Historia desde el icono Android.
- Completar victorias y derrotas a 15 y 30; probar envido, falta envido, truco, mazo y casos de parda vigentes.
- Cerrar durante un canto, después de una carta y antes/después de una respuesta del bot; reabrir con el mismo estado y sin acciones duplicadas.
- Desbloquear rivales localmente respetando puntos y rival requerido; probar revanchas y sus acumulados.
- Cortar descarga/guardado y simular falta de espacio: conservar la versión completa y el último guardado confirmado.
- Reconectar, perder la respuesta del servidor y reintentar varias veces: un resultado produce un solo comprobante y una sola acreditación.
- Ganar al mismo rival en dos dispositivos; combinar campañas online y offline; respetar primera victoria única y topes de revancha.
- Probar sesión vencida y cambio de cuenta; ningún resultado de A llega al saldo de B.
- Alterar cartas, turnos, premio, identidad o versión del registro: impedir acreditaciones inválidas y conservar el diagnóstico.
- Actualizar con una partida abierta y resultados pendientes: conservarlos o migrarlos sin pérdida.

<a id="plan-android-referencias-del-repositorio-revisadas"></a>

##### Referencias del repositorio revisadas

- [Plan, decisiones, pruebas e Historia sin internet](#plan-android): decisiones confirmadas, estado Android y alcance offline.
- `src/app/historia/page.tsx` y `HistoriaClient.tsx`: mapa autenticado y creación actual del duelo mediante RPC.
- `public/sw.js`, `public/offline.html` y `src/lib/android-entry.ts`: recuperación y prueba de almacenamiento actuales.
- `supabase/migrations/20260705_campana_provincias_1_backend.sql`: premios y topes de revancha.
- `supabase/migrations/20260817_campana_ruta_patagonica.sql`: mapa, puntos y rival requerido para desbloqueos.
- `supabase/migrations/20260923121000_campana_noroeste_estrategia.sql`: bot y estrategias vigentes.
- `supabase/migrations/20260923160014_campana_noroeste_tactica_verificada.sql`: corrección posterior de los ayudantes tácticos del Noroeste.
- `supabase/tests/tercera_parda.sql` y `scripts/sim.ts`: casos de reglas que hay que contrastar con el motor local.

La revisión fue de código y documentación locales. No se modificaron partidas, monedas, configuración de Supabase ni despliegues.

La estimación anterior de 5–7 PRs adicionales es histórica y orientativa; requiere revisión según el trabajo ya terminado y la prueba de [Capacitor](#capacitor) aceptada el 11/10. Puede solaparse con acceso, recuperación, empaquetado y push; no sumarla como un presupuesto cerrado ni volver a tratar Capacitor como una decisión pendiente.

<a id="plan-android-trabajo-de-codigo-y-pruebas-en-computadora"></a>

#### Trabajo de código y pruebas en computadora

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

<a id="plan-android-push-incluidas-en-el-lanzamiento"></a>

#### Push — incluidas en el lanzamiento

**Estimación orientativa: 2 PRs adicionales.** Uno para permisos, suscripciones, baja y entrega; otro para eventos, preferencias y pruebas con app cerrada. Propuesta inicial de eventos, todavía no aprobada en detalle: check-in de torneo, cruce listo e invitación. Definir categorías, frecuencia y enlaces; no activar por defecto campañas promocionales no acordadas. El jugador puede denegar el permiso y seguir jugando. Evitar duplicados y envíos vinculados a una cuenta tras cerrar sesión. No se consideran resueltas por los emails actuales. Validar el flujo en el empaquetado elegido. [Referencia Android](https://developer.android.com/reference/androidx/browser/trusted/TrustedWebActivityService).

<a id="plan-android-otros-opcionales"></a>

#### Otros opcionales
- **Cobros, anuncios o suscripciones:** nueva evaluación de producto, políticas e integración antes de estimar.
- **App Store:** planificación específica para iOS.

<a id="plan-android-soporte-paises-y-publico-objetivo"></a>

#### Soporte, países y público objetivo

**Soporte** significa un canal privado y atendido para que los jugadores informen problemas de acceso, errores, denuncias o dudas. No requiere contratar personal ni un sistema de tickets para empezar. Propuesta: usar `hola@trucazo.com.ar` si el dueño recibe y responde ahí; de lo contrario, elegir otra casilla. Probar recepción y respuesta antes de publicarla. Google exige un correo de contacto para la app; el teléfono de verificación de la cuenta no es lo mismo que ofrecer atención telefónica a jugadores. [Soporte oficial](https://support.google.com/googleplay/android-developer/answer/113477?hl=en).

**Identidad:** el nombre indicado es Santiago Barbeira Papalia. Si publica como persona y no mediante una entidad, evaluar cuenta personal y confirmar esa titularidad en el alta. El nombre de desarrollador puede diferir del legal, pero Google verifica identidad y muestra determinados datos legales y de contacto; no prometer anonimato ni que elegir una marca oculte esos datos. La cuenta no está creada. [Información requerida](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).

**Países:** se registra la intención de publicar mundialmente, en los países donde Play permita distribuir la app y se cumplan los requisitos aplicables. No se decidió una traducción ni atención multilingüe. Revisar especialmente privacidad y tratamiento de menores antes de marcar todos los mercados; disponibilidad mundial no equivale a aprobación universal automática.

**Edades: propuesta, no decisión cerrada.** El dueño sugirió 14–65. Recomiendo no fijar un máximo de 65: permitir también adultos mayores y conservar la interfaz legible. Como producto, 14 años en adelante puede mantenerse como propuesta, condicionada a revisar protección de menores, chat, datos y contenido reales antes de fijar la edad mínima.

Play Console utiliza franjas, entre ellas 13–15, 16–17 y 18 o más, no un selector exacto «14–65». Declarar los grupos realmente contemplados no implementa por sí solo una restricción de edad de 14 años. La clasificación del contenido se obtiene por separado mediante el cuestionario; no puede prometerse una clasificación determinada solo por elegir un público. Las reglas relativas a menores varían según el país. No marcar solo adultos para evitar obligaciones si en realidad se pretende admitir adolescentes. Fuentes consultadas el 08/10/2026: [público objetivo](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en), [clasificación de contenido](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en).

<a id="plan-android-decisiones-que-todavia-faltan"></a>

#### Decisiones que todavía faltan

1. Correo de soporte atendido: confirmar si será `hola@trucazo.com.ar` y quién revisará mensajes y denuncias.
2. Edad mínima final y público declarado, después de revisar chat, datos y contenido. Propuesta inicial: 14+ sin máximo, no aprobada todavía.
3. Tipo de cuenta de Play Console según la titularidad real; completar luego alta, verificación y datos de contacto. El nombre ya fue indicado; no volver a preguntar si existe cuenta.
4. Eventos concretos de push y preferencias: proponer un alcance acotado para lanzamiento. Su inclusión ya está aprobada.
5. Identificador definitivo de aplicación; la propuesta `ar.com.trucazo.app` sigue sin confirmar. PR 1B usa `ar.com.trucazo.prototype` hasta esa decisión; el dueño pidió explicación antes de decidir.

La elección de empaquetado, formato de guardado, validación de recompensas y resolución de conflictos son trabajo técnico a proponer con evidencia del repo. No exigir que el dueño elija herramientas o algoritmos sin explicar las consecuencias.

<a id="plan-android-instrucciones-para-la-proxima-sesion"></a>

#### Instrucciones para la próxima sesión

1. Leer este documento y las instrucciones `AGENTS.md` del repositorio, empezando por el estado actual, el [plan Android por sesiones](#android-etapas-finales), la etapa solicitada y sus traspasos; consultar [Capacitor](#capacitor) como punto de partida. Trabajar en `C:\Users\santy\Desktop\proyectos\trucazo` y respetar los cambios locales sin guardar en Git; no reemplazarlos por una copia de `master`.
2. Comparar las etapas con lo ya integrado. Localizar la eliminación de cuentas implementada y registrar PR/commit, rutas y documentación encontrados, sin reconstruirla ni ejecutar SQL por duplicado. Distinguir siempre código integrado de despliegue verificado.
3. Tomar como definitivas las decisiones de alcance de esta versión: campaña offline desde lanzamiento, descarga inicial online, sincronización, cuenta obligatoria en Android y push. No volver a hacer esas mismas preguntas.
4. Reutilizar motor de los 66 rivales, mapa, mesa, recursos, identidad local, guardado, API y validador SQL. Las dos migraciones de Historia están aplicadas y el ensayo autenticado en Chrome Android comprobó cierre/retoma y premios sin duplicación. Capacitor ya tiene Historia/guardado sin red aceptados en 04; su sincronización queda para 06. No repetir el desarrollo ni pedir nuevamente que se elija el empaquetado.
5. La implementación fue autorizada el 09/10/2026 y la prueba de Capacitor fue aceptada el 11/10. ANDROID-01/02 se cerraron el 12/10; ANDROID-03/04/05 el 13/10 con cuentas reales, guardado propio y 1v1 app↔web/bots; ANDROID-06 el 14/10 con sincronización real, ANDROID-07 con alta, Google, recuperación y enlaces aceptados, ANDROID-08 el 15/10 con perfil/economía/personalización e Historia y ANDROID-09 con parejas app/web, bots, chat y recuperación. Primera pendiente ANDROID-10. Cada sesión se dedica exclusivamente a su etapa hasta cerrarla; no pasar pendientes a otra por iniciativa del agente ni enviar el texto final antes. Los pasos personales deben ser concretos y resolverse en la misma sesión. La publicación pertenece a ANDROID-20.
6. Mantener el diseño actual, mesa completa sin scroll y diseño 2vs2 sin cambios no solicitados. Chat escrito en 1v1/2vs2 con personas o bots, bots sin escribir y campaña sin chat escrito. Explicar instrucciones sin asumir conocimientos de programación.
7. Al cerrar cada etapa, actualizar aquí su estado y evidencia: PR/commit real, pruebas ejecutadas, SQL o configuración pendientes y próximo paso. No presentar pruebas no realizadas como aprobadas.

<a id="plan-android-texto-para-iniciar-la-proxima-sesion"></a>

##### Texto para iniciar la próxima sesión

> Estamos en la etapa ANDROID-06 de Trucazo, empezá a llevarla a cabo. El proyecto está en C:\Users\santy\Desktop\proyectos\trucazo. Leé AGENTS.md, el estado actual, el plan «Android final: etapas para trabajar en sesiones distintas» y el último traspaso de docs/android.md del 13/10. Primero comprobá la partida abierta y los cuatro resultados pendientes de testin antes de conectar la sincronización a la sesión propia del APK. Ejecutá el alcance y pruebas de 06, reutilizando API, motor y migraciones ya aplicadas y conservando cambios locales, TWA, Chrome y guardados separados. No borres pendientes hasta guardar su confirmación ni reinicies la partida por actualizar versiones/saldo. Registrá estado, evidencia y traspaso en docs/android.md. Explicame en español simple y no publiques todavía.

<a id="plan-android-registro-de-actualizacion"></a>

##### Registro de actualización

- **28/09/2026:** revisión original de repositorio y plan de siete etapas.
- **08/10/2026:** PR 4 marcado como implementado por confirmación del dueño; seis etapas base restantes sujetas a revisión; incorporadas las decisiones pendientes de campaña offline, la separación entre trabajo de código y pruebas Android y las instrucciones de retoma. Solo se actualizó este documento.
- **08/10/2026, decisiones posteriores:** confirmados offline desde la primera versión, descarga inicial online, sincronización, cuenta obligatoria Android y push en lanzamiento; Play Console por crear, nombre Santiago Barbeira Papalia y distribución mundial. Público 14–65 recibido como propuesta, con recomendación de no fijar máximo; soporte pendiente. Actualizadas instrucciones de retoma para no repetir preguntas ya respondidas. No se modificó código, no se creó cuenta externa ni se publicaron datos.
- **09/10/2026:** el dueño pidió comenzar. Contrastado `master` en `d4aef04`; registrada eliminación del PR #101 y desempate del PR #104. Base web PR 1A abierta como [PR #106](https://github.com/santibpapa/trucazo/pull/106), código `e3f3a1f`, con las pruebas registradas arriba. Separado su cierre del prototipo Android PR 1B, motor, bots, descarga y sincronización. No se aplicó SQL ni se publicó en Play.
- **09/10/2026, segunda etapa:** confirmado merge de #106 en `250acfa`; abierto [PR #108](https://github.com/santibpapa/trucazo/pull/108), implementación `074ada7`, con generación Android, cuenta, asociación por certificado real y prueba aislada de guardado/push. APK debug y AAB construidos; firma y metadatos comprobados. Paquete provisional porque no se confirmó identificador definitivo. Actualizada la retoma y los pasos externos en [Construcción del APK y pruebas Android](#construir-android). Sin SQL, configuración productiva, instalación en teléfono ni publicación en Play.
- **11/10/2026, decisión posterior al ensayo real:** el dueño aceptó comenzar con Capacitor y pidió dejar la preparación anotada. Agregado el capítulo vigente con reutilización del trabajo de Historia, adaptaciones de acceso/recursos/guardado/push, proyecto separado propuesto, orden y criterios de las pruebas instaladas. Comprobado WebView 83 en el emulador: actualizar Chrome a 124 no lo actualizó. Aclarados estado actual, historial TWA y texto de retoma. Sólo documentación y comprobaciones de lectura; sin paquetes instalados, proyecto Capacitor, APK nuevo, cambios de servidor ni publicación.
- **11/10/2026, plan por sesiones:** a pedido del dueño, analizados repositorio y requisitos actuales de Android/Play y agregado el plan ANDROID-01 a ANDROID-20, con dependencias, alcance, verificaciones, cierre, matriz global y traspaso obligatorio. Primera pendiente 01; candidato entregable al cerrar 17 y publicación al cerrar 20. Sólo análisis/documentación, sin comenzar etapas de implementación ni modificar producción.

</details>

<a id="construir-android"></a>

### Construcción del APK y pruebas Android

Procedimientos técnicos del **prototipo TWA anterior**, conservados como referencia. Para el nuevo trabajo seguir [Capacitor](#capacitor); estos comandos Bubblewrap no construyen la nueva app. Confirmar configuración y aplicación previa de cambios antes de repetir pasos externos.

Procedencia anterior: `android/README.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Construcción del APK y pruebas Android</summary>

<a id="construir-android-prototipo-android-pr-1b"></a>

### Prototipo Android — PR 1B

Este proyecto sirve para decidir con pruebas si TWA cubre Trucazo. **Todavía no es la versión para publicar en Play.** La entrada es `https://www.trucazo.com.ar/android`, con cuenta existente o nueva. La web conserva invitados en sus otras pestañas.

El identificador `ar.com.trucazo.prototype` es temporal. El dueño pidió una explicación antes de decidir el definitivo; no se tomó ese pedido como aprobación de `ar.com.trucazo.app`. Cambiarlo antes de publicar requiere generar otro APK y asociar su certificado.

<a id="construir-android-que-esta-preparado"></a>

#### Qué está preparado

- Bubblewrap Core **1.27.0**, fijado con su lockfile separado en `tools/`. Sus dependencias no se instalan en los PRs habituales de la web.
- Generación desde `twa-manifest.json` y el icono versionado de Trucazo. No descarga iconos ni configuración de un despliegue mutable.
- Gradle **8.11.1**, plugin Android **8.9.1** y Android Browser Helper **2.7.4**, versiones del generador fijado. Compilación/objetivo **API 36** y mínimo **API 24 (Android 7)**: la biblioteca exige ese mínimo. Confirmar requisitos de Play nuevamente al publicar.
- Delegación de notificaciones y permiso `POST_NOTIFICATIONS`. Fallback a pestaña de navegador si el proveedor no admite TWA; no se usa WebView como arquitectura de producción.
- `/.well-known/assetlinks.json`: genera asociaciones únicamente a partir de huellas reales configuradas. Sin configuración devuelve `[]`, no inventa un certificado.
- Entrada validada con `getUser()` en el servidor: una sesión anónima no puede acceder a `/android`. Marcador por pestaña para ocultar invitados/instalación redundante y volver a `/android` al acceder con contraseña o Google. No usa un cookie global para prohibir invitados en toda la web. No modifica permisos/RPCs de la web.
- Prueba optativa de administración `/android/probe.html`: preparación completa, contador ficticio en IndexedDB, solicitud de almacenamiento persistente, reapertura offline y notificación push de prueba. No guarda tokens, no da puntos y no descarga una campaña jugable.
- Workflow limitado a cambios de Android o ejecución manual, con APK debug, AAB **sin firma de publicación** y asociación del certificado de esa construcción. Las compilaciones de GitHub usan certificados debug efímeros: su huella puede cambiar en cada ejecución.

Los enlaces de correo externos, recuperación de contraseña, regreso a torneos/partidas, comportamiento de Atrás, suspensión y reconexión completos siguen en PR 2/3. La verificación de Google en una TWA real sigue pendiente aunque el retorno esté preparado. No hace falta modificar el manifest web para cambiar la identidad nativa; la PWA existente conserva `id: '/'`.

<a id="construir-android-construir-en-computadora"></a>

#### Construir en computadora

Requisitos: Node 20+, **JDK completo 17 (con `javac`, no solo Java para ejecutar)** y SDK de Android. Instalar mediante Android Studio el SDK Platform 36 y Build Tools 35.0.0; aceptar sus licencias. Configurar `ANDROID_HOME` con la carpeta del SDK y `JAVA_HOME` con la del JDK. Nunca copiar certificados privados al repositorio.

Desde la carpeta del repositorio:

```sh
npm ci --prefix android/tools
node android/tools/generate.mjs
```

En Linux/macOS:

```sh
bash android/generated/gradlew -p android/generated assembleDebug bundleRelease --no-daemon
node android/tools/certificate.mjs
```

En Windows PowerShell, la segunda parte es:

```powershell
.\android\generated\gradlew.bat -p android/generated assembleDebug bundleRelease --no-daemon
node android/tools/certificate.mjs
```

Resultados:

| Archivo | Uso |
| --- | --- |
| `android/generated/app/build/outputs/apk/debug/app-debug.apk` | Instalar el prototipo en un Android de prueba. |
| `android/generated/app/build/outputs/bundle/release/app-release.aab` | Verificar construcción del bundle; no subir a Play sin firma/publicación de PR 7. |
| `android/artifacts/assetlinks-debug.json` | Asociación extraída del certificado real del APK generado, después de verificar su firma. |

`generated/`, `artifacts/`, APKs y claves quedan fuera de Git. No editar el proyecto generado: cualquier cambio propio debe hacerse en la configuración o generación. El certificado debug local se conserva normalmente en `~/.android/debug.keystore`; borrarlo o cambiar de computadora cambia la huella. El certificado de carga y el de **Play App Signing** serán distintos y se configuran al publicar.

<a id="construir-android-asociar-el-dominio-para-la-prueba"></a>

#### Asociar el dominio para la prueba

**Aclaración del dueño, 11/10/2026:** quiere entrar desde el ícono de Trucazo y ver la app a pantalla completa, sin abrir manualmente Chrome ni ver su barra. El ensayo autenticado de Historia usó Chrome explícitamente para acceder a la versión local y no certificó esa entrada instalada. La arquitectura candidata TWA utiliza un navegador compatible internamente; su apariencia a pantalla completa requiere comprobar la asociación del sitio y el certificado real del APK. Priorizar esa prueba como próximo paso y explicar esta diferencia antes de dar el empaquetado por resuelto. El prototipo sigue apuntando al sitio publicado; no cambiarlo a una dirección local como si fuera una entrega final. Referencia: [Chrome — Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/).

La comprobación pública del 11/10/2026 volvió a devolver **HTTP 200 con `[]`** en `https://www.trucazo.com.ar/.well-known/assetlinks.json`: la asociación del certificado continúa pendiente. No se modificó la configuración publicada durante esta revisión.

Después de integrar y desplegar el código web:

1. Ejecutar la construcción y `certificate.mjs`, o descargar `assetlinks-debug.json` del workflow correspondiente al APK que vas a instalar.
2. Copiar la huella con formato `AA:BB:…` de `sha256_cert_fingerprints`. Es un dato público; no es una contraseña ni la clave privada.
3. En Vercel, proyecto Trucazo → Settings → Environment Variables, crear **`ANDROID_SHA256_FINGERPRINTS`** con esa huella en el entorno que atiende `www.trucazo.com.ar`. Para varias huellas de prueba, separarlas con comas.
4. Volver a desplegar. Abrir `https://www.trucazo.com.ar/.well-known/assetlinks.json`: debe mostrar `ar.com.trucazo.prototype` y exactamente la huella del APK. Debe responder HTTP 200, JSON y sin redirección hacia otro dominio.
5. Instalar ese APK. Comprobar que la app abre sin barra de direcciones dentro de `www.trucazo.com.ar`. Google u otros sitios externos pueden abrir una pestaña de navegador.

El APK abre **www**, que es el origen configurado actualmente. No alcanza con asociar únicamente `trucazo.com.ar` si redirige a www. Para un preview se debe preparar un host propio no protegido, cambiar `host` y regenerar; no se asume que una URL de preview sea el mismo origen.

<a id="construir-android-configurar-una-notificacion-real-de-prueba"></a>

#### Configurar una notificación real de prueba

No hay suscripciones guardadas en el servidor ni eventos de torneos/promoción habilitados. La API exige usuario registrado y `profiles.is_admin`, verifica origen en POST y solo permite endpoints de FCM/Chrome. El contenido y destino de la notificación son fijos. El envío aceptado por FCM **no demuestra recepción**; hay que verla en el Android.

1. Desde el repositorio ejecutar `npx web-push generate-vapid-keys --json`. Genera dos claves de prueba. Mantener la privada fuera de Git y de capturas públicas.
2. En Vercel → Settings → Environment Variables del entorno de prueba, crear:

   | Variable | Valor |
   | --- | --- |
   | `ANDROID_PROBE_VAPID_PUBLIC_KEY` | Valor de `publicKey` generado. |
   | `ANDROID_PROBE_VAPID_PRIVATE_KEY` | Valor de `privateKey` generado; marcar como secreto. |
   | `ANDROID_PROBE_VAPID_SUBJECT` | `https://www.trucazo.com.ar/contacto` para esta prueba. |

3. Volver a desplegar. En el APK, entrar con la cuenta administradora y abrir **Pruebas del prototipo**.
4. Tocar **Preparar con conexión** y después **Permitir notificaciones de prueba**. Denegar el permiso no impide jugar. Tocar **Enviar notificación** y verificar que aparece realmente; tocarla debe abrir la pantalla de prueba.
5. Para probar con la app cerrada, guardar el archivo de suscripción desde el Android y pasarlo privadamente a una computadora propia. Cerrar la app. En esa computadora, entrar con la cuenta administradora a `https://www.trucazo.com.ar/android/probe.html`, seleccionar ese archivo y tocar **Enviar al dispositivo del archivo**. Verificar recepción y apertura en el Android cerrado.
6. Tocar **Dar de baja esta prueba** al terminar. El logout observado por el runtime Android también intenta retirar la suscripción y el guardado de prueba. Borrar el archivo privado de suscripción. No usar esta API para notificaciones de producción; las suscripciones por cuenta, preferencias, bajas y eventos se implementan en el bloque push.

La pantalla estática puede abrir sin red tras preparación; no es un panel autorizado para consultar información administrativa. Solo las APIs online comprueban el permiso del administrador. El contador y el identificador local son ficticios/no autoritativos, no un formato final de campaña. No se pide permiso ni se suscribe automáticamente a jugadores al abrir Trucazo.

<a id="construir-android-matriz-de-aceptacion-en-android"></a>

#### Matriz de aceptación en Android

Usar un dispositivo de prueba y registrar versión de Android/Chrome, huella del APK, commit web y resultado. **No marcar TWA como elegida hasta completar esta matriz.**

| Prueba | Resultado requerido |
| --- | --- |
| Abrir con sesión anónima existente | Login/registro, sin entrada de invitado. Otra pestaña web conserva invitados. |
| Contraseña y Google | Cuenta correcta y acceso al lobby. Error de OAuth regresa al acceso Android. |
| Preparar contador | Solo se anuncia listo tras descargar ambos archivos y completar IndexedDB. |
| Modo avión y reapertura desde icono | Pantalla local con el último contador; admite guardar más cambios sin Supabase. |
| Cerrar proceso y reiniciar teléfono | El contador preparado sigue disponible. Registrar si el navegador concedió persistencia. |
| Volver a internet | Entrada normal y pruebas operativas, sin reemplazar APIs por HTML cacheado. |
| Cambiar cuenta/salir | No reutilizar contador de otra identidad; limpiar prueba al salir. Regresión instalada pendiente. |
| Denegar notificaciones | Se puede seguir jugando. |
| Enviar con app abierta/cerrada | Notificación visible en Android y apertura del destino fijo. |
| Asociación | Sin barra del navegador en el origen verificado. |
| Primer arranque sin preparación y sin internet | Necesita conexión inicial; no prometer campaña ni guardado existentes. |

Si no conserva la entrada/guardado, no delega permisos o no recibe push correctamente, registrar el caso y reevaluar Capacitor antes de avanzar el paquete definitivo. El almacenamiento persistente puede ser denegado y no protege de borrar datos/desinstalar. La campaña offline completa y sincronización de recompensas siguen pendientes.

<a id="construir-android-pruebas-automatizadas"></a>

#### Pruebas automatizadas

```sh
npm ci
npm run check:pwa
npm run check:android
npx playwright install --with-deps chromium
npm run check:pwa:browser
npm run check:android:browser
```

Después de `npm run build` con las claves ficticias habituales de CI, `npm run check:android:app` comprueba el build real de Next sin sesión: acceso Android sin invitado, otra pestaña web con invitado, enlace de registro, callback seguro, asociación vacía sin configuración y API de pruebas rechazada sin administrador. No inicia sesión ni envía mensajes a un servicio real.

Si Chromium ya está disponible, `PWA_BROWSER_EXECUTABLE` permite señalar su ejecutable. La prueba Android de navegador usa la pantalla real y una API de identidad ficticia; demuestra preparación, reapertura y guardado, **no Supabase real, un APK instalado ni entrega por FCM**. Las pruebas unitarias comprueban asociación, URLs de push, contexto por pestaña y comportamiento del worker. Tipos, lint y build de Next se verifican con el CI habitual.

Fuentes técnicas: [TWA y asociación](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap/blob/main/packages/cli/README.md), [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper), [Web Push](https://github.com/web-push-libs/web-push).

</details>


<a id="estado-pc"></a>

## Esta PC y cómo retomar

El entorno fue preparado el 10/10/2026. La virtualización, el arranque de Android 11, Chrome compatible y la instalación del APK quedaron comprobados. El 11/10 el dueño ingresó personalmente con testin; la versión local completó la descarga, recuperación sin red y un duelo validado por Supabase en ese Android. Continúa la matriz de pruebas de la app.

<a id="retoma-anterior"></a>

### Retoma y evidencia del equipo anterior

Registro del traslado desde la PC anterior. No volver a descargar ni preparar lo que ya está listo en esta PC.

Procedencia anterior: `RETOMAR_TRUCAZO.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Retoma y evidencia del equipo anterior</summary>

<a id="retoma-anterior-retomar-trucazo-desde-github"></a>

### Retomar Trucazo desde GitHub

Estado al 10 de octubre de 2026. Leer este archivo y `AGENTS.md` antes de continuar. El dueño no programa: explicar en español simple y realizar la preparación técnica.

<a id="retoma-anterior-objetivo-y-proxima-tarea"></a>

#### Objetivo y próxima tarea

Trabajar localmente hasta preparar la versión final para Google Play. El dueño autorizó guardar en GitHub los cambios y este resumen para continuar en otra computadora. La publicación en Google Play sigue pendiente.

Descargar https://github.com/santibpapa/trucazo, rama `master`, en una carpeta local. Revisar el sistema y las herramientas disponibles, preparar el emulador y retomar las pruebas desde Historia → Buenos Aires. El dueño no tiene un Android físico disponible y hace el login personalmente; nunca pedir contraseñas por chat.

<a id="retoma-anterior-codigo-y-cambios-guardados"></a>

#### Código y cambios guardados

- El código del prototipo está integrado mediante el PR 108, merge `978b166803fc84e3e4908d4c56fd241479f4963e`.
- Las pruebas locales posteriores no cambiaron el código de la app. Se actualizó [Plan, decisiones, pruebas e Historia sin internet](#plan-android) y se agregó este resumen.
- No se aplicaron migraciones SQL ni se realizó una publicación en Google Play durante las pruebas. Respetar las reglas de `AGENTS.md` para cambios del backend y de diseño.
- TypeScript aprobado; lint con siete avisos preexistentes; ocho pruebas PWA y cuatro Android aprobadas en la copia actualizada del equipo anterior.
- La carpeta de trabajo anterior era `C:\Users\loana\Desktop\proyectos\trucazo`. No asumir esa ubicación en el nuevo equipo.
- Las herramientas personales de diseño de `.claude/skills/` que estaban sin versionar en el equipo anterior no son cambios del juego ni requisitos para probar el APK.

<a id="retoma-anterior-apk-preparado-para-descargar"></a>

#### APK preparado para descargar

El APK que ya se probó se conserva como descarga en la versión preliminar [Prototipo Android del 10/10/2026](https://github.com/santibpapa/trucazo/releases/tag/prototype-android-2026-10-10). Descargar `app-debug.apk` si se quiere instalar la misma construcción sin recompilar. Una descarga o clonación del código no incluye automáticamente los adjuntos de esa versión.

- Paquete `ar.com.trucazo.prototype`, versión 0.1.0, código 1; mínimo API 24 y objetivo/compilación 36.
- Tamaño: 6.034.334 bytes. SHA-256: `19F55B18ACF22D96E1336DD0D1FB69611D1593B196F1CE1F527910E1B0891EFF`.
- Firma de prueba pública: `D4:56:DC:6E:B3:5B:F9:10:9A:14:69:36:94:C5:6B:55:3B:B8:C2:DD:1D:6D:5B:35:1F:26:A5:DB:BB:E9:6A:E4`. No contiene la clave privada de firma.
- Es un APK de prueba que abre la web publicada de Trucazo. No representa todavía una campaña Android completa sin conexión ni está preparado para publicar en Google Play.
- Para recompilar, seguir [Construcción del APK y pruebas Android](#construir-android): Node 20+, JDK completo 17, SDK Platform 36 y Build Tools 35.0.0. Java 25 no fue compatible con el build probado. Las fuentes Android se generan; no editarlas manualmente.
- `android/generated/`, APKs y claves privadas quedan fuera de Git, según `.gitignore`. El SDK, Java, el emulador y las dependencias se preparan en el equipo nuevo.

<a id="retoma-anterior-configuracion-que-se-conserva-por-separado"></a>

#### Configuración que se conserva por separado

El repositorio es público. `.env.local`, certificados privados, accesos de herramientas, cachés y datos del emulador no se subieron. Para ejecutar también la web local, el dueño debe transferir `.env.local` por un medio privado o configurar las variables por separado. El APK existente abre el sitio publicado y no necesita ese archivo para instalarse y probarse.

Cambiar de computadora y recompilar puede crear otro certificado debug. No confundir su huella con la del APK descargable. Si se necesita conservar una clave privada, transferirla por un medio privado; nunca guardarla en Git ni mostrarla en el chat. La cuenta y la sesión del emulador anterior no se transfieren con el código.

<a id="retoma-anterior-pruebas-realizadas-y-pendientes"></a>

#### Pruebas realizadas y pendientes

- El dueño inició sesión manualmente y confirmó que ve el mapa de Historia y puede tocar Buenos Aires para abrir sus rivales.
- Se probó Tobías el Novato: jugar una carta, respuesta del bot, cantar Truco y avance del marcador. Mesa, cartas y controles entraron en una sola pantalla.
- Se conservó la cuenta al reiniciar el emulador. La partida interrumpida terminó por inactividad; no se completó una partida entera a 15 puntos.
- Pendientes: Google OAuth, partida completa, campaña offline real, recepción de notificaciones push y matriz de aceptación de [Construcción del APK y pruebas Android](#construir-android).
- La asociación del dominio con Android está pendiente: `/.well-known/assetlinks.json` devolvió `[]`. Por eso puede aparecer la barra de Chrome.

<a id="retoma-anterior-lo-aprendido-en-el-equipo-anterior"></a>

#### Lo aprendido en el equipo anterior

- La virtualización en BIOS y WHPX se habilitaron en esa PC. Comprobar la configuración de la nueva PC antes de pedir cambios de firmware; no asumir que tiene el mismo problema.
- Android 15 y 17 tuvieron problemas de rendimiento. Funcionó Android 11/API 30 Google Play x86_64, AVD `Trucazo_Android_11`, 720x1280, densidad 320, dos núcleos y 2048 MB.
- Chrome 83 de esa imagen recortaba el mapa por falta de soporte CSS `dvh`. Se usó Chrome 124.0.6367.219 y su TrichromeLibrary, extraídos de una imagen oficial Android 15 y con firmas verificadas. Usar un navegador compatible antes de evaluar el mapa.
- El controlador AMD del equipo anterior hizo caer el emulador con gráficos del equipo. Se recuperó usando SwiftShader, sin ventana del emulador, y un visor scrcpy 5.0.1 con Direct3D, H264/OMX.google.h264.encoder, 720x1280, 15 fps, sin audio ni sincronización automática del portapapeles. La ventana se llamó Trucazo.
- No atribuir ese cierre al juego ni asumir que se repetirá en otra computadora. Evaluar el entorno del equipo nuevo. La estabilidad prolongada del emulador aún no está certificada.

El historial completo del chat no está dentro del repositorio. Este resumen y [Plan, decisiones, pruebas e Historia sin internet](#plan-android) conservan el punto de trabajo y la evidencia necesaria para retomar.

</details>

<a id="registro-pc"></a>

### Preparación de esta PC

Registro del 10/10/2026; no equivale a certificar que el emulador siga abierto en este momento.

Nota local de preparación de la nueva PC.

<details>
<summary>Ver contenido completo: Preparación de esta PC</summary>

<a id="registro-pc-trucazo-en-esta-pc"></a>

### Trucazo en esta PC

El respaldo del pendrive se copio y verifico completo (21 archivos, incluidos los 14 controles SHA-256 del paquete). Se conserva en `Trucazo_2026-10-10`. La carpeta `trucazo` contiene el proyecto completo y su configuracion privada, con master en `2ecd674eaeee0f797a854db544c1a1e02c489f7d`. La primera descarga de GitHub se conserva en `trucazo-github-2026-10-10`.

Las herramientas estan en `trucazo-entorno`: Node 24.16.0, Java 17, Git, Android SDK y scrcpy 5.0.1. Las dependencias de la web y de Android estan instaladas. Se creo un emulador nuevo `Trucazo_Android_11` (720x1280, dos nucleos y 2048 MB), sin copiar cuentas del equipo anterior. La clave de firma permanece en el respaldo privado y no se reemplazo ninguna clave de esta PC.

TypeScript y las 12 comprobaciones existentes de PWA/Android se aprobaron en esta PC. La firma del APK coincide con la construccion probada. El codigo versionado quedo sin cambios.

<a id="registro-pc-el-emulador-ya-funciona"></a>

#### El emulador ya funciona

Se comprobo que esta PC tiene un AMD Ryzen 5 5600G, placa ASUS PRIME B550M-K y 16 GB de RAM. La virtualizacion de la BIOS quedo activada: Windows informa `VirtualizationFirmwareEnabled=true` y `HypervisorPresent=true`. Android confirmo `WHPX(10.0.22631) is installed and usable`. Se comprobo el arranque completo del emulador (`sys.boot_completed=1`).

Chrome 124.0.6367.219 y el APK del respaldo se instalaron correctamente. Se inicio la app y el visor scrcpy tiene la ventana `Trucazo`, con imagen de 720x1280 y sin errores de inicio en sus registros. La lectura visual de la ventana quedo pendiente porque vencio la autorizacion de acceso de la herramienta de Windows.

<a id="registro-pc-como-continuar"></a>

#### Como continuar

1. Busca la ventana **Trucazo** en la barra de tareas.
2. Si Chrome muestra su bienvenida inicial, completala personalmente.
3. Inicia sesion con tu cuenta dentro de Trucazo. No mandes tu contrasena por chat; no se copio la sesion del equipo anterior.
4. Avisale a Codex cuando veas el mapa para retomar desde **Historia → Buenos Aires**.

Windows Hypervisor Platform esta operativo y el reinicio ya se realizo. El estado queda registrado en `trucazo-entorno/Registros/virtualizacion-windows.json` y `trucazo-entorno/ESTADO_ENTORNO.json`.

<a id="registro-pc-volver-a-abrir-el-emulador"></a>

#### Volver a abrir el emulador

Hace doble clic en **Trucazo Android**, el acceso directo de esta carpeta. El arranque puede tardar unos minutos. El iniciador prepara Chrome compatible y el APK verificado del respaldo, y abre la ventana Trucazo. El arranque, las instalaciones y el inicio del visor se comprobaron en esta PC. Todavia no se verifico login ni juego en este equipo.

Inicia sesion vos dentro de Trucazo. No mandes tu contrasena por chat. Retomamos desde **Historia → Buenos Aires**. Se probaron cartas y Truco contra Tobias; falta completar una partida a 15 puntos y la matriz de pruebas Android.

Todo el trabajo sigue siendo local. La configuracion privada y los certificados no se suben a GitHub. El APK es el prototipo que abre la web publicada; no es la version final para Google Play.

</details>


