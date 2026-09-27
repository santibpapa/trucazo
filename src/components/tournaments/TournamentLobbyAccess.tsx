'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function TournamentLobbyAccess({ isGuest = false }: { isGuest?: boolean }) {
  const client = useMemo(() => createClient(), [])
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (isGuest) return
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return
      const result = await client.rpc('tournament_notifications_list')
      if (!result.error) setUnread(((result.data as { read_at: string | null }[]) ?? []).filter(item => !item.read_at).length)
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [client, isGuest])
  return (
    <Link
      href="/torneos"
      aria-label={unread ? `Abrir torneos, ${unread} avisos sin leer` : 'Abrir torneos'}
      className="group pointer-events-auto fixed bottom-[calc(10.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full border border-gold/50 bg-surface px-3 py-2.5 text-gold shadow-lift transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:bottom-[7.25rem] lg:right-6 xl:right-[21.5rem]"
    >
      <span aria-hidden="true" className="text-2xl leading-none">🏆</span>
      <span className="text-sm font-extrabold">Torneos</span>
      {unread > 0 && <span className="rounded-full bg-gold px-1.5 text-xs font-bold text-ink">{unread}</span>}
    </Link>
  )
}
