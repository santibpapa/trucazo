# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Trucazo — reglas de la casa (específico de este proyecto)

Truco argentino 1v1 online, a 15 o 30 puntos, sin flor, con monedas ficticias.
Stack: Next.js 14 (App Router) + React + TypeScript + Tailwind + Supabase
(Auth + Postgres + Realtime + RPC `security definer`).

## El dueño no programa
El dueño del proyecto **no escribe código**: define el qué y el por qué, no el cómo.
- Explicá en criollo, sin jerga. Si usás un término técnico, definilo o usá una analogía.
- Para cualquier cosa que él tenga que ejecutar (correr SQL, exportar, clicks en un
  panel): instrucciones paso a paso, "copiá y pegá esto acá". No asumas que sabe usar
  una terminal, git, o qué es una "migración" sin explicación.
- Confirmaciones simples y tranquilizadoras; no lo abrumes con detalle innecesario.

## El servidor es la única autoridad (la lógica vive en SQL, NO en el cliente)
- Toda la lógica del juego (jugar carta, envido, truco, repartir, puntajes, monedas)
  corre en funciones `security definer` de Postgres. El cliente
  (`src/app/game/[id]/GameClient.tsx`) es un "reflejo": llama RPCs y muestra lo que
  devuelven. No metas reglas de juego en el cliente.
- Las manos viven en `game_hands` (RLS por jugador, **fuera de Realtime**) para que no
  se filtren las cartas del rival. Nunca las pongas en la fila de `games`.
- `src/lib/truco.ts` solo tiene utilidades de presentación (ranking, imágenes). Su
  lógica está **espejada en SQL** (`_truco_deck`, `_envido_points`, etc.): si cambiás
  una, cambiá la otra.

## Backend: cómo se trabajan los cambios
- **No hay CI/CD ni deploy automático del backend.** El dueño corre cada migración a
  mano en el SQL Editor de Supabase.
- Para cambiar una función ya aplicada: **creá una migración NUEVA** en
  `supabase/migrations/` (con fecha posterior). **Nunca edites una migración ya
  aplicada** — Supabase las corre por orden alfabético de nombre, así que el orden
  importa (ojo con dos migraciones del mismo día que redefinen la misma función).
- `supabase/schema/` es la **foto** del estado actual del backend (tablas, funciones,
  RLS) para reconstruir de cero. `supabase/migrations/` es el historial incremental.
- Configuración que NO es SQL y se setea a mano en el panel: Realtime en `games`/
  `tables`, el trigger `handle_new_user`, y el cron de `sweep_stale_games`.

## Diseño y estética
Prioridad alta: todo pulido y simple de entender. UI limpia, sin texto denso.
