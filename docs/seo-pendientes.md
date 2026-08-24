# SEO y GEO — estado y seguimiento

Última actualización: **24/08/2026**.

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

## Implementado en `claude/google-seo-api-connection`

Preparación para agentes de IA:

- Página 404 propia, en castellano, con enlaces al sitemap, al `llms.txt` y a las
  guías. Antes salía la pantalla de fábrica de Next, en inglés y sin salidas.
- Negociación de contenido: las páginas públicas se sirven en Markdown cuando el
  cliente lo pide con `Accept: text/markdown` (convención de acceptmarkdown.com).
  El Markdown lo genera el build desde el HTML real, no se escribe a mano.
- `llms.txt` con secciones de cuándo usar y cuándo NO usar el sitio.
- Lista de páginas públicas unificada en `src/lib/routes.ts`, consumida por el
  sitemap, el `llms.txt` y la negociación de Markdown.

Medición automática:

- `scripts/seo-report.mjs` + `.github/workflows/seo.yml`: cada 1 y 15 baja los
  datos de Search Console, los compara con las cuatro semanas anteriores, revisa
  el sitio en vivo y publica todo como issue del repositorio.

## Acciones externas pendientes

Estas tareas requieren acceso a producción o datos que no están en el repositorio:

1. ~~Confirmar que `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` esté configurada.~~
   **Resuelto de otra forma:** el dominio está verificado por registro TXT en el
   DNS, que cubre todo el dominio y sus subdominios. Esa variable de entorno ya
   no hace falta; el código la sigue soportando por si algún día se usa.
2. Enviar `https://www.trucazo.com.ar/sitemap.xml` en Search Console.
3. ~~Registrar línea base de 28 días: consultas de marca/no marca, impresiones,
   clics, CTR, posición y páginas indexadas.~~ **Automatizado**: lo hace el
   informe quincenal, que además separa marca de no marca en cada corrida.
4. Inspeccionar home, guía, orden de cartas y calculadora después del despliegue.
5. Revisar Core Web Vitals de campo cuando exista muestra suficiente.
6. Fijar metas porcentuales recién después de contar con esa línea base.
7. Agregar las redes sociales del juego al `sameAs` del schema `Organization`
   (hoy sólo apunta al GitHub personal del autor). Requiere que existan esas
   cuentas. Es la señal más débil hoy para que Google distinga la marca
   "Trucazo" de la palabra común y de la app homónima en Google Play.

## Seguimiento editorial

- Revisar Search Console a los 28, 60 y 90 días (ahora llega solo: el informe
  quincenal lo publica como issue).
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
