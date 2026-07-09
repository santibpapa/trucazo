import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Salon, Frame } from '@/lib/types'
import TiendaClient from './TiendaClient'

export default async function TiendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: salons },
    { data: ownedSalons },
    { data: frames },
    { data: ownedFrames },
  ] = await Promise.all([
    supabase.from('profiles').select('coins, active_salon, active_frame, avatar_url, username').eq('id', user.id).single(),
    supabase.from('salons').select('*').order('sort_order'),
    supabase.from('profile_salons').select('salon_slug').eq('profile_id', user.id),
    supabase.from('frames').select('*').order('sort_order'),
    supabase.from('profile_frames').select('frame_slug').eq('profile_id', user.id),
  ])

  if (!profile) redirect('/lobby')

  const prof = profile as {
    coins: number
    active_salon?: string
    active_frame?: string
    avatar_url?: string | null
    username?: string
  }

  return (
    <TiendaClient
      initialCoins={prof.coins}
      initialActiveSalon={prof.active_salon ?? 'clasico'}
      salons={(salons as Salon[]) ?? []}
      initialOwnedSalons={(ownedSalons ?? []).map(o => o.salon_slug as string)}
      initialActiveFrame={prof.active_frame ?? 'ninguno'}
      frames={(frames as Frame[]) ?? []}
      initialOwnedFrames={(ownedFrames ?? []).map(o => o.frame_slug as string)}
      avatarUrl={prof.avatar_url ?? null}
      username={prof.username ?? 'Vos'}
    />
  )
}
