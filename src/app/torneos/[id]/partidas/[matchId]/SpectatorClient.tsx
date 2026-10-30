'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Panel } from '@/components/ui'
import PlayingCard from '@/components/game/PlayingCard'
import { createClient } from '@/lib/supabase/client'
import type { Card } from '@/lib/truco'
import { visibleSpectatorCards } from '@/lib/tournaments/spectator'

export type SpectatorSnapshot = {
  match_id: string
  tournament_id: string
  tournament_name: string
  mode: '1v1' | '2v2'
  phase: string
  status: string
  side_a: string | null
  side_b: string | null
  score_a: number | null
  score_b: number | null
  players: { user_id: string; username: string; seat: number | null; team: number }[]
  game: null | {
    status: string
    scores: [number, number]
    turn: string | number
    hand_number: number
    round: number
    played: { player_id?: string; seat?: number; round: number; card: Card }[]
    envido_status: string
    truco_status: string
  }
}

export default function SpectatorClient({ initial }: { initial: SpectatorSnapshot }) {
  const client = useMemo(() => createClient(), [])
  const [snapshot, setSnapshot] = useState(initial)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return
    const result = await client.rpc('tournament_spectator_snapshot', { p_match_id: initial.match_id })
    if (result.error || !result.data) setError('No pudimos actualizar la partida. Vamos a reintentar.')
    else { setSnapshot(result.data as SpectatorSnapshot); setError('') }
  }, [client, initial.match_id])
  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 3_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [refresh])

  const game = snapshot.game
  const played = game ? visibleSpectatorCards(game.played, game.round) : []
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 [@media(max-height:450px)]:grid [@media(max-height:450px)]:grid-cols-2 [@media(max-height:450px)]:content-start [@media(max-height:450px)]:gap-1">
      <header className="col-span-2">
        <p className="text-xs font-semibold text-gold">{snapshot.tournament_name} · {snapshot.phase}</p>
        <h1 className="font-display text-xl font-extrabold text-cream">Partida en vivo</h1>
        <p className="text-xs text-muted">Solo cartas jugadas. Se actualiza sola.</p>
      </header>
      {error && <Alert className="col-span-2">{error}</Alert>}
      <Panel as="section" className="p-2 sm:p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <span className="min-w-0 break-words text-sm font-bold text-cream">{snapshot.side_a ?? 'Por definir'}</span>
          <span className="font-display text-xl font-black tabular-nums text-gold">
            {game?.scores?.[0] ?? snapshot.score_a ?? '–'} : {game?.scores?.[1] ?? snapshot.score_b ?? '–'}
          </span>
          <span className="min-w-0 break-words text-sm font-bold text-cream">{snapshot.side_b ?? 'Por definir'}</span>
        </div>
        <p className="mt-1 text-center text-xs text-muted" aria-live="polite">
          {snapshot.status === 'playing' && game
            ? `Mano ${game.hand_number} · baza ${game.round} · ${game.envido_status === 'pending' ? 'Envido pendiente' : game.truco_status === 'pending' ? 'Truco pendiente' : 'En juego'}`
            : snapshot.status === 'ready' ? 'Esperando jugadores' : snapshot.status === 'finished' || snapshot.status === 'forfeit' ? 'Partida finalizada' : 'Partida pendiente'}
        </p>
      </Panel>
      {snapshot.mode === '2v2' && <Panel as="section" className="p-2 sm:p-3">
        <h2 className="text-xs font-bold text-gold">Jugadores</h2>
        <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-cream">
          {snapshot.players.map((player, i) => <p key={i} className="min-w-0 break-words">{player.username} · equipo {player.team + 1}</p>)}
        </div>
      </Panel>}
      {game && <Panel as="section" className="col-span-2 p-2 sm:p-3">
        <h2 className="text-xs font-bold text-cream">{played.length && played[0].round !== game.round ? 'Cartas de la baza anterior' : 'Cartas jugadas en esta baza'}</h2>
        {played.length ? <div className="mt-2 flex justify-center gap-2">
          {played.map((item, i) => <div key={i} className="w-[clamp(2.1rem,14vh,4rem)] min-w-0 text-center">
            <PlayingCard card={item.card} />
            <span className="mt-1 block break-words text-xs text-muted">{snapshot.mode === '2v2'
              ? snapshot.players.find(player => player.seat === item.seat)?.username ?? 'Jugador'
              : snapshot.players.find(player => player.user_id === item.player_id)?.username ?? 'Jugador'}</span>
          </div>)}
        </div> : <p className="mt-2 text-xs text-muted">Todavía no se jugó ninguna carta.</p>}
      </Panel>}
    </div>
  )
}
