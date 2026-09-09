# 2vs2: auditoría técnica y propuesta de reglas

Fecha: 09/09/2026. Repositorio: `santibpapa/trucazo`.
Base: `master`, `708162b0aec85b3053702978045a7f19c0932c23`.

Este documento entrega el relevamiento de la etapa 1. Distingue hechos del código,
adaptaciones propuestas y decisiones pendientes. No certifica el estado aplicado
en el Supabase de producción: no se ejecutaron consultas ni cambios allí.

Actualización tras las respuestas del dueño: D1, D3 y D4 confirmadas. D2 y D5
corregidas: irse al mazo SIEMPRE termina la mano para el equipo, también si es por
tiempo; no existe retiro individual con continuación del compañero. La declaración
de envido sigue el orden de mesa desde la mano y los botones dependen del tanto.
Q1–Q3 también quedaron confirmadas: igualdad es “son buenas”, mazo solo en el
turno propio y liquidación del envido según Q3. Se inició la implementación.

## Diagnóstico

El 2vs2 requiere un motor de equipos. El modelo actual no representa una cantidad
variable de jugadores: contiene creador/rival en `tables`, dos identidades y dos
puntajes en `games`, y funciones que obtienen al rival con un `case`. Agregar
`player3_id` y `player4_id` dejaría incorrectos los turnos, cantos, permisos,
barridos y pagos que continúan operando sobre los primeros dos jugadores.

La arquitectura existente ofrece piezas útiles: autoridad en Postgres, manos
privadas separadas, bloqueo de filas para las acciones, helpers del mazo y envido,
componentes de cartas y salones, Realtime con consulta periódica de respaldo y
una reconstrucción de base para CI.

Se propone un estado de equipos separado, integrado en el lobby existente,
reutilizando presentación y helpers que no dependan de dos identidades. Evita
que una partida por equipos se interprete como una victoria individual en los
sistemas existentes. Esto no implica otra aplicación ni otro diseño.

### Mapa del código auditado

Los archivos siguientes son las últimas definiciones encontradas en el historial
del repositorio para las funciones mencionadas. `supabase/schema` es una foto
intermedia: se revisaron también las migraciones, en el orden usado por
`scripts/rebuild-db.sh`.

| Área | Implementación vigente en el repositorio | Dependencia de dos jugadores / reutilización |
|---|---|---|
| Modelos | `src/lib/types.ts`, `supabase/schema/tables.sql` | `Table`, `Game`, `EnvidoState` y resultados están ligados a p1/p2. Crear tipos propios para equipos. |
| Crear mesa | `supabase/migrations/20260626_turn_timer.sql`: `create_table` | Apuesta mínima 10; objetivo 15/30; reloj 15/30 s; cobra al creador inmediatamente. |
| Ingreso público/privado | `supabase/migrations/20260815_seguridad_1_mesas_privadas.sql` | Un único `opponent_id`; ingreso cobra y pasa a `playing`. La vía pública no admite privadas. |
| Espera y lobby | `src/app/lobby/LobbyClient.tsx`, `src/app/game/[id]/WaitingRoom.tsx`, `src/lib/lobby-tables.ts` | Espera un rival; agrega bot automáticamente a públicas luego de 8–18 s y reintenta cada 15 s. No trasladar ese llenado automático al 2vs2. |
| Comienzo y reparto | `supabase/migrations/20260815_seguridad_3_start_game.sql`, `20260620_ocultar_cartas.sql` | Autoriza antes de devolver datos, bloquea mesa, reparte 3+3. Reutilizar el mazo de 40 cartas, no `_deal_hands` sin adaptar. |
| Privacidad | `supabase/schema/policies.sql`, `20260620_ocultar_cartas.sql` | La RLS de `game_hands` permite leer la mano propia. Manos fuera de Realtime. El mismo principio sirve para cuatro participantes. |
| Cartas y bazas | `supabase/migrations/20260701_fix_fin_partida_por_cartas.sql`: `play_card` | Valida turno y carta desde la mano privada; resuelve al contar exactamente dos cartas. Los rangos enviados por cliente no sustituyen la carta almacenada. |
| Envido | `20260706_campana_4_estilo_reputacion.sql`, `20260707_envido_reveal_mazo_declarando.sql`, `20260622_target_score.sql` | Canto y respuesta entre dos; diálogo mano/pie; calcula tantos en servidor. Se pueden reutilizar cálculo individual y valores de cadenas. |
| Truco | `supabase/migrations/20260709_envido_va_primero.sql` | Guarda un cantante, asigna un rival y reconstruye el turno entre dos. El envido pendiente tiene prioridad. |
| Nueva mano | `supabase/migrations/20260706_campana_4_estilo_reputacion.sql`: `advance_hand` | Alterna mano entre p1/p2, limpia la ronda y reparte dos manos. |
| Mazo | `20260707_envido_reveal_ganador_al_mazo.sql`, `20260707_envido_reveal_mazo_declarando.sql` | Siempre cierra la mano para ambos. El dueño confirmó que en parejas también cierra la mano completa y gana el otro equipo. |
| Bots | `supabase/migrations/20260815_bots_lobby.sql`: `bot_step` | Encuentra un bot y un humano; solo consulta la mano del bot y jugadas públicas para elegir cartas. No representa compañero ni dos rivales. |
| Asignación de bots | `20260815_bots_lobby.sql`, `20260815_seguridad_5_lobby_carrera.sql` | Hay tres bots globales de lobby, asignados con bloqueo. No garantiza tres bots disponibles para cada mesa 2vs2. |
| Presencia y abandono | `20260702_comunidad_1_amigos.sql`, `20260620_forfeit_claim_server.sql`, `20260707_envido_reveal_mazo_declarando.sql` | Presencia por jugador; abandono concede victoria al rival; tercer mazo automático termina la partida. |
| Limpieza | `supabase/migrations/20260815_seguridad_6_privilegios_por_defecto.sql` | Inactividad de ambos: 10 min por defecto; mesas esperando: 15 min desde creación. Reembolsos pensados para dos o para el creador. |
| Cierre | `supabase/migrations/20260705_campana_provincias_1_backend.sql`: `finish_game` | Bloqueo e idempotencia; paga todo el pozo a uno, actualiza dos perfiles y escribe dos filas de historial. |
| Misiones y medallas | `20260904150348_ciclo_retorno.sql`, `20260709_medallas.sql` | Triggers sobre `games`, `profiles` e historial. No llamar al cierre 1vs1 desde 2vs2. |
| Interfaz | `src/app/game/[id]/GameClient.tsx`, `page.tsx` | Acceso limitado a creador/rival; turnos, anuncios y resultado se expresan como yo/rival. Crear cliente de equipos separado. |
| Arte y animaciones | `src/components/game/SalonScene.tsx`, `salon.module.css`, `PlayingCard.tsx`, `CardBack.tsx`, `CardMotion.tsx` | Arte y cartas reutilizables; animaciones usan destinos `me/opponent` y necesitan destinos por asiento. |
| Recuperación | `src/app/lobby/page.tsx`, `GameClient.tsx` | Retomar depende de `games`; Realtime más consulta cada 2,5 s; presencia cada 8 s. Agregar recorrido de recuperación por participante 2vs2. |

## Tabla de reglas

“Propuesta” no significa una decisión nueva confirmada por el dueño.

| Tema | 1vs1 observado | Adaptación propuesta a 2vs2 | Estado |
|---|---|---|---|
| Opciones | 15/30 puntos, sin flor, 15/30 s, mesa pública/privada, monedas ficticias | Conservar objetivo, sin flor, reloj, privacidad y apuestas según D4 | Confirmado |
| Equipos | Dos personas independientes | Asientos 0/2 y 1/3 | Confirmado |
| Elección | Creador y rival fijos | Elegir/cambiar un asiento libre antes del inicio; no mover a otra persona | Confirmado + permiso propuesto |
| Gestión | Creador cancela; bot automático en públicas | Solo creador agrega/quita bots, cancela e inicia con cuatro puestos ocupados; cada persona puede irse antes del comienzo | Propuesta técnica |
| Reparto | Tres cartas por persona; un mazo mezclado en servidor | Mezclar una sola vez y repartir doce cartas únicas, tres a cada asiento | Derivado |
| Primera mano | Empieza el creador | Empieza el asiento 0; rota 0→1→2→3→0 en cada mano, también si lo ocupa un bot | Propuesta de adaptación |
| Orden | Alterna entre p1/p2 | Recorrer los cuatro asientos en ese orden, desde quien abre; un mazo termina la mano, no se omite a una persona para seguir jugando | Confirmado |
| Baza | Compara dos cartas | Comparar todas las cartas de participantes activos; la mayor fuerza (menor `rank`) compartida solamente por compañeros gana para ese equipo; compartida entre equipos produce parda | Propuesta de adaptación |
| Salida siguiente | Ganador, o mano original si hubo parda | Sale el autor de la carta ganadora; si hay dos ganadoras del mismo equipo, el primero en el orden de esa ronda; tras parda sale quien abrió | Propuesta de adaptación |
| Dos bazas | Dos victorias cierran; victoria+parda o parda+victoria cierran | Conservar, contando victorias por equipo | Derivado |
| Dos primeras pardas | Se juega la tercera | Gana el equipo de la tercera; si vuelve a ser parda, equipo de la mano | Derivado |
| Una ronda por equipo y tercera parda | `play_card` devuelve mano original, aunque haya perdido la primera | Gana el equipo que ganó la primera; no cambiar el 1vs1 en este trabajo | **D3 confirmada** |
| Truco | 1 sin cantar; querido vale 2/3/4; no querido vale valor pedido menos 1 | Valores compartidos; derecho al siguiente aumento pertenece al equipo que aceptó, no solo a la persona | Derivado + **D1** para responsables |
| Inicio de cantos | En su turno; envido también ante truco pendiente antes de haber jugado su carta | Mantener restricción por participante activo; el compañero no hereda el derecho a jugar carta ajena | Propuesta de adaptación |
| Cadena de envido | Hasta dos envidos; real después de envido; falta después de envido/real; también apertura directa con real/falta | Conservar cadena y valores; aumentos alternan entre equipos | Derivado |
| Falta envido | Objetivo menos mayor puntaje actual; sin regla separada de malas/buenas | Usar puntajes de los dos equipos en el mismo helper | Derivado |
| Envido primero | Suspende truco y su respuesta hasta terminar el tanto | Guardar explícitamente la acción de cartas suspendida y el canto de truco pendiente | Derivado |
| Respuestas | Un rival responde | Cualquier compañero del equipo requerido puede responder; la primera respuesta válida compromete al equipo, con prioridad humana sobre el bot | **D1 confirmada** |
| Declaración | “Tengo” calcula el tanto real; “son buenas” no revela; mano declara primero | Orden de mesa desde mano; el primero debe declarar su tanto, los otros solo dicen “tengo X” si superan el mayor declarado; nunca sumar tantos de compañeros | **Confirmado, incluida Q1** |
| Son buenas | Cede el envido al rival | Disponible cuando el tanto individual es inferior al mayor declarado; el compañero conserva su turno de declaración | **Confirmado, incluida Q1** |
| Irse al mazo | Cierra mano; si declara, cede también envido | El mazo de cualquiera, manual o por tiempo, termina inmediatamente la mano completa; gana el equipo contrario | **Confirmado, incluidas Q2 y Q3** |
| Cartas justificativas de envido | Al cierre de mano se muestran las necesarias del ganador si no estaban jugadas | Conservar únicamente esa revelación reglamentaria. No revelar otras manos por pertenecer al equipo ni por finalizar partida | Derivado |
| Puntuación | Puntajes p1/p2; llegar al objetivo termina | Un puntaje por equipo; toda concesión en una transacción y como máximo una vez por evento | Confirmado |
| Revancha | Existe para personas y bots | Resultado por equipo y vuelta al lobby; sin revancha 2vs2 | Confirmado |
| Desconexión | No se reemplaza por bot; tiempo de turno y tercer timeout | Conservar 15/30 s, tercer vencimiento y ausencia de sustitución; corregir mazo automático para que cierre la mano completa | **D5 con corrección del dueño** |

### D1 — Quién responde por el equipo

Confirmado por el dueño: cualquier compañero del equipo requerido puede aceptar,
rechazar o aumentar. La primera respuesta válida que confirma el servidor vale
para todo el equipo, incluido “no quiero”. Las posteriores no pueden modificar
ese canto. Si cualquiera se fue al mazo, la mano ya terminó y no admite respuestas.

En equipos humano+bot tiene prioridad el humano mientras pueda responder; el bot
no debe rechazar por él durante ese plazo. Para dos bots responde uno elegido por
orden de mano.
Los cantos nuevos conservan la restricción de turno del 1vs1.

### D2 — Declaración de envido y mazo de equipo

El dueño precisó que los tantos se cantan en el mismo orden de la mesa, empezando
por la mano. El primero debe cantar su tanto. Los siguientes tienen “son buenas”
si su tanto es inferior, o “tengo X” si supera el mayor tanto declarado. No es una
elección libre de ocultar un tanto mayor ni de declarar uno menor. El servidor
calcula el valor real; nadie envía un número arbitrario ni suma al compañero.

“Son buenas” no termina la mano ni descarta la oportunidad del compañero de
declarar en su turno. Irse al mazo sí termina la mano para todos, en cualquier
fase. Esta última regla reemplaza expresamente la propuesta inicial de retiro
individual y el requisito inicial de que el compañero continuara.

Q1–Q3 quedan resueltas en el apartado siguiente.

### D3 — Tercera ronda parda: confirmada

“Baza” significa ronda de cartas dentro de una mano. El dueño confirmó que si
cada equipo ganó una ronda y la tercera es parda, gana el que ganó la primera.

Ejemplo concreto: asiento 0 es mano; equipo 1/3 gana la primera; equipo 0/2 gana
la segunda; la tercera es parda.

- Trasladar literalmente `play_card` da la mano al equipo 0/2.
- La regla confirmada para 2vs2 da la mano al equipo 1/3, que ganó la primera.

El hallazgo sale de la rama `num_results = 3` de `play_card` y también existe en
la reproducción TypeScript de `scripts/sim.ts`. Es una lectura de la lógica,
no una prueba ejecutada contra el SQL de producción. La decisión para 2vs2 ya está
cerrada; no volver a consultarla ni corregir el 1vs1 incidentalmente.

### D4 — Apuestas confirmadas

El dueño confirmó mantener apuestas por jugador y repartir el pozo entre los dos
ganadores. Esto resuelve la ambigüedad inicial con la exclusión de recompensas
nuevas. El 1vs1 siempre apuesta al menos 10 monedas y cobra un pozo; ese pago no
se puede reutilizar literalmente para dos ganadores.

Regla confirmada: aporte B por asiento, pozo 4B y
cobro 2B para cada ganador (ganancia neta B), sin estadísticas, ranking ni
misiones. Bots con aportes virtuales como en el 1vs1; no depender de las tres
cuentas-bot globales. Registrar cobros y devoluciones una sola vez por
participante; cambiar de asiento no vuelve a cobrar. Cancelar/retiro previo
reembolsa a todos los aportantes correspondientes.

Ejemplo: cuatro aportes de 50 dan un pozo de 200; cada ganador recibe 100.
Revisar también los triggers de medallas por cambio de saldo para no generar
premios adicionales fuera de alcance.

### D5 — Tiempo, desconexión y abandono

Política actual comprobada por lectura:

- El reloj se elige en 15 o 30 segundos; el servidor valida el vencimiento.
- Cada vencimiento envía al jugador al mazo. El tercero acumulado termina la
  partida, aunque haya vuelto entre medias. El mazo manual no suma al contador.
- El cliente marca presencia cada 8 segundos; no hay reemplazo automático.
- Hay una función histórica `claim_victory` basada en 30 s sin presencia, pero
  no forma parte de la lista vigente de RPC autorizadas al cliente y no es la
  política que usa la interfaz actual.
- El barrido cancela y devuelve apuestas si ambos faltan más de 10 min; el cron
  se configura aparte. Las mesas esperando se limpian a los 15 min desde creación.

La respuesta del dueño corrige la consecuencia del mazo: vencer un turno cierra
la mano completa y la gana el otro equipo. No continuar con el compañero.
Se conserva el resto de la política planteada: 15/30 segundos por acción, tercer
vencimiento acumulado del mismo jugador pierde la partida para su equipo, sin
sustitución por bot. Reconectar no borra el contador; mazo manual no suma faltas.
Abandono explícito de partida produce derrota de su equipo y se explica en el
control antes de ejecutarlo.

Si nadie elegible responde un canto por equipo en el plazo, también se cierra la
mano por mazo automático; no limitar la consecuencia al rechazo del canto.
Atribuir el vencimiento al responsable indicado por servidor (humano si hay
prioridad humana; de lo contrario primero del equipo en orden de mano).
Vencimiento al declarar también cierra la mano. Su liquidación de envido queda en
Q3 confirmada. Cancelar si todos los humanos están ausentes más de 10 min; los bots no cuentan
como presencia humana.

No deducir abandono de un evento transitorio de Realtime ni agregar sustitución
automática por bots.

### Aclaraciones Q1–Q3 confirmadas

1. **Q1 — Igualdad.** Si iguala el mayor tanto declarado, solo “son buenas”.
   Conserva prioridad quien declaró primero desde mano.
2. **Q2 — Mazo.** Solo en el turno propio de jugar, responder o declarar.
   Siempre termina toda la mano y la gana el equipo contrario.
3. **Q3 — Envido al mazo.** Conservar puntos ya adjudicados. Querido y pendiente:
   el contrario cobra ese envido más la mano. Cantado sin aceptar: el contrario
   cobra el rechazo más la mano, incluso si quien se retira lo había cantado.
   Sin canto no hay puntos extra de envido.

## Propuesta de implementación

### Persistencia y API

Usar tablas de equipos propias (`team_tables`, `team_seats`, `team_games`,
`team_hands`, `team_presence` y registro privado de solicitudes), con nombres
definitivos a fijar al implementar. El lobby presenta ambas modalidades y la
ruta de partida selecciona el cliente adecuado. No crear partidas 1vs1 ficticias
para representar equipos ni duplicar el cierre individual para cada ganador.

- Identidad del asiento/participante independiente del usuario; persona con
  `user_id`, bot con identidad local a esa mesa. No crear cuentas de login para
  bots ni cambiar sus JWT para ejecutar decisiones.
- Unicidad `(mesa, asiento)` y `(mesa, usuario)` cuando hay usuario; asiento en
  0–3; equipo derivado de su paridad; no aceptar equipo arbitrario del cliente.
- Un lock de mesa serializa cambio de asiento, ingreso, bots, salida e inicio.
  Revalidar cuatro ocupantes y permisos dentro de ese lock.
- Estado con turno de cartas separado del equipo que debe responder, autor del
  canto, turno de declaración, motivo del cierre, resultados, marcador, mano y versión.
- Mutaciones reciben identificador de solicitud y versión esperada; el servidor
  autoriza primero y guarda el efecto de cada solicitud. Una respuesta vieja no
  puede aceptar el canto siguiente ni jugar la misma carta en otra mano.
- Bloquear partida antes de decidir y ejecutar bots. Un único paso por versión,
  sin decidir con una copia vieja y aplicar contra una mano posterior.
- RPC de lectura devuelve estado público y mano propia de la misma versión en
  una instantánea coherente. RLS solo permite leer cartas propias. Ningún payload
  público incluye mano del compañero, tantos sin declarar ni análisis privado
  del bot.
- Nuevas funciones públicas con autorización de participante y grants explícitos;
  helpers internos sin ejecución para `PUBLIC`, `anon` ni `authenticated`.
- Realtime solo para mesa/estado público; volver a consultar al suscribirse y al
  reconectar. Ignorar versiones menores, respuestas tardías y temporizadores
  cancelados. Polling de respaldo e invalidación al terminar/salir.

Separar las tablas evita que los sweeps del 1vs1, los tres bots globales y sus
triggers interpreten el 2vs2 con reglas equivocadas. Se debe agregar su propio
mantenimiento y recuperación; “separado” no significa dejar esos recorridos sin
resolver. La configuración real de Realtime y del cron requiere verificarse en
la base de preview antes de entregar.

### Bots

Reutilizar los helpers de fuerza y envido que aceptan una mano. La entrada de la
decisión debe contener exclusivamente la mano propia, cartas ya públicas,
marcador, cantos y orden. El bot ahorra una carta fuerte si su equipo
ya asegura la baza; si todavía falta un rival, evalúa que puede superar al
compañero sin conocer sus cartas. Distinguir asegurar una baza de estar ganándola
momentáneamente.

Probar invariancia de información: manteniendo mano propia y estado público,
intercambiar cartas ocultas de los demás no puede cambiar la decisión con la
misma semilla aleatoria. No reutilizar la lectura de reputación de campaña ni
agregar nuevas actualizaciones de fama.

### Interfaz y compatibilidad visual

Compartir `SalonBackground`, `SalonTable`, `PlayingCard`, `CardBack`, arte y tokens
de controles; usar `TeamGameClient` y estilos de distribución específicos.
El componente 1vs1 y su presentación mantienen su recorrido.

Rotación visual relativa al asiento local: propio abajo, +2 arriba, +1/+3 en
lados consistentes con el orden acordado. Identificar cartas y cantos por asiento,
no solo por color. El marcador dice “Nosotros”/“Ellos” e identifica integrantes.
Mostrar la baza actual y permitir consultar las anteriores dentro del área
disponible sin convertir la partida en una página desplazable.

La CSS vigente tiene reglas antiguas de mínimos altos, pero al final las
sobrescribe con `overflow: hidden`, `100dvh`, `min-height: 0` y tamaños relativos al
área de mesa. Mantener esa geometría adaptativa: reservar marcador y controles,
reducir retratos/dorsos antes de sacrificar cartas legibles. Comprobar teclado,
safe areas, cantos con todas sus respuestas y pantalla final.

El PR #56 seguía abierto y cambia `GameClient.tsx`, `SalonPreview.tsx` y
`salon.module.css`. Refrescar su estado antes de modificar esos archivos; el
diagnóstico no significa que exista aún una prueba de compatibilidad del 2vs2.

### Sistemas existentes afectados

| Sistema | Tratamiento necesario dentro del alcance |
|---|---|
| Historial/estadísticas/ranking/misiones/fama | No llamar `finish_game`, `_record_objective_game` ni registrar victorias individuales ficticias. Pruebas de ausencia de efectos después de cierre y reintentos. |
| Medallas | Revisar triggers de `games`, historial y especialmente `profiles.coins` porque D4 mantiene apuestas. No disparar premios nuevos accidentalmente. |
| Monedas | Aporte y reparto confirmados en D4; contabilidad idempotente y reembolsos explícitos. |
| Recuperación desde lobby | Buscar participación real 2vs2 para los cuatro asientos, no solo creador. |
| Bots del lobby y barridos 1vs1 | Mantenerlos funcionando; los bots y la limpieza de equipos no consumen sus puestos ni reutilizan sus reembolsos. |
| Emails de reactivación | `email_recipient_activity` solo mira `games`/`game_history`. Registrar actividad real 2vs2 en esa lectura al integrar, sin campañas ni envíos nuevos, para no llamar “nunca jugó” a quien sí jugó. |
| Comunidad / panel admin | Sus consultas asumen dos jugadores. No inventar resultados individuales para alimentarlos; documentar las vistas que todavía no incluyen 2vs2. La detección de partida activa debe impedir flujos incompatibles. |
| Invitaciones y revancha | Mantener los flujos 1vs1; no enganchar automáticamente una mesa 2vs2 en sus RPC actuales. |

### PRs, migraciones y preview

1. Este PR: auditoría, decisiones D1–D5 actualizadas, aclaraciones Q1–Q3 y registro del objetivo.
2. Mesas/asientos: backend con permisos y pruebas; UI de elección e integración
   en lobby. No exponer inicio sin el motor funcional.
3. Motor/bots: transacciones, reglas acordadas y pruebas SQL/concurrencia.
4. Partida visual/sincronización: cliente, reconexión, mantenimiento y regresión.
5. Cierre de entrega: pruebas de navegador, capturas, instrucciones y limitaciones.

Se pueden agrupar los PRs 2–4 si facilita tener una preview completa, conservando
commits por etapa. Ninguna etapa parcial se debe lanzar para completar las demás
en producción.

Todas las migraciones serán nuevas y posteriores a las existentes. La guía final
debe decir qué archivo copiar al SQL Editor, en qué orden, qué comprobar y qué
hacer si falta configurar Realtime o el cron. Crear y probar primero una base de
preview aislada. No conectar una preview a producción para ejecutar pruebas de
abandono, bots, monedas o permisos.

## Verificación realizada y pendiente

Realizado en esta auditoría:

- Lectura de modelos, migraciones efectivas, RLS, flujo de juego, lobby, bots,
  cierres, integraciones y estilos actuales; revisión del alcance del PR #56.
- `node scripts/check-rpc-allowlist.mjs`: correcto, 61 RPC cliente y 4 solo de
  servidor.
- `scripts/sim.ts`: pasó comparación de rangos, 50.000 manos de envido y 20.000
  partidas a 30. **Es una reproducción TypeScript del SQL**, no ejecuta las
  funciones Postgres ni valida concurrencia, RLS, red o UI. No demuestra que las
  reglas observadas sean las reglas deseadas para 2vs2.
- Consulta del changelog y documentación de Supabase sobre RLS y Postgres Changes;
  la propuesta no requiere modificar el schema interno `realtime`.

Actualización de implementación: se agregó la migración
`20260909211038_team_2vs2.sql`, con motor, mesas, bots, presencia y barrido.
La suite `supabase/tests/team_games.sql` pasó contra PGlite tras reconstruir la
base y aplicar el historial. Cubre ambas metas, ambos relojes y las cinco
composiciones, privacidad, mazo, declaraciones y pagos. La carrera entre conexiones
independientes se incorpora a CI en `team_concurrency.sh`; falta su ejecución en
PostgreSQL nativo y la verificación de navegador/preview. El objetivo sigue abierto.

Las pruebas de entrega deberán incluir:

- Las cinco combinaciones de personas/bots indicadas en el objetivo, con partidas
  completas a 15 y 30 y ambos relojes.
- Las combinaciones de bazas, incluidas las dos primeras pardas, empate entre
  compañeros, tercera parda y mazo antes/después de tirar que cierra la mano para todos.
- Todas las cadenas de envido y truco; tanto por persona, prioridad de mano,
  respuesta compartida, truco suspendido y objetivo alcanzado durante envido.
- Reintentos, simultaneidad con conexiones independientes y solicitudes de una
  versión/mano anterior; una sola concesión de puntos/cobro/cierre.
- Permisos positivos y negativos como usuarios reales: terceros, compañeros,
  bots, dueño y acciones recibidas luego del mazo. Comprobar ocultamiento de manos por consulta
  directa, RPC y Realtime; no basta un error por falta general de permisos.
- Recargar cada asiento, reconectar, cerrar pestañas, vencimientos, cancelar antes
  del inicio y ausencia total. Bots pendientes no actúan luego del cierre.
- Celulares 320×568, 360×640, 390×844, 430×932 y escritorio; verificar controles
  visibles y ausencia de solapamientos y desplazamiento en partida y resultado.
- Regresión del 1vs1, invitaciones existentes, lobby al volver de tienda y cierre
  sin avances o recompensas indebidos.
