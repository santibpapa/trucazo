import { cn } from '../ui/cn'
import { getCardImage, getCardLabel } from '@/lib/truco'
import type { Card } from '@/lib/truco'

interface PlayingCardProps {
  card: Card
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** Carta interactiva de la mano: eleva al pasar el mouse y entra con animación. */
  interactive?: boolean
  className?: string
  /** Entrada al repartir (cae con un leve giro). */
  deal?: boolean
  /** Giro 3D al jugarse sobre la mesa. */
  flip?: boolean
  /** Para escalonar el reparto (animationDelay) u otros ajustes inline. */
  style?: React.CSSProperties
}

/**
 * Carta (PNG completa) como protagonista sobre el fondo oscuro. La imagen define
 * su propio alto (h-auto) para que el marco calce exacto con la carta y no asome
 * fondo. Si es interactiva, se eleva al pasar el dedo/mouse.
 */
export default function PlayingCard({
  card,
  onClick,
  disabled,
  interactive,
  className,
  deal,
  flip,
  style,
}: PlayingCardProps) {
  const inner = (
    <img
      src={getCardImage(card)}
      alt={getCardLabel(card)}
      className="block w-full h-auto select-none pointer-events-none [-webkit-user-drag:none] [-webkit-touch-callout:none]"
      draggable={false}
    />
  )

  // La carta PNG ya es completa (fondo blanco). El alto lo define la imagen
  // (h-auto), y el redondeo de esquinas lo da el overflow-hidden.
  const surface = 'rounded-xl overflow-hidden shadow-card'

  if (interactive) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={style}
        className={cn(
          surface,
          // En táctil: tratar el toque como tap (no arrastre/zoom/long-press),
          // y no permitir arrastrar la imagen ni seleccionar.
          'touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]',
          'transition-all duration-200 ease-out',
          // El "levantar" solo en dispositivos con hover real (no se pega en táctil)
          '[@media(hover:hover)]:enabled:hover:-translate-y-2 [@media(hover:hover)]:enabled:hover:shadow-lift [@media(hover:hover)]:enabled:hover:ring-gold',
          'enabled:active:-translate-y-1',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          deal && 'animate-deal-in',
          flip && 'animate-play-in',
          className,
        )}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      style={style}
      className={cn(surface, deal && 'animate-deal-in', flip && 'animate-play-in', className)}
    >
      {inner}
    </div>
  )
}
