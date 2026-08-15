# Cómo se arma la base desde cero

Si algún día se pierde el proyecto de Supabase, esta carpeta más
`supabase/migrations/` alcanzan para volver a armar todo el backend.

> **Antes esta página mentía.** Decía "corré tablas → funciones → políticas" y con
> eso **no se podía**: fallaba por el orden de los archivos. Ahora la receta está
> comprobada contra un PostgreSQL de verdad, y el CI la corre en cada Pull Request,
> así que si se rompe nos enteramos el mismo día.

## La forma fácil

```bash
createdb trucazo_prueba
PGDATABASE=trucazo_prueba scripts/rebuild-db.sh
```

Termina en 0 si salió entera. Al final comprueba solo que no falte nada: las
tablas, los 6 triggers y los catálogos con datos adentro.

⚠️ Es para bases de **prueba**. Nunca lo apuntes a producción.

## Qué hace ese script, en orden

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

## Por qué la foto no es la fuente de la verdad

`supabase/schema/` es una **foto** para poder reconstruir. La verdad de lo que
tiene la base es `supabase/migrations/`, que es el historial completo.

Por eso el script vuelve a pasar todas las migraciones y no hay que regenerar la
foto cada vez que se cambia algo: si mañana agregás una migración, entra sola en
la reconstrucción. Una foto hay que acordarse de actualizarla, y nadie se acuerda.

## Lo que hay que activar a mano en el panel de Supabase

No son SQL "normal" y no entran en ningún archivo:

- **Realtime** en las tablas `games` y `tables` (para que las jugadas del rival
  aparezcan solas).
- El **cron** que limpia partidas y mesas abandonadas (`sweep_stale_games` y
  `sweep_stale_tables`, cada 5 minutos). En una base local ni hace falta: el
  andamiaje deja una imitación de `cron` que no hace nada.

## Detalles que costaron encontrar

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
