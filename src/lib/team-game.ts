import type { Card } from './truco'

export interface TeamMember {
  id: string
  user_id: string | null
  seat: number | null
  username: string
  avatar_url: string | null
  is_bot: boolean
  timeouts: number
}
export interface TeamTable {
  id: string
  creator_id: string
  name: string
  bet: number
  target_score: number
  time_limit: number
  is_private: boolean
  private_code: string | null
  status: 'waiting' | 'playing' | 'finished' | 'cancelled'
  version: number
}
export interface TeamGame {
  id: string
  hand_number: number
  mano: number
  turn: number
  round: number
  scores: [number, number]
  played: { seat: number; round: number; card: Card }[]
  rounds: { round: number; team: number | null; leader: number }[]
  envido: { status: string; high?: number; high_seat?: number; value?: number; declarations?: { seat: number; points: number | null }[] }
  truco: { status: string; value: number }
  awaiting_deal: boolean
  winner_team: number | null
  finish_reason: string | null
  last_hand_winner: number | null
  action_started_at: string
  announcement: { seat: number; text: string; action: string; at: string } | null
  reveal: { seat: number; points: number; cards: Card[] } | null
}
export interface TeamSnapshot {
  table: TeamTable
  members: TeamMember[]
  game: TeamGame | null
  my_seat: number | null
  hand: Card[]
  legal: string[]
  actor: number | null
  actor_is_bot: boolean
  server_now: string
  coins: number
  stale?: boolean
  left?: boolean
}
export interface TeamLobbyData {
  tables: (Pick<TeamTable, 'id' | 'name' | 'bet' | 'target_score' | 'time_limit'> & { occupied: number })[]
  mine: Pick<TeamTable, 'id' | 'name' | 'status'>[]
}

export const teamModeEnabled = process.env.NEXT_PUBLIC_ENABLE_2VS2 === 'true'
