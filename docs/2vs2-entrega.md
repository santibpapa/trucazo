# 2vs2 — entrega para revisión

PR #57, rama `codex/2vs2`. **La apariencia quedó aprobada por el dueño sobre
`76fa76e` el 13/09/2026 y no se modifica.** La revisión visual queda a su cargo.
El PR continúa en borrador: falta acordar el tratamiento de la desconexión total
contra bots. No hacer merge a master ni lanzar en producción sin autorización.

## Implementación por etapas

| Etapa | Resultado |
|---|---|
| Reglas | D1–D5 y Q1–Q3 en `2vs2-auditoria.md`: turnos, pardas, envido declarado en orden y mazo que cierra la mano para todo el equipo. |
| Mesas | Cuatro asientos; 0/2 contra 1/3; públicas o con código. Cada persona elige asiento. El creador gestiona bots e inicio. Se necesitan cuatro participantes sentados. |
| Motor | Servidor autoritativo, manos privadas, puntaje compartido, acciones con versión e identificador, bloqueos por mesa y pagos una sola vez. |
| Bots | Las cinco composiciones; decisión con cartas propias e información pública, ahorro de cartas cuando gana el compañero, prioridad humana al responder. |
| Presentación | Componentes y estética del 1vs1; pilas frente a cada jugador, tamaños estables, cantos con autor y resultado por equipo. Aprobada y congelada. |
| Sincronización | Realtime de estado público, consulta de respaldo cada 2,5 s, presencia cada 8 s y recuperación de asiento al recargar con la misma sesión. |
| Compatibilidad | Incluye la corrección del resultado 1vs1 de master, PR #58 (`d7094d0`). No cambia la mesa ni el resultado del 2vs2 aprobado. |

No agrega estadísticas, rankings, misiones, recompensas, señas privadas, flujos
nuevos de invitación, revancha 2vs2 ni historia por parejas. El saldo conserva el
pago acordado: cada ganador cobra 2B, ganancia neta B. El guard de medallas impide
premios adicionales por ese cambio de saldo.

## Mantenimiento y desconexiones

- **Espera:** una mesa se conserva mientras alguna persona marque presencia.
  Se cancela y devuelve las apuestas cuando todas llevan al menos 15 minutos
  ausentes. Los bots no mantienen abierta la sala. El barrido corre cada 5 minutos,
  por lo que la cancelación puede ocurrir en el siguiente barrido.
- **Carrera con reconexión:** presencia y cancelación usan el mismo bloqueo de
  mesa; el barrido vuelve a comprobar la ausencia después de obtenerlo.
- **Durante la partida:** siguen vigentes 15/30 segundos por acción, mazo automático
  al vencer el turno y derrota del equipo al tercer vencimiento individual.
  Reconectar no borra el contador. No hay sustitución automática por bot.
- **Pendiente de decisión:** actualmente, 10 minutos de ausencia de todas las
  personas cancelan la partida y devuelven apuestas en el próximo barrido. Contra
  bots esto permite evitar una derrota cerrando las pestañas. Se conserva la regla
  aprobada hasta acordar su cambio; no se considera resuelto para lanzamiento.
- **Solicitudes:** se conservan los comprobantes de creación e ingreso, que protegen
  sus cobros contra reintentos. Solo se purgan solicitudes de acciones de mesas
  cerradas hace más de 30 días, hasta 5.000 por barrido. Las mesas abiertas nunca
  se purgan. Reintentar una acción purgada no puede cambiar una mesa cerrada ni
  repetir pagos; una salida antigua puede devolver el error de no pertenencia en
  vez de la respuesta guardada. No se borran partidas, asientos ni saldos.
- **Emails existentes:** una partida 2vs2 terminada cuenta como actividad para sus
  participantes humanos. Esperas, partidas en curso y cancelaciones no cuentan.
  Solo se corrige la clasificación; no se crean campañas ni se envían emails.

## Migraciones y activación

Aplicar en este orden, **solo en la base de prueba aislada** durante la revisión:

1. `supabase/migrations/20260909211038_team_2vs2.sql`: tablas, motor, permisos,
   publicación de `team_tables` en Realtime y cron `sweep_team_tables`.
2. `supabase/migrations/20260913191141_team_2vs2_maintenance.sql`: espera según
   presencia, limpieza de solicitudes, índices, RLS y actividad de emails.

La preview aplica ambas automáticamente. Para aplicarlas manualmente en una base
separada que ya tenga las migraciones de master:

1. Abrir esa base de prueba en Supabase → **SQL Editor**.
2. Abrir el primer archivo del PR, copiar su contenido completo a una consulta
   nueva y pulsar **Run**. Si ya fue aplicado, omitirlo; no repetirlo.
3. Repetir con el segundo archivo. Cada archivo es transaccional: si falla, no activar.
4. Comprobar las cuatro tablas `team_*`, la tabla privada `team_internal.requests`,
   sus permisos y RLS. En Realtime debe aparecer solo `team_tables`, nunca las
   manos ni las solicitudes. Debe existir un único cron `sweep_team_tables` cada 5 min.
5. En la aplicación de **Preview**, configurar URL y clave pública de esa misma
   base y `NEXT_PUBLIC_ENABLE_2VS2=true`, y volver a compilar la copia.

Sin la variable, o con `false`, se mantienen las opciones 1vs1 y las rutas de
parejas vuelven al lobby. Esta entrega no habilita el modo en producción.
La foto de estructura y funciones 2vs2 es `supabase/schema/team_2vs2.json`; no
contiene datos. Para reconstruir de cero, seguir `supabase/schema/README.md`:
la base histórica más todas las migraciones siguen siendo la receta ejecutable.

## Preview gratuita y cómo probar

Los dos proyectos Supabase del dueño siguen intactos. `preview-2vs2.yml` crea una
base vacía con Auth, PostgreSQL y Realtime reales en un runner estándar del
repositorio público y un enlace temporal de Cloudflare. No usa datos ni claves de
producción. La copia tiene los emails desactivados y se borra al terminar.

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

## Verificación y límites

- Local: reconstrucción desde cero con las dos migraciones; pruebas SQL del motor,
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
- La apariencia la aprobó el dueño. No se hacen nuevas revisiones visuales.
  Sigue sin acreditarse una sesión manual de cuatro personas en cuatro dispositivos;
  las composiciones sí están cubiertas automáticamente por Auth/API/Realtime.

Antes del lanzamiento faltan la decisión de desconexión total contra bots y su
implementación/pruebas, la sesión manual de cuatro personas y autorización del dueño.
