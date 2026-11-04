'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, cn } from '@/components/ui'
import { ClockIcon, TrophyIcon } from '@/components/tournaments/TournamentParts'
import { createClient } from '@/lib/supabase/client'
import { formatTournamentTime, tournamentCheckInState } from '@/lib/tournament-ui'
import {
  tournamentApi,
  type Tournament,
  type TournamentEntrySnapshot,
  type TournamentListData,
} from '@/lib/tournaments'

type Notice = {
  id: string
  tournament_id: string
  kind: string
  created_at: string
  read_at: string | null
}

/** Aviso urgente arriba del lobby: confirmar el lugar o entrar a la partida. */
type Urgent =
  | { kind: 'checkin'; tournament: Tournament; done: boolean }
  | { kind: 'match'; tournamentId: string; noticeId: string }

const MATCH_WINDOW = 5 * 60 * 1000
const CHECKIN_WINDOW = 30 * 60 * 1000

export default function TournamentLobbyAccess({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter()
  const client = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(client), [client])
  const [unread, setUnread] = useState(0)
  const [urgent, setUrgent] = useState<Urgent | null>(null)
  const [busy, setBusy] = useState(false)

  const findUrgent = useCallback(async (notices: Notice[]): Promise<Urgent | null> => {
    const now = Date.now()
    const fresh = (notice: Notice, window: number) => !notice.read_at
      && now - new Date(notice.created_at).getTime() < window
    const match = notices.find(notice => notice.kind === 'match' && fresh(notice, MATCH_WINDOW))
    if (match) return { kind: 'match', tournamentId: match.tournament_id, noticeId: match.id }

    const checkin = notices.find(notice => notice.kind === 'checkin' && fresh(notice, CHECKIN_WINDOW))
    if (!checkin) return null
    // El aviso puede haber quedado viejo: se confirma contra el estado real del torneo.
    const [list, mine] = await Promise.all([api.list(), api.myEntry(checkin.tournament_id)])
    const tournament = (list.data as TournamentListData | null)?.upcoming
      .find(item => item.id === checkin.tournament_id)
    const entry = mine.data as TournamentEntrySnapshot | null
    if (!tournament || tournamentCheckInState(tournament, now) !== 'open') return null
    if (entry?.entry.status !== 'active' || entry.checkin) return null
    return { kind: 'checkin', tournament, done: false }
  }, [api])

  useEffect(() => {
    if (isGuest) return
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return
      const result = await client.rpc('tournament_notifications_list')
      if (result.error) return
      const notices = (result.data as Notice[]) ?? []
      setUnread(notices.filter(item => !item.read_at).length)
      const next = await findUrgent(notices)
      setUrgent(current => current?.kind === 'checkin' && current.done ? current : next)
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [client, findUrgent, isGuest])

  const confirm = async (tournament: Tournament) => {
    setBusy(true)
    const result = await api.checkIn(crypto.randomUUID(), tournament.id)
    setBusy(false)
    if (!result.error) setUrgent({ kind: 'checkin', tournament, done: true })
    else router.push(`/torneos/${tournament.id}`)
  }

  return (
    <>
      {urgent?.kind === 'checkin' && (
        <div
          role="status"
          className={cn(
            'flex items-center gap-3 rounded-2xl border p-3 pl-3.5 shadow-card',
            urgent.done ? 'border-positive/40 bg-surface' : 'border-positive/55 bg-[#17301F]',
          )}
        >
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-positive text-ink">
            <ClockIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight text-cream">
              {urgent.done ? 'Listo, estás confirmado' : 'Confirmá tu lugar'}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[#B8DCC6]">
              {urgent.tournament.name} · {urgent.done ? 'arranca' : 'cierra'} a las {formatTournamentTime(urgent.tournament.starts_at)}
            </p>
          </div>
          {urgent.done ? (
            <button
              type="button"
              onClick={() => setUrgent(null)}
              className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold text-muted hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Cerrar
            </button>
          ) : (
            <Button variant="positive" size="sm" className="min-h-11 shrink-0" disabled={busy} onClick={() => void confirm(urgent.tournament)}>
              {busy ? 'Confirmando…' : 'Estoy listo'}
            </Button>
          )}
        </div>
      )}

      {urgent?.kind === 'match' && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-gold/60 bg-gold-soft p-3 pl-3.5 shadow-card">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-ink">
            <TrophyIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight text-cream">¡Te toca jugar!</p>
            <p className="mt-0.5 text-[13px] text-gold-600">Tu partida del torneo está lista. Tenés 5 minutos.</p>
          </div>
          <Link
            href={`/torneos/${urgent.tournamentId}`}
            onClick={() => { void client.rpc('tournament_notification_read', { p_id: urgent.noticeId }) }}
            className="flex min-h-11 shrink-0 items-center rounded-xl bg-gold px-4 text-sm font-extrabold text-ink shadow-gold hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            Entrar
          </Link>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-30 [transform:translate3d(0,0,0)] lg:bottom-6 lg:left-[15.5rem]">
        <Link
          href="/torneos"
          aria-label={unread ? `Abrir torneos, ${unread} avisos sin leer` : 'Abrir torneos'}
          className="objectives-chest-pending group pointer-events-auto relative flex min-h-[5rem] min-w-[5rem] touch-manipulation items-center justify-center rounded-full outline-none transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-base"
        >
          <span aria-hidden="true" className="objectives-chest-glow absolute inset-1 rounded-full bg-gold/15 blur-md" />
          <span aria-hidden="true" className="objectives-chest-shake relative flex h-20 w-20 select-none items-center justify-center text-[4.5rem] leading-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.65)]">🏆</span>
          {unread > 0 && (
            <span aria-hidden="true" className="absolute right-0 top-0 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-base bg-gold px-1 text-xs font-black tabular text-ink shadow-lg">
              {unread}
            </span>
          )}
        </Link>
      </div>
    </>
  )
}
