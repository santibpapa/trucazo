'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackFirstParty } from '@/lib/analytics/client'
import type { ObjectiveKind, ObjectivesData } from '@/lib/objectives'

export function useObjectives(
  initialData: ObjectivesData | null,
  gameId: string | null = null,
  enabled = true,
) {
  const [data, setData] = useState<ObjectivesData | null>(initialData)
  const [loading, setLoading] = useState(enabled && !initialData)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const dataRef = useRef(initialData)

  useEffect(() => { dataRef.current = data }, [data])

  const refresh = useCallback(async () => {
    if (!enabled) return
    const supabase = createClient()
    if (!dataRef.current) setLoading(true)
    const { data: fresh, error: readError } = await supabase.rpc('get_my_objectives', {
      p_game_id: gameId,
    })
    if (readError || !fresh) {
      setError('No pudimos cargar tus objetivos. Podés seguir jugando normalmente.')
    } else {
      setData(fresh as ObjectivesData)
      setError('')
    }
    setLoading(false)
  }, [enabled, gameId])

  useEffect(() => {
    if (enabled && !initialData) void refresh()
  }, [enabled, initialData, refresh])

  useEffect(() => {
    if (!enabled) return
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [enabled, refresh])

  const claim = useCallback(async (type: ObjectiveKind, identifier: string) => {
    if (claiming) return
    setClaiming(`${type}:${identifier}`)
    setError('')
    const supabase = createClient()
    const { data: updated, error: claimError } = await supabase.rpc('claim_objective_reward', {
      p_type: type,
      p_identifier: identifier,
    })

    if (claimError || !updated) {
      setError(claimError?.message || 'No se pudo reclamar la recompensa. Reintentá en un momento.')
      await refresh()
    } else {
      const next = updated as ObjectivesData
      if (gameId && dataRef.current) {
        next.recent_progress = dataRef.current.recent_progress
        next.streak_event = dataRef.current.streak_event
      }
      setData(next)
      const objective = type === 'weekly'
        ? next.weekly
        : next.daily.find(item => item.identifier === identifier)
      setStatusMessage(`Recompensa recibida. Tu saldo nuevo es ${next.coins.toLocaleString('es-AR')} monedas.`)
      trackFirstParty('objective_reward_claimed', {
        objective_type: type,
        mission_type: identifier,
        reward: objective?.reward ?? 0,
      })
    }
    setClaiming(null)
  }, [claiming, gameId, refresh])

  return { data, loading, claiming, error, statusMessage, refresh, claim }
}
