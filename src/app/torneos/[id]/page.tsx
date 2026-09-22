import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  tournamentApi,
  tournamentModeEnabled,
  type TournamentDetailData,
  type TournamentEntrySnapshot,
} from '@/lib/tournaments'
import TournamentDetail from './TournamentDetail'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Detalle del torneo',
  robots: { index: false, follow: false },
}

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  if (!tournamentModeEnabled) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const api = tournamentApi(supabase)
  const [detailResult, entryResult] = await Promise.all([
    api.detail(params.id),
    api.myEntry(params.id),
  ])
  if (detailResult.error) {
    if (detailResult.error.message.includes('Torneo no disponible')) notFound()
    throw new Error('No pudimos cargar el torneo.')
  }
  if (!detailResult.data) notFound()

  return (
    <TournamentDetail
      initialDetail={detailResult.data as TournamentDetailData}
      initialEntry={(entryResult.data as TournamentEntrySnapshot | null) ?? null}
      userId={user.id}
      isGuest={user.is_anonymous === true}
      initialNow={Date.now()}
    />
  )
}
