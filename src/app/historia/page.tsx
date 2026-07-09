import type { Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoriaClient from './HistoriaClient'

// El mapa maneja su propio alto (fixed inset-0), así que NO usa viewport-fit:cover
// (se queda dentro de la zona segura, como antes). Evita tocar su HUD flotante.
export const viewport: Viewport = { colorScheme: 'dark', viewportFit: 'auto' }

export default async function HistoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', user.id)
    .single()

  // El mapa de la campaña: puntos y fama del jugador, resumen de su estilo, y
  // las provincias con sus rivales (todo calculado en el servidor).
  const { data: map } = await supabase.rpc('get_campaign_map')
  const campaign = (map ?? { points: 0, fama: 0, style: null, provinces: [] }) as {
    points: number
    fama: number
    style: Style | null
    provinces: never[]
  }

  return (
    <HistoriaClient
      points={campaign.points}
      fama={campaign.fama}
      style={campaign.style}
      provinces={campaign.provinces}
      coins={profile?.coins ?? 0}
    />
  )
}

export interface Style {
  known: boolean
  hands: number
  liar: number
  folder: number
  aggressive: number
}
