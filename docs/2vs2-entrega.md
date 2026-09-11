# 2vs2 — implementación y prueba previa al lanzamiento

El PR #57 conserva el 1vs1 y agrega las mesas por parejas mediante un motor
separado. **Sigue en borrador mientras se completa la revisión visual.** La preview aislada
funcionó y completó sus pruebas en la ejecución 8, reintento del 10/09/2026.
El enlace se renueva en cada ejecución y se verifica por separado.
No ejecutar esta migración en producción como parte de la revisión.

## Cambios por etapa

- **Reglas:** auditoría y D1–D5/Q1–Q3 en `2vs2-auditoria.md`; no quedan preguntas
  de reglas pendientes.
- **Mesas:** cuatro asientos; 0/2 contra 1/3; públicos o con código; creador agrega
  y quita bots, cancela e inicia; cada persona elige o cambia su lugar antes de
  empezar. Cuatro participantes sentados obligatorios.
- **Motor:** cartas privadas, cuatro turnos, pardas, envido declarado en orden,
  truco por equipo, mazo que cierra la mano completa, puntaje y pago por equipo.
- **Bots:** decisión con mano propia y cartas públicas, ahorro de cartas si gana
  el compañero, cantos y respuesta con prioridad humana.
- **Interfaz:** lobby existente, sala de asientos y `/game/parejas/[id]`. Componentes
  de salón, cartas y botones existentes; jugador abajo, compañero arriba, rivales
  a los lados. Rondas anteriores consultables y autor de cantos visible.
- **Sincronización:** Realtime anuncia cambios públicos; consulta cada 2,5 s de
  respaldo y al volver a la pestaña. Asiento ligado al usuario para recargas.
  Versión de mesa más identificador de solicitud y bloqueo servidor por mesa.
  Tiempo 15/30 s; tercer vencimiento individual pierde la partida por equipo.
  Ausencia humana total de 10 minutos cancela y devuelve apuestas en el siguiente
  barrido (cada 5 minutos). Sin reemplazos automáticos por bots.

## Base de prueba y activación

La migración nueva es `supabase/migrations/20260909211038_team_2vs2.sql`.
Crea cuatro tablas de estado y una tabla privada de solicitudes; agrega seis RPC;
publica únicamente `team_tables` en Realtime y programa `sweep_team_tables`.
Las manos y el registro de solicitudes nunca se publican.

La preview usa el esquema y catálogos actuales del 1vs1, reconstruidos de cero.
Los dos proyectos gratuitos del dueño están en uso: no se pausa ninguno ni se
crea una rama paga. `preview-2vs2.yml` levanta Supabase local completo en un runner
estándar del repositorio público y abre un enlace temporal de Cloudflare. No usa
credenciales, usuarios ni datos de producción. El andamiaje `00_supabase_local.sql`
se omite en este modo: Auth, Postgres 17, API y Realtime son los servicios reales.
Las claves son aleatorias por ejecución; la copia no envía emails.

La ejecución prepara sola esa base y aplica la migración. Para una futura
preview alojada por separado, los pasos manuales equivalentes son los siguientes.

Una vez preparada **la base de preview**, los pasos para aplicar el cambio son:

1. Abrir ese proyecto de prueba en Supabase y entrar en **SQL Editor**.
2. Abrir la migración del PR, copiar todo su contenido, pegarlo en una consulta
   nueva y pulsar **Run**. Es una operación transaccional; ante error no activar.
3. Verificar las cuatro tablas `team_*`, sus políticas, la publicación de
   `team_tables` y el cron `sweep_team_tables`.
4. Configurar el despliegue **Preview** de la rama `codex/2vs2` con la URL y clave
   pública de esa base aislada y `NEXT_PUBLIC_ENABLE_2VS2=true`.
5. Volver a desplegar la preview para incorporar las variables al navegador.

Si la variable no existe o vale `false`, el lobby conserva sus opciones 1vs1 y
las rutas de parejas vuelven al lobby. No se habilita en producción en este PR.
No hay integración de parejas con rankings, historial 1vs1, objetivos ni premios
extra. El pago se limita a 2B por ganador; un guard en el trigger de perfiles
impide que esa operación otorgue medallas.

## Cómo abrir la sesión temporal de prueba

1. En el PR #57, abrir **Checks → Preview temporal 2vs2 → preview**.
2. Esperar a que terminen **Verificar las cinco composiciones por Auth, API y Realtime**
   y **Comprobar acceso público**. Si este último falla, el enlace no está acreditado
   como funcional aunque las pruebas del motor pasen. El enlace aparece en el
   nombre del paso **Probar durante 90 minutos** y en el resumen de la ejecución.
3. Abrirlo y elegir **Entrar como invitado**. No se usan cuentas reales ni Google.
4. El enlace dura 90 minutos. Si ya terminó, abrir esa ejecución en GitHub Actions
   y elegir **Re-run jobs → Re-run all jobs**. Se genera otra dirección y una base
   vacía. Esto no requiere merge y no publica nada en producción.

El enlace no es alojamiento permanente. Las mesas y sesiones de esa copia se
borran al apagarla. No subir datos personales ni intentar usar saldos reales.

## Cómo probar personas y bots

1. Entrar al lobby y elegir **Crear mesa → 2vs2 · Parejas**.
2. Elegir 15/30 puntos, 15/30 segundos y apuesta; crear y sentarse en un lugar.
3. Para jugar solo, agregar tres bots y pulsar **Empezar partida**.
4. Para sumar personas, usar navegadores o perfiles distintos (una cuenta por
   persona). En mesa pública eligen **Elegir asiento**; en privada ingresan el
   código mostrado en la sala mediante **Unirse con código**.
5. Elegir dos lugares del mismo equipo (A o B) para ser compañeros, o equipos
   diferentes para ser rivales. Completar los lugares restantes con bots.
6. Jugar hasta el resultado y volver al lobby. Probar envido, sus aumentos,
   respuestas por compañeros, mazo, recarga y pérdida temporal de conexión.

No usar pestañas de la misma sesión para representar personas diferentes: las
cookies de inicio de sesión se comparten.

## Verificaciones

Ejecutadas localmente:

- Reconstrucción del esquema más historial y migración nueva en PGlite.
- `supabase/tests/team_games.sql`: partidas completas en las cinco composiciones,
  a 15 y 30 puntos, con ambos relojes. Permisos autenticados, privacidad, carta
  canónica, duplicados, versiones viejas, envido en orden, empate de tantos,
  pardas, mazo en diferentes fases, timeouts, presencia, cancelación y pagos.
- Tipos de TypeScript y build de Next.js con la modalidad habilitada.
- Lista de RPC: 67 de cliente y cuatro exclusivas del servidor.
- ESLint de los componentes modificados: sin errores; conserva una advertencia
  previa del lobby acerca de dependencias de un efecto 1vs1.

Ejecutadas en CI: suite SQL anterior y `supabase/tests/team_concurrency.sh`, que abre
conexiones PostgreSQL independientes para disputar asiento, reparto, respuesta y
pago. El resultado de CI se registra en el PR; PGlite no acredita concurrencia
entre conexiones ni entrega real de eventos Supabase Realtime. Las dos suites
también pasaron dentro del stack Supabase local real en la primera ejecución de
preview del 10/09/2026. La ejecución 3 completó también la prueba online: cuatro
invitados, 12 cartas jugadas, recuperación de sesión, privacidad RLS, nueve eventos
Realtime recibidos y resultado común. El entorno usa Node 24, como Vercel.

`scripts/preview-online-check.mjs` agrega el recorrido por la API pública con
cuatro invitados: creación, asientos, cartas privadas, recuperación de sesión,
partida hasta el puntaje ganador, resultado común y eventos Realtime por WebSocket.
También cubre las otras cuatro composiciones en mesas independientes, con bots
decididos por el servidor y partidas que terminan por puntos. Desde `e66e4e5` se
ejecuta por el proxy local de la copia (HTTP y WebSocket reales), separada de la
disponibilidad del DNS de Cloudflare. La ejecución 3 sí recorrió el enlace público.
Su resultado no sustituye la revisión visual ni acredita el enlace externo.

### Resultado acreditado de la ejecución 8

En el reintento del 10/09/2026, job `103001019501`, pasaron la reconstrucción,
las suites SQL/concurrencia, las cinco composiciones y la comprobación pública.
La sesión se apagó y borró correctamente al vencer sus 90 minutos.

| Composición | Resultado de la prueba por Auth/API/WebSocket |
|---|---|
| Cuatro personas | 20 cartas jugadas, 22 eventos Realtime, recarga y resultado común |
| Tres personas y un bot | 3–15, final por puntos |
| Dos personas rivales y dos bots (0/1) | 2–16, final por puntos |
| Dos personas compañeras y dos bots (0/2) | 15–5, final por puntos |
| Una persona y tres bots | 15–8, final por puntos |

El envido puede superar el objetivo: por eso 16 puntos es un cierre válido.
Cada persona usa una sesión Auth independiente y cada bot decide en el servidor.

### Navegador

El 10/09/2026 se verificó con Chrome e invitado de prueba:

- Crear mesa, elegir asiento, agregar tres bots y empezar sólo con cuatro lugares.
- Partida 2vs2 completa hasta 15–8: cartas, envido, falta envido, truco, declaración
  de tantos, resultado por equipo, cobro de 20 y vuelta al lobby con saldo 1010.
- Recarga conservando el asiento y la mano en curso.
- 320 × 568 y 390 × 844: ancho y alto de contenido iguales al tamaño de pantalla,
  sin desplazamiento. La etiqueta «Tu compañero» permanece visible y el canto
  ocupa su propio espacio, sin tapar las cartas. Resultado 2vs2 y regreso al lobby
  comprobados también en 320 × 568.
- 1vs1: creación y cancelación con devolución, ingreso a una mesa pública de un
  bot existente, cartas y cantos, cierre por puntos 8–15 y regreso al lobby.

**Hallazgo previo del 1vs1:** su resultado final con objetivos de invitado excede
568 px de alto (contenido de 667 px; botón de regreso a 604–642 px). Los archivos
`src/app/game/[id]/GameClient.tsx` y `src/components/game/salon.module.css` no tienen
cambios respecto de la base del PR. Es una limitación anterior de la pantalla 1vs1,
no del resultado 2vs2. No se modificó ese flujo dentro de esta entrega.

Pendiente de cierre visual: 430 px, escritorio y un salón con mesa integrada
(Quincho). El 11/09 el navegador bloqueó la apertura de la tienda por su política
de acceso; no se intentó eludir ese bloqueo. La compra no se da por realizada.
Las comprobaciones de tamaño usan un marco del tamaño indicado
en Chrome, no un iPhone físico. No se acredita una sesión manual con cuatro
personas en dispositivos distintos: esas composiciones se verificaron con sesiones
independientes por la API real y en pruebas de concurrencia.
