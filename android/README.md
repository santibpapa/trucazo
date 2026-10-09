# Prototipo Android — PR 1B

Este proyecto sirve para decidir con pruebas si TWA cubre Trucazo. **Todavía no es la versión para publicar en Play.** La entrada es `https://www.trucazo.com.ar/android`, con cuenta existente o nueva. La web conserva invitados en sus otras pestañas.

El identificador `ar.com.trucazo.prototype` es temporal. El dueño pidió una explicación antes de decidir el definitivo; no se tomó ese pedido como aprobación de `ar.com.trucazo.app`. Cambiarlo antes de publicar requiere generar otro APK y asociar su certificado.

## Qué está preparado

- Bubblewrap Core **1.27.0**, fijado con su lockfile separado en `tools/`. Sus dependencias no se instalan en los PRs habituales de la web.
- Generación desde `twa-manifest.json` y el icono versionado de Trucazo. No descarga iconos ni configuración de un despliegue mutable.
- Gradle **8.11.1**, plugin Android **8.9.1** y Android Browser Helper **2.7.4**, versiones del generador fijado. Compilación/objetivo **API 36** y mínimo **API 24 (Android 7)**: la biblioteca exige ese mínimo. Confirmar requisitos de Play nuevamente al publicar.
- Delegación de notificaciones y permiso `POST_NOTIFICATIONS`. Fallback a pestaña de navegador si el proveedor no admite TWA; no se usa WebView como arquitectura de producción.
- `/.well-known/assetlinks.json`: genera asociaciones únicamente a partir de huellas reales configuradas. Sin configuración devuelve `[]`, no inventa un certificado.
- Entrada validada con `getUser()` en el servidor: una sesión anónima no puede acceder a `/android`. Marcador por pestaña para ocultar invitados/instalación redundante y volver a `/android` al acceder con contraseña o Google. No usa un cookie global para prohibir invitados en toda la web. No modifica permisos/RPCs de la web.
- Prueba optativa de administración `/android/probe.html`: preparación completa, contador ficticio en IndexedDB, solicitud de almacenamiento persistente, reapertura offline y notificación push de prueba. No guarda tokens, no da puntos y no descarga una campaña jugable.
- Workflow limitado a cambios de Android o ejecución manual, con APK debug, AAB **sin firma de publicación** y asociación del certificado de esa construcción. Las compilaciones de GitHub usan certificados debug efímeros: su huella puede cambiar en cada ejecución.

Los enlaces de correo externos, recuperación de contraseña, regreso a torneos/partidas, comportamiento de Atrás, suspensión y reconexión completos siguen en PR 2/3. La verificación de Google en una TWA real sigue pendiente aunque el retorno esté preparado. No hace falta modificar el manifest web para cambiar la identidad nativa; la PWA existente conserva `id: '/'`.

## Construir en computadora

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
| `android/artifacts/assetlinks-debug.json` | Asociación con el certificado debug real de esa computadora/construcción. |

`generated/`, `artifacts/`, APKs y claves quedan fuera de Git. No editar el proyecto generado: cualquier cambio propio debe hacerse en la configuración o generación. El certificado debug local se conserva normalmente en `~/.android/debug.keystore`; borrarlo o cambiar de computadora cambia la huella. El certificado de carga y el de **Play App Signing** serán distintos y se configuran al publicar.

## Asociar el dominio para la prueba

Después de integrar y desplegar el código web:

1. Ejecutar la construcción y `certificate.mjs`, o descargar `assetlinks-debug.json` del workflow correspondiente al APK que vas a instalar.
2. Copiar la huella con formato `AA:BB:…` de `sha256_cert_fingerprints`. Es un dato público; no es una contraseña ni la clave privada.
3. En Vercel, proyecto Trucazo → Settings → Environment Variables, crear **`ANDROID_SHA256_FINGERPRINTS`** con esa huella en el entorno que atiende `www.trucazo.com.ar`. Para varias huellas de prueba, separarlas con comas.
4. Volver a desplegar. Abrir `https://www.trucazo.com.ar/.well-known/assetlinks.json`: debe mostrar `ar.com.trucazo.prototype` y exactamente la huella del APK. Debe responder HTTP 200, JSON y sin redirección hacia otro dominio.
5. Instalar ese APK. Comprobar que la app abre sin barra de direcciones dentro de `www.trucazo.com.ar`. Google u otros sitios externos pueden abrir una pestaña de navegador.

El APK abre **www**, que es el origen configurado actualmente. No alcanza con asociar únicamente `trucazo.com.ar` si redirige a www. Para un preview se debe preparar un host propio no protegido, cambiar `host` y regenerar; no se asume que una URL de preview sea el mismo origen.

## Configurar una notificación real de prueba

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

## Matriz de aceptación en Android

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

## Pruebas automatizadas

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
