'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, Button, Input, Panel } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import {
  argentinaInputToIso,
  defaultTournamentStart,
  isoToArgentinaInput,
  TOURNAMENT_CAPACITIES,
  validateTournamentDraft,
} from '@/lib/tournament-ui'
import {
  tournamentApi,
  type Tournament,
  type TournamentDraftInput,
  type TournamentFormat,
  type TournamentMode,
} from '@/lib/tournaments'

interface FormState {
  name: string
  description: string
  mode: TournamentMode
  format: TournamentFormat
  capacity: 4 | 8 | 16 | 32
  targetScore: 15 | 30
  prizeFirst: string
  prizeSecond: string
  prizeThird: string
  startsAt: string
}

export default function TournamentForm({ initialTournament }: { initialTournament?: Tournament }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [form, setForm] = useState<FormState>(() => initialTournament ? {
    name: initialTournament.name,
    description: initialTournament.description,
    mode: initialTournament.mode,
    format: initialTournament.format,
    capacity: initialTournament.capacity,
    targetScore: initialTournament.target_score,
    prizeFirst: String(initialTournament.prize_first),
    prizeSecond: String(initialTournament.prize_second),
    prizeThird: String(initialTournament.prize_third),
    startsAt: isoToArgentinaInput(initialTournament.starts_at),
  } : {
    name: '',
    description: '',
    mode: '1v1',
    format: 'knockout',
    capacity: 4,
    targetScore: 15,
    prizeFirst: '0',
    prizeSecond: '0',
    prizeThird: '0',
    startsAt: defaultTournamentStart(),
  })
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null)
  const [error, setError] = useState('')

  const allowedCapacities = TOURNAMENT_CAPACITIES[form.mode][form.format]

  const setMode = (mode: TournamentMode) => {
    const allowed = TOURNAMENT_CAPACITIES[mode][form.format]
    setForm(current => ({
      ...current,
      mode,
      capacity: allowed.includes(current.capacity) ? current.capacity : allowed[0],
    }))
  }

  const setFormat = (format: TournamentFormat) => {
    const allowed = TOURNAMENT_CAPACITIES[form.mode][format]
    setForm(current => ({
      ...current,
      format,
      capacity: allowed.includes(current.capacity) ? current.capacity : allowed[0],
    }))
  }

  const buildInput = (): TournamentDraftInput | null => {
    const startsAt = argentinaInputToIso(form.startsAt)
    if (!startsAt) {
      setError('Elegí una fecha y hora válidas.')
      return null
    }
    const input: TournamentDraftInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      mode: form.mode,
      format: form.format,
      capacity: form.capacity,
      targetScore: form.targetScore,
      prizeFirst: form.prizeFirst.trim() === '' ? Number.NaN : Number(form.prizeFirst),
      prizeSecond: form.prizeSecond.trim() === '' ? Number.NaN : Number(form.prizeSecond),
      prizeThird: form.prizeThird.trim() === '' ? Number.NaN : Number(form.prizeThird),
      startsAt,
    }
    const errors = validateTournamentDraft(input)
    if (errors.length > 0) {
      setError(errors[0])
      return null
    }
    return input
  }

  const save = async (publish: boolean) => {
    const input = buildInput()
    if (!input) return
    if (publish && !window.confirm('¿Publicar este torneo? Desde ese momento los jugadores podrán inscribirse.')) return

    setBusy(publish ? 'publish' : 'draft')
    setError('')
    if (!initialTournament) {
      const result = await api.adminCreate(crypto.randomUUID(), input, publish)
      if (result.error || !result.data) {
        setError(friendlyAdminError(result.error?.message ?? 'No pudimos crear el torneo.'))
        setBusy(null)
        return
      }
      const created = result.data as { id?: string }
      if (!created.id) {
        setError('El torneo se creó, pero no pudimos abrirlo. Volvé al listado.')
        setBusy(null)
        return
      }
      router.push(`/admin/torneos/${created.id}`)
      router.refresh()
      return
    }

    const updateResult = await api.adminUpdate(crypto.randomUUID(), initialTournament.id, input)
    if (updateResult.error) {
      setError(friendlyAdminError(updateResult.error.message))
      setBusy(null)
      return
    }
    if (publish) {
      const publishResult = await api.adminPublish(crypto.randomUUID(), initialTournament.id)
      if (publishResult.error) {
        setError(friendlyAdminError(publishResult.error.message))
        setBusy(null)
        return
      }
    }
    router.refresh()
    setBusy(null)
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6">
        <Link
          href={initialTournament ? `/admin/torneos/${initialTournament.id}` : '/admin/torneos'}
          className="text-sm font-semibold text-muted hover:text-gold"
        >
          ← {initialTournament ? 'Volver al torneo' : 'Volver a torneos'}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-cream">
          {initialTournament ? 'Editar borrador' : 'Crear torneo'}
        </h1>
        <p className="text-sm text-muted">La fecha y la hora se muestran siempre en horario de Argentina.</p>
      </header>

      {error && <Alert className="mb-4">{error}</Alert>}

      <Panel className="p-5 sm:p-6">
        <div className="grid gap-5">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
            minLength={3}
            maxLength={80}
            required
            placeholder="Copa Trucazo"
          />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
            Descripción
            <textarea
              value={form.description}
              onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              maxLength={2000}
              rows={5}
              className="w-full resize-y rounded-xl border border-line bg-base px-4 py-3 text-cream placeholder-subtle focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
              placeholder="Contá cómo se juega y qué debe saber quien se anota."
            />
            <span className="text-right text-xs text-subtle">{form.description.length}/2000</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Modalidad"
              value={form.mode}
              onChange={value => setMode(value as TournamentMode)}
              options={[
                { value: '1v1', label: '1 vs 1 · Mano a mano' },
                { value: '2v2', label: '2 vs 2 · Parejas' },
              ]}
            />
            <SelectField
              label="Formato"
              value={form.format}
              onChange={value => setFormat(value as TournamentFormat)}
              options={[
                { value: 'knockout', label: 'Eliminación directa' },
                { value: 'groups', label: 'Grupos + eliminación' },
              ]}
            />
            <SelectField
              label="Cupo total de jugadores"
              value={String(form.capacity)}
              onChange={value => setForm(current => ({ ...current, capacity: Number(value) as FormState['capacity'] }))}
              options={allowedCapacities.map(value => ({ value: String(value), label: `${value} jugadores` }))}
            />
            <SelectField
              label="Puntaje de cada partida"
              value={String(form.targetScore)}
              onChange={value => setForm(current => ({ ...current, targetScore: Number(value) as 15 | 30 }))}
              options={[
                { value: '15', label: 'A 15 puntos' },
                { value: '30', label: 'A 30 puntos' },
              ]}
            />
          </div>

          <Input
            label="Fecha y hora de inicio (Argentina)"
            name="startsAt"
            type="datetime-local"
            value={form.startsAt}
            onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))}
            required
          />

          <fieldset>
            <legend className="text-sm font-medium text-muted">Monedas por jugador</legend>
            <p className="mb-3 text-xs text-subtle">En 2 vs 2, cada integrante recibe el importe completo.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="🥇 Primer puesto"
                name="prizeFirst"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.prizeFirst}
                onChange={event => setForm(current => ({ ...current, prizeFirst: event.target.value }))}
              />
              <Input
                label="🥈 Segundo puesto"
                name="prizeSecond"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.prizeSecond}
                onChange={event => setForm(current => ({ ...current, prizeSecond: event.target.value }))}
              />
              <Input
                label="🥉 Tercer puesto"
                name="prizeThird"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.prizeThird}
                onChange={event => setForm(current => ({ ...current, prizeThird: event.target.value }))}
              />
            </div>
          </fieldset>

          <div className="grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => void save(false)} disabled={busy !== null}>
              {busy === 'draft' ? 'Guardando…' : initialTournament ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            <Button onClick={() => void save(true)} disabled={busy !== null}>
              {busy === 'publish' ? 'Publicando…' : 'Guardar y publicar'}
            </Button>
          </div>
        </div>
      </Panel>
    </main>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-line bg-base px-4 py-3 text-cream focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function friendlyAdminError(message: string): string {
  if (message.includes('tournaments_valid_structure')) {
    return 'Esa combinación de modalidad, formato y cupo no permite armar grupos y tercer puesto.'
  }
  if (message.includes('fecha de inicio')) return 'Elegí una fecha y hora futuras.'
  return message
    .replaceAll('accion', 'acción')
    .replaceAll('inscripcion', 'inscripción')
}
