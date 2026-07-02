import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComunidadClient from './ComunidadClient'

export default async function ComunidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Estado inicial de amigos/solicitudes/invitaciones (una sola llamada).
  const { data: community } = await supabase.rpc('get_community')

  return <ComunidadClient profile={profile} initialCommunity={community ?? null} />
}
