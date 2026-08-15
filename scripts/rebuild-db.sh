#!/usr/bin/env bash
# ============================================================
# TRUCAZO — Reconstruir la base entera desde cero
#
# Arma una copia completa del backend en un PostgreSQL vacío: las tablas, las
# funciones, las reglas de seguridad, los triggers y los catálogos (salones,
# marcos, medallas, rivales de la campaña...).
#
# ⚠️  Es para bases de PRUEBA. Nunca apuntes esto a la base de producción.
#
# Uso:
#   scripts/rebuild-db.sh                      # usa las variables PG* de siempre
#   PGHOST=/tmp/x PGPORT=5439 scripts/rebuild-db.sh
#
# Termina en 0 si la reconstrucción salió entera, y en distinto de 0 al primer
# error. Eso es a propósito: es lo que hace que el CI se ponga en rojo.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

PSQL=(psql -v ON_ERROR_STOP=1 --quiet --no-psqlrc)

# ------------------------------------------------------------
# Esto es "desde cero": la base tiene que estar vacía
# ------------------------------------------------------------
# Correrlo dos veces seguidas falla, y está bien que falle. Lo que no sirve es
# que falle con un error críptico a mitad de camino, así que avisamos antes.
ocupadas="$("${PSQL[@]}" --tuples-only --no-align -c \
  "select count(*) from pg_tables where schemaname = 'public';")"

if [ "$ocupadas" != "0" ]; then
  if [ "${TRUCAZO_REBUILD_RESET:-0}" = "1" ]; then
    echo "==> 0/5  Vaciando la base (TRUCAZO_REBUILD_RESET=1)"
    "${PSQL[@]}" <<'SQL'
drop schema if exists public  cascade;
drop schema if exists auth    cascade;
drop schema if exists storage cascade;
drop schema if exists cron    cascade;
create schema public;

-- Tirar los schemas NO borra los "permisos por defecto" (qué privilegios nacen
-- teniendo las cosas nuevas): esos viven aparte, colgados del rol, y sobreviven.
--
-- Sin esto, el segundo armado sale distinto del primero: los defaults cerrados
-- que dejó 20260815_seguridad_6 siguen puestos, así que auth.uid() nace sin
-- permiso para nadie y la prueba de seguridad se cae con "permission denied for
-- function uid" — un error que no tiene NADA que ver con lo que se está
-- probando. Costó encontrarlo; por eso queda escrito.
alter default privileges for role current_user grant execute on functions to public;
alter default privileges in schema public for role current_user
  revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public for role current_user
  revoke all on sequences from anon, authenticated, service_role;
SQL
  else
    cat >&2 <<EOF
ERROR: la base "${PGDATABASE:-$(whoami)}" ya tiene $ocupadas tablas en public.

Este script reconstruye DESDE CERO, así que necesita una base vacía.

  • Lo normal: creá una base nueva y apuntá ahí.
      createdb trucazo_prueba && PGDATABASE=trucazo_prueba scripts/rebuild-db.sh

  • Si de verdad querés BORRAR lo que hay en esta base y rehacerla:
      TRUCAZO_REBUILD_RESET=1 scripts/rebuild-db.sh

⚠️  Nunca contra la base de producción.
EOF
    exit 1
  fi
fi

# El único archivo que se saltea. Su contenido es SOLO programar el barrido con
# pg_cron, una extensión que no existe fuera de Supabase. Todo lo demás de esa
# tanda (la función sweep_stale_games) vive en 20260620_stale_games.sql, que sí
# se corre. Las otras llamadas sueltas a cron.schedule() las absorbe la
# imitación que arma 00_supabase_local.sql.
SALTEADAS=(20260620_stale_games_cron.sql)

echo "==> 1/5  Andamiaje de Supabase (roles, auth, storage, permisos)"
"${PSQL[@]}" -f supabase/schema/00_supabase_local.sql

echo "==> 2/5  Tablas"
"${PSQL[@]}" -f supabase/schema/tables.sql

echo "==> 3/5  Funciones"
"${PSQL[@]}" -f supabase/schema/functions.sql

echo "==> 4/5  Llaves, restricciones y reglas de seguridad"
"${PSQL[@]}" -f supabase/schema/policies.sql

echo "==> 5/5  Migraciones (en orden alfabético)"

# ------------------------------------------------------------
# Sacar de la foto lo que las migraciones van a rehacer
# ------------------------------------------------------------
# La foto (supabase/schema/) es un punto INTERMEDIO de la historia, no el final:
# está sacada a mitad de camino y las migraciones siguen hasta hoy. Por eso hay
# que volver a pasarlas todas.
#
# El choque: varias migraciones dicen "create function" y "create policy" a
# secas, sin borrar antes. Contra una base vacía anda; contra la foto revienta
# con "ya existe".
#
# Se arregla borrando justo eso antes de empezar. No se pierde nada: todo lo que
# una migración toca lo reconstruyen las migraciones, que corren después y en
# orden. La foto solo hace falta para lo viejo que ninguna migración tocó nunca.
#
# Las dos listas salen SOLAS de las migraciones. Si mañana alguien agrega otro
# "create function" o "create policy" sin borrar antes, entra acá solo y nadie
# tiene que acordarse de nada.

funciones_que_rehacen_las_migraciones() {
  grep -rhoiP 'create\s+function\s+(public\.)?\K\w+' supabase/migrations/ | sort -u
}

politicas_que_rehacen_las_migraciones() {
  # -z para que el patrón cruce saltos de línea: algunas dejan el "on ..." abajo.
  grep -rhzoiP 'create\s+policy\s+"[^"]+"\s+on\s+[\w.]+' supabase/migrations/ \
    | tr '\0' '\n' | tr -s ' \n\t' ' ' \
    | sed 's/create policy/\ncreate policy/gI' \
    | grep -oiP 'create policy "[^"]+" on [\w.]+' \
    | sed -E 's/create policy (".*") on (.*)/drop policy if exists \1 on \2;/I' \
    | sort -u
}

fn="$(funciones_que_rehacen_las_migraciones)"
pol="$(politicas_que_rehacen_las_migraciones)"
echo "     (se sacan de la foto: $(echo "$fn" | grep -c .) funciones y $(echo "$pol" | grep -c .) políticas que rehacen las migraciones)"
{
  echo "$pol"
  if [ -n "$fn" ]; then
    echo "do \$rebuild\$ declare r record; begin"
    echo "  for r in select p.oid::regprocedure as f from pg_proc p"
    echo "           where p.pronamespace = 'public'::regnamespace"
    echo "             and p.proname = any (array[$(echo "$fn" | sed "s/.*/'&'/" | paste -sd, -)])"
    echo "  loop execute 'drop function if exists ' || r.f; end loop;"
    echo "end \$rebuild\$;"
  fi
} | "${PSQL[@]}"

# Que la lista de salteadas no se pudra en silencio: si el archivo ya no existe,
# cortamos, porque quiere decir que alguien lo renombró o lo borró.
for s in "${SALTEADAS[@]}"; do
  if [ ! -f "supabase/migrations/$s" ]; then
    echo "ERROR: '$s' está en la lista de salteadas pero ya no existe." >&2
    exit 1
  fi
done

total=0
for f in supabase/migrations/*.sql; do
  base="$(basename "$f")"
  saltear=0
  for s in "${SALTEADAS[@]}"; do [ "$base" = "$s" ] && saltear=1; done
  if [ "$saltear" = 1 ]; then
    echo "     (salteada: $base — solo programa el cron)"
    continue
  fi
  # -o /dev/null tira el resultado de los select sueltos (los cron.schedule y
  # demás) para que el registro del CI quede legible. Los errores siguen yendo a
  # stderr y ON_ERROR_STOP los sigue haciendo cortar.
  "${PSQL[@]}" -o /dev/null -f "$f"
  total=$((total + 1))
done
echo "     $total migraciones aplicadas"

# Los permisos de tabla, otra vez y al final: las tablas que crearon las
# migraciones nacieron después del grant inicial. Sin esto, las pruebas de
# seguridad dan falsos negativos (todo rebota con "permission denied" y parece
# que está cerrado cuando en realidad no se probó nada).
"${PSQL[@]}" <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
revoke all on public.bot_decisions from anon, authenticated;
SQL

echo
echo "==> Control: ¿quedó todo?"
"${PSQL[@]}" -f supabase/tests/reconstruccion_completa.sql

echo
echo "✅ Base reconstruida."
