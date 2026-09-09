# 2vs2 — implementación y prueba previa al lanzamiento

El PR #57 conserva el 1vs1 y agrega las mesas por parejas mediante un motor
separado. **Sigue en borrador: faltan la preview aislada y la prueba visual.**
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

La base de preview debe tener el esquema y catálogos actuales del 1vs1. Para CI
se reconstruye de cero con `scripts/rebuild-db.sh`; su andamiaje local no debe
copiarse al servicio Supabase. La provisión de la base Supabase de preview y la
verificación de sus catálogos se harán antes de entregar el enlace de prueba.

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

## Cómo probar cuando se publique la preview

1. Entrar al lobby y elegir **Crear mesa → 2vs2 · Parejas**.
2. Elegir 15/30 puntos, 15/30 segundos y apuesta; crear y sentarse en un lugar.
3. Para jugar solo, agregar tres bots y pulsar **Empezar partida**.
4. Para sumar personas, usar navegadores o perfiles distintos (una cuenta por
   persona). En mesa pública eligen **Elegir asiento**; en privada ingresan el
   código mostrado en la sala mediante **Unirse con código**.
5. Elegir 0/2 o 1/3 para ser compañeros, o equipos diferentes para ser rivales.
   Completar únicamente los lugares restantes con bots.
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

Agregadas a CI: suite SQL anterior y `supabase/tests/team_concurrency.sh`, que abre
conexiones PostgreSQL independientes para disputar asiento, reparto, respuesta y
pago. El resultado de CI se registra en el PR; PGlite no acredita concurrencia
entre conexiones ni entrega real de eventos Supabase Realtime.

Pendiente antes de considerar terminado el objetivo:

- Base Supabase aislada y enlace funcional de preview.
- Recorrido en navegador con sesiones distintas, eventos Realtime y reconexión.
- Capturas y comprobación de controles/cartas sin recortes ni superposición en
  celulares de 320–430 px, alturas reducidas y escritorio, para los salones.
- Regresión visual y de recorrido real del 1vs1.

El navegador disponible no pudo acceder al servidor local. No se declara la
interfaz visualmente verificada por el solo hecho de que compile.
