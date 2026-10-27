import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import LoginScreen from '../../../src/components/LoginScreen'
import LobbyClient from '../../../src/app/lobby/LobbyClient'
import { GoogleLogo } from '../../../src/components/GoogleButton'
import Button, { buttonClass } from '../../../src/components/ui/Button'
import Logo from '../../../src/components/ui/Logo'
import RecoveryScreen from '../../../src/components/RecoveryScreen'
import Register from './Register'
import { cancelAuth, changePassword, completeAppAuth, googlePending, googleSignIn, recoveryReady, rememberDestination, requestRecovery, takeDestination } from './auth'
import { authDestination, parseAppLink } from '../../../src/lib/auth-links'
import { cachedSession, checkAccountAccess, createClient, loadLobby, signIn, signOut } from './services'
import { navigate } from './navigation'
import History from './History'
import OnlineGame from './OnlineGame'
import Invitation from './Invitation'
import { invitationPath } from '../../../src/lib/table-invites'
import PlayerScreens from './PlayerScreens'
import OnlineHistory from './OnlineHistory'
import TeamGame from './TeamGame'
import Tournaments from './Tournaments'
import CommunityScreens from './CommunityScreens'
import CommunityRulesPrompt from '../../../src/components/CommunityRulesPrompt'
import PublicContent, { publicPages } from './PublicContent'
import PushScreen from './PushScreen'
import AccountDeletion from './AccountDeletion'
import { syncPush } from './push'
import { androidBack, rememberScreen, restoreScreen } from './android-behavior'
import { pauseSounds } from '../../../src/lib/sounds'
import { trackFirstParty } from '../../../src/lib/analytics/client'
import { CompatibilityScreen, useCompatibility } from './Compatibility'

const startup = registerPlugin<{ ready(): Promise<void> }>('Startup')

function Lobby({ session, online, onLogout }: { session: Session; online: boolean; onLogout: () => Promise<void> }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadLobby>> | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('mobile:refresh', refresh)
    return () => window.removeEventListener('mobile:refresh', refresh)
  }, [])
  useEffect(() => {
    let cancelled = false
    if (!online) return
    setError('')
    void loadLobby().then(result => { if (!cancelled) setData(result) })
      .catch(() => { if (!cancelled) setError('No pudimos cargar el lobby. Reintentá en un momento.') })
    return () => { cancelled = true }
  }, [session.user.id, online, revision])
  useEffect(() => {
    if (!data || !online || performance.getEntriesByName('trucazo:lobby-ready').length) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        performance.mark('trucazo:lobby-ready')
        if (Capacitor.isNativePlatform()) void startup.ready().catch(() => {})
      })
    })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [data, online])
  if (!online || !data) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <Logo size="md" />
    <p role="status">{!online ? 'Sin conexión. Tu sesión está conservada.' : error || 'Cargando tu lobby…'}</p>
    <a href="#/historia/offline" className={buttonClass('primary', 'lg')}>Abrir Historia sin internet</a>
    {online && error && <Button onClick={() => setRevision(value => value + 1)}>Reintentar</Button>}
    <Button variant="ghost" onClick={() => { void onLogout() }}>Cerrar sesión</Button>
  </main>
  return <>
    {error && <p role="alert" className="bg-surface2 p-3 text-center text-sm text-negative">{error}</p>}
    <LobbyClient {...data} onLogout={onLogout} gameInvitesInLobby />
  </>
}

function App() {
  const [route, setRoute] = useState(() => Capacitor.isNativePlatform() ? restoreScreen(cachedSession()?.user.id) : window.location.hash)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [session, setSession] = useState<Session | null>(() => cachedSession())
  const [ready, setReady] = useState(() => !!cachedSession())
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [handlingLink, setHandlingLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const supabase = createClient()
  const pushOwner = session?.user.id || ''
  const compatibility = useCompatibility(pushOwner, online)

  useEffect(() => { if (online && pushOwner) trackFirstParty('page_view') }, [route, online, pushOwner])

  useEffect(() => {
    if (online && pushOwner) void checkAccountAccess().then(owner => {
      if (owner) setSession(current => current?.user.id === owner ? null : current)
    }).catch(() => {})
  }, [online, pushOwner])

  useEffect(() => {
    if (Capacitor.isNativePlatform() && session) rememberScreen(session.user.id, route)
  }, [route, session])

  useEffect(() => {
    if (online || !pushOwner) void syncPush(pushOwner).catch(() => {})
  }, [pushOwner, online])

  useEffect(() => {
    const notice = (event: Event) => setLinkError((event as CustomEvent<string>).detail)
    window.addEventListener('mobile:push-message', notice)
    return () => window.removeEventListener('mobile:push-message', notice)
  }, [])

  useEffect(() => {
    if (!session) {
      const destination = authDestination(route.slice(1))
      if (destination && !['/lobby', '/historia'].includes(destination)) rememberDestination(destination)
    }
  }, [route, session])

  useEffect(() => {
    const subscription = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value?.user.is_anonymous ? null : value)
      setReady(true)
      setPassword('')
    }).data.subscription
    const updateRoute = () => { setRoute(window.location.hash); setError('') }
    const connection = () => setOnline(navigator.onLine)
    window.addEventListener('hashchange', updateRoute)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    let disposed = false
    let lastLink = ''
    async function openLink(value: string) {
      if (value === lastLink) return
      lastLink = value
      const link = parseAppLink(value)
      if (!link) { setLinkError('Ese enlace no es de Trucazo o está incompleto.'); return }
      if (link.path !== '/auth/mobile') { rememberDestination(link.path); navigate(link.path); return }
      setHandlingLink(true); setError('')
      try {
        const result = await completeAppAuth(value)
        if (result) navigate(result === 'recovery' ? '/recuperar-cuenta' : takeDestination())
      } catch (failure) { setLinkError(failure instanceof Error ? failure.message : 'No pudimos completar el acceso.'); lastLink = '' }
      finally { setHandlingLink(false); setLoading(false) }
    }
    const links = Capacitor.isNativePlatform() ? NativeApp.addListener('appUrlOpen', ({ url }) => { void openLink(url) }) : null
    const back = Capacitor.isNativePlatform() ? NativeApp.addListener('backButton', ({ canGoBack }) => androidBack(canGoBack)) : null
    if (back) void back.then(handle => { if (disposed) void handle.remove() })
    if (links) {
      void links.then(handle => { if (disposed) void handle.remove() })
      void NativeApp.getLaunchUrl().then(value => { if (value?.url && !disposed) void openLink(value.url) })
    }
    const browser = Capacitor.isNativePlatform() ? Browser.addListener('browserFinished', () => {
      if (googlePending()) { setLoading(false); setError('Volviste de Google. Si no completaste el ingreso, podés reintentarlo.') }
    }) : null
    if (browser) void browser.then(handle => { if (disposed) void handle.remove() })
    const listener = Capacitor.isNativePlatform() ? NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        supabase.auth.startAutoRefresh(); connection()
        void checkAccountAccess().then(owner => { if (owner) setSession(current => current?.user.id === owner ? null : current) }).catch(() => {})
        window.dispatchEvent(new Event('mobile:refresh'))
      }
      else { supabase.auth.stopAutoRefresh(); pauseSounds() }
    }) : null
    if (listener) void listener.then(handle => { if (disposed) void handle.remove() })
    return () => {
      disposed = true
      subscription.unsubscribe()
      window.removeEventListener('hashchange', updateRoute)
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      if (listener) void listener.then(handle => handle.remove())
      if (links) void links.then(handle => handle.remove())
      if (browser) void browser.then(handle => handle.remove())
      if (back) void back.then(handle => handle.remove())
    }
  }, [supabase])

  async function handleLogin() {
    if (loading) return
    setLoading(true); setError('')
    try { await signIn(identifier, password); cancelAuth(); setPassword(''); navigate(takeDestination()) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo conectar. Reintentá.') }
    finally { setLoading(false) }
  }
  async function handleLogout() {
    setLoggingOut(true)
    try { await signOut(); cancelAuth(); takeDestination(); setIdentifier(''); setPassword(''); navigate('/login') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo cerrar la sesión.') }
    finally { setLoggingOut(false) }
  }

  if (!ready) return <main className="flex min-h-dvh items-center justify-center" role="status">Abriendo Trucazo…</main>
  if (loggingOut) return <main className="flex min-h-dvh items-center justify-center" role="status">Cerrando tu sesión…</main>
  if (handlingLink) return <main className="flex min-h-dvh items-center justify-center" role="status">Completando tu acceso…</main>
  if (linkError) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <Logo size="md" /><p role="alert">{linkError}</p><Button onClick={() => setLinkError('')}>Volver</Button>
  </main>
  if (route === '#/eliminar-cuenta') return <AccountDeletion />
  if (route === '#/recuperar-cuenta') return <>
    {error && <p role="alert" className="p-3 text-center text-sm text-negative">{error}</p>}
    <RecoveryScreen ready={recoveryReady()} request={requestRecovery} change={changePassword}
      back={<a href={session ? '#/lobby' : '#/login'}>Volver</a>} done={() => navigate(takeDestination())} />
  </>
  if (session) {
    const path = route.slice(1).split('?')[0]
    const recoveryRoute = path === '/historia/offline' || /^\/game\/(?:parejas\/)?[0-9a-f-]{36}$/i.test(path)
    if (online && !compatibility.state?.compatible && !recoveryRoute) return <CompatibilityScreen
      state={compatibility.state} error={compatibility.error} retry={compatibility.retry} logout={handleLogout} />
    const invitation = invitationPath(path)
    if (invitation) return <Invitation key={session.user.id + invitation} token={invitation.slice('/invitar/'.length)} owner={session.user.id} online={online} />
    if (path === '/notificaciones') return <PushScreen key={session.user.id} owner={session.user.id} online={online} />
    if (path === '/ayuda' || publicPages[path]) return <PublicContent path={path} />
    if (['/comunidad', '/convivencia', '/resena', '/email/preferencias', '/admin', '/admin/analytics', '/admin/emails', '/admin/denuncias'].includes(path) || /^\/admin\/persona\/[0-9a-f-]{36}$/i.test(path)) return <CommunityScreens key={session.user.id + route} path={route.slice(1)} owner={session.user.id} online={online} />
    if (/^#\/(?:torneos(?:\/[0-9a-f-]{36}(?:\/partidas\/[0-9a-f-]{36})?)?|admin\/torneos(?:\/(?:nuevo|[0-9a-f-]{36}))?)$/i.test(route)) return <Tournaments key={session.user.id + route} path={route.slice(1)} owner={session.user.id} online={online} />
    if (route === '#/historia/offline' || (route === '#/historia' && !online)) return <History key={session.user.id} owner={session.user.id} />
    if (route === '#/historia') return <OnlineHistory key={session.user.id} owner={session.user.id} />
    if (route === '#/profile' || route === '#/ranking' || route === '#/tienda') return <PlayerScreens key={session.user.id + route} screen={route.slice(1) as '/profile' | '/ranking' | '/tienda'} owner={session.user.id} online={online} />
    const tableId = /^\/game\/([0-9a-f-]{36})$/i.exec(path)?.[1]
    if (tableId) return <OnlineGame key={session.user.id + tableId} tableId={tableId} owner={session.user.id} online={online} />
    const teamId = /^\/game\/parejas\/([0-9a-f-]{36})$/i.exec(path)?.[1]
    if (teamId) return <TeamGame key={session.user.id + teamId} tableId={teamId} owner={session.user.id} online={online} />
    if (route && !['#/login', '#/lobby'].includes(route)) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size="md" /><p>No encontramos esa pantalla.</p>
      <a href="#/lobby" className={buttonClass('primary', 'lg')}>Volver al lobby</a>
    </main>
    return <>{error && <p role="alert" className="p-3 text-center text-sm text-negative">{error}</p>}
      <Lobby key={session.user.id} session={session} online={online} onLogout={handleLogout} /></>
  }
  if (route === '#/register') return <Register />
  return <LoginScreen identifier={identifier} password={password} error={error} loading={loading}
    onIdentifierChange={setIdentifier} onPasswordChange={setPassword} onLogin={handleLogin}
    status={!online && <p role="status" className="text-sm text-muted text-center">Sin conexión. El acceso necesita internet.</p>}
    registration={<a href="#/register" className="text-gold font-semibold hover:underline">Registrate gratis</a>}>
    <a href="#/recuperar-cuenta" className="text-center text-sm text-gold hover:underline">Olvidé mi contraseña</a>
    <Button variant="secondary" size="lg" fullWidth disabled={loading} onClick={() => {
      setLoading(true); setError(''); void googleSignIn().catch(failure => { setLoading(false); setError(failure.message) })
    }}>
      <GoogleLogo />Continuar con Google
    </Button>
  </LoginScreen>
}

createRoot(document.getElementById('root')!).render(<><App /><CommunityRulesPrompt /></>)
