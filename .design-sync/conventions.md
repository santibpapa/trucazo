<!-- Copia técnica para readmeHeader. Fuente: docs/diseno.md#convenciones-diseno. Actualizar desde ese documento principal. -->

# Trucazo — cómo diseñar con este sistema

Trucazo es un juego de truco argentino, 1v1 y 2vs2. Tema oscuro **"vino & oro"**: terciopelo
de casino, acento dorado usado con criterio. Todo se diseña sobre fondo oscuro.

La app Android debe conservar el mismo diseño y experiencia visual que la web, por decisión del dueño del 11/10/2026. Reutilizar las pantallas, componentes, estilos y recursos reales; no mantener una interfaz alternativa para Historia offline. Descarga, guardado y premios pendientes usan el mismo sistema visual.

**Menú principal Android, 27/10/2026:** entrada propia de la app con Modo Campaña, Multijugador, Ajustes y Salir, cada opción con una descripción breve. Campaña y Multijugador tienen mayor jerarquía; las cuatro opciones entran completas en vertical y horizontal. Reutiliza el salón, la marca y la paleta vino y oro, sin animación de entrada. El nombre visible de Historia en Android es Modo Campaña; conserva mapa, mesa y guardado compartidos. Ajustes reúne sonido, notificaciones y cuenta. Salir minimiza la app conservando sesión y progreso. Estado y pruebas en [Android](../docs/android.md#android-menu-principal).

**Pulido del menú, 27/10/2026:** por pedido del dueño se retira el indicador de conexión del inicio. Los botones usan doble marco dorado, relieve y fondos vino con luz suave; Campaña lleva el retrato existente y Multijugador las cartas del mazo. Ajustes y Salir conservan menor jerarquía, con medallones para sus íconos. Todas las imágenes visibles cargan desde el inicio, sin animación de entrada ni efectos continuos. Hay respuesta al tocar, foco visible y respeto por la preferencia de reducir movimiento.

**Convivencia, 27/10/2026:** conservar denunciar/bloquear detrás de un control discreto de tres puntos; no repetir «Opciones de…» o «Denunciar mesa» como texto visible. Conservar nombre accesible, tooltip y foco visible. En tarjetas de parejas, junto al nombre/cupo, sin fila adicional.

**Pulido compartido de ANDROID-14, 16/10/2026:** ventanas con foco contenido, regreso al control que las abrió y fondo inaccesible al lector; cantos, salida, sonido y apertura/cierre de chat de al menos 44 px. En horizontal con poco alto, mesa a la izquierda y controles a la derecha, con todos los cantos y salida visibles. Parejas comparte mazo y salida en la última fila cuando hay siete permisos. Brillos infinitos sólo con opacidad/transformación. Texto terciario `#A08A86` y error `#E27960`; botones positivos/informativos con texto oscuro, peligro `bg-negative-600` (`#B3432E`) con texto blanco. Contraste de estos pares comprobado sobre superficies oscuras; no cambiar los recursos ni identidades de cosméticos.

## Setup

No hay provider: los componentes funcionan sueltos. La raíz de cada pantalla debe ser
oscura — sin eso, los componentes quedan flotando sobre blanco y los tonos no cierran:

```jsx
<div className="min-h-screen bg-base text-cream font-sans">…</div>
```

Las fuentes (Inter = `font-sans`, Sora = `font-display`) cargan solas desde `styles.css`.

## Vocabulario de estilos (Tailwind compilado del juego)

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

## Componentes (leé cada `.d.ts` y `.prompt.md`)

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

## Ejemplo idiomático

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
