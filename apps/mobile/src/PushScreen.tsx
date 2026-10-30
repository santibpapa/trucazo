import { useEffect, useState } from 'react'
import Button from '../../../src/components/ui/Button'
import { pushStatus, savePushPreferences, stopPush, syncPush, type PushPreferences } from './push'

export default function PushScreen({ owner, online, fromSettings = false }: { owner: string; online: boolean; fromSettings?: boolean }) {
  const [state, setState] = useState<Awaited<ReturnType<typeof pushStatus>> | null>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    let disposed = false
    if (online) void pushStatus().then(value => { if (!disposed) setState(value) }).catch(() => { if (!disposed) setError('No pudimos consultar tus avisos. Volvé a abrir esta pantalla.') })
    return () => { disposed = true }
  }, [owner, online])
  async function update(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action(); setState(await pushStatus()) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos guardar el cambio.') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 p-5 pb-10">
    <a href={fromSettings ? '#/ajustes' : '#/profile'} className="flex min-h-11 items-center text-sm text-gold">{fromSettings ? '← Volver a Ajustes' : '← Volver al perfil'}</a>
    <h1 className="font-display text-2xl font-bold">Notificaciones</h1>
    <p className="text-sm text-muted">Invitaciones y torneos que te esperan. Podés jugar aunque no actives los avisos.</p>
    {!online && <p role="status" className="text-sm text-muted">Conectate para cambiar tus avisos.</p>}
    {error && <p role="alert" className="text-sm text-negative">{error}</p>}
    {state && <>
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
        <p className="font-semibold">{state.enabled ? 'Activados en este dispositivo' : 'Apagados en este dispositivo'}</p>
        <Button disabled={busy || !online || !state.available} onClick={() => void update(() => state.enabled ? stopPush(true) : syncPush(owner, true))}>
          {busy ? 'Guardando…' : state.enabled ? 'Apagar en este dispositivo' : 'Activar notificaciones'}
        </Button>
        {!state.available && <p className="text-sm text-muted">Todavía están en prueba.</p>}
      </section>
      <section className="rounded-2xl border border-line bg-surface p-4">
        {([['invite', 'Invitaciones a jugar'], ['checkin', 'Confirmar presencia en torneos'], ['match', 'Partida de torneo lista']] as const).map(([kind, label]) =>
          <label key={kind} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 border-b border-line py-3 last:border-0">
            <span className="text-sm">{label}</span>
            <input type="checkbox" className="h-5 w-5 accent-gold" checked={state.preferences[kind]} disabled={busy || !online || !state.available}
              onChange={event => { const preferences: PushPreferences = { ...state.preferences, [kind]: event.target.checked }; void update(() => savePushPreferences(preferences)) }} />
          </label>)}
      </section>
      <p className="text-xs text-subtle">Estas tres preferencias se comparten entre tus dispositivos. Un aviso por evento, sin recordatorios repetidos.</p>
    </>}
  </main>
}
