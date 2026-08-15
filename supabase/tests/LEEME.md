# Pruebas de seguridad

## Qué hay acá

`seguridad_pr1.sql` **intenta hacer trampa** de diez maneras distintas contra la
base. `seguridad_privilegios_funciones.sql` comprueba además que todas las
funciones actuales y futuras nazcan cerradas salvo la API explícita del cliente,
que el lookup de login sea exclusivo de `service_role`, y que los barridos
rechacen intervalos peligrosos. `seguridad_pr2.sql` comprueba que las cuatro
formas de darse de alta (invitado, registro, Google y nombre repetido) creen UN
solo perfil, e intenta abusar de las reseñas y del aviso de mesa. Si algo falla,
los archivos cortan con error.

Sirve para que los agujeros que se cerraron no vuelvan a abrirse sin que nadie se
dé cuenta.

## Cómo se corre

Contra una base **local de prueba**, nunca contra la de producción (crea usuarios
y partidas de mentira; al final deshace todo, pero igual):

```
psql -f supabase/tests/seguridad_pr1.sql
psql -f supabase/tests/seguridad_privilegios_funciones.sql
psql -f supabase/tests/seguridad_pr2.sql
```

Termina en 0 si está todo bien y en distinto de 0 si encontró algo, así que sirve
tal cual para automatizarlo más adelante.

## Para armar la base local

Un solo comando:

```bash
createdb trucazo_prueba
PGDATABASE=trucazo_prueba scripts/rebuild-db.sh
```

Deja la base igual que la de verdad: las tablas, las funciones, las reglas, los
6 triggers y los catálogos. Los detalles están en
[`supabase/schema/README.md`](../schema/README.md).

Hay un cuarto archivo acá, `reconstruccion_completa.sql`, que comprueba que no
haya quedado nada afuera. El script lo corre al final, pero sirve suelto para
revisar cualquier base de prueba.

## La trampa que hay que tener en cuenta

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
