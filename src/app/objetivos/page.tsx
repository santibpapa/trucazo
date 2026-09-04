import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ObjectivesPageClient from './ObjectivesPageClient'
import type { ObjectivesData } from '@/lib/objectives'

export default async function ObjectivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.is_anonymous) redirect('/register')

  const { data } = await supabase.rpc('get_my_objectives', { p_game_id: null })
  return <ObjectivesPageClient initialData={(data as ObjectivesData | null) ?? null} />
}
