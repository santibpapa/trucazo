'use client'

import { useEffect, useState } from 'react'
import { Button, cn, Input, Modal } from '@/components/ui'
import { DateTile, PartnerSuggestions } from '@/components/tournaments/TournamentParts'
import {
  formatTournamentTime,
  tournamentCheckInOpensAt,
  tournamentDateTile,
} from '@/lib/tournament-ui'
import type { TournamentMode, TournamentRecentPartner } from '@/lib/tournaments'

const WAIT_SECONDS = 5

export type RegisterChoice = 'solo' | 'invite'

/**
 * Hoja para anotarse: explica con el horario dibujado cuándo hay que tocar
 * «Estoy listo» y pide que la persona lo acepte. El botón se habilita recién a
 * los cinco segundos. En parejas, primero se elige con quién jugar.
 */
export default function CheckInNotice({
  open,
  mode,
  startsAt,
  tournamentName,
  intent,
  checkInOpen,
  partnerName,
  onPartnerNameChange,
  recentPartners = [],
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  mode: TournamentMode
  startsAt: string
  tournamentName: string
  /** register: anotarse por primera vez. accept: aceptar una invitación de pareja. */
  intent: 'register' | 'accept'
  checkInOpen: boolean
  partnerName: string
  onPartnerNameChange: (value: string) => void
  /** Personas con las que jugó hace poco (etapa 2); vacío si no hay o no cargó. */
  recentPartners?: TournamentRecentPartner[]
  busy: boolean
  onConfirm: (choice: RegisterChoice) => void
  onClose: () => void
}) {
  const [accepted, setAccepted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS)
  const [choice, setChoice] = useState<RegisterChoice>('invite')

  useEffect(() => {
    if (!open) return
    setAccepted(false)
    setSecondsLeft(WAIT_SECONDS)
    const openedAt = Date.now()
    const timer = window.setInterval(() => {
      const left = Math.max(0, WAIT_SECONDS - Math.floor((Date.now() - openedAt) / 1000))
      setSecondsLeft(left)
      if (left === 0) window.clearInterval(timer)
    }, 250)
    return () => window.clearInterval(timer)
  }, [open])

  const tile = tournamentDateTile(startsAt)
  const checkInFrom = formatTournamentTime(tournamentCheckInOpensAt(startsAt))
  const checkInUntil = formatTournamentTime(startsAt)
  const pickPartner = mode === '2v2' && intent === 'register'
  const inviting = pickPartner && choice === 'invite'
  const partner = partnerName.trim()

  const label = intent === 'accept'
    ? 'Aceptar y anotarme'
    : inviting
      ? partner ? `Invitar a ${partner} y anotarme` : 'Invitar y anotarme'
      : pickPartner ? 'Anotarme solo' : 'Anotarme'

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={pickPartner ? '¿Con quién jugás?' : 'Una sola cosa para recordar'}
      panelClassName="max-w-md !gap-4 rounded-b-none !p-5 sm:rounded-b-2xl"
    >
      <div className="mx-auto -mt-2 h-1.5 w-11 rounded-full bg-line sm:hidden" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gold">{tournamentName}</p>
          <h2 className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-tight text-cream">
            {pickPartner ? '¿Con quién jugás?' : 'Una sola cosa para recordar'}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface2 text-cream hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {pickPartner && (
        <div className="space-y-3">
          <div role="radiogroup" aria-label="Cómo armar la pareja" className="grid grid-cols-2 gap-2.5">
            <ChoiceButton
              selected={choice === 'invite'}
              onSelect={() => setChoice('invite')}
              title="Con un amigo"
              detail="Lo invitás y juegan juntos."
              icon={<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />}
            />
            <ChoiceButton
              selected={choice === 'solo'}
              onSelect={() => setChoice('solo')}
              title="Que me toque alguien"
              detail="Te armamos pareja al azar."
              icon={<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />}
            />
          </div>
          {inviting ? (
            <div className="space-y-3">
              <PartnerSuggestions partners={recentPartners} selectedName={partnerName} onPick={onPartnerNameChange} />
              <Input
                label="Nombre de usuario de tu compañero"
                name="partner"
                value={partnerName}
                onChange={event => onPartnerNameChange(event.target.value)}
                maxLength={32}
                autoComplete="off"
                placeholder="Escribilo tal cual"
              />
              <p className="text-[13px] leading-snug text-muted">
                Tu lugar queda guardado desde ya. Si no acepta a tiempo, te toca alguien al azar.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-surface2 px-4 py-3 text-[13px] leading-snug text-cream/90">
              Cuando se cierre la lista, te juntamos con otra persona que también se anotó sola.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3.5 rounded-2xl border border-positive/45 bg-surface2 p-4">
        <div className="flex items-center gap-3.5">
          <DateTile tile={tile} tone="positive" />
          <div>
            <p className="text-sm text-cream/90">
              {checkInOpen ? 'Después de anotarte, tocá ' : 'Volvé y tocá '}
              <b className="text-cream">«Estoy listo»</b>
            </p>
            <p className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-positive">
              {checkInOpen ? `antes de las ${checkInUntil}` : `${checkInFrom} a ${checkInUntil}`}
            </p>
            <p className="text-xs text-muted">Hora de Argentina</p>
          </div>
        </div>
      </div>

      <ul className="space-y-2.5 text-sm leading-snug text-cream/90">
        <li className="flex gap-2.5"><Dot />Si no lo tocás a tiempo, podés perder tu lugar.</li>
        {mode === '2v2' && <li className="flex gap-2.5"><Dot />En parejas alcanza con que confirme uno de los dos.</li>}
        <li className="flex gap-2.5"><Dot />Ya en el torneo, tenés 5 minutos para entrar a cada partida. Si no entrás, perdés ese cruce.</li>
      </ul>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface2 p-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={event => setAccepted(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-gold"
        />
        <span className="text-sm font-semibold text-cream">
          Entiendo que tengo que tocar «Estoy listo» para no perder mi lugar.
        </span>
      </label>

      <Button
        size="lg"
        fullWidth
        onClick={() => onConfirm(pickPartner ? choice : 'solo')}
        disabled={busy || !accepted || secondsLeft > 0 || (inviting && !partner)}
      >
        {busy ? 'Anotando…' : secondsLeft > 0 ? `${label} (${secondsLeft})` : label}
      </Button>
    </Modal>
  )
}

function ChoiceButton({
  selected,
  onSelect,
  title,
  detail,
  icon,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-2 rounded-2xl border-[1.5px] p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        selected ? 'border-gold bg-gold-soft ring-4 ring-gold/10' : 'border-line bg-surface2 hover:border-gold-700',
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-base text-gold">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      </span>
      <span className="text-[15px] font-extrabold leading-tight text-cream">{title}</span>
      <span className="text-xs leading-snug text-muted">{detail}</span>
    </button>
  )
}

function Dot() {
  return <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
}
