'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Modal, buttonClass, cn } from '@/components/ui'
import { trackFirstParty } from '@/lib/analytics/client'
import type { Objective, ObjectivesData } from '@/lib/objectives'
import ObjectiveRow from './ObjectiveRow'
import { useObjectives } from './useObjectives'

interface Props {
  initialData: ObjectivesData | null
  isGuest: boolean
  onCoinsChange: (coins: number) => void
}

const GUEST_OBJECTIVES: Objective[] = [
  {
    type: 'daily',
    identifier: 'guest_finish_1',
    name: 'Primera del día',
    description: 'Terminá 1 partida válida.',
    category: 'participation',
    difficulty: 'easy',
    progress: 0,
    target: 1,
    reward: 20,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'daily',
    identifier: 'guest_win_human_1',
    name: 'Duelo ganado',
    description: 'Ganá 1 partida contra una persona.',
    category: 'competition',
    difficulty: 'competitive',
    progress: 0,
    target: 1,
    reward: 40,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'daily',
    identifier: 'guest_campaign_play_2',
    name: 'Camino de provincias',
    description: 'Jugá 2 duelos del Modo Historia.',
    category: 'history',
    difficulty: 'easy',
    progress: 0,
    target: 2,
    reward: 25,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada día',
  },
  {
    type: 'weekly',
    identifier: 'guest_weekly_finish_10',
    name: 'Diez partidas',
    description: 'Terminá 10 partidas válidas esta semana.',
    category: 'weekly',
    difficulty: 'weekly',
    progress: 0,
    target: 10,
    reward: 150,
    completed_at: null,
    claimed_at: null,
    status: 'in_progress',
    ends_label: 'Se renueva cada semana',
  },
]

export default function ObjectivesFloatingButton({ initialData, isGuest, onCoinsChange }: Props) {
  const [open, setOpen] = useState(false)
  const { data, loading, claiming, error, statusMessage, refresh, claim } = useObjectives(
    initialData,
    null,
    !isGuest,
  )

  const closeModal = useCallback(() => setOpen(false), [])
  const openModal = useCallback(() => {
    setOpen(true)
    trackFirstParty('objectives_viewed', {
      surface: isGuest ? 'lobby_guest_chest' : 'lobby_floating_chest',
    })
    if (!isGuest && !data) void refresh()
  }, [data, isGuest, refresh])

  useEffect(() => {
    if (data) onCoinsChange(data.coins)
  }, [data, onCoinsChange])

  const objectives = data ? [...data.daily, data.weekly] : []
  const incompleteCount = data?.daily.filter(objective => objective.status === 'in_progress').length ?? 0
  const readyCount = objectives.filter(objective => objective.status === 'ready').length
  const hasIncomplete = isGuest || incompleteCount > 0
  const label = isGuest
    ? 'Abrir misiones bloqueadas. Iniciá sesión para guardar tu progreso.'
    : readyCount > 0
    ? `${readyCount} ${readyCount === 1 ? 'recompensa lista' : 'recompensas listas'}. Abrir objetivos.`
    : hasIncomplete
      ? `${incompleteCount} ${incompleteCount === 1 ? 'objetivo pendiente' : 'objetivos pendientes'}. Abrir objetivos.`
      : 'Abrir objetivos.'

  return (
    <>
      <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-30 [transform:translate3d(0,0,0)] lg:bottom-6 lg:right-6 xl:right-[21.5rem]">
        <button
          type="button"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openModal}
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
        </button>
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={isGuest ? 'Misiones y desafío' : 'Misiones de hoy'}
        panelClassName="!max-w-md !gap-3 !p-4"
        showCloseButton={isGuest}
        centered
      >
        {!isGuest && (
          <p className="text-sm leading-relaxed text-muted">
            Completá estas metas jugando partidas válidas. El progreso se actualiza
            automáticamente y las misiones cambian cada día.
          </p>
        )}

        {isGuest ? (
          <div className="relative isolate">
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-black/55 shadow-[inset_0_0_42px_rgba(0,0,0,0.92)]"
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
              <div className="w-full max-w-xs rounded-2xl border border-gold/35 bg-surface px-4 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.9)]">
                <p className="font-semibold text-cream">Desbloqueá tus recompensas</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Ingresá con tu cuenta o registrate para guardar tu progreso y
                  empezar a reclamar las recompensas de las misiones.
                </p>
              </div>
            </div>
            <div className="grid gap-2" aria-label="Misiones bloqueadas">
              {GUEST_OBJECTIVES.map(objective => (
                <ObjectiveRow key={objective.identifier} objective={objective} locked />
              ))}
            </div>
          </div>
        ) : loading && !data ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Cargando misiones">
            {[0, 1, 2].map(item => (
              <div key={item} className="h-28 animate-pulse rounded-xl bg-surface2" />
            ))}
          </div>
        ) : data ? (
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
        ) : (
          <div className="rounded-xl border border-line bg-surface2 p-4 text-sm text-muted" role="alert">
            {error || 'No pudimos cargar las misiones. Podés reintentar sin cerrar esta ventana.'}
          </div>
        )}

        {!isGuest && error && data
          ? <p className="text-sm text-negative" role="alert">{error}</p>
          : null}

        {isGuest ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={closeModal}
              className={buttonClass('secondary', 'md', true, 'min-h-11 px-3')}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              onClick={closeModal}
              className={buttonClass('primary', 'md', true, 'min-h-11 px-3')}
            >
              Registrarme
            </Link>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={closeModal} autoFocus>
              Cerrar
            </Button>
            {!data ? (
              <Button onClick={() => void refresh()} disabled={loading}>
                {loading ? 'Cargando…' : 'Reintentar'}
              </Button>
            ) : (
              <Link
                href="/objetivos"
                onClick={closeModal}
                className={buttonClass('primary', 'md', false, 'min-h-11')}
              >
                Ver desafío y racha
              </Link>
            )}
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
      </Modal>
    </>
  )
}
