'use client'
import { useState, type FormEvent } from 'react'
import { Panel, Logo } from '@/components/ui'

export type EmailPreferenceData = { news_enabled: boolean; reengagement_enabled: boolean; ranking_enabled: boolean; tournaments_enabled: boolean }
export default function PreferencesScreen({ data, token = '', initiallySaved = false, request }: { data: EmailPreferenceData; token?: string; initiallySaved?: boolean; request?: typeof fetch }) {
  const [saved, setSaved] = useState(initiallySaved)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!request || busy) return
    const element = event.currentTarget
    const form = new FormData(element)
    const allOff = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'all-off'
    const body = Object.fromEntries(['news', 'reengagement', 'ranking', 'tournaments'].map(name => [name + '_enabled', !allOff && form.get(name) === 'on']))
    setBusy(true); setError(''); setSaved(false)
    try {
      const response = await request('/api/android/preferences' + (token ? '?token=' + encodeURIComponent(token) : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No pudimos guardar las preferencias.')
      if (allOff) element.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(input => { input.checked = false })
      setSaved(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos conectar.') }
    finally { setBusy(false) }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Panel className="w-full max-w-md p-8">
        <div className="text-center"><Logo size="md" /></div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold text-cream">Emails que querés recibir</h1>
        <p className="mt-2 text-center text-sm text-muted">Podés cambiarlo cuando quieras desde cualquier correo.</p>

        {saved && (
          <p className="mt-5 rounded-xl border border-positive/40 bg-positive/10 p-3 text-center text-sm text-cream">Listo, guardamos tus preferencias.</p>
        )}

        <form action="/api/email/preferences" method="post" onSubmit={request ? save : undefined} className="mt-6 flex flex-col gap-4">
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
          <input type="hidden" name="token" value={token} />
          <Preference
            name="news"
            defaultChecked={data.news_enabled}
            title="Novedades de Trucazo"
            description="Nuevos modos, rivales, mejoras y anuncios importantes."
          />
          <Preference
            name="reengagement"
            defaultChecked={data.reengagement_enabled}
            title="Invitaciones para volver"
            description="Un recordatorio si todavía no jugaste o llevás dos días sin entrar a una partida."
          />
          <Preference
            name="ranking"
            defaultChecked={data.ranking_enabled}
            title="Movimientos del ranking"
            description="Avisos cuando entrás o cambiás de puesto en el top 3 online."
          />
          <Preference
            name="tournaments"
            defaultChecked={data.tournaments_enabled}
            title="Torneos"
            description="Anuncios, inscripciones, fechas, check-in y partidas de torneos."
          />
          <button disabled={busy} className="mt-2 rounded-xl bg-gold px-5 py-3 font-bold text-base hover:bg-gold-600">Guardar preferencias</button>
          <button disabled={busy} name="action" value="all-off" className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-muted hover:text-cream">No quiero recibir ningún email</button>
        </form>
      </Panel>
    </main>
  )
}

function Preference({
  name,
  defaultChecked,
  title,
  description,
}: {
  name: string
  defaultChecked: boolean
  title: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line bg-surface2 p-4">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-gold" />
      <span>
        <span className="block font-semibold text-cream">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
      </span>
    </label>
  )
}
