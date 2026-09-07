import type { createClient } from '@/lib/supabase/client'
import type { Table } from '@/lib/types'

let subscriptionId = 0

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
