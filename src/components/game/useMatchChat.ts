import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createMatchChatReadiness } from '@/lib/match-chat'

export type MatchChatMessage = {
  id: string
  sender_id: string
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
  const initialized = useRef(false)
  quiet.current = open || muted

  useEffect(() => { if (open || muted) setUnread(0) }, [open, muted])
  const refresh = useCallback(async () => {
    const column = mode === 'game' ? 'game_id' : 'team_table_id'
    const { data, error } = await supabase.from('match_chat_messages')
      .select('id,sender_id,sender_name,body,created_at,client_request_id')
      .eq(column, matchId).order('created_at', { ascending: false })
      .order('id', { ascending: false }).limit(100)
    if (error) throw error
    const incoming = (data ?? []) as MatchChatMessage[]
    const newCount = initialized.current && !quiet.current
      ? incoming.filter(message => !known.current.has(message.id) && message.sender_id !== userId).length : 0
    for (const message of incoming) known.current.add(message.id)
    initialized.current = true
    if (newCount) setUnread(count => count + newCount)
    setMessages(previous => merge(previous, incoming))
  }, [supabase, mode, matchId, userId])

  useEffect(() => {
    let alive = true
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
        const message = row as MatchChatMessage
        if (known.current.has(message.id)) return
        known.current.add(message.id)
        setMessages(previous => merge(previous, [message]))
        // El indicador se controla con el estado actual, sin afectar el motor.
        if (message.sender_id !== userId && !quiet.current) setUnread(count => count + 1)
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
      void supabase.removeChannel(channel)
    }
  }, [supabase, mode, matchId, userId, refresh, retry])

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
