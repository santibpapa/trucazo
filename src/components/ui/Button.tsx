import { forwardRef } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'positive' | 'info'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
  'transition-all duration-200 ease-out select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

const variants: Record<Variant, string> = {
  // Acento principal: dorado con texto oscuro y leve elevación
  primary:
    'bg-gold text-ink shadow-gold hover:bg-gold-600 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:shadow-none',
  // Neutro elevado (alternativa sobria sobre el fondo oscuro)
  secondary:
    'bg-surface2 text-cream border border-line shadow-card hover:border-gold/60 hover:-translate-y-0.5 disabled:hover:translate-y-0',
  // Contorno fino
  ghost:
    'bg-transparent text-cream border border-line hover:border-gold hover:text-gold',
  danger:
    'bg-negative text-white shadow-card hover:brightness-110 hover:-translate-y-0.5 disabled:hover:translate-y-0',
  positive:
    'bg-positive text-white shadow-card hover:brightness-110 hover:-translate-y-0.5 disabled:hover:translate-y-0',
  info:
    'bg-info text-white shadow-card hover:brightness-110 hover:-translate-y-0.5 disabled:hover:translate-y-0',
}

const sizes: Record<Size, string> = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-5 py-2.5',
  lg: 'text-lg px-6 py-3.5',
}

/** Devuelve las clases de un botón. Útil para estilar <Link> u otros elementos. */
export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  fullWidth = false,
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
})

export default Button
