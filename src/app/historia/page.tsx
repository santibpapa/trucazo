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

  // La galería de rivales con el estado (vencido/desbloqueado) del jugador actual.
  const { data: rivals } = await supabase.rpc('get_campaign')

  return <HistoriaClient initialRivals={rivals ?? []} coins={profile?.coins ?? 0} />
}
