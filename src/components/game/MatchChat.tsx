'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChatIcon, EmoteTray } from './MesaUI'
import { useMatchChat, type MatchChatMessage } from './useMatchChat'
import { matchChatSendError } from '@/lib/match-chat'
import salon from './salon.module.css'
import styles from './matchChat.module.css'
import SafetyActions from '@/components/SafetyActions'
import { ensureCommunityRules } from '@/lib/community-safety'
import { useDialog } from '@/lib/useDialog'

export function MatchChatBubble({ message, className }: { message: MatchChatMessage; className: string }) {
  return <div role="status" className={`${styles.bubble} ${className} rounded-2xl border border-line bg-base/90 backdrop-blur px-3 py-1.5 shadow-card animate-scale-in`}>
    <span className="sr-only">{message.sender_name}: </span><span className={styles.bubbleText}>{message.body}</span>
  </div>
}

export default function MatchChat({ mode, matchId, userId, isGuest, quick, onQuickSend, quickCooldown, onBubblesChange }: {
  mode: 'game' | 'team'; matchId: string; userId: string; isGuest: boolean
  quick: readonly string[]; onQuickSend: (text: string) => void; quickCooldown: boolean
  onBubblesChange: (messages: MatchChatMessage[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'messages' | 'quick'>('messages')
  const [muted, setMuted] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [viewport, setViewport] = useState({ top: 0, height: 0 })
  const attempt = useRef<{ body: string; id: string } | null>(null)
  const inFlight = useRef<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const follow = useRef(true)
  const { messages, bubbles, unread, connection, reconnect, send } = useMatchChat(mode, matchId, open, muted, userId)

  useEffect(() => { onBubblesChange(muted ? [] : bubbles) }, [bubbles, muted, onBubblesChange])
  useDialog(panel, open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    const update = () => {
      const vv = window.visualViewport
      setViewport({ top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight })
    }
    update()
    closeButton.current?.focus()
    const triggerButton = trigger.current
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      triggerButton?.focus()
    }
  }, [open])

  useLayoutEffect(() => {
    if (open && tab === 'messages' && follow.current && list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages, open, tab])

  useEffect(() => {
    const accepted = messages.find(message => message.client_request_id === attempt.current?.id && message.sender_id === userId)
    if (!accepted) return
    setDraft(previous => previous.trim() === accepted.body ? '' : previous)
    attempt.current = null
    setError('')
    if (inFlight.current === accepted.client_request_id) {
      inFlight.current = null
      setSending(false)
    }
  }, [messages, userId])

  async function submit() {
    const body = draft.trim()
    if (sending || !body) return
    if (Array.from(body).length > 200) { setError('El mensaje puede tener hasta 200 caracteres.'); return }
    if (attempt.current?.body !== body) attempt.current = { body, id: crypto.randomUUID() }
    const requestId = attempt.current.id
    inFlight.current = requestId
    setSending(true)
    setError('')
    try {
      await ensureCommunityRules()
      await send(body, requestId)
      if (attempt.current?.id === requestId) {
        setDraft(previous => previous.trim() === body ? '' : previous)
        attempt.current = null
      }
    } catch (cause) {
      if (attempt.current?.id === requestId) setError(matchChatSendError(cause))
    } finally {
      if (inFlight.current === requestId) {
        inFlight.current = null
        setSending(false)
      }
    }
  }

  return <>
    <button ref={trigger} type="button" className={`${salon.toolButton} ${styles.trigger}`} aria-label={unread ? `Chat, ${unread} mensajes nuevos` : 'Chat de la mesa'} aria-expanded={open} onClick={() => { follow.current = true; setOpen(true) }}>
      <ChatIcon />{unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && createPortal(<div className={styles.overlay} style={{ top: viewport.top, height: viewport.height || '100dvh' }} onClick={() => setOpen(false)}>
      <section ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-label="Chat de la mesa" onClick={event => event.stopPropagation()}>
        <header className={styles.header}>
          <strong>Chat de la mesa</strong>
          <button ref={closeButton} type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Cerrar chat">✕</button>
        </header>
        <nav className={styles.tabs} aria-label="Opciones del chat">
          <button type="button" aria-current={tab === 'messages' ? 'page' : undefined} onClick={() => setTab('messages')}>Mensajes</button>
          <button type="button" aria-current={tab === 'quick' ? 'page' : undefined} onClick={() => setTab('quick')}>Frases rápidas</button>
        </nav>
        {tab === 'messages' ? <>
          <div ref={list} className={styles.messages} role="log" aria-live="polite" aria-relevant="additions" onScroll={event => {
            const el = event.currentTarget
            follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
          }}>
            {messages.length === 0 && <p className={styles.empty}>Todavía no hay mensajes.</p>}
            {messages.map(message => <p key={message.id} className={styles.message}>
              <span className={styles.author}>{message.sender_name}</span>
              {message.sender_id !== userId && !isGuest && <SafetyActions kind="match_chat" target={message.id} userId={message.sender_id} label={'Opciones de ' + message.sender_name} />}
              <time dateTime={message.created_at} className={styles.time}>{new Date(message.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time>
              <span className={styles.body}>{message.body}</span>
            </p>)}
          </div>
          <div className={styles.footer}>
            {connection !== 'connected' && <div role="status" className={styles.connection}>{connection === 'connecting' ? 'Conectando…' : 'Sin conexión al chat'} <button type="button" onClick={reconnect}>Reintentar</button></div>}
            {isGuest ? <p className={styles.notice}>Solo los usuarios registrados pueden escribir en el chat.</p> : <form onSubmit={event => { event.preventDefault(); void submit() }}>
              <label htmlFor="match-chat-input" className="sr-only">Escribir mensaje</label>
              <textarea id="match-chat-input" value={draft} rows={2} onChange={event => { setDraft(event.target.value); setError('') }} onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit() }
              }} placeholder="Escribí un mensaje" aria-describedby={error ? 'match-chat-error' : undefined} />
              <button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Enviando…' : 'Enviar'}</button>
            </form>}
            {error && <p id="match-chat-error" role="alert" className={styles.error}>{error}</p>}
            <label className={styles.mute}><input type="checkbox" checked={muted} onChange={event => setMuted(event.target.checked)} /> Silenciar chat</label>
          </div>
        </> : <div className={styles.quick}><EmoteTray inline emotes={quick} cooldown={quickCooldown} onSend={text => { onQuickSend(text); setOpen(false) }} /></div>}
      </section>
    </div>, document.body)}
  </>
}
