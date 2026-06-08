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