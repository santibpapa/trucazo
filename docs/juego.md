# Juego — Historia, mano a mano, parejas, bots y torneos

[Volver al README](../README.md) · Documento principal de reglas y modalidades. Estado revisado el **07/11/2026**. Ese día se achicó a la mitad: quedan reglas, decisiones y trampas; las pruebas, auditorías y registros de entrega están en el [historial completo hasta el 07/11/2026](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md), con un aviso en cada lugar de donde salieron.

## Estado actual

Foto al **07/11/2026**. Se reescribe entera cuando algo cambia; lo viejo pasa a su capítulo fechado.

- Truco argentino a 15 o 30 puntos, sin flor y con monedas ficticias. Las reglas online y los premios oficiales los decide el servidor; las manos rivales nunca se envían al cliente.
- **Historia:** 15 provincias y 66 rivales. **Vidas de Historia programadas y apagadas** desde el 19/10: los jugadores no ven nada ni pierden vidas ([reglas y cómo activarlas](#vidas-de-historia)).
- **Anuncios:** AdSense rechazó el sitio por «contenido de poco valor» (capturas del 04/11). El dueño espera la aprobación de **Google Ad Manager**, que es lo que necesitan los anuncios con premio. Diagnóstico y avances en [Rechazo de AdSense](#adsense-rechazo-poco-valor).
- **Parejas** lanzadas el 14/09/2026 y **torneos** el 27/09/2026 (contrato al 07/10/2026).
- **Chat escrito** en mesas normales y torneos; Historia tiene frases rápidas. Los bots no escriben en el chat libre.
- **Bots en mesas de la gente** desde el 04/11 ([detalle](#bots-lobby-cuidamesas)).
- **Envido:** incidente del 23/10 cerrado por el dueño; [PR #143](https://github.com/santibpapa/trucazo/pull/143) integrado y SQL ejecutado según su confirmación ([cierre](#envido-reveal-cierres-2026-10-23)). No repetir la migración.

## Próximo paso y cómo retomar

El trabajo abierto de esta área es el contenido para volver a pedir la revisión de AdSense: seguir los pasos de [Rechazo de AdSense](#adsense-rechazo-poco-valor). Antes de tocar una modalidad existente, leer su entrega final y comprobar el código y el SQL actuales antes de cambiar reglas o repetir migraciones. La aceptación pendiente de ranking y presencia está en [Operación](operacion.md#correccion-cierres-presencia).

## Guía de lectura

- [Historia y ruta del Noroeste](#historia).
- [Entrega vigente de parejas](#parejas-entrega), [comportamiento de los bots](#parejas-bots) y [tabla de reglas](#parejas-auditoria).
- [Decisiones y arquitectura de torneos](#contrato-torneos).
- [Chat en partidas](#chat-partidas).
- [Bots que se sientan en mesas de la gente](#bots-lobby-cuidamesas).
- [Vidas de Historia](#vidas-de-historia) y [rechazo de AdSense](#adsense-rechazo-poco-valor).
- Para SQL, seguridad y pruebas: [Backend](backend.md). Para mesa, cartas y pantallas: [Diseño](diseno.md).

Actualizar acá las reglas y decisiones de cada modalidad. La evidencia larga de cada entrega (pruebas, capturas, cifras) va en la descripción del PR y se enlaza. Las rutas de código parten de la raíz del repositorio. Un pendiente resuelto por una entrega posterior no vuelve a abrirse.

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Publicación manual después de revisar el PR»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#noroeste-publicacion-manual-despues-de-revisar-el-pr).*

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
| Sincronización | Realtime de estado público, consulta de respaldo cada ~15 s con Realtime conectado (2,5 s sin él, nada con la pantalla oculta), mano releída sólo al repartir, presencia cada 8 s y recuperación de asiento al recargar con la misma sesión. |
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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Migraciones y activación»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#parejas-entrega-migraciones-y-activacion).*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Verificación y límites»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#parejas-entrega-verificacion-y-limites).*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Diagnóstico»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#parejas-auditoria-diagnostico).*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Propuesta de implementación»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#parejas-auditoria-propuesta-de-implementacion), [«Verificación realizada y pendiente»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#parejas-auditoria-verificacion-realizada-y-pendiente).*

</details>

<a id="torneos"></a>

## Torneos

El último estado documentado indica cinco etapas finalizadas y lanzamiento en producción el 27/09/2026, con actualización al 07/10/2026. Las restricciones y pendientes escritos dentro de cada etapa corresponden a esa fecha; no reemplazan el estado final.

**15/10/2026 — adaptación Android:** central, inscripción, competencia, administración por rol y espectador compartidos con la app. La vista pública se ajustó al alto disponible y el detalle explica la pausa de rondas vigente, sin cambiar reglas ni SQL. Entornos, pruebas y límites en [ANDROID-10](https://github.com/santibpapa/trucazo/blob/31721f5f2161a35921bb4529c006fc195cf0aab4/docs/android.md#android-10-torneos); no se publicaron estos cambios ni se activaron torneos de ensayo en producción.

**30/10/2026 — relleno con bots (sólo 1v1):** pedido del dueño para el primer torneo (16 lugares, 11 inscriptos, inicio 20:00). `20261030223000_tournament_bot_fill.sql` crea 16 cuentas bot (`b0720000-…`, `torneoN@trucazo.bot`) con nombre, historial y antigüedad de jugador común, sin correos, y juegan con el cerebro del Noroeste (`_northwest_plan`, marcador llevado a escala de 30). Sólo actúa en los torneos de `tournament_internal.bot_fill`: la migración marca los 1v1 publicados del 30/10. El trabajo `trucazo-tournament-bots-minute` (`tournament_internal.bot_tick`) completa a la hora de inicio el cupo que no cubren los confirmados ni la espera e inicia el torneo; el bot entra al cruce apenas se abre; los cruces bot contra bot se juegan en el servidor, una mano por minuto; si la persona abandona, el bot sigue y le corre el reloj. Los bots compiten de verdad y pueden subir al podio. Para otros torneos se usa la casilla **Completar con bots** del panel (`20261030233000_tournament_bot_fill_admin.sql`: `tournament_admin_bot_fill` y `tournament_admin_set_bot_fill`, sólo administradores). Aparece al crear o editar un borrador 1v1 y en el detalle de un 1v1 publicado que todavía no arrancó; se puede desactivar siempre. **Arreglo del mismo día:** `20261030223000` dejó `bot_step` con un alias ambiguo que cortaba a los bots de Historia y del lobby; lo corrige `20261030234500_fix_bot_step_ambiguo.sql` (lo detectó `ruta_noroeste.sql` en CI). **Incidente de la COPA TRUCA (20:00):** ningún inscripto había hecho check-in; `start_one` los reemplazó y el relleno puso 16 bots. `20261030235500_copa_truca_devolver_inscriptos.sql` (ya aplicada) borró esa largada, devolvió a los 11 con check-in de la administración, completó con 5 bots, volvió a sortear y dio 15 minutos para entrar a la primera ronda, sin cambiar el estado del torneo para no reenviar el anuncio. **Regla vigente desde `20261030235800_bot_fill_respeta_inscriptos.sql`:** en los torneos marcados, los inscriptos conservan su lugar aunque no hagan check-in (si no entran a su cruce, pierden por ausencia) y los bots sólo ocupan lugares que nadie tomó. Además, al anotarse (o aceptar una invitación) aparece un aviso que explica el check-in con su horario; la persona tilda «Entiendo…» y puede confirmar recién a los 5 segundos (`src/components/tournaments/CheckInNotice.tsx`). Probado en base local reconstruida: 10 confirmados + 1 sin check-in → 6 bots, arranque automático, torneo completo con podio y 0 errores de decisión; `bot_step` contra bot de torneo desde la pantalla de una persona.

<a id="torneos-renovados-2026-11-04"></a>

**04/11/2026 — pantallas de torneos renovadas (etapa 1, sólo pantallas):** pedido del dueño tras aprobar el [mockup](https://claude.ai/artifact/HAHJvCKUwvyB4afu24n6gD). Mismas funciones del servidor, sin SQL ni cambios de reglas.
- **Central** (`TournamentsHub`): arriba, «Tu próximo torneo» con los tres pasos (Anotado → Estoy listo → A jugar) y la acción del momento; filtro Todos / Mano a mano / Parejas; «Se está jugando»; tarjetas con calendarito, premio al campeón, barra de lugares y un solo botón; «Terminados». Mis inscripciones se leen con `tournament_my_entry` de los torneos vigentes, en paralelo (hasta 12).
- **Detalle** (`TournamentDetail`): encabezado con fecha corta y cupo; tarjeta de estado según el momento (invitación, anotado, lista de espera, «¿Estás para jugar?» con cuenta regresiva y quiénes confirmaron, «¡Te toca!» con el plazo de 5 minutos de `entry_deadline`, esperando partida, eliminado); pestañas Resumen / Llave (o «Grupos y llave») / Jugadores; botón fijo «Anotarme» abajo cuando no estás inscripto.
- **Anotarse** (`CheckInNotice`): hoja que sube desde abajo con el horario dibujado. En parejas se elige «Con un amigo» (nombre exacto, como antes) o «Que me toque alguien». **Se conservan la casilla «Entiendo…» y la espera de 5 segundos**, por decisión del dueño. En la interfaz el check-in se llama «Estoy listo».
- **Llave** (`Competition`, también en el panel de administración): cuadro con líneas entre cruces; en el teléfono de a dos rondas con botones para cambiar, en compu completo. «Tu camino», etiquetas EN JUEGO / ENTRANDO / AUSENCIA / PASE DIRECTO, tocar un cruce en juego abre el espectador. Grupos con la línea «Pasan a la llave» y podio final con fotos.
- **Lobby** (`TournamentLobbyAccess`): aviso «Confirmá tu lugar» con botón «Estoy listo» que confirma ahí mismo (aviso `checkin` sin leer de los últimos 30 min, comprobado contra el torneo y la inscripción reales) y aviso «¡Te toca jugar!» (aviso `match` sin leer de los últimos 5 min; al tocarlo se marca leído).
- **Pruebas:** tipos, lint y build de la web; armado de la interfaz de la app (`apps/mobile/scripts/build.ts`). Recorrido visual con datos inventados en 320, 390 y 1280 px de ancho, sin desplazamiento horizontal: central, detalle, hoja 1v1 y parejas (botón bloqueado 5 s y hasta tildar), confirmación, ¡Te toca!, llave por rondas, grupos y podio. No se probó contra Supabase real ni en el teléfono.
- **Etapa 2, misma rama (`claude/torneos-renovados`):** migración nueva `20261104150000_tournament_live_scores_recent_partners.sql`, sólo dos funciones de lectura, sin tocar las existentes:
  - `tournament_live_scores(torneo)`: puntos de los cruces en juego (lado A = jugador 1 / equipo 0, como al cerrar el cruce). Sólo cuentas registradas y torneos publicados, igual que el espectador. El detalle la pide en cada actualización mientras el torneo se juega; se ve en la llave, en «Tu camino» («Vas 18-12») y en la tarjeta «Estás jugando».
  - `tournament_recent_partners()`: hasta 8 personas con las que jugaste en los últimos 60 días (mano a mano o parejas), sólo cuentas que pueden jugar torneos y sin bloqueos. Aparecen como «Jugaste hace poco con» en la hoja de parejas y al invitar estando anotado solo; un toque completa el nombre y la invitación sigue por `tournament_invite_partner`.
  - «Agregar a mi calendario»: enlace a Google Calendar con la ventana de «Estoy listo», visible al estar anotado y antes de que abra la confirmación. No usa el servidor.
  - Si la web sale antes de aplicar la migración, las dos llamadas fallan en silencio y las pantallas quedan como en la etapa 1 (probado). Las apps instaladas no las llaman.
  - **Pruebas:** `supabase/tests/tournaments_live_partners.sql` (en CI y en `check-tournament-rules.ts`), pasó en la base reconstruida desde cero con PostgreSQL 16 y en PGlite; la prueba de permisos suma las dos funciones a la lista permitida y sigue pasando, igual que las demás de torneos. Capturas con datos inventados de llave con puntos, hoja de parejas con sugerencias y botón de calendario.
  - **Aplicado el 04/11/2026:** el dueño fusionó el [PR #162](https://github.com/santibpapa/trucazo/pull/162) y ejecutó la migración en el SQL Editor. Comprobado ese día con una consulta de sólo lectura: las dos funciones existen como `security definer`, con ejecución para `authenticated` y sin acceso para `anon`. **No volver a ejecutarla.**

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«1. Cómo usar este documento»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-1-como-usar-este-documento), [«2. Estado del programa»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-2-estado-del-programa).*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«7. Modelo de datos objetivo»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-7-modelo-de-datos-objetivo), [«8. Experiencia de usuario objetivo»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-8-experiencia-de-usuario-objetivo), [«9. Plan de cinco PR/sesiones»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-9-plan-de-cinco-prsesiones), [«PR 1 — Base de datos, seguridad y contrato»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-pr-1-base-de-datos-seguridad-y-contrato), [«PR 2 — Administración, central, inscripción y check-in»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-pr-2-administracion-central-inscripcion-y-check-in), [«PR 3 — Torneos 1v1 y formatos competitivos»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-pr-3-torneos-1v1-y-formatos-competitivos), [«PR 4 — Integración completa 2v2»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-pr-4-integracion-completa-2v2), [«PR 5 — Comunicaciones, espectadores, premios y lanzamiento»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-pr-5-comunicaciones-espectadores-premios-y-lanzamiento), [«10. Matriz global de aceptación»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-10-matriz-global-de-aceptacion).*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«12. Registro de traspaso entre sesiones»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#contrato-torneos-12-registro-de-traspaso-entre-sesiones), «YYYY-MM-DD — PR N — Título».*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: [«Verificación»](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md#chat-partidas-verificacion).*

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

<a id="bots-lobby-cuidamesas"></a>

## Bots que se sientan en mesas de la gente — 04/11/2026

**Cómo funciona:** en una mesa pública 1v1 sin rival, la pantalla de espera
(`src/app/game/[id]/WaitingRoom.tsx`) llama a `bot_join_table` a los 8–18 s y
reintenta cada 15 s. Las privadas no reciben bots; el 2vs2 se completa a mano.
Consulta en producción del 04/11 (sólo lectura): en 7 días, 209 mesas públicas
humanas, 144 con bot y 65 con persona.

**Problema:** sólo había 3 bots de lobby y también abren sus mesas
(`ensure_lobby_tables` mantiene 2 en espera). Por eso solían estar los 3 ocupados
(2 esperando en su mesa y 1 jugando) y la mesa nueva de una persona no recibía bot.

**Cambio aplicado en producción el 04/11** (el dueño corrió las dos migraciones en el SQL Editor; **no volver a ejecutarlas como pendiente**): `supabase/migrations/20261104120000_lobby_bots_cuidamesas.sql`
agrega `lobby_bots.opens_tables` y dos cuentas (`b0710000-…-0004` y `…-0005`,
`lobbyN@trucazo.bot`) que nunca abren mesa. `_free_lobby_bot(p_para_abrir)`
prefiere a esos dos al sentarse; `ensure_lobby_tables` sólo usa los 3 de siempre.
`bot_join_table`, la pantalla y el cerebro no cambian. No necesita versión nueva
de la app. Prueba: `supabase/tests/lobby_bots_cuidamesas.sql` (también en CI),
partida completa local contra un bot nuevo sin errores de decisión, y
seguridad/parejas/invitaciones/Noroeste en base reconstruida.

`force_profile_defaults` fija 1000 monedas y 0 partidas a toda cuenta nueva, aun
desde una migración: por eso los bots nuevos arrancan sin historial (sólo se
respeta la antigüedad). Lo mismo dejó en 0 el historial que
`20261030223000_tournament_bot_fill.sql` intentó darles a los bots de torneo;
no se corrigió aquí.

**Dificultad comparada:** hasta este cambio, `bot_step` derivaba a los bots de
lobby al cerebro anterior al Noroeste (`_bot_step_pre_noroeste`, nivel 10:
reglas fijas por carta y umbrales de tanto). El cerebro más fuerte
(`_northwest_plan`) lo usaban sólo los 20 rivales del Noroeste y los bots de
torneo; el banco de pruebas del CI exige que le gane a ese mismo nivel 10 más
del 55% de 400 partidas ([detalle](#noroeste-verificacion-y-limites)).

**Cerebro del Noroeste para los 5 bots (pedido del dueño, mismo día):**
`supabase/migrations/20261104130000_lobby_bots_cerebro_noroeste.sql` agrega
`lobby_bots.strategy_profile` (se sortea de nuevo con cada cambio de nombre en
`_rename_lobby_bot`) y `_lobby_bot_act`, la misma decisión que
`tournament_internal.bot_act`: sólo lee la mano del bot, escala el marcador a 30
en mesas a 15 y registra `situation = 'lobby'` en `bot_decisions`. `bot_step` la
usa en partidas sin campaña contra un bot de lobby; Historia y torneos no
cambian. Prueba local: 20 partidas completas (10 a 15 y 10 a 30), todas
terminadas, 1.022 decisiones del cerebro nuevo, ninguna del viejo y 0 errores;
la prueba SQL lo controla en CI. **Comprobación en producción:** 5 bots en `lobby_bots` (3 abren mesas, `agustinlp` y `rodri` no), `_free_lobby_bot` y `_lobby_bot_act` sin permiso para clientes, `bot_step` sigue disponible para jugadores. En partidas reales del lobby, la última decisión del cerebro viejo fue a las 08:22:18 UTC y desde las 08:22:23 todas son `lobby`, sin errores.

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: «Consultas, fuentes y scripts revisados», «Verificación y reproducción».*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: «Aplicación en producción», «Cobertura de pruebas», «Evidencia de cierre — 16/10/2026», «Activación en producción — 16/10/2026».*

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
haya anuncios con premio. **Actualización 04/11/2026:** AdSense rechazó el sitio por
«contenido de poco valor» (ver [Rechazo de AdSense](#adsense-rechazo-poco-valor)). Aun aprobado, AdSense no alcanza: falta una cuenta de Google Ad Manager con un bloque
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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: «Activación original (historial del PR #130)», «Pruebas y continuidad», «Evidencia verificada — 18/10/2026», «Compatibilidad con el PR #129 — 18/10/2026», «Alta de AdSense y verificación del sitio — 18/10/2026».*

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

*Pasado al [historial](https://github.com/santibpapa/trucazo/blob/c13848edda0fc9f5078d257515f5021a8340da5f/docs/juego.md) el 07/11/2026: «Textos de Privacidad y Términos para AdSense — 01/11/2026».*

<a id="adsense-rechazo-poco-valor"></a>

### Rechazo de AdSense por «contenido de poco valor» — 04/11/2026

**Estado:** el dueño informó que AdSense rechazó `trucazo.com.ar` y el 04/11 envió
capturas del panel (la fecha del aviso no se ve en ellas). El sitio no está
aprobado y no hay anuncios activos. Las vidas siguen apagadas.

**Texto del aviso, tal como figura en el panel:** «Contenido de bajo valor. […] un
sitio debe ofrecer un valor único y sustancial, establecer una presencia constante
en la Web y mostrar un nivel de interés de los usuarios que respalde un socio
publicitario comercial». Pide, antes de volver a enviarlo: información,
herramientas o servicios auténticos y de alta calidad; una selección constante de
contenido y mantenimiento estructural; e interés genuino de los usuarios. Al pie
están la casilla «Confirmo que corregí los problemas» y el botón **Solicitar
revisión**. No tildarla ni volver a pedir la revisión hasta publicar las mejoras.

**Qué ve Google (medido el 04/11 en producción, con el texto principal de cada
página):** la portada tiene unas 270 palabras. De las 12 guías y páginas de
entrada públicas, sólo «Cómo se juega» (~1.170) y «Truco en parejas» (~1.150) pasan las
mil palabras. Seis páginas del tipo «jugar truco…» (sin registrarse, con amigos,
contra la computadora, dos jugadores, Modo Historia, acerca de) tienen entre 230
y 420 palabras y repiten la misma idea con otras palabras. Lo valioso del sitio,
el lobby y la partida, requiere sesión y no tiene texto para el rastreador
(`/login` es `noindex`). Es la causa típica de este rechazo en sitios de juegos.
No es un diagnóstico de Google: el aviso no detalla qué páginas evaluó.

**Propuesta, no aplicada:**
1. Sumar contenido propio y útil, no relleno: estrategia (cuándo cantar envido o
   truco, cómo jugar la primera mano), glosario del truco, preguntas frecuentes,
   manos de ejemplo explicadas, historia y variantes regionales.
2. **Ampliar, no unir,** las páginas «jugar truco…» cortas, y no sumar más
   páginas delgadas. Cada una apunta a una búsqueda distinta y algunas ya traen
   gente: entradas desde buscadores del 05/10 al 03/11 (personas): portada 900,
   `/truco-contra-computadora` 158, `/envido-real-envido-falta-envido` 43,
   `/orden-cartas-truco` 38, `/como-se-juega-al-truco` 32,
   `/jugar-truco-con-amigos` 32, `/jugar-truco-sin-registrarse` 17,
   `/truco-en-parejas` 15. Unirlas arriesga ese tráfico; si alguna se une en el
   futuro, la dirección vieja debe redirigir a la nueva.
3. Mostrar anuncios sólo en páginas con contenido, nunca en lobby ni partida
   (política de Google sobre pantallas sin contenido del editor).
4. Con el contenido publicado e indexado, volver a pedir la revisión en AdSense →
   Sitios → `trucazo.com.ar`.

**Contexto de tráfico (análisis propio, 05/10 al 03/11):** 92 visitantes y 706
páginas vistas por día en promedio; última semana 117 y 1.023. Más del 95% de
Argentina. Estimación con AdSense aprobado y anuncios fuera de la partida: USD 5
a 25 por mes. Se revisaron otras redes: Ezoic, Raptive y Mediavine no admiten el
tamaño o el país del público actual; Adsterra y Monetag aceptan pero se
desaconsejan por formatos invasivos que pueden afectar el posicionamiento.

**Primer avance — 04/11/2026 (rama `claude/adsense-rechazo-poco-valor`, sin
publicar todavía):**
- Nueva guía `/como-ganar-al-truco` (unas 2.000 palabras): cómo medir la mano,
  tabla de probabilidades del envido calculada sobre las 9.880 manos posibles
  contra todas las del rival, la cuenta del «quiero», primera baza, truco,
  mentiras, tanteador, parejas (simulación de 600.000 repartos), errores comunes
  y preguntas frecuentes. Se suma a `PUBLIC_ROUTES` (sitemap, llms.txt y markdown
  para agentes), a la portada, al pie de las guías y a «Cómo se juega».
- `/truco-contra-computadora` pasa de ~300 a ~1.040 palabras, en la misma
  dirección: cómo decide la computadora, los cinco estilos de la Ruta del
  Noroeste, cómo los rivales difíciles leen el estilo del jugador, consejos y
  preguntas frecuentes. Cada afirmación se contrastó con las funciones vigentes
  en producción (`bot_step`, `_northwest_bot_step`, `_northwest_plan`,
  `_bot_step_pre_noroeste`, `irse_al_mazo`), sin publicar umbrales exactos.
- La portada suma también el enlace a «Envido, real envido y falta envido» para
  que la grilla de guías quede pareja (seis tarjetas).
- Verificado: `npm run build`, `npm run check:agentes`, ESLint sin errores
  nuevos y vista a 360 px y 1280 px sin desborde horizontal.
- No requiere SQL ni versión nueva de la app.
- `/modo-historia-truco` decía 5 provincias; se corrige con los datos de
  producción del 04/11 (`campaign_provinces` y `campaign_rivals`): 15 provincias,
  66 rivales, tabla de puntos para entrar y monedas por victoria, requisitos de
  Don Salvador, el Mudo (La Pampa) e Irene, la Antártica (noroeste). Si se suma
  una provincia o cambian puntos o premios, actualizar esa tabla. Vista a 360 px
  sin desborde.

**Siguiente:** publicar (merge a `master`), esperar a que Google las rastree y
seguir con una guía por semana. Candidatas: glosario del truco, manos de ejemplo
explicadas, historia y variantes regionales. Recién con
varias semanas de contenido nuevo, tildar «Confirmo que corregí los problemas» y
**Solicitar revisión** en AdSense.
