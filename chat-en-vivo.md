# Chat escrito en partidas — implementación

Estado: PR listo para revisión; activación en producción pendiente.

## Alcance

En mesas 1v1 y 2vs2 con al menos dos personas, incluidos torneos, el botón de chat abre «Mensajes» y «Frases rápidas». Toda la mesa lee los mensajes. Los invitados sentados leen y siguen usando frases rápidas; el panel les avisa que solo registrados pueden escribir. Las mesas contra bots y la campaña conservan el chat rápido. El texto libre no se usa para hablar con bots.

El panel se superpone a la partida y tiene su propia lista desplazable. Silenciar chat oculta avisos del texto libre durante esa partida, sin silenciar frases, cantos o sonidos. El chat no modifica la versión, los turnos ni los relojes del juego. Se desmonta al finalizar la mesa.

## Datos y controles

La migración nueva es `supabase/migrations/20260928023421_match_live_chat.sql`. Crea `match_chat_messages`, con lectura limitada por RLS a jugadores sentados, y `send_match_chat_message`, que exige usuario registrado, pertenencia, partida en juego y al menos dos personas. Limita los mensajes a 200 caracteres, un envío cada 3 segundos por autor, y el mismo texto cada 10 segundos por mesa. Cada intento usa un UUID: repetirlo con el mismo texto devuelve el mismo mensaje.

Los últimos 100 mensajes se recuperan al conectar, al reconectar y al volver a la pestaña. Realtime envía solo INSERT de la tabla; la consulta y los eventos se combinan por ID. Una tarea horaria borra mensajes de más de 72 horas. No hay archivo histórico. HTML y URLs se muestran como texto plano.

## Verificación

- Ejecutados localmente: `npx tsc --noEmit`, `npm run lint`, `npm run check:rpc-allowlist`, `npm run build` y `bash -n` del script concurrente. El lint muestra advertencias antiguas de hooks en GameClient y LobbyClient.
- `supabase/tests/match_chat.sql` y `supabase/tests/match_chat_concurrency.sh` corren dentro del trabajo de PostgreSQL del CI, después de `scripts/rebuild-db.sh`. Verificar el resultado del PR antes de mergear.
- Falta probar entrega real con dos sesiones Supabase en preview y la revisión visual en iPhone/Safari o PWA: teclado y botón Enviar visibles, texto legible, aviso para invitado y cartas en su lugar. La base local de CI prueba SQL/RLS; no prueba WebSocket.

## Activación

1. Con el PR en preview, usar una base de prueba con `20260928023421_match_live_chat.sql` aplicada y configurar `NEXT_PUBLIC_ENABLE_MATCH_CHAT=true` en el entorno Preview de Vercel. Hacer redeploy de preview. Probar con dos cuentas y un invitado.
2. Mergear el PR con el flag de producción ausente o en `false`.
3. Copiar el contenido completo de `supabase/migrations/20260928023421_match_live_chat.sql` en el SQL Editor del proyecto Supabase de producción y ejecutarlo una sola vez. Confirmar que existen la tabla, la RPC, la publicación `supabase_realtime` para esa tabla y el trabajo `trucazo-match-chat-cleanup`.
4. En Vercel, configurar `NEXT_PUBLIC_ENABLE_MATCH_CHAT=true` para Production y hacer redeploy. La variable pública se incluye durante la compilación; cambiarla sin redeploy no alcanza.
5. En una partida entre dos personas, comprobar envío y recepción, y con un invitado comprobar lectura y aviso. Revisar el panel con el teclado móvil abierto y cerrado.

Para ocultar el panel: poner el flag en `false` y redeploy. Las frases rápidas siguen funcionando. Si hace falta cerrar también el envío en la base, ejecutar `revoke execute on function public.send_match_chat_message(text,uuid,text,uuid) from authenticated;`. Para volver a habilitarlo tras revisar el problema: `grant execute on function public.send_match_chat_message(text,uuid,text,uuid) to authenticated;`.
