# Android — app instalada y Google Play

[Volver al README](../README.md) · Documento principal de Android. Reorganizado el **07/11/2026**: quedó lo que hace falta para retomar (estado, reglas, trampas y plan de las etapas que faltan). Las pruebas detalladas de cada etapa están en el [historial completo hasta el 07/11/2026](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md) y en los PR de GitHub.

<a id="android-en-pocas-palabras"></a>

## En pocas palabras (para el dueño) — 07/11/2026

- **Qué es:** la app de Trucazo para celulares Android. Usa las mismas cuentas, partidas y monedas que la web, y el Modo Campaña también funciona sin internet.
- **Dónde estamos:** **en pausa** por decisión del dueño. Se retoma cuando Google Ad Manager apruebe la cuenta y Trucazo empiece a generar ingresos.
- **Qué quedó hecho:** la app está terminada y probada (etapas 1 a 17). La etapa 18 (cuenta de Play Console, ficha y canal de prueba interno) quedó empezada: falta crear la cuenta de Play Console.
- **Qué no hay que olvidar aunque esté en pausa:** guardar una copia de la firma de la app fuera de la computadora. Sin esa firma no se pueden publicar actualizaciones de la misma app.

<a id="android-estado-actual"></a>

## Estado actual

Esta sección es una foto: se **reescribe entera** cuando algo cambia. Lo viejo pasa al historial.

- **En pausa desde el 07/11/2026**, hasta que Google Ad Manager apruebe la cuenta y Trucazo genere ingresos. No se trabaja en etapas Android mientras tanto.
- **Etapas:** ANDROID-01 a 17 cerradas (27/10/2026). ANDROID-18 a medias desde el 02/11 ([avance de 18](#android-18-avance-2026-11-02)). 19 y 20 sin empezar.
- **Último candidato firmado:** **0.17.11 / código 29**, paquete `ar.com.trucazo.app`, firma de subida `D0:B0:84…:28:30`, Android 10 en adelante (API 29, objetivo API 36). Tiene parejas, torneos y chat de mesa. Los archivos están en la PC del dueño (`android/artifacts/ANDROID-18/`), fuera de Git. Se armó con el código del 02/11: al retomar hay que armar uno nuevo desde `master`.
- **Nada publicado en Google Play.** La confirmación de email y los avisos push para jugadores siguen apagados (`dispatch_enabled=false`).
- **Código:** las fuentes de la app están en `master` desde el [PR #147](https://github.com/santibpapa/trucazo/pull/147) (30/10). El workflow «Android Capacitor» comprueba cada PR que toca `src/`.
- **Servidor:** aunque la app esté en pausa, todo cambio de Supabase o de los servicios web tiene que seguir sirviendo a la versión mínima admitida (`app_compatibility.policy.minimum_code`, hoy 17). Ver [Cómo llegan los cambios](#como-llegan-los-cambios).
- **Equipos de prueba:** no hay teléfono físico desde el 03/11 (el Redmi era prestado). Quedan los emuladores `Trucazo_Android_11` y `Trucazo_Android_16` de la PC del dueño, los dos con Google Play.

<a id="android-proximo-paso"></a>

## Próximo paso y cómo retomar

**Mientras siga en pausa:** no hay trabajo de etapas. Sólo cuidar que los cambios de servidor no rompan la app ya armada.

**Al retomar** (sólo cuando el dueño lo pida):

1. Leer este documento entero: es corto a propósito.
2. Revisar si cambiaron los requisitos de Google Play ([requisitos](#android-requisitos-google)) y la versión mínima de Android que pide Play.
3. Armar un candidato nuevo desde `master` y pasarle la inspección de siempre ([datos permanentes](#android-datos-permanentes)). El 0.17.11/29 quedó viejo frente a las pantallas actuales.
4. Que el dueño cree y verifique la cuenta de Play Console. Después seguir el paso «Siguiente» del [avance de 18](#android-18-avance-2026-11-02).

Texto listo para pegar en una sesión nueva:

> Retomamos ANDROID-18 (Play Console, ficha y canal interno) después de la pausa. Las etapas 01 a 17 están cerradas. Leé AGENTS.md, README.md y docs/android.md entero. Primero comprobá servidor, los cinco guardados originales y las tres cuentas QA, y armá un candidato nuevo desde master (el último es 0.17.11/código 29). Después coordiná conmigo el alta de Play Console. No publiques en producción de Play; la confirmación de email y los push para jugadores siguen apagados.

<a id="android-reglas-sesion"></a>

## Reglas para las sesiones de etapas Android

Estas reglas valen sólo para las sesiones que trabajan una etapa ANDROID-01 a 20. Las demás tareas cierran con su resumen normal.

1. Leer `AGENTS.md`, el estado actual, este documento, la etapa solicitada y el último [traspaso Android](#android-traspasos). «Etapa X» en el contexto de esta entrega significa **ANDROID-XX**.
2. Comprobar sus dependencias y archivos reales, incluidos cambios locales. Si una previa tiene un pendiente necesario, resolverlo y registrarlo antes de continuar. Si ya está cerrada, conservar sus decisiones y hacer sólo la regresión que el cambio actual justifique.
3. Al comenzar, indicar en español simple el objetivo, los límites y cómo se comprobará el cierre. Implementar la etapa solicitada; no absorber silenciosamente las siguientes ni detenerse por una elección técnica que pueda resolverse con la evidencia existente.
4. Usar cuentas de prueba y separar pruebas locales, emulador, teléfono, servidor real y Play. Cada resultado debe decir cuál de esos entornos cubre. Un build no acredita instalación; una respuesta del proveedor push no acredita recepción.
5. Al terminar, actualizar la fila de estado, reescribir el [estado actual](#android-estado-actual) y agregar el traspaso **en docs/android.md**. Usar `Pendiente`, `En curso`, `Preparada; falta paso externo` o `Cerrada`. Sólo cerrar cuando se cumplan sus criterios; si falta teléfono, acceso personal, SQL o aprobación de Google, dejar exactamente ese pendiente y el trabajo técnico terminado.
6. **Regla expresa del dueño, 14/10/2026, vigente hasta ANDROID-20:** cada sesión se dedica exclusivamente a una etapa y continúa hasta completarla y verificar el cierre. No terminar por iniciativa del agente con pendientes ni pasarlos a otra sesión. Coordinar aquí mismo accesos personales, preguntas, aprobaciones y esperas, y seguir trabajando; no empezar la etapa siguiente. Sólo el dueño puede pedir interrumpir o cambiar este alcance.
7. Recién al completar la etapa asignada, enviar la respuesta final y un texto breve para iniciar la etapa siguiente: estado alcanzado, próxima etapa, lectura de `AGENTS.md` y del último traspaso de docs/android.md, y primer paso concreto. Actualizar también el texto para pegar de [Próximo paso](#android-proximo-paso). Si el dueño pide interrumpir antes del cierre, registrar qué falta y el mismo número a continuar. Este requisito no se aplica fuera de ANDROID-01 a ANDROID-20 salvo pedido explícito del dueño.

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
     vive la firma (ver [firma y construcción de 16](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-16)).
  3. Inspeccionar con `inspect-release.ps1` y subir el AAB a Play (canal interno,
     cerrado o producción, según la etapa).
- Subir la versión mínima sólo en cambios del tipo 4. Un cambio compatible del
  servidor nunca obliga a actualizar.

<a id="android-datos-permanentes"></a>

## Datos permanentes y trampas conocidas

Cosas que no se ven mirando el código y que costó descubrir. Cada una dice de dónde sale.

**Identidad de la app** (confirmada por el dueño en ANDROID-16): paquete `ar.com.trucazo.app`, nombre **Trucazo**, ícono existente, mínimo **Android 10/API 29**, objetivo **API 36**. El paquete de pruebas `ar.com.trucazo.capacitor.dev` es otra instalación: pasar de uno al otro no migra datos.

**Firma de subida** (creada en ANDROID-16): `C:\Users\santy\Desktop\proyectos\trucazo-entorno\android-signing`, con copia idéntica en `C:\Users\santy\Documents\Trucazo-respaldo-firma`. Contiene `trucazo-upload.jks`, `signing.properties` y `upload-certificate.pem`; las contraseñas no se escriben en ningún lado. SHA256 público `D0:B0:84:C2:71:3D:D3:79:01:84:D1:F2:D0:74:CB:E9:FA:C0:E9:D8:5A:FE:92:A3:02:B4:11:64:FA:07:28:30`; SHA1 `D1:A2:63:B2:20:72:B2:00:F0:3C:C7:F2:F7:BF:A0:59:85:3C:77:D2`. **Nunca regenerarla:** una firma nueva es otra app para Google. Las dos copias están en la misma PC; falta una copia externa. Es la firma de subida, no la que Play asignará en la etapa 18.

**Armar e inspeccionar un candidato** (en PowerShell, desde la raíz del proyecto):

- `./apps/mobile/scripts/build-release.ps1 -SigningProperties C:/Users/santy/Desktop/proyectos/trucazo-entorno/android-signing/signing.properties`
- `./apps/mobile/scripts/inspect-release.ps1 -Package ar.com.trucazo.app -CertificateSha256 D0B084C2713DD3790184D1F2D074CBE9FAC0E9D85AFE92A302B41164FA072830`. Revisa firma, permisos, secretos, alineación de 16 KB y que estén activos parejas, torneos y chat.
- Firebase: proyecto `trucazo-1dfcc`, cliente final `1:440283356897:android:e5f2eebb77f3edbc95a1a0`. El `google-services.json` local está fuera de Git.
- El workflow `.github/workflows/capacitor.yml` arma en cada PR una versión de prueba sin firma. La versión firmada es manual, sólo desde `master` y con el entorno `android-release` de GitHub (todavía sin crear).

**Trampas comprobadas:**

- **Chat de mesa apagado sin aviso** (ANDROID-18): si `NEXT_PUBLIC_ENABLE_MATCH_CHAT` falta en `.env.local`, el armado apaga el chat. Así salieron los candidatos 23 a 28. Desde el 29, `inspect-release.ps1` rechaza un candidato sin parejas, torneos o chat.
- **Letra grande del teléfono** (ANDROID-18): las consultas de contenedor en `em` no reaccionan al agrandado de letra del WebView. Por eso `main.tsx` mide la letra real y marca `data-large-text` (`l` desde 130 %, `xl` desde 180 %). Probar siempre con letra al 140 % o más.
- **Barra inferior de Android** (ANDROID-18): `env(safe-area-inset-bottom)` vale 0 en ese WebView. Usar `--safe-area-inset-bottom` con `env()` de respaldo, como la mesa y el menú.
- **Teléfonos que rechazan `adb input`**: correr `check-main-menu-device.mjs` con `ANDROID_NO_INPUT=1` y pedirle al dueño que pruebe Atrás a mano.
- **La PC del dueño no tiene PowerShell 7**: los scripts tienen que andar con PowerShell 5.1.
- **Una compilación no prueba una instalación** y una respuesta del proveedor de push no prueba que el aviso llegó. Cada resultado dice en qué entorno se comprobó: navegador, emulador, teléfono, servidor real o Play.
- **Las migraciones de Historia, convivencia y push ya están aplicadas** en producción (11/10, 15/10 y 27/10). No repetirlas al retomar.

<a id="android-qa-accounts"></a>

### Cuentas de prueba (QA) — 14/10/2026

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

<a id="android-etapas-finales"></a>

## Plan de etapas

Plan vigente de ejecución Android, creado el 11/10/2026: veinte etapas para trabajar en sesiones distintas. Las etiquetas antiguas «PR 1–7» del camino TWA y las etapas de torneos no son estos números. El alcance completo de las etapas 01 a 17 y sus pruebas están en el [historial](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapas-finales).

| Etapa | Entrega al cerrar | Dependencia | Estado |
| --- | --- | --- | --- |
| [ANDROID-01](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-01) | Inventario, entorno y punto de partida comprobados | Estado actual | Cerrada (12/10/2026) |
| [ANDROID-02](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-02) | Primer APK Capacitor local que abre desde su ícono | 01 | Cerrada (12/10/2026) |
| [ANDROID-03](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-03) | Cuenta existente, sesión propia, servicios y lobby reales | 02 | Cerrada (13/10/2026) |
| [ANDROID-04](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-04) | Tobías instalado, descarga y cierre/retoma sin red | 03 | Cerrada (13/10/2026) |
| [ANDROID-05](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-05) | 1v1 online compartido con la web | 03 y 04 | Cerrada (13/10/2026) |
| [ANDROID-06](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-06) | Premios, sincronización y guardados versionados comprobados | 04 y 05 | Cerrada (14/10/2026) |
| [ANDROID-07](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-07) | Google, alta, recuperación y enlaces de acceso completos | 06 | Cerrada (14/10/2026) |
| [ANDROID-08](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-08) | Perfil, economía, progreso, ranking y personalización completos | 07 | Cerrada (15/10/2026) |
| [ANDROID-09](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-09) | Parejas completas y compatibles con jugadores web | 08 | Cerrada (15/10/2026) |
| [ANDROID-10](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-10) | Torneos y espectadores completos | 09 | Cerrada (15/10/2026) |
| [ANDROID-11](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-11) | Comunidad, funciones sociales, soporte y resto de rutas | 10 | Cerrada |
| [ANDROID-12](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-12) | Denuncias, bloqueos y administración de convivencia | 11 | Cerrada |
| [ANDROID-13](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-13) | Push nativa con eventos y recepción real | 12 | Cerrada (15/10/2026) |
| [ANDROID-14](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-14) | Comportamiento Android y presentación pulidos | 13 | Cerrada el 16/10; límites aceptados, medición física acordada para 17 |
| [ANDROID-15](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-15) | Privacidad, borrado y revisión de seguridad/contenido cerrados | 14 | Cerrada |
| [ANDROID-16](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-16) | Candidato de entrega firmado y reproducible | 15 y decisiones finales | Cerrada (16/10/2026) |
| [ANDROID-17](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapa-17) | Candidato completo probado, incluido teléfono físico | 16 | Cerrada (27/10/2026) |
| [ANDROID-18](#android-etapa-18) | Ficha y canal interno Play con instalación real | 17; alta puede prepararse antes | En curso desde 02/11; en pausa desde 07/11 |
| [ANDROID-19](#android-etapa-19) | Prueba cerrada y acceso a producción resueltos | 18 | Pendiente |
| [ANDROID-20](#android-etapa-20) | Publicación acordada, instalación pública y entrega final | 19 y pedido de publicación | Pendiente |

**Hitos:** al cerrar 06 hay una primera prueba instalada con juego online, Historia y premios reales. Al cerrar 17 hay un **candidato final entregable** firmado y probado, con sus límites documentados. Al cerrar 18 está probado además con la firma/distribución de Play. Al cerrar 20 hay una publicación real; la aprobación y los tiempos de Google son externos.

<a id="android-requisitos-google"></a>

### Requisitos de Google comprobados

Volver a comprobarlos al retomar: Google los cambia seguido.

**Requisitos comprobados el 11/10/2026:** para nuevas apps de teléfonos, Google exige objetivo **Android 16/API 36** desde el 31/08/2026; volver a verificar al producir el artefacto. El mínimo de Android compatible es otra decisión y no se deduce del objetivo. [Requisito oficial de API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

Android requiere revisar compatibilidad con páginas de memoria de **16 KB**, incluyendo las bibliotecas que agreguen los plugins. Si todo el paquete es Java/Kotlin sin bibliotecas nativas C/C++, la documentación indica que ya soporta ese tamaño, aunque recomienda probarlo. Inspeccionar el artefacto real; no agregar trabajo NDK si no contiene esas bibliotecas. Android 16 también cambia las barras y el manejo de Atrás, por lo que el emulador Android 11 no cubre toda la aceptación. [Compatibilidad 16 KB](https://developer.android.com/guide/practices/page-sizes), [cambios Android 16](https://developer.android.com/about/versions/16/behavior-changes-16).

Google exige moderación adecuada al contenido aportado por usuarios, con mecanismos dentro de la app para reportar y bloquear según sus interacciones. La aplicación comparte ese contenido con la web, así que implementar la protección en el servidor y su acceso en ambas interfaces. La declaración de datos también incluye los SDK/proveedores utilizados; los textos actuales deben contrastarse con el comportamiento final. [Contenido de usuarios](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Para cuentas personales nuevas, Google exige actualmente al menos **12 testers adheridos de forma continua durante 14 días** en prueba cerrada antes de solicitar acceso a producción. No equivale a aprobación automática: importa la prueba realizada y Google puede pedir más trabajo. El alta de Play tiene una tarifa única publicada de **US$25** y verificaciones de identidad/contacto y, para nuevas cuentas personales, acceso a un Android mediante la app de Play Console. Confirmar condiciones y cargos al hacer el alta; el dueño la realiza con su titularidad real. [Prueba cerrada](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [alta de Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).

La verificación de desarrollador/registro de paquetes Android comenzó su aplicación regional el 30/09/2026 en Brasil, Indonesia, Singapur y Tailandia. Para distribución por Play, revisar el estado que muestra **Play Console** para la cuenta y el paquete; no crear otra consola por rutina. La intención de distribución mundial exige comprobar ese estado y los mercados realmente habilitados. [Verificación Android](https://developer.android.com/developer-verification/guides).

### Compatibilidad entre versiones de la app y el servidor (ANDROID-17)

<a id="android-17-compatibilidad"></a>

**Compatibilidad web/app/servidor — requisito añadido el 20/10, verificado en 17 el 27/10/2026:** cubrir tanto las llamadas directas a Supabase como los servicios Next/Vercel. Conservar datos al instalar una actualización no demuestra que una app anterior funcione contra un servidor nuevo.

1. **Versiones admitidas:** registrar versiones/códigos de app compatibles, versión mínima para operaciones online, criterio para retirar una versión y responsable de autorizarlo. Distinguir versión de app, formato del guardado y motor/catálogo de Historia; no deducir compatibilidad sólo del número de APK.
2. **Acuerdo entre app y servidor:** identificar consultas, funciones SQL, parámetros, respuestas, estados de partida, Realtime y acceso usados por las versiones admitidas. Los cambios deben conservar lo que esas versiones necesitan; cualquier cambio incompatible requiere transición preparada antes de aplicarlo. No mantener una vulnerabilidad para conservar una versión: preparar su retiro y la recuperación segura de datos.
3. **App anterior contra servidor nuevo:** conservar un APK anterior identificable, sin reconstruirlo con código nuevo, y probarlo junto al candidato contra la misma versión nueva de servicios/base en un entorno aislado antes de desplegar. Cubrir ingreso/renovación, lobby, 1v1/parejas app↔web y entre versiones, monedas/premios e Historia/sincronización según lo afectado. Registrar paquete, firma, configuración y versiones exactas; un QA con localhost no sustituye la aceptación HTTPS del paquete final. Antes de la primera publicación, dejar explícito que no existen versiones públicas anteriores y usar una base de prueba comparable con la misma identidad y servicios; no presentarla como compatibilidad ya probada con usuarios de Play.
4. **Actualización necesaria:** implementar y probar consulta de compatibilidad y aviso claro con enlace a la actualización. El servidor debe rechazar las operaciones incompatibles aunque se omita el aviso; cubrir también las llamadas directas a Supabase. No cortar una partida activa sin una salida definida ni borrar sesión, guardados o premios pendientes. Conservar una vía compatible y autorizada para terminar/recuperar/sincronizar lo anterior según [06](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-06-sync). Distinguir falta de red o fallo temporal de una versión retirada; no activar una nueva mínima hasta que su reemplazo esté disponible por el canal correspondiente.
5. **Evidencia de cierre:** comprobar una versión admitida, una retirada, servicio de compatibilidad inaccesible y actualización conservando datos. Respetar la conservación de motores/validadores de [06](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-06-sync); registrar límites y pendientes reales. Los ensayos ficticios de 16 no acreditan por sí solos esta compatibilidad de servicios.

**Verificación y final:** todos los recorridos obligatorios aprobados en candidato identificado, incluidos instalación limpia/actualización, Google, partida web/app, parejas, torneos, offline frío, premios/reintentos, denuncia/bloqueo, push, eliminación y diseño, además de los criterios de compatibilidad anteriores. Pruebas en un teléfono físico y cobertura de Android moderno registradas; si faltan, la etapa queda preparada y pendiente, no cerrada. Cero defectos abiertos que pierdan datos/premios, expongan información, impidan juego/acceso o dejen controles fuera de pantalla; menores aceptados con efecto y motivo expresos.

**Entrega a 18:** **candidato final entregable** y acta de aceptación en docs/android.md, política de versiones admitidas, pruebas de compatibilidad, lista de límites/defectos aceptados, evidencias y servicios/SQL/configuración realmente aplicados. El canal Play añade una firma/distribución que todavía debe comprobarse.

### Etapas que faltan

<a id="android-etapa-18"></a>

#### ANDROID-18 — Play Console, ficha y canal interno

**Empieza con:** 17 cerrada para distribuir el candidato. El dueño puede anticipar alta/verificación, soporte y recopilación de testers desde 01; anotar esos pasos como preparación de esta etapa sin bloquear el trabajo provisional.

**Trabajo:** alta/verificación con titularidad real, tipo de cuenta y contacto; confirmar registro de paquete y requisitos de verificación aplicables. Crear ficha fiel, icono/imagen/capturas reales del candidato, descripción, categoría, países, público/clasificación, privacidad, Seguridad de datos y eliminación. Proporcionar en el campo privado de Play una cuenta de revisión utilizable e instrucciones de acceso; sin credenciales en la documentación y sin requerir aprobación personal para cada ingreso del revisor. Configurar Play App Signing y canal interno, subir el AAB aprobado, resolver validaciones y revisar informe previo al lanzamiento.

**Verificación y final:** instalar desde Play con su firma real, no desde adb; paquete/versión correctos, Google y App Links configurados con los certificados correspondientes, push y servicios reales funcionando. Probar un recorrido online/offline/sync y actualización distribuida por el canal, sin pérdida de datos. Ficha/formularios completos y consistentes; cuenta del revisor comprobada. No subir otro identificador o versión sin registrar el cambio. La cuenta/validación o informes externos pendientes mantienen la etapa preparada hasta completarse.

**Entrega a 19:** app/canal/versión de Play, certificado público real y configuración final, ficha/declaraciones registradas, instrucciones privadas de revisión probadas, enlaces de prueba y observaciones del informe. [Preparar la revisión](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

Comprobar los formatos/tamaños vigentes de ícono, gráfico y capturas y las declaraciones que Play muestre para esta app, incluidas anuncios, acceso, edades, clasificación y funciones/permisos aplicables. Preparar capturas de la app instalada; no presentar imágenes de funciones pendientes. Registrar la verificación de cuenta y paquete, y revisar licencias/avisos de terceros y requisitos de países. [Recursos de la ficha](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

<a id="android-18-avance-2026-11-02"></a>

##### Avance de 18 — 02/11/2026 (en pausa desde el 07/11)

**Controles iniciales:** carpeta en `master` `187e48d`, Node 24.22.1. Servidor 3000 reabierto con `android/generated/android-15-next-final` (PID en `android/generated/android-18-live.pid`), responde 200; emulador `Trucazo_Android_11` reabierto sin borrar datos, WebView ahora 139. Cinco guardados originales idénticos a `android-17-preserved-final22.json` (`android/generated/android-18-preserved-start.json`). Tres QA ingresan: QA1=860/28, QA2=1120/23, QA3=370/30. APK/AAB24 con los hashes registrados. Configuración leída: política mínima 17 sin reemplazo, `pilot=true`, `dispatch_enabled=false`, confirmación de email apagada (`mailer_autoconfirm=true`). `assetlinks` de `www` publica sólo la huella de subida; dominio raíz 308 hacia `www`.

**Menú en teléfono:** Redmi 14C/Android16/WebView156.0.8078.47, letra del sistema al **140%**. Actualización 22→24 conservó QA1 y su guardado, pero el menú medía 1031px en un alto útil de 820: Salir quedaba fuera y Ajustes bajo la barra de Android, que el menú no reservaba (usaba sólo `env()`, que vale 0 en ese WebView). Ajustes, Multijugador, invitación directa, Campaña sin red, Salir y reapertura funcionaban. El dueño eligió que el menú se adapte solo, sin ignorar su letra.

**Corrección:** `MainMenu.tsx` mide si la página desborda y aplica hasta tres escalones (`data-compact`): encabezado compacto; Ajustes/Salir lado a lado sin descripción; sólo títulos. El margen inferior usa `--safe-area-inset-bottom` con respaldo `env()`, igual que la mesa. Con letra normal no cambia nada. Candidato intermedio **0.17.7/código25** (`android/artifacts/ANDROID-18/`, APK SHA256 `38c397fba12c458252e798fa76fb56ec6a783de52235704c10aed032cb482251`) sin distribuir: a 200% pisaba la flecha y cortaba Ajustes. Candidato vigente **0.17.8/código26**, misma firma `D0:B0:84…:28:30`, API29/36: APK `android/artifacts/ANDROID-18/trucazo-0.17.8-release.apk` 17.196.828 bytes, SHA256 `fe289b2cf8f7a349aace6c31daed5d7c8fbbda18f37f32095349c9e61b575fa1`; AAB `android/artifacts/ANDROID-18/trucazo-0.17.8-release.aab` 10.495.718 bytes, SHA256 `baf71244eb232251502879efb3e041804283059978d78868a60c4cc31aa8a625`. Inspección aprobada: sin depuración, cero claves privadas, 16KB, API `www` (`android/generated/android-18/release26-{build.log,inventory.json,inspection.log}`). Esta PC ya no tiene PowerShell 7: la inspección se corrió con una copia temporal compatible con PowerShell 5.1 que sólo cambia el cálculo del hash; el script del repositorio no se modificó.

**Verificado 26:** tipos y lint aprobados. `check:menu` (cinco tamaños, letra normal, sin cambios visuales) y `check-version-browser.mjs` aprobados. Actualización 24→25→26 en Android 11 y 16, y 22→24→25→26 en el Redmi, conservando identidad y bytes de los guardados; recorrido completo de `check-main-menu-device.mjs` aprobado en ambos emuladores, incluido Atrás real. En el Redmi el mismo recorrido aprobó con Atrás reemplazado por navegación interna, porque el teléfono rechaza `adb input`; el dueño confirmó a mano Atrás desde Ajustes y desde Campaña, y aprobó el aspecto. Letra al 130% (Android 11, 360×568), 140/160/200% (Android 16, 360×640) y 140% en el Redmi (360×820): cuatro opciones completas, sin deslizar. Evidencia en `android/generated/android-18/`. Fuentes de 26 a 29 subidas a GitHub en un PR propio de 18.

**Letra grande en las demás pantallas (27 y 28):** a 140–200% el lobby se pisaba (logo, Chat y pestañas inferiores) y perfil/tienda desbordaban la cabecera. Las consultas de contenedor en `em` no reaccionan al agrandado de texto del WebView, así que `main.tsx` mide la letra real al abrir y marca `data-large-text` (`l` desde 130%, `xl` desde 180%). Con esa marca el lobby oculta la palabra «Chat» (queda el ícono con nombre accesible), achica el logo en `xl` y recorta los nombres de pestañas; perfil y tienda dejan bajar la cabecera de renglón y los títulos cortan palabras largas (`globals.css`). La web no cambia: la marca sólo existe en la app. **0.17.9/código27** (APK SHA256 `11719ae94b094822d8a7df05b8502eeccf115fada767c6a0eaa8513afc9dac2b`) probó las consultas de contenedor sin efecto y no se distribuyó. **0.17.10/código28** (APK SHA256 `061f646e8fd9e2ae65ede397d9eef39cf5467d05f412e42de948bb2184e88ad0`) aprobó el barrido de letra 100/130/160/200% en lobby, perfil, tienda, ranking, notificaciones y torneos (`font-sweep28/`): todo entra hasta 160%; a 200% sólo el título de Torneos excede 2px.

**Chat de mesa restituido (29):** al repetir los ensayos se vio que los candidatos 23 a 28 (`menu-principal/` y los de 18) salieron con `matchChat:false`: la opción `NEXT_PUBLIC_ENABLE_MATCH_CHAT` no estaba en `.env.local` y el armado la apaga si falta; 22 la tenía. No fue una decisión, y las reglas piden chat escrito en 1v1/2vs2. Se agregó la opción a `.env.local` (archivo local, fuera de Git) e `inspect-release.ps1` ahora rechaza un candidato sin parejas, torneos o chat; con el 28 falla como corresponde (`release28-recheck.log`). Candidato vigente **0.17.11/código29**, misma firma `D0:B0:84…:28:30`, API29/36, parejas/torneos/chat en `true`: APK `android/artifacts/ANDROID-18/trucazo-0.17.11-release.apk` 17.197.172 bytes, SHA256 `2da1e1cce7bc8878adc38a0fbb52a95003fa2a5dfcb4f495ed1c593cc81f3aa5`; AAB `android/artifacts/ANDROID-18/trucazo-0.17.11-release.aab` 10.496.080 bytes, SHA256 `917865f474a7a6aab724d85dac671a3e608fc5bbf6df58dedf92a9079c5c8da3`. Inspección aprobada (`release29-{build.log,inventory.json,inspection.log}`). La actualización 28→29 en Android 11, Android 16 y el Redmi conserva identidad y bytes de los guardados, y `check-main-menu-device.mjs` aprobó completo en los tres (`release29-menu/`; en el Redmi, Atrás por navegación interna como en 26).

**Herramientas de prueba arregladas:** `inspect-release.ps1` calcula el hash de forma compatible con PowerShell 5.1 (esta PC no tiene PowerShell 7); `check-device-preserved.mjs` ya no pisa la evidencia de 08 (escribe la ruta que se le pase o `android-preserved-latest.json`); `check-main-menu-device.mjs` acepta `ANDROID_NO_INPUT=1` para teléfonos que rechazan `adb input`. Cinco ensayos de interfaz estaban rotos desde el menú (23) sin que se notara: ahora entran por «Multijugador»; perfil y comunidad simulan `app_compatibility`; torneos acepta el aviso de check-in del 30/10 (tildar «Entiendo…» y esperar 5 segundos). `check:player`, `check:team`, `check:tournaments`, `check:android:community` y `check:android:safety` aprobados con el 29 (los dos últimos se corren desde la raíz).

**Play Console:** el dueño confirmó el 02/11 que **todavía no creó la cuenta**; recibió los pasos para el alta personal (Gmail propio, nombre «Trucazo», datos legales reales, correo público `hola@trucazo.com.ar`, pago de US$25 y verificación con DNI y la app Play Console en su Android). No crear la app en la consola sin el agente: el paquete debe ser `ar.com.trucazo.app`. Requisito vigente: los paquetes de Play deben quedar registrados a un desarrollador verificado; las apps nuevas creadas desde el 30/03/2026 se registran solas al crearlas, y el estado se ve en la página «Verificación del desarrollador Android» después de verificar la identidad. [Registro de paquetes](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en), [datos del alta](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en).

**Sin teléfono físico desde el 03/11:** el dueño avisó que el Redmi es prestado y deja de tenerlo el 03/11. Desde entonces quedan sólo los emuladores de esta PC. Los dos AVD (`Trucazo_Android_11` y `Trucazo_Android_16`) son imágenes con Google Play (`com.android.vending`, `release-keys`), de modo que la instalación desde el canal interno puede hacerse allí, con una cuenta Google que el dueño inicie personalmente. Para una cuenta personal nueva, Google exige verificar la cuenta con un Android **físico** (Android 10 o superior, sin root) desde la app Play Console; no conviene usar el emulador. Ese paso debe hacerse antes de devolver el Redmi o, si Google lo pide más tarde, con cualquier Android prestado (puede ser de otra persona y servir para varias cuentas). [Verificación del dispositivo](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en). La aceptación física de 17 y la revalidación del menú 26 quedan registradas; las pruebas desde Play de 18 serán en emuladores con Play, y se aclara ese alcance. Antes de devolverlo: guardado QA1 del teléfono con revisión 49, 0 pendientes y 1 comprobante, ya sincronizado. El dueño pidió **dejar instalada** la app (ahora 0.17.11/29, sesión QA1) y el comprobador en el Redmi; no se desinstaló nada.

**Siguiente:** con la cuenta verificada, crear la app (paquete, idioma es-419, juego gratuito), comprobar el registro del paquete, activar Play App Signing con la clave de subida actual y subir el AAB29 al canal interno. Agregar a `assetlinks.json` la huella del certificado de firma de Play (sin quitar la de subida) y su SHA1/SHA256 a Firebase y Google, instalar desde Play y repetir Google, App Links, push, online/offline/sync y actualización. Ficha, Seguridad de datos (preparada en 15), clasificación y cuenta del revisor se cargan con el dueño.
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

**Procedimiento permanente de actualizaciones — añadido el 20/10/2026.** Guía práctica redactada el 30/10 en [Cómo llegan los cambios](#como-llegan-los-cambios); falta ensayarla por el canal de Play. Requisitos originales: entregar instrucciones reproducibles para cada cambio posterior en web, Supabase, servicios Vercel o app, usando la [política y pruebas de 17](#android-17-compatibilidad).

1. Identificar qué plataformas/versiones afecta el cambio y qué pedidos/respuestas modifica. Distinguir una corrección interna compatible de una función que requiere pantallas/código nuevos; compartir repositorio no sincroniza las instalaciones Android.
2. Preparar primero servidor/base capaces de atender las versiones admitidas y la nueva, mediante migraciones nuevas cuando corresponda. Probar app anterior, candidata y web en entorno aislado; después aplicar/desplegar en orden compatible y registrar lo realmente aplicado. No retirar de antemano funciones, campos o permisos que las versiones admitidas todavía usan.
3. Publicar web y actualización Android por sus canales, comprobar disponibilidad real y repetir los recorridos afectados con servicios reales. Mantener la compatibilidad durante la distribución: subir un AAB no demuestra que todos hayan actualizado. Registrar en cada entrega APK/AAB, versiones de app, cambios de servicios/base y evidencia.
4. Retirar una versión sólo conforme a la política de 17, con reemplazo disponible y aviso comprobado. Resolver primero partidas activas y resultados anteriores por una vía compatible; conservar los motores/validadores necesarios mientras queden guardados pendientes. No imponer una actualización por cada cambio interno compatible del servidor.
5. Ante un incidente, documentar cómo frenar distribución o la función afectada, restaurar un servicio compatible o publicar una corrección con código superior. Verificar que la recuperación atienda a las versiones ya distribuidas y conserve datos/premios; no depender de bajar la versión instalada ni de deshacer SQL a ciegas.

**Verificación y final:** enlace público y versión disponibles, instalación desde la ficha real en Android, acceso, partida y recuperación offline, confirmación de premios y push comprobados en producción con cuentas de prueba autorizadas. Compatibilidad con web intacta y procedimiento anterior documentado y ensayado en entorno de prueba, con comprobaciones de producción de los cambios realmente publicados. Registrar soporte/denuncias, firma/versionado, ubicación de artefactos y respaldos, mantenimiento de dependencias/servicios y próximos controles. Si Google sigue revisando, indicar «en revisión», no «publicada».

**Entrega final:** app Android publicada, documentación de construcción/actualización y soporte en esta guía, matriz aprobada, límites conocidos y procedimiento de mantenimiento/recuperación. La entrega no implica contratar herramientas de monitoreo ni activar mensajes promocionales nuevos.

#### Matriz de recorridos para revalidar en Play

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

## Registro de traspasos

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

**Último traspaso:** el [avance de 18 del 02/11/2026](#android-18-avance-2026-11-02), seguido de la pausa del 07/11 descripta en el [estado actual](#android-estado-actual). Los traspasos de 01 a 17 están en el [historial](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-traspasos).

<a id="android-historial"></a>

## Historial

El documento completo, tal como estaba el 07/11/2026 (590 KB), quedó guardado en GitHub: [abrir el historial](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md). Ahí están, con sus fechas:

- [El alcance, las pruebas y el cierre de cada etapa 01 a 17](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-etapas-finales), con sus [traspasos](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-traspasos).
- [El menú principal (27/10)](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-menu-principal) y [la sincronización con GitHub (21/10)](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-sync-github-2026-10-21).
- [La decisión de usar Capacitor](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#capacitor), [Historia sin internet](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#historia-sin-internet) y [su sincronización](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#historia-sincronizacion).
- [El prototipo TWA anterior](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#construir-android) y [la preparación de la PC](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#estado-pc).

Consultarlo sólo para buscar una prueba puntual. Lo vigente es lo de este documento.
