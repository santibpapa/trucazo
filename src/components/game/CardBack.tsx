import { cn } from '../ui/cn'

/** Dorso de carta: terciopelo vino con enrejado dorado fino. Para las cartas del rival. */
export default function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gold/30 shadow-card overflow-hidden',
        'flex items-center justify-center',
        className,
      )}
      style={{
        backgroundColor: '#3A1A1E',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(201,162,75,0.16) 0 2px, transparent 2px 9px),' +
          'repeating-linear-gradient(-45deg, rgba(201,162,75,0.16) 0 2px, transparent 2px 9px)',
      }}
      aria-hidden="true"
    >
      <span className="w-1/3 aspect-square rounded-full border border-gold/50 flex items-center justify-center">
        <span className="w-1/2 aspect-square rounded-full bg-gold/30" />
      </span>
    </div>
  )
}
