'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Alert, Avatar, Button, Input, Panel } from '@/components/ui'
import Competition from '@/components/tournaments/Competition'
import { createClient } from '@/lib/supabase/client'
import {
  argentinaInputToIso,
  formatTournamentDate,
  isoToArgentinaInput,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_MODE_LABEL,
  TOURNAMENT_STATUS_LABEL,
} from '@/lib/tournament-ui'
import {
  tournamentApi,
  tournamentModeEnabled,
  type TournamentAdminMember,
  type TournamentDetailData,
  type TournamentEntry,
} from '@/lib/tournaments'

type ProfileSummary = { id: string; username: string; avatar_url: string | null }

export default function AdminTournamentDetail({
  initialDetail,
  initialProfiles,
}: {
  initialDetail: TournamentDetailData
  initialProfiles: Record<string, ProfileSummary>
}) {
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [detail, setDetail] = useState(initialDetail)
  const [profiles, setProfiles] = useState(initialProfiles)
  const [startsAt, setStartsAt] = useState(isoToArgentinaInput(initialDetail.tournament.starts_at))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [replacement, setReplacement] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadProfiles = useCallback(async (next: TournamentDetailData) => {
    const ids = Array.from(new Set(
      (next.admin_entries ?? []).flatMap(item => item.members.map(member => member.user_id)),
    ))
    const missing = ids.filter(id => !profiles[id])
    if (missing.length === 0) return
    const result = await supabase.from('profiles').select('id, username, avatar_url').in('id', missing)
    if (!result.data) return
    setProfiles(current => ({
      ...current,
      ...Object.fromEntries(result.data.map(profile => [profile.id, profile])),
    }))
  }, [profiles, supabase])

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await api.detail(initialDetail.tournament.id)
    if (result.error || !result.data) {
      setError('No pudimos actualizar el torneo. Vamos a reintentar.')
      return
    }
    const next = result.data as TournamentDetailData
    setDetail(next)
    setError('')
    await loadProfiles(next)
  }, [api, initialDetail.tournament.id, loadProfiles])

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 8_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const tournament = detail.tournament
  const entries = detail.admin_entries ?? []
  const pendingInvitations = entries.reduce(
    (total, item) => total + item.members.filter(member => member.status === 'pending').length,
    0,
  )
  const waitlistedPlayers = entries
    .filter(item => item.entry.status === 'waitlisted')
    .reduce((total, item) => total + item.members.filter(member => member.status === 'accepted').length, 0)
  const checkedInEntries = detail.participants.filter(item => item.checked_in).length

  const reschedule = async () => {
    const iso = argentinaInputToIso(startsAt)
    if (!iso || new Date(iso).getTime() <= Date.now()) {
      setError('Elegí una fecha y hora futuras.')
      return
    }
    if (!window.confirm('¿Reprogramar el torneo? Los check-ins que ya existan se borrarán y deberán confirmarse otra vez.')) return
    setBusy('reschedule')
    setError('')
    setMessage('')
    const result = await api.adminReschedule(crypto.randomUUID(), tournament.id, iso)
    if (result.error) {
      setError(result.error.message)
      setBusy(null)
      return
    }
    setMessage('Torneo reprogramado. Los check-ins anteriores fueron invalidados.')
    await refresh()
    setBusy(null)
  }

  const cancel = async () => {
    if (!window.confirm('¿Cancelar definitivamente este torneo? Los jugadores ya no podrán inscribirse ni hacer check-in.')) return
    setBusy('cancel')
    setError('')
    setMessage('')
    const result = await api.adminCancel(crypto.randomUUID(), tournament.id, reason.trim())
    if (result.error) {
      setError(result.error.message)
      setBusy(null)
      return
    }
    setMessage('Torneo cancelado.')
    await refresh()
    setBusy(null)
  }

  const competitionAction = async (
    action: string,
    success: string,
    mutation: () => PromiseLike<{ error: { message: string } | null }>,
  ) => {
    setBusy(action)
    setError('')
    setMessage('')
    const result = await mutation()
    if (result.error) setError(result.error.message)
    else {
      setMessage(success)
      await refresh()
    }
    setBusy(null)
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/torneos" className="text-sm font-semibold text-muted hover:text-gold">← Volver a torneos</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold text-cream">{tournament.name}</h1>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
              {TOURNAMENT_STATUS_LABEL[tournament.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {TOURNAMENT_MODE_LABEL[tournament.mode]} · {TOURNAMENT_FORMAT_LABEL[tournament.format]} · {formatTournamentDate(tournament.starts_at)}
          </p>
        </div>
        {tournamentModeEnabled && (
          <Link href={`/torneos/${tournament.id}`} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-cream hover:border-gold hover:text-gold">
            Ver como jugador
          </Link>
        )}
      </header>

      {error && <Alert className="mb-4">{error}</Alert>}
      {message && <Alert tone="info" className="mb-4">{message}</Alert>}

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Jugadores activos" value={`${detail.active_players}/${tournament.capacity}`} />
        <Metric label="En espera" value={String(waitlistedPlayers)} />
        <Metric label="Check-ins" value={`${checkedInEntries}/${detail.participants.length}`} />
        <Metric label="Invitaciones pendientes" value={String(pendingInvitations)} />
      </section>

      {tournament.mode === '1v1' && tournament.status === 'published'
        && Date.now() >= new Date(tournament.starts_at).getTime() && (
        <Panel as="section" className="mb-5 border-gold/40 p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Iniciar competencia</h2>
          <p className="mt-1 text-sm text-muted">
            {tournament.format === 'groups'
              ? 'Se necesitan 8, 16 o 32 participantes confirmados para formar grupos de cuatro.'
              : 'Se necesitan al menos cuatro participantes. Si faltan lugares, habrá pases directos.'}
            {' '}Los ausentes del check-in se reemplazan según la lista de espera.
          </p>
          <Button className="mt-3" onClick={() => void competitionAction('start',
            'Se sorteó el plantel y comenzaron los cruces.', () => api.adminStart(tournament.id))}
            disabled={busy !== null}>Iniciar torneo</Button>
        </Panel>
      )}

      {tournament.mode === '1v1' && tournament.status === 'running' && (
        <Panel as="section" className="mb-5 p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Control de competencia</h2>
          <p className="mt-1 text-sm text-muted">{tournament.paused_at
            ? 'Pausado. Las partidas en curso pueden terminar; la próxima ronda esperará.'
            : 'Las rondas y ausencias se procesan automáticamente.'}</p>
          <Button className="mt-3" variant="secondary"
            onClick={() => void competitionAction('pause',
              tournament.paused_at ? 'Torneo reanudado.' : 'Torneo pausado.',
              () => api.adminPause(tournament.id, !tournament.paused_at))}
            disabled={busy !== null}>
            {tournament.paused_at ? 'Reanudar' : 'Pausar'}
          </Button>
          {detail.matches.filter(match => match.finish_reason === 'attendance_review').map(match => (
            <div key={match.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface2 p-3 text-sm">
              <span>Partida detenida por ausencia · cruce {match.match_number}</span>
              <Button variant="secondary" disabled={busy !== null}
                onClick={() => void competitionAction(`retry:${match.id}`,
                  'Los jugadores tienen otros cinco minutos para entrar.',
                  () => api.adminRetryMatch(match.id))}>Reabrir cruce</Button>
            </div>
          ))}
        </Panel>
      )}

      {tournament.mode === '1v1' && ['published', 'running'].includes(tournament.status) && (
        <Panel as="section" className="mb-5 p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Reemplazos y descalificaciones</h2>
          <p className="mt-1 text-sm text-muted">Un reemplazo conserva el lugar y los resultados previos del titular.</p>
          <div className="mt-4 space-y-3">
            {entries.filter(item => item.entry.status === 'active').map(item => (
              <div key={item.entry.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
                <span className="min-w-28 flex-1 font-semibold text-cream">
                  {profiles[item.members.find(m => m.status === 'accepted')?.user_id ?? '']?.username ?? 'Jugador'}
                </span>
                {entries.some(candidate => candidate.entry.status === 'waitlisted') && (
                  <>
                    <label className="sr-only" htmlFor={`replacement-${item.entry.id}`}>Reemplazo</label>
                    <select id={`replacement-${item.entry.id}`} value={replacement[item.entry.id] ?? ''}
                      onChange={event => setReplacement(current => ({ ...current, [item.entry.id]: event.target.value }))}
                      className="min-w-32 rounded-xl border border-line bg-surface2 px-2 py-2 text-cream">
                      <option value="">Elegir de espera</option>
                      {entries.filter(candidate => candidate.entry.status === 'waitlisted').map(candidate => (
                        <option key={candidate.entry.id} value={candidate.entry.id}>
                          {profiles[candidate.members.find(m => m.status === 'accepted')?.user_id ?? '']?.username ?? 'Jugador'}
                        </option>
                      ))}
                    </select>
                    <Button variant="secondary" disabled={busy !== null || !replacement[item.entry.id]}
                      onClick={() => void competitionAction(`replace:${item.entry.id}`,
                        'Jugador reemplazado.', () => api.adminReplace(tournament.id,
                          item.entry.id, replacement[item.entry.id]))}>Reemplazar</Button>
                  </>
                )}
                <Button variant="danger" disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm('¿Descalificar a este participante? No se reescriben partidas terminadas.')) {
                      void competitionAction(`dq:${item.entry.id}`, 'Jugador descalificado.',
                        () => api.adminDisqualify(tournament.id, item.entry.id))
                    }
                  }}>Descalificar</Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="mb-5"><Competition detail={detail} /></div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
        <Panel as="section" className="p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Plantel e inscripciones</h2>
          <p className="mt-1 text-sm text-muted">Parejas, solos, invitaciones, espera y presencia en una sola lista.</p>
          {entries.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface2 p-4 text-sm text-muted">Todavía no hay inscripciones.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {entries.map(item => (
                <AdminEntryRow
                  key={item.entry.id}
                  entry={item.entry}
                  members={item.members}
                  profiles={profiles}
                  checkedIn={detail.participants.some(participant => participant.entry_id === item.entry.id && participant.checked_in)}
                />
              ))}
            </div>
          )}
        </Panel>

        <aside className="space-y-5">
          {tournament.status === 'published' && (
            <Panel className="p-5">
              <h2 className="font-display text-lg font-extrabold text-cream">Reprogramar</h2>
              <p className="mb-3 mt-1 text-xs text-muted">Horario de Argentina. Si ya hubo check-ins, se pedirán de nuevo.</p>
              <Input
                label="Nueva fecha y hora"
                name="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={event => setStartsAt(event.target.value)}
              />
              <Button className="mt-3" variant="secondary" fullWidth onClick={() => void reschedule()} disabled={busy !== null}>
                {busy === 'reschedule' ? 'Reprogramando…' : 'Reprogramar torneo'}
              </Button>
            </Panel>
          )}

          {!['completed', 'cancelled'].includes(tournament.status) && (
            <Panel className="border-negative/35 p-5">
              <h2 className="font-display text-lg font-extrabold text-cream">Cancelar torneo</h2>
              <p className="mb-3 mt-1 text-xs text-muted">Esta acción cierra inscripciones y check-in. No borra el historial.</p>
              <Input
                label="Motivo (opcional)"
                name="reason"
                value={reason}
                onChange={event => setReason(event.target.value)}
                maxLength={500}
                placeholder="Se mostrará a los jugadores"
              />
              <Button className="mt-3" variant="danger" fullWidth onClick={() => void cancel()} disabled={busy !== null}>
                {busy === 'cancel' ? 'Cancelando…' : 'Cancelar torneo'}
              </Button>
            </Panel>
          )}

          <Panel className="p-5 text-sm">
            <h2 className="font-display text-lg font-extrabold text-cream">Configuración</h2>
            <dl className="mt-3 space-y-2 text-muted">
              <Info label="Cupo" value={`${tournament.capacity} jugadores`} />
              <Info label="Puntaje" value={`${tournament.target_score} puntos`} />
              <Info label="Premios" value={`${tournament.prize_first} / ${tournament.prize_second} / ${tournament.prize_third}`} />
              <Info label="Versión de agenda" value={String(tournament.schedule_version)} />
            </dl>
          </Panel>
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{message}</p>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-cream">{value}</p>
    </Panel>
  )
}

function AdminEntryRow({
  entry,
  members,
  profiles,
  checkedIn,
}: {
  entry: TournamentEntry
  members: TournamentAdminMember[]
  profiles: Record<string, ProfileSummary>
  checkedIn: boolean
}) {
  const accepted = members.filter(member => member.status === 'accepted')
  const pending = members.filter(member => member.status === 'pending')
  return (
    <article className="rounded-2xl border border-line bg-surface2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {accepted.map(member => {
            const profile = profiles[member.user_id]
            return (
              <span key={member.id} className="flex items-center gap-2">
                <Avatar url={profile?.avatar_url} name={profile?.username ?? 'Jugador'} size={34} />
                <span className="font-semibold text-cream">{profile?.username ?? member.user_id.slice(0, 8)}</span>
              </span>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-base px-2.5 py-1 text-muted">{entryStatusLabel(entry.status)}</span>
          {checkedIn && <span className="rounded-full bg-positive/15 px-2.5 py-1 text-positive">Check-in listo</span>}
          {entry.kind === 'solo' && <span className="rounded-full bg-info/15 px-2.5 py-1 text-info">Solo</span>}
        </div>
      </div>
      {pending.map(member => {
        const profile = profiles[member.user_id]
        return (
          <p key={member.id} className="mt-3 border-t border-line pt-3 text-sm text-info">
            Invitación pendiente para <b>{profile?.username ?? member.user_id.slice(0, 8)}</b>
          </p>
        )
      })}
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-semibold text-cream">{value}</dd>
    </div>
  )
}

function entryStatusLabel(status: TournamentEntry['status']): string {
  const labels: Record<TournamentEntry['status'], string> = {
    active: 'Activo',
    waitlisted: 'En espera',
    eliminated: 'Eliminado',
    disqualified: 'Descalificado',
    withdrawn: 'Retirado',
    replaced: 'Reemplazado',
  }
  return labels[status]
}
