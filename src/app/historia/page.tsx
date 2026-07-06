import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoriaClient from './HistoriaClient'

export default async function HistoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', user.id)
    .single()

  // El mapa de la campaña: puntos del jugador + provincias con sus rivales
  // (vencido/desbloqueado calculado en el servidor para el jugador actual).
  const { data: map } = await supabase.rpc('get_campaign_map')
  const campaign = (map ?? { points: 0, provinces: [] }) as {
    points: number
    provinces: never[]
  }

  return (
    <HistoriaClient
      points={campaign.points}
      provinces={campaign.provinces}
      coins={profile?.coins ?? 0}
    />
  )
}
