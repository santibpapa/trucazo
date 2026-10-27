import Link from 'next/link'
import { Panel, Avatar } from '@/components/ui'
import type { loadRanking, RankedPlayer } from '@/lib/player-data'

export default function RankingScreen({ players, myRow, myIndex, myRank, medals: medalRows, owner }: Awaited<ReturnType<typeof loadRanking>> & { owner: string }) {
  const medals = new Map(medalRows.map(m => [m.id, m.medal]))
  const myMedal = medals.get(owner) ?? 'ninguno'
  return (
    <main className="min-h-screen w-full max-w-2xl mx-auto flex flex-col gap-5 px-4 sm:px-6 py-5 pb-24">
      {/* Encabezado */}
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-gold transition-colors"
        >
          <BackIcon /> Lobby
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-cream">Ranking</h1>
        <span className="w-12" aria-hidden="true" />
      </header>

      <p className="-mt-2 text-sm text-muted">
        Los mejores del modo online, por partidas ganadas contra personas.
      </p>

      {/* Sin partidas ganadas todavía */}
      {myRow && myRow.games_won === 0 && (
        <Panel className="p-4 text-center text-sm text-muted border-dashed">
          Todavía no ganaste ninguna partida online. ¡Ganá tu primera para entrar al ranking!
        </Panel>
      )}

      {/* Lista */}
      {players.length === 0 ? (
        <Panel className="p-10 text-center flex flex-col gap-1 border-dashed">
          <p className="font-medium text-muted">El ranking está vacío</p>
          <p className="text-sm text-subtle">En cuanto se jueguen partidas, acá van a aparecer los mejores.</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <RankRow
              key={p.id}
              rank={i + 1}
              player={p}
              medal={medals.get(p.id) ?? 'ninguno'}
              me={p.id === owner}
            />
          ))}
        </div>
      )}

      {/* Mi puesto, si quedé fuera del top mostrado */}
      {myRow && myRank !== null && myIndex < 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-subtle">Tu puesto</p>
          <RankRow rank={myRank} player={myRow} medal={myMedal} me />
        </div>
      )}
    </main>
  )
}

function RankRow({ rank, player, medal, me }: { rank: number; player: RankedPlayer; medal: string; me?: boolean }) {
  const winRate = player.games_played > 0 ? Math.round((player.games_won / player.games_played) * 100) : 0
  return (
    <Panel className={`flex items-center gap-3 p-3 ${me ? 'border-gold shadow-gold-ring' : ''}`}>
      <RankBadge rank={rank} />
      <Avatar url={player.avatar_url} name={player.username} size={44} frame={player.active_frame} medal={medal} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-cream">
          {player.username}
          {me && <span className="ml-1 text-gold">(vos)</span>}
        </p>
        <p className="text-[11px] text-subtle">
          {player.games_played} {player.games_played === 1 ? 'jugada' : 'jugadas'} · {winRate}% efectividad
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span className="block font-display text-xl font-extrabold text-gold tabular leading-none">{player.games_won}</span>
        <span className="text-[10px] uppercase tracking-wider text-subtle">ganadas</span>
      </div>
    </Panel>
  )
}

// Número de puesto; los tres primeros con color de medalla.
function RankBadge({ rank }: { rank: number }) {
  const podium: Record<number, string> = {
    1: 'bg-gradient-to-b from-[#E8CF84] to-[#A98532] text-ink border-[#8a6a2c]',
    2: 'bg-gradient-to-b from-[#d8dde3] to-[#9aa4b0] text-ink border-[#8b95a3]',
    3: 'bg-gradient-to-b from-[#e0a970] to-[#a56b3a] text-ink border-[#8a5526]',
  }
  const style = podium[rank] ?? 'bg-surface2 text-muted border-line'
  return (
    <span
      className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border font-display text-sm font-extrabold tabular ${style}`}
    >
      {rank}
    </span>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
