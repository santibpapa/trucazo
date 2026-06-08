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

  return (
    <LobbyClient
      profile={profile}
      initialTables={tables || []}
    />
  )
}