import { useEffect, useState } from 'react'
import CampaignLives from '../../../src/components/CampaignLives'
import type { CampaignLives as Lives } from '../../../src/lib/useCampaignLives'
import HistoriaScreen, { type Props, type RankingRow } from '../../../src/components/historia/HistoriaScreen'
import { Button } from '../../../src/components/ui'
import { cachedSession, createClient } from './services'
import { Link, navigate } from './navigation'

type MapData = Pick<Props, 'points' | 'fama' | 'style' | 'provinces' | 'coins'> & { lives: Lives | null }
export default function OnlineHistory({ owner }: { owner: string }) {
  const [map, setMap] = useState<MapData>()
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
    void (async () => {
      const client = createClient()
      const [campaign, profile, lives] = await Promise.all([
        client.rpc('get_campaign_map'), client.from('profiles').select('coins').eq('id', owner).single(), client.rpc('get_campaign_lives'),
      ])
      if (campaign.error || profile.error || !campaign.data) throw new Error('No pudimos cargar Historia.')
      if (!disposed && cachedSession()?.user.id === owner) setMap({ ...campaign.data, coins: profile.data.coins, lives: lives.data })
    })().catch(() => { if (!disposed) setError('No pudimos cargar Historia. Podés reintentar o usar tu descarga.') })
    return () => { disposed = true }
  }, [owner, revision])
  async function play(rival: string) {
    const { data, error } = await createClient().rpc('start_campaign_duel', { p_rival_id: rival }).abortSignal(AbortSignal.timeout(8000))
    if (error || !data?.id) throw new Error(error?.message || 'No pudimos abrir la partida.')
    if (cachedSession()?.user.id === owner) navigate('/game/' + data.id)
  }
  async function ranking() {
    const { data, error } = await createClient().rpc('get_campaign_ranking')
    if (error || !data || cachedSession()?.user.id !== owner) throw new Error('No pudimos cargar el ranking.')
    return data as RankingRow[]
  }
  if (!map || error) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{error || 'Abriendo Historia…'}</p>
    {error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <Link href="/historia/offline" className="text-gold">Jugar sin internet</Link>
    <Link href="/lobby" className="text-gold">Volver al lobby</Link>
  </main>
  return <HistoriaScreen {...map} storageOwner={owner} onPlay={play} loadRanking={ranking} BackLink={Link} title="Modo Campaña" backHref="/inicio" backLabel="Volver al menú principal" livesControl={<CampaignLives initial={map.lives} />}
    controls={<div className="fixed bottom-3 inset-x-0 z-20 flex justify-center px-3 pointer-events-none">
      <Link href="/historia/offline" className="pointer-events-auto rounded-full border border-line bg-surface2/95 px-3 py-2 text-xs font-bold text-gold shadow-card">Jugar sin internet</Link>
    </div>} />
}
