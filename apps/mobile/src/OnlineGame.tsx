import { useEffect, useState } from 'react'
import GameClient from '../../../src/app/game/[id]/GameClient'
import WaitingRoom from '../../../src/app/game/[id]/WaitingRoom'
import CancelTableButton from '../../../src/app/game/[id]/CancelTableButton'
import Button, { buttonClass } from '../../../src/components/ui/Button'
import Panel from '../../../src/components/ui/Panel'
import { loadGame } from './services'
import ShareTableInvite from '../../../src/components/ShareTableInvite'
import WaitingForPlayers from '../../../src/components/WaitingForPlayers'

export default function OnlineGame({ tableId, owner, online }: { tableId: string; owner: string; online: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGame>> | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    // La partida recupera su estado sin desmontarse; la espera debe volver a
    // consultar la mesa para detectar al rival y montar el controlador.
    if (data?.props) return
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('mobile:refresh', refresh)
    return () => window.removeEventListener('mobile:refresh', refresh)
  }, [data?.props])
  useEffect(() => {
    let cancelled = false
    if (!online) return
    setData(null)
    setError('')
    void loadGame(tableId, owner).then(value => { if (!cancelled) setData(value) })
      .catch(failure => { if (!cancelled) setError(failure instanceof Error ? failure.message : 'No pudimos abrir la mesa.') })
    return () => { cancelled = true }
  }, [tableId, owner, online, revision])
  if (!online || !data || error) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{!online ? 'La partida online necesita conexión. Volveremos a consultar la mesa cuando vuelva internet.' : error || 'Abriendo tu mesa…'}</p>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <a href="#/lobby" className={buttonClass('secondary', 'lg')}>Volver al lobby</a>
  </main>
  if (data.props) return <GameClient key={tableId} {...data.props} />
  return <main className="flex min-h-dvh items-center justify-center p-6">
    <Panel className="flex w-full max-w-sm flex-col gap-5 p-8 text-center">
      <h2 className="font-display text-2xl font-bold text-cream">Esperando rival</h2>
      <p className="text-sm text-muted">{data.table.is_private ? 'Pasale este código a tu rival para que se una.' : 'Tu mesa está publicada. En cuanto alguien entre, arranca la partida.'}</p>
      {data.table.private_code && <p className="rounded-2xl border border-gold/30 bg-base py-5 font-display text-4xl font-extrabold tracking-[0.3em] text-gold">{data.table.private_code}</p>}
      <WaitingForPlayers>Esperando que se sume tu rival…</WaitingForPlayers>
      <ShareTableInvite tableId={tableId} mode="1v1" />
      <WaitingRoom tableId={tableId} isPrivate={data.table.is_private} />
      <CancelTableButton tableId={tableId} />
    </Panel>
  </main>
}
