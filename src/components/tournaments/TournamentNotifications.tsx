'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel } from '@/components/ui'

type Notice = {
  id: string
  tournament_id: string
  kind: 'registration' | 'checkin' | 'match' | 'rescheduled' | 'cancelled'
  created_at: string
  read_at: string | null
  payload: { match_id?: string }
}
const LABELS: Record<Notice['kind'], string> = {
  registration: 'Tu inscripción quedó registrada.',
  checkin: 'Ya podés confirmar tu presencia.',
  match: 'Tu partida está lista. Tenés cinco minutos para entrar.',
  rescheduled: 'El torneo cambió de fecha. Revisá el nuevo horario.',
  cancelled: 'El torneo fue cancelado.',
}

export default function TournamentNotifications() {
  const client = useMemo(() => createClient(), [])
  const [notices, setNotices] = useState<Notice[]>([])
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await client.rpc('tournament_notifications_list')
    if (result.error) setError('No pudimos actualizar los avisos.')
    else { setNotices((result.data as Notice[]) ?? []); setError('') }
  }, [client])
  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 15_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [refresh])
  const unread = notices.filter(notice => !notice.read_at).length
  if (!notices.length && !error) return null
  return <Panel as="section" className="mb-6 p-4 sm:p-5">
    <h2 className="font-display text-lg font-bold text-cream">Avisos de torneos {unread > 0 && <span className="text-gold">({unread} sin leer)</span>}</h2>
    {error && <p role="status" className="mt-2 text-sm text-muted">{error}</p>}
    <ul className="mt-3 space-y-2">
      {notices.slice(0, 8).map(notice => <li key={notice.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface2 p-3 text-sm">
        <Link href={`/torneos/${notice.tournament_id}`} className={`hover:underline ${notice.read_at ? 'text-muted' : 'font-bold text-cream'}`}>
          {LABELS[notice.kind] ?? 'Hay novedades en tu torneo.'}
        </Link>
        {!notice.read_at && <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-gold hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-gold"
          onClick={async () => {
            const result = await client.rpc('tournament_notification_read', { p_id: notice.id })
            if (!result.error) setNotices(current => current.map(item => item.id === notice.id
              ? { ...item, read_at: new Date().toISOString() } : item))
          }}>Marcar leído</button>}
      </li>)}
    </ul>
  </Panel>
}
