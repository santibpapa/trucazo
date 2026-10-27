# Producto — misiones y propuestas futuras

[Volver al README](../README.md) · Documento principal de planes de producto. Organización actualizada el **13/10/2026**. Mover una propuesta aquí no autoriza ni inicia su implementación.

## Estado actual

- El **ciclo de retorno** está documentado como implementado en el repositorio. Su registro original conserva pasos de publicación pendientes; comprobar la evidencia posterior antes de repetirlos. El procedimiento está en [Operación](operacion.md#ciclo-despliegue).
- **Temporadas competitivas, cierre de partida, rivalidades/desafíos y grupos** son especificaciones pendientes según sus registros. No se consideran funciones entregadas por figurar en este archivo.
- La entrega Android en curso tiene su alcance propio en [Android](android.md#android-etapas-finales). Estas propuestas no amplían automáticamente sus etapas.

## Próximo paso y cómo retomar

Si el dueño pide ejecutar uno de estos planes, leer su alcance, comprobar qué existe realmente y registrar aquí decisiones y aceptación. Para publicar el ciclo de retorno, partir del [registro operativo](operacion.md#ciclo-despliegue) y verificar primero si sus pasos ya fueron completados.

## Guía de lectura

- [Plan 1: ciclo de retorno](#plan-ciclo) — especificación de la implementación registrada.
- [Plan 2: temporadas competitivas](#plan-temporadas) — propuesta.
- [Plan 3: cierre de partida](#plan-postpartido) — propuesta.
- [Plan 4: rivalidades y desafíos](#plan-rivalidades) — propuesta.
- [Plan 5: grupos](#plan-grupos) — propuesta.

Actualizar aquí propuestas y su estado de ejecución. Las reglas entregadas pertenecen a [Juego](juego.md), las recetas de servidor a [Backend](backend.md) y los pasos operativos a [Operación](operacion.md). Enlazar esas referencias sin copiar capítulos enteros; las rutas de código parten de la raíz del repositorio.

<a id="retencion"></a>

## Misiones y planes de producto

El ciclo de retorno se documentó como implementado en el repositorio, con publicación pendiente en su registro original. Los otros cuatro planes son especificaciones pendientes según sus propios documentos; incorporarlos aquí no autoriza ni inicia su implementación.

<a id="plan-ciclo"></a>

### Plan 1: ciclo de retorno

Contrato y decisiones del plan original.

Procedencia anterior: `docs/planes-retencion/01-ciclo-de-retorno.txt`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan 1: ciclo de retorno</summary>

```text
TRUCAZO — PLAN 1: CICLO DE RETORNO
===================================

ESTADO
Implementado en el repositorio el 4 de septiembre de 2026.
Pendiente de aplicar la migración en Supabase y publicar el frontend.

IMPLEMENTACIÓN
- Migración: supabase/migrations/20260904150348_ciclo_retorno.sql
- Prueba integral: supabase/tests/ciclo_retorno.sql
- Catálogo: 22 misiones activas sin repetición exacta en días consecutivos
- Pantalla de detalle: /objetivos
- Acceso flotante en el lobby y resumen al cerrar cada partida válida
- Instrucciones de publicación: docs/ciclo-de-retorno-despliegue.md

PROPÓSITO DE ESTE ARCHIVO
Este archivo debe poder entregarse completo en una sesión futura para implementar
el punto 1 sin depender de la conversación original.

OBJETIVO DE PRODUCTO
Conseguir que cada jugador registrado encuentre un objetivo corto al entrar,
progrese al jugar y tenga una razón clara para volver al día siguiente. El sistema
debe premiar actividad y variedad, no obligar a ganar continuamente ni castigar de
forma agresiva un día de ausencia.

RESULTADO ESPERADO PARA EL JUGADOR
Al entrar al lobby ve un cofre flotante que abre sus tres misiones del día y el
desafío semanal sin desplazar las mesas. Después de cada partida ve cuánto avanzó.
Cuando completa una misión puede reclamar su recompensa. El día siguiente recibe
objetivos nuevos. Una racha semanal reconoce la constancia, pero incluye una
protección para no perderla por una única ausencia.

ALCANCE CERRADO DE LA PRIMERA VERSIÓN

1. Tres misiones diarias por jugador.
2. Un desafío semanal compartido por todos los jugadores.
3. Progreso calculado exclusivamente en el servidor.
4. Recompensas en monedas ficticias, con un límite diario.
5. Racha de días activos con una protección recuperable por semana.
6. Cofre flotante en el lobby y detalle en una pantalla de objetivos.
7. Avance visible en el cierre de la partida.
8. Eventos de analítica para medir uso y retorno.

FUERA DE ALCANCE EN ESTA VERSIÓN

- Cofres aleatorios, ruletas, probabilidades ocultas o cajas sorpresa.
- Monedas pagas, publicidad o premios con valor real.
- Notificaciones push automáticas.
- Objetivos que requieran 2x2 o 3x3.
- Pase de batalla.
- Misiones creadas manualmente desde un panel de administración.
- Misiones que puedan obligar al jugador a arruinar una partida, abandonar o jugar
  de una manera antideportiva.

PRINCIPIOS DE DISEÑO

- Siempre debe existir progreso por participar; no todas las misiones exigen ganar.
- El jugador debe entender qué tiene que hacer, cuánto avanzó y qué recibe.
- La recompensa se acredita una sola vez y de forma atómica.
- Una partida contra un bot puede contar para objetivos de práctica, pero no para
  objetivos competitivos identificados como “contra personas”.
- Las partidas anuladas, abandonadas de inmediato o manipuladas no cuentan.
- No usar miedo a perder (“te quedan 3 minutos”) como presión principal.
- La interfaz debe seguir el estilo vino, crema y dorado actual.

EXPERIENCIA COMPLETA

A. Entrada al lobby

- Mostrar un cofre flotante que no ocupe espacio ni desplace las mesas.
- El cofre abre una ventana con las tres misiones diarias, nombre, descripción
  breve, progreso y recompensa; tiene un nombre accesible para lectores de pantalla.
- Para invitados, el cofre también aparece: muestra las tres misiones diarias y
  un desafío semanal de ejemplo, todos compactos, grises y bloqueados, sin scroll
  interno. Un velo con sombra negra oscurece el conjunto y el cartel para iniciar
  sesión o registrarse queda superpuesto sobre las misiones. No llama a las RPC de
  objetivos hasta iniciar sesión.
- La ventana permite reclamar y ofrece un acceso secundario al desafío semanal,
  la racha y el detalle completo.
- Mientras haya misiones diarias incompletas, mostrar brillo y una sacudida breve y
  espaciada; detener la animación con prefers-reduced-motion.
- Si hay recompensas listas, mostrar su cantidad en una insignia y dejar el cofre
  quieto cuando ya no queden objetivos incompletos.
- En escritorio, evitar que el acceso tape el panel lateral de comunidad.

B. Detalle de objetivos

Cada misión muestra:

- Nombre breve.
- Explicación concreta.
- Progreso numérico, por ejemplo 2/3.
- Barra de progreso.
- Recompensa exacta.
- Tiempo natural restante: “Termina hoy” o “Termina el domingo”.
- Estado: en progreso, lista para reclamar o reclamada.

C. Después de una partida

- Si hubo avance, mostrar “Objetivos” dentro del resumen final.
- Animar la barra desde el valor anterior al nuevo valor.
- Si se completó una misión, mostrar una confirmación breve y no bloquear los botones
  de revancha o salida.
- Respetar prefers-reduced-motion: en ese caso actualizar sin animación extensa.
- Si el progreso no pudo cargarse, el cierre de la partida debe seguir funcionando.

D. Reclamo

- Reclamar desde el lobby o desde el resumen de la partida.
- El botón entra en estado de carga y no admite doble toque.
- El servidor acredita la recompensa y marca el reclamo en una sola operación.
- Mostrar “Recompensa recibida” y el saldo nuevo.
- Si ya fue reclamada desde otra pestaña, refrescar el estado sin duplicar monedas.

E. Cambio de día o semana

- Usar la zona horaria America/Argentina/Buenos_Aires para los límites visibles.
- Si la pantalla queda abierta durante el cambio de día, refrescar al recuperar foco
  o en la siguiente acción del usuario.
- Nunca confiar en la fecha del dispositivo del jugador.

CATÁLOGO INICIAL DE MISIONES

Las tres misiones diarias se eligen de categorías diferentes. El catálogo contiene
22 variantes y excluye automáticamente las usadas el día anterior:

Participación:
- Terminá 1, 2, 3 o 4 partidas.

Competencia:
- Ganá 1, 2 o 3 partidas contra personas.
- Jugá 1, 2 o 3 partidas públicas contra personas.

Historia:
- Jugá 1, 2 o 3 duelos del Modo Historia.
- Ganá 1, 2 o 3 duelos del Modo Historia.

Social:
- Jugá 1, 2 o 3 partidas privadas con amigos.
- Terminá 1, 2 o 3 partidas de revancha.

No incluir inicialmente misiones como “ganá un envido” o “ganá con vale cuatro” si
el servidor todavía no conserva de forma inequívoca esos eventos. Primero se debe
garantizar una fuente de verdad auditable.

DESAFÍOS SEMANALES INICIALES

- Terminá 10 partidas válidas.
- Ganá 5 partidas entre cualquier modo permitido.
- Vencé por primera vez a 2 rivales distintos de Historia.
- Jugá con 3 rivales humanos diferentes.

ECONOMÍA PROPUESTA PARA LA PRIMERA VERSIÓN

- Misión diaria fácil: 20 monedas.
- Misión diaria media: 30 monedas.
- Misión diaria competitiva: 40 monedas.
- Desafío semanal: 150 monedas.
- Tope ordinario: 90 monedas diarias más el premio semanal.
- Estos valores deben quedar configurados en la base, no repetidos en componentes.
- Antes de desplegar, comparar estas entradas con apuestas, premios de Historia,
  precios de la tienda y bonus anti-quiebra para evitar inflación.

RACHA SALUDABLE

- Un día cuenta como activo al terminar al menos una partida válida.
- La racha se expresa en días, pero la recompensa importante se entrega por semanas
  con actividad, no por cadenas interminables.
- Cada jugador recibe una protección semanal automática.
- Si falta un día, la protección conserva la racha y queda consumida.
- Si falta otro día en la misma semana, la racha se reinicia sin quitar recompensas
  ya obtenidas.
- No vender protecciones ni usar mensajes culpabilizantes.

MODELO DE DATOS SUGERIDO

Crear una migración nueva; nunca editar migraciones aplicadas.

daily_mission_templates
- id o slug estable.
- nombre y descripción.
- tipo de evento medible.
- objetivo numérico.
- recompensa.
- categoría.
- modos permitidos.
- activa.

daily_mission_assignments
- profile_id.
- local_date.
- template_id.
- progreso.
- completed_at.
- claimed_at.
- reward_amount_snapshot.
- clave única por jugador, fecha y misión.

weekly_challenges
- week_start.
- template_id o campos congelados del desafío.
- objetivo y recompensa como snapshot.
- estado activo/finalizado.

weekly_challenge_progress
- profile_id y week_start.
- progreso, completed_at y claimed_at.

profile_activity_streaks
- profile_id.
- current_streak_days.
- longest_streak_days.
- last_active_local_date.
- protection_week_start.
- protection_used_at.

Las tablas de progreso son privadas. Cada jugador solo puede leer sus filas. Las
escrituras y recompensas pasan únicamente por funciones security definer.

LÓGICA DE SERVIDOR

- Crear una función interna que reciba un evento de juego validado y actualice las
  misiones relevantes.
- Llamarla desde el mismo flujo autorizado que finaliza una partida, después de
  confirmar que la partida terminó de verdad.
- Usar identificadores de partida procesada o una restricción equivalente para que
  un reintento de red no duplique progreso.
- Crear RPC get_my_objectives() para devolver misiones, progreso, racha y saldo.
- Crear RPC claim_objective_reward(tipo, identificador) que bloquee la fila, valide
  cumplimiento, acredite monedas y marque claimed_at en una transacción.
- No permitir que el cliente envíe “sumame uno”, “completé” ni el monto del premio.
- Diferenciar humano, bot, campaña, mesa pública, privada y revancha usando datos del
  servidor, no parámetros del navegador.
- Actualizar supabase/schema además de agregar la migración incremental.

ASIGNACIÓN DE MISIONES

Para la primera versión, evitar un cron obligatorio:

- get_my_objectives() crea perezosamente las asignaciones del día si no existen.
- La selección debe ser determinista para un jugador y una fecha o quedar grabada al
  primer acceso; nunca debe cambiar al refrescar.
- Siempre asignar una misión de participación.
- No asignar una misión social a quien todavía no tiene amigos, salvo que la acción
  pueda completarse sin depender de que otro acepte.
- No asignar una misión de Historia si el modo no está disponible para ese perfil.

FRONTEND

Componentes sugeridos:

- ObjectivesFloatingButton: cofre flotante del lobby.
- ObjectivesPanel o página /objetivos: detalle completo.
- ObjectiveRow: descripción, progreso y recompensa.
- ObjectiveProgressDelta: bloque reutilizable para el cierre de partida.

Reutilizar Button, Panel, Coins, Alert y tokens de globals.css. No crear otro sistema
visual. Los controles táctiles deben medir al menos 44x44 px, tener foco visible y
estado de carga. El progreso no puede depender solamente del color: acompañarlo con
texto y números. Los cambios asíncronos deben anunciar una frase completa mediante
role=status, por ejemplo “Misión Partida del día completada”, no un número suelto.

ESTADOS QUE DEBEN ESTAR DISEÑADOS

- Cargando sin parpadeos.
- Tres misiones en progreso.
- Una o más listas para reclamar.
- Todas reclamadas.
- Error de lectura.
- Error de reclamo.
- Día cambiado.
- Sin conexión temporal.
- Actualización simultánea desde otra pestaña.

ANALÍTICA

Agregar eventos de primera parte, sin información sensible:

- objectives_viewed.
- objective_progressed.
- objective_completed.
- objective_reward_claimed.
- weekly_challenge_completed.
- streak_continued.
- streak_protection_used.

Propiedades útiles: tipo de misión, objetivo, modo de juego y días de racha. No enviar
nombre de usuario, mensajes, código de mesa ni id crudo de otra persona.

MÉTRICAS DE ÉXITO

- Porcentaje de jugadores activos que miran sus objetivos.
- Porcentaje que completa al menos una misión.
- Porcentaje que reclama una recompensa.
- Partidas por jugador activo.
- Retorno al día siguiente y a los 7 días.
- Inflación media de monedas por jugador.
- Abandonos de partida, para comprobar que las misiones no los incentivan.

SEGURIDAD Y ABUSO

- RLS en todas las tablas nuevas.
- Revocar escrituras directas a authenticated y anon.
- search_path fijo en funciones security definer.
- Reclamos idempotentes.
- Excluir partidas que no llegaron a un estado final válido.
- Definir un mínimo razonable de duración solo si los datos muestran abuso; no usar
  un número arbitrario que penalice partidas legítimas.
- Probar dos pestañas reclamando a la vez.

PRUEBAS OBLIGATORIAS

Base de datos:
- Una partida válida avanza una sola vez.
- Un reintento no duplica progreso.
- Un reclamo doble acredita una sola recompensa.
- Un usuario no puede leer ni reclamar objetivos ajenos.
- Bot, humano, campaña y privada se clasifican correctamente.
- El cambio de fecha argentina asigna el día correcto.
- La protección de racha se consume una sola vez por semana.

Interfaz:
- Funciona a 320, 375, 414, 768, 1024 y 1440 px.
- Funciona solo con teclado.
- Los lectores de pantalla reciben cambios de estado entendibles.
- Con movimiento reducido no hay animaciones largas.
- El cofre no ocupa espacio ni desplaza el lobby al cargar.
- El botón de revancha permanece accesible aunque se complete una misión.

ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. Revisar economía y eventos disponibles en finish_game.
2. Crear migración, tablas, RLS y RPC.
3. Agregar pruebas SQL de seguridad e idempotencia.
4. Integrar actualización de progreso al cierre de partida.
5. Crear detalle de objetivos.
6. Crear resumen del lobby.
7. Integrar avance en el cierre de partida.
8. Agregar analítica.
9. Ejecutar lint, build, pruebas SQL y flujo manual completo.
10. Entregar al dueño pasos exactos para pegar la migración en Supabase.

CRITERIOS DE ACEPTACIÓN

- Un jugador ve exactamente tres misiones diarias coherentes y un desafío semanal.
- El progreso solo cambia por partidas válidas confirmadas por el servidor.
- Cada recompensa puede cobrarse una sola vez.
- El saldo mostrado coincide con la base después del reclamo.
- La racha usa fecha argentina y aplica correctamente una protección semanal.
- El acceso a objetivos aparece en el lobby y el progreso después de la partida.
- La experiencia no bloquea jugar, revancha ni volver al lobby.
- No hay regresiones en monedas, Historia, PvP, bots o invitados.
- La implementación queda documentada y verificable con pruebas.

DEFINICIÓN DE TERMINADO

No considerar terminado por “verse bien”. Deben pasar build, pruebas de seguridad,
prueba de reclamo simultáneo, prueba en móvil y verificación manual de una partida
que avance, complete y cobre una misión.
```

</details>

<a id="plan-temporadas"></a>

### Plan 2: temporadas competitivas

Especificación pendiente.

Procedencia anterior: `docs/planes-retencion/02-temporadas-competitivas.txt`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan 2: temporadas competitivas</summary>

```text
TRUCAZO — PLAN 2: TEMPORADAS COMPETITIVAS
==========================================

ESTADO
Documento de especificación. Todavía no implementado.

PROPÓSITO DE ESTE ARCHIVO
Servir como documento autónomo para implementar una clasificación competitiva por
temporadas sin reemplazar ni romper el ranking histórico actual.

OBJETIVO DE PRODUCTO
Darles a jugadores nuevos y veteranos una meta competitiva alcanzable cada mes. El
ranking vitalicio por victorias debe conservarse como historial, mientras una nueva
clasificación estacional mide rendimiento reciente y crea ciclos de regreso.

PROMESA AL JUGADOR
“Competí este mes, subí de división y ganá una recompensa que demuestre hasta dónde
llegaste.”

ALCANCE CERRADO DE LA PRIMERA VERSIÓN

1. Temporadas mensuales con fecha argentina de inicio y fin.
2. Clasificación individual para partidas públicas 1 contra 1 entre humanos.
3. Puntaje de habilidad tipo Elo calculado por el servidor.
4. Cinco partidas de ubicación al comienzo de cada temporada.
5. Divisiones visibles.
6. Ranking estacional general y ranking entre amigos.
7. Recompensa cosmética de temporada, sin ventaja de juego.
8. Historial de temporadas terminadas en el perfil.
9. El ranking histórico actual continúa disponible.

FUERA DE ALCANCE EN ESTA VERSIÓN

- 2x2 y 3x3.
- Torneos eliminatorios.
- Emparejamiento obligatorio por Elo.
- Descenso por inactividad diaria.
- Premios con valor real.
- Compra de puntaje o protecciones.
- Reinicio o eliminación de estadísticas históricas.
- Ranking de Modo Historia, que continúa separado.

QUÉ PARTIDAS CUENTAN

Cuenta para temporada:
- Mesa pública.
- Ambos participantes son humanos registrados.
- Partida terminada válidamente.
- Formato 1 contra 1.

No cuenta:
- Partida contra bot, incluso si el bot llenó una mesa pública.
- Modo Historia.
- Mesa privada o desafío amistoso.
- Invitado sin perfil persistente.
- Partida anulada, incompleta o abandonada antes de cumplir la condición válida que
  defina el servidor.

La interfaz debe avisar antes de entrar si una mesa es “Competitiva” o “Amistosa”.
Nunca cambiar retroactivamente el carácter de una partida después de empezarla.

SISTEMA DE PUNTAJE PROPUESTO

- Rating inicial interno: 1000.
- Cinco partidas de ubicación.
- K más alto durante ubicación para llegar rápido al nivel apropiado.
- K normal después de ubicación.
- Victoria suma y derrota resta según diferencia de rating.
- El cálculo usa valores anteriores de ambos jugadores dentro de una transacción.
- Guardar rating_before, delta y rating_after para auditoría.
- No mostrar fórmulas complejas durante la partida; mostrar cambio exacto al final.

Valores iniciales para validar con simulaciones antes de desplegar:
- K de ubicación: 40.
- K normal: 24.
- Rating mínimo visible: 0.
- Sin bonus artificial por racha en la primera versión.

DIVISIONES PROPUESTAS

- Baraja: 0 a 899.
- Envido: 900 a 1049.
- Truco: 1050 a 1199.
- Retruco: 1200 a 1349.
- Vale Cuatro: 1350 o más.

Los límites deben vivir en una única fuente de verdad del servidor o configuración
compartida. Antes de fijarlos definitivamente, ejecutar una simulación con población
pequeña para evitar que casi todos queden en la misma división.

TEMPORADA Y CIERRE

- Una temporada tiene slug, nombre, starts_at, ends_at y estado.
- Las fechas se muestran en America/Argentina/Buenos_Aires.
- La temporada activa se decide por datos del servidor.
- El último rating confirmado antes de ends_at determina la posición final.
- Al cerrar, guardar puesto, división máxima/final, rating final y recompensa.
- No depender de que el jugador esté conectado durante el cierre.
- La siguiente temporada empieza con un reinicio suave, no desde cero absoluto.
- Reinicio sugerido: acercar parcialmente el rating a 1000 para mantener equilibrio.

RECOMPENSAS

Primera versión:
- Un marco o medalla visual por división final.
- Un título de perfil con temporada y año.
- Sin monedas competitivas hasta comprobar que no incentivan arreglar partidas.
- Las recompensas se asignan una sola vez al finalizar la temporada.
- El jugador conserva el cosmético aunque baje en otra temporada.

EXPERIENCIA DEL LOBBY

Agregar un bloque compacto “Temporada actual” que muestre:
- Nombre y tiempo restante.
- División o “Ubicación 2/5”.
- Rating actual después de ubicarse.
- Cambio respecto de la partida anterior.
- Próxima división y puntos que faltan.
- CTA “Ver temporada”.

No ocultar “Jugar ya”. El bloque competitivo debe informar y motivar, no impedir el
acceso al juego.

PANTALLA DE TEMPORADA

Secciones:

1. Mi estado
- División, rating, posición y partidas de ubicación.
- Progreso hacia la siguiente división.
- Mejor división alcanzada en la temporada.

2. Clasificación
- Top general paginado o limitado.
- Fila propia siempre visible aunque quede fuera del top.
- Victorias, derrotas, partidas y rating.
- No ordenar por victorias: ordenar por rating y desempate definido.

3. Amigos
- Misma información limitada a amigos.
- Estado vacío útil: “Agregá amigos para comparar su temporada”.

4. Recompensas
- Mostrar qué recibe cada división.
- Marcar la recompensa actualmente asegurada.
- No simular cofres ni probabilidades.

5. Reglas claras
- Qué partidas cuentan.
- Cómo se gana o pierde puntaje en lenguaje simple.
- Fecha de cierre.

CIERRE DE PARTIDA

Cuando la partida fue competitiva:
- Mostrar rating anterior, cambio con signo y rating nuevo.
- Mostrar cambio de división si ocurrió.
- Mostrar avance de ubicación si todavía no terminó.
- Si no cuenta, decir brevemente “Partida amistosa: no modifica tu temporada”.
- El dato debe venir del servidor y sobrevivir a recargar la pantalla.

MODELO DE DATOS SUGERIDO

competitive_seasons
- id, slug y nombre.
- starts_at y ends_at.
- status: scheduled, active, finalizing, finished.
- parámetros congelados de rating y reinicio.
- configuración de divisiones o versión asociada.

player_season_stats
- season_id y profile_id como clave única.
- rating.
- placement_games.
- games_played, wins, losses.
- peak_rating y peak_division.
- last_competitive_game_at.
- final_rank, final_rating y final_division una vez cerrada.
- reward_granted_at.

season_rating_events
- id, season_id y game_id.
- profile_id y opponent_id.
- rating_before, rating_delta y rating_after.
- expected_score o datos suficientes para auditar.
- created_at.
- clave única por game_id y profile_id.

season_rewards
- season_id, division y recompensa cosmética.
- snapshot del nombre y presentación.

No exponer opponent_id innecesariamente en lecturas públicas. Crear vistas o RPC con
los campos exactos que necesita cada pantalla.

LÓGICA DE SERVIDOR

- Integrar la actualización en el flujo autorizado de finalización de partida.
- Bloquear filas de ambos participantes antes de calcular.
- Crear las estadísticas de temporada perezosamente si todavía no existen.
- Verificar que la partida cumple todas las condiciones competitivas.
- Insertar ambos rating_events y actualizar ambos perfiles en una transacción.
- Hacer el proceso idempotente usando game_id.
- Crear RPC get_current_season_summary().
- Crear RPC get_season_leaderboard(season, alcance, página).
- Crear función administrativa o job seguro para finalizar temporada y entregar
  recompensas.
- El cliente nunca envía rating, delta, resultado ni división.
- Actualizar schema y agregar una migración nueva.

ANTI-ABUSO INICIAL

- Las partidas repetidas contra la misma persona cuentan normalmente para rating,
  pero registrar frecuencia para detectar arreglos.
- No aplicar límites secretos. Si se adopta una regla, debe ser pública.
- Alertar al administrador cuando dos cuentas concentran una proporción anormal de
  sus partidas entre sí.
- No castigar automáticamente sin datos suficientes.
- Bots y cuentas administrativas quedan excluidos.
- Mantener trazabilidad completa de cada cambio de rating.

RELACIÓN CON EL RANKING ACTUAL

- Renombrar visualmente el actual como “Histórico” o “Más ganadores”.
- Agregar pestañas o navegación clara: Temporada / Amigos / Histórico.
- El ranking de Argentina del Modo Historia conserva su identidad y ruta propia.
- No mezclar puntos de campaña, victorias vitalicias y rating estacional.

ACCESIBILIDAD Y UX

- No comunicar división solo por color: nombre, icono vectorial y texto.
- Tablas adaptadas a tarjetas en móvil, sin scroll horizontal obligatorio.
- Foco visible y controles de al menos 44x44 px.
- Cambios asíncronos con estados de carga estables.
- La fila propia debe identificarse con “vos”, no únicamente con un borde dorado.
- Explicar por qué una partida no contó.
- Respetar movimiento reducido en promociones de división.

ANALÍTICA

- season_page_viewed.
- placement_game_completed.
- placement_completed.
- rating_changed.
- division_promoted.
- division_demoted.
- season_reward_viewed.
- season_reward_granted.

Métricas principales:
- Participación en temporada entre jugadores activos.
- Finalización de las cinco ubicaciones.
- Partidas competitivas por jugador.
- Retorno semanal de participantes frente a no participantes.
- Distribución por divisiones.
- Tiempo de espera y tasa de partida contra bot.
- Concentración de partidas entre pares de cuentas.

PRUEBAS OBLIGATORIAS

Base de datos:
- Victoria esperada e inesperada producen deltas correctos.
- Los dos deltas se calculan con ratings anteriores.
- La misma partida no se procesa dos veces.
- Bot, campaña y privada no modifican rating.
- El cierre congela posiciones y entrega una sola recompensa.
- Un usuario no altera sus estadísticas ni las de otro.
- Cambio de mes y zona horaria funcionan correctamente.
- Dos partidas terminando simultáneamente no corrompen el rating.

Interfaz:
- Ubicación 0/5 a 5/5.
- Promoción y descenso.
- Jugador fuera del top.
- Sin amigos y con amigos.
- Temporada programada, activa, finalizando y terminada.
- 320 a 1440 px, teclado y lector de pantalla.
- Recarga del postpartido conserva el delta mostrado.

ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. Simular Elo y divisiones con población pequeña.
2. Definir exactamente qué partidas son competitivas.
3. Crear migración, RLS, rating events y RPC.
4. Agregar pruebas SQL e idempotencia.
5. Integrar con finish_game.
6. Crear pantalla de temporada y ranking de amigos.
7. Agregar resumen del lobby.
8. Integrar cambio de rating al postpartido.
9. Implementar cierre y recompensas.
10. Ejecutar build, pruebas y cierre simulado.
11. Dar al dueño instrucciones paso a paso para Supabase.

CRITERIOS DE ACEPTACIÓN

- Solo partidas públicas humanas válidas cambian rating.
- El jugador completa cinco ubicaciones y obtiene una división.
- Cada cambio queda auditado y no se duplica.
- Se puede ver ranking general, amigos y posición propia.
- El ranking histórico sigue funcionando.
- La temporada puede cerrarse sin borrar datos ni depender del navegador.
- Las recompensas son cosméticas y se entregan una sola vez.
- La distribución de divisiones fue simulada y documentada.

DEFINICIÓN DE TERMINADO

La función no está terminada hasta probar una temporada corta completa en entorno de
prueba: creación, ubicaciones, cambios de rating, promoción, cierre, recompensa e
inicio de la siguiente, además de build y pruebas de seguridad.
```

</details>

<a id="plan-postpartido"></a>

### Plan 3: cierre de partida

Especificación pendiente. Conservar la decisión de no generar un “momento de la partida” automático.

Procedencia anterior: `docs/planes-retencion/03-postpartido-memorable.txt`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan 3: cierre de partida</summary>

```text
TRUCAZO — PLAN 3: POSTPARTIDO MEMORABLE
========================================

ESTADO
Documento de especificación. Todavía no implementado.

DECISIÓN DEL DUEÑO
No incluir una sección automática de “momento de la partida”. No calcular ni mostrar
remontadas, jugadas destacadas, mejor bluff ni resúmenes narrativos equivalentes.

PROPÓSITO DE ESTE ARCHIVO
Servir como especificación autónoma para mejorar el cierre de partidas online y de
Modo Historia sin romper la revancha, las reseñas ni los flujos ya existentes.

OBJETIVO DE PRODUCTO
Hacer que el final de cada partida produzca claridad, satisfacción y una siguiente
acción natural. El jugador debe entender qué pasó con su resultado, monedas,
objetivos, temporada y relación con el rival sin quedar atrapado en una pantalla
larga.

ALCANCE CERRADO DE LA PRIMERA VERSIÓN

1. Nuevo resumen final para PvP, bot y campaña.
2. Resultado y marcador final prominentes.
3. Cambio de monedas con saldo final.
4. Progreso de objetivos diarios/semanales, si el Plan 1 está implementado.
5. Cambio de rating/división, si el Plan 2 está implementado y la partida contó.
6. Medallas recién obtenidas.
7. Historial cara a cara básico contra un humano registrado.
8. Acciones contextuales: revancha, agregar amigo, compartir y salir.
9. Persistencia del resumen al recargar.
10. Analítica del embudo postpartido.

DEPENDENCIAS OPCIONALES

- Si el Plan 1 no existe, ocultar el bloque de objetivos sin dejar espacio vacío.
- Si el Plan 2 no existe, ocultar temporada/división.
- Si el Plan 4 no existe, “Agregar amigo” puede usar el flujo social actual y el
  historial cara a cara puede quedar para esa implementación.
- Este plan debe mejorar el cierre actual aun sin ninguna de esas dependencias.

FUERA DE ALCANCE

- Replay completo de cartas.
- Análisis estratégico automático.
- Video, grabación o GIF de la partida.
- Chat libre dentro del cierre.
- Recompensas aleatorias.
- Animaciones largas que demoren la revancha.
- Nuevas reglas de juego.

JERARQUÍA DEL CIERRE

La pantalla debe responder, en este orden:

1. ¿Gané, perdí o la partida fue anulada?
2. ¿Cuál fue el marcador?
3. ¿Qué cambió para mí?
4. ¿Qué puedo hacer ahora?

No mezclar todos los datos con el mismo peso visual.

ESTRUCTURA VISUAL

A. Encabezado

- “Ganaste”, “Perdiste” o estado válido equivalente.
- Marcador final completo, por ejemplo 30–24.
- Nombre y avatar de ambos participantes.
- Distinción clara entre persona, bot y rival de Historia.
- Celebración moderada para victoria; cierre sobrio para derrota.

B. Balance

- Cambio de monedas con signo.
- Saldo final.
- Si no hubo movimiento de monedas, explicar por qué: campaña, partida amistosa,
  anulación u otra condición real.
- Nunca estimar el saldo en el cliente.

C. Progreso

Mostrar solamente bloques con información real:

- Objetivos: barras que cambiaron en esta partida.
- Temporada: rating anterior, delta, rating final o avance de ubicación.
- División: promoción o descenso, si ocurrió.
- Medallas: nombre y descripción de las recién ganadas.
- Historia: rival vencido, puntos y recompensa de campaña ya existentes.

No mostrar tarjetas vacías ni “próximamente”.

D. Relación con el rival

Para humanos registrados:
- Historial total entre ambos: victorias propias y del rival.
- Botón “Agregar amigo” si todavía no son amigos.
- Estado “Solicitud enviada” si ya existe una solicitud.
- Estado “Amigo” si ya lo son.

No mostrar historial cara a cara contra bots ni mezclar partidas de campaña.

E. Acciones

Orden recomendado para PvP:

- Acción principal: “Revancha”.
- Secundaria: “Volver al lobby”.
- Terciarias: “Agregar amigo” y “Compartir resultado”.

Orden recomendado para campaña:

- Acción principal: “Jugar de nuevo” o “Siguiente rival” cuando corresponda.
- Secundaria: “Volver al mapa”.
- Reseña conserva su lugar actual, pero no compite visualmente con continuar.

REGLAS DE REVANCHA

- Conservar el flujo actual de votos 0/2, 1/2 y 2/2.
- Mostrar claramente quién pidió revancha.
- No bloquear volver al lobby mientras se espera.
- Si el rival sale o vence el plazo, cerrar el estado con un mensaje claro.
- Evitar dos botones principales simultáneos.
- Mantener escucha Realtime mientras la pantalla final está abierta.
- Prevenir doble solicitud con botón deshabilitado y operación idempotente.

COMPARTIR RESULTADO

Primera versión:
- Usar Web Share API cuando esté disponible.
- Respaldo: copiar un texto y enlace al portapapeles.
- Texto breve con resultado, marcador y marca Trucazo.
- No incluir saldo, email, identificadores internos ni código de mesa.
- La URL compartida debe llevar a una ruta pública segura, no a una partida privada.
- Si se crea una imagen social más adelante, debe usar datos reales y no afirmar
  estadísticas inexistentes.

Ejemplo conceptual:
“Le gané 30–24 a Nico en Trucazo. ¿Jugamos? https://www.trucazo.com.ar/”

PERSISTENCIA DEL RESUMEN

El resumen debe reconstruirse desde datos guardados, no desde estados temporales de
React. Si el jugador recarga o vuelve con el botón Atrás debe ver los mismos deltas y
recompensas.

Opciones aceptables:
- Guardar snapshots de cambios asociados a game_id.
- Consultar registros idempotentes de monedas, rating, misiones y medallas.
- Exponer una RPC agregadora que devuelva únicamente el resumen autorizado.

No calcular “antes” restando valores actuales en el navegador, porque otras pestañas
o partidas podrían haber cambiado el perfil.

CONTRATO DE DATOS SUGERIDO

Crear RPC get_postgame_summary(p_game_id) que valide que el usuario participó y
devuelva un objeto estable con:

- game_id, status y mode.
- winner_id o resultado relativo al usuario.
- final_score propio y rival.
- datos públicos mínimos de ambos jugadores.
- coins_before, coins_delta y coins_after cuando corresponda.
- rematch_p1, rematch_p2, rematch_game_id y expiración.
- nuevas medallas otorgadas por esta partida.
- head_to_head wins/losses si el rival es humano.
- objective_deltas opcionales.
- season_delta opcional.
- campaign_delta opcional.
- friendship_state opcional.

La RPC no devuelve manos, cartas ocultas, emails, flags de administración ni datos de
otros usuarios. Debe funcionar únicamente para participantes y administradores que
ya tengan autorización explícita.

CAMBIOS DE DATOS POSIBLES

Si los sistemas existentes no conservan snapshots suficientes, agregar una tabla
postgame_events o result_rewards con:

- game_id y profile_id como clave única.
- coins_before/delta/after.
- medallas_nuevas como dato auditable o relación normalizada.
- objective_changes y season_change solo como snapshot de presentación, sin ser la
  fuente de verdad principal.
- created_at.

La escritura ocurre dentro o inmediatamente después de finish_game con idempotencia.
Nunca confiar en valores enviados por GameClient.

COMPORTAMIENTO SEGÚN MODO

PvP competitivo:
- Resultado, marcador, monedas, temporada, objetivos, H2H, revancha, amigo, compartir.

PvP amistoso o privado:
- Resultado, marcador, monedas si aplican, objetivos permitidos, H2H, revancha,
  amigo, compartir. Explicar que no cambia temporada.

Bot del lobby:
- Resultado, marcador, monedas y objetivos permitidos. Sin H2H social ni agregar
  amigo. Revancha según soporte real.

Modo Historia:
- Resultado, marcador, recompensa, puntos de campaña, desbloqueos, objetivos y
  acciones de campaña. Sin monedas estimadas ni ranking online.

Invitado:
- Resultado y acciones válidas.
- Después de la acción principal, ofrecer guardar el progreso creando cuenta si el
  sistema realmente puede conservar o transferir ese progreso.
- No prometer conservación si no está implementada.

ESTADOS DE ERROR

- Resumen cargando: estructura estable o skeleton que no tape acciones.
- Error parcial: mostrar resultado y acciones aunque falle un bloque secundario.
- Error de revancha: mensaje junto al botón y opción de lobby disponible.
- Rival desconectado: estado explícito.
- Resumen no autorizado: volver al lobby, sin filtrar datos.
- Partida aún no finalizada: mantener pantalla de juego o refrescar estado.

ACCESIBILIDAD Y UX

- Llevar el foco al título de resultado cuando aparece el cierre.
- El orden de lectura coincide con la jerarquía visual.
- “Ganaste” o “Perdiste” aparece como texto, no solo por color o sonido.
- Botones con foco visible y área táctil mínima de 44x44 px.
- Los cambios de revancha se anuncian mediante una sola región role=status con frase
  completa: “Nico pidió revancha, falta tu confirmación”.
- Las animaciones no mueven los botones mientras se intenta tocarlos.
- Con prefers-reduced-motion se eliminan conteos y entradas largas.
- El cierre cabe y permite scroll sin quedar escondido detrás de zonas seguras.
- Una derrota no usa mensajes humillantes ni presión para recuperar monedas.

ANALÍTICA

- postgame_viewed.
- rematch_requested.
- rematch_accepted o rematch_started.
- postgame_lobby_clicked.
- postgame_friend_request_sent.
- result_shared.
- review_prompt_viewed y review_started, conservando medición existente si la hay.

Propiedades permitidas: modo, resultado, partida competitiva sí/no, delta de división
en categoría y tipo de CTA. No incluir nombre rival, texto compartido ni saldo.

MÉTRICAS DE ÉXITO

- Tasa de revancha iniciada.
- Porcentaje que agrega al rival como amigo.
- Porcentaje que comparte.
- Tiempo hasta elegir la siguiente acción.
- Salidas o cierres sin acción.
- Error de carga del resumen.
- Conversión de invitado a cuenta, si existe transferencia real.

PRUEBAS OBLIGATORIAS

Servidor:
- Solo participantes acceden al resumen.
- Recargar devuelve los mismos deltas.
- Ninguna carta oculta se filtra.
- Los cambios de monedas coinciden con registros reales.
- Revancha simultánea no crea dos partidas.
- H2H excluye bots y campaña.
- Cada modo devuelve únicamente bloques aplicables.

Interfaz:
- Victoria, derrota y estado anulado.
- PvP, bot, campaña, privado e invitado.
- Con y sin objetivo, temporada, medalla o amigo.
- Rival pide revancha primero; usuario pide primero; rival se va.
- Error parcial sin perder acciones.
- Compartir nativo y respaldo de copiar.
- Teclado, lector de pantalla, movimiento reducido.
- 320, 375, 414, 768, 1024 y 1440 px.

ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. Inventariar todos los datos que finish_game ya guarda.
2. Definir contrato get_postgame_summary.
3. Agregar snapshots faltantes mediante migración nueva.
4. Crear pruebas de autorización e idempotencia.
5. Separar el cierre actual en componentes pequeños por bloque.
6. Implementar jerarquía y acciones de PvP.
7. Implementar variante de campaña.
8. Integrar objetivos y temporada de forma opcional.
9. Agregar H2H, amistad y compartir.
10. Agregar analítica y verificar flujo completo.

CRITERIOS DE ACEPTACIÓN

- El resultado y marcador se entienden en menos de dos segundos.
- Monedas y progresos coinciden con el servidor aun después de recargar.
- Revancha sigue funcionando y no bloquea volver al lobby.
- El cierre se adapta correctamente a cada modo.
- No aparecen bloques vacíos ni datos que no correspondan.
- El jugador puede agregar al rival o compartir sin exponer datos privados.
- La interfaz es accesible y no desplaza botones durante animaciones.
- No se añadió ninguna sección de jugada o momento destacado.

DEFINICIÓN DE TERMINADO

Debe verificarse manualmente un final de cada modo, una revancha completa entre dos
sesiones, una recarga del resumen y un error parcial. También deben pasar build,
pruebas de seguridad y pruebas responsive antes de considerar terminado.
```

</details>

<a id="plan-rivalidades"></a>

### Plan 4: rivalidades y desafíos

Especificación pendiente.

Procedencia anterior: `docs/planes-retencion/04-rivalidades-y-desafios.txt`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan 4: rivalidades y desafíos</summary>

```text
TRUCAZO — PLAN 4: RIVALIDADES Y DESAFÍOS DIRECTOS
==================================================

ESTADO
Documento de especificación. Todavía no implementado.

PROPÓSITO DE ESTE ARCHIVO
Definir una primera versión completa para que dos personas puedan desafiarse,
repetir series y construir un historial cara a cara, aprovechando amigos,
invitaciones, mesas privadas y Realtime ya existentes.

OBJETIVO DE PRODUCTO
Convertir partidas aisladas en relaciones recurrentes. El principal motivo para
volver debe ser una persona concreta: un amigo que desafía, una serie pendiente o
un rival que quedó arriba en el historial.

ALCANCE CERRADO DE LA PRIMERA VERSIÓN

1. Desafiar directamente a un amigo conectado o desconectado.
2. Aceptar o rechazar desde lobby y Comunidad.
3. Enlace de desafío compartible por WhatsApp u otra aplicación.
4. Desafío simple o serie al mejor de tres.
5. Historial cara a cara entre humanos registrados.
6. Estado de serie persistente entre partidas.
7. Notificaciones internas; correo únicamente con consentimiento y límites.
8. Acciones integradas en Amigos, perfil y postpartido.

FUERA DE ALCANCE

- Chat de voz.
- Dinero real o premios transferibles.
- Desafíos a desconocidos mediante spam masivo.
- Torneos con cuadro.
- 2x2 y 3x3.
- Calendario para programar fecha y hora.
- Mensajes personalizados libres dentro de una invitación.
- Notificaciones push en la primera versión.

TIPOS DE DESAFÍO

Partida única:
- A 15 o 30 puntos.
- Sin impacto en la temporada competitiva.
- Apuesta elegida dentro de límites válidos o modo sin apuesta si el backend lo
  soporta explícitamente.

Mejor de tres:
- Gana quien consigue dos victorias.
- Cada partida usa el mismo puntaje objetivo y condiciones.
- Mostrar marcador de serie 0–0, 1–0, 1–1 o 2–x.
- Permitir abandonar la serie; queda registrada como incompleta, no fabricar una
  victoria salvo que exista una regla de forfeit clara y aceptada antes de empezar.

FLUJO DESDE UN AMIGO

1. Tocar “Desafiar”.
2. Elegir partida única o mejor de tres.
3. Elegir 15/30 y apuesta permitida.
4. Confirmar resumen del desafío.
5. El servidor crea una invitación con expiración.
6. El receptor ve una insignia y una tarjeta: quién, formato, puntos, apuesta y
   tiempo restante.
7. Aceptar crea o reserva la mesa de forma atómica y lleva a ambos a la espera.
8. Rechazar cierra la invitación y confirma al emisor sin humillar ni insistir.

FLUJO MEDIANTE ENLACE

- Crear un token aleatorio largo, opaco y de un solo uso.
- Ruta pública sugerida: /desafio/[token].
- La página muestra condiciones y nombre público del creador.
- Si no inició sesión, permitir entrar y luego regresar al desafío.
- Si el enlace venció o fue usado, ofrecer crear otro o ir al lobby.
- Aceptar consume el token de forma atómica.
- No poner códigos privados, ids de usuario ni condiciones sensibles en la URL.
- El enlace debe expirar, por ejemplo en 24 horas.

ENLACE PARA WHATSAPP

- Usar Web Share API en móvil.
- Respaldo de copiar enlace.
- Texto sugerido, no editable en esta versión:
  “Te desafío a una partida a 30 en Trucazo. ¿Te animás?”
- No integrar una API de WhatsApp ni pedir permisos innecesarios.

INVITACIONES Y PRIORIDAD

- Máximo de invitaciones activas por emisor y receptor.
- Una persona puede silenciar desafíos de alguien sin eliminarlo como amigo.
- No permitir invitar repetidamente después de varios rechazos en pocos minutos.
- Si el receptor ya juega, mostrar “Jugando” y permitir dejar la invitación pendiente
  hasta su expiración, sin interrumpir la partida.
- Si ambos aceptan acciones simultáneas, solo una mesa debe crearse.

HISTORIAL CARA A CARA

Mostrar para dos humanos registrados:
- Partidas terminadas entre ambos.
- Victorias propias y del rival.
- Series ganadas por cada uno.
- Última vez que jugaron.
- Últimos cinco resultados con fecha y marcador.

No mostrar:
- Saldos históricos.
- Partidas contra bots o campaña.
- Partidas privadas ajenas.
- Datos que permitan reconstruir cartas.

El historial se abre desde:
- Perfil o tarjeta del amigo.
- Cierre postpartido.
- Pantalla de una serie.

SERIE AL MEJOR DE TRES

- Crear una entidad de serie independiente de game.
- Cada game guarda series_id y número de juego.
- Al terminar una partida, el servidor actualiza el marcador una sola vez.
- Si nadie ganó dos, el CTA principal ofrece “Siguiente partida”.
- La siguiente partida conserva condiciones y alterna mano según la regla elegida.
- Al completar la serie, mostrar ganador, marcador total y H2H actualizado.
- Una revancha posterior crea una serie nueva; no reabre la finalizada.

MODELO DE DATOS SUGERIDO

direct_challenges
- id.
- sender_id y recipient_id opcional para enlace abierto.
- share_token_hash; nunca guardar el token plano si puede evitarse.
- format: single o best_of_three.
- target_score, time_limit y bet.
- status: pending, accepted, declined, expired, cancelled.
- created_at, expires_at y responded_at.
- accepted_by para enlaces.
- table_id o series_id resultante.

match_series
- id.
- player1_id y player2_id.
- best_of = 3.
- target_score, time_limit y bet.
- wins_p1, wins_p2.
- status: active, completed, abandoned.
- winner_id.
- created_at y completed_at.

games
- Agregar series_id y series_game_number si todavía no existen.
- Restricción única razonable para evitar dos juegos con el mismo número.

challenge_preferences
- profile_id.
- allow_friend_challenges.
- allow_email_challenges.
- muted_profile_ids en relación normalizada si se implementa silencio individual.

Para H2H, preferir una RPC que agregue game_history o games válidos. Crear tabla de
resumen solo si el volumen real lo justifica.

LÓGICA DE SERVIDOR

RPC sugeridas:
- create_direct_challenge(...).
- accept_direct_challenge(challenge_id o token).
- decline_direct_challenge(challenge_id).
- cancel_direct_challenge(challenge_id).
- get_my_active_challenges().
- get_head_to_head(other_profile_id).
- start_next_series_game(series_id).

Reglas:
- Validar amistad para desafíos dirigidos.
- Para enlace, validar token, expiración y que quien acepta no sea el creador.
- Validar saldo de ambos en el momento de aceptar, no solo al crear.
- Crear mesa/serie y consumir invitación en una transacción.
- Bloquear filas para aceptación simultánea.
- El cliente no elige sender_id ni recipient_id arbitrarios.
- search_path fijo, RLS estricta y sin escrituras directas.
- Actualizar schema y usar migración nueva.

REALTIME Y NOTIFICACIONES INTERNAS

- Suscribirse a cambios de invitaciones del usuario.
- Mostrar una única insignia con cantidad contextual.
- Lectores de pantalla reciben “Tenés 2 desafíos pendientes”, no un “2” aislado.
- Al aceptar, el emisor recibe estado y navegación disponible.
- No navegar forzosamente a quien está jugando o completando otro formulario.

EMAIL OPCIONAL

Solo si el sistema de preferencias existente permite consentimiento claro:
- Enviar únicamente cuando el receptor está desconectado.
- Máximo un correo de desafío por período definido.
- Incluir quién desafía, condiciones y enlace seguro.
- No enviar recordatorios repetidos.
- Respetar baja y preferencias de email existentes.
- Registrar delivery sin exponer tokens en logs.

UBICACIONES EN LA INTERFAZ

Amigos:
- Botón “Desafiar” junto a cada amigo.
- Estado conectado/jugando ya existente orienta disponibilidad.

Lobby:
- Tarjeta de desafío entrante sobre las mesas.
- No abrir modal automáticamente mientras el usuario hace otra acción.

Comunidad:
- Pestaña o bloque “Desafíos” dentro de Amigos, sin agregar una séptima opción a la
  navegación móvil.

Postpartido:
- H2H y CTA de nueva serie o desafío.

Página compartida:
- Condiciones, expiración, CTA de aceptar e información de seguridad.

ACCESIBILIDAD Y UX

- Formularios con etiquetas visibles; no depender de placeholders.
- Errores junto al campo y resumen enfocable si hay varios.
- Modales devuelven foco al botón que los abrió.
- Escape cierra solo cuando no se pierde una operación confirmada.
- Botones mínimo 44x44 px y foco visible.
- Estados pendiente, aceptado, vencido y rechazado no dependen solo del color.
- Confirmación clara después de enviar, copiar, aceptar, rechazar o cancelar.
- No usar cuenta regresiva que cambie cada segundo; texto estable por minutos/horas.

ANALÍTICA

- challenge_creation_opened.
- challenge_created.
- challenge_shared.
- challenge_accepted.
- challenge_declined.
- challenge_expired.
- challenge_game_started.
- challenge_game_completed.
- series_started.
- series_completed.
- head_to_head_viewed.

Métricas:
- Invitaciones aceptadas.
- Tiempo hasta aceptar.
- Partidas terminadas desde invitación.
- Series completadas.
- Repetición entre las mismas personas en 7 y 30 días.
- Bloqueos, silencios o rechazos repetidos como señal de abuso.

SEGURIDAD Y MODERACIÓN

- Tokens de alta entropía, expirables y de un solo uso.
- Rate limit por cuenta y destino.
- No aceptar desafío propio.
- No revelar si un nombre o email específico existe mediante rutas públicas.
- No permitir texto libre en invitaciones en v1.
- Respetar bloqueos o silencios antes de mostrar presencia y enviar invitación.
- Auditar creación, respuesta y mesa resultante.

PRUEBAS OBLIGATORIAS

Servidor:
- Crear, aceptar, rechazar, cancelar y vencer.
- Dos aceptaciones simultáneas crean una sola mesa.
- Saldo insuficiente al aceptar.
- Token inválido, vencido, usado y propio.
- Usuario ajeno no lee ni modifica invitación.
- Serie actualiza una vez por partida y termina al 2.
- Bot y campaña no aparecen en H2H.
- Reintentos de red son idempotentes.

Interfaz:
- Receptor conectado, desconectado y jugando.
- Enlace con y sin sesión.
- Copiar y Web Share.
- Amigo, solicitud pendiente, silenciado y no amigo.
- Serie 0–0, 1–0, 1–1 y terminada.
- Teclado, lector de pantalla y móvil pequeño.
- Insignia actualizada sin mover el foco.

ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. Inventariar invitaciones y mesas privadas actuales para reutilizar lo seguro.
2. Definir estados y expiración.
3. Crear migración, RLS y RPC de desafío simple.
4. Probar aceptación simultánea y saldo.
5. Integrar Amigos, lobby y Realtime.
6. Crear ruta compartible y Web Share.
7. Agregar H2H.
8. Agregar entidad y flujo mejor de tres.
9. Integrar postpartido y analítica.
10. Ejecutar build, pruebas y flujo con dos sesiones reales.

CRITERIOS DE ACEPTACIÓN

- Un amigo puede desafiar a otro en pocos pasos.
- Un enlace funciona para una persona que todavía no inició sesión.
- Aceptar nunca crea mesas duplicadas ni cobra dos veces.
- Una serie persiste entre recargas y termina correctamente al mejor de tres.
- H2H coincide con partidas humanas terminadas.
- Los desafíos no alteran la temporada competitiva.
- Hay límites contra spam y preferencias de recepción.
- La navegación móvil no incorpora más destinos principales.

DEFINICIÓN DE TERMINADO

Verificar con dos navegadores o sesiones: desafío dirigido, rechazo, aceptación,
partida terminada, serie completa, enlace compartido, recarga y expiración. Deben
pasar build, pruebas SQL de seguridad e idempotencia y prueba responsive.
```

</details>

<a id="plan-grupos"></a>

### Plan 5: grupos

Especificación pendiente.

Procedencia anterior: `docs/planes-retencion/05-grupos-con-utilidad-real.txt`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Plan 5: grupos</summary>

```text
TRUCAZO — PLAN 5: GRUPOS CON UTILIDAD REAL
==========================================

ESTADO
Documento de especificación. Todavía no implementado.

PROPÓSITO DE ESTE ARCHIVO
Convertir los grupos actuales —nombre, descripción, integrantes e invitaciones— en
una razón concreta para jugar juntos, sin esperar a que exista 2x2 o 3x3.

OBJETIVO DE PRODUCTO
Crear compromiso social semanal. Cada integrante debe entender qué está intentando
lograr el grupo, cuánto aportó personalmente y qué reconocimiento obtiene la
comunidad cuando completa el objetivo.

ALCANCE CERRADO DE LA PRIMERA VERSIÓN

1. Perfil visual del grupo con escudo, nivel y experiencia.
2. Una misión cooperativa semanal por grupo.
3. Contribución individual visible.
4. Ranking interno semanal y total.
5. Ranking público de grupos.
6. Recompensa cosmética o monedas moderadas para miembros elegibles.
7. Actividad reciente basada en eventos del juego, no chat libre adicional.
8. Administración básica y segura del grupo actual.

FUERA DE ALCANCE

- 2x2 y 3x3.
- Torneos entre grupos.
- Guerras de clanes.
- Chat privado nuevo; se mantiene el chat global existente.
- Donación o transferencia de monedas.
- Tienda grupal.
- Escudos creados subiendo imágenes.
- Roles complejos aparte de líder e integrante.
- Premios con valor real.

DECISIÓN DE NOMENCLATURA

Mantener “Grupo” en toda la primera versión. No alternar entre grupo, clan, club y
equipo. Más adelante se podrá renombrar con datos de usuarios.

EXPERIENCIA SIN GRUPO

La pantalla actual permite crear o aceptar invitaciones. Mejorarla mostrando:

- Beneficio concreto: “Completá objetivos semanales con amigos y aparezcan juntos en
  el ranking”.
- Vista previa de una misión grupal real.
- CTA “Crear grupo”.
- Invitaciones pendientes por encima del formulario.
- Enlace para explorar ranking de grupos sin necesidad de crear uno.

No prometer 2x2 o 3x3 dentro de la interfaz hasta que tenga fecha o esté disponible.

PERFIL DEL GRUPO

Encabezado:
- Escudo generado con formas y colores predefinidos.
- Nombre y descripción.
- Nivel y barra de experiencia.
- Cantidad de integrantes.
- Puesto semanal si corresponde.

Contenido:
- Misión semanal.
- Contribuciones.
- Ranking interno.
- Actividad reciente.
- Integrantes y administración.

En móvil debe resolverse dentro de Comunidad, sin sumar un nuevo ítem a la barra
inferior.

ESCUDO Y PERSONALIZACIÓN

Primera versión segura:
- Elegir una forma entre un catálogo pequeño.
- Elegir color principal y secundario desde paleta aprobada.
- Elegir un símbolo vectorial del catálogo.
- El líder puede cambiarlo con un período de espera, por ejemplo una vez por semana.
- No admitir uploads para evitar moderación de imágenes.
- No usar emojis como iconos estructurales; usar SVG consistentes.
- Validar combinaciones de contraste para que el símbolo se distinga.

NIVEL Y EXPERIENCIA DEL GRUPO

El grupo gana experiencia por acciones válidas de integrantes:
- Terminar una partida: contribución pequeña.
- Ganar una partida pública contra persona: contribución mayor.
- Primera victoria contra un rival de Historia: contribución moderada.
- Completar la misión semanal: bonus grupal.

No cuentan:
- Partidas manipuladas o no terminadas.
- Repeticiones infinitas contra el mismo bot.
- Acciones administrativas o mensajes.
- Monedas gastadas.

El nivel es reconocimiento visual. No debe dar ventaja competitiva. Desbloqueos
posibles: colores de escudo, símbolos, marcos grupales o títulos.

MISIÓN COOPERATIVA SEMANAL

Cada grupo recibe una misión al comenzar su semana o al entrar por primera vez:

Ejemplos iniciales:
- Entre todos, terminen 25 partidas.
- Entre todos, ganen 12 partidas válidas.
- Que 4 integrantes distintos terminen al menos una partida.
- Venzan por primera vez a 5 rivales de Historia entre todos.

Reglas:
- Usar fecha argentina.
- La misión queda congelada durante la semana.
- Mostrar progreso total y contribución de cada miembro.
- Evitar objetivos imposibles para grupos pequeños: escalar meta por cantidad de
  miembros activos al asignarla o usar bandas 1–3, 4–8, 9–20.
- Nunca reducir progreso si alguien abandona el grupo.
- Un nuevo integrante empieza a contribuir al unirse, sin apropiarse de recompensas
  anteriores automáticamente.

ELEGIBILIDAD PARA RECOMPENSA

Para cobrar la recompensa semanal, un integrante debe:
- Haber pertenecido al grupo antes de completarse la misión.
- Haber realizado al menos una contribución válida esa semana.
- Seguir en el grupo al momento de reclamar, salvo decisión futura distinta.

La recompensa se entrega individualmente mediante una operación idempotente. No
depositar un fondo común transferible. Mostrar por adelantado los requisitos.

Recompensa inicial sugerida:
- 75 monedas por integrante elegible.
- Experiencia grupal.
- Hito visual por cantidad de semanas completadas.

Revisar economía antes de desplegar junto con el Plan 1 para evitar duplicar una
cantidad excesiva de monedas semanales.

RANKING INTERNO

Dos vistas:

Semana:
- Contribución a la misión actual.
- Partidas válidas.
- Victorias válidas.

Total:
- Experiencia aportada históricamente desde la implementación.
- Semanas en el grupo.
- Sin convertir al líder automáticamente en primer puesto.

El ranking es reconocimiento. No restar puntos por derrotas ni fomentar expulsar a
quien juega peor.

RANKING DE GRUPOS

Orden principal sugerido:
- Experiencia ganada durante la semana.
- Desempate por cantidad de integrantes activos, favoreciendo al grupo con menos
  integrantes para no premiar solo tamaño.

Mostrar:
- Puesto.
- Escudo y nombre.
- Nivel.
- Experiencia semanal.
- Integrantes activos.
- Fila del grupo propio aunque quede fuera del top.

No exponer lista completa de integrantes desde un ranking público si no es necesario.

ACTIVIDAD RECIENTE

Eventos automáticos, no texto libre:
- “Ana ganó una partida competitiva”.
- “El grupo alcanzó el nivel 4”.
- “Marcos aportó el punto final de la misión semanal”.
- “Se unió Lucía”.

Límites:
- Mostrar los últimos 20 eventos.
- No incluir saldos, apuestas exactas ni ids.
- Agrupar eventos repetidos para evitar ruido.
- Permitir que el usuario entienda cuándo ocurrió con fecha relativa y fecha completa
  accesible.

ADMINISTRACIÓN

Conservar:
- Invitar amigos.
- Expulsar como líder.
- Salir.
- Transferencia automática de liderazgo existente.
- Eliminar grupo cuando corresponda.

Agregar:
- Cambiar descripción y escudo.
- Silenciar avisos internos del grupo.
- Confirmación específica antes de expulsar o eliminar.
- Explicar qué pasa con progreso y recompensas antes de salir.

No agregar permisos múltiples en v1.

MODELO DE DATOS SUGERIDO

groups, columnas nuevas posibles:
- shield_shape, shield_symbol, primary_color y secondary_color.
- level y experience_total.
- shield_updated_at.

group_weekly_challenges
- id, group_id y week_start.
- type, target y reward snapshot.
- progress.
- completed_at.
- clave única por grupo y semana.

group_member_weekly_contributions
- challenge_id y profile_id.
- progress.
- games_completed y wins.
- first_contribution_at y last_contribution_at.
- reward_claimed_at.
- clave única por desafío e integrante.

group_experience_events
- id, group_id, profile_id opcional y game_id opcional.
- event_type y amount.
- created_at.
- clave idempotente para eventos derivados de partida.

group_activity_events
- id, group_id, actor_id opcional.
- tipo y metadatos mínimos de presentación.
- created_at.

Evitar JSON sin control para datos sensibles. Si se usan metadatos, permitir solo
campos predefinidos y construir el texto en la aplicación.

LÓGICA DE SERVIDOR

- Actualizar progreso desde el cierre autorizado de una partida.
- Confirmar que el jugador pertenecía al grupo al ocurrir el evento.
- Insertar evento idempotente por game_id, profile_id y tipo.
- Actualizar contribución, progreso grupal y experiencia en transacción.
- Crear desafío semanal perezosamente para no depender de cron.
- Congelar tamaño/banda usada para calcular meta al crear el desafío.
- RPC get_my_group_dashboard().
- RPC claim_group_weekly_reward(challenge_id).
- RPC get_group_leaderboard(week_start, page).
- RPC update_group_identity(...) solo para líder.
- Revisar y endurecer RPC existentes de crear, invitar, expulsar, salir y eliminar.
- search_path fijo, RLS y sin escrituras directas.
- Agregar migración nueva y actualizar schema.

REGLAS AL CAMBIAR DE GRUPO

- Un jugador solo pertenece a un grupo, como ahora.
- La contribución histórica queda asociada al grupo original.
- No puede cobrar una recompensa completada antes de unirse.
- Si sale antes de reclamar, la primera versión pierde elegibilidad; esto debe estar
  explicado antes de confirmar salida.
- Establecer un período corto antes de contribuir a un segundo grupo en la misma
  semana para evitar rotación oportunista.
- No impedir indefinidamente jugar ni unirse; el límite afecta recompensas, no acceso.

ACCESIBILIDAD Y UX

- Progreso con texto y números además de color.
- Cambios asíncronos anunciados como frases completas.
- Escudos tienen nombre accesible o son decorativos junto al nombre visible.
- Botones mínimo 44x44 px, foco visible y confirmación de acciones destructivas.
- Modales mantienen y devuelven foco.
- Ranking móvil usa filas/tarjetas sin scroll horizontal.
- Actividad no se actualiza de forma que desplace el foco o la lectura.
- Estados vacíos indican una acción posible.
- No sobrecargar la barra móvil; todo vive dentro de Comunidad.

ANALÍTICA

- group_created.
- group_joined.
- group_dashboard_viewed.
- group_challenge_progressed.
- group_challenge_completed.
- group_reward_claimed.
- group_leaderboard_viewed.
- group_identity_updated.
- group_left.

Métricas:
- Porcentaje de grupos con dos o más integrantes activos.
- Grupos que completan misión semanal.
- Integrantes distintos que contribuyen.
- Retorno semanal de miembros frente a jugadores sin grupo.
- Concentración de aporte en una sola persona.
- Creaciones, abandonos y expulsiones.
- Inflación de monedas por recompensas.

SEGURIDAD Y ABUSO

- No confiar en progreso enviado por cliente.
- RLS: solo miembros ven panel y contribución detallada.
- Ranking público recibe campos mínimos mediante RPC.
- Rate limit en invitaciones y cambios de identidad.
- Paleta y símbolos provienen de allowlist.
- Validar y moderar nombre/descripción como ya corresponda.
- Recompensa idempotente y bloqueada por fila.
- Evitar doble aporte al reintentar finish_game.
- Registrar administración material: expulsión, liderazgo y eliminación.

PRUEBAS OBLIGATORIAS

Servidor:
- Grupo pequeño y grande reciben metas correctas.
- Una partida avanza una sola vez.
- No miembro no ve panel privado.
- Miembro nuevo no cobra progreso previo.
- Salida antes de reclamar aplica la regla visible.
- Reclamos simultáneos no duplican monedas.
- Cambio de semana argentina crea un único desafío.
- Empate del ranking usa el desempate definido.
- Cambio de líder y eliminación no dejan datos inconsistentes.

Interfaz:
- Sin grupo, con invitación y con grupo.
- Grupo de 1, 2 y 20 integrantes.
- Misión en progreso, completada y reclamada.
- Usuario elegible y no elegible con explicación.
- Ranking propio dentro y fuera del top.
- Actividad vacía y con eventos agrupados.
- Editor de escudo con teclado y lector de pantalla.
- 320 a 1440 px y movimiento reducido.

ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. Auditar grupos y RPC actuales sin reescribir lo que funciona.
2. Definir experiencia, metas por tamaño y economía.
3. Crear migración, RLS y funciones idempotentes.
4. Agregar pruebas SQL.
5. Integrar contribuciones con finish_game.
6. Construir panel de grupo y misión semanal.
7. Agregar ranking interno y público.
8. Agregar escudo y actividad automática.
9. Integrar analítica.
10. Probar semana simulada, cambio de grupo y reclamos.
11. Dar al dueño instrucciones exactas de despliegue en Supabase.

CRITERIOS DE ACEPTACIÓN

- Cada grupo recibe una misión semanal alcanzable según tamaño.
- Todos ven progreso total y aporte individual correcto.
- Solo integrantes elegibles cobran una vez.
- El nivel y escudo no dan ventajas de juego.
- Ranking interno y público tienen reglas entendibles.
- La actividad refleja eventos reales sin exponer datos sensibles.
- Salir, expulsar y cambiar liderazgo conservan integridad.
- La función vive dentro de Comunidad y no sobrecarga navegación.
- No se promete ni depende de 2x2 o 3x3.

DEFINICIÓN DE TERMINADO

Probar con al menos tres perfiles: crear grupo, invitar, contribuir, completar, cobrar,
salir y cambiar liderazgo. Simular cambio semanal y doble reclamo. Deben pasar build,
pruebas SQL de seguridad, prueba responsive y verificación manual completa.
```

</details>


