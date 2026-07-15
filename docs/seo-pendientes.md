# SEO — pendientes y hoja de ruta

Estado de las mejoras de SEO de Trucazo. Sale de una auditoría hecha con 5 skills
(auditoría general, técnico, schema, sitemap, imágenes) el **15/07/2026**.

Puntaje de salud SEO al momento de la auditoría: **72/100**. Base buena, con
mejoras concretas para subir.

---

## ✅ Ya hecho (en la rama `claude/skills-installation-r5vhge`)

1. **`<h1>` en la portada** (`src/app/page.tsx`) — encabezado descriptivo invisible
   que antes faltaba.
2. **Schema de marca y juego** — `VideoGame` en la portada, `WebSite` +
   `Organization` en el layout (`src/app/layout.tsx`).
3. **Cabeceras de seguridad** (`next.config.mjs`) — sin CSP a propósito (ver abajo).
4. **`llms.txt`** (`src/app/llms.txt/route.ts`) — resumen para asistentes de IA.
5. **Breadcrumbs (schema)** en las 2 páginas de contenido.
6. **Fechas reales en el sitemap** (`src/app/sitemap.ts`) — estables, no "la de hoy".
   ⚠️ Mantenimiento: cuando cambie el contenido de una página, actualizar SU fecha
   en la constante `LASTMOD` de ese archivo.

---

## ⏳ Pendientes (ordenados por impacto / esfuerzo)

### 1. Revisar `historia`, `resena` y `comunidad` — ¿indexar o no?
- **Qué pasa:** esas 3 páginas existen pero están bloqueadas en `src/app/robots.ts`
  (y no están en el sitemap). Si tienen contenido bueno (la historia del truco
  rankea en Google), estás tapando terreno.
- **Qué hay que hacer:** decidir página por página. Si el contenido es sólido y
  único: sacarla del `disallow` en `robots.ts` y agregarla al `sitemap.ts`. Si es
  fina o duplicada: dejarla bloqueada.
- **Esfuerzo:** bajo (código) — pero es una **decisión del dueño** sobre cada página.

### 2. Pasar las cartas del juego a WebP (velocidad)
- **Qué pasa:** las 40 cartas en `public/cartas/*.png` pesan ~2,5 MB en total
  (promedio 63 KB, la más pesada 133 KB). Cargan lento en el celular con datos.
- **Qué hay que hacer:** convertir los PNG a WebP (`cwebp -q 82`), y ajustar
  `src/lib/truco.ts` (función que arma la ruta `/cartas/{palo}_{valor}.png`) para
  que apunte a `.webp`. Probar el juego completo después.
- **Esperado:** ~2,5 MB → ~800 KB. **Es rendimiento, no SEO puro.**
- **Esfuerzo:** medio. Toca el render del juego → probar con calma en una sesión aparte.

### 3. Crear páginas de contenido nuevas
- **Qué pasa:** hoy hay solo 2 páginas indexables de contenido. Es poco terreno.
- **Ideas de páginas (cada una = una puerta de entrada desde Google):**
  "las señas del truco", "trucos para ganar al truco", "las cartas del truco y su
  orden", "qué es el envido", "truco para dos jugadores".
- **Qué hay que hacer:** **escribir el contenido** (acá tiene que meter mano el
  dueño; no inventarlo). Después se maqueta con `SeoPageLayout` (mismo molde que
  las 2 que ya existen), se agrega al `sitemap.ts` y listo.
- **Esfuerzo:** medio-alto (es sobre todo redacción). **Es la mejor palanca a futuro.**

### 4. Imágenes en las páginas de contenido (Google Imágenes)
- **Qué pasa:** las páginas de contenido no tienen ni una foto → no captás tráfico
  de Google Imágenes ("cartas de truco", "mazo español").
- **Qué hay que hacer:** sumar 1-2 imágenes relevantes (ej: el mazo, el orden de
  las cartas) con nombre de archivo descriptivo (`cartas-del-truco-orden.webp`) y
  `alt` que describa la imagen.
- **Esfuerzo:** bajo-medio (hace falta el asset de imagen).

### 5. Content-Security-Policy (CSP)
- **Qué pasa:** dejamos afuera esta cabecera de seguridad a propósito.
- **Por qué:** mal configurada rompe Supabase, el login con Google y las métricas
  de Vercel. Necesita armarse con lista blanca de dominios y **probarse a fondo**.
- **Esfuerzo:** medio, con riesgo. Hacerlo en una sesión dedicada, no al apuro.

### 6. IndexNow (opcional)
- Protocolo que le avisa al instante a Bing/Yandex cuando publicás algo. Impacto
  chico (Google no lo usa). Esfuerzo bajo. Backlog.

---

## 🔑 Cosas del dueño (fuera del código)

- **Google Search Console:** verificar que la variable
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` esté seteada en Vercel y el sitio dado de
  alta en Search Console, para ver cómo te encuentra la gente.
- **`AggregateRating` en el schema del juego:** cuando tengas reseñas/puntuaciones
  REALES de jugadores, se puede agregar al schema `VideoGame` para mostrar estrellas
  en Google. **No inventar puntuaciones** (Google penaliza).

---

## ℹ️ Nota sobre las skills de SEO
Las skills que se usaron para esta auditoría (`seo-audit`, `seo-technical`,
`seo-schema`, `seo-sitemap`, `seo-images`) se instalaron en `.claude/skills/` en
modo "solo esta sesión" (esa carpeta está en `.gitignore`, no se guarda en el
repo). Si en otra sesión querés re-auditar, hay que reinstalarlas desde el plugin
`AgriciDaniel/claude-seo` (o pedírselo a Claude, que las baja en un minuto).
