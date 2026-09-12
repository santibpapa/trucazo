'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isMuted, setMuted } from '@/lib/sounds'
import type { TeamMember } from '@/lib/team-game'
import { EMOTES, EmoteTray, MesaToolbar } from '@/components/game/MesaUI'
import styles from './team.module.css'

/** El chat rápido es público para toda la mesa, como en 1vs1. Nunca es una acción del motor. */
export default function TeamToolbar({ tableId, userId, members, mySeat, playing }: {
  tableId: string; userId: string; members: TeamMember[]; mySeat: number; playing: boolean
}) {
  const [muted, updateMuted] = useState(false)
  const [tray, setTray] = useState(false)
  const [emote, setEmote] = useState<{ userId: string; text: string } | null>(null)
  const [cooldown, setCooldown] = useState(false)
  const lastSent = useRef(0)
  const roster = useRef(members)
  roster.current = members
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  useEffect(() => { updateMuted(isMuted()) }, [])
  useEffect(() => {
    if (!playing) return
    const channel = supabase.channel(`team-chat-${tableId}`)
      .on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (typeof payload?.text !== 'string' || !EMOTES.includes(payload.text)) return
        if (!roster.current.some(m => m.user_id === payload.userId)) return
        setEmote({ userId: payload.userId, text: payload.text })
      }).subscribe()
    channelRef.current = channel
    return () => { void supabase.removeChannel(channel); channelRef.current = null }
  }, [tableId, playing, supabase])
  useEffect(() => {
    if (!emote) return
    const timer = setTimeout(() => setEmote(null), 2800)
    return () => clearTimeout(timer)
  }, [emote])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(false), 3000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const sender = members.find(m => m.user_id === emote?.userId)
  const relative = sender?.seat == null ? 0 : (sender.seat - mySeat + 4) % 4
  return <>
    <MesaToolbar muted={muted} onToggleMute={() => { setMuted(!muted); updateMuted(!muted) }} emoteTray={tray} onToggleEmotes={() => setTray(v => !v)} />
    {tray && <EmoteTray cooldown={cooldown || !playing} onSend={text => {
      if (!playing || Date.now() - lastSent.current < 3000) return
      lastSent.current = Date.now()
      void channelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { userId, text } })
      setEmote({ userId, text }); setTray(false); setCooldown(true)
    }} />}
    {emote && <div className={`${styles.emote} ${styles[`emote${relative}`]} rounded-2xl border border-line bg-base/90 backdrop-blur px-3 py-1.5 text-lg shadow-card animate-scale-in`}>
      <span className="sr-only">{sender?.username}: </span>{emote.text}
    </div>}
  </>
}
