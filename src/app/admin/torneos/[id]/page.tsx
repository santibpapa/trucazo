import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tournamentApi, type TournamentDetailData } from '@/lib/tournaments'
import TournamentForm from '../TournamentForm'
import AdminTournamentDetail from './AdminTournamentDetail'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Administrar torneo',
  robots: { index: false, follow: false },
}

export default async function AdminTournamentPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, detailResult] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    tournamentApi(supabase).detail(params.id),
  ])
  if (!profileResult.data?.is_admin) redirect('/lobby')
  if (detailResult.error) {
    if (detailResult.error.message.includes('Torneo no disponible')) notFound()
    throw new Error('No pudimos cargar el torneo.')
  }
  if (!detailResult.data) notFound()

  const detail = detailResult.data as TournamentDetailData
  if (detail.tournament.status === 'draft') {
    return <TournamentForm initialTournament={detail.tournament} />
  }

  const userIds = Array.from(new Set(
    (detail.admin_entries ?? []).flatMap(entry => entry.members.map(member => member.user_id)),
  ))
  const profilesResult = userIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
    : { data: [], error: null }
  const profiles = Object.fromEntries((profilesResult.data ?? []).map(profile => [profile.id, profile]))

  return <AdminTournamentDetail initialDetail={detail} initialProfiles={profiles} />
}
