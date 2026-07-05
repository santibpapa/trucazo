/* Entrada del design system para design-sync (claude.ai/design).
   Trucazo es una app (no publica librería), así que este índice declara
   qué componentes forman el design system. Si se agrega un componente
   reutilizable, exportarlo acá y en config.json (componentSrcMap). */
export { default as Button, buttonClass } from '../src/components/ui/Button'
export { default as Panel } from '../src/components/ui/Panel'
export { default as Input } from '../src/components/ui/Input'
export { default as Modal } from '../src/components/ui/Modal'
export { default as Coins, CoinIcon } from '../src/components/ui/Coins'
export { default as Logo } from '../src/components/ui/Logo'
export { default as Alert } from '../src/components/ui/Alert'
export { default as Toggle } from '../src/components/ui/Toggle'
export { cn } from '../src/components/ui/cn'
export { default as PlayingCard } from '../src/components/game/PlayingCard'
export { default as CardBack } from '../src/components/game/CardBack'
