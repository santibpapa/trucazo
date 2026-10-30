import { useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import ComunidadClient from '../../../src/app/comunidad/ComunidadClient'
import SafetyScreen from '../../../src/components/SafetyScreen'
import ModerationScreen from '../../../src/components/ModerationScreen'
import ResenaScreen from '../../../src/app/resena/ResenaScreen'
import Tablero, { RANGOS } from '../../../src/app/admin/Tablero'
import FichaPersona from '../../../src/app/admin/persona/[id]/Ficha'
import AnalyticsDashboard from '../../../src/app/admin/analytics/AnalyticsDashboard'
import EmailAdminScreen from '../../../src/app/admin/emails/EmailAdminScreen'
import PreferencesScreen, { type EmailPreferenceData } from '../../../src/app/email/preferencias/PreferencesScreen'
import type { Profile } from '../../../src/lib/types'
import type { loadEmailAdmin } from '../../../src/lib/email/admin-data'
import Button from '../../../src/components/ui/Button'
import { appRequest, apiRequest, cachedSession, createClient } from './services'

async function loadScreen(path: string, owner: string): Promise<ReactElement> {
  const client = createClient(), url = new URL(path, 'https://localhost'), route = url.pathname
  const identity = await client.auth.getUser()
  if (identity.error || identity.data.user?.id !== owner || identity.data.user.is_anonymous) throw new Error('Entrá con tu cuenta.')
  if (route === '/resena') return <ResenaScreen request={appRequest} />
  if (route === '/convivencia') return <SafetyScreen />
  if (route === '/email/preferencias') {
    const token = url.searchParams.get('token')
    const data = await apiRequest<EmailPreferenceData>('/api/android/preferences' + (token !== null ? '?token=' + encodeURIComponent(token) : ''))
    return <><nav className="px-5 pt-4"><Link href="/lobby" className="text-gold">← Volver al lobby</Link></nav><PreferencesScreen data={data} token={token ?? ''} request={appRequest} /></>
  }
  if (route === '/comunidad') {
    const [profile, community] = await Promise.all([
      client.from('profiles').select('*').eq('id', owner).single(), client.rpc('get_community'),
    ])
    if (profile.error || community.error) throw new Error('No pudimos cargar la comunidad.')
    return <ComunidadClient profile={profile.data as Profile} initialCommunity={community.data} />
  }
  const profile = await client.from('profiles').select('*').eq('id', owner).single()
  if (profile.error) throw new Error('No pudimos comprobar tu cuenta.')
  if (!profile.data.is_admin) throw new Error('Esta sección es sólo para administradores.')
  if (route === '/admin/denuncias') return <ModerationScreen />
  const days = Number(url.searchParams.get('dias')), dias = RANGOS.includes(days) ? days : 30
  if (route === '/admin/emails') {
    const data = await apiRequest<Awaited<ReturnType<typeof loadEmailAdmin>> & { sender: string }>('/api/android/admin-emails')
    return <EmailAdminScreen {...data} request={appRequest} />
  }
  const id = /^\/admin\/persona\/([0-9a-f-]{36})$/i.exec(route)?.[1]
  const result = await client.rpc(id ? 'admin_player' : route === '/admin/analytics' ? 'admin_acquisition' : 'admin_stats', id ? { p_id: id } : { p_days: dias })
  if (result.error || !result.data) throw new Error(result.error?.message || 'No pudimos cargar el panel.')
  if (id) return <FichaPersona datos={result.data} />
  if (route === '/admin/analytics') return <AnalyticsDashboard stats={result.data} dias={dias} />
  return <Tablero stats={result.data} dias={dias} />
}

export default function CommunityScreens({ path, owner, online }: { path: string; owner: string; online: boolean }) {
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
    setError('')
    if (online) void loadScreen(path, owner).then(next => {
      if (!disposed && cachedSession()?.user.id === owner) setScreen(next)
    }).catch(failure => { if (!disposed) setError(failure instanceof Error ? failure.message : 'No pudimos abrir la pantalla.') })
    return () => { disposed = true }
  }, [path, owner, online, revision])
  if (screen && (online || path.split('?')[0] === '/resena')) return <div>{screen}</div>
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <p role={error ? 'alert' : 'status'}>{!online ? 'Esta pantalla necesita internet. Tu sesión está conservada.' : error || 'Abriendo…'}</p>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <Link href="/lobby" className="text-gold">Volver al lobby</Link>
  </main>
}
