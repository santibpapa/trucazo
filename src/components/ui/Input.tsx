import { forwardRef } from 'react'
import { cn } from './cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className, id, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-base border border-line rounded-xl px-4 py-3 text-cream placeholder-subtle',
          'transition-colors duration-200',
          'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25',
          className,
        )}
        {...props}
      />
    </div>
  )
})

export default Input
