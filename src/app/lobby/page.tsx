import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LobbyClient from './LobbyClient'

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('status', 'waiting')
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  // Partida en curso del usuario (la RLS de games ya limita a las suyas).
  // Los duelos del modo historia no cuentan acá: son práctica, no una partida
  // apostada para retomar, y no deben quedar colgados como "partida en curso".
  const { data: activeGame } = await supabase
    .from('games')
    .select('id')
    .eq('status', 'playing')
    .is('campaign_rival_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <LobbyClient
      profile={profile}
      initialTables={tables || []}
      activeGameId={activeGame?.id ?? null}
    />
  )
}