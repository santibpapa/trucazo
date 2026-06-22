import { cn } from './cn'

interface CoinsProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const text: Record<NonNullable<CoinsProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}
const icon: Record<NonNullable<CoinsProps['size']>, number> = {
  sm: 14,
  md: 16,
  lg: 22,
}

/** Saldo / montos. El dorado marca la jerarquía; números tabulares y display. */
export default function Coins({ amount, size = 'md', className }: CoinsProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-display font-bold tabular text-gold',
        text[size],
        className,
      )}
    >
      <CoinIcon size={icon[size]} />
      {amount.toLocaleString('es-AR')}
    </span>
  )
}

export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="#C9A24B" />
      <circle cx="12" cy="12" r="10" stroke="#9A7730" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6.5" stroke="#9A7730" strokeWidth="1" opacity="0.7" />
      <path
        d="M12 8.2v7.6M9.8 9.8c0-1 1-1.6 2.2-1.6s2.2.5 2.2 1.5-1 1.4-2.2 1.4-2.2.5-2.2 1.5 1 1.5 2.2 1.5 2.2-.6 2.2-1.6"
        stroke="#6B4E16"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
