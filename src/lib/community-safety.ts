import { createClient } from '@/lib/supabase/client'

export const RULES_VERSION = '2026-10-15'
export const COMMUNITY_RULES = 'Sin amenazas, acoso, discriminación, contenido sexual, datos personales ajenos, suplantación ni spam. Compartí sólo textos e imágenes que tengas derecho a usar. Los incumplimientos pueden retirar contenido y restringir la participación social durante 7 días.'
export type SafetyState = {
  accepted: boolean; restricted_until: string | null
  blocks: { id: string; username: string }[]
  reports: { id: string; kind: string; reason: string; created_at: string; resolved_at: string | null; action: string | null; resolution: string | null }[]
}
export async function ensureCommunityRules() {
  const client = createClient()
  const { data, error } = await client.rpc('community_safety_state')
  if (error) throw new Error('No pudimos comprobar las normas. Reintentá con conexión.')
  if (data.restricted_until) throw new Error('Tu participación social está restringida temporalmente. Consultá Convivencia.')
  if (data.accepted) return
  const accepted = await new Promise<boolean>(resolve => {
    window.dispatchEvent(new CustomEvent('community:rules', { detail: resolve }))
  })
  if (!accepted) throw new Error('Aceptá las normas para participar. Podés seguir jugando.')
  const result = await client.rpc('accept_community_rules', { p_version: RULES_VERSION })
  if (result.error) throw new Error(result.error.message)
}
export function safetyChanged() { window.dispatchEvent(new Event('community:safety-changed')) }
