# Trucazo

Truco argentino online a **15 o 30 puntos, sin flor y con monedas ficticias**. Incluye mano a mano, parejas, Historia y torneos. La web usa Next.js 15, React, TypeScript, Tailwind y Supabase; la app Android en desarrollo usa Capacitor y comparte las cuentas y el juego online.

[Abrir Trucazo](https://www.trucazo.com.ar)

<a id="estado-actual"></a>

## En qué estamos

**Android: ANDROID-01 a16 cerradas; ANDROID-17 en curso.** [Avances y pendientes de17](docs/android.md#android-etapa-17). Candidato firmado0.17.1/código19 instalado en Redmi14C/Android16 y emulador Android11; arranque físico utilizable en2,33/2,32/2,10s. Cinco guardados intactos y tres QA reutilizadas. Compatibilidad de versiones aplicada, web/API preparada en preview; el dueño indicó no desplegar todavía en producción. Siguen pendientes la aceptación HTTPS pública, Firebase remoto, batería sin carga y recorridos físicos restantes. Email y push público apagados; sin publicación Play. Continuar17 en esta misma sesión hasta verificar su cierre.

**Sincronización local del 21/10:** GitHub incorporado hasta `38002ae` (PR #141), conservando las etapas Android y Next.js 15. Invitaciones, mejoras de chat/lobby, recuperación de partidas y dependencias integradas. Respaldo y verificaciones en [Android](docs/android.md#android-sync-github-2026-10-21). Los APK/AAB firmados de16 son anteriores a esta integración; preparar un candidato actualizado para la aceptación de17.

<a id="indice"></a>

## Qué leer según la tarea

| Si vas a trabajar en… | Leé primero | Consultá además cuando corresponda |
| --- | --- | --- |
| App Android, etapas, Historia sin internet o Google Play | [Android](docs/android.md) | Juego, Backend y Diseño si la etapa los afecta. |
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
- Para modificar código, respetar las instrucciones de [AGENTS.md](AGENTS.md); [CLAUDE.md](CLAUDE.md) conserva las instrucciones del otro asistente.

<a id="mantener-documentacion"></a>

## Mantener la documentación

Cada tema tiene **un documento principal**. Actualizar allí estado, decisiones, pruebas, pendientes y traspasos; en este README mantener sólo la orientación y la próxima tarea general. No crear un archivo por sesión o entrega ni copiar capítulos entre documentos. Los accesos antiguos enlazan al documento correspondiente y no guardan otra versión.

Durante ANDROID-01 a ANDROID-20, cada sesión completa exclusivamente su etapa; el agente no cierra ni pasa sus pendientes a otra sesión por iniciativa propia. Los pasos personales se coordinan en el mismo chat y se continúa. Recién al terminar la etapa se entrega el texto para iniciar la siguiente, con estado, último traspaso de `docs/android.md` y primer paso concreto. Sólo el dueño puede pedir interrumpir antes. Las demás tareas y el mantenimiento posterior terminan con su resumen normal, salvo pedido explícito del dueño.

Separar lo vigente, las propuestas y el historial fechado. Si cambian las convenciones de [Diseño](docs/diseno.md#convenciones-diseno), actualizar también [.design-sync/conventions.md](.design-sync/conventions.md), que lee el generador.

Las instrucciones automáticas y las herramientas permanecen en sus ubicaciones. Las herramientas personales de `.claude/skills/` no son documentación del juego; `public/_md/` se genera desde las páginas públicas. El espejo `sources/` es de solo lectura; respaldos del pendrive y primera clonación son registros históricos.

**Organización actualizada el 13/10/2026:** los capítulos completos se distribuyeron por tema, conservando decisiones, pruebas, ejemplos y fechas. Esta entrega no ejecutó SQL, modificó el juego ni desplegó servicios.

Verificación documental: capítulos completos trasladados, 313 anclas de capítulos y 31 ejemplos de código conservados; enlaces locales comprobados. El código y los cambios previos del proyecto quedaron intactos.
