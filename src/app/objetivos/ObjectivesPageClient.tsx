'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button, Coins, Panel, buttonClass } from '@/components/ui'
import ObjectiveRow from '@/components/objectives/ObjectiveRow'
import { useObjectives } from '@/components/objectives/useObjectives'
import type { ObjectivesData } from '@/lib/objectives'
import { trackFirstParty } from '@/lib/analytics/client'

export default function ObjectivesPageClient({ initialData }: { initialData: ObjectivesData | null }) {
  const { data, loading, claiming, error, statusMessage, refresh, claim } = useObjectives(initialData)
  const tracked = useRef(false)

  useEffect(() => {
    if (!data || tracked.current) return
    tracked.current = true
    trackFirstParty('objectives_viewed', { surface: 'detail' })
  }, [data])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-6 pb-24 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Tu ciclo de retorno</p>
          <h1 className="font-display text-3xl font-extrabold text-cream">Objetivos</h1>
        </div>
        <Link href="/lobby" className={buttonClass('ghost', 'sm', false, 'min-h-11')}>Volver</Link>
      </header>

      {loading && !data ? (
        <Panel className="min-h-[28rem] animate-pulse bg-surface2" aria-busy="true" />
      ) : data ? (
        <>
          <Panel className="grid gap-3 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-subtle">Racha actual</p>
              <p className="font-display text-2xl font-bold text-gold">
                {data.streak.current_days} {data.streak.current_days === 1 ? 'día' : 'días'}
              </p>
            </div>
            <div>
              <p className="text-xs text-subtle">Protección semanal</p>
              <p className="font-semibold text-cream">
                {data.streak.protection_available ? 'Disponible' : 'Usada esta semana'}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-subtle">Saldo</p>
              <Coins amount={data.coins} size="lg" />
            </div>
          </Panel>

          <Panel as="section" className="p-4 sm:p-5" aria-labelledby="daily-title">
            <div className="mb-4">
              <h2 id="daily-title" className="font-display text-xl font-bold text-cream">Misiones de hoy</h2>
              <p className="text-sm text-muted">Tres metas cortas. Podés reclamar cada premio al completarla.</p>
            </div>
            <div className="grid gap-3">
              {data.daily.map(objective => (
                <ObjectiveRow
                  key={objective.identifier}
                  objective={objective}
                  claiming={claiming === `daily:${objective.identifier}`}
                  onClaim={claim}
                />
              ))}
            </div>
          </Panel>

          <Panel as="section" className="border-gold/35 p-4 sm:p-5" aria-labelledby="weekly-title">
            <div className="mb-4">
              <h2 id="weekly-title" className="font-display text-xl font-bold text-cream">Desafío semanal</h2>
              <p className="text-sm text-muted">Es el mismo para toda la comunidad y termina el domingo.</p>
            </div>
            <ObjectiveRow
              objective={data.weekly}
              claiming={claiming === `weekly:${data.weekly.identifier}`}
              onClaim={claim}
            />
          </Panel>
        </>
      ) : (
        <Panel className="p-6 text-center">
          <p className="font-semibold text-cream">No pudimos cargar tus objetivos</p>
          <p className="mt-1 text-sm text-muted">Podés volver al lobby o intentar nuevamente.</p>
          <Button className="mt-4" onClick={() => void refresh()}>Reintentar</Button>
        </Panel>
      )}

      {error && <p className="text-sm text-negative" role="alert">{error}</p>}
      <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
    </main>
  )
}
