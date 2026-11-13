'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { getEnvidoPoints, getRank, type Card, type Suit } from '@/lib/truco'

const suits: { value: Suit; label: string }[] = [
  { value: 'espada', label: 'Espada' },
  { value: 'basto', label: 'Basto' },
  { value: 'oro', label: 'Oro' },
  { value: 'copa', label: 'Copa' },
]
const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

// Calculado sobre las 9.880 manos posibles de 3 cartas (mazo de 40), contra
// todas las manos que puede tener el rival con las 37 cartas restantes. Es la
// misma cuenta de la tabla de /como-ganar-al-truco, extendida a todos los tantos.
// tanto → [% de manos con ese tanto o más, % que gana siendo pie (pierde los
// empates), % que gana siendo mano (gana los empates)]
const odds: Record<number, [number, number, number]> = {
  33: [2, 99, 100], 32: [3, 97, 99], 31: [6, 95, 97], 30: [9, 92, 95],
  29: [13, 87, 92], 28: [17, 83, 87], 27: [25, 75, 83], 26: [32, 68, 75],
  25: [38, 62, 68], 24: [43, 56, 61], 23: [48, 51, 56], 22: [52, 48, 51],
  21: [56, 44, 47], 20: [60, 40, 43], 7: [70, 32, 41], 6: [79, 22, 29],
  5: [86, 14, 20], 4: [91, 9, 13], 3: [95, 5, 7], 2: [97, 2, 4],
  1: [99, 1, 2], 0: [100, 0, 1],
}

const defaults: Card[] = [
  { suit: 'espada', value: 1, rank: getRank(1, 'espada') },
  { suit: 'oro', value: 6, rank: getRank(6, 'oro') },
  { suit: 'oro', value: 7, rank: getRank(7, 'oro') },
]

function encode(card: Card) {
  return `${card.suit}-${card.value}`
}

function decode(value: string | null): Card | null {
  if (!value) return null
  const [suit, rawValue] = value.split('-')
  const cardValue = Number(rawValue)
  if (!suits.some(item => item.value === suit) || !values.includes(cardValue)) return null
  return {
    suit: suit as Suit,
    value: cardValue,
    rank: getRank(cardValue, suit as Suit),
  }
}

function explanation(cards: Card[], result: number) {
  for (const suit of suits) {
    const matching = cards
      .filter(card => card.suit === suit.value)
      .map(card => (card.value <= 7 ? card.value : 0))
      .sort((a, b) => b - a)
    if (matching.length >= 2 && matching[0] + matching[1] + 20 === result) {
      return `${matching[0]} + ${matching[1]} + 20 por las dos cartas de ${suit.label.toLowerCase()}.`
    }
  }
  return `${result}: la carta numérica más alta, porque no hay dos del mismo palo.`
}

export default function EnvidoCalculator() {
  const [cards, setCards] = useState<Card[]>(defaults)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams(window.location.hash.startsWith('#/') ? window.location.hash.split('?')[1] : window.location.search)
      const parsed = [decode(params.get('c1')), decode(params.get('c2')), decode(params.get('c3'))]
      if (parsed.every(Boolean)) {
        const valid = parsed as Card[]
        if (new Set(valid.map(encode)).size === 3) setCards(valid)
      }
      setReady(true)
    }
    load()
    window.addEventListener('hashchange', load)
    window.addEventListener('popstate', load)
    return () => { window.removeEventListener('hashchange', load); window.removeEventListener('popstate', load) }
  }, [])

  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams()
    cards.forEach((card, index) => params.set(`c${index + 1}`, encode(card)))
    const path = window.location.hash.startsWith('#/') ? window.location.hash.split('?')[0] : window.location.pathname
    window.history.replaceState(null, '', `${path}?${params.toString()}`)
  }, [cards, ready])

  const duplicated = new Set(cards.map(encode)).size !== cards.length
  const result = duplicated ? null : getEnvidoPoints(cards)

  function updateCard(index: number, field: 'suit' | 'value', value: string) {
    setCards(current => current.map((card, cardIndex) => {
      if (cardIndex !== index) return card
      const suit = field === 'suit' ? value as Suit : card.suit
      const cardValue = field === 'value' ? Number(value) : card.value
      return { suit, value: cardValue, rank: getRank(cardValue, suit) }
    }))
  }

  async function share() {
    const params = new URLSearchParams()
    cards.forEach((card, index) => params.set(`c${index + 1}`, encode(card)))
    const url = `https://www.trucazo.com.ar/calculadora-envido?${params.toString()}`
    const text = result == null ? 'Calculadora de envido de Trucazo' : `Tengo ${result} de envido.`
    if (navigator.share) {
      await navigator.share({ title: 'Calculadora de envido', text, url }).catch(() => null)
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card, index) => (
          <fieldset key={index} className="rounded-xl border border-line bg-base p-3">
            <legend className="px-1 text-sm font-semibold text-gold">Carta {index + 1}</legend>
            <label className="block text-xs text-subtle" htmlFor={`value-${index}`}>Número</label>
            <select
              id={`value-${index}`}
              value={card.value}
              onChange={event => updateCard(index, 'value', event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-cream"
            >
              {values.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="mt-3 block text-xs text-subtle" htmlFor={`suit-${index}`}>Palo</label>
            <select
              id={`suit-${index}`}
              value={card.suit}
              onChange={event => updateCard(index, 'suit', event.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-cream"
            >
              {suits.map(suit => <option key={suit.value} value={suit.value}>{suit.label}</option>)}
            </select>
          </fieldset>
        ))}
      </div>

      {duplicated ? (
        <p className="mt-5 rounded-xl border border-negative/40 bg-negative/15 p-4 text-negative">
          Una carta no puede repetirse dentro de la misma mano.
        </p>
      ) : (
        <div className="mt-5 rounded-xl border border-gold/30 bg-gold-soft/35 p-5 text-center" aria-live="polite">
          <p className="text-sm uppercase tracking-[0.15em] text-muted">Tu tanto es</p>
          <p className="mt-1 font-display text-5xl font-extrabold text-gold">{result}</p>
          <p className="mt-2 text-sm text-cream/90">{explanation(cards, result ?? 0)}</p>
          {result != null && odds[result] && (
            <div className="mt-4 border-t border-gold/20 pt-4 text-sm">
              <p className="text-muted">Cuántas veces gana tu tanto</p>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-subtle">Siendo mano</dt>
                  <dd className="font-display text-2xl font-bold text-cream">{odds[result][2]}%</dd>
                </div>
                <div>
                  <dt className="text-subtle">Siendo pie</dt>
                  <dd className="font-display text-2xl font-bold text-cream">{odds[result][1]}%</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-subtle">
                Contra una mano cualquiera. El {odds[result][0]}% de las manos tiene este tanto o más.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button variant="ghost" size="sm" onClick={share} disabled={duplicated}>
          {copied ? 'Enlace copiado' : 'Compartir esta mano'}
        </Button>
      </div>
    </div>
  )
}
