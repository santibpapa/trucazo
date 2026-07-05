# Trucazo — cómo diseñar con este sistema

Trucazo es un juego de truco argentino 1v1. Tema oscuro **"vino & oro"**: terciopelo
de casino, acento dorado usado con criterio. Todo se diseña sobre fondo oscuro.

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
| Estados | `bg-positive` (verde) · `bg-negative` (rojo) · `bg-info` (azul) — con `text-white` |
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
