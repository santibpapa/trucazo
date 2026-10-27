'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CampaignLives from '@/components/CampaignLives'
import type { CampaignLives as Lives } from '@/lib/useCampaignLives'
import { createClient } from '@/lib/supabase/client'
import HistoriaScreen, { type Props, type RankingRow } from '@/components/historia/HistoriaScreen'

export default function HistoriaClient({ lives, ...props }: Omit<Props, 'onPlay' | 'loadRanking' | 'BackLink' | 'controls' | 'livesControl'> & { lives: Lives | null }) {
  const router = useRouter()
  async function play(rivalId: string) {
    const { data, error } = await createClient().rpc('start_campaign_duel', { p_rival_id: rivalId }).abortSignal(AbortSignal.timeout(8000))
    if (error || !data?.id) throw new Error(error?.message ?? 'No se pudo iniciar la partida.')
    router.push(`/game/${data.id}`)
    router.refresh()
  }
  async function ranking() {
    const { data, error } = await createClient().rpc('get_campaign_ranking')
    if (error || !data) throw new Error('No se pudo cargar el ranking.')
    return data as RankingRow[]
  }
  return <HistoriaScreen {...props} onPlay={play} loadRanking={ranking} BackLink={Link} livesControl={<CampaignLives initial={lives} />}
    controls={<div className="fixed bottom-3 inset-x-0 z-20 flex justify-center px-3 pointer-events-none">
      <a href="/android/historia/index.html" className="pointer-events-auto rounded-full border border-line bg-surface2/95 px-3 py-2 text-xs font-bold text-gold shadow-card">Jugar sin internet</a>
    </div>} />
}
