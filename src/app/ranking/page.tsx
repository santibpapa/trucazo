import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadRanking } from '@/lib/player-data'
import RankingScreen from './RankingScreen'

export default async function RankingPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  return <RankingScreen {...await loadRanking(client, user.id)} owner={user.id} />
}
