'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button, CoinIcon, Modal, buttonClass, cn } from '@/components/ui'
import { trackFirstParty } from '@/lib/analytics/client'
import type { ObjectivesData } from '@/lib/objectives'
import { ChestRow, WeeklyRow } from './ChestRow'
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
        ariaLabel={isGuest ? 'Misiones y desafío' : 'Misiones de hoy'}
        panelClassName="!max-w-md !gap-0 !p-0 overflow-hidden"
        showCloseButton
        centered
      >
        {isGuest ? (
          <>
            <ChestLid title="Misiones y desafío">
              <p className="mt-1.5 text-xs text-muted">Ingresá con tu cuenta para que tus partidas sumen progreso y cobrar las recompensas.</p>
            </ChestLid>
            <GuestObjectivesLocked />
            <div className="grid grid-cols-2 gap-2 p-3 pt-0">
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
            <ChestLid title="Misiones de hoy">
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
            </ChestLid>

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

                <WeeklyRow objective={data.weekly} claiming={claiming === `weekly:${data.weekly.identifier}`} onClaim={claim} />
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


/** La tapa del cofre: la imagen, el título y lo que cada ventana quiera contar debajo. */
function ChestLid({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
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
        {title}
      </h2>
      {children}
    </div>
  )
}
