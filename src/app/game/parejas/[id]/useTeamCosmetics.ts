'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamMember } from '@/lib/team-game'

type Cosmetic = { frame: string | null; medal: string | null; accessory: string | null }

/** Sólo apariencia pública ya equipada, con la misma validación de medallas que 1vs1. */
export default function useTeamCosmetics(members: TeamMember[]) {
  const [cosmetics, setCosmetics] = useState<Record<string, Cosmetic>>({})
  const ids = members.flatMap(m => m.user_id ? [m.user_id] : []).sort().join(',')
  const supabase = createClient()
  useEffect(() => {
    if (!ids) return
    let cancelled = false
    const userIds = ids.split(',')
    void Promise.all([
      supabase.from('profiles').select('id, active_frame, active_accessory').in('id', userIds),
      Promise.all(userIds.map(id => supabase.rpc('active_medal_for', { p_uid: id }))),
    ]).then(([profiles, medals]) => {
      if (cancelled) return
      setCosmetics(Object.fromEntries(userIds.map((id, i) => {
        const profile = profiles.data?.find(p => p.id === id)
        return [id, { frame: profile?.active_frame ?? null, accessory: profile?.active_accessory ?? null, medal: typeof medals[i].data === 'string' ? medals[i].data : null }]
      })))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [ids, supabase])
  return cosmetics
}
