# Diseño — sistema visual, mesa y recursos

[Volver al README](../README.md) · Documento principal del diseño. Organización actualizada el **13/10/2026**; se conservan las decisiones y pruebas existentes.

## Estado actual

- Tema oscuro vino y oro; la app Android conserva componentes, pantallas, tipografía, sonidos y recursos de la web.
- La partida debe entrar completa en una sola pantalla, incluyendo los cantos con más opciones. Adaptar al alto disponible sin cortar controles ni agregar desplazamiento.
- El arte de los salones y las convenciones de componentes se conservan abajo. La copia técnica [.design-sync/conventions.md](../.design-sync/conventions.md) existe porque la lee el generador; su fuente es [este documento](#convenciones-diseno).
- Criterios de velocidad medidos: sin animate-fade-up en el contenido inicial; animaciones infinitas sólo de opacidad/transform; imágenes a 3× de su mayor uso; cartas visibles con priority; consultas de servidor en paralelo.

## Próximo paso y cómo retomar

Al adaptar el juego a Android, seguir [su etapa vigente](android.md#android-estado-actual), reutilizar la presentación existente y comprobar que cartas, cantos y controles entren completos. Leer las convenciones antes de modificar componentes. Si cambian, actualizar también su copia técnica para que el generador siga el mismo criterio.

## Guía de lectura

- [Mesa, salones, cartas y adaptación de pantalla](#salones).
- [Procedencia y textos del arte](#arte-salones).
- [Convenciones del sistema de diseño](#convenciones-diseno).
- [Construcción y sincronización del diseño](#notas-diseno).
- Reglas obligatorias de estética y velocidad: [AGENTS.md](../AGENTS.md).

Actualizar aquí decisiones visuales, recursos y pruebas. Las rutas de código parten de la raíz del repositorio; los artefactos generados y las herramientas permanecen en sus ubicaciones.

<a id="diseno"></a>

## Diseño, salones y recursos gráficos

Se conservan la estética, las comprobaciones de una sola pantalla, el arte y sus textos de generación. Las convenciones del sistema de diseño se incluyen aquí; su archivo técnico se mantiene como copia de compatibilidad porque la herramienta lo usa al exportar.

<a id="salones"></a>

### Salones, cartas y adaptación de la mesa

Licencia de las cartas: baraja GNU de Germarquezm/Basquetteur, CC BY-SA3.0; adaptación por carta y WebP con atribución en [public/cartas/LICENCIA.txt](../public/cartas/LICENCIA.txt). La revisión y aceptación de los demás recursos de Android se registra en [ANDROID-15](android.md#android-etapa-15); no modifica las convenciones visuales.

Procedencia de personajes, avatares, fondos e ícono: el dueño confirmó el16/10/2026 que son propios/generados con IA. Se conserva esa declaración de origen y el arte existente. Los tres WAV neutros están registrados como generados internamente en su incorporación (`0f83ef6`, `src/lib/sounds.ts`). Las cartas y Geist mantienen sus licencias de terceros; esta anotación no modifica las convenciones visuales.

Implementación visual y evidencia de sus revisiones.

Procedencia anterior: `docs/salones-club.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Salones, cartas y adaptación de la mesa</summary>

<a id="salones-rediseno-de-partida-y-salones-del-club"></a>

### Rediseño de partida y salones del club

La partida comparte el ambiente y la mesa con el visor de la tienda. Las cartas,
avatares, marcos, accesorios, reloj, anuncios y botones siguen siendo elementos
reales de la aplicación; las imágenes no contienen interfaz.

<a id="salones-compras-existentes"></a>

#### Compras existentes

No requiere SQL. Se conservan los slugs, precios, orden, perfiles y compras del
servidor. `src/lib/salones.ts` define exclusivamente nombres, descripciones y arte
visibles. Las RPC de compra y activación siguen recibiendo el mismo slug.

| Salón anterior | Nuevo diseño | Slug conservado |
|---|---|---|
| Salón Clásico | Club de barrio | clasico |
| Cafetín Porteño | Cafetín porteño | cafetin |
| Quincho de Estancia | Quincho | quincho |
| Neón Nocturno | Peña norteña | neon |
| Rooftop Metropolitano | Bodegón | rooftop |
| Salón Presidencial | Refugio patagónico | presidencial |

Revertir el PR restaura la presentación anterior sin migrar compras.

<a id="salones-arte-y-adaptacion"></a>

#### Arte y adaptación

- Seis ambientes originales WebP de 1536×1024 (124–197 KB por archivo).
- Aro de madera compartido WebP (209 KB); las máscaras SVG de geometría recortan
  sus contornos en el navegador. El paño y su textura se componen debajo.
- `SalonScene` comparte estos elementos entre partida y tienda. El fondo conserva
  el ancho de la escena en móvil, para no perder los objetos laterales.
- CSS aislado en `salon.module.css`. Filas estables para rival, tres rondas,
  mano, jugador, estado y respuestas. La partida entra en el alto visible sin
  desplazamiento; cartas y asientos se adaptan al espacio restante de la mesa.
- El visor usa un diálogo nativo (foco, Escape y cierre), se carga a demanda y
  no compra, equipa ni crea partidas.

<a id="salones-comprobaciones"></a>

#### Comprobaciones

Se revisó la presentación en navegador con estados locales de partida:
turno propio, respuesta al truco, tercera ronda y vista previa de tienda;
tamaños móviles 390×844 y 375×667, y escritorio. El visor abre y cierra con Escape.
Las pruebas visuales usaron datos ficticios, sin jugar ni comprar en producción.
Los fixtures no forman parte del despliegue.

Se comparó el bloque de estado, efectos y acciones de GameClient contra master:
la lógica permanece intacta. La validación final incluye tipos, lint, build y
los controles habituales de RPC y simulación de truco.

<a id="salones-como-probar-en-vercel"></a>

#### Cómo probar en Vercel

1. Abrir la preview e iniciar sesión normalmente.
2. Ir a Tienda: `Ver mesa` permite inspeccionar cualquiera de los seis salones
   sin gastar monedas. `Usar` conserva su comportamiento para los ya comprados.
3. Entrar en una partida y comprobar cartas, envido/truco, reloj, chat y sonido.
4. Revisar en el teléfono antes de aprobar el merge.

La preview mantiene las conexiones que tenga configuradas ese proyecto Vercel;
las compras y partidas reales siguen utilizando su backend configurado.

<a id="salones-correccion-del-quincho-a-partir-de-la-referencia-aprobada"></a>

#### Corrección del Quincho a partir de la referencia aprobada

El Quincho utiliza ahora quincho-reference.webp (212 KB), una edición de la
referencia para quitar interfaz, cartas y retratos conservando la escena y la
mesa. El fondo completo mantiene el mate, la parrilla, el paño texturado y el
borde ancho. No se superpone la mesa genérica a esta escena.

El marcador compacto, los retratos y las acciones se acomodan a esa composición.
Las tres rondas reservan su lugar de izquierda a derecha desde el comienzo.
Los controles permanecen visibles sin desplazar la partida.
Se revisaron el turno propio, la respuesta al truco, la tercera ronda y el visor
de la tienda con datos ficticios. No se hicieron compras ni partidas reales.

El mismo tratamiento se aplica también al Cafetín porteño, Peña norteña,
Bodegón y Refugio patagónico: cada escena se edita directamente desde su boceto
aprobado para quitar cartas, retratos, textos y botones. Conserva su propia mesa,
paño, borde y ambiente. Los cinco salones usan `integratedTable: true`, que activa
la presentación del Quincho tanto en partida como en el visor de tienda.
Club de barrio conserva su presentación anterior dentro del PR.

Los cuatro fondos nuevos usan WebP con pérdida (121–153 KB por escena),
941 px de ancho y proporción vertical equivalente al Quincho. Las ilustraciones
de cartas, dorsos y avatares siguen siendo los elementos reales del juego.
Los tamaños, esquinas de 6 px, destinos y animaciones aprobados no cambian.

Validación de esta extensión: Cafetín a 390×844, Peña a 320×568 con las seis
respuestas al truco, Bodegón a 375×667 con tres rondas y Refugio a 390×844 con
respuesta al envido. En todos, alto de contenido igual al alto visible.
Visor de Refugio comprobado con apertura y cierre por Escape. Build de Next
(incluye tipos y lint) correcto, con las advertencias de hooks preexistentes.
Los datos y rutas locales de prueba quedaron fuera del despliegue.
Prompts y procedencia del arte: [salones-art-prompts.md](#arte-salones).

<a id="salones-regla-de-una-sola-pantalla"></a>

#### Regla de una sola pantalla

El ajuste sin scroll se aplica a todos los salones. El contenedor usa 100dvh
(alto visible con las barras del navegador) y las medidas de cartas y asientos
dependen del espacio de mesa que queda después del marcador y los controles.
No se reducen los botones de respuesta de 44 px ni se ocultan opciones.
La tienda y sus diálogos conservan su desplazamiento normal.

<a id="salones-cartas-fijas-mas-legibles-y-con-recorrido-desde-la-mano"></a>

#### Cartas fijas, más legibles y con recorrido desde la mano

- Los seis destinos están presentes aunque estén vacíos. Al completar una ronda
  o resolver una parda solo cambia qué carta queda encima, nunca su posición.
- `CardMotion` anima desde la posición real de la carta tocada hasta su destino,
  con un pequeño arco, giro y desaceleración de 460 ms. Empieza antes de esperar
  la RPC; la confirmación se entrega sin repetir la entrada ni mostrar duplicados.
- Las cartas nuevas del rival salen de su fila de mano. Las cartas del historial
  inicial no vuelven a animarse. Se respeta `prefers-reduced-motion` y se limpian
  las animaciones al cambiar de mano o salir de la partida.
- La mano crece aproximadamente un 12% y las jugadas hasta un 27%, según el alto
  disponible. En pantallas bajas el aumento es menor para separar las filas.
  Chat y sonido quedan junto al retrato rival, fuera de la tercera ronda.
- La validación y los errores de `play_card` siguen siendo los existentes;
  no se modifican reglas, RPC ni SQL.

Prueba local interactiva: tres jugadas propias y entradas del rival con respuesta
simulada de 700 ms, seis destinos con coordenadas idénticas antes y después,
pardas sin desplazamiento, y error de RPC que devuelve las tres cartas a la mano
sin dejar una carta flotante. Revisadas las separaciones y controles en 320×568,
375×667 y 390×844. Datos ficticios; sin partidas ni compras en producción.

<a id="salones-redondeo-minimo-y-capas-sincronizadas"></a>

##### Redondeo mínimo y capas sincronizadas

Las cartas y los dorsos usan un radio de 6 px, también en el Quincho,
para ocultar el pequeño borde oscuro de las ilustraciones en las esquinas.
La copia animada vive dentro de su destino, no por encima de toda la pantalla.
Para la jugada propia se anticipa únicamente la capa visual con los rangos ya
conocidos: una perdedora no tapa temporalmente a la ganadora. La RPC sigue
siendo la única autoridad sobre resultados, turnos y puntos. Al confirmar o
rechazar se limpia la copia y se restaura la capa controlada por React.

Se comprobaron en navegador las capas de ganadora, perdedora y parda durante
el recorrido y después de la confirmación, simulando 1800 ms de demora.
La copia en movimiento conserva el mismo radio que la carta en la mano.

<a id="salones-mesas-al-volver-de-la-tienda"></a>

#### Mesas al volver de la tienda

El lobby ya no condiciona la lectura de mesas al número que devuelve
`ensure_lobby_tables`: cero indica que no creó mesas, no que no existan.
Se consulta la lista pública actual al entrar y al conectar/reconectar Realtime.
Las respuestas viejas o posteriores a salir no reemplazan la lista; los errores
de lectura conservan lo que ya se mostraba. Cada entrada usa un canal propio
para no reutilizar uno que todavía se está cerrando.

No es una condición exclusiva de la preview: la navegación puede reutilizar
datos viejos también en producción. Se aplica igual a invitados y registrados,
sin cambios en compras, autenticación, RLS ni SQL.

Regresión incluida en CI: `node --import tsx scripts/check-lobby-tables.ts`.
Cubre lista inicial vacía con mesas existentes y reposición cero, reconexión,
respuestas fuera de orden, errores y salida/vuelta rápida.

</details>

<a id="arte-salones"></a>

### Procedencia y textos del arte

Material de referencia de los cuatro salones.

Procedencia anterior: `docs/salones-art-prompts.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Procedencia y textos del arte</summary>

<a id="arte-salones-arte-de-los-cuatro-salones-septiembre-2026"></a>

### Arte de los cuatro salones — septiembre 2026

Editado con la herramienta integrada de generación de imágenes a partir de cada boceto aprobado. Se conserva el PNG original fuera del repositorio; los assets WebP optimizados se consumen en partida y tienda.

<a id="arte-salones-cafetin"></a>

#### cafetin

Asset: `public/mesa/club/cafetin-reference.webp`.
Referencia: `exec-be7e46e2-f519-4271-9b6a-c1c0b74f45ed.png`.

Prompt utilizado:

```text
Use case: precise-object-edit. Asset type: production background for a mobile Argentine truco game, portrait 9:16. Edit the attached approved cafetin mockup directly. Remove ALL interface overlays: every text, title, score panel and its frame, back arrow, settings gear, both portrait medallions and names, all six playing cards including card backs and their shadows, turn label and lines, chat icon, every bottom button and its border. Seamlessly reconstruct the room, empty felt, continuous wooden table rim and foreground underneath. Preserve the original image's exact composition, camera, table geometry, scale, perspective, textures, lighting and colors. Keep dark green felt, worn golden brown wood rim, coffee cup and sugar dispenser on marble side table at upper left, rain streaked windows and amber street lamps at upper right exactly as shown. Table top rim begins at about 17% of image height, empty playing felt extends to about 71%, bottom wood rim at about 76%, dark unobstructed foreground at bottom for real buttons. Do not shrink, recenter, move or redesign the table. Keep large clean empty felt with natural uniform texture, not patchy blurred remnants. Preserve all existing physical scene details. No people, cards, text, numbers, symbols, logos, interface panels, buttons or watermarks. One finished full scene, no collage. This is extraction/cleanup of approved artwork, not a new design.
```

<a id="arte-salones-pena"></a>

#### pena

Asset: `public/mesa/club/pena-reference.webp`.
Referencia: `exec-303f1e11-abdf-4982-84e6-8726d3749903.png`.

Prompt utilizado:

```text
Use case: precise-object-edit. Asset type: production background for a mobile Argentine truco game, portrait 9:16. Edit the attached approved pena mockup directly. Remove ALL interface overlays: every text, title, score panel and its frame, back arrow, settings gear, both portrait medallions and names, all six playing cards including card backs and their shadows, turn label and lines, chat icon, every bottom button and its border. Seamlessly reconstruct the room, empty felt, continuous wooden table rim and foreground underneath. Preserve the original image's exact composition, camera, table geometry, scale, perspective, textures, lighting and colors. Keep plum wine felt, geometric inlaid wooden rim, adobe walls, woven textile and mate at left, lantern and guitar at right exactly as shown. Table top rim begins at about 17% of image height, empty playing felt extends to about 71%, bottom wood rim at about 76%, dark unobstructed foreground at bottom for real buttons. Do not shrink, recenter, move or redesign the table. Keep large clean empty felt with natural uniform texture, not patchy blurred remnants. Preserve all existing physical scene details. No people, cards, text, numbers, symbols, logos, interface panels, buttons or watermarks. One finished full scene, no collage. This is extraction/cleanup of approved artwork, not a new design.
```

<a id="arte-salones-bodegon"></a>

#### bodegon

Asset: `public/mesa/club/bodegon-reference.webp`.
Referencia: `exec-cd1db2b0-ac61-4cce-94c9-8d9406efd0b7.png`.

Prompt utilizado:

```text
Use case: precise-object-edit. Asset type: production background for a mobile Argentine truco game, portrait 9:16. Edit the attached approved bodegon mockup directly. Remove ALL interface overlays: every text, title, score panel and its frame, back arrow, settings gear, both portrait medallions and names, all six playing cards including card backs and their shadows, turn label and lines, chat icon, every bottom button and its border. Seamlessly reconstruct the room, empty felt, continuous wooden table rim and foreground underneath. Preserve the original image's exact composition, camera, table geometry, scale, perspective, textures, lighting and colors. Keep navy blue felt, worn dark wooden rim, soda siphon and glass on red white checkered tablecloth at upper left, wood wall paneling and framed landscape at upper right exactly as shown. Table top rim begins at about 17% of image height, empty playing felt extends to about 71%, bottom wood rim at about 76%, dark unobstructed foreground at bottom for real buttons. Do not shrink, recenter, move or redesign the table. Keep large clean empty felt with natural uniform texture, not patchy blurred remnants. Preserve all existing physical scene details. No people, cards, text, numbers, symbols, logos, interface panels, buttons or watermarks. One finished full scene, no collage. This is extraction/cleanup of approved artwork, not a new design.
```

<a id="arte-salones-refugio"></a>

#### refugio

Asset: `public/mesa/club/refugio-reference.webp`.
Referencia: `exec-d9193dec-1eb3-4d4a-b1cf-e29605c7f407.png`.

Prompt utilizado:

```text
Use case: precise-object-edit. Asset type: production background for a mobile Argentine truco game, portrait 9:16. Edit the attached approved refugio mockup directly. Remove ALL interface overlays: every text, title, score panel and its frame, back arrow, settings gear, both portrait medallions and names, all six playing cards including card backs and their shadows, turn label and lines, chat icon, every bottom button and its border. Seamlessly reconstruct the room, empty felt, continuous wooden table rim and foreground underneath. Preserve the original image's exact composition, camera, table geometry, scale, perspective, textures, lighting and colors. Keep deep petrol teal felt, light worn wooden rim, snowy pine mountains through left window, steaming enamel mug at left, stone fireplace with fire at right exactly as shown. Table top rim begins at about 17% of image height, empty playing felt extends to about 71%, bottom wood rim at about 76%, dark unobstructed foreground at bottom for real buttons. Do not shrink, recenter, move or redesign the table. Keep large clean empty felt with natural uniform texture, not patchy blurred remnants. Preserve all existing physical scene details. No people, cards, text, numbers, symbols, logos, interface panels, buttons or watermarks. One finished full scene, no collage. This is extraction/cleanup of approved artwork, not a new design.
```

</details>

<a id="convenciones-diseno"></a>

### Convenciones del sistema de diseño

Referencia central de las convenciones. El archivo técnico existente se conserva para el generador; actualizarlo desde esta sección si cambia el diseño.

Procedencia anterior: `.design-sync/conventions.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Convenciones del sistema de diseño</summary>

<a id="convenciones-diseno-trucazo-como-disenar-con-este-sistema"></a>

### Trucazo — cómo diseñar con este sistema

Trucazo es un juego de truco argentino, 1v1 y 2vs2. Tema oscuro **"vino & oro"**: terciopelo
de casino, acento dorado usado con criterio. Todo se diseña sobre fondo oscuro.

La app Android debe conservar el mismo diseño y experiencia visual que la web, por decisión del dueño del 11/10/2026. Reutilizar las pantallas, componentes, estilos y recursos reales; no mantener una interfaz alternativa para Historia offline. Descarga, guardado y premios pendientes usan el mismo sistema visual.

**Pulido compartido de ANDROID-14, 16/10/2026:** ventanas con foco contenido, regreso al control que las abrió y fondo inaccesible al lector; cantos, salida, sonido y apertura/cierre de chat de al menos 44 px. En horizontal con poco alto, mesa a la izquierda y controles a la derecha, con todos los cantos y salida visibles. Parejas comparte mazo y salida en la última fila cuando hay siete permisos. Brillos infinitos sólo con opacidad/transformación. Texto terciario `#A08A86` y error `#E27960`; botones positivos/informativos con texto oscuro, peligro `bg-negative-600` (`#B3432E`) con texto blanco. Contraste de estos pares comprobado sobre superficies oscuras; no cambiar los recursos ni identidades de cosméticos.

<a id="convenciones-diseno-setup"></a>

#### Setup

No hay provider: los componentes funcionan sueltos. La raíz de cada pantalla debe ser
oscura — sin eso, los componentes quedan flotando sobre blanco y los tonos no cierran:

```jsx
<div className="min-h-screen bg-base text-cream font-sans">…</div>
```

Las fuentes (Inter = `font-sans`, Sora = `font-display`) cargan solas desde `styles.css`.

<a id="convenciones-diseno-vocabulario-de-estilos-tailwind-compilado-del-juego"></a>

#### Vocabulario de estilos (Tailwind compilado del juego)

La hoja de estilos es el CSS real del juego. Usá **este vocabulario** más utilidades
comunes de layout (`flex`, `grid`, `gap-*`, `p-*`, `w-*`, `text-sm/base/lg/xl`).
No inventes colores hex ni clases de tema nuevas: no existirían en el CSS.

| Rol | Clases |
|---|---|
| Fondos | `bg-base` (página) · `bg-surface` (paneles) · `bg-surface2` (inputs, hover) |
| Acento dorado | `bg-gold text-ink` (botones/realces; hover `hover:bg-gold-600`) · `text-gold` (números, jerarquía) |
| Texto | `text-cream` (principal) · `text-muted` (secundario) · `text-subtle` (placeholders) · `text-ink` (SOLO sobre dorado) |
| Bordes | `border-line` (fino, por defecto) · `border-gold` (activo/foco) |
| Estados | Botones: `bg-positive text-ink`, `bg-negative-600 text-white`, `bg-info text-ink`; mensajes de error: `text-negative` |
| Sombras | `shadow-soft` · `shadow-card` (paneles) · `shadow-lift` (hover elevado) · `shadow-gold` (botón dorado) |
| Radios | `rounded-xl` (16px, controles) · `rounded-2xl` (20px, paneles) |
| Tipografía | `font-display` (títulos y números grandes, Sora) · `font-sans` (cuerpo, Inter) · `tabular` (números que no "bailan") |
| Animaciones | `animate-fade-in` / `animate-fade-up` / `animate-scale-in` (entradas) · `animate-deal-in` / `animate-play-in` (cartas) |

Regla de marca: el dorado nunca como fondo de texto largo; jerarquía con dorado y
tipografía display, no con tamaños gigantes.

<a id="convenciones-diseno-componentes-lee-cada-dts-y-promptmd"></a>

#### Componentes (leé cada `.d.ts` y `.prompt.md`)

- `Button` — `variant`: `primary` (dorado) | `secondary` | `ghost` | `danger` | `positive` | `info`; `size sm|md|lg`; `fullWidth`. Para estilar un `<a>` como botón: `buttonClass(variant, size)`.
- `Panel` — la superficie base (terciopelo elevado); dale padding con `className="p-6"`.
- `Modal` — `open`, `onClose`, `title`; cubre la pantalla con backdrop.
- `Input` — `label` opcional; hereda props de `<input>`.
- `Coins` / `CoinIcon` — saldos y montos; `amount` formatea es-AR (12.500).
- `Alert` — `tone: 'error' | 'info'`; mensajes breves.
- `Toggle` — `checked`, `onChange`, `label`.
- `Logo` — wordmark de Trucazo, `size sm|md|lg`.
- `PlayingCard` — `card={{ suit: 'espada'|'basto'|'oro'|'copa', value: 1–7|10|11|12, rank: n }}`, `interactive`, `disabled`; controlá el ancho con `className="w-24"` (la imagen vive en `/cartas/{palo}_{valor 2 dígitos}.png`).
- `CardBack` — dorso de carta; necesita tamaño explícito, proporción ~2:3 (ej. `className="w-20 h-[113px]"`).
- `cn(…clases)` — helper para combinar clases condicionales.

<a id="convenciones-diseno-ejemplo-idiomatico"></a>

#### Ejemplo idiomático

```jsx
import { Panel, Button, Coins } from 'trucazo'

<div className="min-h-screen bg-base text-cream font-sans p-6">
  <Panel className="p-6 max-w-sm flex flex-col gap-4">
    <h3 className="font-display text-lg font-bold text-cream">Mesa de Santi</h3>
    <p className="text-sm text-muted">Partida a 30 puntos · sin flor</p>
    <div className="flex items-center justify-between">
      <Coins amount={500} />
      <Button size="sm">Unirse</Button>
    </div>
  </Panel>
</div>
```

</details>

<a id="notas-diseno"></a>

### Notas de construcción y sincronización del diseño

Detalles operativos del sistema de diseño.

Procedencia anterior: `.design-sync/NOTES.md`. El contenido se mantiene en este documento temático.

<details>
<summary>Ver contenido completo: Notas de construcción y sincronización del diseño</summary>

<a id="notas-diseno-design-sync-notas-de-este-repo-trucazo"></a>

### design-sync — notas de este repo (Trucazo)

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

<a id="notas-diseno-known-render-warns"></a>

#### Known render warns

- (ninguno vigente — los [RENDER_THIN]/[RENDER_BLANK] de CoinIcon/Panel eran floor
  cards pre-autoría y se resolvieron con las previews)

<a id="notas-diseno-re-sync-risks"></a>

#### Re-sync risks

- El tema vive en `tailwind.config.ts` del repo: si el dueño cambia colores/sombras,
  hay que recompilar el CSS (buildCmd) y re-verificar; conventions.md enumera clases
  que podrían dejar de existir (validarlo contra el CSS fresco).
- `ds-entry.ts` y `componentSrcMap` son listas manuales: componentes nuevos en
  `src/components/ui|game` NO entran solos.
- Las cartas PNG se copian a mano post-build (ver arriba) — un re-sync que lo omita
  sube previews de PlayingCard sin imágenes.
- Google Fonts por red: sin conexión, las previews caen a system-ui.

</details>


