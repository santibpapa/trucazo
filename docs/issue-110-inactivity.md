# Issue #110: rival inactivo y recuperación de la partida

Investigación: 14/10/2026. Alcance del arreglo: cliente 1v1, sin cambios de diseño ni de reglas.

## Evidencia del reporte

La reseña `77fd1778-8e81-40b7-a9e5-53f3ea117942` dice que el jugador abandonó porque su rival no jugaba y recibió una derrota. No conserva el identificador de partida. La partida cercana de 42 segundos y límite de 30 segundos no permite demostrar que sea la del reporte ni reconstruir su conexión o su pantalla.

`forfeit` entrega la victoria al rival cuando se confirma el abandono. No se cambió esa regla ni se atribuye mala conducta al rival.

## Fallos reproducidos

1. Un `timeout_mazo` exitoso deja la mano en `awaiting_deal=true`. El cliente agenda `advance_hand` una sola vez. Si falla por red, el polling continúa mostrando el mismo estado y no reactiva el efecto: con un solo cliente activo, el reparto queda detenido indefinidamente. La reproducción también vale tras otros cierres de mano.
2. El reloj anterior empezaba a contar desde que el cliente veía el turno, sin descontar su antigüedad. Al recargar un turno vencido, mostraba otros 30 segundos; al recargar un turno iniciado hace 20 segundos, mostraba 30 en lugar de 10. La sanción no se adelantaba en Postgres, pero su solicitud se demoraba en el cliente.

Las primeras seis pruebas del cliente daban cuatro fallos antes del arreglo y pasan después. Son ejecuciones de los efectos de producción con el SDK real, transporte HTTP controlado y reloj simulado; no son una reproducción de la sesión histórica ni una prueba manual en un teléfono real.

## Arreglo

- Reintentar el reparto cada tres segundos después de un fallo, con un pedido a la vez. Cancelar el siguiente reintento al cambiar de mano, terminar o desmontar la mesa.
- Estimar la hora del servidor desde el render de Next.js y el tiempo monotónico transcurrido en el cliente. Usar `turn_started_at` para conservar la antigüedad del turno al recargar. El transporte/render puede introducir un pequeño retraso; Postgres sigue siendo la autoridad para sancionar.
- Mantener reintentos de `timeout_mazo` cuando Postgres responde que aún queda tiempo o falla la red. Ignorar respuestas del temporizador cuyo efecto ya terminó.
- Ignorar snapshots anteriores al estado actual para que polling/reintentos atrasados no revivan una espera de reparto ni una partida terminada.

## Servidor y verificación

La inspección de las funciones desplegadas confirmó:

- `timeout_mazo`: valida autenticación, participante y plazo; sanciona al jugador de turno (o al declarante de envido). El tercer vencimiento entrega la partida al otro jugador.
- `advance_hand`: cualquier participante puede repartir; repetirlo cuando ya se repartió devuelve la misma mano.
- `touch_presence`: permite mantener la presencia del jugador activo. No decide el turno.
- `sweep_stale_games(10)`: el cron corre cada cinco minutos y anula/reembolsa sólo cuando ambos jugadores están ausentes. No concede victoria por la ausencia de uno.

`scripts/check-game-recovery.ts` cubre fallos breves/prolongados, recarga parcial/vencida, reloj local desfasado, rechazo temprano de Postgres, reintentos, limpieza y snapshots atrasados. `scripts/check-presence.ts` conserva la cobertura de latidos HTTP reales.

`supabase/tests/game_inactivity.sql` prueba las RPCs reales en una base descartable: ambos asientos, límites de 15/30 segundos, presencia, bloqueo de timeout temprano/de terceros, tres vencimientos, jugada del activo cuando le toca, reparto repetido, pozo/historial y turno de declaración. Todo se revierte al terminar. Ambas pruebas están integradas al CI.

## Hipótesis y límites

Estos fallos pueden explicar una mesa detenida con un jugador activo, pero no está demostrado que hayan ocurrido en la reseña. Tampoco hay evidencia de que el rival haya provocado el problema a propósito. El PR #120 corrige otro fallo de cierre; no constituye evidencia de la causa de este reporte.

Para atribuir la causa histórica faltan el identificador exacto de partida y el estado/error que veía el jugador. No se cambió el abandono voluntario ni se compensaron cuentas a partir de una partida hipotética.

## Despliegue y comprobación manual

No requiere SQL, migraciones ni cambios de cron en Supabase. El arreglo del cliente se despliega al mergear el PR.

Para comprobarlo con dos sesiones 1v1: dejar inactivo al rival, bloquear el primer pedido HTTP de `advance_hand` tras el primer vencimiento y restaurar la red. La siguiente mano debe repartirse sin recargar. Jugar cuando le toque al activo y dejar vencer al rival tres veces: el activo debe ganar y cobrar. Recargar a mitad de turno debe mostrar lo restante; recargar después del plazo debe solicitar la resolución sin esperar otro límite completo.
