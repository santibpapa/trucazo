import { cn } from './cn'

interface AlertProps {
  children: React.ReactNode
  tone?: 'error' | 'info'
  className?: string
}

const tones = {
  error: 'bg-negative/15 border-negative/40 text-[#F0B3A4]',
  info: 'bg-info/15 border-info/35 text-[#B6D3E6]',
}

/** Mensaje breve (errores de form, avisos). Borde fino, sin fondos saturados. */
export default function Alert({ children, tone = 'error', className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border px-4 py-3 text-sm font-medium animate-fade-in',
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
