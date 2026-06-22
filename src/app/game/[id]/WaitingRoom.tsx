'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Se monta en la pantalla de espera del creador. Cuando el rival se une
// (la mesa pasa a 'playing'), refresca para que el server renderice la partida.
export default function WaitingRoom({ tableId }: { tableId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`waiting-${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${tableId}` },
        (payload) => {
          if ((payload.new as { status?: string }).status === 'playing') {
            router.refresh()
          }
        }
      )
      .subscribe()

    // Fallback por si el evento realtime no llega
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('tables')
        .select('status')
        .eq('id', tableId)
        .single()
      if (data?.status === 'playing') {
        clearInterval(interval)
        router.refresh()
      }
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [tableId, router])

  return null
}
