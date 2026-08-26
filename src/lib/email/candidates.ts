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

export type ReengagementCampaign = {
  id: string
  name: string
  audience: ReengagementKind
  delay_days: number
  subject: string
  preview: string
  heading: string
  body: string
  cta_label: string
  cta_path: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ReengagementCandidate = {
  kind: ReengagementKind
  dedupeKey: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Decide si una campaña corresponde a esta etapa de inactividad.
 * La clave incluye campaña y última partida: cada campaña sale una vez por etapa;
 * jugar otra vez habilita un futuro envío, pero seguir inactivo no lo repite.
 */
export function getReengagementCandidate(
  activity: EmailActivity,
  campaign: Pick<ReengagementCampaign, 'id' | 'audience' | 'delay_days' | 'is_active'>,
  now: Date,
): ReengagementCandidate | null {
  if (!activity.reengagement_enabled || !campaign.is_active) return null

  const kind: ReengagementKind = activity.last_played_at ? 'inactive' : 'never_played'
  if (campaign.audience !== kind) return null

  const reference = activity.last_played_at ?? activity.registered_at
  const referenceTime = new Date(reference).getTime()
  if (
    !Number.isFinite(referenceTime) ||
    now.getTime() - referenceTime < campaign.delay_days * DAY_MS
  ) {
    return null
  }

  return {
    kind,
    dedupeKey: activity.last_played_at
      ? `campaign:${campaign.id}:${activity.user_id}:${activity.last_played_at}`
      : `campaign:${campaign.id}:${activity.user_id}:never-played`,
  }
}
