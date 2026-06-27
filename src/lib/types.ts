export interface Profile {
  id: string
  username: string
  coins: number
  games_played: number
  games_won: number
  games_lost: number
  created_at: string
}

export interface GameHistory {
  id: string
  player_id: string
  opponent_id: string
  opponent_username: string
  result: 'win' | 'loss'
  coins_change: number
  created_at: string
}

export interface Table {
  id: string
  name: string
  creator_id: string
  creator_username: string
  opponent_id: string | null
  opponent_username: string | null
  bet: number
  is_private: boolean
  private_code: string | null
  status: 'waiting' | 'playing' | 'finished'
  target_score: number
  time_limit: number
  created_at: string
}

export interface EnvidoState {
  status: 'none' | 'envido' | 'real_envido' | 'falta_envido' | 'declaring' | 'accepted' | 'rejected' | 'mazo'
  last_singer: string | null
  value: number
  chain: string[]
  // Diálogo de tantos (fase 'declaring'): a quién le toca declarar y el tanto que
  // ya declaró la mano (null = todavía no declaró).
  declare_turn?: string | null
  mano_declared?: number | null
  // Resultado, para mostrarlo a ambos jugadores una vez resuelto el envido
  winner_id?: string | null
  // null cuando el jugador "dijo son buenas" y no reveló su tanto
  player1_points?: number | null
  player2_points?: number | null
  awarded?: number
}

export interface TrucoState {
  status: 'none' | 'truco' | 'retruco' | 'vale_cuatro' | 'accepted' | 'rejected'
  last_singer: string | null
  value: number
}

export interface PlayedCard {
  player_id: string
  card: import('./truco').Card
  round: number
}

export interface RoundResult {
  round: number
  winner_id: string | null // null = empate
}

export interface Game {
  id: string
  player1_id: string
  player2_id: string
  player1_username: string
  player2_username: string
  player1_score: number
  player2_score: number
  played_cards: PlayedCard[]
  current_turn: string
  mano_player: string
  hand_number: number
  round_number: number
  envido_state: EnvidoState
  truco_state: TrucoState
  round_results: RoundResult[]
  status: 'playing' | 'finished'
  winner_id: string | null
  bet: number
  target_score: number
  time_limit: number
  turn_started_at: string
  mazo_count_p1: number
  mazo_count_p2: number
  awaiting_deal: boolean
  rematch_p1: boolean
  rematch_p2: boolean
  rematch_game_id: string | null
  created_at: string
  updated_at: string
}