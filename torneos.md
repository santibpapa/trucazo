# Sistema de torneos — especificación y plan de entrega

> Documento fuente de verdad para implementar el sistema de torneos en cinco PR/sesiones.
>
> Última actualización: 2026-09-20  
> Repositorio base: `santibpapa/trucazo`  
> Commit base al redactar este documento: `4d5857359b4b33612c0633421beff4aa5d1ddf81`

## 1. Cómo usar este documento

Cada sesión futura debe leer **completo** este archivo y `AGENTS.md` antes de modificar código. Este documento evita volver a decidir requisitos ya cerrados y delimita qué corresponde a cada PR.

Reglas de trabajo:

1. Empezar desde el `master` más reciente, con el PR anterior fusionado.
2. Verificar las precondiciones de la etapa antes de programar. Si falta una migración aplicada o el PR anterior no está fusionado, la etapa todavía no empieza.
3. Implementar solamente el alcance de la etapa actual. No adelantar trabajo de una etapa posterior salvo una dependencia técnica mínima y documentada.
4. Toda modificación de base de datos se hace en una migración nueva. Nunca se edita una migración ya aplicada.
5. La base de datos y sus RPC son la autoridad para cupos, permisos, sorteos, resultados, premios y transiciones de estado. La interfaz nunca es la única barrera.
6. Antes de terminar, ejecutar las pruebas de la etapa, completar el registro de traspaso al final de este archivo y dejar instrucciones exactas para aplicar SQL manualmente cuando corresponda.
7. Una etapa termina únicamente cuando cumple toda su definición de terminado. Abrir un PR no equivale a terminarla.

## 2. Estado del programa

| Entrega | Estado | Rama | PR | Migraciones | Observaciones |
| --- | --- | --- | --- | --- | --- |
| Documento base | Completo | `codex/plan-sistema-torneos` | [#74](https://github.com/santibpapa/trucazo/pull/74) | Ninguna | Especificación y división en cinco etapas |
| PR 1 — Base de datos y contrato | Completo | `codex/tournaments-base-contract` | [#75](https://github.com/santibpapa/trucazo/pull/75) | `20260921082456_tournaments_base_contract.sql` | Base y contrato listos; la funcionalidad sigue apagada |
| PR 2 — Administración e inscripciones | Pendiente | — | — | — | Aún no se disputan partidas |
| PR 3 — Competencia 1v1 | Pendiente | — | — | — | Primer flujo jugable completo |
| PR 4 — Competencia 2v2 | Pendiente | — | — | — | Integra el motor de equipos |
| PR 5 — Comunicaciones, espectadores y lanzamiento | Pendiente | — | — | — | Habilitación pública al final |

La sesión que trabaje una etapa debe actualizar su fila y agregar una entrada al registro de traspaso. Los estados válidos son `Pendiente`, `En curso`, `Bloqueado` y `Completo`.

## 3. Objetivo del producto

Permitir que un administrador cree y opere torneos programados desde `/admin`, mientras los usuarios registrados se inscriben, hacen check-in y participan desde una central de torneos accesible en el lobby. Debe soportar torneos 1v1 y 2v2, eliminación directa o fase de grupos seguida de eliminación, lista de espera, partidas creadas automáticamente, espectadores registrados, premios, emails y avisos dentro del juego.

La entrega debe reutilizar los motores actuales de Truco sin debilitar sus permisos ni alterar el comportamiento de las partidas normales.

## 4. Decisiones de producto cerradas

Estas decisiones no se vuelven a consultar en cada sesión. Solo cambian si el dueño del producto lo pide explícitamente.

### 4.1 Configuración del torneo

- Las modalidades son **1v1** y **2v2**, siempre como torneos separados.
- El administrador elige el formato al crear cada torneo:
  - eliminación directa;
  - grupos y luego eliminación.
- El administrador elige el cupo entre **4, 8, 16 o 32**.
- En 2v2, el cupo representa la **cantidad total de jugadores**, no la cantidad de equipos.
- El administrador elige si las partidas se juegan a **15 o 30 puntos**.
- Pueden existir varios torneos publicados o programados al mismo tiempo.
- Un torneo se puede guardar como borrador o publicar directamente.
- Las fechas se guardan en UTC como `timestamptz` y se muestran/editan en horario de Argentina.

### 4.2 Combinaciones válidas

El partido por el tercer puesto es obligatorio y los grupos siempre tienen cuatro competidores. Por eso, no todas las combinaciones de modalidad, formato y cupo permiten cumplir las reglas:

| Modalidad | Formato | Cupos válidos | Motivo |
| --- | --- | --- | --- |
| 1v1 | Eliminación directa | 4, 8, 16, 32 jugadores | Desde cuatro jugadores existen semifinales y tercer puesto |
| 1v1 | Grupos + eliminación | 8, 16, 32 jugadores | Se necesitan al menos dos grupos de cuatro |
| 2v2 | Eliminación directa | 8, 16, 32 jugadores | Ocho jugadores forman cuatro equipos |
| 2v2 | Grupos + eliminación | 16, 32 jugadores | Se necesitan al menos dos grupos de cuatro equipos |

La interfaz de administración y la base de datos deben rechazar las combinaciones restantes. Esta restricción deriva de tres decisiones ya tomadas: cupos expresados en jugadores, grupos de cuatro y tercer puesto siempre disputado.

### 4.3 Quién puede participar y mirar

- Puede inscribirse cualquier usuario registrado real.
- Un usuario anónimo/invitado de Supabase, bot o cuenta de prueba no puede inscribirse ni hacer check-in.
- Solo usuarios registrados pueden mirar partidas como espectadores.
- Un participante puede jugar partidas normales mientras el torneo está en curso, excepto cuando tenga un cruce de torneo en estado `ready` listo para entrar.
- Esa restricción se controla en los RPC de creación/unión de partidas normales; no alcanza con deshabilitar botones en el cliente.

### 4.4 Inscripción, parejas y lista de espera

- La inscripción principal se cierra al llenarse el cupo.
- Al llenarse, las nuevas inscripciones pasan a una lista de espera ordenada por fecha y secuencia de inscripción.
- Si el torneo todavía no se llenó al abrir el check-in, puede seguir recibiendo inscripciones hasta la hora de inicio. Quien se anote durante ese período debe hacer check-in inmediatamente y ya no puede cancelar.
- A la hora programada se cierra toda nueva inscripción. Si el cupo no se llenó, el administrador decide iniciar o cancelar.
- Un usuario puede cancelar su inscripción hasta que abre el check-in. Después de ese momento solo un administrador puede retirarlo o reemplazarlo.
- En 2v2 se permite:
  - inscribirse con compañero mediante invitación;
  - inscribirse solo para que el sistema asigne compañero.
- Una pareja queda confirmada únicamente cuando el invitado acepta.
- Una invitación pendiente no reserva indefinidamente el lugar del invitado: el remitente cuenta como inscripción individual hasta la aceptación. La aceptación se resuelve de forma atómica según el cupo disponible; si ya no hay dos lugares activos, la pareja queda en espera conservando como prioridad la fecha de la invitación.
- Los jugadores solos se emparejan al azar cuando se congela el plantel: al llenarse el cupo o, si no se llenó, cuando el administrador inicia a la hora programada.
- Si queda un jugador solo sin compañero, sale del plantel activo y queda primero entre los jugadores solos de la lista de espera.
- Un usuario no puede tener más de una inscripción activa, invitada o en espera dentro del mismo torneo.

### 4.5 Check-in y reemplazos

- El check-in abre **30 minutos antes** y cierra a la hora programada de inicio.
- El check-in se realiza desde el lobby o desde el detalle del torneo.
- En 1v1, cada participante confirma su propia presencia.
- En 2v2, cualquiera de los dos integrantes confirma al equipo completo.
- Si una inscripción no hace check-in, se reemplaza automáticamente por la primera inscripción compatible de la lista de espera.
- Para reemplazar un equipo completo se usa primero una pareja confirmada en espera y, si no existe, dos jugadores solos disponibles.
- Si un integrante de una pareja confirmada no entra a su partida, se reemplaza al ausente con el primer jugador solo disponible en espera.
- Los reemplazos respetan el orden de espera, quedan auditados y nunca modifican resultados ya terminados.
- Un reemplazo manual del administrador afecta los cruces futuros y hereda la posición competitiva de la inscripción reemplazada; no reescribe partidas pasadas.

### 4.6 Inicio con cupo incompleto

Si llega la hora y el torneo no está lleno, el administrador ve el plantel confirmado y elige iniciar o cancelar.

- En eliminación directa se puede iniciar con `bye` siempre que existan al menos cuatro competidores: cuatro jugadores en 1v1 o cuatro equipos completos en 2v2.
- En grupos solo se puede iniciar con grupos completos de cuatro y al menos dos grupos. Si la cantidad confirmada no cumple esa estructura, el panel debe explicar por qué todavía no se puede iniciar; el administrador puede completar/reemplazar el plantel o cancelar.
- Nunca se elimina el partido por el tercer puesto para acomodar un plantel incompleto.

### 4.7 Competencia

- El sorteo de cruces, grupos y parejas aleatorias es completamente al azar y se ejecuta en el servidor una sola vez.
- En fase de grupos hay cuatro jugadores o cuatro equipos por grupo.
- Todos juegan contra todos dentro de su grupo.
- Clasifican los dos primeros de cada grupo.
- El orden del grupo se define por:
  1. cantidad de victorias;
  2. resultado entre ellos cuando el empate es entre dos;
  3. diferencia de puntos (`puntos a favor - puntos en contra`) cuando hay tres o más empatados o el resultado directo no resuelve;
  4. sorteo persistido por el servidor si todavía existe igualdad total, para que el resultado sea determinista al recargar.
- En la primera ronda eliminatoria posterior a grupos se enfrentan ganadores contra segundos; se evita repetir un rival del mismo grupo cuando la cantidad de clasificados lo permite.
- La ronda eliminatoria siguiente empieza cuando terminan todas las partidas de la ronda actual.
- Siempre se disputa partido por el tercer puesto entre quienes pierdan las semifinales.
- La mesa de cada cruce la crea el sistema. En el detalle aparece un botón **Entrar a la partida**.
- Desde que el cruce queda listo, los participantes tienen cinco minutos para entrar.
- Si al vencer el plazo un lado está completo y el otro no, el lado completo gana por ausencia. Si ambos lados están incompletos, el cruce queda detenido para resolución administrativa; no se inventa un ganador.
- En 2v2, si falta una sola persona, antes de declarar ausencia se intenta el reemplazo automático con el primer jugador solo en espera.
- Pausar un torneo impide abrir nuevos cruces o rondas. Las partidas que ya están en curso pueden terminar y guardar su resultado; la progresión queda retenida hasta reanudar.
- Las partidas del torneo cuentan para estadísticas y misiones normales.
- El registro del resultado, el avance de estadísticas/misiones y la progresión del torneo deben ser idempotentes: una partida cuenta exactamente una vez aunque haya reintentos o eventos duplicados.
- Las partidas de torneo no tienen apuesta normal: `bet = 0`. Las monedas se entregan únicamente por posición final.
- No se ofrece revancha en una partida de torneo. La pantalla final vuelve al detalle del torneo.

### 4.8 Premios

- Reciben premio el primer, segundo y tercer puesto.
- Se entregan insignias genéricas de oro, plata y bronce visibles en el perfil.
- El administrador configura las monedas de cada puesto al crear el torneo.
- El valor configurado es **monedas por jugador**. En 2v2, cada integrante del equipo recibe el importe completo de su puesto.
- Premios e insignias se acreditan una sola vez mediante una clave idempotente por torneo, usuario y puesto.

### 4.9 Emails y avisos dentro del juego

- Al publicar un torneo se anuncia por email a todos los usuarios registrados elegibles, usando las reglas actuales de destinatarios: email confirmado/real, preferencia habilitada y exclusión de cuentas anónimas, bots y direcciones de prueba.
- El anuncio abre el detalle del torneo. Allí el usuario confirma expresamente su inscripción; abrir el enlace por sí solo no inscribe.
- Quien se inscribe recibe:
  - confirmación de inscripción;
  - recordatorio 24 horas antes;
  - aviso al abrir el check-in;
  - aviso cuando comienza su partida.
- La confirmación de inscripción es un recibo de la acción realizada; no agrega un segundo paso de aceptación.
- Si el administrador reprograma o cancela un torneo publicado, se avisa por email y dentro del juego.
- Se agrega una preferencia de email `tournaments_enabled`, visible en la página de preferencias y respetada por todos estos envíos.
- Los envíos reutilizan Resend, el procesamiento por lotes, las bajas y el registro de entregas existentes.
- Los eventos con hora exacta se procesan con el patrón existente de Supabase `pg_cron` + `pg_net` y una cola durable a resolución de minutos. El cron diario de Vercel no sirve para abrir check-in, vencer plazos ni avisar una partida.
- Reprogramar incrementa una versión de agenda. Los trabajos de email de versiones anteriores se cancelan o se ignoran para no enviar recordatorios obsoletos.
- Cada aviso dentro del juego tiene fecha de lectura y puede alimentar un indicador de no leídos.

### 4.10 Administración

El nuevo acceso `/admin/torneos` permite:

- crear y editar nombre, descripción, modalidad, formato, cupo válido, fecha/hora, puntaje objetivo y monedas por puesto;
- guardar borrador o publicar;
- ver inscriptos, parejas, invitaciones, jugadores solos, lista de espera y check-ins;
- ver grupos, llave, partidas listas/en curso/finalizadas y plazos;
- iniciar o cancelar un torneo incompleto a la hora prevista;
- reprogramar o cancelar;
- pausar y reanudar;
- descalificar participantes;
- reemplazar participantes manualmente.

La autoridad de administrador se verifica en el servidor con `profiles.is_admin`. No se confía en controles del cliente ni en `user_metadata` del JWT. La corrección manual de un resultado no forma parte de esta primera versión.

### 4.11 Central de torneos y lobby

- El lobby incorpora un acceso visual de torneos, con una jerarquía similar al cofre de misiones diarias pero como componente separado.
- Abre `/torneos`.
- La central muestra próximos, activos y anteriores.
- Cada torneo tiene una vista de detalle con estado, cuenta regresiva, reglas, cupo, participantes/equipos, lista de espera propia, check-in, grupos o llave, partidas y posiciones finales.
- Los estados importantes se actualizan sin exigir recargar la página, mediante Realtime en datos públicos seguros o refetch/polling acotado.
- El diseño debe funcionar en móvil y escritorio, con foco visible, navegación por teclado y mensajes de error comprensibles.

## 5. Alcance que no pertenece a la primera versión

- Torneos creados por usuarios no administradores.
- Modalidades mixtas o cambio de modalidad después de publicar.
- Cupos distintos de 4, 8, 16 y 32.
- Series al mejor de varias partidas.
- Entrada con apuesta o pozo de monedas.
- Insignias personalizadas por torneo.
- Espectadores no registrados.
- Corrección manual retroactiva de resultados.
- Chat específico del torneo.
- Ranking/ELO independiente de torneos.
- Emails a personas que no tengan una cuenta registrada.

## 6. Arquitectura actual que debe respetarse

### 6.1 Aplicación

- Next.js 14 con App Router, React, TypeScript, Tailwind y Supabase.
- Las páginas nuevas siguen el patrón Server Component para el primer render y Client Components pequeños para interacción en vivo.
- Las consultas independientes se ejecutan en paralelo para evitar cascadas de espera.
- La funcionalidad se protege inicialmente con `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` y solo se activa públicamente en la quinta etapa.

### 6.2 Motor 1v1

- Usa `tables`, `games` y `game_hands`, con RPC como `start_game` y `finish_game`.
- `create_table` cobra una apuesta mínima y no debe usarse directamente para el torneo.
- Se necesita una ruta interna confiable que cree mesa/partida con `bet = 0`, vinculada a un `tournament_match`.
- El cierre actual puede reutilizar estadísticas, historial y misiones si el resultado del torneo se engancha de forma idempotente.

### 6.3 Motor 2v2

- Usa `team_tables`, `team_seats`, `team_games`, `team_hands` y funciones en `team_internal`.
- La restricción actual de `team_tables.bet` exige apuesta; debe adaptarse de forma segura para permitir cero solo en partidas vinculadas a torneos creadas por el servidor.
- El cierre 2v2 actual no actualiza estadísticas, historial ni misiones como el flujo 1v1. La etapa 4 debe agregar ese comportamiento para torneos sin cambiar las partidas normales.
- `team_snapshot` es para participantes. Los espectadores necesitan una proyección nueva y segura.

### 6.4 Misiones, estadísticas e insignias

- `objective_game_events` está ligado al modelo 1v1 y su enumeración no contempla torneos 2v2.
- Conviene extraer un helper interno general de avance de objetivos, con una clave de evento idempotente, en lugar de simular partidas 1v1.
- En torneos 2v2 se actualizan `games_played`, `games_won` y `games_lost` una sola vez por cada humano y se avanzan las misiones humanas/públicas correspondientes una sola vez.
- Las insignias existentes se apoyan en `medals`, `profile_medals`, `profiles.active_medal`, `player_medals` y el catálogo TypeScript de `src/lib/medallas.ts`.
- Se agregan tres identificadores genéricos, por ejemplo `torneo_oro`, `torneo_plata` y `torneo_bronce`.

### 6.5 Emails

- Reutilizar `src/lib/email/process.ts`, `src/lib/email/content.ts`, `src/lib/email/resend.ts`, `email_preferences`, `email_deliveries` y el patrón de trabajos de noticias inmediatas.
- Conservar baja de suscripción, deduplicación, trazabilidad y procesamiento por lotes.
- Agregar tipos/trabajos propios de torneo; no forzar estos eventos dentro del cron diario configurado en `vercel.json`.

## 7. Modelo de datos objetivo

Los nombres pueden ajustarse durante PR 1 si existe una razón técnica, pero el contrato funcional no cambia.

| Tabla | Responsabilidad y campos mínimos |
| --- | --- |
| `tournaments` | Configuración, `mode`, `format`, cupo en jugadores, puntaje, premios por jugador, `starts_at`, estado, `published_at`, `paused_at`, `roster_frozen_at`, `schedule_version`, cancelación y auditoría de admin |
| `tournament_entries` | Unidad competitiva: una persona en 1v1 o un equipo en 2v2; estado activo/espera/eliminado/descalificado/retirado, prioridad, semilla aleatoria y procedencia de reemplazo |
| `tournament_entry_members` | Miembros de cada unidad, invitación, aceptación, reemplazo, `tournament_id` denormalizado para unicidad segura y auditoría |
| `tournament_checkins` | Check-in por inscripción/equipo, quién lo confirmó y cuándo |
| `tournament_groups` | Grupos, orden/sorteo persistido y estado |
| `tournament_group_members` | Inscripciones asignadas a cada grupo y estadísticas calculables/auditables |
| `tournament_matches` | Fase, grupo/ronda, lados A/B, estado, `ready_at`, plazo de entrada, resultado, puntos, ganador/perdedor, motivo de cierre y vínculo a partida 1v1 o 2v2 |
| `tournament_match_presence` | Entrada de cada participante al cruce, útil para el plazo de cinco minutos y ausencias |
| `tournament_awards` | Puesto, usuario, monedas, insignia y fecha de acreditación, con unicidad idempotente |
| `tournament_notifications` | Avisos dentro del juego, payload, creación y lectura |
| `tournament_email_jobs` | Tipo, destinatario o audiencia, `due_at`, versión de agenda, estado, intentos y clave de deduplicación |

Estados recomendados del torneo: `draft`, `published`, `running`, `completed`, `cancelled`. La pausa se representa con `paused_at` para no perder la fase real. La ventana de check-in se deriva de `starts_at - 30 minutos` y `starts_at`; no necesita un estado exclusivo frágil.

Estados recomendados del cruce: `pending`, `ready`, `playing`, `finished`, `forfeit`, `cancelled`.

### 7.1 Integridad y concurrencia

- Restricciones `CHECK` para modalidad, formato, cupo, puntaje, premios no negativos y combinaciones válidas.
- Índice único parcial para impedir dos membresías activas del mismo usuario en un torneo.
- Índices en todas las claves foráneas y columnas usadas por cron, estado, fecha, torneo y usuario.
- Bloqueo de fila o advisory lock al ocupar el último cupo, aceptar una invitación, promocionar desde espera, congelar el plantel, finalizar un cruce y acreditar premios.
- Claves únicas para sorteo generado, resultado aplicado, evento de misión, premio, notificación y email. Reintentar nunca duplica efectos.
- El sorteo y la conformación de la llave se persisten; no se recalculan en cada lectura.
- Las bajas, reemplazos y acciones administrativas guardan autor, momento y motivo.

### 7.2 Seguridad

- Todas las tablas públicas tienen RLS activado.
- El cliente solo lee proyecciones permitidas y muta mediante RPC autorizados; no tiene escritura directa a tablas de torneo.
- Las colas de email, acreditaciones y datos internos no son legibles por clientes.
- Helpers sensibles viven en un esquema como `tournament_internal`, sin `USAGE` para `anon` ni `authenticated`.
- Una función `SECURITY DEFINER` se usa solo cuando es necesaria, con `search_path = ''`, nombres calificados, controles explícitos y grants mínimos.
- Cada RPC nueva se incorpora a `scripts/check-rpc-allowlist.mjs` con su permiso deliberado.
- Las RPC de participación verifican usuario autenticado **y no anónimo**. Las RPC administrativas verifican `profiles.is_admin` dentro de la transacción.
- Realtime solo publica estado de torneo, cruces y notificaciones seguras. Nunca publica manos, cartas rivales, destinatarios de email ni tablas internas.

### 7.3 RPC y procesos esperados

El contrato debe cubrir, aunque los nombres finales puedan variar:

- lectura de lista, detalle, mi inscripción, grupos, llave y posiciones;
- inscripción individual, invitación, aceptación/rechazo, retiro y check-in;
- entrada a un cruce listo;
- creación/edición/publicación/reprogramación/cancelación por admin;
- inicio con cupo incompleto, pausa, reanudación, descalificación y reemplazo;
- congelamiento del plantel, parejas aleatorias, sorteo de grupos/llave y creación de partidas;
- aplicación idempotente de resultados, tabla de posiciones y progresión de rondas;
- vencimientos de check-in y entrada, promociones desde espera, premios y comunicaciones.

Un proceso interno como `tournament_internal.advance_due()` puede ejecutarse cada minuto y también de manera oportunista al abrir el detalle o realizar una acción. Debe ser seguro ante ejecuciones simultáneas y repetidas.

## 8. Experiencia de usuario objetivo

Rutas principales:

| Ruta | Uso |
| --- | --- |
| `/torneos` | Próximos, activos y anteriores |
| `/torneos/[id]` | Detalle, inscripción, check-in, participantes, grupos/llave y partidas |
| `/torneos/[id]/partidas/[matchId]` | Entrada de participante o vista segura de espectador registrado |
| `/admin/torneos` | Listado y operación administrativa |
| `/admin/torneos/nuevo` | Alta y publicación |
| `/admin/torneos/[id]` | Edición, monitoreo y acciones de torneo |

El acceso del lobby debe comunicar estados útiles: próximo torneo, check-in abierto, cruce listo o torneo activo. El detalle debe explicar claramente por qué una acción está deshabilitada, por ejemplo invitación pendiente, lista de espera, falta de check-in o combinación estructural insuficiente para iniciar.

Para espectadores se usa una RPC o vista específica con puntaje, turno, jugadores/equipos, cartas jugadas y eventos públicos. Nunca se amplían las políticas de `game_hands` o `team_hands` para exponer manos ocultas. Una ruta segura es suscribirse a cambios del `tournament_match` y volver a pedir el snapshot público.

## 9. Plan de cinco PR/sesiones

## PR 1 — Base de datos, seguridad y contrato

### Empieza cuando

- Este documento está fusionado en `master`.
- El árbol de trabajo parte limpio del último `master`.
- No existen objetos de torneo aplicados fuera de migraciones versionadas o, si existiera un experimento previo, fue inventariado antes de continuar.
- La funcionalidad sigue apagada y no hay usuarios dependiendo de ella.

### Alcance exacto

1. Crear las migraciones del modelo principal, índices, restricciones, RLS, esquema interno y auditoría.
2. Definir el ciclo de estados y los contratos TypeScript compartidos.
3. Implementar las RPC de lectura básica y las mutaciones de administración, inscripción, invitación, retiro y check-in necesarias para fijar el contrato, aunque todavía no creen partidas.
4. Resolver de forma transaccional el último cupo, lista de espera, aceptación de pareja y check-in.
5. Incorporar el feature flag `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` sin mostrar todavía la experiencia pública.
6. Agregar pruebas SQL de permisos, restricciones e idempotencia/concurrencia y actualizar la allowlist de RPC.
7. Actualizar los scripts de reconstrucción/snapshot que el repositorio utilice, sin editar migraciones históricas.

### Fuera de esta PR

- Pantallas completas.
- Creación de partidas 1v1 o 2v2.
- Sorteos y progresión competitiva.
- Emails reales, espectadores y premios.

### Termina cuando

- Una reconstrucción completa de la base aplica todas las migraciones sin errores.
- Las pruebas demuestran que un usuario común no ejecuta acciones de admin y un usuario anónimo no se inscribe.
- Dos solicitudes simultáneas al último lugar no sobrecargan el cupo ni duplican membresías.
- Aceptar una invitación o hacer check-in dos veces produce un único efecto.
- Las combinaciones inválidas de modalidad/formato/cupo fallan también en la base.
- `npm run check:rpc-allowlist`, las pruebas SQL agregadas y las verificaciones existentes pasan.
- No cambió el comportamiento de partidas, emails ni misiones existentes.
- El PR contiene instrucciones exactas para aplicar la migración y este documento tiene su traspaso actualizado.

### Entrega a la sesión siguiente

- Fusionar el PR y aplicar su SQL en los entornos indicados.
- Mantener el feature flag apagado.
- Registrar nombres finales de tablas/RPC si difieren de los propuestos.

## PR 2 — Administración, central, inscripción y check-in

### Empieza cuando

- PR 1 está fusionado.
- Sus migraciones están aplicadas y verificadas en el entorno de desarrollo/prueba correspondiente.
- Las RPC de inscripción y administración tienen pruebas verdes.
- El feature flag continúa apagado para el público general.

### Alcance exacto

1. Crear `/admin/torneos`, alta, edición, borrador, publicación, reprogramación y cancelación.
2. Validar modalidad, formato, cupo, fecha, puntaje y monedas tanto en formulario como en servidor.
3. Agregar el acceso de Torneos al menú `/admin`.
4. Crear `/torneos` y `/torneos/[id]` con próximos, activos, anteriores y detalle.
5. Implementar inscripción 1v1, inscripción 2v2 individual, invitación de compañero, aceptación/rechazo, retiro y lista de espera.
6. Implementar check-in, estados y reemplazos previos al inicio que ya estén definidos en PR 1.
7. Agregar el acceso/emoji de torneos al lobby para móvil y escritorio detrás del feature flag.
8. Actualizar los datos visibles de forma segura con Realtime o refetch controlado.
9. Cubrir accesibilidad, estados vacíos, carga, errores y confirmaciones destructivas.

### Fuera de esta PR

- No se crean ni disputan partidas de torneo.
- No se sortea la llave definitiva.
- No se envían emails reales.
- No se entregan premios ni se habilitan espectadores.

### Termina cuando

- Un admin puede crear, editar, publicar, reprogramar y cancelar un torneo válido.
- Un usuario registrado puede anotarse solo o con invitación, retirarse a tiempo, pasar a espera y hacer check-in.
- Un invitado/anónimo ve la información permitida pero no logra inscribirse usando UI ni RPC.
- Los cambios de cupo, espera y check-in se reflejan correctamente en dos clientes simultáneos.
- Las combinaciones inválidas están bloqueadas y los mensajes explican el motivo.
- La experiencia funciona en móvil y escritorio y no desplaza controles esenciales del lobby.
- `npm run lint`, `npm run build`, las pruebas SQL y las verificaciones existentes pasan.
- El PR incluye evidencia manual de los recorridos y el registro de traspaso está actualizado.

### Entrega a la sesión siguiente

- Fusionar y aplicar cualquier migración nueva.
- Mantener públicamente apagado el feature flag; puede activarse solo en preview para validar interfaz.
- Dejar documentados IDs/datos de prueba reutilizables, sin secretos.

## PR 3 — Torneos 1v1 y formatos competitivos

### Empieza cuando

- PR 2 está fusionado y sus migraciones aplicadas.
- Alta, publicación, inscripción, espera y check-in funcionan de punta a punta.
- No hay errores conocidos que puedan corromper cupos o membresías.
- La modalidad 2v2 permanece explícitamente no disponible para jugar.

### Alcance exacto

1. Congelar el plantel, promover espera, realizar el sorteo aleatorio persistido y generar eliminación directa o grupos.
2. Crear mesas/partidas 1v1 de torneo con apuesta cero mediante una ruta interna autorizada.
3. Implementar cruce `ready`, botón de entrada, presencia, plazo de cinco minutos y victoria por ausencia.
4. Aplicar resultados una sola vez y abrir la ronda siguiente solo al terminar la actual.
5. Implementar grupos de cuatro, todos contra todos, tabla, desempates y clasificación de los dos primeros.
6. Implementar semifinales, final y tercer puesto obligatorio, además de `bye` válidos.
7. Implementar inicio/cancelación con cupo incompleto, pausa/reanudación, descalificación y reemplazo dentro de los límites definidos.
8. Bloquear partidas normales cuando el usuario tenga un cruce listo, tanto en UI como en RPC.
9. Contabilizar estadísticas y misiones exactamente una vez por partida 1v1.
10. Ocultar revancha y volver al torneo desde el resultado.
11. Mostrar grupos, llave, partidas y progresión en usuario y admin.

### Fuera de esta PR

- Integración jugable 2v2.
- Emails, premios definitivos y espectador público registrado.

### Termina cuando

- Se completa de punta a punta un torneo 1v1 de cuatro jugadores por eliminación directa.
- Se completa de punta a punta uno de ocho jugadores con dos grupos y eliminación.
- Pausa, recarga, reconexión, `bye`, ausencia y repetición de callbacks no duplican resultados.
- Ninguna partida descuenta o paga una apuesta normal.
- Estadísticas y misiones avanzan exactamente una vez.
- La final, el tercer puesto y el estado `completed` quedan correctos.
- Un usuario con cruce listo no logra iniciar una partida normal por ningún cliente.
- Las partidas 1v1 normales conservan su comportamiento anterior.
- Lint, build, pruebas SQL, pruebas de concurrencia y verificaciones existentes pasan.
- El traspaso enumera partidas de prueba y cualquier decisión técnica tomada.

### Entrega a la sesión siguiente

- Fusionar y aplicar SQL.
- Dejar 1v1 estable en preview y 2v2 marcado como no disponible.
- Entregar helpers idempotentes de resultado/objetivos listos para reutilizar.

## PR 4 — Integración completa 2v2

### Empieza cuando

- PR 3 está fusionado y aplicado.
- Los dos recorridos 1v1 de aceptación siguen pasando.
- Existe un único mecanismo idempotente para aplicar resultados y avanzar torneos.
- La relación entre `tournament_match` y partida 1v1 está estable y sirve de patrón.

### Alcance exacto

1. Permitir creación interna de mesas 2v2 con apuesta cero sin abrir esa posibilidad a partidas normales.
2. Congelar parejas confirmadas, emparejar jugadores solos al azar y mover el solo impar al primer lugar compatible de espera.
3. Hacer que el check-in de cualquier integrante confirme el equipo.
4. Exigir entrada de los cuatro jugadores al cruce y reemplazar al único ausente con el primer solo en espera antes del vencimiento.
5. Asignar asientos/equipos automáticamente; una partida de torneo no permite elegir bots ni rearmar asientos manualmente.
6. Vincular el resultado 2v2 al cruce y progresar grupos/llave con la misma garantía idempotente.
7. Actualizar estadísticas y misiones exactamente una vez por cada humano participante.
8. Implementar las capacidades válidas 2v2, eliminación, grupos, desempates, final y tercer puesto.
9. Volver al detalle del torneo al finalizar y mantener oculta la revancha.
10. Extender vistas de usuario/admin y pruebas para parejas, solos y reemplazos.

### Fuera de esta PR

- Campaña de emails, experiencia final de espectadores y acreditación pública de premios.

### Termina cuando

- Se completa un torneo 2v2 de ocho jugadores por eliminación directa.
- Se completa uno de dieciséis jugadores con dos grupos y eliminación.
- Se prueban invitación aceptada, sorteo de solos, solo impar y reemplazo de un integrante ausente.
- Los cuatro humanos reciben estadísticas/misiones una vez y no se mueven monedas por apuesta.
- Reintentos simultáneos no duplican asiento, reemplazo, resultado ni progreso.
- No se filtran manos o cartas ocultas.
- Las partidas 2v2 normales mantienen sus reglas y apuestas actuales.
- Todos los checks de PR 3 más las pruebas 2v2 nuevas pasan.
- El traspaso deja ambos modos jugables y documenta la migración aplicada.

### Entrega a la sesión siguiente

- Fusionar y aplicar SQL.
- Mantener el lanzamiento general apagado hasta terminar comunicaciones, espectadores, premios y revisión final.

## PR 5 — Comunicaciones, espectadores, premios y lanzamiento

### Empieza cuando

- PR 4 está fusionado y aplicado.
- 1v1 y 2v2 completan sus matrices mínimas de aceptación.
- La funcionalidad continúa apagada para el lanzamiento general.
- No existen errores abiertos de integridad, permisos, cupos, resultados o monedas.

### Alcance exacto

1. Agregar `tournaments_enabled` a preferencias y API de email.
2. Crear plantillas, trabajos, tipos de entrega y endpoints para anuncio, confirmación, recordatorio de 24 horas, check-in, partida, reprogramación y cancelación.
3. Programar despacho por minuto con el patrón seguro de Supabase y versionar trabajos ante reprogramación.
4. Implementar avisos dentro del juego y estado leído/no leído.
5. Crear la vista de espectador registrado con snapshot seguro y actualización en vivo, sin acceso a manos ocultas.
6. Acreditar monedas por jugador e insignias oro/plata/bronce a los tres puestos de forma idempotente.
7. Mostrar insignias en perfil y posiciones/premios en el historial del torneo.
8. Completar el monitoreo administrativo de trabajos, partidas y fallos accionables.
9. Agregar eventos analíticos útiles sin datos sensibles, si encajan con el sistema existente.
10. Actualizar textos de privacidad/términos si corresponde por emails y visibilidad de partidas.
11. Realizar pulido final responsive, accesibilidad, rendimiento, estados de error y observabilidad.
12. Activar el feature flag solo después de migraciones, smoke test y checklist de lanzamiento.

### Termina cuando

- Se recorre de punta a punta cada modalidad y formato permitido.
- Cada email sale una sola vez, respeta la preferencia/baja y no usa una agenda vieja después de reprogramar.
- Cancelar genera email y aviso dentro del juego sin dejar partidas nuevas activables.
- Un espectador registrado ve solo información pública; un anónimo o usuario no autorizado no accede y nadie puede leer manos ocultas.
- Los tres puestos reciben una única insignia y las monedas correctas por jugador, incluso si el proceso se reintenta.
- La página de preferencias permite desactivar emails de torneos.
- `npm run lint`, `npm run build`, `npm run check:rpc-allowlist`, `npm run check:emails` y las verificaciones relevantes pasan.
- La prueba de regresión de partidas normales 1v1/2v2, misiones, perfiles y emails existentes pasa.
- El despliegue se hizo en orden: código compatible → SQL → procesos programados/configuración → smoke test → flag.
- Existe un plan de reversión que apaga el flag y detiene trabajos nuevos sin borrar datos ni premios ya otorgados.
- El registro de traspaso deja el sistema en estado `Completo` y anota la fecha de activación.

### Entrega final

- Feature flag habilitado en producción solamente después del smoke test.
- Monitorear errores, cola de emails, expiraciones y duplicados durante el primer torneo real.
- Cualquier mejora no incluida en la versión inicial se abre como trabajo separado.

## 10. Matriz global de aceptación

| Área | Casos mínimos |
| --- | --- |
| Autorización | Admin real, usuario registrado, invitado anónimo, no participante, espectador registrado |
| Cupos | Último lugar concurrente, paso a espera, retiro antes del check-in, inscripción tardía y cierre a la hora |
| 2v2 | Invitación, rechazo, aceptación concurrente, dos solos, solo impar, equipo en espera y reemplazo de un ausente |
| Check-in | Límite T-30, cualquiera del equipo, promoción automática y cierre a T |
| Formatos | 1v1 directa 4; 1v1 grupos 8; 2v2 directa 8 jugadores; 2v2 grupos 16 jugadores |
| Grupos | Todos contra todos, empate de dos, empate múltiple, diferencia de puntos y sorteo final persistido |
| Eliminación | `bye`, ronda bloqueada hasta completar, semifinales, final y tercer puesto |
| Presencia | Los dos lados entran, un lado ausente, un integrante 2v2 ausente, ambos lados incompletos |
| Estados | Pausa, reanudación, cancelación, reprogramación, descalificación, reemplazo y recarga/reconexión |
| Idempotencia | Resultado repetido, cron repetido, premio repetido, email repetido y doble clic del usuario |
| Economía | Apuesta cero, sin débito al crear, monedas de premio por jugador y sin doble acreditación |
| Estadísticas/misiones | Una vez por humano en 1v1 y 2v2; partida normal no afectada |
| Privacidad | RLS, RPC directas, Realtime, espectador sin manos y datos de email privados |
| Comunicación | Preferencia, baja, 24 horas, check-in, partida, reprogramación, cancelación y agenda obsoleta |
| Interfaz | Móvil, escritorio, teclado, foco, estados vacíos, errores, carga y dos clientes simultáneos |
| Regresión | Crear/jugar/finalizar partidas normales 1v1 y 2v2, misiones, medallas y emails existentes |

Archivos de prueba esperados a lo largo de las etapas:

- `supabase/tests/tournaments.sql` para RLS, restricciones, estados e idempotencia;
- un script de concurrencia para último cupo, invitaciones, promociones, resultados y premios;
- verificaciones de UI/recorridos documentadas por PR;
- extensión de los checks existentes cuando se agreguen RPC, emails, analítica o contratos.

## 11. Secuencia de lanzamiento y reversión

Orden seguro para cada etapa con SQL:

1. Fusionar código compatible con el estado anterior de la base.
2. Aplicar la nueva migración siguiendo las instrucciones del PR.
3. Ejecutar smoke tests y checks de seguridad.
4. Habilitar procesos programados solo cuando sus tablas/endpoints existan.
5. Mantener el feature flag apagado hasta PR 5.

Reversión operativa de lanzamiento:

1. Apagar `NEXT_PUBLIC_ENABLE_TOURNAMENTS`.
2. Pausar el cron/procesamiento de nuevos eventos de torneo.
3. No borrar torneos, resultados, entregas ni premios ya emitidos.
4. Corregir mediante una migración nueva y reanudar después de verificar.

## 12. Registro de traspaso entre sesiones

Cada sesión agrega una entrada. No se borra el historial previo.

### Plantilla

```md
### YYYY-MM-DD — PR N — Título

- Estado: En curso | Bloqueado | Completo
- Rama:
- PR:
- Commit final:
- Migraciones nuevas:
- SQL aplicado en:
- Feature flag:
- Pruebas automáticas ejecutadas:
- Recorridos manuales ejecutados:
- Decisiones técnicas tomadas:
- Problemas pendientes o riesgos:
- Para que empiece PR N+1 falta:
```

### 2026-09-20 — Documento base

- Estado: Completo
- Rama: `codex/plan-sistema-torneos`
- PR: [#74 — docs: planificar implementación progresiva de torneos](https://github.com/santibpapa/trucazo/pull/74)
- Commit de publicación inicial: `469c13646b44867dfd8d1b6b0c4fef4b4edbe5d5`
- Migraciones nuevas: ninguna
- SQL aplicado en: no corresponde
- Feature flag: todavía no existe; PR 1 lo agrega apagado
- Pruebas automáticas ejecutadas: validación de Markdown y `git diff --check`
- Recorridos manuales ejecutados: revisión de requisitos contra la arquitectura actual
- Decisiones técnicas tomadas: división en cinco entregas, restricciones de combinaciones para garantizar tercer puesto, apuesta cero, autoridad del servidor e idempotencia transversal
- Problemas pendientes o riesgos: el motor 2v2 todavía no actualiza estadísticas/misiones y necesita adaptación segura en PR 4; los eventos por minuto no pueden depender del cron diario actual
- Para que empiece PR 1 falta: fusionar el PR de documentación y partir del último `master`

### 2026-09-21 — PR 1 — Base de datos, seguridad y contrato

- Estado: Completo
- Rama: `codex/tournaments-base-contract`
- PR: [#75 — feat: establecer base segura para torneos](https://github.com/santibpapa/trucazo/pull/75)
- Commit final de implementación y pruebas: `eb651a6bb52c89f1353d496bf3a93def0a24aaf7`
- Migraciones nuevas: `supabase/migrations/20260921082456_tournaments_base_contract.sql`
- SQL aplicado en: todavía no aplicado; ejecutar la migración completa después de fusionar el PR
- Feature flag: `NEXT_PUBLIC_ENABLE_TOURNAMENTS` implementado y apagado por defecto; debe seguir ausente o en `false`
- Pruebas automáticas ejecutadas: reconstrucción completa desde cero; todas las pruebas SQL existentes; seguridad, privilegios, restricciones e idempotencia de torneos; concurrencia real por el último cupo y por retiro frente a inscripción nueva; prioridad de espera; respuesta a una invitación exacta; reinvitación con historial; invalidación de check-in al reprogramar; TypeScript; ESLint; allowlist de RPC; verificaciones de regresión; build de producción. Todo pasó en [GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/35605884013)
- Recorridos manuales ejecutados: revisión del contrato de lectura, administración, inscripción, invitación, retiro y check-in; no hay recorrido de interfaz porque la UI queda fuera de PR 1 y apagada
- Decisiones técnicas tomadas: tablas públicas sin acceso directo del cliente; estado interno, auditoría e idempotencia en esquema privado; mutaciones mediante RPC `security definer` con `search_path` vacío; bloqueo de la fila del torneo para serializar cupos, promociones, parejas y check-in; toda respuesta identifica la invitación exacta; los reintentos de invitación conservan historial; reprogramar invalida confirmaciones de presencia; contratos TypeScript compartidos y autoridad final del servidor
- Problemas pendientes o riesgos: todavía no existen UI, sorteos, partidas, progresión, emails, espectadores ni entrega de premios; es el alcance previsto de las PR siguientes y nada se expone mientras el flag siga apagado
- Para que empiece PR 2 falta: fusionar PR #75, aplicar la migración indicada, verificarla en el proyecto Supabase y mantener el feature flag apagado
