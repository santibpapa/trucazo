import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Salon } from '@/lib/types'
import TiendaClient from './TiendaClient'

export default async function TiendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: salons }, { data: owned }] = await Promise.all([
    supabase.from('profiles').select('coins, active_salon').eq('id', user.id).single(),
    supabase.from('salons').select('*').order('sort_order'),
    supabase.from('profile_salons').select('salon_slug').eq('profile_id', user.id),
  ])

  if (!profile) redirect('/lobby')

  return (
    <TiendaClient
      initialCoins={profile.coins}
      initialActive={(profile as { active_salon?: string }).active_salon ?? 'clasico'}
      salons={(salons as Salon[]) ?? []}
      initialOwned={(owned ?? []).map(o => o.salon_slug as string)}
    />
  )
}
