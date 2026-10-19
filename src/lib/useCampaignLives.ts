'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CampaignLives {
  user_id: string
  ads_enabled: boolean
  lives: number
  next_life_at: string | null
  server_now: string
  active_game_id: string | null
  friends: { id: string; username: string }[]
  request_out: { username: string } | null
  requests_in: { id: string; username: string }[]
}

export function useCampaignLives(initial: CampaignLives | null = null) {
  const [supabase] = useState(createClient)
  const [data, setData] = useState(initial)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try {
      const result = await supabase.rpc('get_campaign_lives').abortSignal(AbortSignal.timeout(8000))
      if (result.error || !result.data) throw new Error('unavailable')
      setData(result.data as CampaignLives)
      setError('')
    } catch {
      setError('No pudimos actualizar las vidas. Probá de nuevo.')
    }
  }, [supabase])

  useEffect(() => {
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    const poll = setInterval(visibleRefresh, 15000)
    window.addEventListener('focus', visibleRefresh)
    document.addEventListener('visibilitychange', visibleRefresh)
    return () => {
      clearInterval(poll)
      window.removeEventListener('focus', visibleRefresh)
      document.removeEventListener('visibilitychange', visibleRefresh)
    }
  }, [refresh])

  return { data, error, refresh, setData }
}

// Sólo presentación: llegar a 00:00 nunca suma vidas en el navegador.
export function useLifeCountdown(data: CampaignLives | null) {
  const [seconds, setSeconds] = useState<number | null>(null)
  useEffect(() => {
    if (!data?.next_life_at) { setSeconds(null); return }
    const remaining = Date.parse(data.next_life_at) - Date.parse(data.server_now)
    const started = performance.now()
    const tick = () => setSeconds(Math.max(0, Math.ceil((remaining - (performance.now() - started)) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [data])
  return seconds === null ? null : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
