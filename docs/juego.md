# Juego

<a id="invitacion-por-enlace"></a>

## Invitación por enlace — 16/10/2026

**Estado:** activada en producción el 16/10/2026. El [PR #128](https://github.com/santibpapa/trucazo/pull/128)
se integró y el dueño aplicó el SQL; ambos hechos fueron verificados. Publicación
lista y permisos correctos. Queda la aceptación manual entre dos navegadores o
dispositivos reales; las pruebas integradas ya aprobaron.

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

**Ya aplicado en Trucazo; no volver a ejecutarlo.** Estos pasos se conservan para
otro entorno. El backend se aplica a mano, antes de integrar/publicar la interfaz:

1. Abrir `supabase/migrations/20261016132353_table_link_invites.sql` en GitHub y
   copiar el archivo completo.
2. Abrir el proyecto de Trucazo en Supabase → **SQL Editor → New query**.
3. Pegar el SQL y tocar **Run**. Guardar la confirmación del resultado.
4. Integrar el PR y comprobar el despliegue de la web.
5. Crear una mesa privada, compartir el enlace con otro navegador, entrar como
   invitado y confirmar. Repetir con parejas eligiendo un asiento libre.

No requiere variables nuevas, habilitar Realtime para las claves ni cambiar cron.
La foto de este agregado está en `supabase/schema/table_invites.sql`; es sólo
referencia y no se ejecuta además de la migración. La reconstrucción continúa
usando todas las migraciones en orden, con las tablas 2v2 antes de este agregado.

### Cobertura de pruebas

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

### Evidencia de cierre — 16/10/2026

Código verificado: `742d4256949bf62a53737c7dd756f227d29e22ac`. La
[prueba integrada](https://github.com/santibpapa/trucazo/actions/runs/38910753844)
aprobó con Auth, Postgres, Realtime, Next y Chromium reales, sin datos ni claves
de producción. Nueve recorridos aprobados: las cuatro combinaciones de modalidad
y visibilidad, email, registro, último cupo concurrente 1v1, último cupo concurrente
2v2 y enlaces cerrados/desconocidos. La misma ejecución reconstruyó la base y
aprobó `table_invites.sql` antes de abrir el navegador.

La [revisión general](https://github.com/santibpapa/trucazo/actions/runs/38910754149)
también aprobó completa para ese código: aplicación, reconstrucción de la base,
permisos y baterías de juego, seguridad, torneos, monedas y concurrencia. La
[base sin conexión](https://github.com/santibpapa/trucazo/actions/runs/38910754613)
aprobó sin cambios en sus reglas. El commit posterior a esta evidencia sólo
actualiza este documento; conserva el mismo código y las mismas pruebas.

En cada modalidad se comprobó que visitar/identificarse no descuenta monedas,
confirmar cobra una sola apuesta y reintentar conserva el saldo. En parejas el
asiento quedó vacío al ingresar y después se eligió el lugar 3. Dos personas
disputando el último cupo produjeron un solo ingreso y un solo descuento.
Volver al login con una cuenta ya iniciada conservó la invitación.

Se inspeccionaron las tres capturas móviles: ambas invitaciones y el asiento
elegido en parejas, sin desborde horizontal ni controles recortados. Las capturas
de la última ejecución quedan en su artifact `invitaciones-movil` durante un día.
Se usó `localhost` para la web de la copia: Next normaliza a ese nombre las
redirecciones locales, y mezclarlo con `127.0.0.1` separaba las cookies del navegador.
No se modificaron las redirecciones de producción para adaptar esa prueba.

La revisión de React y los checks de tipos/ESLint no agregaron advertencias.
Google conserva el callback autorizado y el destino validado; su proveedor
externo no se automatizó. La confirmación de email entre dispositivos tampoco
forma parte de la prueba automática.

### Activación en producción — 16/10/2026

El dueño informó que integró el PR y después ejecutó el SQL. Se comprobó el merge
`98a27945950db441b519be4bee207d6ddab9c004`, del 16/10 a las 14:12 de Argentina.
Vercel publicó ese commit con estado **READY**, región `gru1`, y los dominios
`www.trucazo.com.ar` y `trucazo.com.ar` asociados. Despliegue:
`dpl_6KqVsVg7xWiqBHLtosBRhZVwVA8a`.

En Supabase se compararon los cuerpos de `get_table_invite`, `preview_table_invite`
y `join_table_invite`: los tres coinciden exactamente con la migración probada.
Se verificaron `security definer`, `search_path` vacío, ausencia de EXECUTE para
PUBLIC y los permisos previstos: vista previa para anon/authenticated;
generación e ingreso sólo para authenticated. `invite_internal.links` tiene RLS,
sin acceso de esquema para jugadores/visitantes ni publicación en Realtime, con
sus claves únicas, restricción de una sola mesa y relaciones de borrado en cascada.

La página publicada se consultó con una clave inventada: respondió HTTP 200 con
«Esta invitación ya no está disponible», sin error de carga, y conservó noindex y
no-referrer. Estas comprobaciones fueron de sólo lectura. No demuestran por sí
solas una invitación manual ni un ingreso con Google real en producción.

**Próximo paso vigente:** aceptación manual. Crear una mesa, tocar **Invitar por
enlace**, abrir el enlace desde otro navegador/dispositivo y confirmar **Unirme**.
Repetir en parejas y elegir un lugar libre. Comprobar también el regreso desde
Google si se usa ese acceso. El merge, la publicación, el SQL y las pruebas
integradas ya están completados; no volver a indicarlos como pasos pendientes.

### Espera visible después del código — 16/10/2026

Preparado para revisión: el estado de espera aparece justo debajo del código,
en un recuadro dorado con el texto **Esperando que se una tu rival…** y tres
puntos que se animan suavemente. Se muestra al crear la privada desde el lobby
y en la sala de espera 1v1. En parejas indica que faltan jugadores, distingue
al último que falta y desaparece cuando ya están los cuatro o se está reconectando.
Se conservan los avisos de elegir lugar e iniciar la partida.

La animación sólo modifica opacidad y posición, sin mover el resto de la pantalla.
El texto queda visible desde el primer dibujo y los puntos se detienen con la
preferencia de reducir movimiento. El lector de pantalla recibe un único estado;
la animación no dispara anuncios repetidos.

Verificado: tipos y ESLint (advertencias previas), inspección visual a 360 × 640
en una vista temporal con los componentes reales, animación CSS activa y aviso
ausente en la mesa 2v2 completa. La vista temporal no se publica. Sólo cambia la
presentación: no requiere SQL ni altera el ingreso, los cobros o los asientos.
