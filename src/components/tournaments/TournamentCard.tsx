import Link from 'next/link'
import { Panel } from '@/components/ui'
import {
  formatTournamentDate,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_MODE_LABEL,
  TOURNAMENT_STATUS_LABEL,
  tournamentPlacesLabel,
} from '@/lib/tournament-ui'
import type { Tournament } from '@/lib/tournaments'

export default function TournamentCard({
  tournament,
  href = `/torneos/${tournament.id}`,
}: {
  tournament: Tournament
  href?: string
}) {
  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
      <Panel as="article" className="h-full p-4 transition-colors group-hover:border-gold/60 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold text-cream group-hover:text-gold">
              {tournament.name}
            </h3>
            <p className="mt-1 text-sm text-muted">{formatTournamentDate(tournament.starts_at)}</p>
          </div>
          <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
            {TOURNAMENT_STATUS_LABEL[tournament.status]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
          <span className="rounded-full bg-surface2 px-2.5 py-1">
            {TOURNAMENT_MODE_LABEL[tournament.mode]}
          </span>
          <span className="rounded-full bg-surface2 px-2.5 py-1">
            {TOURNAMENT_FORMAT_LABEL[tournament.format]}
          </span>
          <span className="rounded-full bg-surface2 px-2.5 py-1">A {tournament.target_score}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          <span className="text-muted">{tournamentPlacesLabel(tournament)}</span>
          <span className="font-bold text-gold">Ver torneo →</span>
        </div>
      </Panel>
    </Link>
  )
}
