'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button, CoinIcon, Modal, buttonClass, cn } from '@/components/ui'
import { trackFirstParty } from '@/lib/analytics/client'
import type { Objective, ObjectivesData } from '@/lib/objectives'
import GuestObjectivesLocked from './GuestObjectivesLocked'
import { useObjectives } from './useObjectives'

interface Props {
  initialData: ObjectivesData | null
  isGuest: boolean
  onCoinsChange: (coins: number) => void
}

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
  const pendingReward = data?.daily.filter(o => o.status !== 'claimed').reduce((sum, o) => sum + o.reward, 0) ?? 0
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
        title={isGuest ? 'Misiones y desafío' : undefined}
        ariaLabel="Misiones de hoy"
        panelClassName={cn('!max-w-md', isGuest ? '!gap-3 !p-4' : '!gap-0 !p-0 overflow-hidden')}
        showCloseButton
        centered
      >
        {isGuest ? (
          <>
            <GuestObjectivesLocked message="Ingresá con tu cuenta o registrate para guardar tu progreso y empezar a reclamar las recompensas de las misiones." />
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
          </>
        ) : (
          <>
            {/* La tapa del cofre: qué queda por ganar hoy, racha y saldo */}
            <div
              className="border-b border-line px-4 pb-3 pt-5 text-center"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 120%, rgba(201,162,75,0.35), transparent 60%), linear-gradient(180deg, #2c1a1c, #241517)',
              }}
            >
              <Image
                src="/objetivos/cofre-misiones.webp"
                alt=""
                aria-hidden="true"
                width={84}
                height={84}
                sizes="84px"
                className="mx-auto h-[84px] w-[84px] select-none object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)]"
              />
              <h2 className="mt-1 text-2xl font-bold leading-none text-cream" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Misiones de hoy
              </h2>
              {data && (
                <>
                  <p className="mt-1.5 text-xs text-muted">
                    {pendingReward > 0
                      ? <>Te quedan <b className="font-extrabold text-gold">{pendingReward.toLocaleString('es-AR')} monedas</b> por ganar hoy</>
                      : 'Ya cobraste todo lo de hoy. Mañana hay misiones nuevas.'}
                  </p>
                  <div className="mt-2.5 flex justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-black/25 px-2.5 py-1 text-[11px] font-bold text-cream">
                      Racha <em className="not-italic text-gold">{data.streak.current_days} {data.streak.current_days === 1 ? 'día' : 'días'}</em>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-black/25 px-2.5 py-1 text-[11px] font-bold text-cream">
                      Saldo <em className="not-italic tabular text-gold inline-flex items-center gap-1"><CoinIcon size={12} />{data.coins.toLocaleString('es-AR')}</em>
                    </span>
                  </div>
                </>
              )}
            </div>

            {loading && !data ? (
              <div className="grid gap-2 p-3" aria-busy="true" aria-label="Cargando misiones">
                {[0, 1, 2].map(item => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-surface2" />
                ))}
              </div>
            ) : data ? (
              <>
                <div className="grid gap-2 p-3">
                  {data.daily.map(objective => (
                    <ChestRow
                      key={objective.identifier}
                      objective={objective}
                      claiming={claiming === `daily:${objective.identifier}`}
                      onClaim={claim}
                    />
                  ))}
                </div>

                {/* Desafío semanal: el mismo para toda la comunidad, termina el domingo */}
                <div
                  className="mx-3 mb-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-gold/40 px-3 py-2.5"
                  style={{ background: 'linear-gradient(90deg, rgba(201,162,75,0.12), transparent)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gold">Desafío semanal</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-cream">
                      {data.weekly.name} · <span className="tabular">{Math.min(data.weekly.progress, data.weekly.target)}/{data.weekly.target}</span>
                    </p>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base"
                      role="progressbar"
                      aria-label={`Progreso de ${data.weekly.name}`}
                      aria-valuemin={0}
                      aria-valuemax={data.weekly.target}
                      aria-valuenow={Math.min(data.weekly.progress, data.weekly.target)}
                    >
                      <div
                        className={cn('h-full rounded-full', data.weekly.status === 'claimed' ? 'bg-positive/65' : 'bg-gold')}
                        style={{ width: `${Math.min(100, Math.round((data.weekly.progress / data.weekly.target) * 100))}%` }}
                      />
                    </div>
                    <p className={cn('mt-1 text-[10px] font-semibold', data.weekly.status === 'claimed' ? 'text-positive' : data.weekly.status === 'ready' ? 'text-gold' : 'text-subtle')}>
                      {data.weekly.status === 'claimed' ? 'Reclamada' : data.weekly.status === 'ready' ? 'Lista para reclamar' : data.weekly.ends_label}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {data.weekly.status === 'ready' && (
                      <Button
                        size="sm"
                        className="min-h-11 !px-3 !py-1.5"
                        disabled={claiming === `weekly:${data.weekly.identifier}`}
                        onClick={() => claim('weekly', data.weekly.identifier)}
                      >
                        {claiming === `weekly:${data.weekly.identifier}` ? 'Reclamando…' : 'Reclamar'}
                      </Button>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold tabular text-gold">
                      <CoinIcon size={12} />{data.weekly.reward}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3">
                <div className="rounded-xl border border-line bg-surface2 p-4 text-sm text-muted" role="alert">
                  {error || 'No pudimos cargar las misiones. Podés reintentar sin cerrar esta ventana.'}
                </div>
                <Button className="mt-3" fullWidth onClick={() => void refresh()} disabled={loading}>
                  {loading ? 'Cargando…' : 'Reintentar'}
                </Button>
              </div>
            )}

            {error && data ? <p className="px-3 pb-3 text-sm text-negative" role="alert">{error}</p> : null}
          </>
        )}

        <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
      </Modal>
    </>
  )
}

/** Una misión adentro del cofre: a la derecha, su pila de monedas (una por
 *  partida de la meta) que se va llenando con el avance; si está lista, el
 *  botón para cobrarla. */
function ChestRow({
  objective,
  claiming,
  onClaim,
}: {
  objective: Objective
  claiming: boolean
  onClaim: (type: 'daily' | 'weekly', identifier: string) => void
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
        <p className={cn('mt-1 text-[10px] font-semibold', status === 'claimed' ? 'text-positive' : status === 'ready' ? 'text-gold' : 'text-subtle')}>
          {status === 'claimed'
            ? 'Reclamada'
            : <><span className="tabular">{done}/{objective.target}</span> · {status === 'ready' ? 'Lista para reclamar' : objective.ends_label}</>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {status === 'ready' ? (
          <Button
            size="sm"
            className="min-h-11 !px-3 !py-1.5"
            disabled={claiming}
            onClick={() => onClaim(objective.type, objective.identifier)}
          >
            {claiming ? 'Reclamando…' : 'Reclamar'}
          </Button>
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
