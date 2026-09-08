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
  /** Como naipe blanco apoyado sobre el paño (pantalla de fin de partida). */
  naipe?: boolean
  previousProgress?: number
  onClaim?: (type: 'daily' | 'weekly', identifier: string) => void
}

export default function ObjectiveRow({
  objective,
  compact = false,
  claiming = false,
  naipe = false,
  previousProgress,
  onClaim,
}: Props) {
  const progress = 'progress' in objective ? objective.progress : objective.current
  const [shownProgress, setShownProgress] = useState(previousProgress ?? progress)
  const status = objective.status ?? (objective.completed ? 'ready' : 'in_progress')
  const percent = Math.min(100, Math.round((shownProgress / objective.target) * 100))

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShownProgress(progress))
    return () => cancelAnimationFrame(frame)
  }, [locked, progress])

  return (
    <div className={cn(
      'rounded-xl border px-3.5 py-3 text-left',
      naipe
        ? 'border-transparent bg-[#F5F0E6] px-3 py-2.5 shadow-[0_10px_18px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(31,16,17,0.12),inset_0_0_0_4px_#F5F0E6,inset_0_0_0_5px_rgba(31,16,17,0.22)]'
        : objective.type === 'weekly' ? 'border-gold/35 bg-gold/5' : 'border-line bg-surface2/70',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('font-semibold leading-tight', naipe ? 'text-sm text-ink' : 'text-cream')}>{objective.name}</p>
          {!compact && objective.description && (
            <p className="mt-1 text-sm leading-snug text-muted">{objective.description}</p>
          )}
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-bold', naipe ? 'text-gold-700' : 'text-gold')}>
          <CoinIcon size={13} /> {objective.reward}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <div
          className={cn('h-2 flex-1 overflow-hidden rounded-full', naipe ? 'bg-ink/10' : 'bg-base')}
          role="progressbar"
          aria-label={`Progreso de ${objective.name}`}
          aria-valuemin={0}
          aria-valuemax={objective.target}
          aria-valuenow={Math.min(shownProgress, objective.target)}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700 ease-out',
              status === 'claimed' ? 'bg-positive/65' : naipe ? 'bg-gold-700' : 'bg-gold',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={cn('min-w-[3.5rem] text-right text-xs font-bold tabular', naipe ? 'text-[#6b5450]' : 'text-muted')}>
          {Math.min(shownProgress, objective.target)}/{objective.target}
        </span>
      </div>

      <div className="mt-2 flex min-h-5 items-center justify-between gap-2">
        <span className={cn(
          'text-xs font-medium',
          status === 'claimed' ? 'text-positive' : status === 'ready' ? (naipe ? 'text-gold-700' : 'text-gold') : naipe ? 'text-[#8a6f6a]' : 'text-subtle',
        )}>
          {status === 'claimed' ? 'Reclamada' : status === 'ready' ? 'Lista para reclamar' : objective.ends_label}
        </span>
        {status === 'ready' && onClaim && (
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

