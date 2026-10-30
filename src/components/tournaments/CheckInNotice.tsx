'use client'

import { useEffect, useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { formatTournamentTime } from '@/lib/tournament-ui'
import type { TournamentMode } from '@/lib/tournaments'

const WAIT_SECONDS = 5

/**
 * Aviso antes de confirmar una inscripción: explica el check-in y pide que la
 * persona lo acepte. El botón se habilita recién a los cinco segundos.
 */
export default function CheckInNotice({
  open,
  mode,
  startsAt,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  mode: TournamentMode
  startsAt: string
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const [accepted, setAccepted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS)

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

  const checkInFrom = formatTournamentTime(new Date(new Date(startsAt).getTime() - 30 * 60 * 1000).toISOString())
  const checkInUntil = formatTournamentTime(startsAt)

  return (
    <Modal open={open} onClose={onClose} title="Antes de anotarte" centered>
      <div className="space-y-3 text-sm text-muted">
        <p>
          Para jugar tenés que <strong className="text-cream">hacer el check-in</strong>: confirmar que estás
          presente con el botón «Confirmar presencia», acá o en el lobby.
        </p>
        <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 font-semibold text-cream">
          Se hace entre las {checkInFrom} y las {checkInUntil} hs (hora de Argentina).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Si no hacés el check-in, podés perder tu lugar.</li>
          {mode === '2v2' && <li>En parejas alcanza con que confirme uno de los dos.</li>}
          <li>Cuando empieza, tenés 5 minutos para entrar a cada partida. Si no entrás, perdés ese cruce.</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface2 p-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={event => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 accent-gold"
        />
        <span className="text-sm font-semibold text-cream">
          Entiendo que tengo que hacer el check-in para no perder mi lugar.
        </span>
      </label>

      <div className="grid gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Volver</Button>
        <Button onClick={onConfirm} disabled={busy || !accepted || secondsLeft > 0}>
          {busy ? 'Anotando…' : secondsLeft > 0 ? `Confirmar inscripción (${secondsLeft})` : 'Confirmar inscripción'}
        </Button>
      </div>
    </Modal>
  )
}
