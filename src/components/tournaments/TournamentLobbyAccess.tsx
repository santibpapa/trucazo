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
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-30 [transform:translate3d(0,0,0)] lg:bottom-6 lg:left-[15.5rem]">
      <Link
        href="/torneos"
        aria-label={unread ? `Abrir torneos, ${unread} avisos sin leer` : 'Abrir torneos'}
        className="objectives-chest-pending group pointer-events-auto relative flex min-h-[5rem] min-w-[5rem] touch-manipulation items-center justify-center rounded-full outline-none transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-base"
      >
        <span aria-hidden="true" className="objectives-chest-glow absolute inset-1 rounded-full bg-gold/15 blur-md" />
        <span aria-hidden="true" className="objectives-chest-shake relative flex h-20 w-20 select-none items-center justify-center text-[5rem] leading-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.65)]">🏆</span>
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-0 top-0 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-base bg-gold px-1 text-xs font-black tabular text-ink shadow-lg">
            {unread}
          </span>
        )}
      </Link>
    </div>
  )
}
