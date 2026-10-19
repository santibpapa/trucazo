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


<a id="vidas-de-historia"></a>

## Vidas de Historia — 18/10/2026

**Estado:** implementación preparada en la rama `codex/campaign-lives`. No integrada
ni aplicada en producción. El trabajo parte de GitHub master `24f1da19`; la carpeta
local del dueño no se usó ni modificó. Las pruebas se realizan en una copia temporal
limpia y en los runners descartables de GitHub.

### Reglas acordadas

- Tres vidas como máximo. Perder o rendirse en Historia descuenta una sola vida.
  Ganar y las partidas anuladas sin ganador no descuentan. Las mesas comunes y
  parejas conservan su comportamiento.
- Una vida cada treinta minutos mientras falten, también desconectado. El reloj
  empieza al salir de tres; las siguientes derrotas, regalos y anuncios conservan
  el tiempo restante. Al llegar a tres se detiene, sin acumular vidas ocultas.
- Cero vidas impide iniciar otro duelo. Un duelo que ya estaba abierto se retoma
  sin borrar cartas ni progreso; los inicios simultáneos devuelven la misma partida.
- A cero puede pedirse ayuda a un amigo aceptado. El dueño confirmó que ayudar es
  gratis: no consume vidas ni monedas del remitente. Un pedido por episodio sin
  vidas evita duplicados; aparece en Amigos (Comunidad y panel rápido del lobby).
  Vence con la próxima recarga. Una ayuda repetida o vencida no acredita de nuevo.
- A cero, un anuncio voluntario puede recuperar una vida. Esperar y pedir ayuda
  siguen disponibles. Ningún anuncio se solicita al abrir Historia o durante el
  duelo. Cerrar, bloquear o no disponer de anuncios no otorga una vista inventada.

### Implementación y límites

`campaign_internal` guarda saldos, reloj, pedidos y tickets. Tiene RLS sin políticas
para jugadores, sin acceso de esquema y fuera de Realtime. Las funciones públicas
comprueban identidad; sus permisos excluyen PUBLIC/anon. El cliente sólo muestra
el saldo y el contador. El servidor recalcula y bloquea la fila para serializar
recargas, pérdidas, regalos, recompensas e inicios. El trigger de derrota actúa
sólo al pasar de playing a finished con ganador; repetir el cierre no descuenta.
No se requiere un cron para recargar vidas.

El mapa y el resultado muestran corazones y próxima recarga. La pantalla a cero
ofrece amigos y volver a las mesas mientras espera. Se relee al volver a la
pestaña y cada quince segundos si está visible. Los fallos de red liberan los
controles después de ocho segundos y muestran reintento.

**Publicidad preparada para Google Ad Manager / Google Publisher Tag.** El dueño
no tenía proveedor. La integración real usa REWARDED, rewardedSlotGranted y
rewardedSlotClosed; el script sólo se carga al optar por el anuncio. Un ticket por
cuenta/episodio vence a los quince minutos y se acredita una vez. Una vista completa
suma una vida aunque haya llegado ayuda o una recarga durante el video, hasta
el máximo de tres; el mismo ticket nunca suma dos veces. Una recompensa
confirmada con fallo de red queda pendiente en ese navegador y esa cuenta para
reintentar sin otro anuncio; el ticket consumido no permite recuperar otra vida
tras una derrota posterior.

**Límite explícito del proveedor web:** Google no ofrece verificación independiente
del servidor para rewarded web. Una persona que manipule su propio navegador
podría falsificar la señal de recompensa después de solicitar un ticket. Los
controles SQL evitan duplicados y regalos a otras cuentas; no prueban una vista
publicitaria ni resuelven ese fraude. No describirlos como SSV. Para esa garantía
habría que elegir un proveedor con comprobantes firmados o una integración nativa
que los soporte. Referencias: [recompensas web](https://support.google.com/admanager/answer/9116812?hl=en),
[ejemplo GPT](https://developers.google.com/publisher-tag/samples/display-rewarded-ad)
y [reglas de recompensa](https://support.google.com/admanager/answer/7496282).

### Activación, en orden

1. Antes de publicar la interfaz, abrir en GitHub
   `supabase/migrations/20261019002728_campaign_lives.sql` y copiarlo entero.
   Supabase → proyecto Trucazo → SQL Editor → New query → pegar → Run.
   La foto `supabase/schema/campaign_lives.sql` es referencia: no ejecutarla además.
2. Integrar el PR cuando sus verificaciones estén aprobadas y comprobar el
   despliegue. Con eso funcionan las vidas, la recarga y los amigos.
3. Para monetizar, primero crear una cuenta en
   [Google AdSense](https://adsense.google.com/start/) con el dominio
   `trucazo.com.ar` y completar su alta. Google exige una cuenta válida de AdSense
   para [registrarse en Ad Manager](https://support.google.com/admanager/answer/7084151?hl=es).
   Después entrar a [Google Ad Manager](https://admanager.google.com/), crear/habilitar
   la cuenta y configurar un bloque **Rewarded para web** con recompensa de una
   vida. La aprobación y la disponibilidad de inventario dependen de Google;
   este PR no crea una cuenta ni asegura ingresos. Revisar en la cuenta la
   configuración de privacidad/consentimiento y, donde corresponda, la CMP
   requerida por Google antes de servir anuncios.
4. Copiar la ruta real del bloque (formato `/CODIGO_RED/BLOQUE`) en Vercel →
   proyecto Trucazo → Settings → Environment Variables →
   `NEXT_PUBLIC_CAMPAIGN_REWARDED_AD_UNIT`. Volver a desplegar para incorporarla.
   El identificador no es una clave privada. No usar el bloque de demostración
   de Google para monetizar.
5. Recién con la cuenta y el bloque listos, en Supabase → SQL Editor → New query
   copiar y ejecutar:

   ```sql
   update campaign_internal.ad_settings set enabled = true where singleton;
   ```

   Hasta entonces el anuncio queda oculto y ni siquiera se emiten tickets desde
   una llamada directa. Para pausar anuncios usar la misma consulta con `false`;
   esperar y ayudar continúan funcionando. Los tickets ya emitidos conservan su
   plazo para no perder una recompensa legítima.
6. Comprobar con dos cuentas: tres derrotas → cero; pedir/enviar ayuda; volver a
   jugar; esperar una recarga. Con el proveedor aprobado, verificar inventario
   real, cierre voluntario, recompensa y acreditación tras recuperar conexión.

### Pruebas y continuidad

Preparadas: `supabase/tests/campaign_lives.sql`, permisos globales y
`scripts/check-campaign-rewarded-ad.mjs`. La suite SQL comprueba saldo inicial,
triunfo, derrotas, rendición, cierre repetido, cero, reloj y sobrantes, máximo,
pedidos y tickets ajenos, ayuda gratis, vencimientos, reintentos y carrera entre
amigo/anuncio. El permiso publicitario empieza cerrado en cada reconstrucción.
La prueba Noroeste cierra explícitamente su duelo de preparación porque ahora
los duelos abiertos se retoman; mantiene sus comprobaciones de acceso y premios.

`campaign-lives.yml` prepara Auth, Postgres, Realtime, Next y Chromium reales en
CI. Prueba dos sesiones, derrotas por la RPC real, pedido/respuesta en Amigos,
inicios y regalos simultáneos, recarga y capturas a 360×640. Sólo el SDK
publicitario se simula: no genera impresiones pagas ni certifica una cuenta de
Google. Los runners no tienen claves ni datos de producción.

Tipos, ESLint (avisos previos), allowlist de RPC, prueba de callbacks publicitarios
y compilación de Next aprobaron en la copia temporal. Pendiente registrar los
resultados finales de GitHub y la revisión visual de las capturas. La activación
en producción y la aprobación publicitaria siguen pendientes.
