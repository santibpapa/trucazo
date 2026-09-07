'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Card } from '@/lib/truco'
import PlayingCard from './PlayingCard'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const timing = { duration: 460, easing: 'cubic-bezier(.22,.7,.24,1)', fill: 'both' as const }

function trajectory(dx: number, dy: number, scale: number, angle: number) {
  return [
    { transform: `translate3d(${dx}px,${dy}px,0) rotate(${angle}deg) scale(${scale})`, offset: 0 },
    { transform: `translate3d(${dx * .32}px,${dy * .32 - 12}px,0) rotate(${angle * .3}deg) scale(${1 + (scale - 1) * .32})`, offset: .62 },
    { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', offset: 1 },
  ]
}

/** Solo presentación: la RPC y sus errores conservan su comportamiento. */
export function useCardFlight(handNumber: number) {
  const stageRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [handNumber])

  async function play(source: HTMLButtonElement, round: number, card: Card, action: () => Promise<void>) {
    const stage = stageRef.current
    const target = stage?.querySelector<HTMLElement>(`[data-card-target="${round}-me"]`)
    const image = source.querySelector('img')
    if (!stage || !target || !image || reducedMotion()) return action()

    cleanupRef.current?.()
    const from = source.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    if (!from.width || !to.width) return action()
    const opponent = stage.querySelector<HTMLElement>(`[data-card-target="${round}-opponent"]`)
    const previousLayer = target.style.zIndex
    // Solo anticipa la capa visual con los rangos ya conocidos, no el resultado
    // de la ronda. Puntajes, turnos y validación siguen exclusivamente en la RPC.
    if (opponent?.dataset.cardRank) {
      target.style.zIndex = card.rank < Number(opponent.dataset.cardRank) ? '20' : '0'
    }
    const flight = document.createElement('div')
    const picture = image.cloneNode(true) as HTMLImageElement
    flight.setAttribute('aria-hidden', 'true')
    flight.dataset.cardFlight = ''
    Object.assign(flight.style, {
      position: 'absolute', left: '0', top: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none', borderRadius: '0',
      overflow: 'hidden', boxShadow: getComputedStyle(source).boxShadow,
    })
    picture.removeAttribute('class')
    Object.assign(picture.style, { width: '100%', height: '100%', display: 'block', filter: getComputedStyle(image).filter })
    flight.append(picture)
    // Comparte el contexto de capas del destino durante todo el recorrido.
    target.append(flight)
    stage.dataset.flyingRound = String(round)
    const matrix = new DOMMatrixReadOnly(getComputedStyle(source.parentElement!).transform)
    const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI
    const animation = flight.animate(trajectory(
      from.x + from.width / 2 - to.x - to.width / 2,
      from.y + from.height / 2 - to.y - to.height / 2,
      source.offsetWidth / to.width, angle,
    ), timing)
    const cleanup = () => {
      animation.cancel()
      flight.remove()
      target.style.zIndex = previousLayer
      delete stage.dataset.flyingRound
      if (cleanupRef.current === cleanup) cleanupRef.current = null
    }
    cleanupRef.current = cleanup
    try {
      // La carta viaja al tocarla, incluso si el servidor tarda en responder.
      // Se entrega a la carta confirmada por React en el siguiente fotograma.
      await Promise.all([action(), animation.finished.catch(() => {})])
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    } finally {
      cleanup()
    }
  }
  return { stageRef, play }
}

/** Las cartas nuevas del rival viajan desde su mano; el historial no se repite. */
export function TableCard({ card, owner, motionKey, animate }: {
  card: Card
  owner: 'me' | 'opponent'
  motionKey: string
  animate: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    const stage = element?.closest<HTMLElement>('[data-card-stage]')
    if (!element || !stage || !animate || reducedMotion()) return
    if (owner === 'me' && stage.dataset.flyingRound) return
    const hand = stage.querySelector<HTMLElement>(`[data-card-hand="${owner}"]`)
    if (!hand) return
    const from = hand.getBoundingClientRect()
    const to = element.getBoundingClientRect()
    if (!to.width) return
    const animation = element.animate(trajectory(
      from.x + from.width / 2 - to.x - to.width / 2,
      from.y + from.height / 2 - to.y - to.height / 2,
      owner === 'opponent' ? .75 : 1.2, owner === 'opponent' ? -7 : 5,
    ), timing)
    return () => animation.cancel()
  }, [motionKey, owner, animate])
  return <div ref={ref} data-table-card><PlayingCard card={card} /></div>
}
