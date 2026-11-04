'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Alert, buttonClass, CoinIcon, cn, Panel } from '@/components/ui'
import TournamentNotifications from '@/components/tournaments/TournamentNotifications'
import {
  CapacityBar,
  ChevronIcon,
  ClockIcon,
  DateTile,
  StepTrack,
  type Step,
} from '@/components/tournaments/TournamentParts'
import { createClient } from '@/lib/supabase/client'
import {
  formatTournamentTime,
  TOURNAMENT_MODE_LABEL,
  tournamentCheckInOpensAt,
  tournamentCheckInState,
  tournamentDateTile,
  tournamentTimeUntil,
} from '@/lib/tournament-ui'
import {
  tournamentApi,
  type Tournament,
  type TournamentEntrySnapshot,
  type TournamentListData,
  type TournamentMember,
  type TournamentMode,
} from '@/lib/tournaments'

type ModeFilter = 'all' | TournamentMode

/** Lo que la central necesita saber de mi inscripción en cada torneo. */
interface MyPlace {
  snapshot: TournamentEntrySnapshot
  member: TournamentMember
}

export default function TournamentsHub({
  initialData,
  isGuest,
  initialNow,
}: {
  initialData: TournamentListData
  isGuest: boolean
  /** Hora del servidor al armar la página, para que web y navegador muestren lo mismo. */
  initialNow?: number
}) {
  const supabase = useMemo(() => createClient(), [])
  const api = useMemo(() => tournamentApi(supabase), [supabase])
  const [data, setData] = useState(initialData)
  const [refreshError, setRefreshError] = useState('')
  const [places, setPlaces] = useState<Record<string, MyPlace>>({})
  const [filter, setFilter] = useState<ModeFilter>('all')
  const [now, setNow] = useState(() => initialNow ?? Date.now())

  // Mis inscripciones: una consulta por torneo vigente, todas a la vez.
  const loadPlaces = useCallback(async (list: TournamentListData) => {
    if (isGuest) return
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user.id
    if (!userId) return
    const targets = [...list.active, ...list.upcoming].slice(0, 12)
    const results = await Promise.all(targets.map(tournament => api.myEntry(tournament.id)))
    const next: Record<string, MyPlace> = {}
    targets.forEach((tournament, index) => {
      const snapshot = results[index].data as TournamentEntrySnapshot | null
      const member = snapshot?.members.find(item => item.user_id === userId)
      if (!snapshot || !member) return
      const invited = member.status === 'pending'
      const inside = member.status === 'accepted' && ['active', 'waitlisted'].includes(snapshot.entry.status)
      if (invited || inside) next[tournament.id] = { snapshot, member }
    })
    setPlaces(next)
  }, [api, isGuest, supabase])

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await api.list()
    if (result.error || !result.data) {
      setRefreshError('No pudimos actualizar la lista. Vamos a volver a intentar.')
      return
    }
    const list = result.data as TournamentListData
    setData(list)
    setRefreshError('')
    setNow(Date.now())
    void loadPlaces(list)
  }, [api, loadPlaces])

  useEffect(() => {
    void loadPlaces(initialData)
  }, [initialData, loadPlaces])

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 15_000)
    const clock = window.setInterval(() => setNow(Date.now()), 30_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.clearInterval(clock)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const byMode = (list: Tournament[]) => filter === 'all' ? list : list.filter(item => item.mode === filter)
  const active = byMode(data.active)
  const upcoming = byMode(data.upcoming)
  const past = byMode(data.past)
  const hasAny = data.upcoming.length + data.active.length + data.past.length > 0
  const hasFiltered = active.length + upcoming.length + past.length > 0

  // El torneo que más le importa a la persona: primero el que se está jugando.
  const mine = [...data.active, ...data.upcoming].find(tournament => places[tournament.id])

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-5 pb-20 sm:px-6">
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/lobby"
          aria-label="Volver al lobby"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-cream transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ChevronIcon size={22} direction="left" />
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream">Torneos</h1>
      </header>

      {isGuest && (
        <Panel className="mb-6 border-gold/40 bg-gold/5 p-4">
          <p className="font-bold text-cream">Podés mirar todos los torneos</p>
          <p className="mt-1 text-sm text-muted">
            Para inscribirte necesitás una cuenta real. Tu progreso de invitado no se pierde al registrarte.
          </p>
          <Link href="/register" className="mt-3 inline-block font-bold text-gold hover:underline">
            Crear mi cuenta →
          </Link>
        </Panel>
      )}

      {refreshError && <Alert className="mb-5">{refreshError}</Alert>}

      {mine && <MyTournament tournament={mine} place={places[mine.id]} now={now} />}

      {!isGuest && <TournamentNotifications />}

      {!hasAny ? (
        <Panel className="p-8 text-center">
          <h2 className="font-display text-xl font-extrabold text-cream">Todavía no hay torneos publicados</h2>
          <p className="mt-1 text-sm text-muted">Cuando aparezca el próximo, lo vas a encontrar acá.</p>
        </Panel>
      ) : (
        <div className="space-y-7">
          <div role="group" aria-label="Filtrar por modalidad" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            {([
              ['all', 'Todos'],
              ['1v1', 'Mano a mano'],
              ['2v2', 'Parejas'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'h-10 flex-1 rounded-[10px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                  filter === value
                    ? 'bg-gold-soft text-cream shadow-gold-ring'
                    : 'text-muted hover:text-cream',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {!hasFiltered && (
            <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-muted">
              No hay torneos de esta modalidad por ahora.
            </p>
          )}

          {active.length > 0 && (
            <section aria-labelledby="torneos-en-juego">
              <h2 id="torneos-en-juego" className="mb-3 flex items-center gap-2.5 font-display text-lg font-extrabold text-cream">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-negative ring-4 ring-negative/20" />
                Se está jugando
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map(tournament => (
                  <Link
                    key={tournament.id}
                    href={`/torneos/${tournament.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-cream group-hover:text-gold">{tournament.name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {TOURNAMENT_MODE_LABEL[tournament.mode]} · {tournament.capacity} {tournament.mode === '2v2' ? 'jugadores' : 'lugares'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-extrabold text-gold">
                      {places[tournament.id] ? 'Ver' : 'Mirar'}<ChevronIcon />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-labelledby="torneos-proximos">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="torneos-proximos" className="font-display text-lg font-extrabold text-cream">Para anotarse</h2>
                <span className="text-[13px] text-muted">
                  {upcoming.length} {upcoming.length === 1 ? 'torneo' : 'torneos'}
                </span>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {upcoming.map(tournament => (
                  <UpcomingCard
                    key={tournament.id}
                    tournament={tournament}
                    registered={!!places[tournament.id]}
                    isGuest={isGuest}
                    now={now}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="torneos-terminados">
              <h2 id="torneos-terminados" className="mb-3 font-display text-lg font-extrabold text-cream">Terminados</h2>
              <Panel className="divide-y divide-line overflow-hidden">
                {past.map(tournament => {
                  const tile = tournamentDateTile(tournament.starts_at, now)
                  return (
                    <Link
                      key={tournament.id}
                      href={`/torneos/${tournament.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-cream">{tournament.name}</p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {tournament.status === 'cancelled' ? 'Cancelado' : 'Terminado'} · {tile.day} {tile.month} · {TOURNAMENT_MODE_LABEL[tournament.mode]}
                        </p>
                      </div>
                      <span className="text-muted"><ChevronIcon size={18} /></span>
                    </Link>
                  )
                })}
              </Panel>
            </section>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {refreshError || 'La lista de torneos está actualizada.'}
      </p>
    </main>
  )
}

/** Tarjeta de arriba: mi torneo, en qué paso estoy y qué tengo que hacer ahora. */
function MyTournament({ tournament, place, now }: { tournament: Tournament; place: MyPlace; now: number }) {
  const { snapshot, member } = place
  const checkIn = tournamentCheckInState(tournament, now)
  const opensAt = formatTournamentTime(tournamentCheckInOpensAt(tournament.starts_at))
  const startsAt = formatTournamentTime(tournament.starts_at)
  const tile = tournamentDateTile(tournament.starts_at, now)
  const href = `/torneos/${tournament.id}`
  const running = tournament.status === 'running' || new Date(tournament.starts_at).getTime() <= now
  const waitlisted = snapshot.entry.status === 'waitlisted'
  const invited = member.status === 'pending'
  const confirmed = !!snapshot.checkin

  let label = 'Tu próximo torneo'
  let message: string
  let action: { text: string; tone: 'primary' | 'positive' | 'ghost' } = { text: 'Ver torneo', tone: 'ghost' }

  if (invited) {
    const captain = snapshot.members.find(item => item.status === 'accepted')
    label = 'Te invitaron'
    message = `${captain?.username ?? 'Otro jugador'} quiere jugar en pareja con vos.`
    action = { text: 'Responder', tone: 'primary' }
  } else if (running) {
    label = 'Tu torneo se está jugando'
    message = 'Entrá para ver tu próxima partida.'
    action = { text: 'Ir al torneo', tone: 'primary' }
  } else if (waitlisted) {
    label = 'Estás en lista de espera'
    message = 'Si se libera un lugar, entrás por orden de inscripción.'
  } else if (confirmed) {
    message = `Estás confirmado. Arranca a las ${startsAt}.`
  } else if (checkIn === 'open') {
    message = `Ya podés confirmar. Tenés hasta las ${startsAt}.`
    action = { text: 'Estoy listo', tone: 'positive' }
  } else {
    message = `A las ${opensAt} te avisamos para que confirmes.`
  }

  const steps: Step[] = [
    { label: 'Anotado', detail: waitlisted ? 'En espera' : 'Listo', state: invited ? 'now' : 'done' },
    {
      label: 'Estoy listo',
      detail: confirmed ? 'Confirmado' : `${opensAt} a ${startsAt}`,
      state: confirmed || running ? 'done' : checkIn === 'open' && !waitlisted ? 'now' : 'todo',
    },
    { label: 'A jugar', detail: startsAt, state: running ? 'now' : 'todo' },
  ]

  return (
    <section
      aria-label="Tu torneo"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-gold/50 bg-gradient-to-br from-gold-soft via-surface to-surface p-[18px] shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gold">{label}</p>
        {!running && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-2.5 text-xs font-semibold text-gold-600">
            <ClockIcon size={13} />{tournamentTimeUntil(tournament.starts_at, now)}
          </span>
        )}
      </div>
      <div>
        <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-cream">{tournament.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {tile.relative ?? `${tile.weekday.charAt(0)}${tile.weekday.slice(1).toLowerCase()} ${tile.day} ${tile.month}`} · {startsAt} hs · {TOURNAMENT_MODE_LABEL[tournament.mode]} a {tournament.target_score}
        </p>
      </div>
      {!invited && !running && <StepTrack steps={steps} />}
      <div className="flex items-center gap-3 border-t border-gold/20 pt-3.5">
        <p className="flex-1 text-[13px] leading-snug text-cream/90">{message}</p>
        <Link
          href={href}
          className={cn(
            buttonClass(action.tone === 'ghost' ? 'ghost' : action.tone, 'sm'),
            'min-h-11 shrink-0',
          )}
        >
          {action.text}
        </Link>
      </div>
    </section>
  )
}

/** Tarjeta de un torneo para anotarse: cuándo, cuánto paga y cuántos lugares quedan. */
function UpcomingCard({
  tournament,
  registered,
  isGuest,
  now,
}: {
  tournament: Tournament
  registered: boolean
  isGuest: boolean
  now: number
}) {
  const tile = tournamentDateTile(tournament.starts_at, now)
  const occupied = tournament.active_players ?? 0
  const full = occupied >= tournament.capacity
  const href = `/torneos/${tournament.id}`
  const cta = registered ? 'Ver mi inscripción' : isGuest ? 'Ver torneo' : full ? 'Anotarme en la espera' : 'Anotarme'

  return (
    <Panel as="article" className="flex flex-col gap-3.5 p-4">
      <div className="flex gap-3.5">
        <DateTile tile={tile} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[17px] font-extrabold leading-tight text-cream">
              <Link href={href} className="hover:text-gold focus-visible:outline-none focus-visible:underline">
                {tournament.name}
              </Link>
            </h3>
            {registered && (
              <span className="rounded-full bg-positive/15 px-2 py-0.5 text-[11px] font-extrabold text-positive">Anotado</span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {tile.relative ? `${tile.relative} · ` : ''}{tile.time} hs · {TOURNAMENT_MODE_LABEL[tournament.mode]} · A {tournament.target_score}
          </p>
          {tournament.prize_first > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-cream/90">
              <CoinIcon size={17} />
              <b className="font-display text-[15px] text-gold">{tournament.prize_first.toLocaleString('es-AR')}</b>
              {tournament.mode === '2v2' ? 'a cada campeón' : 'al campeón'}
            </p>
          )}
        </div>
      </div>
      <CapacityBar
        occupied={occupied}
        capacity={tournament.capacity}
        noun={tournament.mode === '2v2' ? 'jugadores' : 'anotados'}
      />
      {full && !registered && (
        <p className="-mt-1 text-[13px] text-muted">Si alguien no confirma, entra el primero de la espera.</p>
      )}
      <Link
        href={href}
        className={buttonClass(registered || full || isGuest ? 'ghost' : 'primary', 'md', true)}
      >
        {cta}
      </Link>
    </Panel>
  )
}
