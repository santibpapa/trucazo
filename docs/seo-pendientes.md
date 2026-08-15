# SEO y GEO — estado y seguimiento

Última actualización: **15/08/2026**.

Este documento reemplaza la auditoría orientativa del 15/07/2026. Se retiró el
puntaje “72/100” porque no provenía de una metodología reproducible ni de datos
completos de rastreo, indexación, rendimiento de campo y Search Console.

## Implementado en `agent/seo-geo-growth`

- Canonical propio en cada página pública; el layout raíz ya no impone `/`.
- `noindex` explícito en login, registro, reseña y pantallas privadas.
- `robots.txt` permite rastrear las rutas utilitarias para leer su `noindex`.
- Sitemap ampliado exclusivamente con páginas públicas y canónicas.
- Home con H1 visible, descripción del producto y CTA invitado prioritario.
- Guía de reglas corregida y ampliada según la modalidad real de Trucazo.
- Landing de juego sin afirmaciones incorrectas sobre rivales o registro.
- Clúster público de reglas, orden de cartas, envido, pardas y mano a mano.
- Calculadora de envido interactiva y compartible.
- Landings públicas separadas para invitado, amigos, CPU y Modo Historia.
- Páginas de acerca de, contacto, privacidad y términos.
- Metadata, Open Graph dinámico, breadcrumbs y datos estructurados coherentes.
- Eventos para CTA de invitado, creación de sesión y registro.
- `llms.txt` actualizado como documento opcional, sin atribuirle impacto de ranking.

## Acciones externas pendientes

Estas tareas requieren acceso a producción o datos que no están en el repositorio:

1. Confirmar que `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` esté configurada.
2. Enviar `https://www.trucazo.com.ar/sitemap.xml` en Search Console.
3. Registrar línea base de 28 días: consultas de marca/no marca, impresiones,
   clics, CTR, posición y páginas indexadas.
4. Inspeccionar home, guía, orden de cartas y calculadora después del despliegue.
5. Revisar Core Web Vitals de campo cuando exista muestra suficiente.
6. Fijar metas porcentuales recién después de contar con esa línea base.

## Seguimiento editorial

- Revisar Search Console a los 28, 60 y 90 días.
- Priorizar ampliaciones desde consultas reales, no desde listas masivas.
- Actualizar `lastModified` sólo cuando cambie materialmente una página.
- Mantener reglas, funcionalidades, autoría y fechas verificables.
- No añadir ratings, reseñas, usuarios ni estadísticas a schema sin evidencia pública.

## Backlog condicionado a demanda

- Estrategia básica y avanzada.
- Probabilidades con metodología publicada.
- Glosario del truco argentino.
- Historia cultural del juego con fuentes.
- Señas y modalidades por equipos, dejando claro que Trucazo es 1 contra 1.
- IndexNow sólo si Bing pasa a ser una fuente de tráfico relevante.
- CSP en una sesión dedicada con pruebas completas de Supabase, Google y Vercel.
