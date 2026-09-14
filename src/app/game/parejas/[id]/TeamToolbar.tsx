'use client'

import { useEffect, useRef, useState } from 'react'
import { isMuted, setMuted } from '@/lib/sounds'
import type { TeamChatLine, TeamMember } from '@/lib/team-game'
import { EmoteTray, MesaToolbar } from '@/components/game/MesaUI'
import { teamChatBubbles } from '@/lib/team-presentation'
import { TEAM_EMOTES } from '@/lib/emotes'
import styles from './team.module.css'

/** El chat rápido es público para toda la mesa, como en 1vs1. Pasa por el
 *  servidor (no de navegador a navegador) por dos motivos: los cuatro ven lo
 *  mismo, y los bots compañeros pueden escuchar lo que se les dice. Nunca es
 *  una acción del motor: no mueve el turno ni la versión de la mesa. */
export default function TeamToolbar({ chat, members, mySeat, playing, offset, onSay }: {
  chat: TeamChatLine[]; members: TeamMember[]; mySeat: number; playing: boolean
  offset: number; onSay: (text: string) => void
}) {
  const [muted, updateMuted] = useState(false)
  const [tray, setTray] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [, redraw] = useState(0)
  const lastSent = useRef(0)
  useEffect(() => { updateMuted(isMuted()) }, [])
  // Las frases traen su hora del servidor: hay que repasar sola cuál toca
  // mostrar, porque las de los bots llegan agendadas un momento después.
  // Mientras nadie haya hablado no hay nada que repasar.
  useEffect(() => {
    if (chat.length === 0) return
    const timer = setInterval(() => redraw(n => n + 1), 400)
    return () => clearInterval(timer)
  }, [chat])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(false), 3000)
    return () => clearTimeout(timer)
  }, [cooldown])
  return <>
    <MesaToolbar muted={muted} onToggleMute={() => { setMuted(!muted); updateMuted(!muted) }} emoteTray={tray} onToggleEmotes={() => setTray(v => !v)} />
    {tray && <EmoteTray emotes={TEAM_EMOTES} cooldown={cooldown || !playing} onSend={text => {
      if (!playing || Date.now() - lastSent.current < 3000) return
      lastSent.current = Date.now()
      onSay(text); setTray(false); setCooldown(true)
    }} />}
    {teamChatBubbles(chat, mySeat, Date.now() + offset).map(bubble => <div key={bubble.seat}
      className={`${styles.emote} ${styles[`emote${bubble.relative}`]} rounded-2xl border border-line bg-base/90 backdrop-blur px-3 py-1.5 text-lg shadow-card animate-scale-in`}>
      <span className="sr-only">{members.find(m => m.seat === bubble.seat)?.username}: </span>{bubble.text}
    </div>)}
  </>
}
