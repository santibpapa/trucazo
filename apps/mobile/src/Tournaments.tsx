import { useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import TournamentsHub from '../../../src/app/torneos/TournamentsHub'
import TournamentDetail from '../../../src/app/torneos/[id]/TournamentDetail'
import SpectatorClient, { type SpectatorSnapshot } from '../../../src/app/torneos/[id]/partidas/[matchId]/SpectatorClient'
import AdminTournamentsList from '../../../src/app/admin/torneos/AdminTournamentsList'
import TournamentForm from '../../../src/app/admin/torneos/TournamentForm'
import AdminTournamentDetail from '../../../src/app/admin/torneos/[id]/AdminTournamentDetail'
import { tournamentApi, tournamentModeEnabled, type TournamentDetailData, type TournamentEntrySnapshot, type TournamentListData } from '../../../src/lib/tournaments'
import Button from '../../../src/components/ui/Button'
import { cachedSession, createClient } from './services'

async function loadScreen(path: string, owner: string): Promise<ReactElement> {
  const client = createClient(), api = tournamentApi(client)
  const identity = await client.auth.getUser()
  if (identity.error || identity.data.user?.id !== owner || identity.data.user.is_anonymous) throw new Error('Entrá con tu cuenta.')
  const admin = path.startsWith('/admin/')
  const profile = await client.from('profiles').select('is_admin').eq('id', owner).single()
  if (profile.error) throw new Error('No pudimos comprobar tu cuenta.')
  if (admin && !profile.data?.is_admin) throw new Error('Esta sección es sólo para administradores.')
  if (!admin && !tournamentModeEnabled) throw new Error('Los torneos no están disponibles en este momento.')
  if (path === '/admin/torneos/nuevo') return <TournamentForm />
  if (path === '/torneos' || path === '/admin/torneos') {
    const { data, error } = await api.list()
    if (error || !data) throw new Error('No pudimos cargar los torneos.')
    if (admin) return <AdminTournamentsList initialData={data as TournamentListData} panelHref="/admin" />
    return <>{profile.data?.is_admin && <nav className="px-4 pt-4 text-right"><Link href="/admin/torneos" className="text-sm text-gold">Administrar torneos</Link></nav>}<TournamentsHub initialData={data as TournamentListData} isGuest={false} /></>
  }
  const parts = path.split('/'), id = parts[admin ? 3 : 2]
  if (parts[3] === 'partidas') {
    const { data, error } = await client.rpc('tournament_spectator_snapshot', { p_match_id: parts[4] })
    const snapshot = data as SpectatorSnapshot | null
    if (error || !snapshot || snapshot.tournament_id !== id) throw new Error('Esta partida no está disponible para espectadores.')
    return <main className="mx-auto flex w-full max-w-3xl flex-col px-3 py-3 sm:px-4" style={{ height: 'calc(100dvh - var(--safe-area-inset-top, env(safe-area-inset-top)) - var(--safe-area-inset-bottom, env(safe-area-inset-bottom)))' }}><Link href={`/torneos/${id}`} className="text-sm font-semibold text-gold">← Volver al torneo</Link><SpectatorClient initial={snapshot} /></main>
  }
  const [detail, entry] = await Promise.all([api.detail(id), admin ? Promise.resolve({ data: null, error: null }) : api.myEntry(id)])
  if (detail.error || !detail.data || entry.error) throw new Error('No pudimos abrir el torneo. Reintentá en un momento.')
  const data = detail.data as TournamentDetailData
  if (!admin) return <TournamentDetail initialDetail={data} initialEntry={entry.data as TournamentEntrySnapshot | null} userId={owner} isGuest={false} initialNow={Date.now()} />
  if (data.tournament.status === 'draft') return <TournamentForm initialTournament={data.tournament} />
  const ids = Array.from(new Set((data.admin_entries ?? []).flatMap(row => row.members.flatMap(member => member.user_id ? [member.user_id] : []))))
  const profiles = ids.length ? await client.from('profiles').select('id, username, avatar_url').in('id', ids) : { data: [], error: null }
  if (profiles.error) throw new Error('No pudimos cargar los participantes.')
  return <AdminTournamentDetail initialDetail={data} initialProfiles={Object.fromEntries((profiles.data ?? []).map(row => [row.id, row]))} />
}

export default function Tournaments({ path, owner, online }: { path: string; owner: string; online: boolean }) {
  const [screen, setScreen] = useState<ReactElement | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('mobile:refresh', refresh)
    return () => window.removeEventListener('mobile:refresh', refresh)
  }, [])
  useEffect(() => {
    let disposed = false
    setScreen(null); setError('')
    if (online) void loadScreen(path, owner).then(next => {
      if (!disposed && cachedSession()?.user.id === owner) setScreen(next)
    }).catch(failure => { if (!disposed) setError(failure instanceof Error ? failure.message : 'No pudimos abrir los torneos.') })
    return () => { disposed = true }
  }, [path, owner, online, revision])
  if (online && screen) return <div key={revision}>{screen}</div>
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{!online ? 'Los torneos necesitan conexión. Recuperaremos tu lugar cuando vuelva internet.' : error || 'Abriendo torneos…'}</p>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <Link href="/lobby" className="text-gold">Volver al lobby</Link>
  </main>
}
