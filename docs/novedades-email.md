# Campaña Novedades

En `/admin/emails` aparece **Novedades**, activa por defecto. Toma el título y
el cuerpo de cada nueva publicación. Se inicia al confirmar la publicación en
Supabase, tanto desde Comunidad como desde SQL. Editar una novedad no dispara
otro envío ni modifica el texto de las tandas que ya comenzaron.

El público son los usuarios registrados hasta `created_at` de la publicación,
con email confirmado, excluyendo invitados, bots y direcciones de prueba.
Incluye administradores. Verifica las bajas antes de cada tanda; no incorpora
usuarios registrados después de publicar.

Cada INSERT crea un trabajo privado con copia del texto y una credencial aleatoria
por novedad. Un trigger llama por HTTPS al endpoint `/api/email/news`. El endpoint
verifica esa credencial contra la base, toma un bloqueo temporal y utiliza las
mismas bajas, reclamos atómicos y claves de deduplicación del sistema existente.
No acepta destinatarios ni contenido en el pedido y no puede ejecutar campañas
de reactivación. Las credenciales nunca llegan al panel ni al navegador.

Los correos se envían por tandas de hasta 90 (o `EMAIL_MAX_PER_RUN`, limitado por
la RPC a 100). El primer intento sale al publicar; las tandas restantes se
revisan cada minuto. Ante un fallo del proveedor se espera 15 minutos. Sus cuotas
pueden demorar el envío completo: iniciar no significa que todos hayan recibido.
El panel muestra los envíos reales y la finalización, no un éxito anticipado.

Pausar detiene nuevas incorporaciones y tandas pendientes. Reactivar continúa
las pendientes, pero no agrega retroactivamente publicaciones hechas en pausa.
El cron Vercel `0 22 * * *` sigue a las 19:00 Argentina y solo envía recordatorios.

## Instalación

Desplegar el código y aplicar
`supabase/migrations/20260908160027_immediate_news_campaign.sql` en Supabase.
La migración habilita pg_net, crea la campaña activa, el trigger y el reintento
`trucazo-news-email-retry`. Incorpora únicamente la última novedad existente si
tiene email habilitado y no está completada; no vuelve a publicar el anuncio.
No requiere copiar CRON_SECRET ni ninguna clave de Resend.

## Comprobaciones

`npm run check:emails` verifica contenido, cortes de registro, bajas, aislamiento
entre novedades y campañas y claves distintas para publicaciones diferentes.
`supabase/tests/immediate_news.sql` verifica trigger, copia inmutable, bloqueo,
pausa y permisos dentro de una transacción que se revierte. No envía correos.
El andamiaje PostgreSQL local reemplaza pg_net por una función sin red; producción
usa la extensión real. La compilación y el CI verifican la integración.
