# Chat escrito en partidas — implementación

Estado: chat escrito activado en producción con la migración inicial. La migración para incluir a los bots se aplica antes de desplegar el PR correspondiente.

## Alcance

En mesas 1v1 y 2vs2, incluidos torneos, partidas con bots y campaña, el botón de chat abre «Mensajes» y «Frases rápidas». Toda la mesa lee los mensajes. Los invitados sentados leen y siguen usando frases rápidas; el panel les avisa que solo registrados pueden escribir. Los bots también responden brevemente al chat escrito desde la base, con una pausa de 2 a 5 segundos y un límite para evitar respuestas constantes. La excepción es el rival de campaña Don Salvador, el Mudo, que conserva su silencio. Las respuestas son frases predefinidas; no mantienen una conversación abierta.

El panel se superpone a la partida y tiene su propia lista desplazable. Silenciar chat oculta avisos del texto libre durante esa partida, sin silenciar frases, cantos o sonidos. El chat no modifica la versión, los turnos ni los relojes del juego. Se desmonta al finalizar la mesa.

## Datos y controles

La migración inicial es `supabase/migrations/20260928023421_match_live_chat.sql`. Crea `match_chat_messages`, con lectura limitada por RLS a jugadores sentados, y `send_match_chat_message`, que exige usuario registrado, pertenencia y partida en juego. La migración posterior `supabase/migrations/20260928165300_match_chat_bots.sql` permite las mesas con bots, agrega sus respuestas desde el servidor y conserva esas reglas. Los mensajes se limitan a 200 caracteres, un envío cada 3 segundos por autor, y el mismo texto cada 10 segundos por mesa. Cada intento usa un UUID: repetirlo con el mismo texto devuelve el mismo mensaje.

Los últimos 100 mensajes se recuperan al conectar, al reconectar y al volver a la pestaña. Realtime envía solo INSERT de la tabla; la consulta y los eventos se combinan por ID. Una tarea horaria borra mensajes de más de 72 horas. No hay archivo histórico. HTML y URLs se muestran como texto plano.

## Verificación

- Ejecutados localmente: `npx tsc --noEmit`, `npm run lint`, `npm run check:rpc-allowlist`, `npm run check:match-chat`, `npm run build` y `bash -n` del script concurrente. El lint muestra advertencias antiguas de hooks en GameClient y LobbyClient. La recuperación espera la confirmación del receptor de Postgres Changes, además del alta del canal; los rechazos del servidor conservan su explicación en el formulario.
- `supabase/tests/match_chat.sql` y `supabase/tests/match_chat_concurrency.sh` corren dentro del trabajo de PostgreSQL del CI, después de `scripts/rebuild-db.sh`. Verificar el resultado del PR antes de mergear.
- Falta probar entrega real con dos sesiones Supabase en preview y la revisión visual en iPhone/Safari o PWA: teclado y botón Enviar visibles, texto legible, aviso para invitado y cartas en su lugar. La base local de CI prueba SQL/RLS; no prueba WebSocket.

## Activación

1. Ejecutar **solo la migración nueva** `20260928165300_match_chat_bots.sql` en el SQL Editor del proyecto Supabase de producción. La primera ya se aplicó. Este paso puede hacerse antes del merge porque la pantalla publicada todavía oculta el chat en partidas con bots.
2. Mergear el PR de chat con bots y esperar a que Vercel complete el despliegue de Production. Si no se dispara solo, hacer un redeploy. `NEXT_PUBLIC_ENABLE_MATCH_CHAT=true` ya está configurada y no necesita volver a crearse.
3. En una partida con bot 1v1, en campaña y en una mesa 2vs2 con un humano y tres bots, comprobar el envío, la respuesta y las frases rápidas. Revisar el panel con el teclado móvil abierto y cerrado.

Para ocultar el panel: poner el flag en `false` y redeploy. Las frases rápidas siguen funcionando. Si hace falta cerrar también el envío en la base, ejecutar `revoke execute on function public.send_match_chat_message(text,uuid,text,uuid) from authenticated;`. Para volver a habilitarlo tras revisar el problema: `grant execute on function public.send_match_chat_message(text,uuid,text,uuid) to authenticated;`.
