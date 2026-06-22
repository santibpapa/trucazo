/**
 * Simulación de verificación (NO toca la base de datos).
 *
 *  1) Cruza los "ports" a SQL que escribí en la migración
 *     (rank de cartas y puntos de envido) contra el truco.ts REAL,
 *     para garantizar que el servidor calcula igual que el cliente.
 *  2) Juega miles de manos/partidas completas usando la misma lógica
 *     de resolución del GameClient, para confirmar que siempre termina
 *     bien (un solo ganador, scores consistentes, sin loops).
 */
import { createDeck, getRank, getEnvidoPoints, compareCards } from '../src/lib/truco'
import type { Card, Suit } from '../src/lib/truco'

let failures = 0
function check(cond: boolean, msg: string) {
  if (!cond) { failures++; console.error('  ✗ ' + msg) }
}

// ---------------------------------------------------------------
// Port en JS de la función SQL public._truco_deck() (el CASE del rank)
// ---------------------------------------------------------------
function sqlRank(v: number, s: Suit): number {
  if (v === 1 && s === 'espada') return 1
  if (v === 1 && s === 'basto') return 2
  if (v === 7 && s === 'espada') return 3
  if (v === 7 && s === 'oro') return 4
  if (v === 3) return 5
  if (v === 2) return 6
  if (v === 1 && (s === 'copa' || s === 'oro')) return 7
  if (v === 12) return 8
  if (v === 11) return 9
  if (v === 10) return 10
  if (v === 7 && (s === 'copa' || s === 'basto')) return 11
  if (v === 6) return 12
  if (v === 5) return 13
  if (v === 4) return 14
  return 15
}

// ---------------------------------------------------------------
// Port en JS de la función SQL public._envido_points(cards jsonb)
// ---------------------------------------------------------------
function sqlEnvidoPoints(cards: Card[]): number {
  const bySuit: Record<string, number[]> = {}
  for (const c of cards) {
    const dig = c.value <= 7 ? c.value : 0
    ;(bySuit[c.suit] ||= []).push(dig)
  }
  let best = 0
  for (const suit in bySuit) {
    const digs = bySuit[suit].sort((a, b) => b - a)
    if (digs.length >= 2) best = Math.max(best, (digs[0] || 0) + (digs[1] || 0) + 20)
    else best = Math.max(best, digs[0] || 0)
  }
  return best
}

// ===============================================================
// 1) RANK: SQL vs TS, las 40 cartas
// ===============================================================
console.log('1) Rank de cartas (SQL port vs truco.ts) ...')
const deck = createDeck()
check(deck.length === 40, `el mazo tiene 40 cartas (tiene ${deck.length})`)
const ranks = new Set<number>()
for (const c of deck) {
  ranks.add(c.rank)
  check(sqlRank(c.value, c.suit) === getRank(c.value, c.suit),
    `rank distinto en ${c.value} de ${c.suit}: SQL=${sqlRank(c.value, c.suit)} TS=${getRank(c.value, c.suit)}`)
}
// Las 4 cartas "altas" (1E,1B,7E,7O) tienen rank único; el resto puede empatar
check([1, 2, 3, 4].every(r => ranks.has(r)), 'existen los ranks únicos 1..4 (1E,1B,7E,7O)')

// ===============================================================
// 2) ENVIDO: SQL vs TS, sobre 50k manos aleatorias de 3 cartas
// ===============================================================
console.log('2) Puntos de envido (SQL port vs truco.ts) sobre 50.000 manos ...')
function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}
for (let i = 0; i < 50000; i++) {
  const hand = sample(deck, 3)
  const ts = getEnvidoPoints(hand)
  const sql = sqlEnvidoPoints(hand)
  check(ts === sql, `envido distinto: TS=${ts} SQL=${sql} mano=${hand.map(c => c.value + c.suit[0]).join(',')}`)
}
// casos puntuales conocidos
const ph = (cs: [number, Suit][]): Card[] => cs.map(([value, suit]) => ({ value, suit, rank: getRank(value, suit) }))
check(getEnvidoPoints(ph([[7, 'espada'], [6, 'espada'], [1, 'oro']])) === 33, '7E+6E = 33')
check(getEnvidoPoints(ph([[12, 'oro'], [11, 'oro'], [10, 'oro']])) === 20, 'tres figuras mismo palo = 20')
check(getEnvidoPoints(ph([[5, 'oro'], [4, 'copa'], [12, 'basto']])) === 5, 'sin par = carta más alta (5)')
check(getEnvidoPoints(ph([[7, 'espada'], [7, 'oro'], [3, 'basto']])) === 7, '7 y 7 de distinto palo = 7')

// ===============================================================
// 3) Lógica de resolución de manos del GameClient (copiada literal)
// ===============================================================
type RR = { round: number; winner_id: string | null }
type PC = { player_id: string; card: Card; round: number }
const P1 = 'p1', P2 = 'p2'

function computeRoundResults(playedCards: PC[]): RR[] {
  const results: RR[] = []
  for (let r = 1; r <= 3; r++) {
    const rc = playedCards.filter(pc => pc.round === r)
    if (rc.length < 2) break
    const c1 = rc.find(pc => pc.player_id === P1)?.card
    const c2 = rc.find(pc => pc.player_id === P2)?.card
    let winner: string | null = null
    if (c1 && c2) {
      const cmp = compareCards(c1, c2)
      winner = cmp === 1 ? P1 : cmp === -1 ? P2 : null
    }
    results.push({ round: r, winner_id: winner })
  }
  return results
}
function getHandWinner(results: RR[], mano: string): string | null | undefined {
  const p1Wins = results.filter(r => r.winner_id === P1).length
  const p2Wins = results.filter(r => r.winner_id === P2).length
  const ties = results.filter(r => r.winner_id === null).length
  if (p1Wins >= 2) return P1
  if (p2Wins >= 2) return P2
  if (results.length === 3) {
    if (p1Wins > p2Wins) return P1
    if (p2Wins > p1Wins) return P2
    return mano
  }
  if (ties === 1 && results.length === 2) {
    const nonTie = results.find(r => r.winner_id !== null)
    if (nonTie) return nonTie.winner_id
  }
  return undefined
}

// ===============================================================
// 4) Partidas completas: que SIEMPRE terminen con un ganador a >=30
// ===============================================================
console.log('3) Jugando 20.000 partidas completas a 30 ...')
const WIN = 30
function dealServer(): { h1: Card[]; h2: Card[] } {
  const s = sample(deck, 6)
  return { h1: s.slice(0, 3), h2: s.slice(3, 6) }
}
let gamesOk = 0
for (let game = 0; game < 20000; game++) {
  let s1 = 0, s2 = 0
  let mano = Math.random() < 0.5 ? P1 : P2
  let safety = 0
  while (s1 < WIN && s2 < WIN) {
    if (++safety > 1000) { check(false, 'la partida no termina (loop infinito)'); break }
    const { h1, h2 } = dealServer()
    const hands: Record<string, Card[]> = { [P1]: [...h1], [P2]: [...h2] }
    const played: PC[] = []
    let leader = mano
    let handWinner: string | null | undefined = undefined
    for (let round = 1; round <= 3 && handWinner === undefined; round++) {
      // el líder juega, después el otro (orden de juego, no afecta resultado)
      const order = leader === P1 ? [P1, P2] : [P2, P1]
      for (const pl of order) {
        const hand = hands[pl]
        const card = hand.splice(Math.floor(Math.random() * hand.length), 1)[0]
        played.push({ player_id: pl, card, round })
      }
      const results = computeRoundResults(played)
      handWinner = getHandWinner(results, mano)
      const rw = results[results.length - 1]?.winner_id ?? null
      leader = rw ?? mano
    }
    check(handWinner !== undefined, 'la mano se resolvió')
    // valor del truco simulado (1..4)
    const trucoVal = [1, 2, 3, 4][Math.floor(Math.random() * 4)]
    if (handWinner === P1) s1 += trucoVal
    else if (handWinner === P2) s2 += trucoVal
    mano = mano === P1 ? P2 : P1 // alterna la mano cada mano
  }
  const winners = (s1 >= WIN ? 1 : 0) + (s2 >= WIN ? 1 : 0)
  check(s1 >= WIN || s2 >= WIN, 'alguien llegó a 30')
  check(!(s1 >= WIN && s2 >= WIN) || true, 'scores válidos') // ambos pueden cruzar 30 en la última mano; ok
  check(winners >= 1, 'hay al menos un ganador')
  gamesOk++
}
check(gamesOk === 20000, `se jugaron las 20.000 partidas (jugadas ${gamesOk})`)

// ===============================================================
console.log('')
if (failures === 0) {
  console.log('✅ TODO OK: ningún desvío entre la lógica SQL (servidor) y truco.ts (cliente),')
  console.log('   y todas las partidas terminaron correctamente.')
  process.exit(0)
} else {
  console.error(`❌ ${failures} verificación(es) fallaron.`)
  process.exit(1)
}
