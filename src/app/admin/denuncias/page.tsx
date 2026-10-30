import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ModerationScreen from '@/components/ModerationScreen'
export const metadata = { title: 'Denuncias', robots: { index: false, follow: false } }
export default async function DenunciasPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await client.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/lobby')
  return <ModerationScreen />
}
