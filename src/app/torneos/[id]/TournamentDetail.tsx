'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, Avatar, Button, buttonClass, cn, Input, Panel } from '@/components/ui'
import CheckInNotice, { type RegisterChoice } from '@/components/tournaments/CheckInNotice'
import Competition from '@/components/tournaments/Competition'
import {
  CalendarIcon,
  CapacityBar,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  PartnerSuggestions,
  PlaceMedal,
  StepTrack,
  TrophyIcon,
  type Step,
} from '@/components/tournaments/TournamentParts'
import { createClient } from '@/lib/supabase/client'
import {
  escapeTournamentUsernamePattern,
  formatCountdown,
  formatTournamentTime,
  isExactTournamentUsername,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_MODE_LABEL,
  TOURNAMENT_PHASE_LABEL,
  tournamentCalendarUrl,
  tournamentCheckInOpensAt,
  tournamentCheckInState,
  tournamentDateTile,
  tournamentTimeUntil,
} from '@/lib/tournament-ui'
import {
  tournamentApi,
  type TournamentDetailData,
  type TournamentEntrySnapshot,
  type TournamentLiveScore,
  type TournamentMember,
  type TournamentRecentPartner,
} from '@/lib/tournaments'

type BusyAction = 'register' | 'invite' | 'accept' | 'reject' | 'withdraw' | 'checkin' | null
type Tab = 'resumen' | 'llave' | 'jugadores'
type Match = TournamentDetailData['matches'][number]
type LiveScores = Record<string, { score_a: number; score_b: number }>

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
  // Inscripción esperando que la persona lea y acepte el aviso del check-in.
  const [notice, setNotice] = useState<'register' | 'accept' | null>(null)
  const [tab, setTab] = useState<Tab>(initialDetail.matches.length ? 'llave' : 'resumen')
  const [liveScores, setLiveScores] = useState<LiveScores>({})
  const [partners, setPartners] = useState<TournamentRecentPartner[] | null>(null)
  // El marcador en vivo sólo se pide mientras el torneo se está jugando.
  const running = useRef(initialDetail.tournament.status === 'running')
  running.current = detail.tournament.status === 'running'

  const loadLiveScores = useCallback(async () => {
    if (isGuest) return
    const result = await api.liveScores(initialDetail.tournament.id)
    // Sin la migración de la etapa 2 la llamada falla: la llave sigue sin puntos en vivo.
    if (result.error || !Array.isArray(result.data)) return
    setLiveScores(Object.fromEntries((result.data as TournamentLiveScore[])
      .map(item => [item.match_id, { score_a: item.score_a, score_b: item.score_b }])))
  }, [api, initialDetail.tournament.id, isGuest])

  const refresh = useCallback(async (quiet = true) => {
    if (document.visibilityState === 'hidden') return
    const [detailResult, entryResult] = await Promise.all([
      api.detail(initialDetail.tournament.id),
      api.myEntry(initialDetail.tournament.id),
      running.current ? loadLiveScores() : Promise.resolve(),
    ])
    if (detailResult.data) setDetail(detailResult.data as TournamentDetailData)
    if (!entryResult.error) setEntry((entryResult.data as TournamentEntrySnapshot | null) ?? null)
    if (!quiet && detailResult.error) setError('No pudimos actualizar el torneo. Reintentá.')
  }, [api, initialDetail.tournament.id, loadLiveScores])

  useEffect(() => {
    if (running.current) void loadLiveScores()
  }, [loadLiveScores])

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
  const myEntryId = entry?.entry.status === 'active' ? entry.entry.id : null
  const myMatches = myEntryId
    ? detail.matches.filter(match => match.side_a_entry_id === myEntryId || match.side_b_entry_id === myEntryId)
    : []
  const callMatch = myMatches.find(match => match.status === 'ready')
    ?? myMatches.find(match => match.status === 'playing' && (match.game_id || match.team_game_id))
  const confirming = !!entry && myMember?.status === 'accepted' && entry.entry.status === 'active'
    && checkInState === 'open' && !entry.checkin

  // Las cuentas regresivas cortas (confirmar, entrar a la partida) se ven segundo a segundo.
  const needsSeconds = confirming || callMatch?.status === 'ready'
  useEffect(() => {
    if (!needsSeconds) return
    const ticker = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(ticker)
  }, [needsSeconds])

  // Compañeros recientes para parejas: se piden una vez, cuando hay que elegir con quién jugar.
  const wantsPartners = !isGuest && tournament.mode === '2v2' && registrationOpen
    && (notice === 'register' || (entry?.entry.kind === 'solo' && myMember?.status === 'accepted'))
  useEffect(() => {
    if (!wantsPartners || partners !== null) return
    void api.recentPartners().then(result => {
      setPartners(!result.error && Array.isArray(result.data) ? result.data as TournamentRecentPartner[] : [])
    })
  }, [api, partners, wantsPartners])

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
    const entryResult = result.data as { game_id?: string | null; team_game_id?: string | null } | null
    const gameId = entryResult?.team_game_id ?? entryResult?.game_id
    if (gameId) {
      router.push(entryResult?.team_game_id ? `/game/parejas/${gameId}` : `/game/${gameId}`)
    } else {
      setWaitingMatchId(matchId)
      setMessage('Ya entraste al cruce. Esperando a los demás jugadores…')
      await refresh()
    }
  }

  useEffect(() => {
    if (!waitingMatchId) return
    const match = detail.matches.find(item => item.id === waitingMatchId)
    if (match?.status === 'playing' && (match.game_id || match.team_game_id)) {
      router.push(match.team_game_id
        ? `/game/parejas/${match.team_game_id}` : `/game/${match.game_id}`)
    }
    if (match && match.status !== 'ready' && match.status !== 'playing') setWaitingMatchId(null)
  }, [detail.matches, router, waitingMatchId])

  const showRegisterBar = !isGuest && registrationOpen && !entry
    && tournament.status !== 'cancelled' && tournament.status !== 'completed'
  const startsAtTime = formatTournamentTime(tournament.starts_at)
  const faces = detail.participants.flatMap(item => item.members).slice(0, 4)

  return (
    <main className={cn('mx-auto min-h-[100dvh] w-full max-w-5xl px-4 pt-5 sm:px-6', showRegisterBar ? 'pb-4' : 'pb-20')}>
      <div className="flex items-center gap-3">
        <Link
          href="/torneos"
          aria-label="Volver a todos los torneos"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-cream transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ChevronIcon size={22} direction="left" />
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gold">
          {TOURNAMENT_MODE_LABEL[tournament.mode]} · A {tournament.target_score} puntos
        </p>
      </div>

      <header className="mt-4 space-y-3">
        <h1 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-cream sm:text-4xl">
          {tournament.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 text-[13px] font-semibold text-cream/90">
            <span className="text-gold"><ClockIcon size={14} /></span>{shortDate(tournament.starts_at, now)}
          </span>
          {tournament.status === 'published' && (
            <span className="inline-flex h-[30px] items-center rounded-full border border-line bg-surface2 px-3 text-[13px] font-semibold text-gold-600">
              {tournamentTimeUntil(tournament.starts_at, now)}
            </span>
          )}
          {tournament.status === 'running' && (
            <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-negative bg-negative/15 px-3 text-[13px] font-semibold text-negative">
              <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-negative" />Se está jugando
            </span>
          )}
          {tournament.status === 'completed' && (
            <span className="inline-flex h-[30px] items-center rounded-full border border-line bg-surface2 px-3 text-[13px] font-semibold text-cream/90">Terminado</span>
          )}
        </div>
        {tournament.status === 'published' && (
          <div className="flex items-center gap-3">
            {faces.length > 0 && (
              <div className="flex shrink-0" aria-hidden="true">
                {faces.map((member, index) => (
                  <span key={member.user_id} className={cn('rounded-full ring-2 ring-base', index > 0 && '-ml-2.5')}>
                    <Avatar url={member.avatar_url} name={member.username} size={30} />
                  </span>
                ))}
              </div>
            )}
            <CapacityBar
              className="flex-1"
              occupied={detail.active_players}
              capacity={tournament.capacity}
              noun={tournament.mode === '2v2' ? 'jugadores' : 'anotados'}
            />
          </div>
        )}
      </header>

      <div className="mt-5 space-y-4">
        {tournament.paused_at && <Alert>Torneo pausado. Las partidas abiertas continúan; la próxima ronda espera a que se reanude.</Alert>}
        {tournament.status === 'cancelled' && (
          <Alert>
            Este torneo fue cancelado{tournament.cancellation_reason ? `: ${tournament.cancellation_reason}` : '.'}
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}
        {message && <Alert tone="info">{message}</Alert>}

        <StatusPanel
          tournament={tournament}
          detail={detail}
          isGuest={isGuest}
          now={now}
          registrationOpen={registrationOpen}
          entry={entry}
          myMember={myMember}
          pendingInvitation={pendingInvitation}
          checkInState={checkInState}
          callMatch={callMatch}
          myEntryId={myEntryId}
          partnerName={partnerName}
          recentPartners={partners ?? []}
          liveScores={liveScores}
          busy={busy}
          enteringMatchId={enteringMatchId}
          waitingMatchId={waitingMatchId}
          onPartnerNameChange={setPartnerName}
          onInvite={() => void invitePartner()}
          onAccept={() => setNotice('accept')}
          onReject={() => respondInvitation(false)}
          onWithdraw={withdraw}
          onCheckIn={() => void checkIn()}
          onEnter={matchId => void enterMatch(matchId)}
          onShowBracket={() => setTab('llave')}
        />

        <nav aria-label="Secciones del torneo" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {([
            ['resumen', 'Resumen'],
            ['llave', detail.groups.length > 0 ? 'Grupos y llave' : 'Llave'],
            ['jugadores', 'Jugadores'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                tab === value ? 'bg-gold-soft text-cream shadow-gold-ring' : 'text-muted hover:text-cream',
              )}
            >
              {label}
              {value === 'jugadores' && (
                <span className="rounded-full bg-surface2 px-1.5 py-0.5 text-[11px] font-extrabold text-cream/90">
                  {detail.participants.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'resumen' && <Summary detail={detail} />}

        {tab === 'llave' && (
          detail.matches.length ? (
            <Competition detail={detail} canSpectate={!isGuest} myEntryId={myEntryId} liveScores={liveScores} />
          ) : (
            <Panel className="p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold"><TrophyIcon size={24} /></span>
              <h2 className="mt-3 font-display text-lg font-extrabold text-cream">La llave se arma cuando arranca</h2>
              <p className="mt-1 text-sm text-muted">
                {tournament.status === 'cancelled'
                  ? 'Este torneo no llegó a jugarse.'
                  : `A las ${startsAtTime} se sortean los cruces al azar entre quienes confirmaron.`}
              </p>
            </Panel>
          )
        )}

        {tab === 'jugadores' && (
          <div className="space-y-4">
            <Roster title="Anotados" empty="Todavía no hay inscriptos." entries={detail.participants} />
            <Roster title="Lista de espera" empty="No hay nadie esperando un lugar." entries={detail.waitlist} waitlist />
          </div>
        )}
      </div>

      {showRegisterBar && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 bg-gradient-to-b from-base/0 via-base to-base px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 sm:-mx-6 sm:px-6">
          <div className="mx-auto max-w-md space-y-1.5">
            <Button size="lg" fullWidth onClick={() => setNotice('register')} disabled={busy !== null}>
              {busy === 'register' || busy === 'invite' ? 'Anotando…' : 'Anotarme'}
            </Button>
            <p className="text-center text-xs text-muted">Gratis · No se apuestan monedas</p>
          </div>
        </div>
      )}

      <CheckInNotice
        open={notice !== null}
        mode={tournament.mode}
        startsAt={tournament.starts_at}
        tournamentName={tournament.name}
        intent={notice === 'accept' ? 'accept' : 'register'}
        checkInOpen={checkInState === 'open'}
        partnerName={partnerName}
        onPartnerNameChange={setPartnerName}
        recentPartners={partners ?? []}
        busy={busy !== null}
        onClose={() => setNotice(null)}
        onConfirm={(choice: RegisterChoice) => {
          const action = notice
          setNotice(null)
          if (action === 'accept') respondInvitation(true)
          else if (choice === 'invite') void invitePartner()
          else void registerSolo()
        }}
      />

      <p className="sr-only" role="status" aria-live="polite">{message}</p>
    </main>
  )
}

/** La tarjeta de arriba: qué te toca hacer ahora en este torneo. */
function StatusPanel({
  tournament,
  detail,
  isGuest,
  now,
  registrationOpen,
  entry,
  myMember,
  pendingInvitation,
  checkInState,
  callMatch,
  myEntryId,
  partnerName,
  recentPartners,
  liveScores,
  busy,
  enteringMatchId,
  waitingMatchId,
  onPartnerNameChange,
  onInvite,
  onAccept,
  onReject,
  onWithdraw,
  onCheckIn,
  onEnter,
  onShowBracket,
}: {
  tournament: TournamentDetailData['tournament']
  detail: TournamentDetailData
  isGuest: boolean
  now: number
  registrationOpen: boolean
  entry: TournamentEntrySnapshot | null
  myMember: TournamentMember | undefined
  pendingInvitation: TournamentMember | null
  checkInState: ReturnType<typeof tournamentCheckInState>
  callMatch: Match | undefined
  myEntryId: string | null
  partnerName: string
  recentPartners: TournamentRecentPartner[]
  liveScores: LiveScores
  busy: BusyAction
  enteringMatchId: string | null
  waitingMatchId: string | null
  onPartnerNameChange: (value: string) => void
  onInvite: () => void
  onAccept: () => void
  onReject: () => void
  onWithdraw: () => void
  onCheckIn: () => void
  onEnter: (matchId: string) => void
  onShowBracket: () => void
}) {
  const { mode, status } = tournament
  const startsAt = formatTournamentTime(tournament.starts_at)
  const opensAt = formatTournamentTime(tournamentCheckInOpensAt(tournament.starts_at))

  if (isGuest) {
    return (
      <Panel className="border-gold/40 bg-gold/5 p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">¿Querés jugar?</h2>
        <p className="mt-1 text-sm text-muted">Creá una cuenta para inscribirte, recibir invitaciones y confirmar tu lugar.</p>
        <Link href="/register" className={cn(buttonClass('primary', 'md'), 'mt-4')}>
          Crear mi cuenta
        </Link>
      </Panel>
    )
  }

  if (status === 'cancelled' || status === 'completed') return null

  if (callMatch && myEntryId) {
    return (
      <MatchCall
        detail={detail}
        match={callMatch}
        myEntryId={myEntryId}
        now={now}
        live={liveScores[callMatch.id]}
        entering={enteringMatchId === callMatch.id}
        waiting={waitingMatchId === callMatch.id}
        disabled={!!enteringMatchId}
        onEnter={() => onEnter(callMatch.id)}
      />
    )
  }

  if (pendingInvitation && entry) {
    const captain = entry.members.find(member => member.status === 'accepted')
    return (
      <Panel className="border-info/50 bg-info/10 p-5">
        <div className="flex items-center gap-3">
          {captain && <Avatar url={captain.avatar_url} name={captain.username} size={48} />}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-info">Te invitaron</p>
            <h2 className="mt-0.5 font-display text-lg font-extrabold leading-tight text-cream">
              {captain?.username ?? 'Otro jugador'} quiere jugar en pareja con vos
            </h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={onReject} disabled={busy !== null}>
            {busy === 'reject' ? 'Rechazando…' : 'No, gracias'}
          </Button>
          <Button variant="positive" onClick={onAccept} disabled={busy !== null}>
            {busy === 'accept' ? 'Aceptando…' : 'Aceptar'}
          </Button>
        </div>
      </Panel>
    )
  }

  if (entry && myMember?.status === 'accepted'
      && ['eliminated', 'disqualified', 'replaced'].includes(entry.entry.status)) {
    return (
      <Panel className="p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">
          {entry.entry.status === 'eliminated' ? 'Terminó tu participación'
            : entry.entry.status === 'disqualified' ? 'Fuiste descalificado' : 'Tu lugar fue reemplazado'}
        </h2>
        <p className="mt-1 text-sm text-muted">Podés seguir los resultados en la llave.</p>
        <button type="button" onClick={onShowBracket} className="mt-3 text-sm font-bold text-gold hover:underline">
          Ver la llave →
        </button>
      </Panel>
    )
  }

  if (entry && myMember?.status === 'accepted') {
    const pendingPartner = entry.members.find(member => member.status === 'pending')
    const waitlisted = entry.entry.status === 'waitlisted'
    const confirmed = !!entry.checkin
    const running = status === 'running'

    if (!waitlisted && checkInState === 'open' && !confirmed) {
      return <ConfirmPanel detail={detail} now={now} busy={busy} onCheckIn={onCheckIn} />
    }

    if (running && !waitlisted) {
      return (
        <Panel className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gold">Estás jugando</p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-cream">Esperando tu próxima partida</h2>
          <p className="mt-1 text-sm text-muted">Cuando esté lista aparece acá y te avisamos en el lobby. Tenés 5 minutos para entrar.</p>
          <button type="button" onClick={onShowBracket} className="mt-3 text-sm font-bold text-gold hover:underline">
            Ver cómo viene la llave →
          </button>
        </Panel>
      )
    }

    const steps: Step[] = [
      { label: 'Anotado', detail: waitlisted ? 'En espera' : 'Listo', state: 'done' },
      {
        label: 'Estoy listo',
        detail: confirmed ? 'Confirmado' : `${opensAt} a ${startsAt}`,
        state: confirmed ? 'done' : 'todo',
      },
      { label: 'A jugar', detail: startsAt, state: 'todo' },
    ]
    const teammates = entry.members.filter(member => member.status === 'accepted').map(member => member.username)

    return (
      <Panel className={cn('p-5', confirmed ? 'border-positive/50' : 'border-gold/40')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={cn('text-[11px] font-bold uppercase tracking-widest', confirmed ? 'text-positive' : 'text-gold')}>
              {waitlisted ? 'Lista de espera' : confirmed ? 'Estás confirmado' : 'Ya estás adentro'}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold leading-tight text-cream">
              {waitlisted
                ? 'Si se libera un lugar, entrás vos'
                : confirmed
                  ? `Arranca a las ${startsAt}`
                  : `Volvé a las ${opensAt} y tocá «Estoy listo»`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {waitlisted
                ? 'Se respeta el orden de inscripción. La espera sigue abierta hasta la hora de inicio.'
                : confirmed
                  ? 'Tu primer rival se sortea a esa hora. Mientras, podés jugar otras partidas: te avisamos.'
                  : entry.entry.kind === 'team'
                    ? `Equipo: ${teammates.join(' + ')}. Alcanza con que confirme uno de los dos.`
                    : mode === '2v2'
                      ? 'Estás anotado solo. Podés invitar a un compañero o esperar que te toque uno.'
                      : 'Te avisamos por correo y en el juego cuando sea la hora.'}
            </p>
            {pendingPartner && <p className="mt-2 text-sm font-semibold text-info">Esperando respuesta de {pendingPartner.username}.</p>}
          </div>
        </div>

        <StepTrack steps={steps} className="mt-5" />

        {mode === '2v2' && entry.entry.kind === 'solo' && !pendingPartner && registrationOpen && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <PartnerSuggestions partners={recentPartners} selectedName={partnerName} onPick={onPartnerNameChange} />
            <Input
              label="Invitar compañero por nombre de usuario"
              name="partner"
              value={partnerName}
              onChange={event => onPartnerNameChange(event.target.value)}
              maxLength={32}
              autoComplete="off"
              placeholder="Escribilo tal cual"
            />
            <Button variant="secondary" onClick={onInvite} disabled={busy !== null || !partnerName.trim()}>
              {busy === 'invite' ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </div>
        )}

        {checkInState === 'not_open' && !waitlisted && (
          <a
            href={tournamentCalendarUrl(tournament)}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonClass('ghost', 'md', true), 'mt-5')}
          >
            <CalendarIcon />Agregar a mi calendario
          </a>
        )}

        {checkInState === 'not_open' && (
          <div className="mt-4 border-t border-line pt-3 text-center">
            <button
              type="button"
              onClick={onWithdraw}
              disabled={busy !== null}
              className="min-h-11 px-3 text-[13px] font-semibold text-muted underline-offset-2 hover:text-negative hover:underline disabled:opacity-50"
            >
              {busy === 'withdraw' ? 'Cancelando…' : `Cancelar mi inscripción (podés hasta las ${opensAt})`}
            </button>
          </div>
        )}
      </Panel>
    )
  }

  if (!registrationOpen) {
    return (
      <Panel className="p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">Inscripción cerrada</h2>
        <p className="mt-1 text-sm text-muted">
          {status === 'running' ? 'El torneo ya arrancó. Podés seguirlo en la llave.' : 'La hora de inicio ya llegó o el plantel fue cerrado.'}
        </p>
      </Panel>
    )
  }

  return null
}

/** «¿Estás para jugar?»: cuenta regresiva hasta el inicio y el botón grande. */
function ConfirmPanel({
  detail,
  now,
  busy,
  onCheckIn,
}: {
  detail: TournamentDetailData
  now: number
  busy: BusyAction
  onCheckIn: () => void
}) {
  const left = new Date(detail.tournament.starts_at).getTime() - now
  const fraction = Math.max(0, Math.min(1, left / (30 * 60 * 1000)))
  const circumference = 2 * Math.PI * 70
  const confirmed = detail.participants.filter(item => item.checked_in).length
  const faces = detail.participants.slice(0, 16)

  return (
    <Panel className="border-positive/50 p-5 text-center">
      <p className="mx-auto inline-flex h-[30px] items-center gap-2 rounded-full border border-positive/45 bg-positive/15 px-3 text-[13px] font-bold text-positive">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-positive" />Ya podés confirmar
      </p>
      <h2 className="mt-3 font-display text-[26px] font-extrabold leading-tight tracking-tight text-cream">¿Estás para jugar?</h2>

      <div className="relative mx-auto mt-4 h-[164px] w-[164px]" role="timer" aria-label={`Quedan ${formatCountdown(left)} para confirmar`}>
        <svg width="164" height="164" viewBox="0 0 164 164" aria-hidden="true" className="-rotate-90">
          <circle cx="82" cy="82" r="70" fill="none" stroke="currentColor" strokeWidth="11" className="text-surface2" />
          <circle
            cx="82"
            cy="82"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            className="text-positive"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <b className="font-display text-[40px] font-extrabold leading-none tracking-tight text-cream tabular">{formatCountdown(left)}</b>
          <span className="mt-1.5 text-xs text-muted">para confirmar</span>
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-xs text-sm leading-snug text-cream/90">
        Tocá el botón para guardar tu lugar. El torneo arranca a las {formatTournamentTime(detail.tournament.starts_at)}.
      </p>

      <Button variant="positive" size="lg" fullWidth className="mt-4 min-h-[60px] text-xl font-extrabold" onClick={onCheckIn} disabled={busy !== null}>
        {busy === 'checkin' ? 'Confirmando…' : <><CheckIcon size={22} />¡Estoy listo!</>}
      </Button>

      <div className="mt-5 rounded-xl bg-surface2 p-4 text-left">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-extrabold text-cream">Ya confirmaron</h3>
          <b className="text-sm text-positive">{confirmed} de {detail.participants.length}</b>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
          {faces.map(item => (
            <span key={item.entry_id} className={cn('relative', !item.checked_in && 'opacity-30 grayscale')}>
              <Avatar url={item.members[0]?.avatar_url} name={item.members[0]?.username ?? '?'} size={34} />
              {item.checked_in && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface2 bg-positive" />}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-snug text-muted">Si alguien no confirma a tiempo, su lugar pasa al primero de la lista de espera.</p>
      </div>
    </Panel>
  )
}

/** «¡Te toca!»: tu partida está lista, contra quién y cuánto tiempo queda para entrar. */
function MatchCall({
  detail,
  match,
  myEntryId,
  now,
  live,
  entering,
  waiting,
  disabled,
  onEnter,
}: {
  detail: TournamentDetailData
  match: Match
  myEntryId: string
  now: number
  live?: { score_a: number; score_b: number }
  entering: boolean
  waiting: boolean
  disabled: boolean
  onEnter: () => void
}) {
  const people = new Map(detail.competition_entries.map(item => [item.entry_id, item]))
  const rivalId = match.side_a_entry_id === myEntryId ? match.side_b_entry_id : match.side_a_entry_id
  const rival = rivalId ? people.get(rivalId) : undefined
  const me = people.get(myEntryId)
  const rivalName = (match.side_a_entry_id === myEntryId ? match.side_b_username : match.side_a_username) ?? rival?.username ?? 'Tu rival'
  const group = match.group_id ? detail.groups.find(item => item.id === match.group_id) : undefined
  const phase = group ? `Grupo ${group.group_number} · fecha ${match.round_number}` : TOURNAMENT_PHASE_LABEL[match.phase]
  const playing = match.status === 'playing'
  const deadline = match.entry_deadline ? new Date(match.entry_deadline).getTime() : null
  const left = deadline ? deadline - now : null
  const total = 5 * 60 * 1000
  const gameHref = match.team_game_id ? `/game/parejas/${match.team_game_id}` : match.game_id ? `/game/${match.game_id}` : null

  return (
    <section
      aria-label="Tu partida está lista"
      className="rounded-2xl border border-gold/60 bg-gradient-to-b from-gold-soft to-surface p-5 text-center shadow-lift"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-gold">{phase}</p>
      <h2 className="mt-1.5 font-display text-4xl font-extrabold leading-none tracking-tight text-cream">
        {playing ? 'Estás jugando' : '¡Te toca!'}
      </h2>

      <div className="mt-5 flex items-start justify-center gap-2">
        <div className="flex w-32 flex-col items-center gap-1.5">
          <span className="rounded-full ring-[3px] ring-gold"><Avatar url={me?.avatar_url} name={me?.username ?? 'Vos'} size={76} /></span>
          <b className="text-[15px] text-cream">Vos</b>
        </div>
        <span className="mt-7 text-base font-black tracking-widest text-muted">VS</span>
        <div className="flex w-32 flex-col items-center gap-1.5">
          <span className="rounded-full ring-[3px] ring-line"><Avatar url={rival?.avatar_url} name={rivalName} size={76} /></span>
          <b className="max-w-full truncate text-[15px] text-cream">{rivalName}</b>
        </div>
      </div>

      {playing && live && (
        <p className="mt-4 text-sm text-cream/90">
          Van <b className="mx-1 font-display text-[26px] font-extrabold text-gold tabular">
            {match.side_a_entry_id === myEntryId ? live.score_a : live.score_b} a {match.side_a_entry_id === myEntryId ? live.score_b : live.score_a}
          </b>
        </p>
      )}

      {!playing && left !== null && (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-cream/90" role="timer">
            Tenés <b className="mx-1 font-display text-[26px] font-extrabold text-gold tabular">{formatCountdown(left)}</b> para entrar
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5">
        {playing && gameHref ? (
          <Link href={gameHref} className={buttonClass('primary', 'lg', true)}>Volver a la mesa</Link>
        ) : (
          <Button size="lg" fullWidth onClick={onEnter} disabled={disabled || waiting}>
            {entering ? 'Entrando…' : waiting ? 'Esperando a tu rival…' : 'Entrar a la mesa'}
          </Button>
        )}
        {!playing && <p className="mt-2.5 text-[13px] text-muted">Si no entrás a tiempo, perdés este cruce.</p>}
      </div>
    </section>
  )
}

/** Pestaña Resumen: premios, cómo funciona y reglas, en pocas palabras. */
function Summary({ detail }: { detail: TournamentDetailData }) {
  const { tournament } = detail
  const startsAt = formatTournamentTime(tournament.starts_at)
  const opensAt = formatTournamentTime(tournamentCheckInOpensAt(tournament.starts_at))
  const hasPrizes = tournament.prize_first + tournament.prize_second + tournament.prize_third > 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {tournament.description && (
        <Panel className="p-5 lg:col-span-2">
          <p className="whitespace-pre-wrap text-sm text-cream/90 sm:text-base">{tournament.description}</p>
        </Panel>
      )}

      {hasPrizes && (
        <Panel as="section" className="p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-[17px] font-extrabold text-cream">Premios</h2>
            <span className="text-xs text-muted">{tournament.mode === '2v2' ? 'monedas por jugador' : 'en monedas'}</span>
          </div>
          <div className="flex items-end gap-2.5">
            <PodiumStep place={2} coins={tournament.prize_second} height="h-[70px]" label="2.° puesto" />
            <PodiumStep place={1} coins={tournament.prize_first} height="h-[90px]" label="Campeón" />
            <PodiumStep place={3} coins={tournament.prize_third} height="h-[62px]" label="3.° puesto" />
          </div>
        </Panel>
      )}

      <Panel as="section" className="p-4 sm:p-5">
        <h2 className="mb-4 font-display text-[17px] font-extrabold text-cream">Cómo funciona</h2>
        <ol className="space-y-4">
          <HowStep icon="plus" title="Anotate" text={`Podés cancelar hasta las ${opensAt} del día del torneo.`} />
          <HowStep
            icon="check"
            title="Tocá «Estoy listo»"
            text={`De ${opensAt} a ${startsAt}.${tournament.mode === '2v2' ? ' Alcanza con uno de la pareja.' : ''} Si no, tu lugar pasa a otro.`}
          />
          <HowStep
            icon="trophy"
            title="Jugá y avanzá"
            text={tournament.format === 'groups'
              ? 'Primero grupos de 4: pasan los dos primeros. Después, llave. Tenés 5 minutos para entrar a cada partida.'
              : 'Si ganás, pasás de ronda. Tenés 5 minutos para entrar a cada partida.'}
            last
          />
        </ol>
      </Panel>

      <Panel as="section" className="p-4 sm:p-5 lg:col-span-2">
        <h2 className="mb-3 font-display text-[17px] font-extrabold text-cream">Reglas</h2>
        <ul className="flex flex-wrap gap-2 text-[13px] font-semibold text-cream/90">
          <li className="rounded-full border border-line bg-surface2 px-3 py-1.5">{TOURNAMENT_FORMAT_LABEL[tournament.format]}</li>
          <li className="rounded-full border border-line bg-surface2 px-3 py-1.5">Partidas a {tournament.target_score} puntos</li>
          <li className="rounded-full border border-line bg-surface2 px-3 py-1.5">{tournament.capacity} jugadores</li>
          <li className="rounded-full border border-line bg-surface2 px-3 py-1.5">El tercer puesto se juega siempre</li>
          <li className="rounded-full border border-line bg-surface2 px-3 py-1.5">Sin flor · Sin apuestas</li>
        </ul>
      </Panel>
    </div>
  )
}

function PodiumStep({ place, coins, height, label }: { place: 1 | 2 | 3; coins: number; height: string; label: string }) {
  const first = place === 1
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <PlaceMedal place={place} size={first ? 40 : 34} />
      <div
        className={cn(
          'flex w-full flex-col items-center gap-0.5 rounded-b-[4px] rounded-t-xl border pt-2.5',
          height,
          first ? 'border-gold/50 bg-gold-soft' : 'border-line bg-surface2',
        )}
      >
        <b className={cn('font-display font-extrabold text-gold tabular', first ? 'text-lg' : 'text-base')}>
          {coins.toLocaleString('es-AR')}
        </b>
        <span className={cn('text-[11px]', first ? 'text-gold-600' : 'text-muted')}>{label}</span>
      </div>
    </div>
  )
}

function HowStep({ icon, title, text, last = false }: { icon: 'plus' | 'check' | 'trophy'; title: string; text: string; last?: boolean }) {
  return (
    <li className="relative flex gap-3.5">
      {!last && <span aria-hidden="true" className="absolute bottom-[-14px] left-[17px] top-[40px] w-0.5 rounded-full bg-line" />}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/35 bg-gold-soft text-gold">
        {icon === 'trophy' ? <TrophyIcon /> : icon === 'check' ? <CheckIcon size={17} /> : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        )}
      </span>
      <div>
        <b className="block text-[15px] font-bold text-cream">{title}</b>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{text}</p>
      </div>
    </li>
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
        <h2 className="font-display text-lg font-extrabold text-cream">{title}</h2>
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
                {checkedIn && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-positive">
                    <CheckIcon size={13} />Listo
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

/** "Sáb 8 nov · 18:00 hs", o "Hoy · 18:00 hs". */
function shortDate(iso: string, now: number): string {
  const tile = tournamentDateTile(iso, now)
  const day = tile.relative ?? `${tile.weekday.charAt(0)}${tile.weekday.slice(1).toLowerCase()} ${tile.day} ${tile.month}`
  return `${day} · ${tile.time} hs`
}

function friendlyTournamentError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('no puede participar')) return 'Esta cuenta no puede participar en torneos.'
  if (normalized.includes('invitacion pendiente')) return 'Primero tenés que responder tu invitación pendiente.'
  if (normalized.includes('ya esta inscripto o invitado')) return 'Ese jugador ya está inscripto o tiene una invitación pendiente.'
  if (normalized.includes('check-in no esta abierto')) return 'La confirmación abre 30 minutos antes y cierra a la hora de inicio.'
  if (normalized.includes('inscripcion ya cerro')) return 'La inscripción ya cerró.'
  if (normalized.includes('check-in ya abrio')) return 'La confirmación ya abrió. Desde ahora solo un administrador puede retirarte.'
  return message
    .replaceAll('companero', 'compañero')
    .replaceAll('inscripcion', 'inscripción')
    .replaceAll('invitacion', 'invitación')
    .replaceAll('accion', 'acción')
}
