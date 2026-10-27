import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RIVAL, VERSION } from '@/lib/offline-trial/engine'

export const dynamic = 'force-dynamic'
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  if (error || !user || user.is_anonymous) return respond({ error: 'Entrá con tu cuenta.' }, 401)
  const { data: rival } = await supabase.from('campaign_rivals')
    .select('difficulty,trait_liar,trait_aggressive,strategy_profile').eq('id', RIVAL).maybeSingle()
  if (!rival || rival.difficulty !== 1 || rival.trait_liar !== 1 || rival.trait_aggressive !== 2 || rival.strategy_profile) {
    return respond({ error: 'El ensayo necesita actualizar las reglas de Tobías.' }, 409)
  }
  return respond({ userId: user.id, version: VERSION })
}
