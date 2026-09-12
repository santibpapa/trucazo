'use client'

import { useEffect, useRef, useState } from 'react'
import type { Announce } from '@/components/game/MesaUI'
import type { TeamSnapshot } from '@/lib/team-game'
import { announcementRemaining, CANTO_SOUNDS, teamAnnouncement } from '@/lib/team-presentation'
import { playSound } from '@/lib/sounds'

export default function useTeamPresentation(snapshot: TeamSnapshot) {
  const [announce, setAnnounce] = useState<Announce | null>(null)
  const [showFinish, setShowFinish] = useState(snapshot.table.status === 'finished')
  const latest = useRef(snapshot)
  latest.current = snapshot
  const ready = useRef(false)
  const played = useRef(snapshot.game?.played.length ?? 0)
  const at = snapshot.game?.announcement?.at
  const hand = snapshot.game?.hand_number
  const status = snapshot.table.status

  useEffect(() => {
    const snap = latest.current
    const event = snap.game?.announcement
    setAnnounce(null)
    if (!event) return
    const remaining = announcementRemaining(event.at, snap.server_now)
    if (!remaining) return
    setAnnounce(teamAnnouncement(snap))
    if (ready.current && CANTO_SOUNDS[event.action]) playSound(CANTO_SOUNDS[event.action])
    const timer = setTimeout(() => setAnnounce(null), remaining)
    return () => clearTimeout(timer)
  }, [at, hand])

  useEffect(() => {
    const n = snapshot.game?.played.length ?? 0
    if (n > played.current) playSound('carta')
    played.current = n
  }, [snapshot.game?.played.length])

  useEffect(() => {
    if (status !== 'finished') { setShowFinish(false); return }
    if (showFinish) return
    const snap = latest.current
    if (ready.current && snap.my_seat != null) playSound(snap.game?.winner_team === snap.my_seat % 2 ? 'gano' : 'perdi')
    const timer = setTimeout(() => setShowFinish(true), 2000)
    return () => clearTimeout(timer)
  }, [status, showFinish])

  useEffect(() => { ready.current = true }, [])
  return { announce: announce?.hand === hand ? announce : null, showFinish }
}
