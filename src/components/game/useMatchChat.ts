import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createMatchChatReadiness } from '@/lib/match-chat'

export type MatchChatMessage = {
  id: string
  sender_id: string | null
  sender_name: string
  body: string
  created_at: string
  client_request_id: string
}

function merge(previous: MatchChatMessage[], incoming: MatchChatMessage[]) {
  const byId = new Map(previous.map(message => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values())
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .slice(-100)
}

export function useMatchChat(mode: 'game' | 'team', matchId: string, open: boolean, muted: boolean, userId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<MatchChatMessage[]>([])
  const [unread, setUnread] = useState(0)
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  const [retry, setRetry] = useState(0)
  const quiet = useRef(open || muted)
  const known = useRef(new Set<string>())
  const delayed = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const initialized = useRef(false)
  quiet.current = open || muted

  useEffect(() => { if (open || muted) setUnread(0) }, [open, muted])
  const receive = useCallback((incoming: MatchChatMessage[], notify: boolean) => {
    const due: MatchChatMessage[] = []
    for (const message of incoming) {
      if (known.current.has(message.id) || delayed.current.has(message.id)) continue
      // Las respuestas del bot viajan por Realtime enseguida, pero se muestran
      // a la hora indicada por el servidor en todas las sesiones de la mesa.
      const wait = Math.min(5000, Date.parse(message.created_at) - Date.now())
      if (wait > 0) {
        delayed.current.set(message.id, setTimeout(() => {
          delayed.current.delete(message.id)
          if (known.current.has(message.id)) return
          known.current.add(message.id)
          setMessages(previous => merge(previous, [message]))
          if (notify && !quiet.current && message.sender_id !== userId) setUnread(count => count + 1)
        }, wait))
      } else {
        known.current.add(message.id)
        due.push(message)
      }
    }
    if (due.length) {
      setMessages(previous => merge(previous, due))
      if (notify && !quiet.current) {
        const count = due.filter(message => message.sender_id !== userId).length
        if (count) setUnread(previous => previous + count)
      }
    }
  }, [userId])
  const refresh = useCallback(async () => {
    const column = mode === 'game' ? 'game_id' : 'team_table_id'
    const { data, error } = await supabase.from('match_chat_messages')
      .select('id,sender_id,sender_name,body,created_at,client_request_id')
      .eq(column, matchId).order('created_at', { ascending: false })
      .order('id', { ascending: false }).limit(100)
    if (error) throw error
    const incoming = (data ?? []) as MatchChatMessage[]
    receive(incoming, initialized.current)
    initialized.current = true
  }, [supabase, mode, matchId, receive])

  useEffect(() => {
    let alive = true
    const pendingTimers = delayed.current
    let readyTimer: ReturnType<typeof setTimeout> | null = null
    const clearReadyTimer = () => { if (readyTimer) clearTimeout(readyTimer); readyTimer = null }
    const readiness = createMatchChatReadiness(() => {
      clearReadyTimer()
      setConnection('connecting')
      void refresh().then(() => { if (alive && readiness.ready) setConnection('connected') })
        .catch(() => { if (alive) setConnection('offline') })
    })
    const column = mode === 'game' ? 'game_id' : 'team_table_id'
    const channel = supabase.channel(`match-chat-${mode}-${matchId}`, {
      config: { broadcast: { replication_ready: true } },
    })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_chat_messages', filter: `${column}=eq.${matchId}`,
      }, ({ new: row }) => {
        if (!alive) return
        receive([row as MatchChatMessage], true)
      })
      .on('system', {}, payload => {
        if (!alive || (payload.extension !== 'system' && payload.extension !== 'postgres_changes')) return
        readiness.system(payload)
        if (payload.status === 'error') { clearReadyTimer(); setConnection('offline') }
      })
      .subscribe(status => {
        if (!alive) return
        if (status === 'SUBSCRIBED') {
          if (!readiness.ready) {
            setConnection('connecting')
            clearReadyTimer()
            readyTimer = setTimeout(() => { if (alive && !readiness.ready) setConnection('offline') }, 12000)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearReadyTimer()
          readiness.disconnect()
          setConnection('offline')
        }
      })
    const recover = () => {
      if (readiness.ready && document.visibilityState === 'visible') void refresh().catch(() => { if (alive) setConnection('offline') })
    }
    document.addEventListener('visibilitychange', recover)
    window.addEventListener('focus', recover)
    return () => {
      alive = false
      clearReadyTimer()
      document.removeEventListener('visibilitychange', recover)
      window.removeEventListener('focus', recover)
      pendingTimers.forEach(timer => clearTimeout(timer))
      pendingTimers.clear()
      void supabase.removeChannel(channel)
    }
  }, [supabase, mode, matchId, refresh, receive, retry])

  const send = useCallback(async (body: string, requestId: string) => {
    const { data, error } = await supabase.rpc('send_match_chat_message', {
      p_mode: mode, p_match_id: matchId, p_body: body, p_request_id: requestId,
    })
    if (error) throw error
    setMessages(previous => merge(previous, [data as MatchChatMessage]))
  }, [supabase, mode, matchId])

  return {
    messages, connection, send, unread: open || muted ? 0 : unread,
    reconnect: () => { setConnection('connecting'); setRetry(n => n + 1) },
  }
}
