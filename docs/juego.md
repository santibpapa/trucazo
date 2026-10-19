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

<a id="vidas-de-historia"></a>

## Vidas de Historia — 18/10/2026

**Estado:** el [PR #130](https://github.com/santibpapa/trucazo/pull/130) está integrado
en master, commit `e707efb16eb9a96c2afbc02b84d45f8696638816`. El SQL y el estado de
producción no se verificaron en esta sesión; no asumir que falta aplicarlo ni
volver a ejecutarlo sin comprobarlo. El alta publicitaria está iniciada y se
prepara la verificación de propiedad detallada al final de este documento.
El trabajo partió de GitHub master `24f1da19`; la carpeta local del dueño no se
usó ni modificó. Las pruebas se realizaron en una copia temporal limpia y en
runners descartables de GitHub.

**Actualización vigente — 19/10/2026:** se prepara la pausa del límite de vidas
hasta completar el alta publicitaria. Ver «Pausa de vidas y barra de Historia» al
final: sus pasos reemplazan la activación original de abajo. Aún requiere integrar
el cambio y aplicar su nueva migración; no se da por publicado.

### Reglas acordadas (para cuando se reactive)

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

### Activación original (historial del PR #130)

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
   requerida por Google antes de servir anuncios. Si pide verificar el dominio
   o publicar `ads.txt`, usar los datos reales de esa cuenta. El identificador
   de editor recibido y la verificación elegida se registran al final. Mantener los anuncios automáticos
   apagados: este flujo utiliza únicamente el bloque voluntario de recompensa.
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
y compilación de Next aprobaron en la copia temporal.

### Evidencia verificada — 18/10/2026

Código: `dee936578a154df1fd1820fd19f0c6fe5607febb`. La
[prueba integrada de vidas](https://github.com/santibpapa/trucazo/actions/runs/39182095968)
aprobó: tres derrotas reales, bloqueo a cero, resultado/revancha, ayuda desde
Amigos en otra sesión, conservación del saldo del remitente, inicio y regalo
concurrentes, acreditación del anuncio con SDK simulado y recarga hasta tres.
La ventana de vidas se monta fuera de los contenedores animados del resultado;
la prueba comprueba que su fondo cubra exactamente el viewport de 360×640.

Se abrieron y revisaron las tres capturas finales del artifact `vidas-historia-movil`
(resultado sin vidas, pedido enviado y vidas completas). Se esperó el final de
las nubes y las animaciones para no confundir un cuadro de transición con la
interfaz final. Sin desborde horizontal ni controles cortados; el resultado sin
la ventana también entra sin scroll. El artifact dura un día.

La [prueba existente de invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39182095988)
aprobó sin cambios. La aplicación y la suite SQL de vidas/permisos aprobaron en
la [revisión general](https://github.com/santibpapa/trucazo/actions/runs/39182095966);
la revisión completa también terminó aprobada, incluidas reconstrucción, juego,
seguridad, permisos, torneos, monedas y simulaciones Noroeste. El commit posterior
a esta evidencia sólo actualiza documentación y conserva el mismo código probado.

Al cerrar aquella entrega todavía faltaban la integración y la comprobación de
SQL en producción. La integración posterior de #130 y el inicio del alta
publicitaria se registran en el estado actual y en la actualización siguiente.
La aprobación publicitaria, el consentimiento aplicable y una vista con inventario
real siguen sin comprobarse. No se generan ingresos por las pruebas simuladas.


### Compatibilidad con el PR #129 — 18/10/2026

El dueño integró #129 en master (`8380cc93e6b2434fed9a03576089248c301bff3c`).
Se actualiza #130 con ese master y se conserva tanto la sección «Espera visible
después del código» como la de vidas. El único conflicto era la incorporación
de ambas secciones al final de este documento; los archivos de código no se pisan.
No se cambia la migración de vidas ni se aplica SQL o se publica #130 durante
esta actualización. Las verificaciones automáticas vuelven a evaluar la combinación.


### Alta de AdSense y verificación del sitio — 18/10/2026

El dueño abrió el alta de `trucazo.com.ar` y mostró la pantalla «Su sitio necesita
revisión». El identificador visible en su captura es `ca-pub-3485016002829591`.
Se prepara únicamente la metaetiqueta `google-adsense-account` en los metadatos
globales de `src/app/layout.tsx`, método admitido por Google para verificar la
propiedad sin cargar el script de anuncios. Es un identificador público del
editor. No se agregan anuncios automáticos, un bloque de recompensa ni SQL.

Después de integrar este cambio y confirmar su publicación en la web:

1. En la misma pantalla de AdSense elegir **Metaetiqueta**.
2. Comprobar que muestra el mismo identificador de editor.
3. Marcar la casilla de código/metaetiqueta colocada y tocar **Verificar**.
4. Si Google confirma la propiedad, abrir **Solicitar revisión** y completar
   las tareas obligatorias que indique la cuenta.

Preparar la metaetiqueta no significa que ya esté publicada, que Google la haya
verificado ni que el sitio esté aprobado para anuncios. La aprobación y el bloque
rewarded siguen siendo pasos separados. Referencia oficial:
[Conectar un sitio a AdSense](https://support.google.com/adsense/answer/7584263?hl=es-419).


### AdSense en revisión y archivo ads.txt — 18/10/2026

El dueño mostró `trucazo.com.ar` con estado **Preparando el sitio** y ads.txt
**No encontrado**. Esto no es una aprobación ni un rechazo. El PR #131 ya está
integrado (commit `1c801c62f0a09e7221b7e170d89ff030aa322ac8`); la metaetiqueta y la
conexión del sitio se completaron antes de esa captura.

Se prepara `public/ads.txt`, accesible después de publicar en
`https://trucazo.com.ar/ads.txt`. Contiene una sola autorización DIRECT de Google
con el mismo ID de editor de la metaetiqueta verificada. No hay otra ruta o archivo
ads.txt en el árbol remoto. El middleware permite esta ruta pública sin sesión ni
consulta a Supabase; la configuración no la redirige a login ni a una página HTML.
No requiere SQL ni activa anuncios.

Tras integrar/publicar este cambio, abrir esa URL y comprobar la línea de Google.
Luego ir a AdSense → Sitios → `trucazo.com.ar` → **Buscar actualizaciones**, si
aparece. El rastreador puede demorar en reflejarlo; publicar el archivo no demuestra
que Google ya lo leyó ni cambia por sí solo la revisión a **Listo**. Falta la
aprobación del sitio y la configuración del bloque rewarded.

Referencias: [guía de ads.txt](https://support.google.com/adsense/answer/7532444?hl=es)
y [estados de revisión](https://support.google.com/adsense/answer/12170222?hl=es).


### Pausa de vidas y barra de Historia — 19/10/2026

**Pedido vigente:** jugar campaña sin límite mientras se completa AdSense y mostrar
vidas junto a Fama y Ranking. El sitio ya tiene la propiedad verificada y la
revisión solicitada, según las capturas del dueño. El PR #132 está integrado y
`https://www.trucazo.com.ar/ads.txt` respondió 200 con el ID correcto. Eso no
confirma aprobación de Google ni un bloque rewarded operativo.

**Preparado en este cambio:** `campaign_internal.ad_settings.lives_enabled`
arranca en false. El servidor deja de descontar derrotas y permite iniciar
y retomar duelos incluso con un saldo anterior de cero. Se conservan los
saldos, la recarga natural y los tickets ya emitidos; no se borran progresos,
monedas ni partidas. Los pedidos entre amigos y los anuncios nuevos quedan
inactivos, incluso mediante llamadas directas. Las recompensas ya obtenidas
pueden terminar de acreditarse con su ticket vigente.

El indicador se mueve del extremo inferior del mapa a la barra superior, debajo
de Ranking y al lado de Fama, con el mismo fondo, borde y forma. Muestra **Vidas ∞**
y, al tocarlo, explica que se puede jugar sin límite. No muestra cuenta regresiva,
pedidos ni ofertas de anuncios mientras la pausa está activa. El resultado del
duelo también muestra vidas ilimitadas. Al reactivar, el mismo indicador vuelve
al saldo real y a su próxima recarga.

**Aplicación:** la nueva migración es
`supabase/migrations/20261019030305_pause_campaign_lives.sql`. Requiere que
`20261019002728_campaign_lives.sql` ya esté aplicada; no volver a ejecutar la vieja
si ya existe `campaign_internal.ad_settings`. En Supabase → SQL Editor → New query,
pegar **sólo la nueva migración completa** y tocar Run. Después integrar el PR y
comprobar la publicación. La pausa se aplica en el servidor desde el SQL; la
interfaz anterior sigue permitiendo jugar pero puede mostrar el saldo guardado
hasta que se publique la nueva. No se aplicó SQL a producción desde esta sesión.

**Para retomar más adelante:** no se reactiva automáticamente al aprobar AdSense.
Primero completar la cuenta de Ad Manager, el bloque rewarded real, la privacidad
y el consentimiento aplicables, y la variable de Vercel ya documentada arriba.
Cuando el dueño decida habilitar el sistema completo, dar tres vidas a todos al
comenzar y luego activar ambos permisos en la misma transacción:

```sql
begin;
update campaign_internal.lives
set lives = 3, next_life_at = null, depletion_id = null
where lives < 3;
update campaign_internal.ad_settings
set lives_enabled = true, enabled = true
where singleton;
commit;
```

Para volver a pausar después, sin borrar saldos ni progreso:

```sql
update campaign_internal.ad_settings
set lives_enabled = false, enabled = false
where singleton;
```

**Verificación:** la suite SQL prueba pausa por defecto, cuatro
derrotas sin descuento, inicio y recuperación con saldo cero, rechazo de pedidos
y anuncios directos durante la pausa, permisos privados y reactivación del límite.
Después conserva la suite completa de vidas activas. La prueba de navegador con
Auth/Postgres/Next reales agrega pausa, Revancha desde cero y capturas del mapa a
320, 360, 390 y 1280 px; comprueba ubicación junto a Fama/Ranking, ausencia de
desborde y mensajes correctos.

La aplicación (tipos, ESLint con avisos anteriores, permisos y build), la suite
SQL de vidas y la prueba integrada aprobaron para el código
`dd7f8c1d95ce7e2b2bd013450a8b6b302e73bf1d`:
[vidas con navegador real](https://github.com/santibpapa/trucazo/actions/runs/39193652993),
[revisión general](https://github.com/santibpapa/trucazo/actions/runs/39193652947) e
[invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39193652977).
Se descargaron y abrieron las capturas de 320, 360 y 1280 px y la explicación de
la pausa. La primera revisión visual detectó el título/puntos comprimidos a 320 px;
el encabezado ahora usa una disposición compacta en celular, sin truncarlos, y
la prueba comprueba que título y volver no queden debajo de Ranking. También
se verifican el resultado sin scroll y la ausencia de desborde horizontal.

Entrega: [PR #133](https://github.com/santibpapa/trucazo/pull/133). Las pruebas usan
cuentas y bases descartables; sólo el SDK de anuncios se simula. No acreditan
aprobación publicitaria, una vista paga ni SQL aplicado en producción. La
actualización posterior a ese código registra evidencia y no cambia la implementación.
