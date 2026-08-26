export type EmailActivity = {
  user_id: string
  username: string
  registered_at: string
  last_played_at: string | null
  news_enabled: boolean
  reengagement_enabled: boolean
  unsubscribe_token: string
}

export type ReengagementKind = 'never_played' | 'inactive'

export type ReengagementCandidate = {
  kind: ReengagementKind
  dedupeKey: string
}

const TWO_DAYS_MS = 48 * 60 * 60 * 1000

/**
 * Devuelve un recordatorio solo al comenzar una etapa de inactividad.
 * La clave incluye la última partida, así que jugar otra vez habilita un futuro
 * recordatorio; permanecer inactivo no genera uno nuevo todos los días.
 */
export function getReengagementCandidate(
  activity: EmailActivity,
  now: Date,
): ReengagementCandidate | null {
  if (!activity.reengagement_enabled) return null

  const reference = activity.last_played_at ?? activity.registered_at
  const referenceTime = new Date(reference).getTime()
  if (!Number.isFinite(referenceTime) || now.getTime() - referenceTime < TWO_DAYS_MS) {
    return null
  }

  if (!activity.last_played_at) {
    return {
      kind: 'never_played',
      dedupeKey: `never-played:${activity.user_id}`,
    }
  }

  return {
    kind: 'inactive',
    dedupeKey: `inactive:${activity.user_id}:${activity.last_played_at}`,
  }
}
