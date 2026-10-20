# Retomar Trucazo desde GitHub

Estado al 10 de octubre de 2026. Leer este archivo y `AGENTS.md` antes de continuar. El dueño no programa: explicar en español simple y realizar la preparación técnica.

## Objetivo y próxima tarea

Trabajar localmente hasta preparar la versión final para Google Play. El dueño autorizó guardar en GitHub los cambios y este resumen para continuar en otra computadora. La publicación en Google Play sigue pendiente.

Descargar https://github.com/santibpapa/trucazo, rama `master`, en una carpeta local. Revisar el sistema y las herramientas disponibles, preparar el emulador y retomar las pruebas desde Historia → Buenos Aires. El dueño no tiene un Android físico disponible y hace el login personalmente; nunca pedir contraseñas por chat.

## Código y cambios guardados

- El código del prototipo está integrado mediante el PR 108, merge `978b166803fc84e3e4908d4c56fd241479f4963e`.
- Las pruebas locales posteriores no cambiaron el código de la app. Se actualizó `docs/trucazo-play-store-plan.md` y se agregó este resumen.
- No se aplicaron migraciones SQL ni se realizó una publicación en Google Play durante las pruebas. Respetar las reglas de `AGENTS.md` para cambios del backend y de diseño.
- TypeScript aprobado; lint con siete avisos preexistentes; ocho pruebas PWA y cuatro Android aprobadas en la copia actualizada del equipo anterior.
- La carpeta de trabajo anterior era `C:\Users\loana\Desktop\proyectos\trucazo`. No asumir esa ubicación en el nuevo equipo.
- Las herramientas personales de diseño de `.claude/skills/` que estaban sin versionar en el equipo anterior no son cambios del juego ni requisitos para probar el APK.

## APK preparado para descargar

El APK que ya se probó se conserva como descarga en la versión preliminar [Prototipo Android del 10/10/2026](https://github.com/santibpapa/trucazo/releases/tag/prototype-android-2026-10-10). Descargar `app-debug.apk` si se quiere instalar la misma construcción sin recompilar. Una descarga o clonación del código no incluye automáticamente los adjuntos de esa versión.

- Paquete `ar.com.trucazo.prototype`, versión 0.1.0, código 1; mínimo API 24 y objetivo/compilación 36.
- Tamaño: 6.034.334 bytes. SHA-256: `19F55B18ACF22D96E1336DD0D1FB69611D1593B196F1CE1F527910E1B0891EFF`.
- Firma de prueba pública: `D4:56:DC:6E:B3:5B:F9:10:9A:14:69:36:94:C5:6B:55:3B:B8:C2:DD:1D:6D:5B:35:1F:26:A5:DB:BB:E9:6A:E4`. No contiene la clave privada de firma.
- Es un APK de prueba que abre la web publicada de Trucazo. No representa todavía una campaña Android completa sin conexión ni está preparado para publicar en Google Play.
- Para recompilar, seguir `android/README.md`: Node 20+, JDK completo 17, SDK Platform 36 y Build Tools 35.0.0. Java 25 no fue compatible con el build probado. Las fuentes Android se generan; no editarlas manualmente.
- `android/generated/`, APKs y claves privadas quedan fuera de Git, según `.gitignore`. El SDK, Java, el emulador y las dependencias se preparan en el equipo nuevo.

## Configuración que se conserva por separado

El repositorio es público. `.env.local`, certificados privados, accesos de herramientas, cachés y datos del emulador no se subieron. Para ejecutar también la web local, el dueño debe transferir `.env.local` por un medio privado o configurar las variables por separado. El APK existente abre el sitio publicado y no necesita ese archivo para instalarse y probarse.

Cambiar de computadora y recompilar puede crear otro certificado debug. No confundir su huella con la del APK descargable. Si se necesita conservar una clave privada, transferirla por un medio privado; nunca guardarla en Git ni mostrarla en el chat. La cuenta y la sesión del emulador anterior no se transfieren con el código.

## Pruebas realizadas y pendientes

- El dueño inició sesión manualmente y confirmó que ve el mapa de Historia y puede tocar Buenos Aires para abrir sus rivales.
- Se probó Tobías el Novato: jugar una carta, respuesta del bot, cantar Truco y avance del marcador. Mesa, cartas y controles entraron en una sola pantalla.
- Se conservó la cuenta al reiniciar el emulador. La partida interrumpida terminó por inactividad; no se completó una partida entera a 15 puntos.
- Pendientes: Google OAuth, partida completa, campaña offline real, recepción de notificaciones push y matriz de aceptación de `android/README.md`.
- La asociación del dominio con Android está pendiente: `/.well-known/assetlinks.json` devolvió `[]`. Por eso puede aparecer la barra de Chrome.

## Lo aprendido en el equipo anterior

- La virtualización en BIOS y WHPX se habilitaron en esa PC. Comprobar la configuración de la nueva PC antes de pedir cambios de firmware; no asumir que tiene el mismo problema.
- Android 15 y 17 tuvieron problemas de rendimiento. Funcionó Android 11/API 30 Google Play x86_64, AVD `Trucazo_Android_11`, 720x1280, densidad 320, dos núcleos y 2048 MB.
- Chrome 83 de esa imagen recortaba el mapa por falta de soporte CSS `dvh`. Se usó Chrome 124.0.6367.219 y su TrichromeLibrary, extraídos de una imagen oficial Android 15 y con firmas verificadas. Usar un navegador compatible antes de evaluar el mapa.
- El controlador AMD del equipo anterior hizo caer el emulador con gráficos del equipo. Se recuperó usando SwiftShader, sin ventana del emulador, y un visor scrcpy 5.0.1 con Direct3D, H264/OMX.google.h264.encoder, 720x1280, 15 fps, sin audio ni sincronización automática del portapapeles. La ventana se llamó Trucazo.
- No atribuir ese cierre al juego ni asumir que se repetirá en otra computadora. Evaluar el entorno del equipo nuevo. La estabilidad prolongada del emulador aún no está certificada.

El historial completo del chat no está dentro del repositorio. Este resumen y `docs/trucazo-play-store-plan.md` conservan el punto de trabajo y la evidencia necesaria para retomar.
