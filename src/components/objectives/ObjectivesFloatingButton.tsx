'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/components/ui'
import { trackFirstParty } from '@/lib/analytics/client'
import type { ObjectivesData } from '@/lib/objectives'
import { useObjectives } from './useObjectives'

interface Props {
  initialData: ObjectivesData | null
  onCoinsChange: (coins: number) => void
}

export default function ObjectivesFloatingButton({ initialData, onCoinsChange }: Props) {
  const { data } = useObjectives(initialData)

  useEffect(() => {
    if (data) onCoinsChange(data.coins)
  }, [data, onCoinsChange])

  const objectives = data ? [...data.daily, data.weekly] : []
  const incompleteCount = data?.daily.filter(objective => objective.status === 'in_progress').length ?? 0
  const readyCount = objectives.filter(objective => objective.status === 'ready').length
  const hasIncomplete = incompleteCount > 0
  const label = readyCount > 0
    ? `${readyCount} ${readyCount === 1 ? 'recompensa lista' : 'recompensas listas'}. Abrir objetivos.`
    : hasIncomplete
      ? `${incompleteCount} ${incompleteCount === 1 ? 'objetivo pendiente' : 'objetivos pendientes'}. Abrir objetivos.`
      : 'Abrir objetivos.'

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-30 lg:bottom-6 lg:right-6 xl:right-[21.5rem]">
      <Link
        href="/objetivos"
        aria-label={label}
        onClick={() => trackFirstParty('objectives_viewed', { surface: 'lobby_floating_chest' })}
        className={cn(
          'group pointer-events-auto relative flex min-h-[5rem] min-w-[5rem] touch-manipulation items-center justify-center rounded-full',
          'outline-none transition-transform duration-200 hover:scale-105 active:scale-95',
          'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-base',
          hasIncomplete && 'objectives-chest-pending',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-1 rounded-full bg-gold/15 blur-md',
            hasIncomplete ? 'objectives-chest-glow' : 'shadow-[0_0_22px_rgba(201,162,75,0.38)]',
          )}
        />
        <Image
          src="/objetivos/cofre-misiones.webp"
          alt=""
          aria-hidden="true"
          width={80}
          height={80}
          sizes="80px"
          priority
          className={cn(
            'relative h-20 w-20 select-none object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.65)]',
            hasIncomplete && 'objectives-chest-shake',
          )}
        />

        {readyCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-base bg-gold px-1 text-xs font-black tabular text-ink shadow-lg"
          >
            {readyCount}
          </span>
        )}

        <span className="pointer-events-none absolute right-full top-1/2 mr-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-cream shadow-xl group-hover:block group-focus-visible:block">
          {readyCount > 0 ? 'Recompensas listas' : 'Objetivos'}
        </span>
      </Link>
    </div>
  )
}
