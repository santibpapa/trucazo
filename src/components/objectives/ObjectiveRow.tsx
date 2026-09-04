'use client'

import { useEffect, useState } from 'react'
import { Button, CoinIcon, cn } from '@/components/ui'
import type { Objective, ObjectiveProgress } from '@/lib/objectives'

type RowObjective = Objective | (ObjectiveProgress & {
  description?: string
  status?: Objective['status']
  ends_label?: string
})

interface Props {
  objective: RowObjective
  compact?: boolean
  claiming?: boolean
  locked?: boolean
  previousProgress?: number
  onClaim?: (type: 'daily' | 'weekly', identifier: string) => void
}

export default function ObjectiveRow({
  objective,
  compact = false,
  claiming = false,
  locked = false,
  previousProgress,
  onClaim,
}: Props) {
  const progress = 'progress' in objective ? objective.progress : objective.current
  const [shownProgress, setShownProgress] = useState(previousProgress ?? progress)
  const status = objective.status ?? (objective.completed ? 'ready' : 'in_progress')
  const percent = locked ? 0 : Math.min(100, Math.round((shownProgress / objective.target) * 100))

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShownProgress(progress))
    return () => cancelAnimationFrame(frame)
  }, [progress])

  return (
    <div
      aria-disabled={locked || undefined}
      className={cn(
        'rounded-xl border px-3.5 py-3 text-left',
        locked
          ? 'border-white/10 bg-white/[0.035] grayscale'
          : objective.type === 'weekly'
            ? 'border-gold/35 bg-gold/5'
            : 'border-line bg-surface2/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('font-semibold leading-tight', locked ? 'text-muted' : 'text-cream')}>
            {objective.name}
          </p>
          {!compact && objective.description && (
            <p className="mt-1 text-sm leading-snug text-muted">{objective.description}</p>
          )}
        </div>
        <span className={cn(
          'inline-flex shrink-0 items-center gap-1 text-xs font-bold',
          locked ? 'text-muted' : 'text-gold',
        )}>
          {locked ? <LockIcon /> : <CoinIcon size={13} />} {objective.reward}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-base"
          role="progressbar"
          aria-label={`Progreso de ${objective.name}`}
          aria-valuemin={0}
          aria-valuemax={objective.target}
          aria-valuenow={Math.min(shownProgress, objective.target)}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700 ease-out',
              locked ? 'bg-subtle/40' : status === 'claimed' ? 'bg-positive/65' : 'bg-gold',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="min-w-[3.5rem] text-right text-xs font-bold tabular text-muted">
          {Math.min(shownProgress, objective.target)}/{objective.target}
        </span>
      </div>

      <div className="mt-2 flex min-h-5 items-center justify-between gap-2">
        <span className={cn(
          'text-xs font-medium',
          locked
            ? 'text-muted'
            : status === 'claimed'
              ? 'text-positive'
              : status === 'ready'
                ? 'text-gold'
                : 'text-subtle',
        )}>
          {locked
            ? 'Iniciá sesión para desbloquear'
            : status === 'claimed'
              ? 'Reclamada'
              : status === 'ready'
                ? 'Lista para reclamar'
                : objective.ends_label}
        </span>
        {!locked && status === 'ready' && onClaim && (
          <Button
            size="sm"
            className="min-h-11 !px-3 !py-1.5"
            disabled={claiming}
            onClick={() => onClaim(objective.type, objective.identifier)}
          >
            {claiming ? 'Reclamando…' : 'Reclamar'}
          </Button>
        )}
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
