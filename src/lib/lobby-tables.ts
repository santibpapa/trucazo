import type { createClient } from '@/lib/supabase/client'
import type { Table } from '@/lib/types'

let subscriptionId = 0

/** Retoma una mesa propia con una sola lectura de mesa + estado de partida. */
export function watchStartedTable(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  onStarted: (id: string) => void,
) {
  let disposed = false
  let navigating = false
  let inFlight = false
  let pending = false

  async function refresh() {
    if (disposed || navigating || document.visibilityState === 'hidden') return
    if (inFlight) { pending = true; return }
    inFlight = true
    try {
      // games.id es también FK de tables.id: PostgREST resuelve la relación 1:1.
      // No se traen cartas ni el resto del estado del juego.
      const { data, error } = await supabase.from('tables').select('id,games(status)')
        .eq('creator_id', userId).eq('status', 'playing')
        .order('created_at', { ascending: false }).limit(1)
        .abortSignal(AbortSignal.timeout(8000)).maybeSingle()
      const table = data as { id: string; games: { status: string } | null } | null
      if (!disposed && !error && table && table.games?.status !== 'finished') {
        navigating = true
        onStarted(table.id)
      }
    } catch {
      // La reconexión o el siguiente control vuelven a intentarlo.
    } finally {
      inFlight = false
      if (pending) { pending = false; void refresh() }
    }
  }

  const channel = supabase.channel(`my-started-table-${++subscriptionId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'tables', filter: `creator_id=eq.${userId}`,
    }, () => { void refresh() })
    .subscribe(status => { if (status === 'SUBSCRIBED') void refresh() })
  void refresh()
  const interval = setInterval(() => { void refresh() }, 10000)
  window.addEventListener('online', refresh)
  document.addEventListener('visibilitychange', refresh)

  return () => {
    disposed = true
    clearInterval(interval)
    window.removeEventListener('online', refresh)
    document.removeEventListener('visibilitychange', refresh)
    void supabase.removeChannel(channel)
  }
}

/** Revalida la lista al entrar y al reconectar, aunque la navegación use caché. */
export function subscribeLobbyTables(
  supabase: ReturnType<typeof createClient>,
  onTables: (tables: Table[]) => void,
) {
  let disposed = false
  let latestRequest = 0

  async function refresh() {
    if (disposed) return
    const request = ++latestRequest
    const { data, error } = await supabase.from('tables').select('*')
      .eq('status', 'waiting').eq('is_private', false)
      .order('created_at', { ascending: false })
    if (!disposed && request === latestRequest && !error && data) {
      onTables(data as Table[])
    }
  }

  // Una vuelta rápida no reutiliza el canal anterior mientras se está cerrando.
  const channel = supabase.channel(`tables-changes-${++subscriptionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => { void refresh() })
    .subscribe(status => {
      // Incluye los cambios ocurridos antes de establecer la suscripción.
      if (status === 'SUBSCRIBED') void refresh()
    })

  // El resultado es una CANTIDAD creada: cero no significa lobby vacío.
  // También consultamos si falla la reposición; puede haber mesas existentes.
  void supabase.rpc('ensure_lobby_tables').then(() => refresh(), () => refresh())

  return () => {
    disposed = true
    void supabase.removeChannel(channel)
  }
}
