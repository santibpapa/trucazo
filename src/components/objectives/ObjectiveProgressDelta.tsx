'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackFirstParty } from '@/lib/analytics/client'
import { buttonClass } from '@/components/ui'
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
      <section
        className="w-full rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]"
        aria-labelledby="game-objectives-title"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 id="game-objectives-title" className="font-display font-bold text-cream">Objetivos</h3>
              <span className="text-xs font-semibold text-muted">Bloqueados</span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Iniciá sesión para que tus próximas partidas sumen progreso y recompensas.
            </p>
          </div>
        </div>
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

  // Sobre el paño de la mesa: cada misión es un naipe blanco, apenas torcido.
  return (
    <section className="w-full" aria-labelledby="game-objectives-title">
      <h3 id="game-objectives-title" className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[.1em] text-cream/60">
        Objetivos de esta partida
      </h3>
      <div className="flex flex-wrap justify-center gap-3">
        {data.recent_progress.map((delta, i) => {
          const current = delta.type === 'weekly'
            ? data.weekly
            : data.daily.find(item => item.identifier === delta.identifier)
          return (
            <div
              key={`${delta.type}:${delta.identifier}`}
              className="w-[calc(50%-6px)] max-w-[170px]"
              style={{ transform: `rotate(${i % 2 === 0 ? -3 : 2}deg)` }}
            >
              <ObjectiveRow
                objective={current ?? delta}
                compact
                naipe
                previousProgress={delta.previous}
                claiming={claiming === `${delta.type}:${delta.identifier}`}
                onClaim={claim}
              />
            </div>
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
