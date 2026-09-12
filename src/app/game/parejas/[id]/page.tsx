import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { teamModeEnabled, type TeamSnapshot } from '@/lib/team-game'
import TeamGameClient from './TeamGameClient'

export default async function TeamGamePage({ params }: { params: { id: string } }) {
  if (!teamModeEnabled) redirect('/lobby')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc('team_snapshot', { p_table_id: params.id }),
    supabase.from('profiles').select('active_salon').eq('id', user.id).single(),
  ])
  if (error || !data) redirect('/lobby')
  return <TeamGameClient initial={data as TeamSnapshot} userId={user.id} salonSlug={profile?.active_salon ?? 'clasico'} />
}
