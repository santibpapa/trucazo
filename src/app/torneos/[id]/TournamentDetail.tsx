'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, Avatar, Button, Input, Panel } from '@/components/ui'
import Competition from '@/components/tournaments/Competition'
import { createClient } from '@/lib/supabase/client'
import {
  escapeTournamentUsernamePattern,
  formatTournamentDate,
  isExactTournamentUsername,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_MODE_LABEL,
  tournamentCheckInState,
} from '@/lib/tournament-ui'
import {
  tournamentApi,
  type TournamentDetailData,
  type TournamentEntrySnapshot,
  type TournamentMember,
} from '@/lib/tournaments'

type BusyAction = 'register' | 'invite' | 'accept' | 'reject' | 'withdraw' | 'checkin' | null

export default function TournamentDetail({
  initialDetail,
  initialEntry,
  userId,
  isGuest,
  initialNow,
}: {
  initialDetail: TournamentDetailData
  initialEntry: TournamentEntrySnapshot | null
  userId: string
  isGuest: boolean
  initialNow: number
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [detail, setDetail] = useState(initialDetail)
  const [entry, setEntry] = useState(initialEntry)
  const [partnerName, setPartnerName] = useState('')
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(initialNow)
  const [enteringMatchId, setEnteringMatchId] = useState<string | null>(null)
  const [waitingMatchId, setWaitingMatchId] = useState<string | null>(null)

  const refresh = useCallback(async (quiet = true) => {
    if (document.visibilityState === 'hidden') return
    const [detailResult, entryResult] = await Promise.all([
      api.detail(initialDetail.tournament.id),
      api.myEntry(initialDetail.tournament.id),
    ])
    if (detailResult.data) setDetail(detailResult.data as TournamentDetailData)
    if (!entryResult.error) setEntry((entryResult.data as TournamentEntrySnapshot | null) ?? null)
    if (!quiet && detailResult.error) setError('No pudimos actualizar el torneo. Reintentá.')
  }, [api, initialDetail.tournament.id])

  useEffect(() => {
    const polling = window.setInterval(() => void refresh(), 8_000)
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(polling)
      window.clearInterval(clock)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const tournament = detail.tournament
  const myMember = entry?.members.find(member => member.user_id === userId)
  const pendingInvitation = myMember?.status === 'pending' ? myMember : null
  const checkInState = tournamentCheckInState(tournament, now)
  const registrationOpen = tournament.status === 'published' && now < new Date(tournament.starts_at).getTime()

  const runMutation = useCallback(async (
    action: Exclude<BusyAction, null>,
    successMessage: string,
    mutation: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ) => {
    setBusy(action)
    setError('')
    setMessage('')
    const result = await mutation()
    if (result.error) {
      setError(friendlyTournamentError(result.error.message))
      setBusy(null)
      return false
    }
    setMessage(successMessage)
    await refresh(false)
    setBusy(null)
    return true
  }, [refresh])

  const registerSolo = () => runMutation(
    'register',
    tournament.mode === '2v2'
      ? 'Quedaste anotado. Si no sumás compañero, el sistema te asignará uno al cerrar el plantel.'
      : 'Tu inscripción quedó confirmada.',
    () => api.registerSolo(crypto.randomUUID(), tournament.id),
  )

  const invitePartner = async () => {
    const username = partnerName.trim()
    if (!username) {
      setError('Escribí el nombre de usuario de tu compañero.')
      return
    }
    setBusy('invite')
    setError('')
    setMessage('')
    const profileResult = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', escapeTournamentUsernamePattern(username))
      .limit(1)
      .maybeSingle()
    if (
      profileResult.error
      || !profileResult.data
      || !isExactTournamentUsername(profileResult.data.username, username)
    ) {
      setError('No encontramos un jugador con ese nombre exacto.')
      setBusy(null)
      return
    }
    if (profileResult.data.id === userId) {
      setError('Elegí a otra persona como compañero.')
      setBusy(null)
      return
    }
    const result = await api.invitePartner(
      crypto.randomUUID(),
      tournament.id,
      profileResult.data.id,
    )
    if (result.error) {
      setError(friendlyTournamentError(result.error.message))
      setBusy(null)
      return
    }
    setPartnerName('')
    setMessage(`Invitación enviada a ${profileResult.data.username}.`)
    await refresh(false)
    setBusy(null)
  }

  const respondInvitation = (accept: boolean) => {
    if (!pendingInvitation?.id) return
    void runMutation(
      accept ? 'accept' : 'reject',
      accept ? 'Aceptaste la invitación. Ya forman pareja.' : 'Rechazaste la invitación.',
      () => api.respondInvitation(
        crypto.randomUUID(),
        tournament.id,
        pendingInvitation.id!,
        accept,
      ),
    )
  }

  const withdraw = () => {
    if (!window.confirm('¿Querés cancelar tu inscripción? Tu lugar puede pasar a la lista de espera.')) return
    void runMutation(
      'withdraw',
      'Cancelaste tu inscripción.',
      () => api.withdraw(crypto.randomUUID(), tournament.id),
    )
  }

  const checkIn = () => runMutation(
    'checkin',
    'Presencia confirmada. Ya estás listo para el torneo.',
    () => api.checkIn(crypto.randomUUID(), tournament.id),
  )

  const enterMatch = async (matchId: string) => {
    setEnteringMatchId(matchId)
    setError('')
    const result = await api.enterMatch(matchId)
    setEnteringMatchId(null)
    if (result.error) {
      setError(friendlyTournamentError(result.error.message))
      return
    }
    const gameId = (result.data as { game_id?: string | null } | null)?.game_id
    if (gameId) {
      router.push(`/game/${gameId}`)
    } else {
      setWaitingMatchId(matchId)
      setMessage('Ya entraste al cruce. Esperando al rival…')
      await refresh()
    }
  }

  useEffect(() => {
    if (!waitingMatchId) return
    const match = detail.matches.find(item => item.id === waitingMatchId)
    if (match?.status === 'playing' && match.game_id) router.push(`/game/${match.game_id}`)
    if (match && match.status !== 'ready' && match.status !== 'playing') setWaitingMatchId(null)
  }, [detail.matches, router, waitingMatchId])

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-5xl px-4 py-6 pb-20 sm:px-6">
      <Link href="/torneos" className="text-sm font-semibold text-muted hover:text-gold">
        ← Todos los torneos
      </Link>

      <section className="mt-4 rounded-3xl border border-gold/35 bg-gradient-to-br from-gold/15 via-surface to-surface p-5 shadow-lift sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              {TOURNAMENT_MODE_LABEL[tournament.mode]} · {TOURNAMENT_FORMAT_LABEL[tournament.format]}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-cream sm:text-4xl">
              {tournament.name}
            </h1>
            {tournament.description && <p className="mt-3 whitespace-pre-wrap text-sm text-muted sm:text-base">{tournament.description}</p>}
          </div>
          <div className="rounded-2xl border border-line bg-base/50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Comienza</p>
            <p className="mt-1 font-bold text-cream">{formatTournamentDate(tournament.starts_at)}</p>
            <p className="mt-1 text-sm font-semibold text-gold">{timeUntil(tournament.starts_at, now)}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-5">
          {error && <Alert>{error}</Alert>}
          {message && <Alert tone="info">{message}</Alert>}

          <ParticipationPanel
            mode={tournament.mode}
            status={tournament.status}
            isGuest={isGuest}
            registrationOpen={registrationOpen}
            entry={entry}
            myMember={myMember}
            pendingInvitation={pendingInvitation}
            checkInState={checkInState}
            partnerName={partnerName}
            busy={busy}
            onPartnerNameChange={setPartnerName}
            onRegister={() => void registerSolo()}
            onInvite={() => void invitePartner()}
            onAccept={() => respondInvitation(true)}
            onReject={() => respondInvitation(false)}
            onWithdraw={withdraw}
            onCheckIn={() => void checkIn()}
          />

          <Roster title="Participantes confirmados" empty="Todavía no hay inscriptos." entries={detail.participants} />
          <Roster title="Lista de espera" empty="No hay nadie esperando un lugar." entries={detail.waitlist} waitlist />
          <Competition
            detail={detail}
            myEntryId={entry?.entry.status === 'active' ? entry.entry.id : null}
            waitingMatchId={waitingMatchId}
            enteringMatchId={enteringMatchId}
            onEnter={matchId => void enterMatch(matchId)}
          />
        </div>

        <aside className="space-y-5">
          <Panel className="p-5">
            <h2 className="font-display text-lg font-extrabold text-cream">Reglas</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Rule label="Modalidad" value={TOURNAMENT_MODE_LABEL[tournament.mode]} />
              <Rule label="Formato" value={TOURNAMENT_FORMAT_LABEL[tournament.format]} />
              <Rule label="Cupo" value={`${detail.active_players} de ${tournament.capacity} jugadores`} />
              <Rule label="Partidas" value={`A ${tournament.target_score} puntos`} />
              <Rule label="Check-in" value="Desde 30 minutos antes" />
              <Rule label="Tercer puesto" value="Se juega siempre" />
            </dl>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-display text-lg font-extrabold text-cream">Premios por jugador</h2>
            <ol className="mt-4 space-y-2 text-sm">
              <Prize medal="🥇" label="Primer puesto" coins={tournament.prize_first} />
              <Prize medal="🥈" label="Segundo puesto" coins={tournament.prize_second} />
              <Prize medal="🥉" label="Tercer puesto" coins={tournament.prize_third} />
            </ol>
          </Panel>

          {tournament.status === 'cancelled' && (
            <Alert>
              Este torneo fue cancelado{tournament.cancellation_reason ? `: ${tournament.cancellation_reason}` : '.'}
            </Alert>
          )}
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{message}</p>
    </main>
  )
}

function ParticipationPanel({
  mode,
  status,
  isGuest,
  registrationOpen,
  entry,
  myMember,
  pendingInvitation,
  checkInState,
  partnerName,
  busy,
  onPartnerNameChange,
  onRegister,
  onInvite,
  onAccept,
  onReject,
  onWithdraw,
  onCheckIn,
}: {
  mode: '1v1' | '2v2'
  status: TournamentDetailData['tournament']['status']
  isGuest: boolean
  registrationOpen: boolean
  entry: TournamentEntrySnapshot | null
  myMember: TournamentMember | undefined
  pendingInvitation: TournamentMember | null
  checkInState: ReturnType<typeof tournamentCheckInState>
  partnerName: string
  busy: BusyAction
  onPartnerNameChange: (value: string) => void
  onRegister: () => void
  onInvite: () => void
  onAccept: () => void
  onReject: () => void
  onWithdraw: () => void
  onCheckIn: () => void
}) {
  if (isGuest) {
    return (
      <Panel className="border-gold/40 bg-gold/5 p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">¿Querés jugar?</h2>
        <p className="mt-1 text-sm text-muted">Creá una cuenta para inscribirte, recibir invitaciones y hacer check-in.</p>
        <Link href="/register" className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 font-bold text-ink hover:bg-gold-600">
          Crear mi cuenta
        </Link>
      </Panel>
    )
  }

  if (status === 'cancelled' || status === 'completed') return null

  if (pendingInvitation && entry) {
    const captain = entry.members.find(member => member.status === 'accepted')
    return (
      <Panel className="border-info/50 bg-info/10 p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">Invitación a jugar en pareja</h2>
        <p className="mt-1 text-sm text-muted">
          {captain?.username ?? 'Otro jugador'} quiere formar equipo con vos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="positive" onClick={onAccept} disabled={busy !== null}>
            {busy === 'accept' ? 'Aceptando…' : 'Aceptar invitación'}
          </Button>
          <Button variant="ghost" onClick={onReject} disabled={busy !== null}>
            {busy === 'reject' ? 'Rechazando…' : 'Rechazar'}
          </Button>
        </div>
      </Panel>
    )
  }

  if (entry && myMember?.status === 'accepted') {
    const pendingPartner = entry.members.find(member => member.status === 'pending')
    return (
      <Panel className="border-gold/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold text-cream">
              {entry.entry.status === 'waitlisted' ? 'Estás en lista de espera' : 'Ya estás inscripto'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {entry.entry.status === 'waitlisted'
                ? 'Si se libera un lugar, el sistema respeta el orden de inscripción.'
                : entry.entry.kind === 'team'
                  ? `Equipo: ${entry.members.filter(member => member.status === 'accepted').map(member => member.username).join(' + ')}`
                  : mode === '2v2'
                    ? 'Estás anotado solo. Podés invitar a un compañero o esperar la asignación.'
                    : 'Tu lugar está reservado.'}
            </p>
            {pendingPartner && <p className="mt-2 text-sm font-semibold text-info">Esperando respuesta de {pendingPartner.username}.</p>}
          </div>
          {entry.entry.status === 'active' && entry.checkin && (
            <span className="rounded-full bg-positive/15 px-3 py-1.5 text-sm font-bold text-positive">✓ Check-in listo</span>
          )}
        </div>

        {mode === '2v2' && entry.entry.kind === 'solo' && !pendingPartner && registrationOpen && (
          <div className="mt-4 border-t border-line pt-4">
            <Input
              label="Invitar compañero por nombre de usuario"
              name="partner"
              value={partnerName}
              onChange={event => onPartnerNameChange(event.target.value)}
              maxLength={32}
              autoComplete="off"
              placeholder="Nombre exacto"
            />
            <Button className="mt-2" variant="secondary" onClick={onInvite} disabled={busy !== null}>
              {busy === 'invite' ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {entry.entry.status === 'active' && checkInState === 'open' && !entry.checkin && (
            <Button variant="positive" onClick={onCheckIn} disabled={busy !== null}>
              {busy === 'checkin' ? 'Confirmando…' : 'Confirmar presencia'}
            </Button>
          )}
          {checkInState === 'not_open' && (
            <Button variant="danger" onClick={onWithdraw} disabled={busy !== null}>
              {busy === 'withdraw' ? 'Cancelando…' : 'Cancelar inscripción'}
            </Button>
          )}
          {checkInState === 'open' && entry.entry.status === 'waitlisted' && (
            <p className="text-sm text-muted">La espera sigue abierta hasta la hora de inicio.</p>
          )}
        </div>
      </Panel>
    )
  }

  if (!registrationOpen) {
    return (
      <Panel className="p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">Inscripción cerrada</h2>
        <p className="mt-1 text-sm text-muted">La hora de inicio ya llegó o el plantel fue cerrado.</p>
      </Panel>
    )
  }

  return (
    <Panel className="border-gold/40 p-5">
      <h2 className="font-display text-xl font-extrabold text-cream">Inscribite</h2>
      <p className="mt-1 text-sm text-muted">
        {mode === '1v1'
          ? 'Reservá tu lugar. Si el cupo está lleno, entrás automáticamente a la lista de espera.'
          : 'Podés anotarte solo para que el sistema te asigne compañero o invitar a alguien ahora.'}
      </p>
      <Button className="mt-4" onClick={onRegister} disabled={busy !== null}>
        {busy === 'register' ? 'Anotando…' : mode === '2v2' ? 'Anotarme solo' : 'Anotarme'}
      </Button>
      {mode === '2v2' && (
        <div className="mt-4 border-t border-line pt-4">
          <Input
            label="O invitá a tu compañero"
            name="partner"
            value={partnerName}
            onChange={event => onPartnerNameChange(event.target.value)}
            maxLength={32}
            autoComplete="off"
            placeholder="Nombre de usuario exacto"
          />
          <Button className="mt-2" variant="secondary" onClick={onInvite} disabled={busy !== null}>
            {busy === 'invite' ? 'Enviando…' : 'Invitar y anotarme'}
          </Button>
        </div>
      )}
    </Panel>
  )
}

function Roster({
  title,
  empty,
  entries,
  waitlist = false,
}: {
  title: string
  empty: string
  entries: TournamentDetailData['participants'] | TournamentDetailData['waitlist']
  waitlist?: boolean
}) {
  return (
    <Panel as="section" className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-cream">{title}</h2>
        <span className="text-sm font-semibold text-muted">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface2 p-4 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-line">
          {entries.map((item, index) => {
            const checkedIn = 'checked_in' in item && item.checked_in
            return (
              <li key={item.entry_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-subtle">{waitlist ? index + 1 : '•'}</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {item.members.map(member => (
                    <span key={member.user_id} className="flex min-w-0 items-center gap-2">
                      <Avatar url={member.avatar_url} name={member.username} size={34} />
                      <span className="truncate text-sm font-semibold text-cream">{member.username}</span>
                    </span>
                  ))}
                </div>
                {checkedIn && <span className="shrink-0 text-xs font-bold text-positive">Presente</span>}
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-cream">{value}</dd>
    </div>
  )
}

function Prize({ medal, label, coins }: { medal: string; label: string; coins: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface2 px-3 py-2.5">
      <span aria-hidden="true" className="text-xl">{medal}</span>
      <span className="flex-1 text-muted">{label}</span>
      <span className="font-bold text-gold">{coins.toLocaleString('es-AR')} monedas</span>
    </li>
  )
}

function timeUntil(iso: string, now: number): string {
  const difference = new Date(iso).getTime() - now
  if (difference <= 0) return 'Horario de inicio alcanzado'
  const minutes = Math.ceil(difference / 60_000)
  if (minutes < 60) return `Faltan ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Faltan ${hours} h ${minutes % 60} min`
  const days = Math.floor(hours / 24)
  return `Faltan ${days} ${days === 1 ? 'día' : 'días'}`
}

function friendlyTournamentError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('no puede participar')) return 'Esta cuenta no puede participar en torneos.'
  if (normalized.includes('invitacion pendiente')) return 'Primero tenés que responder tu invitación pendiente.'
  if (normalized.includes('ya esta inscripto o invitado')) return 'Ese jugador ya está inscripto o tiene una invitación pendiente.'
  if (normalized.includes('check-in no esta abierto')) return 'El check-in abre 30 minutos antes y cierra a la hora de inicio.'
  if (normalized.includes('inscripcion ya cerro')) return 'La inscripción ya cerró.'
  if (normalized.includes('check-in ya abrio')) return 'El check-in ya abrió. Desde ahora solo un administrador puede retirarte.'
  return message
    .replaceAll('companero', 'compañero')
    .replaceAll('inscripcion', 'inscripción')
    .replaceAll('invitacion', 'invitación')
    .replaceAll('accion', 'acción')
}
