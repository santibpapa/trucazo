import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadProfile } from '@/lib/player-data'
import ProfileScreen from './ProfileScreen'

export default async function ProfilePage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  return <ProfileScreen {...await loadProfile(client, user.id)} isGuest={user.is_anonymous} />
}
