# Pruebas de seguridad

## Qué hay acá

`seguridad_pr1.sql` **intenta hacer trampa** de diez maneras distintas contra la
base. `seguridad_privilegios_funciones.sql` comprueba además que todas las
funciones actuales y futuras nazcan cerradas salvo la API explícita del cliente,
que el lookup de login sea exclusivo de `service_role`, y que los barridos
rechacen intervalos peligrosos. Si algo falla, los archivos cortan con error.

Sirve para que los agujeros que se cerraron no vuelvan a abrirse sin que nadie se
dé cuenta.

## Cómo se corre

Contra una base **local de prueba**, nunca contra la de producción (crea usuarios
y partidas de mentira; al final deshace todo, pero igual):

```
psql -f supabase/tests/seguridad_pr1.sql
psql -f supabase/tests/seguridad_privilegios_funciones.sql
```

Termina en 0 si está todo bien y en distinto de 0 si encontró algo, así que sirve
tal cual para automatizarlo más adelante.

## Para armar la base local

El orden que funciona es:

1. `supabase/schema/tables.sql`
2. `supabase/schema/functions.sql` — con `set check_function_bodies = off;` antes,
   porque el archivo está ordenado alfabéticamente y hay funciones que se
   nombran entre sí antes de existir.
3. `supabase/schema/policies.sql`
4. todas las migraciones de `supabase/migrations/`, en orden.

## Dos trampas que hay que tener en cuenta

Las dos hacen que la prueba dé **falsos negativos** (parece que está todo cerrado
cuando en realidad no se probó nada):

1. **Los permisos de tabla.** Supabase le da a `anon` y `authenticated` permisos
   amplios sobre `public` y confía la protección a la RLS. Una base local recién
   armada no los tiene, así que todo falla con `permission denied for table` y
   parece seguro. Hay que darlos a mano:

   ```sql
   grant usage on schema public to anon, authenticated;
   grant all on all tables in schema public to anon, authenticated;
   grant all on all sequences in schema public to anon, authenticated;
   revoke all on public.bot_decisions from anon, authenticated;
   ```

2. **Los triggers no están en el snapshot.** `supabase/schema/` guarda las
   funciones pero no los `create trigger`, así que en una base armada desde el
   snapshot no se otorgan medallas ni corren los defaults de perfil. Los triggers
   viven en las migraciones (`20260709_medallas.sql`, `20260620_seguridad_fixes.sql`,
   `20260626_turn_timer.sql`).

Además, en Supabase existe el trigger `handle_new_user`, que crea el perfil
automáticamente al dar de alta un usuario. Por eso, al insertar perfiles de
prueba, el `on conflict` tiene que pisar también el `username`: si no, el perfil
queda con el nombre sacado del email y las búsquedas no encuentran nada.
