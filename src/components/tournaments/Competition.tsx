import Link from 'next/link'
import { Panel } from '@/components/ui'
import type { TournamentDetailData } from '@/lib/tournaments'

type Match = TournamentDetailData['matches'][number]

const PHASE_LABEL: Record<Match['phase'], string> = {
  group: 'Grupos',
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinales',
  third_place: 'Tercer puesto',
  final: 'Final',
}

export default function Competition({
  detail,
  myEntryId,
  waitingMatchId,
  enteringMatchId,
  onEnter,
}: {
  detail: TournamentDetailData
  myEntryId?: string | null
  waitingMatchId?: string | null
  enteringMatchId?: string | null
  onEnter?: (matchId: string) => void
}) {
  if (!detail.matches.length) return null
  const names = new Map(detail.competition_entries.map(entry => [entry.entry_id, entry.username]))
  const name = (entryId: string | null) => entryId ? names.get(entryId) ?? 'Jugador' : 'Libre'
  const final = detail.matches.find(match => match.phase === 'final')
  const third = detail.matches.find(match => match.phase === 'third_place')
  const runnerUp = final?.winner_entry_id === final?.side_a_entry_id
    ? final?.side_b_entry_id : final?.side_a_entry_id

  return (
    <div className="space-y-5">
      {detail.tournament.status === 'completed' && final?.winner_entry_id && third && (
        <Panel as="section" className="border-gold/40 p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Posiciones finales</h2>
          <ol className="mt-3 space-y-2 text-sm text-cream">
            <li>🥇 {name(final.winner_entry_id)}</li>
            <li>🥈 {name(runnerUp ?? null)}</li>
            <li>🥉 {third.winner_entry_id ? name(third.winner_entry_id) : 'Vacante'}</li>
          </ol>
        </Panel>
      )}
      {detail.groups.length > 0 && (
        <Panel as="section" className="p-5">
          <h2 className="font-display text-xl font-extrabold text-cream">Tabla de grupos</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {detail.groups.map(group => {
              const members = detail.group_members.filter(member => member.group_id === group.id)
              return (
                <div key={group.id} className="overflow-hidden rounded-2xl border border-line bg-surface2">
                  <h3 className="border-b border-line px-4 py-3 font-bold text-gold">Grupo {group.group_number}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[19rem] text-left text-sm">
                      <thead className="text-xs text-muted"><tr>
                        <th className="px-4 py-2" scope="col">{detail.tournament.mode === '2v2' ? 'Pareja' : 'Jugador'}</th>
                        <th className="px-2 py-2" scope="col">G</th>
                        <th className="px-2 py-2" scope="col">P</th>
                        <th className="px-4 py-2 text-right" scope="col">Dif.</th>
                      </tr></thead>
                      <tbody>
                        {members.map(member => (
                          <tr key={member.entry_id} className="border-t border-line/60 text-cream">
                            <th scope="row" className={`px-4 py-2 font-semibold ${group.status === 'completed' && member.rank <= 2 ? 'text-gold' : ''}`}>
                              {member.rank}. {name(member.entry_id)}
                            </th>
                            <td className="px-2 py-2 tabular-nums">{member.wins}</td>
                            <td className="px-2 py-2 tabular-nums">{member.losses}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{member.points_for - member.points_against}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-4 py-2 text-xs text-muted">Clasifican los dos primeros. Orden: victorias, duelo directo, diferencia y sorteo.</p>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      <Panel as="section" className="p-5">
        <h2 className="font-display text-xl font-extrabold text-cream">Partidas y cuadro</h2>
        <div className="mt-4 space-y-5">
          {Array.from(new Set(detail.matches.map(match => `${match.round_number}:${match.phase}`))).map(key => {
            const matches = detail.matches.filter(match => `${match.round_number}:${match.phase}` === key)
            const phase = matches[0].phase
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-bold text-gold">
                  {PHASE_LABEL[phase]}{phase === 'group' ? ` · fecha ${matches[0].round_number}` : ''}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {matches.map(match => {
                    const mine = !!myEntryId && [match.side_a_entry_id, match.side_b_entry_id].includes(myEntryId)
                    return (
                      <article key={match.id} className="rounded-xl border border-line bg-surface2 p-3">
                        {match.group_id && (
                          <p className="mb-2 text-xs text-muted">Grupo {detail.groups.find(g => g.id === match.group_id)?.group_number}</p>
                        )}
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className={match.winner_entry_id === match.side_a_entry_id ? 'font-bold text-gold' : 'text-cream'}>{match.side_a_username ?? name(match.side_a_entry_id)}</span>
                          <span className="shrink-0 tabular-nums text-muted">{match.score_a ?? '–'} : {match.score_b ?? '–'}</span>
                          <span className={`text-right ${match.winner_entry_id === match.side_b_entry_id ? 'font-bold text-gold' : 'text-cream'}`}>{match.side_b_entry_id ? match.side_b_username ?? name(match.side_b_entry_id) : 'Bye'}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {match.finish_reason === 'attendance_review' ? 'Detenido: requiere revisión del administrador'
                            : match.finish_reason === 'both_disqualified' ? 'Tercer puesto vacante: ambos descalificados'
                            : match.finish_reason === 'bye' ? 'Pase directo'
                              : match.finish_reason === 'absence' ? 'Victoria por ausencia'
                                : match.status === 'ready' ? 'Listo para entrar · 5 minutos'
                                  : match.status === 'playing' ? 'En juego'
                                    : match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                        </p>
                        {mine && onEnter && match.status === 'ready' && (
                          <button type="button" onClick={() => onEnter(match.id)}
                            disabled={!!enteringMatchId}
                            className="mt-3 rounded-xl bg-gold px-3 py-2 text-sm font-bold text-ink disabled:opacity-50">
                            {enteringMatchId === match.id ? 'Entrando…' : waitingMatchId === match.id ? 'Esperando rival…' : 'Entrar a la partida'}
                          </button>
                        )}
                        {mine && match.status === 'playing' && (match.game_id || match.team_game_id) && (
                          <Link href={match.team_game_id ? `/game/parejas/${match.team_game_id}` : `/game/${match.game_id}`} className="mt-3 inline-block rounded-xl bg-gold px-3 py-2 text-sm font-bold text-ink">Ir a la partida</Link>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
