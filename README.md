# Trucazo

Truco argentino online a **15 o 30 puntos, sin flor y con monedas ficticias**. Incluye mano a mano, parejas, Historia y torneos. La web usa Next.js 15, React, TypeScript, Tailwind y Supabase; la app Android (en pausa) usa Capacitor y comparte las cuentas y el juego online.

[Abrir Trucazo](https://www.trucazo.com.ar)

<a id="estado-actual"></a>

## En qué estamos — 08/11/2026

Una línea por tema. Cada sesión reemplaza **sólo la línea de su tema**, con fecha; el detalle va en el documento del tema.

- **Web:** [www.trucazo.com.ar](https://www.trucazo.com.ar). Lo publicado es siempre `master`: Vercel publica solo cada merge. — 07/11
- **Juego:** Historia (15 provincias, 66 rivales), 1v1, parejas y torneos funcionando. Vidas de Historia programadas y apagadas. [Juego](docs/juego.md#estado-actual) — 07/11
- **Anuncios:** AdSense rechazó el sitio por «contenido de poco valor» (04/11). Hay que esperar su respuesta; por ahora no hay nada que hacer. [Diagnóstico](docs/juego.md#adsense-rechazo-poco-valor) — 08/11
- **App Android:** **en pausa** hasta que AdSense dé el okey (anuncios aprobados) y Trucazo genere ingresos. Etapas 1 a 17 cerradas, 18 empezada, nada publicado en Play. [Android](docs/android.md#android-estado-actual) — 08/11
- **Servidor:** un solo servidor para la web y la app: todo cambio en Supabase o en los servicios web tiene que seguir funcionando para las apps ya instaladas. [Cómo llegan los cambios](docs/android.md#como-llegan-los-cambios) — 07/11
- **Operación:** plan gratuito de Supabase y Vercel, con recortes de consumo del 03 al 06/11. Supabase avisó el 11/11 que se pasó la cuota: gracia hasta el 11/12, después el egress tiene que quedar debajo de 5,5 GB por ciclo. Aviso de partida reducido publicado el 11/11 (PR #181), sin errores; falta medir el egress de los próximos días. Reseñas revisadas por un agente lunes, miércoles y viernes ([tablero #118](https://github.com/santibpapa/trucazo/issues/118)). Cambio de nombre de usuario publicado (PR #171). Reseña del 10/11 «tengo que reiniciar la página»: hora de la computadora adelantada; aviso en la mesa publicado (PR #178). SEO: portada nueva publicada e indexación pedida el 11/11 (PR #182); páginas cortas ampliadas y conversión de invitado en cuenta publicadas el 11/11 (PR #183); títulos y firma en el PR #185 ([detalle](docs/operacion.md#titulos-firma-2026-11-11)). [Operación](docs/operacion.md#aviso-partida-reducido) — 11/11

**Pendientes del dueño, fuera del código:** ninguno al 08/11. La firma de la app ya tiene copia en un pendrive y el emulador de pruebas no se conecta a producción desde el 03/11.

<a id="indice"></a>

## Qué leer según la tarea

| Si vas a trabajar en… | Leé primero | Consultá además cuando corresponda |
| --- | --- | --- |
| App Android (en pausa), etapas, Historia sin internet o Google Play | [Android](docs/android.md) | Juego, Backend y Diseño si la etapa los afecta. |
| Historia, 1v1, parejas, bots, torneos o chat de mesa | [Juego](docs/juego.md) | Backend para reglas SQL; Diseño para la presentación. |
| Base de datos, seguridad, configuración o pruebas SQL | [Backend](docs/backend.md) | El contrato y la evidencia del tema afectado. |
| Pantallas, mesa, cartas, recursos o velocidad visual | [Diseño](docs/diseno.md) | Android para la aceptación instalada. |
| Misiones, temporadas, rivalidades o grupos | [Producto](docs/producto.md) | Operación para publicar; Juego y Backend para implementar. |
| Soporte, cuentas, correos, SEO o incidentes de producción | [Operación](docs/operacion.md) | Backend para preparar y comprobar una corrección. |

**Para retomar:** leer [AGENTS.md](AGENTS.md), este README y el estado actual, próximo paso y último traspaso del tema correspondiente. Los documentos conservan su historial fechado; las entregas posteriores prevalecen sobre pendientes antiguos. No hace falta leer todos los manuales para una tarea.

## Ejecutar la web localmente

Estos pasos son para preparar el proyecto en una computadora. Node.js **24.22.1 o posterior de la rama24** y un proyecto Supabase configurado; las herramientas adicionales de Android se explican en su documento.

1. Abrí una terminal dentro de la carpeta del proyecto e instalá las dependencias:

   ```bash
   npm ci
   ```

2. Creá un archivo llamado `.env.local` en esa carpeta y completá estos valores con la configuración pública del proyecto Supabase:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

   La configuración completa de base, servicios y variables opcionales está en [Backend](docs/backend.md#configuracion-base). Las claves privadas se guardan fuera de Git.

3. Iniciá la web:

   ```bash
   npm run dev
   ```

4. Abrí [localhost:3000](http://localhost:3000) en el navegador.

Comprobaciones habituales: `npm run lint`, `npx tsc --noEmit` y `npm run build`. Las pruebas SQL y su reconstrucción usan una base aislada; seguir [la receta de Backend](docs/backend.md#reconstruir-base).

## Reglas esenciales

- El servidor decide las reglas online, puntajes y monedas. Las manos son privadas y quedan fuera de Realtime.
- Una función SQL aplicada se corrige mediante una migración nueva. El dueño aplica el backend manualmente; no hay despliegue automático de SQL.
- Web y Android comparten el diseño. La partida debe entrar completa en una pantalla, con todos sus controles.
- Para modificar código, respetar las instrucciones de [AGENTS.md](AGENTS.md). [CLAUDE.md](CLAUDE.md) las importa tal cual para Claude: editar siempre AGENTS.md.
- Producción web = `master`, y todo cambio de servidor debe servirle también a la app instalada: ver [Cómo llegan los cambios](docs/android.md#como-llegan-los-cambios).

<a id="mantener-documentacion"></a>

## Mantener la documentación

Estos documentos son la memoria del proyecto: lo que una sesión nueva sabe al empezar. Sirven si son cortos, ciertos y fáciles de encontrar.

- **Un documento principal por tema.** Ahí van estado, decisiones, pruebas, pendientes y traspasos. No crear un archivo por sesión o entrega ni copiar capítulos entre documentos: enlazar.
- **«Estado actual» es una foto, no un diario.** Se reescribe entera cuando algo cambia, con la fecha de la revisión. Lo que deja de ser cierto pasa a un capítulo fechado o se borra.
- **En este README, cada tema tiene una sola línea** en «En qué estamos». Cada sesión cambia sólo la de su tema.
- **Anotar lo que no se ve en el código:** reglas, trampas, decisiones del dueño y cómo se comprobó cada cosa. La evidencia larga (hashes, tiempos, registros) va en la descripción del PR; el documento la enlaza.
- **Separar lo comprobado de lo supuesto.** Decir dónde y cuándo se comprobó (navegador, emulador, producción…). Una nota vieja no vale más que una consulta de sólo lectura a la realidad.
- **Escribir en castellano claro**, con espacios entre palabras y números. Nada de abreviar para ahorrar lugar.
- **Ordenado semanal:** una tarea programada revisa cada semana que los «Estado actual» coincidan con lo que realmente está en `master` y en producción, y propone las correcciones en un PR.

Si cambian las convenciones de [Diseño](docs/diseno.md#convenciones-diseno), actualizar también [.design-sync/conventions.md](.design-sync/conventions.md), que lee el generador. `public/_md/` se genera desde las páginas públicas. El historial completo de cualquier documento está en Git: un capítulo que se saca de un documento se enlaza a su versión anterior en GitHub.
