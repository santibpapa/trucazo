import { useEffect, useState } from 'react'
import TeamGameClient from '../../../src/app/game/parejas/[id]/TeamGameClient'
import Button, { buttonClass } from '../../../src/components/ui/Button'
import { loadTeamGame } from './services'
import { teamModeEnabled } from '../../../src/lib/team-game'

export default function TeamGame({ tableId, owner, online }: { tableId: string; owner: string; online: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadTeamGame>> | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    if (!online || !teamModeEnabled) return
    setData(null); setError('')
    void loadTeamGame(tableId, owner).then(value => { if (!cancelled) setData(value) })
      .catch(failure => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'No pudimos abrir la mesa.') })
    return () => { cancelled = true }
  }, [tableId, owner, online, revision])
  if (data && online && teamModeEnabled) return <TeamGameClient {...data} />
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{!teamModeEnabled ? 'Las mesas en parejas no están disponibles en este momento.' : !online ? 'La partida en parejas necesita conexión. Recuperaremos tu lugar cuando vuelva internet.' : error || 'Abriendo tu mesa…'}</p>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <a href="#/lobby" className={buttonClass('secondary', 'lg')}>Volver al lobby</a>
  </main>
}
