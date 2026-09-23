# Ruta del Noroeste

Expansión posterior a la Ruta Patagónica: cinco provincias, cuatro rivales por provincia. Con la base vigente son **15 provincias y 66 rivales**. Irene, la Antártica (`antartica`), es el requisito de entrada para las cinco provincias. Una vez vencida, todos los rivales disponibles se eligen libremente por puntaje. No se exige ganarles a los otros 45 rivales anteriores ni seguir una cadena entre los nuevos.

## Personajes y economía

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

## Umbrales y premios

La suma de premios base de los primeros 26 rivales es 3.045; la de Patagonia es 18.640: quien venció a los 46 tiene **21.685 puntos como mínimo**, antes de cualquier plus por margen. Puede abrir La Rioja de inmediato; Catamarca requiere al menos una victoria más. Ganar los cuatro rivales de cada provincia aporta respectivamente **3.500, 4.300, 5.100, 5.900 y 6.800 puntos** base. El recorrido completo termina como mínimo en **47.285 puntos**, encima del puesto fijo de Aurelia (46.500). Los umbrales de provincia 17.500 / 22.000 / 26.000 / 31.000 / 36.500 se alcanzan sin revancha ni plus por margen.

Se conserva la liquidación actual de `finish_game`: primera victoria = monedas de la tabla + puntos base + hasta 20% de puntos por diferencia final; las victorias repetidas dan hasta 10% de puntos base por vez y hasta 30% acumulado por rival, sin monedas repetidas. `campaign_progress` evita el doble pago. No se editó esa función ni saldos anteriores, fama, misiones, ranking online, medallas o recompensas de rivales previos.

## Estrategia en servidor

La migración de estrategia copia mediante `pg_get_functiondef` la versión **vigente al aplicarla** de `bot_step` hacia una función interna sin permiso directo para el cliente. El punto de entrada original llama a esa copia para los bots anteriores y de lobby; sólo deriva los veinte nuevos al plan avanzado. Esto conserva las reparaciones posteriores a Patagonia.

La función de decisión recibe exclusivamente la mano propia, las cartas públicas ya jugadas, el resultado de bazas, quién es mano, los cantos, el marcador y el resumen existente de reputación. Prueba cada carta contra las cartas aún posibles del mazo, reserva fuerza para las bazas restantes y valora distinto una respuesta exacta, una parda y una apertura. Elige cantos por el valor que se gana o concede al aceptar, rechazar o subir; envido, real y falta tienen umbrales distintos. Los perfiles cambian el riesgo y los faroles. `bot_step` valida jugador y partida antes de actuar, llama a las mismas funciones autoritativas de juego y registra cada decisión. No consulta `game_hands` del humano.

La tercera migración corrige dos errores de evaluación: incluye la carta propia que ya está en la mesa al responder un canto, y reconoce que parda + ganada termina la mano sin necesitar una tercera carta fuerte. Evalúa los órdenes posibles de las cartas restantes combinando ganar/pardar/perder según el motor 1v1 vigente; conserva la carta más fuerte cuando una más débil ofrece el mismo resultado. También considera los puntos concedidos por «no quiero» para no regalar el punto que termina el partido. Las probabilidades frente a cartas desconocidas son estimaciones, no conocimiento de la mano rival.

## Recursos gráficos

Los retratos se generaron individualmente con la herramienta integrada de imágenes, usando `antartica.webp` sólo como referencia de estilo: ilustración vintage de línea fina, ocre y sepia, marco sutil, personaje a medio cuerpo tras paño verde con mate y mazo; el rasgo local de cada personaje aparece en su vestimenta u oficio, sin texto. Están optimizados a 512 × 512 WebP. Los mapas provinciales se renderizaron con `scripts/generate_noroeste_maps.py`, que aplica el mismo dibujo y transparencia de Patagonia sobre los GeoJSON departamentales de [mgaitan/departamentos_argentina](https://github.com/mgaitan/departamentos_argentina) basados en IGN/CONAE. Están a 1254 × 1254 WebP con alfa. Las coordenadas nuevas se agregaron a las tablas existentes del mapa y de posiciones dentro de la provincia, sin cambiar su geometría.

## Verificación y límites

- `node scripts/check-noroeste-expansion.mjs`: cantidad, slugs, recursos, frases, requisitos, subida mínima de 21.685 a 47.285 y aislamiento del cerebro anterior.
- `supabase/tests/ruta_noroeste.sql` sobre base de prueba reconstruida: Irene y puntos en mapa y acceso directo, libertad de elegir, revancha aun con menos puntos, premio único, margen, tope de revanchas, ranking, situación táctica de guardar el ancho, envido/falta y decisión idéntica cuando sólo cambia la mano humana oculta. El CI del PR ejecuta este SQL después de `scripts/rebuild-db.sh`.
- `supabase/tests/noroeste_tactica.sql`: regresiones de carta ya tirada, primera parda, parda ganadora, triple parda, marcador al límite, valores de cadenas de envido y permisos de los ayudantes internos.
- `node scripts/sim-noroeste.mjs --local-test-db`: ejecuta esas regresiones y `noroeste_benchmark.sql` en una base local descartable. Juega **400 partidas completas a 30 puntos** (20 rivales × 10 semillas × 2 asientos) contra la función real de Irene, nivel 10. Ambas estrategias pasan por `bot_step` y las mismas funciones SQL de cartas, cantos, puntajes y finalización que usa el juego; no hay reglas ni cerebros duplicados en JavaScript. Los repartos son fixtures deterministas y se invierten los asientos. El resumen incluye cada rival y la tasa conjunta, con un límite inferior calculado por bloques de semilla, porque los perfiles comparten repartos. CI exige más de 55% de victorias conjuntas y un límite inferior superior a 50%.
- Repetir con semillas nuevas: `NOROESTE_SEED_START=251 node scripts/sim-noroeste.mjs --local-test-db`. Se puede ampliar con `NOROESTE_TRIALS=20`. Requiere `psql`, las variables `PG*` de una base **local de pruebas** y haber ejecutado `scripts/rebuild-db.sh` allí; el lanzador rechaza hosts remotos y servicios libpq.

Se retiran las cifras 60,84%/60,24% del simulador anterior: reimplementaba parcialmente las reglas y, entre otras diferencias, sumaba mal envido + real. El benchmark nuevo usa el motor SQL sin esas divergencias. Compara estrategias con reputación inicial neutra, sin red ni rivales humanos; sus resultados **no predicen** la tasa frente a personas ni prueban un orden de dificultad entre los veinte personajes. Todo ocurre en una transacción que termina en `ROLLBACK`. Conviene observar partidas reales tras publicar. La revisión de mapas y retratos en pantallas queda a cargo del dueño.

## Publicación manual después de revisar el PR

1. Hacer merge del PR cuando la aplicación y la base de datos aparezcan aprobadas en GitHub.
2. Abrir el proyecto **Trucazo** en Supabase → **SQL Editor** → **New query**.
3. Copiar **todo** el contenido de `supabase/migrations/20260923120000_campana_ruta_noroeste.sql` desde GitHub, pegarlo en esa consulta y pulsar **Run**. Esperar el resultado correcto. Crea provincias, rivales y cuentas bot sin tocar a los jugadores.
4. Abrir otra consulta nueva. Copiar **todo** el contenido de `supabase/migrations/20260923121000_campana_noroeste_estrategia.sql`, pegarlo y pulsar **Run**. Instala la estrategia y conserva la función del bot que esté vigente en ese momento.
5. Abrir otra consulta nueva. Copiar **todo** el contenido de `supabase/migrations/20260923160014_campana_noroeste_tactica_verificada.sql`, pegarlo y pulsar **Run**. Corrige la evaluación de manos y refuerza las decisiones del Noroeste.
6. Abrir `/historia`: comprobar La Rioja y el ranking. Si no se hicieron aún las migraciones anteriores de otros PR, aplicarlas primero en su orden original antes de estas tres. Si las primeras dos ya se ejecutaron, sólo falta la tercera.

No ejecutar `scripts/rebuild-db.sh`, los tests ni el benchmark en Supabase: trabajan sobre una base **de prueba**. Las tres migraciones anteriores son las únicas consultas de esta expansión que el dueño debe correr.
