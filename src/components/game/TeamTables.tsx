'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, Button, Coins, Panel } from '@/components/ui'
import type { TeamLobbyData, TeamSnapshot } from '@/lib/team-game'

export default function TeamTables() {
  const [data, setData] = useState<TeamLobbyData>({ tables: [], mine: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef<{ id: string; table: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  useEffect(() => {
    let disposed = false
    let revision = 0
    async function refresh() {
      const current = ++revision
      const result = await supabase.rpc('team_lobby')
      if (disposed || current !== revision) return
      if (result.error) setError('No pudimos cargar las mesas 2vs2. Reintentá en un momento.')
      else { setData(result.data as TeamLobbyData); setError('') }
    }
    void refresh()
    const channel = supabase.channel('team-lobby').on('postgres_changes', { event: '*', schema: 'public', table: 'team_tables' }, () => { void refresh() })
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh() })
    const interval = setInterval(() => { void refresh() }, 5000)
    return () => { disposed = true; clearInterval(interval); void supabase.removeChannel(channel) }
  }, [supabase])

  async function join(id: string) {
    if (busy) return
    setBusy(true)
    if (request.current?.table !== id) request.current = { id: crypto.randomUUID(), table: id }
    const result = await supabase.rpc('team_join', { p_table_id: id, p_request_id: request.current.id })
    setBusy(false)
    if (result.error) setError(result.error.message)
    else { request.current = null; router.push(`/game/parejas/${(result.data as TeamSnapshot).table.id}`) }
  }
  return <section className="flex flex-col gap-3" aria-label="Mesas 2vs2">
    <h2 className="font-display text-base font-bold text-cream">Truco por parejas · 2vs2</h2>
    {error && <Alert>{error}</Alert>}
    {data.mine.map(t => <Panel key={t.id} className="p-4 flex items-center justify-between gap-3 border-gold/50">
      <p className="font-semibold text-cream">{t.name}</p>
      <Button size="sm" onClick={() => router.push(`/game/parejas/${t.id}`)}>Volver a mi mesa</Button>
    </Panel>)}
    <div className="grid gap-3 sm:grid-cols-2">
      {data.tables.filter(t => !data.mine.some(m => m.id === t.id)).map(t => <Panel key={t.id} className="p-4 flex flex-col gap-3">
        <div className="flex justify-between gap-2"><p className="font-semibold text-cream truncate">{t.name}</p><span className="text-sm text-muted shrink-0">{t.occupied}/4</span></div>
        <p className="text-sm text-subtle">A {t.target_score} · {t.time_limit} segundos por turno</p>
        <div className="flex justify-between items-center"><Coins amount={t.bet} size="sm" /><Button size="sm" disabled={busy || t.occupied >= 4} onClick={() => { void join(t.id) }}>Elegir asiento</Button></div>
      </Panel>)}
    </div>
    {data.tables.length === 0 && data.mine.length === 0 && !error && <p className="text-sm text-muted">Creá una mesa 2vs2 y completala con personas o bots.</p>}
  </section>
}
