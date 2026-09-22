import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tournamentApi, tournamentModeEnabled, type TournamentListData } from '@/lib/tournaments'
import TournamentsHub from './TournamentsHub'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Torneos',
  robots: { index: false, follow: false },
}

export default async function TournamentsPage() {
  if (!tournamentModeEnabled) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await tournamentApi(supabase).list()
  if (error || !data) {
    throw new Error('No pudimos cargar los torneos.')
  }

  return (
    <TournamentsHub
      initialData={data as TournamentListData}
      isGuest={user.is_anonymous === true}
    />
  )
}
