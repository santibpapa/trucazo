import { cn } from './cn'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const text: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
}
const mark: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 24,
  md: 30,
  lg: 44,
}

/** Wordmark de Trucazo: marca de cartas + tipografía display. Sin emojis. */
export default function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <CardsMark size={mark[size]} />
      <span className={cn('font-display font-extrabold tracking-tight text-cream', text[size])}>
        Truc<span className="text-gold">azo</span>
      </span>
    </span>
  )
}

function CardsMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      {/* Carta de atrás */}
      <rect
        x="6" y="5" width="15" height="21" rx="3"
        fill="#FFFFFF" stroke="#E8E0D0" strokeWidth="1.4"
        transform="rotate(-10 13.5 15.5)"
      />
      {/* Carta de adelante con detalle dorado */}
      <rect
        x="11" y="6" width="15" height="21" rx="3"
        fill="#FFFFFF" stroke="#E8E0D0" strokeWidth="1.4"
        transform="rotate(8 18.5 16.5)"
      />
      <circle cx="18.5" cy="16.5" r="3.4" fill="#C9A24B" transform="rotate(8 18.5 16.5)" />
    </svg>
  )
}
