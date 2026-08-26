# Trucazo

Truco argentino **1 contra 1** online, a 15 o 30 puntos y sin flor, con monedas ficticias.
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
