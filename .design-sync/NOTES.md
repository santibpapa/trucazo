# design-sync — notas de este repo (Trucazo)

- Trucazo es una **app Next.js**, no una librería: no hay dist. La entrada del bundle
  es `.design-sync/ds-entry.ts` (índice manual de los 10 componentes + helpers).
  Componente nuevo ⇒ exportarlo ahí Y en `componentSrcMap` del config.
- El CSS es **Tailwind compilado** con el tema del repo. Pipeline: `buildCmd` corre
  `npx tailwindcss -c .design-sync/tailwind-ds.config.js -i .design-sync/tailwind-input.css -o .design-sync/.cache/ds.css`
  ANTES de `package-build.mjs`. El config wrapper agrega `.design-sync/previews/**` al
  `content` (las clases usadas solo en previews no existirían si no).
- Fuentes Inter/Sora: en la app las carga next/font; acá van por `@import` de Google
  Fonts en `tailwind-input.css` (+ `:root { --font-inter/--font-sora }`). `[FONT_REMOTE]`
  en validate es esperado.
- **Lienzo oscuro**: la tarjeta de preview usa fondo blanco; el tema es oscuro, así que
  TODA preview envuelve su contenido en `<div className="bg-base rounded-xl p-6">`.
- **Modal**: la celda de preview está transformada (translateZ), así que `fixed inset-0`
  se ancla a la celda. El wrapper `relative h-[480px] bg-base` le da tamaño de pantalla.
  Override en config: `cardMode single`, viewport 720x560 (con <640px de ancho el modal
  se pega abajo por `items-end sm:items-center`).
- **Chromium**: no hay cache de ms-playwright; se usa el Chrome del sistema vía
  `$env:DS_CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"`
  (playwright instalado en `.ds-sync/` sin descargar browsers).
- **Imágenes de cartas**: `PlayingCard` referencia `/cartas/{palo}_{valor}.png`
  (public/cartas). Tras cada build hay que copiar: `Copy-Item -Recurse public\cartas ds-bundle\cartas`
  (el build borra ds-bundle). `cartas/**` está en el plan de subida. Ruta absoluta:
  si el producto no sirve el proyecto en la raíz web, las imágenes pueden no verse en
  los diseños generados — verificar en el panel; las previews locales sí las muestran.
- Los componentes de app (FriendsPanel, ChatGlobal, etc. — con Supabase) están
  excluidos vía `componentSrcMap: null`.

## Known render warns

- (ninguno vigente — los [RENDER_THIN]/[RENDER_BLANK] de CoinIcon/Panel eran floor
  cards pre-autoría y se resolvieron con las previews)

## Re-sync risks

- El tema vive en `tailwind.config.ts` del repo: si el dueño cambia colores/sombras,
  hay que recompilar el CSS (buildCmd) y re-verificar; conventions.md enumera clases
  que podrían dejar de existir (validarlo contra el CSS fresco).
- `ds-entry.ts` y `componentSrcMap` son listas manuales: componentes nuevos en
  `src/components/ui|game` NO entran solos.
- Las cartas PNG se copian a mano post-build (ver arriba) — un re-sync que lo omita
  sube previews de PlayingCard sin imágenes.
- Google Fonts por red: sin conexión, las previews caen a system-ui.
