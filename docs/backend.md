# Backend — configuración, base de datos, seguridad y pruebas

[Volver al README](../README.md) · Documento principal del backend. Estado revisado el **11/11/2026**.

## Estado actual

Foto al **11/11/2026**. Se reescribe entera cuando algo cambia; lo viejo pasa al historial de abajo.

- **Stack:** Next.js 15.5.28, React, TypeScript y Tailwind; Node 24.22.1 o posterior de la rama 24. Supabase aporta cuentas, Postgres y Realtime. La lógica online y las monedas oficiales viven en funciones SQL del servidor; las cartas de cada jugador, en tablas privadas fuera de Realtime.
- **El backend no se despliega solo.** Para corregir una función se crea una migración nueva y el dueño la ejecuta en el SQL Editor con instrucciones concretas. La reconstrucción y las pruebas SQL usan una base aislada ([receta](#reconstruir-base)).
- **Compatibilidad con la app:** `app_compatibility.policy` con versión mínima **17** y sin reemplazo publicado (leído en producción el 07/11). La app está en pausa, pero las reglas de [Cómo llegan los cambios](android.md#como-llegan-los-cambios) siguen valiendo.
- **Tareas programadas (leídas en producción el 07/11):** limpieza de partidas 1v1 cada 5 min (`sweep_stale_games(10)`), mesas y parejas cada 5 min, torneos, correos y limpiezas diarias. El despachador de push (`trucazo-native-push`, cada 15 segundos) está desactivado mientras Android está en pausa: [migración del 07/11](../supabase/migrations/20261107220000_pausar_push_android.sql), aplicada por el dueño ese día y verificada en producción.
- **Middleware angostado el 06/11** para no agotar el cupo gratis de CPU de Vercel ([detalle](#cpu-vercel)).
- **Chat global, 07/11:** ya no se borra al azar; quedan los últimos 500 (tarea diaria `trucazo-chat-keep-500`, activa en producción el 07/11) y se tapan las groserías fuertes de `chat_banned_words`. Migraciones aplicadas el 07/11 ([detalle](#chat-global-2026-11-07)).
- **Cuotas de Supabase:** limpieza de Realtime e historial aplicada por el dueño el 04/11 ([detalle en Operación](operacion.md#cuotas-2026-11-04)).
- **Ranking y presencia (PR #120):** cerrado; aceptación con partidas reales confirmada por el dueño el 08/11 ([Operación](operacion.md#correccion-cierres-presencia)).
- **Invitado que se registra conserva lo jugado (11/11):** migración `20261111235000_convertir_invitado.sql` aplicada y *Manual linking* activado por el dueño; registro con email probado en la preview y publicado el 11/11 ([PR #183](https://github.com/santibpapa/trucazo/pull/183)). Falta probar Google ([detalle](#convertir-invitado)).

## Próximo paso y cómo retomar

Pendiente del dueño: cuando pueda, probar el registro de un invitado con Google ([convertir invitado](#convertir-invitado)). Antes de aplicar SQL, comprobar qué está aplicado de verdad: el [historial de migraciones](../supabase/migrations/) y una consulta de sólo lectura a producción dicen más que una nota vieja.

## Guía de lectura

- [Configuración web, variables y estructura](#configuracion-base).
- [Reconstrucción comprobada de la base de prueba](#reconstruir-base).
- [Pruebas de seguridad y permisos](#pruebas-seguridad).
- [Reglas obligatorias de trabajo](../AGENTS.md).
- Contratos de modalidades: [Juego](juego.md). Servicios y sesiones de la app: [Android](android.md). Incidentes y pasos de publicación: [Operación](operacion.md).

Antes de aplicar SQL, comprobar qué se aplicó realmente y respetar el orden de los archivos. Las rutas de código/SQL parten de la raíz del repositorio. Actualizar aquí configuración general, arquitectura y recetas de prueba; la evidencia de cada función permanece en su tema para evitar versiones duplicadas.

<a id="tecnica"></a>

## Configuración, arquitectura y pruebas

Las reglas online y las monedas oficiales siguen en el servidor. Las migraciones del backend se aplican de forma controlada; los comandos de reconstrucción y pruebas pertenecen a una base aislada. Los ejemplos de variables y banderas conservados abajo no prueban su configuración actual en producción.

<a id="configuracion-base"></a>

### Configuración y arquitectura de la web

Contenido del README anterior. Sus comandos y ejemplos se conservan; el cron actual y las banderas deben contrastarse con el código y el estado final documentado de cada entrega.

Procedencia anterior: `README.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Configuración y arquitectura de la web</summary>

<a id="configuracion-base-trucazo"></a>

### Trucazo

Truco argentino online, a 15 o 30 puntos y sin flor, con monedas ficticias.
Dos modalidades: **1 contra 1** (mano a mano) y **2 vs 2** (en parejas, cuatro jugadores).
Construido con Next.js (App Router), React, TypeScript y Supabase (Auth + Postgres + Realtime).

<a id="configuracion-base-stack"></a>

#### Stack

- **Next.js 14** (App Router, Server Components + Client Components)
- **TypeScript** (modo `strict`)
- **Tailwind CSS** para los estilos
- **Supabase**: autenticación, base de datos Postgres, suscripciones Realtime y funciones RPC (`security definer`)

<a id="configuracion-base-requisitos-previos"></a>

#### Requisitos previos

- Node.js 18.18+ (recomendado 20+)
- Un proyecto de Supabase

<a id="configuracion-base-configuracion"></a>

#### Configuración

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
   - El esquema: ver [Reconstruir la base de prueba](#reconstruir-base), que explica
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

<a id="configuracion-base-desarrollo"></a>

#### Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

<a id="configuracion-base-scripts"></a>

#### Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — sirve el build de producción
- `npm run lint` — ESLint (config de Next)
- `npm run check:rpc-allowlist` — avisa si alguna función del servidor quedó abierta al cliente
- `npx tsx scripts/sim.ts` — comprueba que la lógica de truco del cliente y su espejo en SQL coincidan
- `scripts/rebuild-db.sh` — arma la base entera desde cero en un PostgreSQL de prueba

Todo esto lo corre solo GitHub en cada Pull Request (ver `.github/workflows/ci.yml`),
más las pruebas de seguridad de `supabase/tests/`.

<a id="configuracion-base-estructura"></a>

#### Estructura

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

<a id="configuracion-base-notas-de-diseno"></a>

#### Notas de diseño

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

</details>

<a id="cpu-vercel"></a>

### Consumo de CPU de Vercel y el middleware

**Incidente del 06/11/2026.** Vercel avisó que se había usado el 90% de las 4 h
mensuales gratis de "Fluid Active CPU" (3 h 36 min en 30 días). El 63% era el
middleware (`src/middleware.ts`, el portero que corre antes de cada página) y el
37% las funciones Node (`/api/analytics`, `/game/[id]`, `/lobby`, `/historia`).
El gasto subía parejo, de ~5 a ~9 min por día, sin picos ni ataques. En 12 h el
middleware corrió ~3.900 veces sobre 14.000 pedidos; `/manifest.webmanifest`
(409) y las páginas 404 (479) eran de los más frecuentes y no necesitan sesión.

**Ajuste (PR del 06/11/2026).** El `matcher` del middleware deja afuera:

- cualquier dirección que termine en extensión (`.webmanifest`, `.js`, `.wav`,
  `.woff2`, `.json`, `.txt`, `.md`, `.css`, `.html`, imágenes, y los `.php`/`.env`
  que piden los bots y terminaban en 404);
- `_next/`, `_vercel/`, `_md/`, `/og`, `/opengraph-image`, `/robots.txt`,
  `/sitemap.xml` y `/.well-known/`;
- los prefetch del router (cabeceras `next-router-prefetch` o `purpose: prefetch`),
  como en el ejemplo oficial de Next y Supabase.

Siempre corre, aunque sea prefetch, en `/api/*` (control de versión de la app
Android, `checkApiCompatibility`) y en `/`, `/login` y `/register`, que mandan al
lobby a quien ya entró: `SeoPageLayout` enlaza a `/` y, sin esto, un prefetch
guardado le mostraría la portada con botones de ingreso a alguien con sesión.

Se revisaron las rutas con punto en el nombre: `/llms.txt` es estática y
`/.well-known/assetlinks.json` no lee sesión; ninguna necesita el middleware. Los
códigos de invitación y los ids de partida son UUID, sin puntos.

**Reglas para lo que venga:**

- Una pantalla privada nueva, además de sumarse a `privatePaths`, tiene que
  comprobar la sesión ella misma y redirigir a `/login` (como `/lobby`): en un
  prefetch el middleware no corre.
- Una página o servicio que necesite sesión no puede tener un punto en la última
  parte de la dirección, o el middleware no la ve.

**Pruebas (build local, `next start`):** `npm run build` sin errores. `/lobby`,
`/historia` y `/game/x` sin sesión → 307 a `/login`; `/android` → `/login?android=1`;
`/?code=…` → `/auth/callback`; `/` y `/pardas-truco-reglas` con
`Accept: text/markdown` → markdown; `Accept: application/pdf` → 406;
`/manifest.webmanifest`, `/sw.js`, `/llms.txt`, `/.well-known/assetlinks.json`,
`/robots.txt`, `/sitemap.xml`, `/og` y `/opengraph-image` → 200. POST a
`/api/android/preferences` con Bearer: los registros de Supabase muestran la
llamada a `rpc/app_compatibility` hecha por "Next.js Middleware" en ese mismo
segundo. Además se comprobó la lista compilada de `.next/server/middleware-manifest.json`
contra 30 direcciones, con y sin prefetch.

**Pendiente de medir:** después del merge, revisar en Vercel (Usage → Fluid Active
CPU) que el gasto diario baje. Si no alcanza, quedan dos opciones a decidir por el
dueño: pasar el middleware a `runtime: 'nodejs'` o el plan Pro (US$20 por mes).

<a id="convertir-invitado"></a>

### Invitado que se registra: conserva lo jugado (11/11/2026)

**Estado (11/11):**
- El dueño aplicó `supabase/migrations/20261111235000_convertir_invitado.sql` y activó *Manual linking*.
- Probó el registro con email en la preview y anduvo. Consulta de sólo lectura a producción: el invitado convertido («cweawsda») conserva su partida (`games_played` 1), tiene 1.000 monedas, eligió su nombre, `guest_name_pending` quedó en false y `username_changed_at` sigue en null.
- La primera prueba se hizo por error en `www.trucazo.com.ar`, todavía con el código viejo, y creó una cuenta nueva aparte («asdasd»).
- **Google, sin probar todavía.**
- **Integrado el 11/11 a las 17:05 UTC** ([PR #183](https://github.com/santibpapa/trucazo/pull/183)), con todas las comprobaciones en verde. Antes fallaron tres veces porque las máquinas de GitHub no resolvían `archive.ubuntu.com`. Comprobado en producción: un invitado que abre `/register` ve «Guardá lo que jugaste».

**Pedido del dueño (11/11):** que el invitado que se registra no pierda lo que jugó. Decidió completar las monedas hasta 1.000 si tiene menos y dejarle elegir el nombre, porque el invitado se llama `Invitado####`.

**Cómo era:** `/register` llamaba a `signUp`, que crea un usuario nuevo. El invitado quedaba abandonado con sus monedas, historial y Modo Historia.

**Cómo queda:** si la sesión es de invitado, la web convierte al mismo usuario en cuenta. Todo lo que cuelga de su id se conserva solo.
- **Email:** `/register` llama a `updateUser({ email, data })` y después a `updateUser({ password })`, refresca la sesión para que el token deje de decir invitado, acepta las normas y llama a `choose_guest_account_name`.
  - Hoy Supabase confirma el email al instante: las 77 cuentas con email del último mes quedaron confirmadas en el acto (consulta de sólo lectura a `auth.users`, 11/11). Si algún día se pide confirmación, la pantalla muestra «Revisá tu email» y el invitado sigue siéndolo hasta tocar el enlace.
  - Si el email ya tiene cuenta (`email_exists`), se avisa y no se toca nada.
- **Google:** en `/register`, el botón usa `linkIdentity` cuando la sesión es de invitado (`GoogleButton` con `linkGuest`).
  - Necesita *Manual linking* activado. Si está apagado, el botón avisa y no entra con otro usuario.
  - Si esa cuenta de Google ya tiene usuario, Supabase vuelve con `error_code=identity_already_exists` y el callback lleva a `/register?google=ocupada` con el aviso.
  - En `/login` y en la portada, Google sigue entrando con la cuenta que corresponda, como antes.
- **Base:** columna `profiles.guest_name_pending` y trigger `on_guest_converted` en `auth.users`. El trigger sólo actúa cuando `is_anonymous` pasa de true a false:
  - completa las monedas hasta 1.000;
  - marca el nombre pendiente si sigue siendo `Invitado` con número. Quien eligió nombre al entrar por un enlace lo conserva.

  Si algo falla, el trigger sólo deja un aviso: la conversión de la cuenta nunca se cae por el perfil.
- **Nombre:** `choose_guest_account_name` se usa una sola vez, con las reglas de `change_username` (3 a 20 caracteres, filtro, nombre libre, sin partida en juego), y copia el nombre en las mismas tablas. No gasta el cambio gratis.
  - Mira `auth.users` y no el token. Igual el trigger `safety_profiles` exige el token nuevo, por eso la web refresca la sesión antes.
  - En el lobby, `GuestNamePrompt` se lo pide a quien tenga `guest_name_pending`, sobre todo a quien entró con Google. Puede quedarse con el nombre de invitado.
- **Límite:** sólo funciona durante la visita. `GuestSessionGuard` cierra la sesión de invitado si el navegador vuelve después de 90 segundos sin latido.
- **Compatibilidad:** sólo agrega una columna, un trigger y una función.

**Pruebas:**
- `supabase/tests/convertir_invitado.sql`, sumada al CI: monedas con 80, 3.000 y 40, quién queda pendiente, que otros cambios de `auth.users` no regalan monedas, una sola vez, rechazos, copia del nombre y permisos.
- `seguridad_privilegios_funciones.sql` suma la función nueva a la lista de RPC públicas.
- Base local reconstruida desde cero el 11/11: todas las pruebas SQL del CI pasan, salvo `game_completion_presence.sql`, que necesita la extensión `safeupdate`. Esa extensión sólo la instala el CI.
- El flujo de Supabase Auth (`updateUser` y `linkIdentity`) no se puede probar en una base local: queda para la preview.

<a id="chat-global-2026-11-07"></a>

### Chat global: últimos 500 mensajes y filtro de groserías

**Problema del 07/11/2026.** El chat del lobby quedó con un solo mensaje. No fue un
error: desde julio, cada mensaje nuevo tenía 1 chance en 20 de borrar todos los de
más de 3 días (`send_chat_message`). Con poco movimiento, el chat se vaciaba de
golpe y al azar. Comprobado en producción (sólo lectura): un único mensaje, del 05/11.

**Decisiones del dueño:** guardar siempre los últimos 500; mostrar 100 (antes 50);
tapar con asteriscos sólo lo fuerte (insultos pesados, discriminatorios, sexuales y
amenazas). Las puteadas de todos los días ("boludo", "la puta madre", "qué orto")
pasan. Sólo el chat global; el chat de mesa queda igual. Los mensajes viejos no se
corrigen.

**Preparado:** [`20261107120000_chat_global_500_filtro.sql`](../supabase/migrations/20261107120000_chat_global_500_filtro.sql).
`send_chat_message` ya no borra nada; la tarea `trucazo-chat-keep-500` (04:45 UTC)
deja los 500 más nuevos. La lista vive en `chat_banned_words` (cerrada al
navegador). Compara sin mayúsculas ni tildes y con números en lugar de letras
("p0rong4"); cada entrada es una palabra entera, así "disputo" no se tapa. Para
sumar una: `insert into public.chat_banned_words(pattern) values ('palabra');`.
Prueba: `supabase/tests/chat_global.sql` (en el CI). No necesita versión nueva de la
app: las versiones instaladas siguen mostrando 50, con el mismo filtro.

**Aplicado — 07/11/2026:** el dueño corrió la migración en el SQL Editor.
Comprobado después en producción: 43 entradas en la lista, tarea
`trucazo-chat-keep-500` activa (04:45 UTC), `send_chat_message` sin borrado,
"sos un TROLO, dale boludo" → "sos un \*\*\*\*\*, dale boludo", lista y filtro
cerrados al navegador. Los 100 mensajes en pantalla llegan con el merge a `master`.

**Ajuste — 07/11/2026:** a pedido del dueño, "concha" y "chota" dejan de taparse
(se usan de onda); "conchudo/a" sigue tapado. [`20261107180000_chat_filtro_sin_concha_chota.sql`](../supabase/migrations/20261107180000_chat_filtro_sin_concha_chota.sql),
aplicada desde la herramienta de Supabase y comprobada: 42 entradas, "la concha de
la lora, esta carta es una chota" pasa entera, "sos un conchudo" se tapa.

**Ajuste — 07/11/2026:** a pedido del dueño se tapa "la concha de tu madre" (también
sin "la"). [`20261107190000_chat_filtro_concha_de_tu_madre.sql`](../supabase/migrations/20261107190000_chat_filtro_concha_de_tu_madre.sql),
aplicada desde la herramienta de Supabase y comprobada: 43 entradas; "la concha de
la lora" sigue pasando.

<a id="reconstruir-base"></a>

### Reconstruir la base de prueba

La foto de esquema sola no alcanza: la receta incluye las migraciones en orden. Nunca apuntar la reconstrucción a producción.

Procedencia anterior: `supabase/schema/README.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Reconstruir la base de prueba</summary>

<a id="reconstruir-base-como-se-arma-la-base-desde-cero"></a>

### Cómo se arma la base desde cero

Si algún día se pierde el proyecto de Supabase, esta carpeta más
`supabase/migrations/` alcanzan para volver a armar todo el backend.

> **Antes esta página mentía.** Decía "corré tablas → funciones → políticas" y con
> eso **no se podía**: fallaba por el orden de los archivos. Ahora la receta está
> comprobada contra un PostgreSQL de verdad, y el CI la corre en cada Pull Request,
> así que si se rompe nos enteramos el mismo día.

<a id="reconstruir-base-la-forma-facil"></a>

#### La forma fácil

```bash
createdb trucazo_prueba
PGDATABASE=trucazo_prueba scripts/rebuild-db.sh
```

Termina en 0 si salió entera. Al final comprueba solo que no falte nada: las
tablas, los 7 triggers y los catálogos con datos adentro.

⚠️ Es para bases de **prueba**. Nunca lo apuntes a producción.

<a id="reconstruir-base-que-hace-ese-script-en-orden"></a>

#### Qué hace ese script, en orden

| Paso | Archivo | Qué trae |
|---|---|---|
| 1 | `00_supabase_local.sql` | El andamiaje de Supabase: los roles, los usuarios, el depósito de archivos, los permisos. **Solo para bases locales** — en Supabase ya existe. |
| 2 | `tables.sql` | Las tablas y sus columnas. |
| 3 | `functions.sql` | Las funciones (la lógica del juego). |
| 4 | `policies.sql` | Las llaves, las restricciones y las reglas de seguridad. |
| 5 | `supabase/migrations/*.sql` | **Todo el historial, en orden.** De acá salen los triggers y los catálogos (salones, marcos, medallas, accesorios, rivales de la campaña). |

El paso 5 es el importante: **la foto sola no alcanza**. No guarda los triggers ni
los datos de los catálogos, y está sacada a mitad de camino. Las migraciones son
las que completan y las que ponen todo al día.

<a id="reconstruir-base-por-que-la-foto-no-es-la-fuente-de-la-verdad"></a>

#### Por qué la foto no es la fuente de la verdad

La estructura completa del agregado 2vs2 está en `team_2vs2.json`: tablas,
restricciones, índices, RLS, permisos y definiciones de funciones, exportados de
una base de prueba reconstruida. No contiene usuarios ni cartas. Es una referencia
para revisión; **no se ejecuta ni sustituye las migraciones**. Se regenera con
`scripts/export-team-schema.sql` después de aplicar todo el historial. Mantenerla
separada evita crear dos veces las tablas 2vs2 al reconstruir la base histórica.

`supabase/schema/` es una **foto** para poder reconstruir. La verdad de lo que
tiene la base es `supabase/migrations/`, que es el historial completo.

Por eso el script vuelve a pasar todas las migraciones y no hay que regenerar la
foto cada vez que se cambia algo: si mañana agregás una migración, entra sola en
la reconstrucción. Una foto hay que acordarse de actualizarla, y nadie se acuerda.

<a id="reconstruir-base-lo-que-hay-que-activar-a-mano-en-el-panel-de-supabase"></a>

#### Lo que hay que activar a mano en el panel de Supabase

No son SQL "normal" y no entran en ningún archivo:

- **Realtime** en las tablas `games` y `tables` (para que las jugadas del rival
  aparezcan solas).
- El **cron** que limpia partidas y mesas abandonadas (`sweep_stale_games` y
  `sweep_stale_tables`, cada 5 minutos). En una base local ni hace falta: el
  andamiaje deja una imitación de `cron` que no hace nada.
- **Manual linking** en Authentication (desde el 11/11/2026): permite que un
  invitado sume su cuenta de Google al mismo usuario ([convertir invitado](#convertir-invitado)).

Para el 2vs2, la migración sí incorpora `team_tables` a la publicación de Realtime
y programa `sweep_team_tables` cada 5 minutos. Hay que verificar ambos al aplicar
la entrega; nunca publicar `team_hands` ni `team_internal.requests`. El barrido
también limpia solicitudes de acciones de mesas cerradas hace más de 30 días,
conservando los comprobantes de creación e ingreso.

<a id="reconstruir-base-detalles-que-costaron-encontrar"></a>

#### Detalles que costaron encontrar

Están escritos también dentro de cada archivo, pero conviene tenerlos juntos:

1. **Las claves primarias van primero.** Estaban ordenadas alfabéticamente junto
   con las llaves foráneas, así que una tabla apuntaba a `profiles` mucho antes de
   que `profiles` tuviera la suya. Cortaba con *"there is no unique constraint
   matching given keys"*.

2. **`functions.sql` necesita `set check_function_bodies = off`.** Las funciones
   están ordenadas por nombre y varias se nombran entre sí antes de existir.

3. **Los permisos de tabla son imprescindibles para que las pruebas sirvan.**
   Supabase le da a `anon` y `authenticated` permiso amplio sobre `public` y confía
   la protección real a la RLS. Una base local sin eso rebota todo con *"permission
   denied for table"* y las pruebas de seguridad **pasan en verde sin haber probado
   nada**. Lo aplica `00_supabase_local.sql`, y el script lo repite al final porque
   las migraciones crean tablas nuevas después.

4. **Tirar los schemas no borra los permisos por defecto.** Viven colgados del rol
   y sobreviven. Sin limpiarlos, el segundo armado sale distinto del primero.

</details>

<a id="pruebas-seguridad"></a>

### Pruebas de seguridad y permisos

Instrucciones para una base de prueba.

Procedencia anterior: `supabase/tests/LEEME.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Pruebas de seguridad y permisos</summary>

<a id="pruebas-seguridad-pruebas-de-seguridad"></a>

### Pruebas de seguridad

<a id="pruebas-seguridad-que-hay-aca"></a>

#### Qué hay acá

`seguridad_pr1.sql` **intenta hacer trampa** de diez maneras distintas contra la
base. `seguridad_privilegios_funciones.sql` comprueba además que todas las
funciones actuales y futuras nazcan cerradas salvo la API explícita del cliente,
que el lookup de login sea exclusivo de `service_role`, y que los barridos
rechacen intervalos peligrosos. `seguridad_pr2.sql` comprueba que las cuatro
formas de darse de alta (invitado, registro, Google y nombre repetido) creen UN
solo perfil, e intenta abusar de las reseñas y del aviso de mesa. Si algo falla,
los archivos cortan con error.

`ciclo_retorno.sql` prueba las misiones y el desafío semanal: catálogo de 22
variantes, rotación sin repetición consecutiva, progreso único por partida,
reclamo idempotente, privacidad, clasificación de modos, fecha argentina y una
sola protección de racha por semana.

`tournaments.sql` intenta saltarse permisos de administrador, inscribir una
cuenta invitada, bot o de prueba, crear combinaciones inválidas y duplicar una
aceptación/check-in. `tournaments_concurrency.sh` hace competir dos conexiones
reales por el último lugar y comprueba que una pase a lista de espera.
`tournament_announcement_delivery.sql` comprueba anuncios pendientes tras
reprogramaciones repetidas, recuperación sin duplicar, intentos anteriores,
bajas, tandas de cinco con prioridad de partidas y espera por límites diarios
y por segundo sin agotar los reintentos.
`tournaments_competition.sql` recorre torneos 1v1 de cuatro, ocho y doce jugadores,
grupos, pases directos, ausencias, pausa y reanudación, resultado repetido,
apuesta cero, revancha prohibida y bloqueo de mesas normales incluso al comenzar
una 2v2 ya armada. También cubre reemplazos tardíos con check-in, descalificación
después de grupos, dos descalificados en semifinales e historial de nombres.
`tournaments_live_partners.sql` comprueba las dos funciones de lectura de la
etapa 2 de torneos (04/11/2026): marcador en vivo de la llave (lado A = jugador 1
o equipo 0; nada para invitados, borradores ni torneos inexistentes) y
compañeros recientes (orden por la partida más nueva; fuera bots, invitados,
cuentas de prueba, bloqueos y partidas de hace más de 60 días).

La prueba ranking_emails.sql comprueba que un cambio de podio avise a todos los
puestos afectados, que cada jugador tenga un máximo de un correo cada 24 horas
y que la cola y sus credenciales no sean visibles desde el navegador.

Sirve para que los agujeros que se cerraron no vuelvan a abrirse sin que nadie se
dé cuenta.

`tercera_parda.sql` juega los 15 caminos de resolución de una mano contra
`play_card`, con ambos jugadores como mano, campaña y 1vs1, valores 1/2/4
y cierre de partida. Verifica que la tercera parda favorezca al ganador de la
primera y que tres pardas favorezcan a quien es mano.

<a id="pruebas-seguridad-como-se-corre"></a>

#### Cómo se corre

Contra una base **local de prueba**, nunca contra la de producción (crea usuarios
y partidas de mentira; al final deshace todo, pero igual):

```
psql -f supabase/tests/tercera_parda.sql
psql -f supabase/tests/seguridad_pr1.sql
psql -f supabase/tests/seguridad_privilegios_funciones.sql
psql -f supabase/tests/seguridad_pr2.sql
psql -f supabase/tests/ciclo_retorno.sql
psql -f supabase/tests/tournaments.sql
psql -f supabase/tests/tournaments_competition.sql
psql -f supabase/tests/tournaments_delete.sql
psql -f supabase/tests/tournaments_live_partners.sql
psql -f supabase/tests/match_chat.sql
supabase/tests/match_chat_concurrency.sh
supabase/tests/tournaments_concurrency.sh
psql -f supabase/tests/ranking_emails.sql
```

Termina en 0 si está todo bien y en distinto de 0 si encontró algo, así que sirve
tal cual para automatizarlo más adelante.

<a id="pruebas-seguridad-para-armar-la-base-local"></a>

#### Para armar la base local

Un solo comando:

```bash
createdb trucazo_prueba
PGDATABASE=trucazo_prueba scripts/rebuild-db.sh
```

Deja la base igual que la de verdad: las tablas, las funciones, las reglas, los
6 triggers y los catálogos. Los detalles están en
[Reconstruir la base de prueba](#reconstruir-base).

Hay un cuarto archivo acá, `reconstruccion_completa.sql`, que comprueba que no
haya quedado nada afuera. El script lo corre al final, pero sirve suelto para
revisar cualquier base de prueba.

<a id="pruebas-seguridad-la-trampa-que-hay-que-tener-en-cuenta"></a>

#### La trampa que hay que tener en cuenta

Hace que las pruebas den **falsos negativos**: parece que está todo cerrado
cuando en realidad no se probó nada.

Supabase le da a `anon` y `authenticated` permiso amplio sobre `public` y confía
la protección real a la RLS. Una base local que no tenga esos permisos rebota
**todos** los intentos de trampa con `permission denied for table`, y las pruebas
pasan en verde sin haber probado absolutamente nada.

`scripts/rebuild-db.sh` ya los aplica (y los repite al final, porque las
migraciones crean tablas después). Si armás la base a mano, no te los saltees.

Además, en Supabase existe el trigger `handle_new_user`, que crea el perfil
automáticamente al dar de alta un usuario. Por eso, al insertar perfiles de
prueba, el `on conflict` tiene que pisar también el `username`: si no, el perfil
queda con el nombre sacado del email y las búsquedas no encuentran nada.

</details>

