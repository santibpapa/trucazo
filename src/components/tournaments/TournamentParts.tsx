import { cn } from '@/components/ui'
import type { TournamentDateTile } from '@/lib/tournament-ui'

/** Piezas visuales compartidas por la central y el detalle de torneos. Sólo presentación. */

export type StepState = 'done' | 'now' | 'todo'

export interface Step {
  label: string
  detail: string
  state: StepState
}

/** Los tres pasos de un torneo en una línea: anotarse, confirmar y jugar. */
export function StepTrack({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn('flex items-start', className)} aria-label="Tus pasos en el torneo">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-[15px] h-0.5 rounded-full',
                step.state === 'done' ? 'bg-positive' : 'bg-line',
              )}
            />
          )}
          <span
            className={cn(
              'relative z-[1] flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] text-[13px] font-extrabold',
              step.state === 'done' && 'border-positive bg-positive text-ink',
              step.state === 'now' && 'border-gold bg-gold text-ink ring-[5px] ring-gold/20',
              step.state === 'todo' && 'border-line bg-surface2 text-muted',
            )}
          >
            {step.state === 'done' ? <CheckIcon size={15} /> : index + 1}
            <span className="sr-only">
              {step.state === 'done' ? ' (hecho)' : step.state === 'now' ? ' (ahora)' : ''}
            </span>
          </span>
          <span className="text-xs font-bold leading-tight text-cream">{step.label}</span>
          <span className="text-[11px] leading-tight text-muted">{step.detail}</span>
        </li>
      ))}
    </ol>
  )
}

/** Calendarito con día de la semana, número y mes. */
export function DateTile({ tile, tone = 'gold' }: { tile: TournamentDateTile; tone?: 'gold' | 'positive' }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[66px] w-[58px] shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface2"
    >
      <span className={cn('text-[10px] font-extrabold tracking-widest', tone === 'gold' ? 'text-gold' : 'text-positive')}>
        {tile.weekday}
      </span>
      <span className="font-display text-2xl font-extrabold leading-none text-cream">{tile.day}</span>
      <span className="text-[11px] text-muted">{tile.month}</span>
    </span>
  )
}

/** Barra de lugares ocupados con el texto "11 de 16 anotados · Quedan 5". */
export function CapacityBar({
  occupied,
  capacity,
  noun,
  className,
}: {
  occupied: number
  capacity: number
  noun: string
  className?: string
}) {
  const left = Math.max(0, capacity - occupied)
  const percent = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
        <span className="text-cream/90">{occupied} de {capacity} {noun}</span>
        <span className="font-bold text-gold">{left > 0 ? `Quedan ${left}` : 'Lleno'}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Lugares ocupados"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={occupied}
      >
        <span className="block h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function CheckIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function ChevronIcon({ size = 16, direction = 'right' }: { size?: number; direction?: 'left' | 'right' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'right' ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
    </svg>
  )
}

export function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function TrophyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

/** Medalla redonda con el número del puesto (oro, plata, bronce). */
export function PlaceMedal({ place, size = 34 }: { place: 1 | 2 | 3; size?: number }) {
  const colors = { 1: 'bg-gold', 2: 'bg-[#C9C2BC]', 3: 'bg-[#C98A5B]' } as const
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-full font-black text-ink', colors[place])}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {place}
    </span>
  )
}
