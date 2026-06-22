import { cn } from './cn'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 group"
    >
      <span
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-gold' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-soft transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-muted">{label}</span>}
    </button>
  )
}
