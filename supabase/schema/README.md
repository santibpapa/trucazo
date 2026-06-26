# 📸 La "foto" de la base (schema)

Esta carpeta es una **foto del estado actual de tu base de datos de Supabase**,
sacada el 2026-06-26. Sirve por si algún día perdés el proyecto de Supabase y
querés **reconstruir todo el backend desde cero**.

No hace falta tocar nada de acá para que el juego funcione. Es un respaldo.

## Qué hay adentro

| Archivo | Qué guarda |
|---|---|
| `tables.sql` | Las tablas y sus columnas (profiles, games, tables, etc.) |
| `functions.sql` | Todas las funciones (la lógica del juego, mover monedas, etc.) |
| `policies.sql` | Las llaves y las reglas de seguridad (quién puede ver/tocar qué) |

## Cómo reconstruir la base desde cero (si alguna vez hiciera falta)

En el **SQL Editor** de un proyecto Supabase nuevo, correr los archivos **en este orden**:

1. `tables.sql`
2. `functions.sql`
3. `policies.sql`

(El orden importa: las funciones y las reglas necesitan que las tablas ya existan.)

## Lo que NO entra en esta foto (extras de configuración)

Estas cosas se configuran aparte en el panel de Supabase, no son SQL "normal".
Si alguna vez reconstruís de cero, hay que volver a activarlas a mano:

- El **trigger** que crea tu perfil al registrarte (`handle_new_user` sobre `auth.users`).
- **Realtime** activado en las tablas `games` y `tables` (para que las jugadas
  del rival aparezcan solas).
- El **cron** que limpia partidas abandonadas (`sweep_stale_games`, cada 5 min).
