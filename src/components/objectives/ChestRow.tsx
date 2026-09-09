'use client'

import { Button, CoinIcon, cn } from '@/components/ui'
import type { Objective } from '@/lib/objectives'

type ClaimFn = (type: 'daily' | 'weekly', identifier: string) => void

function StatusLine({ objective, done }: { objective: Objective; done: number }) {
  const status = objective.status
  return (
    <p className={cn('mt-1 text-[10px] font-semibold', status === 'claimed' ? 'text-positive' : status === 'ready' ? 'text-gold' : 'text-subtle')}>
      {status === 'claimed'
        ? 'Reclamada'
        : <><span className="tabular">{done}/{objective.target}</span> · {status === 'ready' ? 'Lista para reclamar' : objective.ends_label}</>}
    </p>
  )
}

function ClaimButton({ objective, claiming, onClaim }: { objective: Objective; claiming: boolean; onClaim: ClaimFn }) {
  return (
    <Button
      size="sm"
      className="min-h-11 !px-3 !py-1.5"
      disabled={claiming}
      onClick={() => onClaim(objective.type, objective.identifier)}
    >
      {claiming ? 'Reclamando…' : 'Reclamar'}
    </Button>
  )
}

/** Una misión adentro del cofre: a la derecha, su pila de monedas (una por
 *  partida de la meta) que se va llenando con el avance; si está lista, el
 *  botón para cobrarla. */
export function ChestRow({
  objective,
  claiming,
  onClaim,
}: {
  objective: Objective
  claiming: boolean
  onClaim: ClaimFn
}) {
  const done = Math.min(objective.progress, objective.target)
  const status = objective.status
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2.5',
        status === 'ready'
          ? 'border-gold/60 bg-gold/[0.08] shadow-[inset_0_0_0_1px_rgba(201,162,75,0.35),0_0_22px_rgba(201,162,75,0.25)]'
          : 'border-line bg-surface2',
        status === 'claimed' && 'opacity-55',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight text-cream">{objective.name}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{objective.description}</p>
        <StatusLine objective={objective} done={done} />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {status === 'ready' ? (
          <ClaimButton objective={objective} claiming={claiming} onClaim={onClaim} />
        ) : (
          <div className="flex flex-col-reverse items-center" aria-hidden="true">
            {Array.from({ length: Math.min(objective.target, 5) }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'block h-2 w-7 rounded-full border -mt-[3px] first:mt-0',
                  i < done
                    ? 'border-[#6B4E16] bg-gradient-to-b from-[#E0BE68] to-gold-700 shadow-[0_1px_0_#6B4E16]'
                    : 'border-gold/50 bg-transparent',
                )}
              />
            ))}
          </div>
        )}
        <span className="inline-flex items-center gap-1 text-xs font-extrabold tabular text-gold">
          <CoinIcon size={12} />{objective.reward}
        </span>
      </div>
    </div>
  )
}

/** El desafío semanal, al pie del cofre: el mismo para toda la comunidad. */
export function WeeklyRow({ objective, claiming, onClaim }: { objective: Objective; claiming: boolean; onClaim: ClaimFn }) {
  const done = Math.min(objective.progress, objective.target)
  return (
    <div
      className="mx-3 mb-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-gold/40 px-3 py-2.5"
      style={{ background: 'linear-gradient(90deg, rgba(201,162,75,0.12), transparent)' }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gold">Desafío semanal</p>
        <p className="mt-0.5 truncate text-sm font-bold text-cream">{objective.name}</p>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base"
          role="progressbar"
          aria-label={`Progreso de ${objective.name}`}
          aria-valuemin={0}
          aria-valuemax={objective.target}
          aria-valuenow={done}
        >
          <div
            className={cn('h-full rounded-full', objective.status === 'claimed' ? 'bg-positive/65' : 'bg-gold')}
            style={{ width: `${Math.min(100, Math.round((objective.progress / objective.target) * 100))}%` }}
          />
        </div>
        <StatusLine objective={objective} done={done} />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {objective.status === 'ready' && <ClaimButton objective={objective} claiming={claiming} onClaim={onClaim} />}
        <span className="inline-flex items-center gap-1 text-xs font-extrabold tabular text-gold">
          <CoinIcon size={12} />{objective.reward}
        </span>
      </div>
    </div>
  )
}
