# Trucazo

Truco argentino **1 contra 1** online, a 30 puntos y sin flor, con monedas ficticias.
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
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

   > Solo se usan claves públicas (`anon`). La lógica sensible (mover monedas, cerrar
   > partidas, crear/unirse a mesas) corre en funciones RPC `security definer` en Supabase.

3. Asegurate de tener configurado en Supabase:
   - Tablas: `profiles`, `tables`, `games`, `game_history`
   - Políticas **RLS** en todas las tablas
   - Funciones RPC: `create_table`, `join_table`, `cancel_table`, `finish_game`
   - **Realtime habilitado** en las tablas `games` y `tables` (la partida y el lobby
     dependen de las suscripciones a cambios)

   > ⚠️ El esquema SQL (tablas, RLS y RPCs) todavía **no está versionado en este repo**.
   > Conviene exportarlo a `supabase/migrations/` para poder reproducir el backend.

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
public/cartas/         SVGs de las 40 cartas ({palo}_{valor}.svg)
```

## Notas de diseño

- El reparto y la mayor parte de la lógica de juego se calculan en el cliente y se
  persisten en la tabla `games`. La liquidación de monedas y el historial pasan por
  RPCs server-side para respetar las RLS.
- Cada jugador nuevo arranca con 1.000 monedas.
