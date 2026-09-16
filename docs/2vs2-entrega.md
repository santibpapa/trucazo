# 2vs2 — cómo quedó la modalidad

**Lanzada el 14/09/2026.** El PR #57 (rama `codex/2vs2`) se mergeó a master, las tres
migraciones se aplicaron en el Supabase de producción y `NEXT_PUBLIC_ENABLE_2VS2=true`
quedó configurada en Vercel. La modalidad está activa para todos los jugadores.

Este documento pasa a ser la referencia de qué hace el 2vs2 y cómo está montado.
La apariencia de la partida la aprobó el dueño sobre `76fa76e` el 13/09/2026; la sala
de espera se rediseñó después, a su pedido.

## Implementación por etapas

| Etapa | Resultado |
|---|---|
| Reglas | D1–D5 y Q1–Q3 en `2vs2-auditoria.md`: turnos, pardas, envido declarado en orden y mazo que cierra la mano para todo el equipo. |
| Mesas | Cuatro asientos; 0/2 contra 1/3; públicas o con código. Cada persona elige asiento. El creador gestiona bots e inicio. Se necesitan cuatro participantes sentados. |
| Motor | Servidor autoritativo, manos privadas, puntaje compartido, acciones con versión e identificador, bloqueos por mesa y pagos una sola vez. |
| Bots | Las cinco composiciones; decisión con cartas propias e información pública, ahorro de cartas cuando gana el compañero, prioridad humana al responder. Desde el 14/09/2026 se sientan con nombre de jugador, hablan en la mesa y escuchan a su compañero: `2vs2-bots-humanos.md`. |
| Presentación | Componentes y estética del 1vs1; pilas frente a cada jugador, tamaños estables, cantos con autor y resultado por equipo. La sala de espera se rediseñó aparte: la mesa se ve desde arriba, con un lugar por lado y el compañero enfrente. |
| Chat rápido | Los emotes del 1vs1 más once frases de mesa de a cuatro, en `src/lib/emotes.ts`. Son públicas: las lee toda la mesa. No hay señas ni canal privado entre compañeros. Viajan por el servidor (`team_say`), que solo acepta las frases de esa lista y no toca el turno ni la versión de la mesa. |
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

## Migraciones y activación

Las cuatro están aplicadas en producción. Quedan listadas por si hay que
reconstruir una base desde cero o montar un entorno de prueba, y se corren en
este orden:

1. `supabase/migrations/20260909211038_team_2vs2.sql`: tablas, motor, permisos,
   publicación de `team_tables` en Realtime y cron `sweep_team_tables`.
2. `supabase/migrations/20260913191141_team_2vs2_maintenance.sql`: espera según
   presencia, limpieza de solicitudes, índices, RLS y actividad de emails.
3. `supabase/migrations/20260914100000_team_2vs2_abandono.sql`: ausencia total en
   partida: el equipo ausente pierde por abandono; con ausentes de ambos lados se anula.
4. `supabase/migrations/20260914170000_team_2vs2_bots_hablan.sql`: bots con nombre,
   catálogo de frases, chat rápido por servidor y pedidos del compañero. No cambia
   reglas, turnos, puntajes ni pagos.

La primera exige que la extensión `pg_cron` esté habilitada (Supabase → Database →
Extensions): programa el barrido con `cron.schedule` y sin la extensión falla entera.
Cada archivo es transaccional: si algo falla, no queda nada a medias. Pero **no son
repetibles**. Reenviar el cuarto falla en su primera línea, con
`column "chat" of relation "team_games" already exists`, porque agrega esa columna sin
preguntar si ya estaba. El error es inofensivo —la transacción se deshace y la base
queda igual— pero el archivo no se saltea solo. Antes de reenviar uno, preguntarle al
catálogo qué hay:

```sql
select
  (select count(*) from information_schema.columns where table_schema='public'
     and table_name='team_games' and column_name='chat')            as columna_chat,
  (select count(*) from information_schema.tables where table_schema='public'
     and table_name='team_bot_lines')                               as tabla_frases,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='team_say')             as funcion_team_say,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='team_internal' and p.proname in ('chat_lines','say','quiet',
       'bot_strong','bot_line','bot_talk','bot_hears','partner_hint')) as ayudantes,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='team_internal' and p.proname='bot_choice'
       and p.pronargs=6)                                            as bot_choice_nuevo;
```

`1, 1, 1, 8, 1` es el cuarto archivo entero. Se comprobó así el 16/09/2026.

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
contiene datos. Para reconstruir de cero, seguir `supabase/schema/README.md`:
la base histórica más todas las migraciones siguen siendo la receta ejecutable.

## Preview gratuita y cómo probar

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

## Verificación y límites

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
