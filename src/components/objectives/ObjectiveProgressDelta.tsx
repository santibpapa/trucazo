'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackFirstParty } from '@/lib/analytics/client'
import { buttonClass } from '@/components/ui'
import GuestObjectivesLocked from './GuestObjectivesLocked'
import ObjectiveRow from './ObjectiveRow'
import { useObjectives } from './useObjectives'

export default function ObjectiveProgressDelta({ gameId, isGuest = false }: { gameId: string; isGuest?: boolean }) {
  const { data, claiming, error, statusMessage, claim } = useObjectives(null, gameId, !isGuest)
  const trackedGame = useRef<string | null>(null)

  useEffect(() => {
    if (!data || trackedGame.current === gameId) return
    trackedGame.current = gameId
    for (const delta of data.recent_progress) {
      trackFirstParty('objective_progressed', {
        mission_type: delta.identifier,
        objective_type: delta.type,
        mode: delta.mode,
        progress: delta.current,
        target: delta.target,
      })
      if (delta.newly_completed) {
        trackFirstParty(delta.type === 'weekly' ? 'weekly_challenge_completed' : 'objective_completed', {
          mission_type: delta.identifier,
          objective_type: delta.type,
          mode: delta.mode,
          target: delta.target,
        })
      }
    }
    if (data.streak_event === 'continued') {
      trackFirstParty('streak_continued', { streak_days: data.streak.current_days })
    } else if (data.streak_event === 'protection_used') {
      trackFirstParty('streak_protection_used', { streak_days: data.streak.current_days })
    }
  }, [data, gameId])

  if (isGuest) {
    return (
      <section className="w-full rounded-2xl border border-gold/30 bg-gold/5 p-3 text-left" aria-labelledby="game-objectives-title">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="game-objectives-title" className="font-display font-bold text-cream">Objetivos</h3>
          <span className="text-xs font-semibold text-muted">Misiones bloqueadas</span>
        </div>
        <GuestObjectivesLocked message="Iniciá sesión o registrate para que tus próximas partidas sumen progreso y puedas reclamar recompensas." />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/login" className={buttonClass('secondary', 'sm', true, 'min-h-11 px-2')}>
            Iniciar sesión
          </Link>
          <Link href="/register" className={buttonClass('primary', 'sm', true, 'min-h-11 px-2')}>
            Registrarme
          </Link>
        </div>
      </section>
    )
  }

  if (!data || data.recent_progress.length === 0) return null

  return (
    <section className="w-full rounded-2xl border border-gold/30 bg-gold/5 p-3 text-left" aria-labelledby="game-objectives-title">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id="game-objectives-title" className="font-display font-bold text-cream">Objetivos</h3>
        <span className="text-xs font-semibold text-gold">Avance de esta partida</span>
      </div>
      <div className="grid gap-2">
        {data.recent_progress.map(delta => {
          const current = delta.type === 'weekly'
            ? data.weekly
            : data.daily.find(item => item.identifier === delta.identifier)
          return (
            <ObjectiveRow
              key={`${delta.type}:${delta.identifier}`}
              objective={current ?? delta}
              compact
              previousProgress={delta.previous}
              claiming={claiming === `${delta.type}:${delta.identifier}`}
              onClaim={claim}
            />
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-negative" role="alert">{error}</p>}
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage || data.recent_progress.map(delta => (
          delta.newly_completed
            ? `Misión ${delta.name} completada.`
            : `Misión ${delta.name}: ${delta.current} de ${delta.target}.`
        )).join(' ')}
      </p>
    </section>
  )
}
