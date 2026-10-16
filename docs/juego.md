# Juego

## Invitación por enlace — 16/10/2026

**Estado:** implementación preparada para revisión en GitHub. Falta aprobar la
verificación automatizada y aplicar la migración en producción; no está activada.

### Decisiones del dueño

- Enlace a una mesa concreta, pública o privada, para mano a mano y parejas.
- Cualquiera que tenga el enlace puede entrar mientras quede lugar; no hay
  aprobación del creador. Las privadas siguen ocultas del lobby y conservan el código.
- Se permite entrar con cuenta o como invitado, eligiendo un nombre.
- Abrir el enlace muestra creador, apuesta por persona, puntos y tiempo.
  Identificarse no ocupa lugar ni paga: el botón **Unirme** confirma el cobro.
- En parejas, después de confirmar cada persona elige su lugar. El de enfrente
  es su compañero. Se conserva el inicio manual del creador.
- El enlace sirve durante la espera. Una mesa llena, comenzada, cerrada o
  cancelada no admite nuevos participantes. Quien ya pertenece puede retomar
  su mesa abierta sin volver a pagar. No son salas permanentes ni enlaces de perfil.

### Implementación y límites

En la espera aparece **Invitar por enlace**; al prepararlo se ofrecen
**Compartir** y **Copiar enlace**. El enlace también puede seleccionarse y copiarse
manualmente. Compartir abre el menú del dispositivo; no envía mensajes solo.
Los códigos actuales siguen funcionando.

`invite_internal.links` guarda una clave aleatoria UUID v4 estable por mesa,
separada de sus códigos e identificadores. No tiene acceso directo para jugadores
ni visitantes y queda fuera de Realtime. Las claves desaparecen si se borra su mesa.
Los torneos no generan enlaces que permitan saltar sus cupos o emparejamientos.

`get_table_invite` permite obtener el enlace al creador 1v1 y a los participantes
2v2 mientras esperan. `preview_table_invite` permite una vista pública limitada
con la clave; no devuelve códigos, manos, saldos ni identidades internas.
`join_table_invite` exige sesión, bloquea la mesa, revalida disponibilidad y usa
los cobros existentes. Si la entrada ya se confirmó, el reintento devuelve el
destino sin volver a cobrar. La elección de asiento sigue en `team_action`.

`/invitar/[token]` es pública, dinámica y lleva noindex y no-referrer. Se conserva
el destino al entrar con email/usuario, Google y registro. Sólo se aceptan rutas
de invitación estrictamente validadas; `next` no permite redirigir a otros sitios.
La confirmación de email conserva el destino durante diez minutos en el mismo
navegador; desde otro dispositivo se puede volver a abrir la invitación original.
El modo Android del repositorio mantiene su política previa de cuentas reales.
La disponibilidad 2v2 sigue dependiendo de `NEXT_PUBLIC_ENABLE_2VS2=true`.

### Aplicación en producción

El backend se aplica a mano, antes de integrar/publicar la interfaz:

1. Abrir `supabase/migrations/20261016132353_table_link_invites.sql` en GitHub y
   copiar el archivo completo.
2. Abrir el proyecto de Trucazo en Supabase → **SQL Editor → New query**.
3. Pegar el SQL y tocar **Run**. Guardar la confirmación del resultado.
4. Integrar el PR y comprobar el despliegue de la web.
5. Crear una mesa privada, compartir el enlace con otro navegador, entrar como
   invitado y confirmar. Repetir con parejas eligiendo un asiento libre.

No requiere variables nuevas, habilitar Realtime para las claves ni cambiar cron.
La foto de este agregado está en `supabase/schema/table_invites.sql`; es una
referencia posterior al esquema completo y no se ejecuta antes de las tablas 2v2.
La reconstrucción continúa usando todas las migraciones en orden.

### Pruebas y próximo paso

Tipos, ESLint (sólo advertencias previas), compilación de Next y pruebas de destinos
de invitación/Android aprobaron en una copia limpia de GitHub, aislada de la carpeta
local del dueño. No se usaron datos ni credenciales de producción.

`supabase/tests/table_invites.sql` cubre ambas modalidades y visibilidades,
permisos, vista pública mínima, saldo insuficiente, invitado, cobro único,
reingreso, elección de lugar, cupo lleno y cierre/borrado. El CI normal lo ejecuta
sobre PostgreSQL descartable y revisa los permisos globales de las funciones.

`table-invites.yml` levanta Auth, Postgres, Realtime y Next en un runner vacío.
`check-table-invites-browser.mjs` comprueba compartir desde la espera, visita sin
sesión, invitado con nombre, confirmación, saldo, reintento, asiento, email,
registro y enlace cerrado. No automatiza el proveedor externo de Google.

**Próximo paso:** revisar los resultados de GitHub, resolver cualquier fallo y
registrar la evidencia antes de aplicar el SQL e integrar. La implementación no
demuestra por sí sola una partida manual en producción.
