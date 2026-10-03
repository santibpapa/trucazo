# Eliminación de cuentas

La persona puede pedir el borrado desde **Perfil → Eliminar mi cuenta** o desde
`https://www.trucazo.com.ar/eliminar-cuenta`, sin tener la aplicación instalada.
Se identifica con su contraseña o una entrada reciente con Google y escribe
`ELIMINAR`. El servidor toma la cuenta de la sesión; no acepta elegir otra cuenta.

## Activación, en este orden

1. Abrí Supabase y seleccioná el proyecto de Trucazo.
2. Entrá a **SQL Editor → New query**.
3. En este PR, abrí `supabase/migrations/20261001184850_account_deletion.sql`.
   Copiá TODO el contenido, pegalo en la consulta y tocá **Run** una sola vez.
   La consulta aplica todos los cambios juntos. Si falla, no avances con el PR:
   guardá el error para corregirlo.
4. Incorporá el PR a `master` y esperá el despliegue del sitio.
5. Abrí `/eliminar-cuenta` desde el navegador del celular y comprobá el acceso
   desde Perfil dentro de la app. Usá una cuenta de prueba propia para comprobar
   el borrado; es permanente.
6. En Play Console, abrí **Contenido de la aplicación → Seguridad de los datos**.
   Completá las preguntas de eliminación y pegá la URL
   `https://www.trucazo.com.ar/eliminar-cuenta` en el campo de eliminación de cuenta.
   La aprobación final depende de Google.

No se aplicó SQL ni se eliminaron cuentas en producción al preparar este PR.
El servidor usa `SUPABASE_SERVICE_ROLE_KEY`, que ya necesita el proyecto.
No hace falta configurar una URL nueva de retorno de Google ni otra clave.
El SQL programa `trucazo-account-deletion-retry` cada diez minutos mediante
`pg_cron` y `pg_net`, extensiones que ya usan los correos de torneos.

## Datos y partidas

- Se borran perfil, monedas, compras, progreso, misiones, amistades, mensajes,
  preferencias, reseñas, archivos propios y navegación vinculada a la cuenta.
- Una partida activa termina como abandono con las reglas y pagos existentes.
  Las salas pendientes se cierran y devuelven las apuestas de los demás.
- El retiro de un integrante retira a la pareja del torneo. Las rondas futuras
  conceden el lugar al rival; si ambos lugares quedan vacíos, no se inventa un
  ganador. Un torneo pausado sigue pausado y procesa esos lugares al reanudarse.
- Se conservan resultados compartidos, cuadros y asientos históricos sin el
  UUID, nombre ni avatar del usuario: aparece **Cuenta eliminada**. Las partidas
  del motor 1v1 se borran porque también contienen identidades dentro de JSON.
- El liderazgo de un grupo pasa al miembro más antiguo. Un grupo sin otros
  miembros se borra.

## Reintentos y soporte

Primero se guarda una solicitud privada y se borran los datos de juego en una
transacción. Después el servidor bloquea el acceso, elimina los archivos con la
API de Storage y elimina definitivamente el usuario de Auth. La solicitud se
borra al completar todo. Nunca se elimina sólo la fila de `storage.objects`.

Si un proveedor falla o la función se interrumpe, la solicitud se conserva con
el identificador y el inventario de archivos pendientes. El cron vuelve a
intentar. Una reserva temporal impide que dos ejecuciones la procesen a la vez.
Los tokens anteriores no pueden recrear el perfil ni subir nuevos archivos.

La página informa el estado inmediato y pide contactar a
`hola@trucazo.com.ar` si pasan 48 horas o no se puede iniciar sesión. Verificá
que ese buzón recibe mensajes antes de publicar. Para solicitudes por correo,
comprobá la identidad; no pidas contraseñas.

Para revisar solicitudes pendientes, copiá esta consulta en SQL Editor:

```sql
select id, user_id, created_at, attempts, last_error, locked_until, next_attempt_at
from public.account_deletion_jobs
order by created_at;
```

No compartas el campo `token`. Si se corrige una caída del proveedor, el próximo
cron retoma la cola. Para adelantar el envío, ejecutá:

```sql
select account_internal.dispatch_deletions();
```

Para tramitar un pedido por correo **después de comprobar la identidad**, buscá
la cuenta exacta en **Authentication → Users**, copiá su User UID y ejecutá:

```sql
-- Reemplazá el texto por el User UID comprobado antes de ejecutar.
select public.prepare_account_deletion('PEGAR-USER-UID'::uuid);
select account_internal.dispatch_deletions();
```

No borres manualmente la cola ni el usuario de Auth antes que los archivos.
Las copias de seguridad y registros de los proveedores siguen sus plazos de
conservación; la página pública y la política de privacidad lo explican.

## Verificación

`supabase/tests/account_deletion.sql` usa fixtures locales y revierte todo:
1v1, 2v2 con bots, torneos activos/pausados, grupos con varios retiros, premios,
liderazgo, archivos antiguos, privacidad de la cola y tokens previos. El rebuild
completo y las regresiones de torneos, juegos y permisos deben pasar.

`node --import tsx scripts/check-account-deletion.ts` comprueba confirmación,
origen, autenticación reciente, orden Storage → Auth y fallos/reintentos.
Los dos controles están agregados a CI. También correr TypeScript, lint y build.

Referencia de Google:
https://support.google.com/googleplay/android-developer/answer/13327111
