'use client'

import { useEffect, useRef, useState } from 'react'
import type { EnvidoState, TrucoState } from '@/lib/types'
import type { Card } from '@/lib/truco'
import type { MomentoFrase } from '@/lib/botFrases'
import { playSound } from '@/lib/sounds'
import type { Announce } from './MesaUI'

const ENVIDO_LABEL: Record<string, string> = { envido: 'envido', real_envido: 'real envido', falta_envido: 'falta envido' }
const TRUCO_LABEL: Record<string, string> = { truco: 'truco', retruco: 'retruco', vale_cuatro: 'vale cuatro' }

export function useGameAnnouncements({ game, currentUserId, myUsername, opponentUsername, isPlayer1, soundReadyRef, botHabla }: {
  game: { status: string; hand_number: number; mano_player: string; player1_id: string; awaiting_deal: boolean; envido_reveal: { player_id: string; cards: Card[] } | null;
    envido_state: Omit<EnvidoState, 'status'> & { status: string }; truco_state: Omit<TrucoState, 'status'> & { status: string } }
  currentUserId: string; myUsername: string; opponentUsername: string; isPlayer1: boolean
  soundReadyRef: React.MutableRefObject<boolean>; botHabla: (moment: MomentoFrase) => void
}) {
  const manoDeclared = game.envido_state.mano_declared
  // Cartel central de anuncios (cantos y resultados), sale del lado del que actuó
  const [announce, setAnnounce] = useState<Announce | null>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot del truco_state previo, para detectar el "no quiero" (canto pendiente → mano nueva)
  const prevTrucoRef = useRef<{ status: string; singer: string | null; value: number; hand: number } | null>(null)
  // Anuncio del envido: canto (envido/real/falta, lado del que canta) y resultado
  // (quiero/no quiero, lado del que responde). Depende de status/last_singer/winner.
  useEffect(() => {
    const es = game.envido_state
    const st = es.status
    const chain = es.chain ?? []
    const tier = chain[chain.length - 1] ?? 'envido'

    // Canto
    if (st === 'envido' || st === 'real_envido' || st === 'falta_envido') {
      const mine = es.last_singer === currentUserId
      if (soundReadyRef.current) {
        playSound(st === 'real_envido' ? 'real-envido' : st === 'falta_envido' ? 'falta-envido' : 'envido')
      }
      showAnnounce({
        side: mine ? 'bottom' : 'top',
        title: ENVIDO_LABEL[tier] ?? 'envido',
        titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${mine ? myUsername : opponentUsername}`,
      })
      if (!mine) botHabla('canta_envido')
      return
    }

    // Diálogo de tantos (después del "quiero")
    if (st === 'declaring') {
      if (manoDeclared == null) {
        // Recién aceptado: "Quiero" (lo dijo el que respondió, no el cantor)
        const responderIsMe = es.last_singer !== currentUserId
        if (soundReadyRef.current) playSound('quiero')
        showAnnounce({ side: responderIsMe ? 'bottom' : 'top',
          eyebrow: ENVIDO_LABEL[tier] ?? 'envido', title: 'Quiero', titleClass: 'text-cream' })
        if (!responderIsMe) botHabla('quiere')
      } else {
        // La mano declaró su tanto
        const manoIsMe = game.mano_player === currentUserId
        showAnnounce({ side: manoIsMe ? 'bottom' : 'top',
          title: `Tengo ${manoDeclared}`, titleClass: 'text-gold uppercase tracking-wide' })
      }
      return
    }

    // Resultado
    if ((st === 'accepted' || st === 'rejected') && es.winner_id != null) {
      const responderIsMe = es.last_singer !== currentUserId
      const side: 'top' | 'bottom' = responderIsMe ? 'bottom' : 'top'
      const won = es.winner_id === currentUserId
      const eyebrow = ENVIDO_LABEL[tier] ?? 'envido'

      if (st === 'rejected') {
        if (soundReadyRef.current) playSound('no-quiero')
        showAnnounce({ side, eyebrow, title: 'No quiero', titleClass: 'text-cream' })
        if (!responderIsMe) botHabla('no_quiere')
        return
      }

      const theirs = isPlayer1 ? es.player2_points : es.player1_points
      const mineP = isPlayer1 ? es.player1_points : es.player2_points
      // "Son buenas": alguien no reveló su tanto (queda null). Si están los dos, tablero.
      const hidden = mineP == null || theirs == null

      if (hidden) {
        // El tanto del pie queda oculto; solo mostramos el resultado, sin puntos.
        showAnnounce({ side, eyebrow,
          title: won ? 'Son buenas' : 'Perdiste',
          titleClass: won ? 'text-positive' : 'text-negative' })
      } else {
        // Ambos tantos visibles → tablero de 2 columnas (vos / rival).
        showAnnounce({
          side,
          title: (ENVIDO_LABEL[tier] ?? 'envido').toUpperCase(),
          titleClass: 'text-gold',
          score: {
            left: { label: 'Vos', points: mineP ?? null, won },
            right: { label: opponentUsername, points: theirs ?? null, won: !won },
          },
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.envido_state.status, game.envido_state.last_singer, game.envido_state.winner_id, game.envido_state.mano_declared])

  // "33 en mesa": el ganador del envido cerró la mano sin mostrar las cartas de
  // su tanto, así que se bajan a la mesa y se anuncia como un canto.
  useEffect(() => {
    if ((!game.awaiting_deal && game.status !== 'finished') || !game.envido_reveal) return
    const mine = game.envido_reveal.player_id === currentUserId
    const pts = game.envido_reveal.player_id === game.player1_id
      ? game.envido_state.player1_points
      : game.envido_state.player2_points
    if (soundReadyRef.current) playSound('carta')
    showAnnounce({
      side: mine ? 'bottom' : 'top',
      title: pts != null ? `${pts} en mesa` : 'en mesa',
      titleClass: 'text-gold uppercase tracking-wide',
    })
    // Deps booleanas: cada update del server trae un objeto envido_reveal nuevo
    // con el mismo contenido, y no queremos re-disparar el sonido/cartel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.awaiting_deal || game.status === 'finished', !!game.envido_reveal])

  // Anuncio central del truco: canto, "quiero" y "no quiero".
  // El "no quiero" se infiere: un canto pendiente solo puede terminar en mano
  // nueva si lo rechazaron (no se puede ir al mazo ni ganar la mano con un canto
  // sin responder), así que "antes pendiente + hand_number subió" = no quiero.
  useEffect(() => {
    const ts = game.truco_state
    const st = ts.status
    const prev = prevTrucoRef.current

    if ((game.awaiting_deal || game.status === 'finished') && game.envido_reveal) return

    if (st === 'truco' || st === 'retruco' || st === 'vale_cuatro') {
      // Canto: lado del que canta
      const byMe = ts.last_singer === currentUserId
      if (soundReadyRef.current) {
        playSound(st === 'vale_cuatro' ? 'vale-cuatro' : st === 'retruco' ? 'retruco' : 'truco')
      }
      showAnnounce({ side: byMe ? 'bottom' : 'top',
        title: TRUCO_LABEL[st] ?? 'truco', titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${byMe ? myUsername : opponentUsername}` })
      if (!byMe) botHabla(st === 'truco' ? 'canta_truco' : 'sube')
    } else if (st === 'accepted' && prev?.status !== 'accepted') {
      // Quiero: lado del que responde (no es el que cantó)
      const responderIsMe = ts.last_singer !== currentUserId
      if (soundReadyRef.current) playSound('quiero')
      showAnnounce({ side: responderIsMe ? 'bottom' : 'top',
        eyebrow: 'Truco', title: 'Quiero', titleClass: 'text-cream' })
      if (!responderIsMe) botHabla('quiere')
    } else if (st === 'rejected' && prev?.status !== 'rejected') {
      // No quiero: el que cantó (last_singer) gana el valor anterior. El cartel
      // sale del lado del que rechazó (el que NO es el cantor).
      const winnerIsMe = ts.last_singer === currentUserId
      const canto =
        prev && ['truco', 'retruco', 'vale_cuatro'].includes(prev.status)
          ? (TRUCO_LABEL[prev.status] ?? 'truco')
          : ts.value === 4 ? 'vale cuatro' : ts.value === 3 ? 'retruco' : 'truco'
      if (soundReadyRef.current) playSound('no-quiero')
      showAnnounce({ side: winnerIsMe ? 'top' : 'bottom',
        eyebrow: canto, title: 'No quiero', titleClass: 'text-cream' })
      if (winnerIsMe) botHabla('no_quiere')
    }

    prevTrucoRef.current = { status: st, singer: ts.last_singer ?? null, value: ts.value ?? 1, hand: game.hand_number }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.truco_state.status, game.truco_state.last_singer, game.hand_number])

  // Al empezar una mano nueva, descartamos cualquier cartel que haya quedado de
  // una mano anterior (p. ej. el "No quiero" del truco), para no tapar la mesa
  // nueva. El cartel que nace junto con la mano nueva queda etiquetado con ella,
  // así que no se descarta.
  useEffect(() => {
    setAnnounce(prev => (prev && prev.hand != null && prev.hand < game.hand_number ? null : prev))
  }, [game.hand_number])


  // Muestra un cartel de anuncio y lo autodescarta (cancelando el anterior).
  // Lo etiquetamos con la mano actual para poder descartarlo al empezar otra.
  function showAnnounce(a: Announce, ms = 3600) {
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setAnnounce({ ...a, hand: game.hand_number })
    announceTimer.current = setTimeout(() => setAnnounce(null), ms)
  }
  useEffect(() => () => { if (announceTimer.current) clearTimeout(announceTimer.current) }, [])
  return { announce, showAnnounce }
}
