# Backend — configuración, base de datos, seguridad y pruebas

[Volver al README](../README.md) · Documento principal del backend. Organización actualizada el **13/10/2026**. Esta tarea no ejecutó SQL, consultó producción ni desplegó servicios.

## Estado actual

- Next.js 15.5.28, React, TypeScript y Tailwind; Node24.22.1 o posterior de la rama24. Supabase aporta cuentas, Postgres y Realtime. La lógica online y las monedas oficiales viven en funciones SQL del servidor. La [sincronización local del21/10](android.md#android-sync-github-2026-10-21) conserva las fuentes SQL de ambas líneas de trabajo; no aplicó migraciones a producción.
- Las cartas de cada jugador viven en tablas privadas de manos, fuera de Realtime. El cliente muestra el estado y llama las funciones autorizadas.
- **El backend no se despliega automáticamente.** Cada cambio aplicado se conserva; para corregir una función se crea una migración nueva y el dueño la ejecuta en el SQL Editor con instrucciones concretas.
- La reconstrucción completa utiliza la foto de esquema y todas las migraciones en orden. Reconstrucción y pruebas SQL se ejecutan en una base aislada.
- ANDROID-17 en curso: control de compatibilidad por sesión en esquema privado `app_compatibility`, con comprobación previa de PostgREST. Dos migraciones nuevas ejecutadas manualmente por el dueño; acceso interno corregido y login por usuario verificado. Mínima17 sin retiro activo. Estado, alcance y pruebas en [Android17](android.md#android-etapa-17); no repetir las migraciones.
- El cron 1v1 comprobado el 13/10 ejecuta sweep_stale_games(10) cada cinco minutos. Los ejemplos antiguos de cron/banderas de abajo son referencias históricas, no prueba de la configuración actual.
- Las correcciones de ranking y presencia del PR #120 están incorporadas. SQL de ranking aplicado y recepción de presencia comprobados en producción el 13/10; la evidencia y aceptación pendiente de partidas reales están en [Operación](operacion.md#correccion-cierres-presencia). Las migraciones de exportación/sincronización de Historia ya fueron aplicadas el 11/10; su evidencia está en [Android](android.md#historia-sincronizacion).

## Próximo paso y cómo retomar

Para el incidente de producción, seguir el [traspaso actualizado](operacion.md#correccion-cierres-presencia): completar la aceptación de partidas reales; no repetir la migración ya aplicada. Para la integración Android, conservar las reglas SQL existentes y adaptar únicamente el acceso autorizado de la app según [su plan vigente](android.md#android-estado-actual).

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

