# Objetivo: partidas 2vs2

Implementar mesas de truco 2vs2 online con personas y bots, elección de asiento,
partidas completas, servidor autoritativo y pantalla de juego sin desplazamiento.
La entrega termina en PRs revisables y una preview funcional. **No hacer merge ni
lanzar a producción sin autorización del dueño.**

## Estado al 11/09/2026

- Base auditada: `master`, commit `708162b0aec85b3053702978045a7f19c0932c23`.
- Rama de trabajo: `codex/2vs2`.
- Etapa 1 completada: diagnóstico y todas las decisiones D1–D5 y Q1–Q3 confirmadas.
- Backend de etapas 2–4 y 6 implementado; suite SQL ejecutada en base descartable
  PGlite y Supabase local real con todas las migraciones. Concurrencia nativa y CI pasan.
- Interfaz/lobby implementados en el PR #57; build y tipos pasan.
- Preview aislada validada con las cinco composiciones por API. Partidas completas
  en navegador: 2vs2 (15–8) y 1vs1 (8–15). Pendiente: tamaños y salón adicionales.
- No se modificó la base de producción ni se enviaron comunicaciones.

## Decisiones del dueño que ya están confirmadas

- Cuatro asientos, numerados 0–3; 0/2 forman un equipo y 1/3 el otro.
- Cada persona elige su asiento libre antes de comenzar; equipos inmutables
  durante la partida.
- Admitir 1 persona + 3 bots, 2 + 2 (personas compañeras o rivales), 3 + 1 y 4 + 0.
- Conservar las reglas y opciones del 1vs1, adaptadas a parejas. Consultar las
  decisiones que el comportamiento existente no permita resolver.
- Mantener la estética y geometría de las mesas actuales. No rediseñar botones.
- Jugador local abajo, compañero enfrente y rivales a los lados.
- Toda la partida en pantalla en celular, sin scroll ni controles cortados.
- Cada cliente ve únicamente sus cartas privadas; el bot tampoco conoce cartas
  privadas del compañero ni de los rivales.
- Cualquiera de los compañeros puede responder; la primera respuesta válida
  compromete al equipo, incluido “no quiero”. Humano con prioridad sobre su bot.
- El envido se declara en orden de mesa desde la mano. El primero debe cantar su
  tanto; los siguientes dicen “son buenas” si tienen menos o “tengo X” si superan
  el mayor tanto declarado. Si igualan, “son buenas”.
- **Irse al mazo, en cualquier situación, termina la mano para los cuatro y la
  gana el otro equipo.** También vale para el mazo automático por tiempo. Esta
  corrección posterior reemplaza la idea inicial de que el compañero continuara.
- El botón mazo solo está habilitado en el turno propio. Se conserva el envido
  resuelto; si estaba querido pero sin resolver, el contrario cobra ese envido;
  si estaba sin aceptar, cobra el rechazo. Eso se suma a la mano.
- Si cada equipo ganó una ronda y la tercera es parda, gana el equipo que ganó la
  primera. “Baza” significa ronda de cartas dentro de una mano.
- Apuesta B por asiento, pozo 4B y pago 2B a cada ganador. Sin agregar estadísticas,
  ranking, misiones ni recompensas adicionales.
- Sin comunicación privada, señas, invitaciones nuevas, revancha 2vs2, modo
  historia por parejas, integración nueva con rankings/estadísticas/misiones/
  recompensas ni rediseño general.

## Etapas y criterios de aceptación

1. **Auditoría y reglas.** Diagnóstico técnico, tabla de reglas, propuesta de
   implementación con Q1–Q3 confirmadas. Distinguir comportamiento del código de
   reglas propuestas; no corregir de paso el 1vs1.
2. **Mesas, asientos y equipos.** Creación e ingreso a mesas públicas y privadas;
   elección y cambio de asiento libre mientras esperan; gestión de bots con
   permisos del servidor; comienzo únicamente con los cuatro puestos ocupados.
   Probar ocupación concurrente, permisos, salida y cancelación.
3. **Motor por equipos.** Tres cartas diferentes por participante; orden de
   cuatro asientos; rondas, pardas, mazo que cierra la mano, envido, truco y puntuación por
   equipo; cierre idempotente. Todas las reglas y validaciones en Postgres.
4. **Bots.** Decisiones a partir de mano propia e información pública; conciencia
   del equipo; cantos y respuestas según las reglas acordadas; ninguna acción
   duplicada, fuera de turno o perteneciente a una mano anterior.
5. **Interfaz.** Sala de asientos y partida con equipos claros, puntajes, autor de
   cantos, turno, cartas identificadas y final con vuelta al lobby. Reutilizar el
   arte y los controles. Verificar todas las opciones de cantos en celular.
6. **Sincronización y desconexiones.** Versión de estado, acciones identificadas,
   reconexión y recarga sin perder asiento; revalidación de bots y plazos; aplicar
   exclusivamente la política de abandono confirmada en D5.
7. **Verificación y entrega.** Pruebas SQL del motor, privacidad y permisos;
   concurrencia con conexiones separadas; navegador con sesiones independientes;
   compatibilidad 1vs1; migraciones nuevas con instrucciones; PRs y preview.

## Matriz mínima de entrega

| Recorrido | Estado |
|---|---|
| Cuatro personas terminan una partida | SQL y API online: correctos (20 cartas, 22 eventos Realtime) |
| Tres personas y un bot | SQL y API online: correctos; partida completa por puntos |
| Dos personas compañeras y dos bots | SQL y API online: correctos; partida completa por puntos |
| Dos personas rivales y dos bots | SQL y API online: correctos; partida completa por puntos |
| Una persona y tres bots | SQL y API online: correctos; partida completa por puntos |
| Envido y truco: aumentos, rechazo, respuestas simultáneas | SQL y concurrencia: correctos; revisión online/visual en curso |
| Empates y mazo de cualquiera que cierra la mano | SQL y concurrencia: correctos; revisión online/visual en curso |
| Recarga, reconexión, timeout y abandono | SQL y concurrencia: correctos; revisión online/visual en curso |
| Resultado por equipo y vuelta al lobby | Correcto en navegador: 15–8, cobro 20 y regreso |
| Celulares de 320–430 px, alturas reducidas y escritorio | 320×568 y 390×844 correctos; resto pendiente |
| Privacidad de las cuatro manos y decisiones de los bots | SQL y concurrencia: correctos; revisión online/visual en curso |
| Sin duplicación de puntos, cobros ni efectos de misiones | SQL y concurrencia: correctos; revisión online/visual en curso |
| Regresión de mesas, partidas y cierre del 1vs1 | Partida completa correcta; altura del resultado 1vs1 limitada en 568 px, problema previo |

## Continuación

CI nativo y las cinco composiciones online pasan. La corrección móvil de
`61f68c6` quedó verificada en 320×568 y 390×844 con partida completa y regreso.
Completar 430 px, escritorio y Quincho. Mantener el PR en borrador hasta cerrar
la revisión; no hacer merge ni lanzamiento. Ver evidencia y límites en
`docs/2vs2-entrega.md`.
