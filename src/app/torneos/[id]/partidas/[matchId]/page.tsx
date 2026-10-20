import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tournamentModeEnabled } from '@/lib/tournaments'
import SpectatorClient, { type SpectatorSnapshot } from './SpectatorClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ver partida de torneo | Trucazo', robots: { index: false, follow: false } }

export default async function SpectatorPage({ params }: { params: { id: string; matchId: string } }) {
  if (!tournamentModeEnabled) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) redirect('/login')
  const { data, error } = await supabase.rpc('tournament_spectator_snapshot', { p_match_id: params.matchId })
  if (error || !data || (data as SpectatorSnapshot).tournament_id !== params.id) notFound()
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-16">
      <Link href={`/torneos/${params.id}`} className="text-sm font-semibold text-gold hover:underline">← Volver al torneo</Link>
      <SpectatorClient initial={data as SpectatorSnapshot} />
    </main>
  )
}
