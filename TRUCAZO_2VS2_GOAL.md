# Objetivo: partidas 2vs2

Implementar mesas de truco 2vs2 online con personas y bots, elección de asiento,
partidas completas, servidor autoritativo y pantalla de juego sin desplazamiento.
La entrega termina en PRs revisables y una preview funcional. **No hacer merge ni
lanzar a producción sin autorización del dueño.**

## Estado al 09/09/2026

- Base auditada: `master`, commit `708162b0aec85b3053702978045a7f19c0932c23`.
- Rama de trabajo: `codex/2vs2`.
- Etapa 1: relevamiento y propuesta documentados en
  [docs/2vs2-auditoria.md](docs/2vs2-auditoria.md). La definición de reglas espera
  las decisiones D1–D5 de ese documento.
- Etapas 2–7: pendientes. Todavía no hay código funcional 2vs2, migraciones ni
  preview 2vs2. Este primer cambio es documental.
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
- Sin comunicación privada, señas, invitaciones nuevas, revancha 2vs2, modo
  historia por parejas, integración nueva con rankings/estadísticas/misiones/
  recompensas ni rediseño general.

## Etapas y criterios de aceptación

1. **Auditoría y reglas.** Diagnóstico técnico, tabla de reglas, propuesta de
   implementación y resolución de D1–D5. Distinguir comportamiento del código de
   reglas propuestas; no corregir de paso el 1vs1.
2. **Mesas, asientos y equipos.** Creación e ingreso a mesas públicas y privadas;
   elección y cambio de asiento libre mientras esperan; gestión de bots con
   permisos del servidor; comienzo únicamente con los cuatro puestos ocupados.
   Probar ocupación concurrente, permisos, salida y cancelación.
3. **Motor por equipos.** Tres cartas diferentes por participante; orden de
   cuatro asientos; bazas, pardas, mazo individual, envido, truco y puntuación por
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
| Cuatro personas terminan una partida | Pendiente |
| Tres personas y un bot | Pendiente |
| Dos personas compañeras y dos bots | Pendiente |
| Dos personas rivales y dos bots | Pendiente |
| Una persona y tres bots | Pendiente |
| Envido y truco: aumentos, rechazo, respuestas simultáneas | Pendiente |
| Empates y compañeros al mazo | Pendiente |
| Recarga, reconexión, timeout y abandono | Pendiente |
| Resultado por equipo y vuelta al lobby | Pendiente |
| Celulares de 320–430 px, alturas reducidas y escritorio | Pendiente |
| Privacidad de las cuatro manos y decisiones de los bots | Pendiente |
| Sin duplicación de puntos, cobros ni efectos de misiones | Pendiente |
| Regresión de mesas, partidas y cierre del 1vs1 | Pendiente |

## Continuación

Registrar las respuestas del dueño a D1–D5 en el diagnóstico antes de implementar
las reglas afectadas. Actualizar el estado de cada etapa con evidencia, nunca
marcar una etapa completa porque exista solamente su interfaz o sus tipos.

Antes de tocar archivos compartidos, refrescar `master` y revisar el estado del
[PR #56](https://github.com/santibpapa/trucazo/pull/56), que al auditar seguía abierto
y modifica la presentación de Club de barrio. No incorporarlo ni mergearlo
automáticamente.

Seguir `AGENTS.md`: cambios SQL mediante migraciones NUEVAS; no editar las ya
aplicadas. Probar con una base aislada. La reconstrucción local usa
`scripts/rebuild-db.sh`; una preview del frontend por sí sola no instala el
backend. Documentar la configuración necesaria antes de presentar la preview
como funcional.
