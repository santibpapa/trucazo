import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tournamentApi, type TournamentListData } from '@/lib/tournaments'
import AdminTournamentsList from './AdminTournamentsList'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Administrar torneos',
  robots: { index: false, follow: false },
}

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, listResult] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    tournamentApi(supabase).list(),
  ])
  if (!profileResult.data?.is_admin) redirect('/lobby')
  if (listResult.error || !listResult.data) redirect('/admin')

  return <AdminTournamentsList initialData={listResult.data as TournamentListData} />
}
