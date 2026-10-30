import { useEffect, useState } from 'react'
import { Browser } from '@capacitor/browser'
import Button, { buttonClass } from '../../../src/components/ui/Button'
import Logo from '../../../src/components/ui/Logo'
import { validCompatibility, type AppCompatibility } from '../../../src/lib/app-compatibility'
import { APP_VERSION_CODE } from './config'
import { createClient } from './services'

export function useCompatibility(owner: string, online: boolean) {
  const [result, setResult] = useState<{ owner: string; state: AppCompatibility | null; error: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!owner || !online) return
    let cancelled = false
    const refresh = () => {
      void createClient().rpc('app_compatibility', { p_version_code: APP_VERSION_CODE }).then(({ data, error }) => {
        if (!cancelled) setResult({ owner, state: !error && validCompatibility(data) ? data : null, error: !!error || !validCompatibility(data) })
      }, () => { if (!cancelled) setResult({ owner, state: null, error: true }) })
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('mobile:refresh', refresh)
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('mobile:refresh', refresh) }
  }, [owner, online, revision])
  return { state: result?.owner === owner ? result.state : null, error: result?.owner === owner && result.error, retry: () => setRevision(value => value + 1) }
}

export function CompatibilityScreen({ state, error, retry, logout }: {
  state: AppCompatibility | null; error: boolean; retry: () => void; logout: () => Promise<void>
}) {
  const [openError, setOpenError] = useState(false)
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
    <Logo size="md" />
    <p role={error || state ? 'alert' : 'status'}>{state ? 'Actualizá Trucazo para empezar otra partida.'
      : error ? 'No pudimos comprobar la versión. Tu sesión y tus partidas están guardadas.' : 'Comprobando tu versión…'}</p>
    {state?.updateUrl && <Button onClick={() => { void Browser.open({ url: state.updateUrl! }).catch(() => setOpenError(true)) }}>Actualizar Trucazo</Button>}
    {openError && <p role="alert">No pudimos abrir la actualización. Reintentá.</p>}
    {state?.activeGameId && <a href={'#/game/' + state.activeGameId} className={buttonClass('secondary', 'lg')}>Terminar mi partida</a>}
    {state?.activeTeamId && <a href={'#/game/parejas/' + state.activeTeamId} className={buttonClass('secondary', 'lg')}>Terminar mi partida en parejas</a>}
    <a href="#/historia/offline" className={buttonClass('secondary', 'lg')}>Abrir campaña y sincronizar</a>
    <a href="#/inicio" className="flex min-h-11 items-center text-sm text-gold">← Menú principal</a>
    {(error || state) && <Button variant="ghost" onClick={retry}>Reintentar</Button>}
    <Button variant="ghost" onClick={() => { void logout() }}>Cerrar sesión</Button>
  </main>
}
