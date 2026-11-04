'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, CoinIcon, cn, Panel } from '@/components/ui'
import { StepTrack, type Step } from '@/components/tournaments/TournamentParts'
import { TOURNAMENT_PHASE_LABEL } from '@/lib/tournament-ui'
import type { TournamentDetailData } from '@/lib/tournaments'

type Match = TournamentDetailData['matches'][number]
type Person = { username: string; avatar_url: string | null }

const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'] as const
const SHORT_LABEL: Record<(typeof KNOCKOUT_PHASES)[number], string> = {
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarterfinal: 'Cuartos',
  semifinal: 'Semis',
  final: 'Final',
}

/**
 * Llave del torneo: podio al terminar, tu camino, tablas de grupos y el cuadro
 * de eliminación con líneas entre cruces. En el teléfono se ve de a dos rondas.
 */
export default function Competition({
  detail: source,
  myEntryId = null,
  canSpectate = true,
  liveScores,
}: {
  detail: TournamentDetailData
  myEntryId?: string | null
  canSpectate?: boolean
  /** Puntos de los cruces en juego, por id de cruce (etapa 2). */
  liveScores?: Record<string, { score_a: number; score_b: number }>
}) {
  // Mientras se juega, el cruce todavía no tiene resultado: se muestran los puntos de la mesa.
  const detail = liveScores
    ? {
        ...source,
        matches: source.matches.map(match => {
          const live = match.status === 'playing' ? liveScores[match.id] : undefined
          return live ? { ...match, score_a: live.score_a, score_b: live.score_b } : match
        }),
      }
    : source
  const people = new Map<string, Person>(detail.competition_entries.map(item => [item.entry_id, item]))
  const rounds = KNOCKOUT_PHASES
    .map(phase => ({
      phase,
      matches: detail.matches
        .filter(match => match.phase === phase)
        .sort((a, b) => a.match_number - b.match_number),
    }))
    .filter(round => round.matches.length > 0)
  const third = detail.matches.find(match => match.phase === 'third_place')
  const groupMatches = detail.matches.filter(match => match.phase === 'group')
  const isMine = (match: Match) => !!myEntryId
    && (match.side_a_entry_id === myEntryId || match.side_b_entry_id === myEntryId)

  const lastMine = rounds.reduce((found, round, index) => round.matches.some(isMine) ? index : found, -1)
  const inPlay = rounds.findIndex(round => round.matches.some(match => !['finished', 'forfeit', 'cancelled'].includes(match.status)))
  const maxView = Math.max(0, rounds.length - 2)
  // Arranca en tu última ronda; si no jugás, en la que se está jugando; si terminó, en la final.
  const [view, setView] = useState(() => Math.min(maxView, lastMine >= 0 ? lastMine : inPlay >= 0 ? inPlay : maxView))
  const shownView = Math.min(view, maxView)
  const finalVisibleOnPhone = rounds.length <= 2 || shownView === maxView

  if (!detail.matches.length) return null

  const card = (match: Match) => (
    <MatchCard
      key={match.id}
      match={match}
      people={people}
      myEntryId={myEntryId}
      canSpectate={canSpectate}
      tournamentId={detail.tournament.id}
    />
  )

  return (
    <div className="space-y-4">
      {detail.tournament.status === 'completed' && <Podium detail={detail} people={people} />}

      {myEntryId && rounds.some(round => round.matches.some(isMine)) && (
        <Panel as="section" aria-label="Tu camino" className="p-3.5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gold">Tu camino</p>
          <StepTrack steps={myPath(rounds, third, myEntryId)} />
        </Panel>
      )}

      {detail.groups.length > 0 && (
        <Groups detail={detail} people={people} myEntryId={myEntryId} />
      )}

      {rounds.length > 0 && (
        <Panel as="section" aria-labelledby="llave-titulo" className="p-3.5 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="llave-titulo" className="font-display text-lg font-extrabold text-cream">Llave</h2>
            <span className="hidden text-xs text-muted lg:inline">Tocá un cruce en juego para mirarlo</span>
          </div>

          {rounds.length > 2 && (
            <div role="group" aria-label="Elegir ronda" className="mb-4 flex gap-1.5 lg:hidden">
              {rounds.slice(0, -1).map((round, index) => (
                <button
                  key={round.phase}
                  type="button"
                  aria-pressed={shownView === index}
                  onClick={() => setView(index)}
                  className={cn(
                    'h-10 flex-1 rounded-xl border px-1 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                    shownView === index ? 'border-gold bg-gold text-ink' : 'border-line bg-surface2 text-muted hover:text-cream',
                  )}
                >
                  {index === maxView ? `${SHORT_LABEL[round.phase]} y final` : SHORT_LABEL[round.phase]}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto pt-2">
            <div className="flex gap-[18px] lg:min-w-max lg:gap-10">
              {rounds.map((round, index) => {
                const visible = rounds.length <= 2 || index === shownView || index === shownView + 1
                const connects = index < rounds.length - 1
                const connectsOnPhone = connects && (rounds.length <= 2 || index === shownView)
                const pairs: Match[][] = []
                for (let i = 0; i < round.matches.length; i += 2) pairs.push(round.matches.slice(i, i + 2))
                return (
                  <div
                    key={round.phase}
                    className={cn('min-w-0 flex-1 flex-col lg:w-48 lg:flex-none', visible ? 'flex' : 'hidden lg:flex')}
                  >
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
                      {TOURNAMENT_PHASE_LABEL[round.phase]}
                    </p>
                    <div className="flex flex-1 flex-col justify-around gap-3">
                      {pairs.map(pair => (
                        <div key={pair[0].id} className="relative flex flex-col gap-2">
                          {pair.map(card)}
                          {connects && pair.length === 2 && (
                            <>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'absolute bottom-[26px] right-[-9px] top-[26px] w-[9px] rounded-r-lg border-[1.5px] border-l-0 border-[#5A3A3E] lg:right-[-20px] lg:w-5',
                                  connectsOnPhone ? 'block' : 'hidden lg:block',
                                )}
                              />
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'absolute right-[-18px] top-1/2 w-[9px] border-t-[1.5px] border-[#5A3A3E] lg:right-[-40px] lg:w-5',
                                  connectsOnPhone ? 'block' : 'hidden lg:block',
                                )}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {third && (
            <div className={cn('mt-6 max-w-xs', finalVisibleOnPhone ? 'block' : 'hidden lg:block')}>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">Por el 3.er puesto</p>
              {card(third)}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3 text-xs text-cream/90">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-6 rounded-[5px] border-[1.5px] border-gold" />Tus partidas</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-negative" />Se está jugando</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-6 rounded-[5px] border-[1.5px] border-dashed border-[#5A3A3E]" />Todavía no se juega</span>
          </div>
        </Panel>
      )}

      {groupMatches.length > 0 && (
        <Panel as="section" aria-labelledby="partidas-grupos" className="p-4 sm:p-5">
          <h2 id="partidas-grupos" className="mb-3 font-display text-lg font-extrabold text-cream">Partidas de grupos</h2>
          <div className="space-y-4">
            {Array.from(new Set(groupMatches.map(match => match.round_number))).sort((a, b) => a - b).map(round => (
              <div key={round}>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">Fecha {round}</p>
                <div className="grid gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groupMatches.filter(match => match.round_number === round).map(card)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

function MatchCard({
  match,
  people,
  myEntryId,
  canSpectate,
  tournamentId,
}: {
  match: Match
  people: Map<string, Person>
  myEntryId: string | null
  canSpectate: boolean
  tournamentId: string
}) {
  const mine = !!myEntryId
    && (match.side_a_entry_id === myEntryId || match.side_b_entry_id === myEntryId)
  const sides = [
    { id: match.side_a_entry_id, name: match.side_a_username, score: match.score_a },
    { id: match.side_b_entry_id, name: match.side_b_username, score: match.score_b },
  ]
  const tag = match.status === 'playing' ? { text: 'EN JUEGO', live: true }
    : match.status === 'ready' ? { text: 'ENTRANDO', live: false }
      : match.finish_reason === 'absence' ? { text: 'AUSENCIA', live: false }
        : match.finish_reason === 'bye' ? { text: 'PASE DIRECTO', live: false }
          : match.finish_reason === 'attendance_review' ? { text: 'EN REVISIÓN', live: false }
            : match.finish_reason === 'both_disqualified' ? { text: 'VACANTE', live: false }
              : null
  const waiting = match.status === 'pending'
  const gameHref = match.team_game_id ? `/game/parejas/${match.team_game_id}` : match.game_id ? `/game/${match.game_id}` : null
  const href = match.status === 'playing'
    ? mine ? gameHref : canSpectate ? `/torneos/${tournamentId}/partidas/${match.id}` : null
    : null
  const nameOf = (side: (typeof sides)[number]) => side.id ? side.name ?? people.get(side.id)?.username ?? 'Jugador' : null

  const body = (
    <>
      {tag && (
        <span
          className={cn(
            'absolute -top-2 right-2 z-[2] flex h-4 items-center gap-1 rounded-full border px-1.5 text-[10px] font-extrabold tracking-wide',
            tag.live ? 'border-negative bg-[#3A1712] text-[#F2A08E]' : 'border-line bg-surface2 text-cream/90',
          )}
        >
          {tag.live && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-negative" />}
          {tag.text}
        </span>
      )}
      {sides.map((side, index) => {
        const name = nameOf(side)
        const won = !!side.id && match.winner_entry_id === side.id
        const live = match.status === 'playing'
        const person = side.id ? people.get(side.id) : undefined
        return (
          <div
            key={index}
            className={cn(
              'flex h-[22px] items-center gap-1.5 px-2 text-[12.5px] font-semibold',
              won ? 'text-cream' : live ? 'text-cream/90' : 'text-muted',
            )}
          >
            {name ? (
              <Avatar url={person?.avatar_url} name={name} size={18} />
            ) : (
              <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-dashed border-[#5A3A3E]" />
            )}
            <span className={cn('min-w-0 flex-1 truncate', won && 'font-bold')}>
              {name ?? (match.finish_reason === 'bye' ? 'Libre' : 'Por definirse')}
            </span>
            {!!myEntryId && side.id === myEntryId && (
              <em className="shrink-0 rounded-[5px] bg-gold px-1 py-0.5 text-[9px] font-extrabold not-italic tracking-wide text-ink">VOS</em>
            )}
            <b className={cn('font-extrabold tabular', won ? 'text-gold' : live ? 'text-cream' : 'text-muted')}>
              {side.score ?? '–'}
            </b>
          </div>
        )
      })}
    </>
  )

  const className = cn(
    'relative block w-full rounded-xl border bg-surface py-[3px] text-left',
    mine ? 'border-gold ring-[3px] ring-gold/15' : waiting ? 'border-dashed border-line bg-transparent' : 'border-line',
    href && 'transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
  )

  if (href) {
    const a = nameOf(sides[0]) ?? 'Por definirse'
    const b = nameOf(sides[1]) ?? 'Por definirse'
    const rival = match.side_a_entry_id === myEntryId ? b : a
    return (
      <Link href={href} className={className} aria-label={mine ? `Volver a tu partida contra ${rival}` : `Mirar ${a} contra ${b}`}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}

const CLOSED: Match['status'][] = ['finished', 'forfeit', 'cancelled']

/** Un paso por ronda: cómo te fue en cada una y en cuál estás ahora. */
function myPath(
  rounds: Array<{ phase: (typeof KNOCKOUT_PHASES)[number]; matches: Match[] }>,
  third: Match | undefined,
  myEntryId: string,
): Step[] {
  const mine = (match: Match) => match.side_a_entry_id === myEntryId || match.side_b_entry_id === myEntryId
  const path = rounds.map(round => ({ label: SHORT_LABEL[round.phase], match: round.matches.find(mine) }))
  // Si te toca el tercer puesto, ese partido reemplaza a la final en tu camino.
  if (third && mine(third) && path.length) path[path.length - 1] = { label: '3.er puesto', match: third }

  return path.map(({ label, match }): Step => {
    if (!match) return { label, detail: '—', state: 'todo' }
    const sideA = match.side_a_entry_id === myEntryId
    const my = sideA ? match.score_a : match.score_b
    const their = sideA ? match.score_b : match.score_a
    const score = my !== null && their !== null ? ` ${my}-${their}` : ''
    if (match.finish_reason === 'bye') return { label, detail: 'Pase directo', state: 'done' }
    if (match.status === 'cancelled') return { label, detail: 'Cancelado', state: 'todo' }
    if (CLOSED.includes(match.status)) {
      const absence = match.finish_reason === 'absence'
      return match.winner_entry_id === myEntryId
        ? { label, detail: absence ? 'Por ausencia' : `Ganaste${score}`, state: 'done' }
        : { label, detail: absence ? 'Ausente' : `Perdiste${score}`, state: 'todo' }
    }
    if (match.status === 'playing') return { label, detail: score ? `Vas${score}` : 'En juego', state: 'now' }
    if (match.status === 'ready') return { label, detail: 'Entrá ya', state: 'now' }
    return { label, detail: 'Próxima', state: 'todo' }
  })
}

function Podium({ detail, people }: { detail: TournamentDetailData; people: Map<string, Person> }) {
  const final = detail.matches.find(match => match.phase === 'final')
  const third = detail.matches.find(match => match.phase === 'third_place')
  if (!final?.winner_entry_id) return null
  const runnerUp = final.winner_entry_id === final.side_a_entry_id ? final.side_b_entry_id : final.side_a_entry_id
  const { prize_first: first, prize_second: second, prize_third: thirdPrize, mode } = detail.tournament
  const places = [
    { place: 2 as const, id: runnerUp, coins: second, avatar: 60, block: 'h-[76px] from-[#3D3532]', ring: 'ring-[#C9C2BC]', color: 'text-[#C9C2BC]' },
    { place: 1 as const, id: final.winner_entry_id, coins: first, avatar: 84, block: 'h-[108px] from-[#5A4422]', ring: 'ring-gold', color: 'text-gold-600' },
    { place: 3 as const, id: third?.winner_entry_id ?? null, coins: thirdPrize, avatar: 60, block: 'h-[56px] from-[#4A3022]', ring: 'ring-[#C98A5B]', color: 'text-[#E0A77D]' },
  ]

  return (
    <Panel as="section" aria-labelledby="podio-titulo" className="overflow-hidden px-4 pt-5">
      <h2 id="podio-titulo" className="text-center text-[11px] font-bold uppercase tracking-widest text-gold">
        Posiciones finales{mode === '2v2' ? ' · premios por jugador' : ''}
      </h2>
      <ol className="mt-4 flex items-end gap-2">
        {places.map(item => {
          const person = item.id ? people.get(item.id) : undefined
          const name = person?.username ?? (item.place === 3 ? 'Vacante' : 'Jugador')
          return (
            <li key={item.place} className={cn('flex flex-1 flex-col items-center', item.place === 1 ? 'order-2' : item.place === 2 ? 'order-1' : 'order-3')}>
              <span className="sr-only">Puesto {item.place}: </span>
              <span className={cn('rounded-full ring-[3px]', item.ring)}>
                <Avatar url={person?.avatar_url} name={name} size={item.avatar} />
              </span>
              <span className={cn('mt-2 max-w-full truncate font-extrabold text-cream', item.place === 1 ? 'text-base' : 'text-sm')}>{name}</span>
              {item.id && (
                <span className="mt-0.5 flex items-center gap-1 text-[13px] font-extrabold text-gold">
                  <CoinIcon size={14} />{item.coins.toLocaleString('es-AR')}
                </span>
              )}
              <span
                aria-hidden="true"
                className={cn('mt-2.5 flex w-full justify-center rounded-t-xl bg-gradient-to-b to-surface pt-2 font-display text-2xl font-black', item.block, item.color)}
              >
                {item.place}
              </span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

function Groups({
  detail,
  people,
  myEntryId,
}: {
  detail: TournamentDetailData
  people: Map<string, Person>
  myEntryId: string | null
}) {
  const hasMe = (groupId: string) => detail.group_members.some(member => member.group_id === groupId && member.entry_id === myEntryId)
  const groups = [...detail.groups].sort((a, b) => Number(hasMe(b.id)) - Number(hasMe(a.id)) || a.group_number - b.group_number)
  const noun = detail.tournament.mode === '2v2' ? 'Pareja' : 'Jugador'

  return (
    <section aria-labelledby="grupos-titulo" className="space-y-3">
      <h2 id="grupos-titulo" className="sr-only">Tablas de grupos</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(group => {
          const members = detail.group_members
            .filter(member => member.group_id === group.id)
            .sort((a, b) => a.rank - b.rank)
          const mine = hasMe(group.id)
          return (
            <Panel key={group.id} className={cn('p-3.5 pb-2.5', mine && 'border-gold/30')}>
              <h3 className="mb-2.5 font-display text-base font-extrabold text-cream">
                Grupo {group.group_number}
                {mine && <span className="text-[13px] font-semibold text-muted"> · tu grupo</span>}
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                    <th scope="col" className="pb-2 text-left font-extrabold">{noun}</th>
                    <th scope="col" className="w-9 pb-2 font-extrabold"><abbr title="Ganados" className="no-underline">G</abbr></th>
                    <th scope="col" className="w-9 pb-2 font-extrabold"><abbr title="Perdidos" className="no-underline">P</abbr></th>
                    <th scope="col" className="w-12 pb-2 font-extrabold"><abbr title="Diferencia de puntos" className="no-underline">+/-</abbr></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => {
                    const person = people.get(member.entry_id)
                    const me = member.entry_id === myEntryId
                    const difference = member.points_for - member.points_against
                    return [
                      <tr key={member.entry_id} className={cn('text-center tabular text-cream/90', me && 'bg-gold/10')}>
                        <th scope="row" className={cn('py-1.5 text-left font-bold text-cream', me && 'rounded-l-[10px]')}>
                          <span className="flex items-center gap-2.5">
                            <span className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-xs font-extrabold', member.rank <= 2 ? 'bg-positive text-ink' : 'bg-surface2 text-muted')}>
                              {member.rank}
                            </span>
                            <Avatar url={person?.avatar_url} name={person?.username ?? noun} size={28} />
                            <span className="min-w-0 truncate">{person?.username ?? noun}</span>
                            {me && <em className="shrink-0 rounded-[5px] bg-gold px-1 py-0.5 text-[9px] font-extrabold not-italic text-ink">VOS</em>}
                          </span>
                        </th>
                        <td className="py-1.5">{member.wins}</td>
                        <td className="py-1.5">{member.losses}</td>
                        <td className={cn('py-1.5 font-extrabold', difference > 0 ? 'text-positive' : difference < 0 ? 'text-negative' : 'text-muted', me && 'rounded-r-[10px]')}>
                          {difference > 0 ? `+${difference}` : difference}
                        </td>
                      </tr>,
                      member.rank === 2 && members.length > 2 ? (
                        <tr key={`${member.entry_id}-corte`} aria-hidden="true">
                          <td colSpan={4} className="py-0.5">
                            <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-positive before:flex-1 before:border-t-[1.5px] before:border-dashed before:border-positive/50 before:content-[''] after:flex-1 after:border-t-[1.5px] after:border-dashed after:border-positive/50 after:content-['']">
                              Pasan a la llave
                            </span>
                          </td>
                        </tr>
                      ) : null,
                    ]
                  })}
                </tbody>
              </table>
            </Panel>
          )
        })}
      </div>
      <p className="text-center text-xs leading-snug text-muted">
        Pasan los dos primeros. Si hay empate en ganados, cuenta el partido entre ellos, después la diferencia de puntos y, por último, un sorteo.
      </p>
    </section>
  )
}
