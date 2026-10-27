import { useEffect, useState } from 'react'
import ProfileScreen from '../../../src/app/profile/ProfileScreen'
import RankingScreen from '../../../src/app/ranking/RankingScreen'
import TiendaClient from '../../../src/app/tienda/TiendaClient'
import { loadProfile, loadRanking, loadShop } from '../../../src/lib/player-data'
import { Button } from '../../../src/components/ui'
import { cachedSession, createClient } from './services'

type Screen = '/profile' | '/ranking' | '/tienda'
type Data = { screen: '/profile'; data: Awaited<ReturnType<typeof loadProfile>> }
  | { screen: '/ranking'; data: Awaited<ReturnType<typeof loadRanking>> }
  | { screen: '/tienda'; data: Awaited<ReturnType<typeof loadShop>> }

export default function PlayerScreens({ screen, owner, online }: { screen: Screen; owner: string; online: boolean }) {
  const [result, setResult] = useState<Data>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('mobile:refresh', refresh)
    return () => window.removeEventListener('mobile:refresh', refresh)
  }, [])
  useEffect(() => {
    let disposed = false
    setError('')
    if (online) void (async () => {
      const client = createClient()
      const identity = await client.auth.getUser()
      if (identity.error || identity.data.user?.id !== owner) throw new Error('Entrá con tu cuenta.')
      const next: Data = screen === '/profile' ? { screen, data: await loadProfile(client, owner) }
        : screen === '/ranking' ? { screen, data: await loadRanking(client, owner) }
        : { screen, data: await loadShop(client, owner) }
      if (!disposed && cachedSession()?.user.id === owner) setResult(next)
    })().catch(() => { if (!disposed) setError('No pudimos cargar la pantalla. Reintentá en un momento.') })
    return () => { disposed = true }
  }, [screen, owner, online, revision])
  if (!online || !result) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{!online ? 'Conectate para consultar tu perfil, ranking y tienda.' : error || 'Cargando…'}</p>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <a href="#/lobby" className="text-gold">Volver al lobby</a>
    {!online && <a href="#/historia/offline" className="text-gold">Historia sin internet</a>}
  </main>
  if (result.screen === '/profile') return <ProfileScreen {...result.data}
    accountLink={<div className="flex flex-col gap-4"><a href="#/notificaciones" className="text-sm text-gold underline underline-offset-2 w-fit">Notificaciones</a>
      <a className="text-sm text-negative underline underline-offset-2 w-fit" href="#/eliminar-cuenta">Eliminar mi cuenta</a></div>} />
  if (result.screen === '/ranking') return <RankingScreen {...result.data} owner={owner} />
  return <TiendaClient key={revision} {...result.data} />
}
