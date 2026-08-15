'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Cuánto esperamos antes de que se siente un bot. Es al azar dentro de esta
// ventana para que no se note siempre el mismo tiempo (y para darle lugar a que
// entre una persona de verdad, que siempre es mejor).
const BOT_ESPERA_MIN_MS = 8000
const BOT_ESPERA_MAX_MS = 18000
const BOT_REINTENTO_MS = 15000

// Se monta en la pantalla de espera del creador. Cuando el rival se une
// (la mesa pasa a 'playing'), refresca para que el server renderice la partida.
export default function WaitingRoom({ tableId, isPrivate = false }: { tableId: string; isPrivate?: boolean }) {
  const router = useRouter()

  // Si no aparece nadie en unos segundos, invitamos a un bot para que puedas
  // jugar igual. Solo en mesas públicas: la privada es para tu amigo, ahí no se
  // mete nadie. El servidor decide (bot_join_table): si no hay bot libre no
  // pasa nada y seguimos esperando, por eso reintenta cada tanto.
  useEffect(() => {
    if (isPrivate) return
    const supabase = createClient()
    const llamarBot = () => { supabase.rpc('bot_join_table', { p_table_id: tableId }) }

    let reintento: ReturnType<typeof setInterval> | undefined
    const primera = setTimeout(() => {
      llamarBot()
      reintento = setInterval(llamarBot, BOT_REINTENTO_MS)
    }, BOT_ESPERA_MIN_MS + Math.random() * (BOT_ESPERA_MAX_MS - BOT_ESPERA_MIN_MS))

    return () => {
      clearTimeout(primera)
      if (reintento) clearInterval(reintento)
    }
  }, [tableId, isPrivate])

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
