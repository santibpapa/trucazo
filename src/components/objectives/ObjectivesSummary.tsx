'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Panel, buttonClass } from '@/components/ui'
import { trackFirstParty } from '@/lib/analytics/client'
import type { ObjectivesData } from '@/lib/objectives'
import ObjectiveRow from './ObjectiveRow'
import { useObjectives } from './useObjectives'

interface Props {
  initialData: ObjectivesData | null
  onCoinsChange: (coins: number) => void
}

export default function ObjectivesSummary({ initialData, onCoinsChange }: Props) {
  const { data, loading, claiming, error, statusMessage, claim } = useObjectives(initialData)
  const tracked = useRef(false)

  useEffect(() => {
    if (!data || tracked.current) return
    tracked.current = true
    trackFirstParty('objectives_viewed', { surface: 'lobby' })
  }, [data])

  useEffect(() => {
    if (data) onCoinsChange(data.coins)
  }, [data, onCoinsChange])

  if (loading && !data) {
    return (
      <Panel className="min-h-[18rem] p-4" aria-busy="true">
        <div className="h-5 w-36 animate-pulse rounded bg-surface2" />
        <div className="mt-4 grid gap-2">
          {[0, 1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-surface2" />)}
        </div>
      </Panel>
    )
  }

  if (!data) {
    return (
      <Panel className="p-4">
        <p className="font-semibold text-cream">Objetivos de hoy</p>
        <p className="mt-1 text-sm text-muted">{error || 'No pudimos cargarlos por ahora.'}</p>
      </Panel>
    )
  }

  const all = [...data.daily, data.weekly]
  const hasReady = all.some(objective => objective.status === 'ready')

  return (
    <Panel as="section" aria-labelledby="objectives-title" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Ciclo diario</p>
          <h2 id="objectives-title" className="font-display text-lg font-bold text-cream">Objetivos de hoy</h2>
        </div>
        <span className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs font-semibold text-muted">
          {data.streak.current_days} {data.streak.current_days === 1 ? 'día' : 'días'} de racha
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.daily.map(objective => (
          <ObjectiveRow
            key={objective.identifier}
            objective={objective}
            compact
            claiming={claiming === `${objective.type}:${objective.identifier}`}
            onClaim={claim}
          />
        ))}
        <ObjectiveRow
          objective={data.weekly}
          compact
          claiming={claiming === `weekly:${data.weekly.identifier}`}
          onClaim={claim}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-subtle">
          {hasReady ? 'Tenés una recompensa esperando.' : 'Jugá una partida para avanzar.'}
        </p>
        {!hasReady && (
          <Link href="/objetivos" className={buttonClass('ghost', 'sm', false, 'min-h-11 shrink-0')}>
            Ver objetivos
          </Link>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-negative" role="alert">{error}</p>}
      <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
    </Panel>
  )
}
