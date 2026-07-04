'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMessage } from '@/lib/types'
import { Button, Input, cn } from '@/components/ui'

const MAX_LEN = 300

// Chat global con historial: trae los últimos mensajes y escucha en vivo los
// nuevos y los borrados. El admin puede borrar cualquiera; cada uno, el suyo.
export default function ChatGlobal({
  myId, isAdmin,
}: {
  myId: string; isAdmin: boolean
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  // Baja al último mensaje (solo si el usuario ya estaba abajo, para no cortarle
  // la lectura si subió a mirar mensajes viejos).
  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current
    if (!el || (!atBottomRef.current && !force)) return
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [])

  // Historial inicial + realtime.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (!alive) return
      setMessages(((data as ChatMessage[]) ?? []).reverse())
      scrollToBottom(true)
    })()

    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const m = payload.new as ChatMessage
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
          scrollToBottom()
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const id = (payload.old as { id?: string })?.id
          if (id) setMessages(prev => prev.filter(x => x.id !== id))
        },
      )
      .subscribe()

    return () => { alive = false; supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 3500)
    return () => clearTimeout(t)
  }, [error])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setError('')
    const { error: e } = await supabase.rpc('send_chat_message', { p_body: body })
    setSending(false)
    if (e) { setError(e.message); return }
    setText('')
    atBottomRef.current = true
    scrollToBottom(true)
  }

  async function remove(id: string) {
    // Optimista: lo saco ya; el realtime lo confirma para el resto.
    setMessages(prev => prev.filter(m => m.id !== id))
    await supabase.rpc('delete_chat_message', { p_id: id })
  }

  return (
    <div className="flex flex-col h-[60dvh] lg:h-[64dvh]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold text-cream">Chat global</h2>
        {isAdmin && messages.length > 0 && (
          <button
            onClick={() => { if (confirm('¿Borrar TODOS los mensajes del chat?')) supabase.rpc('clear_chat') }}
            className="text-[11px] font-semibold text-subtle hover:text-negative transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <p className="text-sm text-subtle">Todavía no hay mensajes.<br />¡Rompé el hielo! 👋</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.user_id === myId
            return (
              <div key={m.id} className={cn('group flex flex-col max-w-[85%]', mine ? 'self-end items-end' : 'self-start items-start')}>
                <div className="flex items-center gap-1.5 px-1">
                  <span className={cn('text-[11px] font-semibold', mine ? 'text-gold' : 'text-muted')}>
                    {mine ? 'Vos' : m.username}
                  </span>
                  <span className="text-[10px] text-subtle">{fmtTime(m.created_at)}</span>
                  {(isAdmin || mine) && (
                    <button
                      onClick={() => remove(m.id)}
                      aria-label="Borrar mensaje"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-subtle hover:text-negative transition-opacity"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap',
                    mine ? 'bg-gold/15 text-cream rounded-tr-sm' : 'bg-surface2 text-cream rounded-tl-sm',
                  )}
                >
                  {m.body}
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && <p className="text-xs text-negative mt-2 px-1">{error}</p>}

      {/* Escribir */}
      <div className="flex items-end gap-2 mt-3">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Escribí un mensaje…"
            value={text}
            maxLength={MAX_LEN}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
        </div>
        <Button onClick={send} disabled={sending || !text.trim()} className="shrink-0">
          Enviar
        </Button>
      </div>
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
