export type Suit = 'espada' | 'basto' | 'oro' | 'copa'
export type Card = { suit: Suit; value: number; rank: number }

export function getRank(value: number, suit: Suit): number {
  if (value === 1 && suit === 'espada') return 1
  if (value === 1 && suit === 'basto') return 2
  if (value === 7 && suit === 'espada') return 3
  if (value === 7 && suit === 'oro') return 4
  if (value === 3) return 5
  if (value === 2) return 6
  if (value === 1 && (suit === 'copa' || suit === 'oro')) return 7
  if (value === 12) return 8
  if (value === 11) return 9
  if (value === 10) return 10
  if (value === 7 && (suit === 'copa' || suit === 'basto')) return 11
  if (value === 6) return 12
  if (value === 5) return 13
  if (value === 4) return 14
  return 15
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['espada', 'basto', 'oro', 'copa']
  const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
  const deck: Card[] = []

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, rank: getRank(value, suit) })
    }
  }

  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[]): { p1: Card[]; p2: Card[]; remaining: Card[] } {
  const shuffled = shuffleDeck(deck)
  return {
    p1: shuffled.slice(0, 3),
    p2: shuffled.slice(3, 6),
    remaining: shuffled.slice(6),
  }
}

export function getEnvidoPoints(cards: Card[]): number {
  const bySuit: Record<string, Card[]> = {}
  for (const card of cards) {
    if (!bySuit[card.suit]) bySuit[card.suit] = []
    bySuit[card.suit].push(card)
  }

  let best = 0
  for (const suit in bySuit) {
    const suitCards = bySuit[suit]
    const points = suitCards.map(c => (c.value <= 7 ? c.value : 0))
    if (suitCards.length >= 2) {
      const sum = points.reduce((a, b) => a + b, 0) + 20
      if (sum > best) best = sum
    } else {
      const max = Math.max(...points)
      if (max > best) best = max
    }
  }

  return best
}

export function getCardLabel(card: Card): string {
  const valueNames: Record<number, string> = {
    1: '1', 2: '2', 3: '3', 4: '4', 5: '5',
    6: '6', 7: '7', 10: 'S', 11: 'C', 12: 'R'
  }
  const suitNames: Record<string, string> = {
    espada: 'E', basto: 'B', oro: 'O', copa: 'C'
  }
  return `${valueNames[card.value]}${suitNames[card.suit]}`
}

export function getCardImage(card: Card): string {
  return `/cartas/${card.value}_${card.suit}.png`
}

export function compareCards(a: Card, b: Card): number {
  if (a.rank < b.rank) return 1
  if (a.rank > b.rank) return -1
  return 0
}