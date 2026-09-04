export type ObjectiveKind = 'daily' | 'weekly'
export type ObjectiveStatus = 'in_progress' | 'ready' | 'claimed'

export interface Objective {
  type: ObjectiveKind
  identifier: string
  name: string
  description: string
  category: 'participation' | 'competition' | 'history' | 'social' | 'weekly'
  difficulty: 'easy' | 'medium' | 'competitive' | 'weekly'
  progress: number
  target: number
  reward: number
  completed_at: string | null
  claimed_at: string | null
  status: ObjectiveStatus
  ends_label: string
}

export interface ObjectiveProgress {
  type: ObjectiveKind
  identifier: string
  name: string
  previous: number
  current: number
  target: number
  reward: number
  mode: 'persona' | 'bot' | 'historia' | 'privada' | 'amigo' | 'revancha'
  completed: boolean
  newly_completed: boolean
}

export interface ObjectivesData {
  generated_at: string
  local_date: string
  day_ends_at: string
  week_start: string
  week_ends_at: string
  daily: Objective[]
  weekly: Objective
  streak: {
    current_days: number
    longest_days: number
    last_active_date: string | null
    protection_available: boolean
    protection_used: boolean
  }
  coins: number
  recent_progress: ObjectiveProgress[]
  streak_event: 'started' | 'continued' | 'protection_used' | 'reset' | 'unchanged'
}

export function readyObjectives(data: ObjectivesData) {
  return [...data.daily, data.weekly].filter(objective => objective.status === 'ready')
}
