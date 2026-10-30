# Juego — Historia, mano a mano, parejas, bots y torneos

[Volver al README](../README.md) · Documento principal de reglas y modalidades. Organización actualizada el **13/10/2026**; los estados siguientes proceden de las entregas registradas, sin una nueva comprobación de producción.

## Estado actual

- Truco argentino a 15 o 30 puntos, sin flor y con monedas ficticias. Las reglas online y los premios oficiales los decide el servidor; las manos rivales nunca se envían al cliente.
- Historia: catálogo de **15 provincias y 66 rivales**. La app instalada y su funcionamiento sin internet se siguen en [Android](android.md).
- Parejas: lanzamiento registrado el **14/09/2026**. La entrega final prevalece sobre la auditoría anterior.
- Torneos: cinco etapas finalizadas y lanzamiento registrado el **27/09/2026**, contrato actualizado al **07/10/2026**. Los estados de PR anteriores son historial.
- Chat escrito en mesas normales y torneos; Historia tiene frases rápidas. Los bots no escriben en el chat libre.
- Correcciones de ranking/presencia y recuperación de partidas incorporadas; queda la comprobación manual de los flujos reales descrita en [Operación](operacion.md#correcciones-resenas-2026-10-14). No son implementaciones pendientes.
- GitHub integrado localmente hasta `38002ae` el 21/10, conservando Android: [invitaciones por enlace](#invitacion-por-enlace), [Chat y Amigos](#accesos-chat-amigos), [globos de chat](#globos-chat-escrito), [rendimiento](#rendimiento-del-lobby-y-la-mesa) y [vidas de Historia](#vidas-de-historia). Las vidas siguen sujetas a la configuración del servidor, sin activarlas en esta sincronización. Evidencia local en [Android](android.md#android-sync-github-2026-10-21).
- **Envido, 23/10: cerrado por el dueño.** [PR #143](https://github.com/santibpapa/trucazo/pull/143) integrado y SQL ejecutado, según su confirmación. Evidencia y cierre en [Mostrar el tanto al cerrar](#envido-reveal-cierres-2026-10-23).

## Próximo paso y cómo retomar

El incidente del envido del 23/10 está cerrado: el dueño confirmó la integración del PR y la ejecución del SQL. No repetir la migración como un pendiente de este registro.

Para integrar estas modalidades en la app, seguir el [estado y plan vigentes de Android](android.md#android-estado-actual). Si se trabaja sobre una modalidad existente, leer su entrega final y comprobar el código/SQL correspondiente antes de modificar reglas o repetir migraciones. Para los incidentes, seguir el [estado posterior a las correcciones](operacion.md#correcciones-resenas-2026-10-14).

## Guía de lectura

- [Historia y ruta del Noroeste](#historia).
- [Entrega vigente de parejas](#parejas-entrega), [comportamiento de los bots](#parejas-bots) y [auditoría histórica](#parejas-auditoria).
- [Contrato, arquitectura y entregas de torneos](#contrato-torneos).
- [Chat en partidas](#chat-partidas).
- Para SQL, seguridad y pruebas: [Backend](backend.md). Para mesa, cartas y pantallas: [Diseño](diseno.md).

Actualizar aquí cambios y pruebas de reglas/modalidades. Las rutas de código parten de la raíz del repositorio. Los registros fechados conservan sus límites originales; un pendiente resuelto por una entrega posterior no vuelve a abrirse.

<a id="envido-reveal-cierres-2026-10-23"></a>

## Mostrar el tanto al cerrar — 23/10/2026

**Estado: cerrado por el dueño el 23/10/2026.** Confirmó que integró el [PR #143](https://github.com/santibpapa/trucazo/pull/143), ejecutó el SQL y dio el incidente por cerrado. Incidente original: en su partida `SantiBP` contra `Invitado7093`, un envido de 25 quedó sin prueba tras rechazar el truco y una falta envido de 32 terminó la partida sin mostrar cartas.

Consulta de producción de sólo lectura: partida `0e530984-1f52-4864-9745-4935abb401d3`, creada el 23/10 a las 16:04 de Argentina y terminada a las 16:05, resultado 30–0 en dos manos. La última cadena fue real/falta, valor 27, ganador con 32 y `envido_reveal=null`. Se comprobó el tanto real: **7 y 5 de basto**; el ayudante existente podía devolver esas cartas, pero el cierre no guardaba la prueba. La primera mano ya había sido reemplazada al repartir la segunda; su secuencia se reprodujo con una prueba aislada, sin atribuirle cartas históricas que ya no están guardadas.

**Causa y solución preparada:**

- `respond_truco` omitía preparar la prueba del envido al responder «no quiero». Ahora guarda las cartas necesarias del ganador del envido, aunque haya ganado el truco otra persona.
- `finish_game` omitía preparar la prueba al alcanzar los puntos finales. Ahora la conserva en partidas normales e Historia online, sólo si hubo un tanto declarado. Puntajes, premios y permisos conservan su comportamiento.
- El cierre por cartas guarda la última jugada antes de calcular la prueba, para contar también una carta del tanto que acaba de jugarse y no duplicarla.
- `GameClient` muestra la prueba también con la partida terminada, aunque no se esté esperando otra mano. Deja 2,6 segundos antes del resultado cuando hay cartas para mostrar; las respuestas repetidas del servidor no reinician esa espera. El anuncio breve «32 en mesa» también admite ese cierre, tiene prioridad sobre el truco y deja las cartas descubiertas. `GameTable` indica el cierre y retira los controles de jugada durante esa pausa.
- El motor `offline_replay_v1` y las reglas descargadas de Historia permanecen congelados; esta entrega corrige el flujo online.

**Archivos de la preparación inicial local (historial):** migración nueva `supabase/migrations/20261023191310_envido_reveal_cierres.sql`, foto actualizada `supabase/schema/functions.sql`, `src/app/game/[id]/GameClient.tsx`, `src/components/game/GameTable.tsx` y `src/components/game/useGameAnnouncements.ts`. La entrega final se adaptó al repositorio remoto y sólo contiene los siete archivos del PR indicados al cierre.

**Verificación inicial local:**

- `node --import tsx scripts/check-envido-reveal.ts`: 24 cierres con funciones SQL reales en PostgreSQL aislado. Incluye ambos jugadores como mano/pie y ganador, objetivos 15/30, truco no querido, real/falta final, mazo declarando, cierre por cartas e Historia online. Sólo se revelan las cartas necesarias; no se duplican cartas jugadas ni se expone un tanto sin declarar o un envido no querido. Se ejecuta la migración nueva dos veces y se comprueba que conserva permisos y coincide con la foto SQL.
- `node scripts/check-envido-reveal-browser.mjs`, usando `ENVIDO_BROWSER_CHANNEL=msedge` en esta computadora: respuestas generadas por esa misma base aislada → componente real → cartas visibles en 360×640 y 1440×900. Prueba el botón «No quiero», el final por falta, la espera de 2,6 segundos y un mensaje repetido del servidor; mesa sin scroll. Capturas locales en `.task-work/envido-reveal-output/`.
- `node --test scripts/check-envido-recovery.mjs`: 13 pruebas aprobadas. TypeScript sin errores; lint sin errores, con seis avisos anteriores de dependencias de efectos en `GameClient`.
- `node --import tsx scripts/check-offline-sync.ts`: 66 rivales, 18 adulteraciones rechazadas, reintentos, reconciliación y mezcla de partidas online/offline aprobados. Las partidas descargadas conservan su motor original.
- `node scripts/check-match-chat-browser.mjs` con Edge: controles y chat de 1v1/parejas comprobados en cuatro tamaños, desde 320×640 hasta 1440×900; Historia conserva sus frases rápidas. Revisión React completada sin nuevas dependencias ni reglas de juego en el cliente.

**Aplicación completada:** el dueño confirmó la integración del PR y la ejecución de `20261023191310_envido_reveal_cierres.sql`. La migración aplicada es la del PR, que conserva otras variantes existentes de `finish_game`. No queda pendiente repetir SQL ni publicar esta corrección en este registro.

Último traspaso: [PR #143](https://github.com/santibpapa/trucazo/pull/143) integrado y SQL aplicado por el dueño; incidente cerrado por su confirmación del 23/10. Se preparó desde GitHub `master` `0ed1b69`, en una copia aislada, commit `2501e1b`. La pantalla y las pruebas se adaptaron a la versión web de GitHub (Next.js 14.2.35), sin trasladar componentes, dependencias, documentación ni commits locales de Android. GitHub confirmó siete archivos y un único commit sobre esa base: cliente web, foto SQL, migración, prueba SQL, prueba de navegador, CI y documentación de Juego. Se reprodujo el fallo sin el parche y se repitieron las pruebas sobre esa base; tipos, ESLint, build completo, SQL y navegador aprobaron. Las pruebas previas no se presentan como una nueva partida observada en producción. No se modificaron la partida reportada, sus monedas ni los resultados históricos ni se inició una etapa Android.

<a id="historia"></a>

## Historia y rivales

La expansión del Noroeste documenta 15 provincias y 66 rivales en el catálogo del repositorio. Para la nueva ruta se requiere vencer a Irene, la Antártica, además de los puntos correspondientes. Es la campaña que deberá cubrir también el trabajo offline.

<a id="noroeste"></a>

### Ruta del Noroeste: personajes, premios y estrategias

Descripción del catálogo y sus verificaciones; no se consultó la base de producción para esta reorganización.

Procedencia anterior: `docs/ruta-del-noroeste.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Ruta del Noroeste: personajes, premios y estrategias</summary>

<a id="noroeste-ruta-del-noroeste"></a>

### Ruta del Noroeste

Expansión posterior a la Ruta Patagónica: cinco provincias, cuatro rivales por provincia. Con la base vigente son **15 provincias y 66 rivales**. Irene, la Antártica (`antartica`), es el requisito de entrada para las cinco provincias. Una vez vencida, todos los rivales disponibles se eligen libremente por puntaje. No se exige ganarles a los otros 45 rivales anteriores ni seguir una cadena entre los nuevos.

<a id="noroeste-personajes-y-economia"></a>

#### Personajes y economía

Los identificadores UUID de provincia terminan en 11–15; los de rival y bot terminan en 47–66, respectivamente con prefijos `c1a70000-0000-4000-b000-` y `b0700000-0000-4000-a000-`. Los slugs son únicos. Todos juegan a 30 puntos, sin flor, con dificultad almacenada 10 y la nueva estrategia indicada abajo. La descripción pública exacta está en `tagline` de la migración. Cada personaje tiene frases propias en `src/lib/botFrases.ts` y un retrato `public/personajes/{slug}.webp`.

| Provincia (mínimo) | Rival (slug) | Estilo y personalidad | Puntos para desafiar | Puesto fijo | Puntos base | Monedas |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| La Rioja (17.500) | Don Eusebio, el Olivarero (`olivarero`) | Paciente; guarda la mejor carta | 17.500 | 22.000 | 800 | 1.600 |
| La Rioja | Rita, la Chayera (`chayera`) | Farolera; cambia el ritmo | 18.000 | 23.000 | 850 | 1.700 |
| La Rioja | Nicolás, el Pirquinero (`pirquinero`) | Calculador; mide la veta antes de apostar | 18.500 | 24.000 | 900 | 1.800 |
| La Rioja | Amalia, la Hilandera (`hilandera`) | Marcador; prepara los últimos puntos | 19.000 | 25.000 | 950 | 1.900 |
| Catamarca (22.000) | Jacinto, el Nogalero (`nogalero`) | Paciente; reserva la cosecha | 22.000 | 26.000 | 1.000 | 2.000 |
| Catamarca | Ofelia, la Tejedora (`tejedora`) | Calculadora; sin puntadas sueltas | 22.700 | 27.000 | 1.050 | 2.100 |
| Catamarca | Ramón, el Arriero de la Puna (`arriero-puna`) | Marcador; apuesta según la altura del duelo | 23.400 | 28.000 | 1.100 | 2.200 |
| Catamarca | Celeste, la Alfarera (`alfarera`) | Farolera; disimula la mano débil | 24.100 | 29.000 | 1.150 | 2.300 |
| Tucumán (26.000) | Lucho, el Cañero (`canero`) | Agresivo; presiona con oportunidad | 26.000 | 30.000 | 1.200 | 2.400 |
| Tucumán | Mercedes, la Empanadera (`empanadera`) | Calculadora; busca el punto justo | 26.800 | 31.100 | 1.250 | 2.500 |
| Tucumán | Roque, el Zafrero (`zafrero`) | Agresivo; acelera cuando aprieta el marcador | 27.600 | 32.200 | 1.300 | 2.600 |
| Tucumán | Teresa, la Zafrera Mayor (`zafrera-mayor`) | Marcador; cierra sin regalar bazas | 28.400 | 33.400 | 1.350 | 2.700 |
| Salta (31.000) | Don Hilario, el Bagualero (`bagualero`) | Calculador; aparente impulso y cálculo real | 31.000 | 34.600 | 1.400 | 2.800 |
| Salta | Inés, la Viñatera (`vinatera`) | Farolera; deja madurar el engaño | 31.900 | 35.800 | 1.450 | 2.900 |
| Salta | Fermín, el Gaucho del Valle (`gaucho-valle`) | Paciente; alterna presión y reserva | 32.800 | 37.100 | 1.500 | 3.000 |
| Salta | Martina, la Carpera (`carpera`) | Agresiva; lleva el duelo a su terreno | 33.700 | 38.400 | 1.550 | 3.100 |
| Jujuy (36.500) | Eloy, el Salinero (`salinero`) | Calculador; lee cartas visibles y pardas | 36.500 | 39.800 | 1.600 | 3.200 |
| Jujuy | Candelaria, la Carnavalera (`carnavalera`) | Farolera; oculta el canto en la fiesta | 37.500 | 41.300 | 1.650 | 3.300 |
| Jujuy | Baltasar, el Quebradeño (`quebradeno`) | Marcador; siempre busca otra salida | 38.500 | 43.000 | 1.700 | 3.400 |
| Jujuy | Doña Aurelia, la Dueña del Silencio (`duena-silencio`) | Paciente y precisa; habla poco, pero habla | 39.500 | **46.500** | 1.850 | 3.800 |

Los rasgos `trait_liar` y `trait_aggressive` individuales están en la migración, de 4–10 según personaje. La estrategia comparte las reglas tácticas de elección y conservación de cartas; cada perfil cambia el umbral de canto y la frecuencia de farol. El perfil «marcador» varía según quién va perdiendo. Doña Aurelia usa frases breves en pocos momentos; Don Salvador conserva su silencio absoluto.

<a id="noroeste-umbrales-y-premios"></a>

#### Umbrales y premios

La suma de premios base de los primeros 26 rivales es 3.045; la de Patagonia es 18.640: quien venció a los 46 tiene **21.685 puntos como mínimo**, antes de cualquier plus por margen. Puede abrir La Rioja de inmediato; Catamarca requiere al menos una victoria más. Ganar los cuatro rivales de cada provincia aporta respectivamente **3.500, 4.300, 5.100, 5.900 y 6.800 puntos** base. El recorrido completo termina como mínimo en **47.285 puntos**, encima del puesto fijo de Aurelia (46.500). Los umbrales de provincia 17.500 / 22.000 / 26.000 / 31.000 / 36.500 se alcanzan sin revancha ni plus por margen.

Se conserva la liquidación actual de `finish_game`: primera victoria = monedas de la tabla + puntos base + hasta 20% de puntos por diferencia final; las victorias repetidas dan hasta 10% de puntos base por vez y hasta 30% acumulado por rival, sin monedas repetidas. `campaign_progress` evita el doble pago. No se editó esa función ni saldos anteriores, fama, misiones, ranking online, medallas o recompensas de rivales previos.

<a id="noroeste-estrategia-en-servidor"></a>

#### Estrategia en servidor

La migración de estrategia copia mediante `pg_get_functiondef` la versión **vigente al aplicarla** de `bot_step` hacia una función interna sin permiso directo para el cliente. El punto de entrada original llama a esa copia para los bots anteriores y de lobby; sólo deriva los veinte nuevos al plan avanzado. Esto conserva las reparaciones posteriores a Patagonia.

La función de decisión recibe exclusivamente la mano propia, las cartas públicas ya jugadas, el resultado de bazas, quién es mano, los cantos, el marcador y el resumen existente de reputación. Prueba cada carta contra las cartas aún posibles del mazo, reserva fuerza para las bazas restantes y valora distinto una respuesta exacta, una parda y una apertura. Elige cantos por el valor que se gana o concede al aceptar, rechazar o subir; envido, real y falta tienen umbrales distintos. Los perfiles cambian el riesgo y los faroles. `bot_step` valida jugador y partida antes de actuar, llama a las mismas funciones autoritativas de juego y registra cada decisión. No consulta `game_hands` del humano.

La tercera migración corrige dos errores de evaluación: incluye la carta propia que ya está en la mesa al responder un canto, y reconoce que parda + ganada termina la mano sin necesitar una tercera carta fuerte. Evalúa los órdenes posibles de las cartas restantes combinando ganar/pardar/perder según el motor 1v1 vigente; conserva la carta más fuerte cuando una más débil ofrece el mismo resultado. También considera los puntos concedidos por «no quiero» para no regalar el punto que termina el partido. Las probabilidades frente a cartas desconocidas son estimaciones, no conocimiento de la mano rival.

Refuerzos de dificultad: sube el truco siempre que la victoria sea segura; con 33 siendo mano busca la falta envido porque ni un empate puede ganarle. Reserva los cantos de envido por valor para 27 o más, exige más respaldo para responder real/falta y usa los tantos medios para presionar sólo cuando la reputación pública respalda esa decisión. Mantiene los faroles de cada personalidad, sin modificar los repartos ni consultar cartas ocultas.

<a id="noroeste-recursos-graficos"></a>

#### Recursos gráficos

Los retratos se generaron individualmente con la herramienta integrada de imágenes, usando `antartica.webp` sólo como referencia de estilo: ilustración vintage de línea fina, ocre y sepia, marco sutil, personaje a medio cuerpo tras paño verde con mate y mazo; el rasgo local de cada personaje aparece en su vestimenta u oficio, sin texto. Están optimizados a 512 × 512 WebP. Los mapas provinciales se renderizaron con `scripts/generate_noroeste_maps.py`, que aplica el mismo dibujo y transparencia de Patagonia sobre los GeoJSON departamentales de [mgaitan/departamentos_argentina](https://github.com/mgaitan/departamentos_argentina) basados en IGN/CONAE. Están a 1254 × 1254 WebP con alfa. Las coordenadas nuevas se agregaron a las tablas existentes del mapa y de posiciones dentro de la provincia, sin cambiar su geometría.

<a id="noroeste-verificacion-y-limites"></a>

#### Verificación y límites

- `node scripts/check-noroeste-expansion.mjs`: cantidad, slugs, recursos, frases, requisitos, subida mínima de 21.685 a 47.285 y aislamiento del cerebro anterior.
- `supabase/tests/ruta_noroeste.sql` sobre base de prueba reconstruida: Irene y puntos en mapa y acceso directo, libertad de elegir, revancha aun con menos puntos, premio único, margen, tope de revanchas, ranking, situación táctica de guardar el ancho, envido/falta y decisión idéntica cuando sólo cambia la mano humana oculta. El CI del PR ejecuta este SQL después de `scripts/rebuild-db.sh`.
- `supabase/tests/noroeste_tactica.sql`: regresiones de carta ya tirada, primera parda, parda ganadora, triple parda, marcador al límite, valores de cadenas de envido y permisos de los ayudantes internos.
- `node scripts/sim-noroeste.mjs --local-test-db`: ejecuta esas regresiones y `noroeste_benchmark.sql` en una base local descartable. Juega **400 partidas completas a 30 puntos** (20 rivales × 10 semillas × 2 asientos) contra la función real de Irene, nivel 10. Ambas estrategias pasan por `bot_step` y las mismas funciones SQL de cartas, cantos, puntajes y finalización que usa el juego; no hay reglas ni cerebros duplicados en JavaScript. Los repartos son fixtures deterministas, diferentes para cada rival; se invierten los asientos con la misma secuencia. El resumen incluye cada rival y la tasa conjunta. El límite inferior agrupa los dos asientos de cada pareja rival/semilla: **200 bloques**, no 400 muestras independientes. CI exige más de 55% de victorias conjuntas y un límite inferior superior a 50%.
- Repetir con semillas nuevas: `NOROESTE_SEED_START=251 node scripts/sim-noroeste.mjs --local-test-db`. Se puede ampliar con `NOROESTE_TRIALS=20`. Requiere `psql`, las variables `PG*` de una base **local de pruebas** y haber ejecutado `scripts/rebuild-db.sh` allí; el lanzador rechaza hosts remotos y servicios libpq.

Se retiran las cifras 60,84%/60,24% del simulador anterior: reimplementaba parcialmente las reglas y, entre otras diferencias, sumaba mal envido + real. El benchmark nuevo usa el motor SQL sin esas divergencias. Compara estrategias con reputación inicial neutra, sin red ni rivales humanos; sus resultados **no predicen** la tasa frente a personas ni prueban un orden de dificultad entre los veinte personajes. Cada partida revierte sus efectos en un bloque aislado y todo termina en `ROLLBACK`; esto evita acumular miles de cambios de perfil y eventos diferidos de email durante la prueba. Conviene observar partidas reales tras publicar. La revisión de mapas y retratos en pantallas queda a cargo del dueño.

<a id="noroeste-publicacion-manual-despues-de-revisar-el-pr"></a>

#### Publicación manual después de revisar el PR

1. Hacer merge del PR cuando la aplicación y la base de datos aparezcan aprobadas en GitHub.
2. Abrir el proyecto **Trucazo** en Supabase → **SQL Editor** → **New query**.
3. Copiar **todo** el contenido de `supabase/migrations/20260923120000_campana_ruta_noroeste.sql` desde GitHub, pegarlo en esa consulta y pulsar **Run**. Esperar el resultado correcto. Crea provincias, rivales y cuentas bot sin tocar a los jugadores.
4. Abrir otra consulta nueva. Copiar **todo** el contenido de `supabase/migrations/20260923121000_campana_noroeste_estrategia.sql`, pegarlo y pulsar **Run**. Instala la estrategia y conserva la función del bot que esté vigente en ese momento.
5. Abrir otra consulta nueva. Copiar **todo** el contenido de `supabase/migrations/20260923160014_campana_noroeste_tactica_verificada.sql`, pegarlo y pulsar **Run**. Corrige la evaluación de manos y refuerza las decisiones del Noroeste.
6. Abrir `/historia`: comprobar La Rioja y el ranking. Si no se hicieron aún las migraciones anteriores de otros PR, aplicarlas primero en su orden original antes de estas tres. Si las primeras dos ya se ejecutaron, sólo falta la tercera.

No ejecutar `scripts/rebuild-db.sh`, los tests ni el benchmark en Supabase: trabajan sobre una base **de prueba**. Las tres migraciones anteriores son las únicas consultas de esta expansión que el dueño debe correr.

</details>


<a id="parejas"></a>

## Juego en parejas y bots

La entrega registra el lanzamiento del 2vs2 el 14/09/2026. La auditoría anterior se conserva como historial de decisiones: no es una lista de tareas nuevas ni reemplaza la entrega final. Hay notas históricas de activación pendientes que deben contrastarse con evidencias posteriores antes de repetir SQL.

<a id="parejas-entrega"></a>

### Cómo quedó el 2vs2

Referencia de implementación, reglas, pagos y mantenimiento. Las notas de activación se conservan con su contexto histórico.

Procedencia anterior: `docs/2vs2-entrega.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Cómo quedó el 2vs2</summary>

<a id="parejas-entrega-2vs2-como-quedo-la-modalidad"></a>

### 2vs2 — cómo quedó la modalidad

**Lanzada el 14/09/2026.** El PR #57 (rama `codex/2vs2`) se mergeó a master, las tres
migraciones se aplicaron en el Supabase de producción y `NEXT_PUBLIC_ENABLE_2VS2=true`
quedó configurada en Vercel. La modalidad está activa para todos los jugadores.

Este documento pasa a ser la referencia de qué hace el 2vs2 y cómo está montado.
La apariencia de la partida la aprobó el dueño sobre `76fa76e` el 13/09/2026; la sala
de espera se rediseñó después, a su pedido.

<a id="parejas-entrega-implementacion-por-etapas"></a>

#### Implementación por etapas

| Etapa | Resultado |
|---|---|
| Reglas | D1–D5 y Q1–Q3 en [Auditoría y decisiones previas al lanzamiento](#parejas-auditoria): turnos, pardas, envido declarado en orden y mazo que cierra la mano para todo el equipo. |
| Mesas | Cuatro asientos; 0/2 contra 1/3; públicas o con código. Cada persona elige asiento. El creador gestiona bots e inicio. Se necesitan cuatro participantes sentados. |
| Motor | Servidor autoritativo, manos privadas, puntaje compartido, acciones con versión e identificador, bloqueos por mesa y pagos una sola vez. |
| Bots | Las cinco composiciones; decisión con cartas propias e información pública, ahorro de cartas cuando gana el compañero, prioridad humana al responder. Desde el 14/09/2026 se sientan con nombre de jugador, hablan en la mesa y escuchan a su compañero: [Comportamiento y conversación de los bots](#parejas-bots). |
| Presentación | Componentes y estética del 1vs1; pilas frente a cada jugador, tamaños estables, cantos con autor y resultado por equipo. La sala de espera se rediseñó aparte: la mesa se ve desde arriba, con un lugar por lado y el compañero enfrente. |
| Chat rápido | Los emotes del 1vs1 más once frases de mesa de a cuatro, en `src/lib/emotes.ts`. Son públicas: las lee toda la mesa. No hay señas ni canal privado entre compañeros. Viajan por el servidor (`team_say`), que solo acepta las frases de esa lista y no toca el turno ni la versión de la mesa. |
| Sincronización | Realtime de estado público, consulta de respaldo cada 2,5 s, presencia cada 8 s y recuperación de asiento al recargar con la misma sesión. |
| Compatibilidad | Incluye la corrección del resultado 1vs1 de master, PR #58 (`d7094d0`). No cambia la mesa ni el resultado del 2vs2 aprobado. |

No agrega estadísticas, rankings, misiones, recompensas, señas privadas, flujos
nuevos de invitación, revancha 2vs2 ni historia por parejas. El saldo conserva el
pago acordado: cada ganador cobra 2B, ganancia neta B. El guard de medallas impide
premios adicionales por ese cambio de saldo.

<a id="parejas-entrega-mantenimiento-y-desconexiones"></a>

#### Mantenimiento y desconexiones

- **Espera:** una mesa se conserva mientras alguna persona marque presencia.
  Se cancela y devuelve las apuestas cuando todas llevan al menos 15 minutos
  ausentes. Los bots no mantienen abierta la sala. El barrido corre cada 5 minutos,
  por lo que la cancelación puede ocurrir en el siguiente barrido.
- **Carrera con reconexión:** presencia y cancelación usan el mismo bloqueo de
  mesa; el barrido vuelve a comprobar la ausencia después de obtenerlo.
- **Durante la partida:** siguen vigentes 15/30 segundos por acción, mazo automático
  al vencer el turno y derrota del equipo al tercer vencimiento individual.
  Reconectar no borra el contador. No hay sustitución automática por bot.
- **Ausencia total en partida (decidido el 14/09/2026):** tras 10 minutos sin
  ninguna persona, si todas las personas de la mesa juegan en el mismo equipo, ese
  equipo pierde por abandono y no hay reembolso: cerrar las pestañas contra bots
  ya no evita la derrota. Si hay personas ausentes en ambos equipos, la partida se
  anula y se devuelven las apuestas, como antes. No hay sustitución por bot.
- **Solicitudes:** se conservan los comprobantes de creación e ingreso, que protegen
  sus cobros contra reintentos. Solo se purgan solicitudes de acciones de mesas
  cerradas hace más de 30 días, hasta 5.000 por barrido. Las mesas abiertas nunca
  se purgan. Reintentar una acción purgada no puede cambiar una mesa cerrada ni
  repetir pagos; una salida antigua puede devolver el error de no pertenencia en
  vez de la respuesta guardada. No se borran partidas, asientos ni saldos.
- **Emails existentes:** una partida 2vs2 terminada cuenta como actividad para sus
  participantes humanos. Esperas, partidas en curso y cancelaciones no cuentan.
  Solo se corrige la clasificación; no se crean campañas ni se envían emails.

<a id="parejas-entrega-migraciones-y-activacion"></a>

#### Migraciones y activación

**Nota histórica de preparación, anterior a la verificación del 15/10/2026:** las tres primeras ya están aplicadas en producción. **La cuarta está pendiente: hay
que correrla a mano** para que los bots tomen nombre, hablen y escuchen. Quedan las
cuatro listadas por si hay que reconstruir una base desde cero o montar un entorno
de prueba, y se corren en este orden:

1. `supabase/migrations/20260909211038_team_2vs2.sql`: tablas, motor, permisos,
   publicación de `team_tables` en Realtime y cron `sweep_team_tables`.
2. `supabase/migrations/20260913191141_team_2vs2_maintenance.sql`: espera según
   presencia, limpieza de solicitudes, índices, RLS y actividad de emails.
3. `supabase/migrations/20260914100000_team_2vs2_abandono.sql`: ausencia total en
   partida: el equipo ausente pierde por abandono; con ausentes de ambos lados se anula.
4. `supabase/migrations/20260914170000_team_2vs2_bots_hablan.sql`: bots con nombre,
   catálogo de frases, chat rápido por servidor y pedidos del compañero. No cambia
   reglas, turnos, puntajes ni pagos.

**Verificación posterior, 15/10/2026 — ANDROID-09:** el Supabase real ya entrega bots con nombres distintos, acepta `team_say` y devuelve la respuesta del compañero a «¿Qué hago?» junto con sus frases durante la partida. Comprobado en el APK con las QA existentes; el pendiente histórico de esa cuarta migración queda descartado. **No volver a aplicarla.** Reglas y modalidades no cambiaron; [matriz y aceptación Android](android.md#android-09-parejas).

La primera exige que la extensión `pg_cron` esté habilitada (Supabase → Database →
Extensions): programa el barrido con `cron.schedule` y sin la extensión falla entera.
Cada archivo es transaccional y no se repite: si ya fue aplicado, se omite.

Para montar otra base con las migraciones de master:

1. Abrirla en Supabase → **SQL Editor** y correr los cuatro archivos, uno por consulta.
2. Comprobar las cuatro tablas `team_*`, la tabla privada `team_internal.requests`,
   sus permisos y RLS. En Realtime debe aparecer solo `team_tables`, nunca las
   manos ni las solicitudes. Debe existir un único cron `sweep_team_tables` cada 5 min.
   Se verifican con `select tablename from pg_publication_tables where pubname='supabase_realtime'`
   y `select jobname, schedule from cron.job`.
3. Configurar URL y clave pública de esa base y `NEXT_PUBLIC_ENABLE_2VS2=true`, y
   volver a compilar. La variable se hornea en el build: sin recompilar no toma efecto.

Sin la variable, o con `false`, se mantienen las opciones 1vs1 y las rutas de
parejas vuelven al lobby. Sirve como interruptor de emergencia: ponerla en `false`
y volver a desplegar apaga la modalidad sin tocar la base ni revertir código.
La foto de estructura y funciones 2vs2 es `supabase/schema/team_2vs2.json`; no
contiene datos. Para reconstruir de cero, seguir [Reconstruir la base de prueba](backend.md#reconstruir-base):
la base histórica más todas las migraciones siguen siendo la receta ejecutable.

<a id="parejas-entrega-preview-gratuita-y-como-probar"></a>

#### Preview gratuita y cómo probar

Se usó durante la revisión y sigue disponible para probar cambios futuros sin tocar
producción. `preview-2vs2.yml` crea una base vacía con Auth, PostgreSQL y Realtime
reales en un runner estándar del repositorio público y un enlace temporal de
Cloudflare. No usa datos ni claves de producción. La copia tiene los emails
desactivados y se borra al terminar. Hoy solo se dispara en la rama `codex/2vs2`.

1. Abrir PR #57 → **Checks → Preview temporal 2vs2 → preview**.
2. Esperar las pruebas de las cinco composiciones y **Comprobar acceso público**.
   Abrir el enlace del paso **Probar durante 90 minutos**. El PR también registra
   el enlace y resultado de la ejecución vigente.
3. Elegir **Entrar como invitado → Crear mesa → 2vs2 · Parejas**.
4. Elegir opciones y asiento. Para jugar solo, agregar tres bots y empezar.
5. Para sumar personas, usar dispositivos, navegadores o perfiles distintos:
   cada persona necesita una sesión independiente. Entran desde el lobby o con
   el código de la mesa privada. Dos pestañas de una misma sesión son un jugador.
6. Asientos 0/2 son compañeros; 1/3 forman el otro equipo. Completar con bots,
   jugar hasta el resultado y volver al lobby. Recargar debe conservar el asiento.

El enlace dura 90 minutos desde que se habilita. Para renovarlo: en esa ejecución,
**Re-run jobs → Re-run all jobs**. Se genera otra dirección y se reinicia la base.
Un enlace vencido no se recupera recargando Safari.

<a id="parejas-entrega-verificacion-y-limites"></a>

#### Verificación y límites

- Local: reconstrucción desde cero con las cuatro migraciones; pruebas SQL del motor,
  bots, privacidad, permisos, pagos, presencia y retención; actividad de emails,
  tipos TypeScript y comprobación de RPC.
- CI: PostgreSQL 16, reconstrucción y suites de seguridad, regresión 1vs1,
  actividad de emails y 2vs2. `team_concurrency.sh` usa conexiones independientes
  para disputar asiento, reparto, respuesta, cierre/pago, limpieza/reintento y
  presencia/barrido. PGlite local no acredita concurrencia entre conexiones.
- Preview: Supabase local real, cinco composiciones con sesiones Auth independientes,
  partidas hasta victoria por puntos, privacidad, recuperación de sesión y eventos
  WebSocket. El resultado concreto de la ejecución vigente queda en el PR.
- Composiciones cubiertas: cuatro personas, tres más bot, dos compañeras más bots,
  dos rivales más bots y una persona más tres bots; objetivos 15/30 y relojes 15/30.
- Charla de los bots: nombres sin repetir, permisos y RLS del catálogo, validación y
  límite del chat, que hablar no mueva turno ni versión, respuesta honesta según la
  mano, caducidad del pedido al terminar la mano, "Calladito" y el efecto medido de
  cada pedido sobre la decisión. En `team_games.sql` y `check-team-presentation.ts`.
- La apariencia la aprobó el dueño, incluido el rediseño de la sala de espera.
- La sesión manual con cuatro personas la hizo el dueño antes de lanzar.

Todo lo que figuraba como pendiente quedó resuelto: la ausencia total contra bots
tiene regla propia (migración `20260914100000`, probada en `team_games.sql`), la
prueba con cuatro personas se hizo, y el dueño autorizó migraciones y lanzamiento.

</details>

<a id="parejas-bots"></a>

### Comportamiento y conversación de los bots

Alcance de roles, cantos, frases y pedidos del compañero.

Procedencia anterior: `docs/2vs2-bots-humanos.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Comportamiento y conversación de los bots</summary>

<a id="parejas-bots-como-se-juega-el-2vs2-en-la-vida-real-y-que-de-eso-hacen-los-bots"></a>

### Cómo se juega el 2vs2 en la vida real, y qué de eso hacen los bots

Estudio de la mesa de a cuatro —los roles, los cantos, las señas y, sobre todo,
**cómo se habla**— y la lista de qué de todo eso quedó adentro de Trucazo, qué
quedó afuera a propósito y por qué.

---

<a id="parejas-bots-1-la-mesa-quien-es-quien"></a>

#### 1. La mesa: quién es quién

Cuatro jugadores sentados alternados: cada uno tiene a su compañero **enfrente**
y a los dos rivales a los costados. (En Trucazo es igual: los asientos 0 y 2 son
un equipo, 1 y 3 el otro.)

Dos palabras que se usan todo el tiempo:

- **Mano**: el que juega primero en la ronda. Va rotando.
- **Pie**: el **último** de cada equipo en jugar. Es el que más información
  tiene, porque vio jugar a casi todos antes de decidir.

De ahí sale el dicho de mesa: **"el pie manda"**. Como el pie juega último,
tradicionalmente es el que canta el envido y el que decide los cantos grandes;
el compañero "le deja la cancha". En algunas mesas se lleva más lejos todavía:
*el truco lo contesta el más cercano a la mano, y el envido lo contesta el pie*.

> **En Trucazo esto no lo cambiamos.** Ya estaba decidido (D1 en
> [Auditoría y decisiones previas al lanzamiento](#parejas-auditoria)): responde el primero del equipo contando desde la mano, y
> si en ese equipo hay una persona y un bot, **responde siempre la persona**
> mientras pueda. Es una simplificación deliberada: la persona nunca se queda
> mirando cómo el bot contesta por ella.

---

<a id="parejas-bots-2-los-cantos-que-cambia-respecto-del-mano-a-mano"></a>

#### 2. Los cantos: qué cambia respecto del mano a mano

La diferencia de fondo es una sola, y lo tiñe todo: **lo que hace uno compromete
a los dos**.

| Lo que pasa | Consecuencia real en la mesa |
|---|---|
| Uno canta truco | Quedan cantados los dos. Si el compañero no tenía nada, se embroma igual. |
| Uno se va al mazo | **Cierra la mano para los dos.** Por eso se escucha "¡no te vayas!", "aguantá". |
| El envido | Se declara por orden desde la mano; el que no supera dice "son buenas". |
| El tanto del equipo | Es **el mejor de los dos**, nunca la suma. |

Esa última fila es la que explica la mitad de lo que se habla en una mesa de a
cuatro: si tu compañero tiene 30 y vos tenés 20, tu 20 no sirve para nada, pero
**saber que él tiene algo** te cambia la respuesta. Ahí aparece la comunicación.

---

<a id="parejas-bots-3-las-senas-y-por-que-trucazo-no-las-tiene"></a>

#### 3. Las señas (y por qué Trucazo no las tiene)

En la mesa de verdad, apenas se levantan las cartas, cada uno le transmite al
compañero lo que tiene con la cara. Las universales:

| Carta | Seña |
|---|---|
| Ancho de espada | Levantar las dos cejas |
| Ancho de basto | Guiñar un ojo |
| Siete de espada | Correr la boca a la derecha |
| Siete de oro | Correr la boca a la izquierda |
| Los tres | Morderse el labio de abajo |
| Los dos | Tirar un besito |
| Anchos falsos (1 de copa/oro) | Abrir la boca como un pescado |
| No tengo nada | Cerrar los ojos un segundo |
| Tengo envido | Arrugar la nariz |

**Trucazo no tiene señas y no las va a tener.** Ya estaba decidido y escrito en
[Cómo quedó el 2vs2](#parejas-entrega): no hay canal privado entre compañeros. Una seña es
información secreta que el rival no puede ver, y eso online es indistinguible de
hacer trampa.

Pero hay una versión de las señas que sí es legal en cualquier mesa, y es la que
Trucazo sí tiene: **decirlo en voz alta**. "Estoy seco", "algo tengo", "cantale".
Lo escucha todo el mundo, incluido el rival, y **puede ser mentira**. Eso es
exactamente el chat rápido que ya está en la partida.

---

<a id="parejas-bots-4-como-se-habla-el-corazon-del-asunto"></a>

#### 4. Cómo se habla: el corazón del asunto

<a id="parejas-bots-como-se-llaman-entre-si"></a>

##### Cómo se llaman entre sí

Al compañero casi nunca se lo llama por el nombre completo. Se usa, más o menos
en este orden de frecuencia: **compañero**, **compa**, **socio**, **che**, el
apodo, y en tono de arenga **maestro**, **fiera**, **crack**, **campeón**.

Al rival se lo trata en segunda persona y en plural ("¿se animan?", "vengan"), o
directamente con la chicana: **mentiroso**, **caradura**, **achicate**.

<a id="parejas-bots-lo-que-se-le-dice-al-companero"></a>

##### Lo que se le dice al compañero

Siempre vago, nunca una carta concreta. Lo típico:

| Momento | Lo que se dice |
|---|---|
| Antes de cantar | "¿Qué hago?", "¿cantamos?" |
| Dándole permiso | "Cantá tranquilo que te sigo", "andá que voy con vos", "no te achiques" |
| Frenándolo | "Ojo", "guardala", "pará, pará" |
| Avisando que no tiene | "Estoy seco", "estoy pelado", "no me queda nada" |
| Avisando que sí tiene | "Algo tengo", "tengo para pelearlo" |
| Repartiendo el trabajo | "Juego yo", "dejá que voy yo", "matala vos" |
| Festejando | "¡Esa!", "bien ahí compañero", "así se juega" |
| Consolando | "La próxima", "uh, por poco" |
| Pidiendo silencio | "Calladito", "menos charla" |

<a id="parejas-bots-lo-que-se-le-dice-al-rival"></a>

##### Lo que se le dice al rival

"¿Te animás?", "¿tanto tenés?", "mentiroso", "achicate", "andá", "quereme y
ves", "pagá y después hablás". Y los **versos**: rimas hechas para cantar el
truco o el envido, que son parte del folklore del juego más que de la
estrategia.

<a id="parejas-bots-la-regla-de-oro"></a>

##### La regla de oro

**Nadie dice la verdad de sus cartas.** Lo que se dice es vago, exagerado o
directamente falso, y el rival escucha todo. Una mesa donde el que canta truco
avisa que está faroleando no es una mesa de truco.

Esto tiene una consecuencia directa para nosotros: **un bot nunca puede decir
una frase que delate su mano cuando canta.** Si cada vez que dice "esta mano ya
está" resulta que tiene el ancho de espada, a las tres partidas cualquiera lo
lee y el bot queda inservible. Sus cantos son actitud, no información.

La excepción es justamente la que existe en la mesa real: **cuando el compañero
le pregunta, le contesta la verdad** ("estoy seco", "algo tengo"). El rival lo
escucha —y también puede no creerle—, que es como funciona de verdad.

---

<a id="parejas-bots-5-que-implementamos-de-todo-esto"></a>

#### 5. Qué implementamos de todo esto

| De la mesa real | En Trucazo |
|---|---|
| El compañero tiene nombre y cara | ✅ Los bots dejan de llamarse "Bot 1" y toman un nombre de jugador de la lista que ya usan los bots del lobby |
| Se habla en la mesa | ✅ El bot dice una frase suya cuando canta, cuando quiere, cuando no quiere, cuando se va al mazo, cuando acompaña un canto del compañero y cuando se cierra una mano |
| Te contestan cuando les hablás | ✅ Si le hablás a tu compañero bot, te contesta según cómo viene su mano de verdad |
| Le decís al compañero qué hacer, y te hace caso | ✅ Tres pedidos le cambian cómo juega **esa mano**: "¡Cantales, cantales!", "Algo tengo" y "Estoy seco" |
| La chicana al rival | ✅ Un bot rival te contesta de vez en cuando, pero eso **no** le cambia el juego |
| "Calladito" | ✅ Los callás por el resto de la mano |
| Señas | ❌ A propósito: es un canal privado, decisión ya tomada |
| El pie es el que canta y el que responde el envido | ❌ A propósito: responde la persona antes que el bot (D1), para que nadie se quede mirando |
| Versos rimados largos | ❌ No entran en un globito y en pantalla se leen como spam |

<a id="parejas-bots-los-tres-pedidos-que-el-bot-obedece"></a>

##### Los tres pedidos que el bot obedece

Solo los del **compañero**, y solo dentro de la mano en la que se dijeron. Lo
que grita un rival **nunca** le cambia el juego al bot — si no, alcanzaría con
llenar el chat para manejarle la partida al de enfrente.

| Le decís | El bot… |
|---|---|
| **"¡Cantales, cantales!"** (o "¡Quiero!") | Se anima bastante más a cantar truco y a aceptar el que le canten |
| **"Algo tengo"** | Baja el listón del envido: lo canta y lo acepta con menos tantos, porque el tanto del equipo es el mejor de los dos |
| **"Estoy seco"** (o "No me queda nada, eh") | Se guarda: casi no canta y se pone más exigente para aceptar |

Es un **empujón, no una orden**: le mueve las ganas, no la mano. Con cartas muy
buenas acepta igual aunque le hayas dicho que estás seco, y con cartas muy malas
no canta vale cuatro por más que le grites. Igual que una persona.

---

<a id="parejas-bots-6-como-esta-hecho-para-quien-toque-el-codigo"></a>

#### 6. Cómo está hecho (para quien toque el código)

- **Todo vive en el servidor**, como el resto del juego. Las frases son un
  catálogo en la tabla `team_bot_lines`: agregar o sacar una frase es un
  `insert` o un `delete`, no hay que tocar ninguna función.
- **El chat rápido pasa por el servidor** (`team_say`). Antes viajaba de
  navegador a navegador y el servidor ni se enteraba; por eso el bot no podía
  escucharlo. De paso, ahora los cuatro ven lo mismo: antes cada pantalla se
  enteraba por su cuenta.
- **El chat no cuenta como jugada**: no toca el reloj del turno ni el número de
  versión de la mesa. Esto es importante — si lo tocara, un rival podría
  invalidarte la jugada a fuerza de mandar mensajes.
- **Solo se pueden mandar las frases de la lista.** El servidor rechaza
  cualquier otro texto, así que nadie puede escribir lo que quiera en una
  pantalla ajena. La lista está en `src/lib/emotes.ts` y espejada en SQL; el
  revisor automático del repositorio comprueba que no se desincronicen.
- **Las frases con retraso**: cuando un bot habla, su frase queda agendada medio
  segundo o un segundo después. Si contestara en el mismo instante se notaría
  que es una máquina.

</details>

<a id="parejas-auditoria"></a>

### Auditoría y decisiones previas al lanzamiento

Historial iniciado el 09/09/2026. El propio registro indica que las decisiones se resolvieron; consultar primero la entrega final.

Procedencia anterior: `docs/2vs2-auditoria.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Auditoría y decisiones previas al lanzamiento</summary>

<a id="parejas-auditoria-2vs2-auditoria-tecnica-y-propuesta-de-reglas"></a>

### 2vs2: auditoría técnica y propuesta de reglas

Fecha: 09/09/2026. Repositorio: `santibpapa/trucazo`.
Base: `master`, `708162b0aec85b3053702978045a7f19c0932c23`.

Este documento entrega el relevamiento de la etapa 1. Distingue hechos del código,
adaptaciones propuestas y decisiones pendientes. No certifica el estado aplicado
en el Supabase de producción: no se ejecutaron consultas ni cambios allí.

Estado al 14/09/2026: la modalidad se lanzó. Todas las decisiones que este documento
dejaba abiertas están resueltas y aplicadas. Para saber cómo quedó el 2vs2 en
producción, la referencia es [Cómo quedó el 2vs2](#parejas-entrega); esto es el registro de cómo se llegó.

Actualización tras las respuestas del dueño: D1, D3 y D4 confirmadas. D2 y D5
corregidas: irse al mazo SIEMPRE termina la mano para el equipo, también si es por
tiempo; no existe retiro individual con continuación del compañero. La declaración
de envido sigue el orden de mesa desde la mano y los botones dependen del tanto.
Q1–Q3 también quedaron confirmadas: igualdad es “son buenas”, mazo solo en el
turno propio y liquidación del envido según Q3. Se inició la implementación.

<a id="parejas-auditoria-diagnostico"></a>

#### Diagnóstico

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

<a id="parejas-auditoria-mapa-del-codigo-auditado"></a>

##### Mapa del código auditado

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

<a id="parejas-auditoria-tabla-de-reglas"></a>

#### Tabla de reglas

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

<a id="parejas-auditoria-d1-quien-responde-por-el-equipo"></a>

##### D1 — Quién responde por el equipo

Confirmado por el dueño: cualquier compañero del equipo requerido puede aceptar,
rechazar o aumentar. La primera respuesta válida que confirma el servidor vale
para todo el equipo, incluido “no quiero”. Las posteriores no pueden modificar
ese canto. Si cualquiera se fue al mazo, la mano ya terminó y no admite respuestas.

En equipos humano+bot tiene prioridad el humano mientras pueda responder; el bot
no debe rechazar por él durante ese plazo. Para dos bots responde uno elegido por
orden de mano.
Los cantos nuevos conservan la restricción de turno del 1vs1.

<a id="parejas-auditoria-d2-declaracion-de-envido-y-mazo-de-equipo"></a>

##### D2 — Declaración de envido y mazo de equipo

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

<a id="parejas-auditoria-d3-tercera-ronda-parda-confirmada"></a>

##### D3 — Tercera ronda parda: confirmada

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

<a id="parejas-auditoria-d4-apuestas-confirmadas"></a>

##### D4 — Apuestas confirmadas

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

<a id="parejas-auditoria-d5-tiempo-desconexion-y-abandono"></a>

##### D5 — Tiempo, desconexión y abandono

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

Actualización de mantenimiento del 13/09/2026: en 2vs2, las salas en espera
se cancelan tras 15 minutos sin presencia humana, no por su edad si alguien sigue
conectado. Presencia y barrido se serializan por mesa.

Actualización del 14/09/2026 (decisión del dueño): una partida en curso con 10
minutos sin ninguna persona ya no se anula siempre. Si todas las personas de la
mesa juegan en el mismo equipo, ese equipo pierde por abandono, sin reembolso;
así cerrar las pestañas contra bots no evita la derrota. Con personas ausentes de
ambos equipos se anula y se devuelven las apuestas. Sigue sin haber reemplazo por bot.

No deducir abandono de un evento transitorio de Realtime ni agregar sustitución
automática por bots.

<a id="parejas-auditoria-aclaraciones-q1q3-confirmadas"></a>

##### Aclaraciones Q1–Q3 confirmadas

1. **Q1 — Igualdad.** Si iguala el mayor tanto declarado, solo “son buenas”.
   Conserva prioridad quien declaró primero desde mano.
2. **Q2 — Mazo.** Solo en el turno propio de jugar, responder o declarar.
   Siempre termina toda la mano y la gana el equipo contrario.
3. **Q3 — Envido al mazo.** Conservar puntos ya adjudicados. Querido y pendiente:
   el contrario cobra ese envido más la mano. Cantado sin aceptar: el contrario
   cobra el rechazo más la mano, incluso si quien se retira lo había cantado.
   Sin canto no hay puntos extra de envido.

<a id="parejas-auditoria-propuesta-de-implementacion"></a>

#### Propuesta de implementación

<a id="parejas-auditoria-persistencia-y-api"></a>

##### Persistencia y API

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

<a id="parejas-auditoria-bots"></a>

##### Bots

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

<a id="parejas-auditoria-interfaz-y-compatibilidad-visual"></a>

##### Interfaz y compatibilidad visual

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

<a id="parejas-auditoria-sistemas-existentes-afectados"></a>

##### Sistemas existentes afectados

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

<a id="parejas-auditoria-prs-migraciones-y-preview"></a>

##### PRs, migraciones y preview

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

<a id="parejas-auditoria-verificacion-realizada-y-pendiente"></a>

#### Verificación realizada y pendiente

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

</details>


<a id="torneos"></a>

## Torneos

El último estado documentado indica cinco etapas finalizadas y lanzamiento en producción el 27/09/2026, con actualización al 07/10/2026. Las restricciones y pendientes escritos dentro de cada etapa corresponden a esa fecha; no reemplazan el estado final.

**15/10/2026 — adaptación Android:** central, inscripción, competencia, administración por rol y espectador compartidos con la app. La vista pública se ajustó al alto disponible y el detalle explica la pausa de rondas vigente, sin cambiar reglas ni SQL. Entornos, pruebas y límites en [ANDROID-10](android.md#android-10-torneos); no se publicaron estos cambios ni se activaron torneos de ensayo en producción.

**30/10/2026 — relleno con bots (sólo 1v1):** pedido del dueño para el primer torneo (16 lugares, 11 inscriptos, inicio 20:00). `20261030223000_tournament_bot_fill.sql` crea 16 cuentas bot (`b0720000-…`, `torneoN@trucazo.bot`) con nombre, historial y antigüedad de jugador común, sin correos, y juegan con el cerebro del Noroeste (`_northwest_plan`, marcador llevado a escala de 30). Sólo actúa en los torneos de `tournament_internal.bot_fill`: la migración marca los 1v1 publicados del 30/10. El trabajo `trucazo-tournament-bots-minute` (`tournament_internal.bot_tick`) completa a la hora de inicio el cupo que no cubren los confirmados ni la espera e inicia el torneo; el bot entra al cruce apenas se abre; los cruces bot contra bot se juegan en el servidor, una mano por minuto; si la persona abandona, el bot sigue y le corre el reloj. Los bots compiten de verdad y pueden subir al podio. Para otros torneos se usa la casilla **Completar con bots** del panel (`20261030233000_tournament_bot_fill_admin.sql`: `tournament_admin_bot_fill` y `tournament_admin_set_bot_fill`, sólo administradores). Aparece al crear o editar un borrador 1v1 y en el detalle de un 1v1 publicado que todavía no arrancó; se puede desactivar siempre. **Arreglo del mismo día:** `20261030223000` dejó `bot_step` con un alias ambiguo que cortaba a los bots de Historia y del lobby; lo corrige `20261030234500_fix_bot_step_ambiguo.sql` (lo detectó `ruta_noroeste.sql` en CI). **Incidente de la COPA TRUCA (20:00):** ningún inscripto había hecho check-in; `start_one` los reemplazó y el relleno puso 16 bots. `20261030235500_copa_truca_devolver_inscriptos.sql` (ya aplicada) borró esa largada, devolvió a los 11 con check-in de la administración, completó con 5 bots, volvió a sortear y dio 15 minutos para entrar a la primera ronda, sin cambiar el estado del torneo para no reenviar el anuncio. **Regla vigente desde `20261030235800_bot_fill_respeta_inscriptos.sql`:** en los torneos marcados, los inscriptos conservan su lugar aunque no hagan check-in (si no entran a su cruce, pierden por ausencia) y los bots sólo ocupan lugares que nadie tomó. Además, al anotarse (o aceptar una invitación) aparece un aviso que explica el check-in con su horario; la persona tilda «Entiendo…» y puede confirmar recién a los 5 segundos (`src/components/tournaments/CheckInNotice.tsx`). Probado en base local reconstruida: 10 confirmados + 1 sin check-in → 6 bots, arranque automático, torneo completo con podio y 0 errores de decisión; `bot_step` contra bot de torneo desde la pantalla de una persona.

<a id="contrato-torneos"></a>

### Reglas, arquitectura, entrega e historial de torneos

Conserva el contrato completo y las evidencias por etapa. La reorganización no vuelve a verificar ni modifica producción.

Procedencia anterior: `torneos.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Reglas, arquitectura, entrega e historial de torneos</summary>

<a id="contrato-torneos-sistema-de-torneos-especificacion-e-historial-de-implementacion"></a>

### Sistema de torneos — especificación e historial de implementación

> Implementación de las cinco etapas **finalizada y habilitada en producción el 2026-09-27** (horario de Argentina). Este documento conserva el contrato, las decisiones técnicas y el historial de entrega para futuras consultas.
>
> Última actualización: 2026-10-07
> Repositorio base: `santibpapa/trucazo`<br>
> Commit base al redactar este documento: `4d5857359b4b33612c0633421beff4aa5d1ddf81`

<a id="contrato-torneos-1-como-usar-este-documento"></a>

#### 1. Cómo usar este documento

Para futuras modificaciones de torneos, leer este archivo y `AGENTS.md`. Las instrucciones de etapas siguientes y los pasos de lanzamiento se conservan como historial: **las cinco etapas ya terminaron; no volver a ejecutar sus migraciones**. Toda corrección de la base requiere una migración nueva.

Reglas que se siguieron durante la implementación:

1. Empezar desde el `master` más reciente, con el PR anterior fusionado.
2. Verificar las precondiciones de la etapa antes de programar. Si falta una migración aplicada o el PR anterior no está fusionado, la etapa todavía no empieza.
3. Implementar solamente el alcance de la etapa actual. No adelantar trabajo de una etapa posterior salvo una dependencia técnica mínima y documentada.
4. Toda modificación de base de datos se hace en una migración nueva. Nunca se edita una migración ya aplicada.
5. La base de datos y sus RPC son la autoridad para cupos, permisos, sorteos, resultados, premios y transiciones de estado. La interfaz nunca es la única barrera.
6. Antes de terminar, ejecutar las pruebas de la etapa, completar el registro de traspaso al final de este archivo y dejar instrucciones exactas para aplicar SQL manualmente cuando corresponda.
7. Una etapa termina únicamente cuando cumple toda su definición de terminado. Abrir un PR no equivale a terminarla.

<a id="contrato-torneos-2-estado-del-programa"></a>

#### 2. Estado del programa

<a id="contrato-torneos-eliminacion-de-torneos-anteriores-2026-10-07"></a>

##### Eliminación de torneos anteriores (2026-10-07)

- En `/admin/torneos`, cada tarjeta de **Anteriores** muestra **Eliminar torneo**. También aparece dentro del detalle administrativo si está finalizado o cancelado.
- Pide confirmación, quita el torneo de ambas listas (administradores y jugadores) y deja de ofrecer su detalle. No permite borrar borradores, publicados ni torneos en curso; el servidor valida administrador y estado bajo bloqueo de fila.
- Es un borrado lógico (`tournaments.deleted_at`): conserva participantes, resultados, premios, monedas, insignias y auditoría. Cancela correos sin enviar y retira avisos del torneo para no dejar enlaces al detalle eliminado. Los reintentos no repiten la auditoría.
- SQL nuevo a aplicar manualmente al fusionar: `supabase/migrations/20261008022514_tournaments_delete_old.sql`. No requiere cambiar flags ni configurar un cron.
- Pruebas: `supabase/tests/tournaments_delete.sql`, incluidas en CI. Entrega pendiente de fusionar y aplicar SQL en producción.

| Entrega | Estado | Rama | PR | Migraciones | Observaciones |
| --- | --- | --- | --- | --- | --- |
| Documento base | Completo | `codex/plan-sistema-torneos` | [#74](https://github.com/santibpapa/trucazo/pull/74) | Ninguna | Especificación y división en cinco etapas |
| PR 1 — Base de datos y contrato | Completo | `codex/tournaments-base-contract` | [#75](https://github.com/santibpapa/trucazo/pull/75) | `20260921082456_tournaments_base_contract.sql` | Fusionado, SQL aplicado y verificado |
| PR 2 — Administración e inscripciones | Completo | `codex/tournaments-admin-registration` | [#78](https://github.com/santibpapa/trucazo/pull/78) | `20260922071129_tournaments_public_projection.sql` | Fusionado, SQL aplicado y recorridos validados |
| PR 3 — Competencia 1v1 | Completo | `codex/tournaments-1v1-competition` | [#84](https://github.com/santibpapa/trucazo/pull/84) | `20260924172158_tournaments_1v1_competition.sql` | Fusionado, SQL aplicado y cron de torneos verificado; recorridos manuales confirmados por el dueño antes del lanzamiento |
| PR 4 — Competencia 2v2 | Completo | `codex/tournaments-2v2-competition` | [#89](https://github.com/santibpapa/trucazo/pull/89) | `20260925103000_tournaments_2v2_competition.sql` | Fusionado, SQL aplicado y CI verde; recorridos manuales confirmados por el dueño antes del lanzamiento |
| PR 5 — Comunicaciones, espectadores y lanzamiento | Completo | `codex/tournaments-pr5` | [#91](https://github.com/santibpapa/trucazo/pull/91) | `20260927001608_tournaments_communications_awards.sql` | Fusionado y SQL aplicado; cron de emails #9 activo, despacho y flag encendidos. Ajustes de lobby [#92](https://github.com/santibpapa/trucazo/pull/92) y [#93](https://github.com/santibpapa/trucazo/pull/93) fusionados y desplegados |

El cierre y el alcance de las comprobaciones figuran en la última entrada del registro de traspaso (§12). Las entradas anteriores reflejan el estado en su fecha, aunque mencionen tareas que ya se resolvieron.

<a id="contrato-torneos-3-objetivo-del-producto"></a>

#### 3. Objetivo del producto

Permitir que un administrador cree y opere torneos programados desde `/admin`, mientras los usuarios registrados se inscriben, hacen check-in y participan desde una central de torneos accesible en el lobby. Debe soportar torneos 1v1 y 2v2, eliminación directa o fase de grupos seguida de eliminación, lista de espera, partidas creadas automáticamente, espectadores registrados, premios, emails y avisos dentro del juego.

La entrega debe reutilizar los motores actuales de Truco sin debilitar sus permisos ni alterar el comportamiento de las partidas normales.

<a id="contrato-torneos-4-decisiones-de-producto-cerradas"></a>

#### 4. Decisiones de producto cerradas

Estas decisiones no se vuelven a consultar en cada sesión. Solo cambian si el dueño del producto lo pide explícitamente.

<a id="contrato-torneos-41-configuracion-del-torneo"></a>

##### 4.1 Configuración del torneo

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

<a id="contrato-torneos-42-combinaciones-validas"></a>

##### 4.2 Combinaciones válidas

El partido por el tercer puesto se genera siempre que haya semifinales (salvo si ambos aspirantes están descalificados) y los grupos siempre tienen cuatro competidores. Por eso, no todas las combinaciones de modalidad, formato y cupo permiten cumplir las reglas:

| Modalidad | Formato | Cupos válidos | Motivo |
| --- | --- | --- | --- |
| 1v1 | Eliminación directa | 4, 8, 16, 32 jugadores | Desde cuatro jugadores existen semifinales y tercer puesto |
| 1v1 | Grupos + eliminación | 8, 16, 32 jugadores | Se necesitan al menos dos grupos de cuatro |
| 2v2 | Eliminación directa | 8, 16, 32 jugadores | Ocho jugadores forman cuatro equipos |
| 2v2 | Grupos + eliminación | 16, 32 jugadores | Se necesitan al menos dos grupos de cuatro equipos |

La interfaz de administración y la base de datos deben rechazar las combinaciones restantes. Esta restricción deriva de tres decisiones ya tomadas: cupos expresados en jugadores, grupos de cuatro y tercer puesto siempre disputado.

<a id="contrato-torneos-43-quien-puede-participar-y-mirar"></a>

##### 4.3 Quién puede participar y mirar

- Puede inscribirse cualquier usuario registrado real.
- Un usuario anónimo/invitado de Supabase, bot o cuenta de prueba no puede inscribirse ni hacer check-in.
- Solo usuarios registrados pueden mirar partidas como espectadores.
- Un participante puede jugar partidas normales mientras el torneo está en curso, excepto cuando tenga un cruce de torneo en estado `ready` listo para entrar.
- Esa restricción se controla en los RPC de creación/unión de partidas normales; no alcanza con deshabilitar botones en el cliente.

<a id="contrato-torneos-44-inscripcion-parejas-y-lista-de-espera"></a>

##### 4.4 Inscripción, parejas y lista de espera

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

<a id="contrato-torneos-45-check-in-y-reemplazos"></a>

##### 4.5 Check-in y reemplazos

- El check-in abre **30 minutos antes** y cierra a la hora programada de inicio.
- El check-in se realiza desde el lobby o desde el detalle del torneo.
- En 1v1, cada participante confirma su propia presencia.
- En 2v2, cualquiera de los dos integrantes confirma al equipo completo.
- Si una inscripción no hace check-in, se reemplaza automáticamente por la primera inscripción compatible de la lista de espera.
- Para reemplazar un equipo completo se usa primero una pareja confirmada en espera y, si no existe, dos jugadores solos disponibles.
- Si un integrante de una pareja confirmada no entra a su partida, se reemplaza al ausente con el primer jugador solo disponible en espera.
- Los reemplazos respetan el orden de espera, quedan auditados y nunca modifican resultados ya terminados.
- Un reemplazo manual del administrador afecta los cruces futuros y hereda la posición competitiva de la inscripción reemplazada; no reescribe partidas pasadas.

<a id="contrato-torneos-46-inicio-con-cupo-incompleto"></a>

##### 4.6 Inicio con cupo incompleto

Si llega la hora y el torneo no está lleno, el administrador ve el plantel confirmado y elige iniciar o cancelar.

- En eliminación directa se puede iniciar con `bye` siempre que existan al menos cuatro competidores: cuatro jugadores en 1v1 o cuatro equipos completos en 2v2.
- En grupos solo se puede iniciar con grupos completos de cuatro y al menos dos grupos. Si la cantidad confirmada no cumple esa estructura, el panel debe explicar por qué todavía no se puede iniciar; el administrador puede completar/reemplazar el plantel o cancelar.
- Por ejemplo, 12 confirmados de un cupo de 16 permiten iniciar tres grupos completos de cuatro, con pases directos donde corresponda en la llave.
- Nunca se elimina el partido por el tercer puesto para acomodar un plantel incompleto.

<a id="contrato-torneos-47-competencia"></a>

##### 4.7 Competencia

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
- El partido por el tercer puesto enfrenta a quienes pierdan las semifinales; si ambos están descalificados, se cancela, el bronce queda vacante y la final puede cerrar el torneo.
- La mesa de cada cruce la crea el sistema. En el detalle aparece un botón **Entrar a la partida**.
- Desde que el cruce queda listo, los participantes tienen cinco minutos para entrar.
- Si al vencer el plazo un lado está completo y el otro no, el lado completo gana por ausencia. Si ambos lados están incompletos, el cruce queda detenido para resolución administrativa; no se inventa un ganador.
- En 2v2, si falta una sola persona, antes de declarar ausencia se intenta el reemplazo automático con el primer jugador solo en espera.
- Pausar un torneo impide abrir nuevos cruces o rondas. Las partidas que ya están en curso pueden terminar y guardar su resultado; la progresión queda retenida hasta reanudar.
- Las partidas del torneo cuentan para estadísticas y misiones normales.
- El registro del resultado, el avance de estadísticas/misiones y la progresión del torneo deben ser idempotentes: una partida cuenta exactamente una vez aunque haya reintentos o eventos duplicados.
- Las partidas de torneo no tienen apuesta normal: `bet = 0`. Las monedas se entregan únicamente por posición final.
- No se ofrece revancha en una partida de torneo. La pantalla final vuelve al detalle del torneo.

<a id="contrato-torneos-48-premios"></a>

##### 4.8 Premios

- Reciben premio el primer, segundo y tercer puesto.
- Se entregan insignias genéricas de oro, plata y bronce visibles en el perfil.
- El administrador configura las monedas de cada puesto al crear el torneo.
- El valor configurado es **monedas por jugador**. En 2v2, cada integrante del equipo recibe el importe completo de su puesto.
- Premios e insignias se acreditan una sola vez mediante una clave idempotente por torneo, usuario y puesto.

<a id="contrato-torneos-49-emails-y-avisos-dentro-del-juego"></a>

##### 4.9 Emails y avisos dentro del juego

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
- Reprogramar incrementa una versión de agenda. Los recordatorios de versiones anteriores se cancelan o se ignoran. Los anuncios aún no enviados se conservan con la agenda actual y la misma clave de entrega; no se repiten los ya enviados.
- El despacho de torneos envía como máximo cinco solicitudes por minuto, preservando la prioridad de partidas y check-in. Los rechazos por exceso de solicitudes vuelven a pendientes y se reintentan automáticamente sin consumir intentos.
- El cupo diario de Resend posterga los correos de torneos hasta las 00:01 UTC, sin consumir el máximo de seis intentos. Los demás fallos mantienen ese máximo y los avisos vencidos siguen descartándose al enviar.
- Cada aviso dentro del juego tiene fecha de lectura y puede alimentar un indicador de no leídos.

<a id="contrato-torneos-410-administracion"></a>

##### 4.10 Administración

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

<a id="contrato-torneos-411-central-de-torneos-y-lobby"></a>

##### 4.11 Central de torneos y lobby

- El lobby incorpora un acceso visual de torneos, con una jerarquía similar al cofre de misiones diarias pero como componente separado.
- Abre `/torneos`.
- La central muestra próximos, activos y anteriores.
- Cada torneo tiene una vista de detalle con estado, cuenta regresiva, reglas, cupo, participantes/equipos, lista de espera propia, check-in, grupos o llave, partidas y posiciones finales.
- Los estados importantes se actualizan sin exigir recargar la página, mediante Realtime en datos públicos seguros o refetch/polling acotado.
- El diseño debe funcionar en móvil y escritorio, con foco visible, navegación por teclado y mensajes de error comprensibles.

<a id="contrato-torneos-5-alcance-que-no-pertenece-a-la-primera-version"></a>

#### 5. Alcance que no pertenece a la primera versión

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

<a id="contrato-torneos-6-arquitectura-actual-que-debe-respetarse"></a>

#### 6. Arquitectura actual que debe respetarse

<a id="contrato-torneos-61-aplicacion"></a>

##### 6.1 Aplicación

- Next.js 14 con App Router, React, TypeScript, Tailwind y Supabase.
- Las páginas nuevas siguen el patrón Server Component para el primer render y Client Components pequeños para interacción en vivo.
- Las consultas independientes se ejecutan en paralelo para evitar cascadas de espera.
- La funcionalidad se protege inicialmente con `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` y solo se activa públicamente en la quinta etapa.

<a id="contrato-torneos-62-motor-1v1"></a>

##### 6.2 Motor 1v1

- Usa `tables`, `games` y `game_hands`, con RPC como `start_game` y `finish_game`.
- `create_table` cobra una apuesta mínima y no debe usarse directamente para el torneo.
- Se necesita una ruta interna confiable que cree mesa/partida con `bet = 0`, vinculada a un `tournament_match`.
- El cierre actual puede reutilizar estadísticas, historial y misiones si el resultado del torneo se engancha de forma idempotente.

<a id="contrato-torneos-63-motor-2v2"></a>

##### 6.3 Motor 2v2

- Usa `team_tables`, `team_seats`, `team_games`, `team_hands` y funciones en `team_internal`.
- La restricción actual de `team_tables.bet` exige apuesta; debe adaptarse de forma segura para permitir cero solo en partidas vinculadas a torneos creadas por el servidor.
- El cierre 2v2 actual no actualiza estadísticas, historial ni misiones como el flujo 1v1. La etapa 4 debe agregar ese comportamiento para torneos sin cambiar las partidas normales.
- `team_snapshot` es para participantes. Los espectadores necesitan una proyección nueva y segura.

<a id="contrato-torneos-64-misiones-estadisticas-e-insignias"></a>

##### 6.4 Misiones, estadísticas e insignias

- `objective_game_events` está ligado al modelo 1v1 y su enumeración no contempla torneos 2v2.
- Conviene extraer un helper interno general de avance de objetivos, con una clave de evento idempotente, en lugar de simular partidas 1v1.
- En torneos 2v2 se actualizan `games_played`, `games_won` y `games_lost` una sola vez por cada humano y se avanzan las misiones humanas/públicas correspondientes una sola vez.
- Las insignias existentes se apoyan en `medals`, `profile_medals`, `profiles.active_medal`, `player_medals` y el catálogo TypeScript de `src/lib/medallas.ts`.
- Se agregan tres identificadores genéricos, por ejemplo `torneo_oro`, `torneo_plata` y `torneo_bronce`.

<a id="contrato-torneos-65-emails"></a>

##### 6.5 Emails

- Reutilizar `src/lib/email/process.ts`, `src/lib/email/content.ts`, `src/lib/email/resend.ts`, `email_preferences`, `email_deliveries` y el patrón de trabajos de noticias inmediatas.
- Conservar baja de suscripción, deduplicación, trazabilidad y procesamiento por lotes.
- Agregar tipos/trabajos propios de torneo; no forzar estos eventos dentro del cron diario configurado en `vercel.json`.

<a id="contrato-torneos-7-modelo-de-datos-objetivo"></a>

#### 7. Modelo de datos objetivo

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

<a id="contrato-torneos-71-integridad-y-concurrencia"></a>

##### 7.1 Integridad y concurrencia

- Restricciones `CHECK` para modalidad, formato, cupo, puntaje, premios no negativos y combinaciones válidas.
- Índice único parcial para impedir dos membresías activas del mismo usuario en un torneo.
- Índices en todas las claves foráneas y columnas usadas por cron, estado, fecha, torneo y usuario.
- Bloqueo de fila o advisory lock al ocupar el último cupo, aceptar una invitación, promocionar desde espera, congelar el plantel, finalizar un cruce y acreditar premios.
- Claves únicas para sorteo generado, resultado aplicado, evento de misión, premio, notificación y email. Reintentar nunca duplica efectos.
- El sorteo y la conformación de la llave se persisten; no se recalculan en cada lectura.
- Las bajas, reemplazos y acciones administrativas guardan autor, momento y motivo.

<a id="contrato-torneos-72-seguridad"></a>

##### 7.2 Seguridad

- Todas las tablas públicas tienen RLS activado.
- El cliente solo lee proyecciones permitidas y muta mediante RPC autorizados; no tiene escritura directa a tablas de torneo.
- Las colas de email, acreditaciones y datos internos no son legibles por clientes.
- Helpers sensibles viven en un esquema como `tournament_internal`, sin `USAGE` para `anon` ni `authenticated`.
- Una función `SECURITY DEFINER` se usa solo cuando es necesaria, con `search_path = ''`, nombres calificados, controles explícitos y grants mínimos.
- Cada RPC nueva se incorpora a `scripts/check-rpc-allowlist.mjs` con su permiso deliberado.
- Las RPC de participación verifican usuario autenticado **y no anónimo**. Las RPC administrativas verifican `profiles.is_admin` dentro de la transacción.
- Realtime solo publica estado de torneo, cruces y notificaciones seguras. Nunca publica manos, cartas rivales, destinatarios de email ni tablas internas.

<a id="contrato-torneos-73-rpc-y-procesos-esperados"></a>

##### 7.3 RPC y procesos esperados

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

<a id="contrato-torneos-8-experiencia-de-usuario-objetivo"></a>

#### 8. Experiencia de usuario objetivo

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

<a id="contrato-torneos-9-plan-de-cinco-prsesiones"></a>

#### 9. Plan de cinco PR/sesiones

<a id="contrato-torneos-pr-1-base-de-datos-seguridad-y-contrato"></a>

#### PR 1 — Base de datos, seguridad y contrato

<a id="contrato-torneos-empieza-cuando"></a>

##### Empieza cuando

- Este documento está fusionado en `master`.
- El árbol de trabajo parte limpio del último `master`.
- No existen objetos de torneo aplicados fuera de migraciones versionadas o, si existiera un experimento previo, fue inventariado antes de continuar.
- La funcionalidad sigue apagada y no hay usuarios dependiendo de ella.

<a id="contrato-torneos-alcance-exacto"></a>

##### Alcance exacto

1. Crear las migraciones del modelo principal, índices, restricciones, RLS, esquema interno y auditoría.
2. Definir el ciclo de estados y los contratos TypeScript compartidos.
3. Implementar las RPC de lectura básica y las mutaciones de administración, inscripción, invitación, retiro y check-in necesarias para fijar el contrato, aunque todavía no creen partidas.
4. Resolver de forma transaccional el último cupo, lista de espera, aceptación de pareja y check-in.
5. Incorporar el feature flag `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` sin mostrar todavía la experiencia pública.
6. Agregar pruebas SQL de permisos, restricciones e idempotencia/concurrencia y actualizar la allowlist de RPC.
7. Actualizar los scripts de reconstrucción/snapshot que el repositorio utilice, sin editar migraciones históricas.

<a id="contrato-torneos-fuera-de-esta-pr"></a>

##### Fuera de esta PR

- Pantallas completas.
- Creación de partidas 1v1 o 2v2.
- Sorteos y progresión competitiva.
- Emails reales, espectadores y premios.

<a id="contrato-torneos-termina-cuando"></a>

##### Termina cuando

- Una reconstrucción completa de la base aplica todas las migraciones sin errores.
- Las pruebas demuestran que un usuario común no ejecuta acciones de admin y un usuario anónimo no se inscribe.
- Dos solicitudes simultáneas al último lugar no sobrecargan el cupo ni duplican membresías.
- Aceptar una invitación o hacer check-in dos veces produce un único efecto.
- Las combinaciones inválidas de modalidad/formato/cupo fallan también en la base.
- `npm run check:rpc-allowlist`, las pruebas SQL agregadas y las verificaciones existentes pasan.
- No cambió el comportamiento de partidas, emails ni misiones existentes.
- El PR contiene instrucciones exactas para aplicar la migración y este documento tiene su traspaso actualizado.

<a id="contrato-torneos-entrega-a-la-sesion-siguiente"></a>

##### Entrega a la sesión siguiente

- Fusionar el PR y aplicar su SQL en los entornos indicados.
- Mantener el feature flag apagado.
- Registrar nombres finales de tablas/RPC si difieren de los propuestos.

<a id="contrato-torneos-pr-2-administracion-central-inscripcion-y-check-in"></a>

#### PR 2 — Administración, central, inscripción y check-in

<a id="contrato-torneos-empieza-cuando-1"></a>

##### Empieza cuando

- PR 1 está fusionado.
- Sus migraciones están aplicadas y verificadas en el entorno de desarrollo/prueba correspondiente.
- Las RPC de inscripción y administración tienen pruebas verdes.
- El feature flag continúa apagado para el público general.

<a id="contrato-torneos-alcance-exacto-1"></a>

##### Alcance exacto

1. Crear `/admin/torneos`, alta, edición, borrador, publicación, reprogramación y cancelación.
2. Validar modalidad, formato, cupo, fecha, puntaje y monedas tanto en formulario como en servidor.
3. Agregar el acceso de Torneos al menú `/admin`.
4. Crear `/torneos` y `/torneos/[id]` con próximos, activos, anteriores y detalle.
5. Implementar inscripción 1v1, inscripción 2v2 individual, invitación de compañero, aceptación/rechazo, retiro y lista de espera.
6. Implementar check-in, estados y reemplazos previos al inicio que ya estén definidos en PR 1.
7. Agregar el acceso/emoji de torneos al lobby para móvil y escritorio detrás del feature flag.
8. Actualizar los datos visibles de forma segura con Realtime o refetch controlado.
9. Cubrir accesibilidad, estados vacíos, carga, errores y confirmaciones destructivas.

<a id="contrato-torneos-fuera-de-esta-pr-1"></a>

##### Fuera de esta PR

- No se crean ni disputan partidas de torneo.
- No se sortea la llave definitiva.
- No se envían emails reales.
- No se entregan premios ni se habilitan espectadores.

<a id="contrato-torneos-termina-cuando-1"></a>

##### Termina cuando

- Un admin puede crear, editar, publicar, reprogramar y cancelar un torneo válido.
- Un usuario registrado puede anotarse solo o con invitación, retirarse a tiempo, pasar a espera y hacer check-in.
- Un invitado/anónimo ve la información permitida pero no logra inscribirse usando UI ni RPC.
- Los cambios de cupo, espera y check-in se reflejan correctamente en dos clientes simultáneos.
- Las combinaciones inválidas están bloqueadas y los mensajes explican el motivo.
- La experiencia funciona en móvil y escritorio y no desplaza controles esenciales del lobby.
- `npm run lint`, `npm run build`, las pruebas SQL y las verificaciones existentes pasan.
- El PR incluye evidencia manual de los recorridos y el registro de traspaso está actualizado.

<a id="contrato-torneos-entrega-a-la-sesion-siguiente-1"></a>

##### Entrega a la sesión siguiente

- Fusionar y aplicar cualquier migración nueva.
- Mantener públicamente apagado el feature flag; puede activarse solo en preview para validar interfaz.
- Dejar documentados IDs/datos de prueba reutilizables, sin secretos.

<a id="contrato-torneos-pr-3-torneos-1v1-y-formatos-competitivos"></a>

#### PR 3 — Torneos 1v1 y formatos competitivos

<a id="contrato-torneos-empieza-cuando-2"></a>

##### Empieza cuando

- PR 2 está fusionado y sus migraciones aplicadas.
- Alta, publicación, inscripción, espera y check-in funcionan de punta a punta.
- No hay errores conocidos que puedan corromper cupos o membresías.
- La modalidad 2v2 permanece explícitamente no disponible para jugar.

<a id="contrato-torneos-alcance-exacto-2"></a>

##### Alcance exacto

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

<a id="contrato-torneos-fuera-de-esta-pr-2"></a>

##### Fuera de esta PR

- Integración jugable 2v2.
- Emails, premios definitivos y espectador público registrado.

<a id="contrato-torneos-termina-cuando-2"></a>

##### Termina cuando

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

El PR 3 se cierra como entrega de código y SQL por decisión del dueño el 2026-09-25. Los recorridos manuales completos de cuatro jugadores por eliminación y ocho con grupos no se informaron como realizados; la condición prevista para empezar PR 4 quedó diferida y se arrastra como requisito del lanzamiento de PR 5, no como prueba ya superada.

<a id="contrato-torneos-entrega-a-la-sesion-siguiente-2"></a>

##### Entrega a la sesión siguiente

- Fusionar y aplicar SQL.
- Dejar 1v1 estable en preview y 2v2 marcado como no disponible.
- Entregar helpers idempotentes de resultado/objetivos listos para reutilizar.

<a id="contrato-torneos-pr-4-integracion-completa-2v2"></a>

#### PR 4 — Integración completa 2v2

<a id="contrato-torneos-empieza-cuando-3"></a>

##### Empieza cuando

- PR 3 está fusionado y aplicado.
- Los dos recorridos 1v1 de aceptación siguen pasando.
- Existe un único mecanismo idempotente para aplicar resultados y avanzar torneos.
- La relación entre `tournament_match` y partida 1v1 está estable y sirve de patrón.

<a id="contrato-torneos-alcance-exacto-3"></a>

##### Alcance exacto

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

<a id="contrato-torneos-fuera-de-esta-pr-3"></a>

##### Fuera de esta PR

- Campaña de emails, experiencia final de espectadores y acreditación pública de premios.

<a id="contrato-torneos-termina-cuando-3"></a>

##### Termina cuando

- Se completa un torneo 2v2 de ocho jugadores por eliminación directa.
- Se completa uno de dieciséis jugadores con dos grupos y eliminación.
- Se prueban invitación aceptada, sorteo de solos, solo impar y reemplazo de un integrante ausente.
- Los cuatro humanos reciben estadísticas/misiones una vez y no se mueven monedas por apuesta.
- Reintentos simultáneos no duplican asiento, reemplazo, resultado ni progreso.
- No se filtran manos o cartas ocultas.
- Las partidas 2v2 normales mantienen sus reglas y apuestas actuales.
- Todos los checks de PR 3 más las pruebas 2v2 nuevas pasan.
- El traspaso deja ambos modos jugables y documenta la migración aplicada.

<a id="contrato-torneos-entrega-a-la-sesion-siguiente-3"></a>

##### Entrega a la sesión siguiente

- Fusionar y aplicar SQL.
- Mantener el lanzamiento general apagado hasta terminar comunicaciones, espectadores, premios y revisión final.

<a id="contrato-torneos-pr-5-comunicaciones-espectadores-premios-y-lanzamiento"></a>

#### PR 5 — Comunicaciones, espectadores, premios y lanzamiento

<a id="contrato-torneos-orden-concreto-de-puesta-en-marcha"></a>

##### Orden concreto de puesta en marcha

**Secuencia histórica, completada el 2026-09-27.** Se conserva para entender el despliegue y la reversión; no volver a ejecutar la migración ni los comandos de activación como parte de esta implementación.

1. Revisar y fusionar el PR 5. `NEXT_PUBLIC_ENABLE_TOURNAMENTS` permanece en `false` en producción.
2. En el SQL Editor del proyecto Supabase de Trucazo, ejecutar **solo** `supabase/migrations/20260927001608_tournaments_communications_awards.sql`. No repetir las migraciones anteriores. El trabajo `trucazo-tournament-emails-minute` se instala cada minuto, pero su interruptor privado comienza en `false`: todavía no envía nada.
3. En preview con flag encendido, completar y registrar los cuatro recorridos pendientes: 1v1 directa 4, 1v1 grupos 8, 2v2 directa 8 jugadores y 2v2 grupos 16 jugadores. Verificar final, tercer puesto, check-in, reemplazos, partidas normales y pruebas con dos clientes; revisar permisos de espectador registrado e invitado, correos en cola, monedas por jugador, insignias y cancelación/reprogramación. Los tests de CI comprueban el contrato SQL, pero no sustituyen estos recorridos.
4. Revisar que no queden torneos de prueba publicados ni correos de prueba pendientes en la cola. Publicar el primer torneo real solo cuando corresponda. Habilitar el despacho desde el SQL Editor con `update tournament_internal.email_settings set enabled = true where singleton;`. Comprobar el cron y un correo de prueba real, preferencias y baja.
5. Cambiar `NEXT_PUBLIC_ENABLE_TOURNAMENTS` a `true` para producción en Vercel y hacer un nuevo despliegue. Comprobar lobby, central, partida de espectador, panel de admin y avisos desde el dominio público. Vigilar trabajos `failed`, correos duplicados, plazos y premios en el primer torneo.

**Reversión:** poner `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false`, redesplegar y correr `update tournament_internal.email_settings set enabled = false where singleton;` en el SQL Editor. El cron queda sin despacho; no borrar partidas, correos históricos ni premios ya acreditados. Toda corrección posterior de la base requiere una migración nueva.

<a id="contrato-torneos-empieza-cuando-4"></a>

##### Empieza cuando

- PR 4 está fusionado y aplicado.
- Los recorridos manuales mínimos de 1v1 y 2v2 deben estar confirmados antes del lanzamiento. Si todavía no se registraron, PR 5 puede empezar su implementación, pero debe mantenerlos como pendientes explícitos: ni CI ni SQL sustituyen esa aceptación.
- La funcionalidad continúa apagada para el lanzamiento general.
- No existen errores abiertos de integridad, permisos, cupos, resultados o monedas.

Al iniciar PR 5, partir del último `master` que incluye el merge de PR 4 (`8cdb5149d0bc612f9595176d2619428523467c3c`). No volver a ejecutar las migraciones de PR 1–4; cualquier corrección del SQL ya aplicado necesita una migración nueva y posterior. Confirmar que el flag sigue apagado antes de cambiar comunicaciones, premios o espectadores. La aceptación manual pendiente de PR 3 y PR 4 es condición para activar el flag y dar por terminado PR 5, no motivo para inventar resultados ni para repetir etapas anteriores.

<a id="contrato-torneos-alcance-exacto-4"></a>

##### Alcance exacto

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

<a id="contrato-torneos-termina-cuando-4"></a>

##### Termina cuando

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

<a id="contrato-torneos-entrega-final"></a>

##### Entrega final

- Feature flag habilitado en producción solamente después del smoke test.
- Monitorear errores, cola de emails, expiraciones y duplicados durante el primer torneo real.
- Cualquier mejora no incluida en la versión inicial se abre como trabajo separado.

<a id="contrato-torneos-10-matriz-global-de-aceptacion"></a>

#### 10. Matriz global de aceptación

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

<a id="contrato-torneos-11-secuencia-de-lanzamiento-y-reversion"></a>

#### 11. Secuencia de lanzamiento y reversión

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

<a id="contrato-torneos-12-registro-de-traspaso-entre-sesiones"></a>

#### 12. Registro de traspaso entre sesiones

Cada sesión agrega una entrada. No se borra el historial previo. Las entradas anteriores son fotografías fechadas; consultar la última entrada para el estado actual.

<a id="contrato-torneos-plantilla"></a>

##### Plantilla

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

<a id="contrato-torneos-2026-09-20-documento-base"></a>

##### 2026-09-20 — Documento base

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

<a id="contrato-torneos-2026-09-21-pr-1-base-de-datos-seguridad-y-contrato"></a>

##### 2026-09-21 — PR 1 — Base de datos, seguridad y contrato

- Estado: Completo
- Rama: `codex/tournaments-base-contract`
- PR: [#75 — feat: establecer base segura para torneos](https://github.com/santibpapa/trucazo/pull/75)
- Commit final de implementación y pruebas: `e6e0bcfe2a9bb99d02003e2a691b676fd38af3ea`
- Merge en `master`: `5508b9f7a1dfb7ac4dcb95a667a3fa740c71f7cb`
- Migraciones nuevas: `supabase/migrations/20260921082456_tournaments_base_contract.sql`
- SQL aplicado en: proyecto Supabase conectado, después del merge del PR #75; verificación posterior completa con tablas, RPC, firma exacta de invitaciones, prioridad de espera, permisos y RLS en estado correcto
- Feature flag: variable pública `NEXT_PUBLIC_ENABLE_TOURNAMENTS` creada con valor `false`; debe permanecer así hasta la habilitación pública prevista para PR 5
- Pruebas automáticas ejecutadas: reconstrucción completa desde cero; todas las pruebas SQL existentes; seguridad, privilegios, restricciones e idempotencia de torneos; concurrencia real por el último cupo y por retiro frente a inscripción nueva; prioridad de espera; respuesta a una invitación exacta; reinvitación con historial; invalidación de check-in al reprogramar; TypeScript; ESLint; allowlist de RPC; verificaciones de regresión; build de producción. Todo pasó en [GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/35606239349)
- Recorridos manuales ejecutados: revisión del contrato de lectura, administración, inscripción, invitación, retiro y check-in; no hay recorrido de interfaz porque la UI queda fuera de PR 1 y apagada
- Decisiones técnicas tomadas: tablas públicas sin acceso directo del cliente; estado interno, auditoría e idempotencia en esquema privado; mutaciones mediante RPC `security definer` con `search_path` vacío; bloqueo de la fila del torneo para serializar cupos, promociones, parejas y check-in; toda respuesta identifica la invitación exacta; los reintentos de invitación conservan historial; reprogramar invalida confirmaciones de presencia; contratos TypeScript compartidos y autoridad final del servidor
- Problemas pendientes o riesgos: todavía no existen UI, sorteos, partidas, progresión, emails, espectadores ni entrega de premios; es el alcance previsto de las PR siguientes y nada se expone mientras el flag siga apagado
- Para que empiece PR 2 falta: nada; PR #75 está fusionado, la migración fue aplicada y verificada, las pruebas están verdes y el feature flag permanece apagado. La próxima sesión debe partir del último `master`.

<a id="contrato-torneos-2026-09-22-pr-2-administracion-central-inscripcion-y-check-in"></a>

##### 2026-09-22 — PR 2 — Administración, central, inscripción y check-in

- Estado: Completo
- Rama: `codex/tournaments-admin-registration`
- PR: [#78 — feat: implementar administración e inscripciones de torneos](https://github.com/santibpapa/trucazo/pull/78)
- Commit de implementación: `526da902d8460ee3f1f7aee0bb04b63642eda68e`
- Commit final: `ac62606b413bd5d21241471f65438bc4a3c09bbc`
- Commit de merge: `84411b73c8ecdb2aa76927851f655cf8571554e1`
- Migraciones nuevas: `20260922071129_tournaments_public_projection.sql`
- SQL aplicado en: proyecto Supabase conectado después del merge; se verificaron el trigger de fecha futura, el ocultamiento de borradores no publicados y los permisos privados de la función interna
- Feature flag: `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` en producción; se habilitó únicamente en preview para validar la etapa
- Pruebas automáticas ejecutadas: TypeScript, ESLint, build de producción con el flag encendido, allowlist de RPC, formularios/horario argentino/combinaciones de torneos, regresión de lobby, presentación 2v2, emails, analítica, simulación del motor de Truco, reconstrucción completa y pruebas SQL. Todo pasó en [GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/35734663708)
- Correcciones de revisión: la invitación compara el usuario exacto sin interpretar `_` ni `%` como comodines; los reintentos de creación conservan el identificador original mientras los datos no cambien; los borradores permiten cancelar desde el mismo formulario y el enlace de regreso vuelve al listado
- Recorridos manuales ejecutados: el dueño validó en preview alta, edición, cancelación y publicación; central y detalle; inscripción 1v1/2v2; invitación y aceptación; retiro, espera y check-in; acceso de invitado sin inscripción y actualización entre sesiones
- Decisiones técnicas tomadas: primer render con Server Components; mutaciones solo por las RPC seguras del PR 1; refresco controlado cada 8 segundos en detalles y 15 segundos en listados para no abrir lectura directa ni publicar tablas privadas en Realtime; horario de formularios fijado a Argentina; los borradores cancelados dejan de filtrarse a jugadores y el servidor rechaza fechas nuevas en el pasado
- Problemas pendientes o riesgos: no se crean partidas, sorteos, emails ni premios porque pertenecen a etapas posteriores; no quedan bloqueos propios del PR 2
- Para que empiece PR 3 falta: nada; el PR 2 está fusionado, su SQL está aplicado y los recorridos fueron validados. La próxima sesión debe partir del último `master` y mantener el flag apagado en producción

<a id="contrato-torneos-2026-09-24-pr-3-competencia-1v1"></a>

##### 2026-09-24 — PR 3 — Competencia 1v1

- Estado: Completo como entrega de código y SQL por decisión del dueño el 2026-09-25; aceptación manual en preview diferida antes de PR 4
- Rama: `codex/tournaments-1v1-competition`
- PR: [#84 — feat: implementar competencia 1v1 de torneos](https://github.com/santibpapa/trucazo/pull/84)
- Commit final: `6649caa866dde4a4324c87a52100c30f9e3b36d4`; merge en `master`: `4afae7afa0e36a16ed64d80ca46a72b0a06acc80`
- Migraciones nuevas: `supabase/migrations/20260924172158_tournaments_1v1_competition.sql`
- SQL aplicado en: proyecto Supabase conectado, manualmente después del merge; el SQL Editor devolvió `schedule 8`. Lectura posterior de `cron.job` confirmó el trabajo `trucazo-tournament-1v1-minute`, activo cada minuto con `select tournament_internal.advance_due()`; sus tres ejecuciones recientes terminaron correctamente
- Feature flag: `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` en producción; no encender hasta PR 5
- Pruebas automáticas ejecutadas: reconstrucción de PostgreSQL y `supabase/tests/tournaments_competition.sql` para eliminación directa de cuatro, grupos de ocho y doce, pases, ausencia, revancha prohibida, apuestas cero, estadísticas y misiones sin duplicados, pausa, reapertura, reemplazo tardío sin check-in, descalificación después de grupos, doble descalificación en semifinales, mesa 2v2 preexistente e identidad histórica; además TypeScript, ESLint, controles de RPC, regresiones y build con el flag encendido. Todo pasó en [GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/36069141146)
- Recorridos manuales ejecutados: revisión del flujo de administrador, participante, mesa y pantalla de resultado contra el contrato; los torneos completos de cuatro jugadores por eliminación y ocho con grupos en preview siguen pendientes, no se presumen validados por el SQL ni por la CI
- Decisiones técnicas tomadas: cada sorteo y desempate se persiste en PostgreSQL; el cron por minuto abre el torneo lleno y resuelve plazos; los dos ingresos crean una sola mesa privada sin apuesta; una partida anulada conserva su historial y cada reapertura crea otra; el cierre existente contabiliza estadísticas y misiones en la misma transacción que avanza el torneo; las funciones privadas mantienen permisos cerrados. La revisión de #84 agregó confirmación automática al reemplazo manual después del cierre, grupos incompletos válidos con pases en la llave, bloqueo al iniciar un 2v2 ya armado y nombre histórico guardado al cerrar cada cruce. Si ambos perdedores de semifinales fueron descalificados, el tercer puesto queda vacante y la final puede cerrar sin inventar un ganador ni acreditar bronce
- Problemas pendientes o riesgos: completar y registrar los dos recorridos 1v1 en preview antes de iniciar PR 4; los premios, emails, espectadores y competencia 2v2 corresponden a etapas posteriores
- Para que empiece PR 4 falta: validar en preview un torneo 1v1 de cuatro por eliminación y otro de ocho con grupos, incluida final, tercer puesto y estado completado; mantener el flag apagado en producción. El merge, el SQL y los controles automáticos ya están confirmados

<a id="contrato-torneos-2026-09-25-pr-4-competencia-2v2"></a>

##### 2026-09-25 — PR 4 — Competencia 2v2

- Estado: Completo como entrega de código y SQL tras confirmación del dueño el 2026-09-25; aceptación manual en preview diferida antes del lanzamiento de PR 5.
- Rama: `codex/tournaments-2v2-competition`.
- PR: [#89 — feat: competencia 2v2 de torneos](https://github.com/santibpapa/trucazo/pull/89).
- Commit final de PR 4: `77b5fc8032d9bb042ac7c84541356362eb578da9`; merge en `master`: `8cdb5149d0bc612f9595176d2619428523467c3c`.
- Migraciones nuevas: `supabase/migrations/20260925103000_tournaments_2v2_competition.sql`; no repetirla en el mismo proyecto.
- SQL aplicado en: proyecto Supabase conectado, manualmente después del merge según confirmación del dueño; no se informó resultado del SQL Editor ni se realizó una lectura posterior independiente de la base.
- Feature flag: `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` en producción hasta PR 5.
- Pruebas automáticas: TypeScript, lint, contrato de RPC, build con flag encendido, reconstrucción PostgreSQL, regresiones 1v1/2v2, permisos y `supabase/tests/tournaments_teams.sql`. La última ejecución de [GitHub Actions](https://github.com/santibpapa/trucazo/actions/runs/36193479947) terminó correctamente, incluidos el cierre con «Tres rivales» y la prioridad de una pareja completa en espera.
- Recorridos manuales: no se informaron como realizados ni los torneos 2v2 de ocho jugadores por eliminación y dieciséis con grupos ni los reemplazos en preview. Los dos recorridos 1v1 de PR 3 tampoco constan como validados; verificar ambos modos antes del lanzamiento.
- Decisiones técnicas: emparejamiento aleatorio persistido al completar el cupo o iniciar; cada equipo ocupa una inscripción competitiva; cruce y mesa 2v2 comparten resultado idempotente; cuatro asientos fijados en el servidor; las misiones 2v2 usan eventos propios y los premios permanecen para PR 5.
- Revisión posterior: el desafío semanal de rivales humanos debía ordenar UUID en vez de aplicar `min(uuid)`, que impedía cerrar la partida; al iniciar con un equipo ausente y esperar primero un solo y después una pareja, la promoción debía elegir la pareja completa. Ambos escenarios se incorporaron a `supabase/tests/tournaments_teams.sql`.
- Problemas pendientes o riesgos: confirmar el resultado de la aplicación del SQL mediante una comprobación segura si hiciera falta; completar y registrar las matrices manuales 1v1/2v2, incluidos grupos, final, tercer puesto y reemplazos; no habilitar el flag mientras falten esas verificaciones.
- Para que empiece PR 5 falta: nada de código ni SQL de PR 4. Partir del último `master` y mantener el flag apagado; las pruebas manuales pendientes son obligatorias antes de declarar PR 5 terminado o activar el lanzamiento general.

<a id="contrato-torneos-2026-09-26-pr-5-comunicaciones-espectadores-y-premios"></a>

##### 2026-09-26 — PR 5 — Comunicaciones, espectadores y premios

- Estado a esa fecha: En curso. Entrega de código preparada; lanzamiento general pendiente. El cierre posterior está registrado en la entrada siguiente.
- Rama: `codex/tournaments-pr5`.
- PR: [#91 — feat: completar comunicaciones, espectadores y premios de torneos](https://github.com/santibpapa/trucazo/pull/91).
- Migración nueva: `supabase/migrations/20260927001608_tournaments_communications_awards.sql` (hora UTC del archivo).
- SQL aplicado en: todavía no; no ejecutar antes de fusionar el PR.
- Feature flag: `NEXT_PUBLIC_ENABLE_TOURNAMENTS=false` en producción. La migración instala la cola de emails con su interruptor privado en `false`.
- Pruebas automáticas: TypeScript, lint, build con flag encendido, contrato de RPC, comprobaciones de emails y torneos. La migración y sus escenarios de premios, agenda, cancelación y espectador se agregaron a CI para su ejecución en PostgreSQL aislado. Su resultado debe verificarse en el PR.
- Recorridos manuales: siguen sin registrarse los cuatro recorridos 1v1/2v2 pendientes de PR 3 y PR 4; también faltan las pruebas visuales y de envío en preview de PR 5.
- Decisiones técnicas: la base acredita monedas e insignias en la misma transacción que pasa el torneo a `completed`; cada premio tiene una clave única. Los correos tienen cola durable, versión de agenda, límite de reintentos y validación de destinatario al enviar. La vista de espectador es una proyección explícita sin manos; el cron de emails se instala con un interruptor cerrado.
- Problemas pendientes o riesgos: no consta aceptación manual de los modos y formatos; no se ha aplicado esta migración ni activado correo o flag. No declarar PR 5 completo hasta verificar esos puntos y el primer despliegue real.
- Para cerrar PR 5 falta: PR fusionado, migración aplicada una sola vez, pruebas manuales y smoke test, habilitar el despacho de correo y luego el flag, registrar fecha de lanzamiento y monitorear el primer torneo real.

<a id="contrato-torneos-2026-09-27-cierre-de-pr-5-y-lanzamiento-de-torneos"></a>

##### 2026-09-27 — Cierre de PR 5 y lanzamiento de torneos

- Estado: **Completo**. El dueño confirmó las pruebas manuales y dio por cerrada toda la implementación. Las cinco entregas están fusionadas y aplicadas; torneos quedó habilitado en producción el 2026-09-27 (hora de Argentina).
- Código: [#91 — comunicaciones, espectadores y premios](https://github.com/santibpapa/trucazo/pull/91), [#92 — logo de torneos en el lobby](https://github.com/santibpapa/trucazo/pull/92) y [#93 — ajuste del tamaño del logo](https://github.com/santibpapa/trucazo/pull/93) fusionados. El despliegue de producción verificado contiene el merge de #93 (`a31f17d1fe3e85c1a943d719693ce27a567e8ccb`).
- SQL: `supabase/migrations/20260927001608_tournaments_communications_awards.sql` ejecutada manualmente por el dueño después de fusionar #91; el cron `trucazo-tournament-emails-minute` quedó instalado como trabajo **#9** y activo cada minuto. No volver a ejecutar este SQL.
- Activación: `NEXT_PUBLIC_ENABLE_TOURNAMENTS=true` en producción; la ruta pública `/torneos` existe y responde con redirección de acceso para visitantes sin sesión. El interruptor privado `tournament_internal.email_settings.enabled` está en `true`. En la comprobación posterior el cron estaba activo y no había trabajos de email fallidos; tampoco había torneos activos ni correos pendientes.
- Pruebas: CI de #91 y #92 finalizó correctamente. El dueño informó que probó los recorridos manuales antes de la activación y confirmó el cierre; no se conservó aquí un acta detallada por combinación ni una evidencia independiente del primer correo real entregado.
- Seguimiento operativo: observar la cola y la entrega real de emails, expiraciones, avisos y premios en el primer torneo real. Esto es monitoreo posterior al lanzamiento, no una etapa de implementación abierta. El procedimiento de reversión permanece en §9.

<a id="contrato-torneos-2026-09-29-correccion-de-anuncios-al-reprogramar"></a>

##### 2026-09-29 — Corrección de anuncios al reprogramar

- Incidente: al reprogramar el primer torneo después de publicarlo se cancelaron 142 anuncios pendientes. Trece direcciones de prueba ya se habían descartado y siete anuncios ya estaban enviados.
- Migración: `supabase/migrations/20260929205313_tournament_announcement_delivery.sql`, aplicada directamente al proyecto Supabase conectado con autorización del dueño el 2026-09-29. **No volver a ejecutarla después del merge.**
- Recuperación: 141 destinatarios elegibles volvieron a la cola con la agenda actual; la dirección de prueba restante quedó descartada. Se conservaron los siete anuncios enviados.
- Comportamiento: una reprogramación conserva los anuncios pendientes y su clave de entrega; invalida el intento anterior y espera dos minutos si ya estaba en curso. Los recordatorios mantienen la cancelación por agenda. Alcanzar el cupo diario espera al siguiente día UTC sin consumir intentos.
- Validación local: reconstrucción PostgreSQL, pruebas de anuncios/reprogramación/cupo diario, torneos PR5, contrato de torneos y permisos de funciones. El cron de producción quedó activo y la cola recuperada se verificó después de aplicar el SQL.

<a id="contrato-torneos-2026-09-29-ritmo-de-envio-de-torneos"></a>

##### 2026-09-29 — Ritmo de envío de torneos

- Incidente: el despacho de veinte pedidos simultáneos superaba el límite por segundo de Resend. Los destinatarios rechazados aparecían como fallidos en administración.
- Migración: `supabase/migrations/20260929210343_tournament_email_rate_limit.sql`, aplicada directamente al proyecto conectado con autorización del dueño. **No volver a ejecutarla después del merge.**
- Corrección: máximo cinco solicitudes por minuto con un control persistente que evita otra tanda en el mismo período. Se mantiene la prioridad de partidas y check-in. Un rechazo `Too many requests` vuelve a pendientes para el próximo minuto sin consumir el máximo de intentos; los demás fallos conservan su tratamiento.
- Recuperación: los rechazos temporales aún válidos volvieron a pendientes, manteniendo sus claves de entrega. Se verificó una tanda de cinco aceptada por el proveedor; en ese momento había 83 anuncios enviados y 65 pendientes, sin fallos por exceso de pedidos.
- Validación local: pedidos HTTP simulados en una transacción, límite de cinco, repetición del despacho dentro del mismo minuto, reapertura del período, prioridad de partidas, reintento temporal, cupo diario, torneos PR5 y permisos de funciones.

</details>


<a id="chat-partidas"></a>

### Chat escrito en partidas

Alcance, privacidad, límites y pasos de activación guardados. Las migraciones ya aplicadas no deben repetirse.

Procedencia anterior: `chat-en-vivo.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Chat escrito en partidas</summary>

<a id="chat-partidas-chat-escrito-en-partidas-implementacion"></a>

### Chat escrito en partidas — implementación

Estado: chat escrito activado en producción con la migración inicial. La migración para incluir a los bots se aplica antes de desplegar el PR correspondiente.

<a id="chat-partidas-alcance"></a>

#### Alcance

En mesas 1v1 y 2vs2, incluidos torneos, con o sin bots, el botón de chat abre «Mensajes» y «Frases rápidas». Toda la mesa lee los mensajes. Los invitados sentados leen y siguen usando frases rápidas; el panel les avisa que solo registrados pueden escribir. Los bots **nunca escriben ni responden en el chat escrito**, aunque estén sentados en la mesa. Sus frases rápidas existentes siguen funcionando. En campaña **nunca** hay chat escrito: se mantienen únicamente las frases rápidas.

El panel se superpone a la partida y tiene su propia lista desplazable. Silenciar chat oculta avisos del texto libre durante esa partida, sin silenciar frases, cantos o sonidos. El chat no modifica la versión, los turnos ni los relojes del juego. Se desmonta al finalizar la mesa.

<a id="chat-partidas-datos-y-controles"></a>

#### Datos y controles

La migración inicial es `supabase/migrations/20260928023421_match_live_chat.sql`. Crea `match_chat_messages`, con lectura limitada por RLS a jugadores sentados, y `send_match_chat_message`, que exige usuario registrado, pertenencia y partida en juego. La migración posterior `supabase/migrations/20260928165300_match_chat_bots.sql` permite escribir a personas en mesas con bots, mantiene prohibido el envío desde perfiles bot y excluye la campaña también en la lectura. Los mensajes se limitan a 200 caracteres, un envío cada 3 segundos por autor, y el mismo texto cada 10 segundos por mesa. Cada intento usa un UUID: repetirlo con el mismo texto devuelve el mismo mensaje.

Los últimos 100 mensajes se recuperan al conectar, al reconectar y al volver a la pestaña. Realtime envía solo INSERT de la tabla; la consulta y los eventos se combinan por ID. No hay demoras artificiales ni dependencia del reloj del dispositivo para mostrar mensajes. Una tarea horaria borra mensajes de más de 72 horas. No hay archivo histórico. HTML y URLs se muestran como texto plano.

<a id="chat-partidas-verificacion"></a>

#### Verificación

- Ejecutados localmente: `npx tsc --noEmit`, `npm run lint`, `npm run check:rpc-allowlist`, `npm run check:match-chat`, `npm run build` y `bash -n` del script concurrente. El lint muestra advertencias antiguas de hooks en GameClient y LobbyClient. La recuperación espera la confirmación del receptor de Postgres Changes, además del alta del canal; los rechazos del servidor conservan su explicación en el formulario.
- `supabase/tests/match_chat.sql` y `supabase/tests/match_chat_concurrency.sh` corren dentro del trabajo de PostgreSQL del CI, después de `scripts/rebuild-db.sh`. Verificar el resultado del PR antes de mergear.
- Falta probar entrega real con dos sesiones Supabase en preview y la revisión visual en iPhone/Safari o PWA: teclado y botón Enviar visibles, texto legible, aviso para invitado y cartas en su lugar. La base local de CI prueba SQL/RLS; no prueba WebSocket.

**Comprobación posterior, 15/10/2026 — ANDROID-09:** envío y recepción escritos en ambos sentidos entre APK Android 11 y web Next local, usando QA3 y QA1 contra Supabase real, aprobados en mesa privada 2vs2 con un bot. Las frases rápidas y la contestación del compañero bot también se comprobaron en el APK. Esto resuelve la falta de evidencia de recepción real para ese entorno; no acredita iPhone/Safari, teléfono físico ni Play. No se enviaron mensajes a terceros ni se aplicaron migraciones.

<a id="chat-partidas-activacion"></a>

#### Activación

1. Ejecutar **solo la migración nueva** `20260928165300_match_chat_bots.sql` en el SQL Editor del proyecto Supabase de producción. La primera ya se aplicó. Este paso puede hacerse antes del merge porque la pantalla publicada todavía oculta el chat en partidas con bots.
2. Mergear el PR de chat con bots y esperar a que Vercel complete el despliegue de Production. Si no se dispara solo, hacer un redeploy. `NEXT_PUBLIC_ENABLE_MATCH_CHAT=true` ya está configurada y no necesita volver a crearse.
3. En partidas normales 1v1 y 2vs2 con personas y con bots, comprobar envío, recepción y frases rápidas. En campaña, comprobar que solo aparezcan frases rápidas. Revisar el panel con el teclado móvil abierto y cerrado.

Para ocultar el panel: poner el flag en `false` y redeploy. Las frases rápidas siguen funcionando. Si hace falta cerrar también el envío en la base, ejecutar `revoke execute on function public.send_match_chat_message(text,uuid,text,uuid) from authenticated;`. Para volver a habilitarlo tras revisar el problema: `grant execute on function public.send_match_chat_message(text,uuid,text,uuid) to authenticated;`.

</details>




<a id="accesos-chat-amigos"></a>

## Accesos a Chat y Amigos — 20/10/2026

**Cerrado por el dueño e integrado:** el
[PR #139](https://github.com/santibpapa/trucazo/pull/139) se incorporó a `master`
el 20/10/2026 a las 19:38 de Argentina, commit `55b9db56`. Se preparó desde
GitHub `master` `57f5290c` en una copia aislada, sin usar ni modificar la
carpeta de trabajo del dueño.

**Decisiones aprobadas:** acceso directo a Chat junto al perfil del lobby;
Amigos reemplaza el nombre Comunidad en la navegación, con el contador de
pendientes real. Se descartó la franja de amigos conectados del mockup.
La pantalla `/comunidad` conserva su título y sus pestañas Chat, Amigos,
Grupo y Novedades; Amigos sigue siendo su vista inicial.

El chat se abre sobre el lobby: abajo en celular y centrado en pantallas
mayores. Cierra con la cruz, Escape o al tocar afuera. El diálogo nativo
mantiene el foco dentro, lo devuelve al acceso al cerrar y bloquea el
desplazamiento del fondo. El historial se carga sólo al abrirlo. En compu
ancha se conserva el panel social existente; entre 1024 y 1279 px se ofrece
el botón Chat en el menú lateral, donde ese panel todavía no aparece.

El número en Amigos suma solicitudes de amistad recibidas e invitaciones
entrantes para jugar; desaparece cuando ambas listas están vacías. Reutiliza
`useCommunity`, su refresco cada 15 segundos y el aviso inmediato existente
de invitaciones. No representa amigos conectados ni mensajes sin leer;
no se agrega un contador fijo ni se cambia el contrato con la base.
El nombre accesible del enlace incluye la cantidad de pendientes.

**Verificación:** tipos y ESLint del archivo modificado aprobados. Prueba
de navegador con componentes reales, estilos del repositorio y HTTP simulado:
contador 1 → 2 → 0, envío, foco dentro del diálogo y regreso al botón,
los tres modos de cierre, controles de administrador sin superposición y
pantallas 320×568, 390×420, 1024×768 y 1440×900. Se conservó la comprobación
de carga: cero lecturas de chat al abrir el lobby móvil, una al mostrar
el panel de escritorio y dos lecturas de mesas en el ensayo de cada tamaño.
Esta prueba no equivale a una sesión manual con cuentas reales ni a una
medición de rendimiento contra producción.

**Cierre verificado:** para la última versión del PR, `3bdf5f98`, aprobaron
la [revisión general](https://github.com/santibpapa/trucazo/actions/runs/39508385512),
[invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39508385894),
[vidas](https://github.com/santibpapa/trucazo/actions/runs/39508385667) y el
control de Vercel. El dueño dio este trabajo por cerrado después de integrar.
No se acredita una prueba manual entre cuentas reales ni una comprobación
posterior del despliegue de producción. No queda implementación pendiente;
no requiere SQL, cambios de permisos ni configuración de Supabase.

<a id="globos-chat-escrito"></a>

## Globos del chat escrito — 20/10/2026

**Aplicado y cerrado por el dueño:** el
[PR #138](https://github.com/santibpapa/trucazo/pull/138) se integró en `master`
el 20/10/2026 a las 19:14 de Argentina, commit `de991d41`. El dueño confirmó
que quedó aplicado y dio el tema por cerrado. Se preparó desde GitHub `master`
`57f5290c`, en una copia aislada y sin incorporar cambios de su carpeta local.
No requiere SQL, variables nuevas ni cambios de permisos.

Los mensajes nuevos del chat escrito aparecen también en globos del lado de
su autor, en 1v1 y en los cuatro lugares de parejas. Conservan el estilo de las
frases rápidas, duran seis segundos desde su recepción y muestran el último
mensaje de cada persona. Los textos largos se ajustan hasta cuatro líneas;
el mensaje completo permanece en el panel. Los globos no reciben clics ni
modifican el espacio de cartas y controles. En parejas se limita su ancho para
que los dos costados no se superpongan.

Las frases rápidas/cantos que usan el mismo lugar tienen prioridad mientras
están visibles. Silenciar chat retira los globos escritos y oculta los nuevos;
el historial sigue disponible. No silencia cantos ni frases rápidas. Las lecturas
de historial al entrar, reconectar o recuperar foco no repiten mensajes como
globos. La confirmación de envío y Realtime se deduplican por ID; un envío
rechazado no aparece. Historia conserva únicamente sus frases rápidas y los
bots no empiezan a escribir ni responder.

**Verificación:** `check:match-chat:browser` usa los componentes reales de ambas
mesas con transporte y reloj controlados. Comprueba recepción, envío confirmado,
ambos órdenes de confirmación/Realtime, vencimiento sin repetición por duplicados,
último texto por autor, silencio con conservación del historial, rechazos,
prioridad de frases y mensajes de 200 caracteres. Revisa los cuatro lugares con
asiento propio distinto de cero, límites y ausencia de scroll a 320×640, 360×640,
390×844 y 1440×900; Historia no ofrece chat escrito. Se incorpora al CI después
de instalar Chromium. Este ensayo no certifica entrega por WebSocket real entre
dos dispositivos ni una partida manual en producción.

Tipos, ESLint (seis advertencias previas del 1v1), prueba existente de reconexión,
compilación de Next y generación de markdown aprobados. En la copia anidada,
ESLint se ejecutó explícitamente con `--no-eslintrc --config .eslintrc.json` para
evitar heredar la configuración de la carpeta local del dueño.

**Cierre verificado:** para `91afbb8c` aprobaron la
[revisión general](https://github.com/santibpapa/trucazo/actions/runs/39505915500),
[invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39505915395),
[vidas](https://github.com/santibpapa/trucazo/actions/runs/39505915588) y el control
de Vercel. La aplicación efectiva fue confirmada por el dueño; no se registra
una comprobación independiente posterior del despliegue ni una partida manual
entre dos dispositivos. No queda implementación ni activación pendiente.

<a id="nombres-bots-lobby"></a>

## Nombres de bots del lobby — 20/10/2026

**Aplicado en producción:** los 48 nombres rotativos fueron reemplazados por la
lista aprobada por el dueño. El
[PR #136](https://github.com/santibpapa/trucazo/pull/136) quedó integrado en
`master` (`84945989`), preparado desde GitHub
`master` `83aed0e4`, sin usar cambios del proyecto local.

La lista compartida se usa al crear/ocupar mesas 1v1 y al agregar bots de parejas.
La migración renueva también el perfil y el nombre visible de los creadores bot
en mesas 1v1 que siguen esperando, siempre que no tengan una partida iniciada.
Elige nombres libres sin distinguir mayúsculas; conserva dificultad, rasgos,
monedas, perfiles humanos y los nombres guardados en partidas/historial.
Al repetir el SQL, las mesas que ya usan un nombre nuevo no se renombran.

Migración: `supabase/migrations/20261020210435_refresh_lobby_bot_names.sql`.
El agente la aplicó con autorización explícita del dueño; Supabase la registró
como `20261020211318_refresh_lobby_bot_names`, con el mismo SQL.
**Ya está activa; no volver a ejecutarla como paso pendiente.** La comprobación
posterior encontró exactamente 48 nombres, cero faltantes y cero nombres extra.
Las dos mesas en espera mostraban `vale` y `agustinlp`, coincidentes con sus perfiles.

**Verificación:** consultas SQL dentro de transacciones con ROLLBACK comprobaron
la lista exacta, conservación de saldos/rasgos y nombres de partidas, e idempotencia.
El [CI general](https://github.com/santibpapa/trucazo/actions/runs/39498064478),
[invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39498064580) y
[vidas](https://github.com/santibpapa/trucazo/actions/runs/39498064663) aprobaron
para `1dce6d8f`. El cierre documental no modifica el SQL probado.
No requiere publicar código web ni cambiar variables, cron o permisos. Las
migraciones históricas permanecen intactas; la reconstrucción ya incluye todas en orden.

### Títulos de mesas automáticas — 20/10/2026

**Aplicado en producción e integrado:** el
[PR #137](https://github.com/santibpapa/trucazo/pull/137) quedó en `master`
(`b89a9cb2`). Las nuevas mesas automáticas eligen al azar, con igual probabilidad,
entre `Mesa de <creador>` y 24 frases cortas como `sale una`, `sin llorar` o
`una y me voy`. El título personal usa el apodo del bot después de renovarlo.
Las frases no anuncian puntos: desaparece `Vamos a 30`, que antes también podía
tocarle a una mesa a 15.

La migración nueva
`supabase/migrations/20261020213645_randomize_lobby_table_names.sql`
conserva el resto de `ensure_lobby_tables`: identidad, bloqueo, cantidad de mesas,
apuestas y puntajes. Renueva los siete títulos anteriores sólo en mesas públicas
de bots que todavía esperan; conserva mesas humanas, privadas, partidas
empezadas y títulos ya renovados. Repetirla no vuelve a cambiar esos títulos.

**Comprobación real:** Supabase registró
`20261020214936_randomize_lobby_table_names`, con el mismo SQL del archivo.
La función publicada coincide con la probada; anon sigue sin EXECUTE,
authenticated lo conserva y las tablas mantienen RLS. El asesor conserva los
46 avisos previos, sin avisos nuevos. Las dos mesas en espera mostraban
`Mesa de pablod` y `hoy gano yo`, sin títulos anteriores de bots en espera.
**Ya está activa: no volver a ejecutar el SQL como paso pendiente.**
No requiere publicar código web ni cambiar variables, cron o permisos.

**Pruebas:** PostgreSQL descartable (PGlite), función de creación real y helpers
de identidad/disponibilidad simulados: 320 mesas, 155 títulos personales y 165
casuales; aparecieron las 24 frases. Se comprobaron autenticación, tope de mesas,
apodo renovado antes del título, cobros, apuestas/puntos/tiempo y rasgos; también
el aislamiento de mesas humanas, privadas, jugando, terminadas y ya renovadas,
y la repetición segura. Este ensayo no certifica concurrencia ni Realtime reales.

Para `3c2a4763` aprobaron el
[CI general completo](https://github.com/santibpapa/trucazo/actions/runs/39502415597),
[invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39502415540),
[vidas](https://github.com/santibpapa/trucazo/actions/runs/39502415679) y Vercel.
La reconstrucción incluye la nueva migración; el cierre documental no cambia
el SQL probado. Fuente: GitHub `master` `43c90b91`, sin usar ni modificar el
proyecto local del dueño.

<a id="rendimiento-del-lobby-y-la-mesa"></a>

## Rendimiento del lobby y la mesa — 19/10/2026

**Estado:** implementación propuesta en el [PR #134](https://github.com/santibpapa/trucazo/pull/134),
verificada sobre el `master` remoto
`a6ddfc78870d51ae347888c40f37a732e0302fe0`, en una copia aislada. No usa cambios
de la carpeta de trabajo del dueño. Esta sección no acredita integración ni
publicación en producción; no requiere SQL ni ajustes de Supabase.

### Cambios y comparación

- El panel de amigos y chat de escritorio se importa y monta sólo desde 1280 px.
  Su contenedor conserva el espacio desde el HTML inicial para que no desplace
  el contenido al cargar.
  La insignia móvil de Comunidad mantiene sus datos. Cambiar el ancho monta o
  desmonta el panel, sin dejar su lectura de historial activa en celulares.
- El seguimiento de mesas propias usa Realtime y una consulta de respaldo cada
  diez segundos, suspendida con la pestaña oculta. Relee al conectar o recuperar
  visibilidad/red, agrupa avisos durante una lectura y descarta respuestas tras
  salir. El pedido vence a los ocho segundos. `id,games(status)` reemplaza las
  lecturas consecutivas de mesa y partida por una sola consulta con la relación
  1:1 existente. Una lectura fallida no navega; una partida terminada tampoco.
- Fondo y paño reutilizan su render mientras no cambie el salón. La pantalla
  final, vidas y progreso de objetivos se cargan cuando se muestran.
- Las tres cartas visibles mantienen prioridad. La precarga del resto espera a
  que cargue la página y otros 1500 ms; luego pide de a dos con prioridad baja y
  decodificación asíncrona. Al salir deja de pedir cartas nuevas. Se conserva el
  mazo completo en memoria para las siguientes manos: no se reduce su tamaño.
- Sólo `/cartas/`, `/mesa/` y `/personajes/` reciben caché pública de un día y
  revalidación en segundo plano hasta siete días más. Son nombres estables: al
  reemplazar arte que deba verse inmediatamente, usar un nombre nuevo. Sesiones,
  partidas, RPCs y HTML privado no reciben esta caché; `sw.js` sigue en `no-cache`.

Build de producción, mismos paquetes y variables ficticias, Node 24.19.0 y Next
14.2.35. Suma de los archivos JavaScript iniciales de cada ruta en
`.next/app-build-manifest.json`, comprimidos individualmente con gzip. No incluye
los módulos diferidos que aún no se montaron:

| Ruta | Antes, bytes gzip | Después, bytes gzip |
| --- | ---: | ---: |
| Lobby | 196.877 | 191.398 |
| Partida 1v1 | 207.073 | 192.980 |
| Partida 2vs2 | 187.593 | 187.420 |
| Portada, control | 104.720 | 104.899 |

La reducción inicial es 2,8% en lobby y 6,8% en 1v1. La portada aumenta 179 bytes
por el código compartido del cargador; no se atribuye una mejora allí.

Chrome sin ventana, componentes reales compilados en modo producción con React
18, navegación y HTTP simulados, sin cuentas ni partidas de producción:

| Prueba controlada | Antes | Después |
| --- | ---: | ---: |
| Lecturas de mesas en 6,2 s, móvil y escritorio | 7 | 2 |
| Lecturas del chat oculto en móvil | 1 | 0 |
| Lecturas del chat al ampliar a escritorio | 1 | 1 |
| Ejecuciones de fondo + paño, montaje y 12 actualizaciones sin cambiar salón | 26 | 2 |
| Ejecuciones tras cambiar realmente el salón | 28 | 4 |
| Cartas solicitadas en los primeros 200 ms del escenario de partida | 40 | 3 |
| Cartas solicitadas tras completar la precarga | 40 | 40 |

El inicio de una mesa pasa de dos pedidos consecutivos a uno. Las dos lecturas
totales del ensayo posterior incluyen la lista pública y el seguimiento propio;
no son dos consultas cada segundo. En régimen estable, el respaldo propio baja
de 60 a 6 consultas por minuto, más los avisos/reconexiones que realmente ocurran.

### Consultas, fuentes y scripts revisados

Se leyó `pg_stat_statements` de producción sin reiniciar estadísticas ni cambiar
datos. Acumula desde el 19/06/2026: no es una ventana reciente ni una comparación
antes/después del parche. Promedios agregados observados: `game_hands` 0,10 ms,
operaciones relacionadas con `tables` 1,49 ms, `team_lobby` 3,01 ms, `get_community`
16,66 ms, `bot_step` 22,91 ms y `get_my_objectives` 51,45 ms. Son tiempos de SQL,
sin transporte ni render. Por volumen, se priorizó eliminar pedidos repetidos y
la cadena mesa → partida; no se inventaron índices a partir de estos promedios.

Los avatares de creadores/amigos ya usan `.in(...)` y las medallas se solicitan
por lote: no se encontró un pedido HTTP por cada fila en esos recorridos.
Se mantiene el aislamiento de `game_hands`. No se cambian funciones del juego,
reglas, puntajes, monedas ni permisos. Las fuentes ya son locales
(`GeistVF.woff2`, 55.744 bytes, `display: swap`) y el mazo ya usa WebP (925.628
bytes en total). Se conservan las métricas de Vercel; no se añade otro SDK.

### Verificación y reproducción

- `npm run check:performance:browser`: contadores del lobby a 390/1440 px,
  ampliación del panel social, renders con/sin cambio de salón, precarga y
  aparición correcta de la pantalla final diferida. Playwright usa Chromium;
  `PERF_BROWSER_CHANNEL=chrome` permite usar Chrome instalado. `--baseline` al
  ejecutar el script informa los contadores sin exigir las optimizaciones.
- `npm run check:performance:bundle`, después del build: imprime los bytes y
  gzip iniciales para las cuatro rutas de la tabla.
- `node --import tsx scripts/check-started-table.ts`: nueve casos con SDK HTTP
  real y transporte/reloj controlados: lectura conjunta, evento inmediato,
  finalización anterior, partida aún sin crear, error, avisos simultáneos,
  pedido sin respuesta, visibilidad/red y salida. Se incorpora al CI junto al
  ensayo de navegador.
- Tipos, ESLint, build y generación de markdown aprobados. ESLint mantiene las
  seis advertencias previas del 1v1; desaparece la del seguimiento del lobby.
  Aprobaron también mesas del lobby, presencia, recuperación de reparto/tiempo,
  declaración de envido, chat, invitaciones, allowlist y contenido para agentes.
- El servidor de producción de Next en la copia aislada respondió el WebP de
  carta y el del salón con `public, max-age=86400,
  stale-while-revalidate=604800`; antes la carta respondía `public, max-age=0`.
  Se comprobó que `sw.js` conserva `no-cache`.

**Límites:** el ensayo de componentes no certifica SSR, Realtime por red real,
LCP, INP ni una mejora porcentual de tiempo de carga en producción. Los avisos y
fallos se prueban controladamente; los números de SQL son observaciones previas,
no un aumento de velocidad de la base. Próxima comprobación al integrar: comparar
las métricas de Vercel con tráfico real y entrar a una mesa desde dos dispositivos.

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

**En corto (30/10/2026):** el código está hecho y publicado, pero **apagado**. Los
jugadores no ven vidas ni las pierden. No hay que reprogramarlo: sólo prenderlo cuando
haya anuncios con premio. El dueño confirmó que AdSense sigue «preparando el sitio».
Aun aprobado, AdSense no alcanza: falta una cuenta de Google Ad Manager con un bloque
rewarded real (ver «Para retomar más adelante», al final de esta sección).

**Estado vigente — 19/10/2026:** la implementación del
[PR #130](https://github.com/santibpapa/trucazo/pull/130) y la pausa del
[PR #133](https://github.com/santibpapa/trucazo/pull/133) están integradas en master.
El sistema está desactivado en producción y la interfaz de vidas queda oculta
mientras se completa el alta publicitaria. El SQL ya se aplicó y la publicación
se verificó; no volver a ejecutar la migración de pausa. Ver el registro de
«Pausa de vidas y barra de Historia» al final de este documento.

El trabajo partió de GitHub master `24f1da19`; la carpeta local del dueño no se
usó ni modificó. Las pruebas se realizaron en una copia temporal limpia y en
runners descartables de GitHub.

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

**Pedido vigente (aclarado por el dueño):** retirar el sistema de vidas de la
interfaz y desactivar el límite mientras se completa AdSense. El indicador de
vidas infinitas se descartó antes de integrar el PR. El sitio ya tiene la propiedad verificada y la
revisión solicitada, según las capturas del dueño. El PR #132 está integrado y
`https://www.trucazo.com.ar/ads.txt` respondió 200 con el ID correcto. Eso no
confirma aprobación de Google ni un bloque rewarded operativo.

**Aplicado:** `campaign_internal.ad_settings.lives_enabled`
permanece en false. El servidor deja de descontar derrotas y permite iniciar
y retomar duelos incluso con un saldo anterior de cero. Se conservan los
saldos, la recarga natural y los tickets ya emitidos; no se borran progresos,
monedas ni partidas. Los pedidos entre amigos y los anuncios nuevos quedan
inactivos, incluso mediante llamadas directas. Las recompensas ya obtenidas
pueden terminar de acreditarse con su ticket vigente.

Durante la pausa no se monta ningún indicador ni ventana de vidas: ni en el
mapa ni al terminar un duelo. Tampoco aparecen el símbolo de infinito, mensajes
sobre vidas, cuenta regresiva, pedidos ni anuncios. Se evita mostrar un indicador
provisorio mientras el resultado de la partida consulta el estado al servidor.
La campaña continúa normalmente y permite Revancha incluso con un saldo previo
de cero. Cuando se reactive el sistema, el indicador real aparecerá debajo de
Ranking y al lado de Fama, con el mismo fondo, borde y forma; mostrará el saldo
y la próxima recarga.

**Aplicado en producción — 19/10/2026:** por autorización explícita del dueño,
el agente ejecutó el SQL de
`supabase/migrations/20261019030305_pause_campaign_lives.sql` y después mergeó
el PR #133, commit `63d0616dbadc8520eaa8c599c532445b70804105`.
Supabase lo registró como `20261019040725_pause_campaign_lives`: el horario del
registro del conector difiere del nombre del archivo preparado, pero el SQL es
idéntico. **No ejecutar ninguno de esos cambios otra vez.**

Comprobación real posterior: `lives_enabled = false`, permiso publicitario
`enabled = false`, esquema interno cerrado a jugadores, lectura de estado
habilitada sólo para usuarios autenticados y seis cuerpos de funciones idénticos
al SQL probado. El asesor de seguridad conserva los avisos esperados de
[RLS sin políticas en tablas privadas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
y [RPCs de servidor accesibles por usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Son intencionales en este diseño: las tablas no se exponen al jugador y cada RPC
valida la identidad y sus permisos. No abrir las tablas ni cambiar las reglas del
juego para silenciar esos avisos.

Vercel confirmó **READY / production** para el commit de merge, deployment
`dpl_AS5ExKP9RMGBnZvitsnBU2tZ3Lp2`, asignado a `www.trucazo.com.ar` y
`trucazo.com.ar`. Esto acredita la publicación del código revisado, junto con la
verificación de la configuración real; no se jugó una partida de prueba contra
producción ni se modificaron saldos de jugadores para comprobarlo.

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

**Verificación:** la suite SQL prueba pausa por defecto, cuatro derrotas sin
descuento, inicio y recuperación con saldo cero, rechazo de pedidos y anuncios
directos durante la pausa, permisos privados y reactivación del límite. Se
conserva íntegra la suite de vidas activas. La prueba de navegador con
Auth/Postgres/Next reales comprueba que no haya indicador, ventana, infinito,
pedidos ni anuncios a 320, 360, 390 y 1280 px; verifica la ausencia también en
el resultado después de recibir el estado real del servidor. Se retira también
el aviso fijo «Perdiste una vida» del resultado, que era incorrecto durante la
pausa; la prueba rechaza cualquier texto de vidas mientras esté desactivado. Prueba Revancha
desde cero, resultado sin scroll y que al reactivar vuelva el indicador real
junto a Fama/Ranking. Sólo el SDK publicitario se simula.

El código final `6b8550a9` aprobó la
[revisión general completa](https://github.com/santibpapa/trucazo/actions/runs/39195468800),
[vidas con navegador real](https://github.com/santibpapa/trucazo/actions/runs/39195468797)
e [invitaciones](https://github.com/santibpapa/trucazo/actions/runs/39195468836).
Las capturas finales del mapa y del resultado se descargaron y revisaron: no
aparecen elementos ni mensajes de vidas durante la pausa. Las pruebas usan
cuentas y bases descartables; no certifican aprobación publicitaria.
