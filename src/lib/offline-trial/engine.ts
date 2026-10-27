import { createDeck, getEnvidoPoints, type Card } from '../truco'
import { BOTS_VERSION, STRATEGIES, decideBot, handPower, type BotSetup, type CampaignStyle } from './bots'

export const VERSION = 'tobias-v1'
export const BOT = 'b0700000-0000-4000-a000-000000000001'
export const RIVAL = 'c1a70000-0000-4000-b000-000000000001'
type EnvidoType = 'envido' | 'real_envido' | 'falta_envido'
type TrucoType = 'truco' | 'retruco' | 'vale_cuatro'
export type Action = { player: string; type: string; value?: string; card?: Card; accept?: boolean }
type Call = { status: string; value: number; last_singer: string | null }
type Envido = Call & { chain: string[]; declare_turn?: string; mano_declared?: number | null;
  winner_id?: string; player1_points?: number | null; player2_points?: number | null; awarded?: number }
export type Game = {
  id: string; player1_id: string; player2_id: string; status: 'playing' | 'finished';
  player1_score: number; player2_score: number; target_score: 15 | 30; winner_id: string | null;
  mano_player: string; current_turn: string; hand_number: number; round_number: number;
  played_cards: { player_id: string; card: Card; round: number }[];
  round_results: { round: number; winner_id: string | null }[];
  envido_state: Envido; truco_state: Call; awaiting_deal: boolean;
  envido_reveal: { player_id: string; cards: Card[] } | null;
}
export type Trial = {
  version: string; id: string; owner: string; rival: string; seed: number; rng: number; revision: number;
  game: Game; hands: [Card[], Card[]]; actions: { action: Action; rng: number }[];
  bot?: BotSetup & { initial_style: CampaignStyle };
  result: { status: 'trial-only'; winner: string; scores: number[] } | null;
}
const envTypes = ['envido', 'real_envido', 'falta_envido']
const trTypes = ['truco', 'retruco', 'vale_cuatro']
const pendingEnv = (g: Game) => envTypes.includes(g.envido_state.status)
const pendingTr = (g: Game) => trTypes.includes(g.truco_state.status)
const other = (g: Game, p: string) => p === g.player1_id ? g.player2_id : g.player1_id
const index = (g: Game, p: string) => p === g.player1_id ? 0 : 1
const requireRule = (ok: boolean, message: string) => { if (!ok) throw new Error(message) }

// Azar versionado y guardado; nunca Math.random dentro del motor.
export function random(t: Trial): number {
  let x = t.rng | 0
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  t.rng = x >>> 0
  return t.rng / 4294967296
}
function deal(t: Trial) {
  const deck = createDeck()
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random(t) * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  t.hands = [deck.slice(0, 3), deck.slice(3, 6)]
}
export function createTrial(owner: string, target: 15 | 30, seed: number, id: string): Trial {
  const t: Trial = { version: VERSION, id, owner, rival: RIVAL, seed: seed >>> 0 || 1, rng: seed >>> 0 || 1,
    revision: 0, actions: [], result: null, hands: [[], []],
    game: { id, player1_id: owner, player2_id: BOT, status: 'playing',
      player1_score: 0, player2_score: 0, target_score: target, winner_id: null,
      mano_player: owner, current_turn: owner, hand_number: 1, round_number: 1,
      played_cards: [], round_results: [], envido_state: { status: 'none', value: 0, last_singer: null, chain: [] },
      truco_state: { status: 'none', value: 1, last_singer: null }, awaiting_deal: false, envido_reveal: null } }
  t.game.mano_player = random(t) < .5 ? owner : BOT
  t.game.current_turn = t.game.mano_player
  deal(t)
  return t
}
// Ensayos de los demás rivales: configuración y lectura quedan en el guardado.
export function createBotTrial(owner: string, setup: BotSetup, seed: number, id: string): Trial {
  const r = setup.rival
  requireRule(r.bot_id !== owner, 'El rival necesita una identidad distinta.')
  requireRule(r.strategy_profile == null || STRATEGIES.some(s => s === r.strategy_profile), 'Estrategia no compatible.')
  requireRule(!r.strategy_profile || r.target_score === 30, 'Los rivales del Noroeste juegan a 30.')
  const t = createTrial(owner, r.target_score, seed, id)
  t.version = BOTS_VERSION; t.rival = r.id
  t.bot = { ...structuredClone(setup), initial_style: structuredClone(setup.style) }
  t.game.player2_id = r.bot_id
  if (t.game.mano_player === BOT) t.game.mano_player = r.bot_id
  t.game.current_turn = t.game.mano_player
  t.bot.style.hands_played++
  return t
}
function fullHand(t: Trial, p: string) {
  return [...t.hands[index(t.game, p)], ...t.game.played_cards.filter(c => c.player_id === p).map(c => c.card)]
}
function nextPlayer(g: Game): string {
  const played = g.played_cards.find(c => c.round === g.round_number)
  return played ? other(g, played.player_id) : g.round_results[g.round_number - 2]?.winner_id ?? g.mano_player
}
function afterEnv(g: Game) { return pendingTr(g) ? other(g, g.truco_state.last_singer!) : nextPlayer(g) }
export function envidoValue(chain: string[], g: Game): number {
  return chain.includes('falta_envido') ? g.target_score - Math.max(g.player1_score, g.player2_score)
    : chain.reduce((v, c) => v + (c === 'envido' ? 2 : c === 'real_envido' ? 3 : 0), 0)
}
function rejectValue(chain: string[], g: Game) { return chain.length <= 1 ? 1 : Math.max(1, envidoValue(chain.slice(0, -1), g)) }
function addScore(g: Game, p: string, value: number) {
  if (p === g.player1_id) g.player1_score += value
  else g.player2_score += value
}
function finish(t: Trial): boolean {
  const g = t.game
  if (g.player1_score < g.target_score && g.player2_score < g.target_score) return false
  g.status = 'finished'
  g.winner_id = g.player1_score >= g.target_score ? g.player1_id : g.player2_id
  t.result = { status: 'trial-only', winner: g.winner_id, scores: [g.player1_score, g.player2_score] }
  return true
}
function reveal(t: Trial) {
  const g = t.game, es = g.envido_state
  if (!['accepted', 'mazo'].includes(es.status) || !es.winner_id) return null
  const hand = fullHand(t, es.winner_id)
  const groups = new Map<string, Card[]>()
  for (const c of hand) groups.set(c.suit, [...(groups.get(c.suit) ?? []), c])
  let best = -1, winning: Card[] = []
  for (const cards of Array.from(groups.values())) {
    cards.sort((a, b) => (b.value <= 7 ? b.value : 0) - (a.value <= 7 ? a.value : 0))
    const pair = cards.slice(0, 2)
    const points = getEnvidoPoints(pair)
    if (points > best) { best = points; winning = pair }
  }
  const shown = g.played_cards.filter(c => c.player_id === es.winner_id).map(c => c.card)
  const cards = winning.filter(c => !shown.some(s => s.suit === c.suit && s.value === c.value))
  return cards.length ? { player_id: es.winner_id, cards } : null
}
function apply(t: Trial, a: Action) {
  const g = t.game, p = a.player, opp = other(g, p), es = g.envido_state, tr = g.truco_state
  requireRule(p === g.player1_id || p === g.player2_id, 'No sos jugador de esta partida.')
  requireRule(g.status === 'playing', 'La partida terminó.')
  if (a.type === 'advance_hand') {
    requireRule(g.awaiting_deal, 'La mano todavía sigue.')
    if (finish(t)) { g.awaiting_deal = false; return }
    g.mano_player = other(g, g.mano_player); g.current_turn = g.mano_player
    g.hand_number++; g.round_number = 1; g.played_cards = []; g.round_results = []
    g.envido_state = { status: 'none', value: 0, last_singer: null, chain: [] }
    g.truco_state = { status: 'none', value: 1, last_singer: null }
    g.envido_reveal = null; g.awaiting_deal = false
    deal(t); return
  }
  requireRule(!g.awaiting_deal, 'Esperando la próxima mano.')
  if (a.type === 'sing_envido') {
    const kind = a.value as EnvidoType
    requireRule(envTypes.includes(kind), 'Canto inválido.')
    if (pendingEnv(g) && es.last_singer !== p) {
      requireRule(kind === 'envido' ? es.status === 'envido' && es.chain.filter(c => c === 'envido').length < 2
        : kind === 'real_envido' ? es.status === 'envido' : ['envido', 'real_envido'].includes(es.status), 'No podés subir así el envido.')
    } else {
      requireRule(es.status === 'none' && g.round_number === 1 && tr.status !== 'accepted'
        && !g.played_cards.some(c => c.player_id === p)
        && (g.current_turn === p || (pendingTr(g) && tr.last_singer !== p)), 'No podés cantar envido ahora.')
    }
    const chain = [...es.chain, kind]
    g.envido_state = { status: kind, last_singer: p, value: envidoValue(chain, g), chain }
    g.current_turn = opp; return
  }
  if (a.type === 'respond_envido') {
    requireRule(pendingEnv(g) && es.last_singer !== p, 'No hay envido para responder.')
    if (a.accept) { es.status = 'declaring'; es.declare_turn = g.mano_player; es.mano_declared = null; return }
    const value = rejectValue(es.chain, g), singer = es.last_singer!
    g.current_turn = afterEnv(g)
    addScore(g, singer, value)
    Object.assign(es, { status: 'rejected', winner_id: singer, awarded: value })
    finish(t); return
  }
  if (a.type === 'envido_say') {
    requireRule(es.status === 'declaring' && es.declare_turn === p, 'No es tu turno de declarar.')
    requireRule(['tengo', 'son_buenas', 'mazo'].includes(a.value!), 'Declaración inválida.')
    if (a.value === 'mazo') {
      addScore(g, opp, es.value + (tr.status === 'accepted' ? tr.value : 1))
      Object.assign(es, { status: 'mazo', winner_id: opp })
      if (opp === g.mano_player && es.mano_declared != null) {
        if (opp === g.player1_id) es.player1_points = es.mano_declared
        else es.player2_points = es.mano_declared
        g.envido_reveal = reveal(t)
      }
      if (!finish(t)) g.awaiting_deal = true
      return
    }
    const tanto = getEnvidoPoints(fullHand(t, p))
    if (p === g.mano_player && es.mano_declared == null) {
      requireRule(a.value !== 'son_buenas', 'La mano primero declara sus tantos.')
      es.mano_declared = tanto; es.declare_turn = opp; return
    }
    const manoTanto = es.mano_declared!
    const winner = a.value === 'tengo' && tanto > manoTanto ? p : g.mano_player
    const pieTanto = a.value === 'tengo' ? tanto : null
    g.current_turn = afterEnv(g)
    Object.assign(es, { status: 'accepted', winner_id: winner, awarded: es.value,
      player1_points: g.mano_player === g.player1_id ? manoTanto : pieTanto,
      player2_points: g.mano_player === g.player2_id ? manoTanto : pieTanto })
    addScore(g, winner, es.value); finish(t); return
  }
  if (a.type === 'sing_truco') {
    const kind = a.value as TrucoType, requested = trTypes.indexOf(kind) + 2
    requireRule(trTypes.includes(kind), 'Canto inválido.')
    requireRule(!pendingEnv(g) && es.status !== 'declaring', 'Primero se resuelve el envido.')
    if (pendingTr(g) && tr.last_singer !== p) requireRule(requested === tr.value + 1, 'Subida de truco inválida.')
    else if (tr.status === 'none') requireRule(kind === 'truco' && g.current_turn === p, 'No podés cantar ahora.')
    else requireRule(tr.status === 'accepted' && tr.last_singer !== p && tr.value < 4
      && requested === tr.value + 1 && g.current_turn === p, 'No podés subir el truco ahora.')
    g.truco_state = { status: kind, value: requested, last_singer: p }; g.current_turn = opp; return
  }
  if (a.type === 'respond_truco') {
    requireRule(pendingTr(g) && tr.last_singer !== p, 'No hay truco para responder.')
    requireRule(!pendingEnv(g) && es.status !== 'declaring', 'Primero se resuelve el envido.')
    if (a.accept) { tr.status = 'accepted'; g.current_turn = nextPlayer(g); return }
    addScore(g, tr.last_singer!, tr.value - 1)
    if (!finish(t)) { tr.status = 'rejected'; g.awaiting_deal = true }
    return
  }
  requireRule(a.type === 'play_card' || a.type === 'irse_al_mazo', 'Acción inválida.')
  requireRule(g.current_turn === p, 'No es tu turno.')
  requireRule(es.status !== 'declaring' && !(pendingEnv(g) && es.last_singer !== p)
    && !(pendingTr(g) && tr.last_singer !== p), 'Primero respondé el canto.')
  if (a.type === 'irse_al_mazo') {
    addScore(g, opp, tr.status === 'accepted' ? tr.value : 1)
    g.envido_reveal = reveal(t); g.awaiting_deal = true; return
  }
  requireRule(!g.played_cards.some(c => c.player_id === p && c.round === g.round_number), 'Ya jugaste esta ronda.')
  const hand = t.hands[index(g, p)]
  const pos = hand.findIndex(c => c.suit === a.card?.suit && c.value === a.card?.value)
  requireRule(pos >= 0, 'No tenés esa carta.')
  const [card] = hand.splice(pos, 1)
  g.played_cards.push({ player_id: p, card, round: g.round_number })
  if (g.played_cards.filter(c => c.round === g.round_number).length < 2) { g.current_turn = opp; return }
  const c1 = g.played_cards.find(c => c.round === g.round_number && c.player_id === g.player1_id)!.card
  const c2 = g.played_cards.find(c => c.round === g.round_number && c.player_id === g.player2_id)!.card
  const winner = c1.rank < c2.rank ? g.player1_id : c2.rank < c1.rank ? g.player2_id : null
  g.round_results.push({ round: g.round_number, winner_id: winner })
  const w1 = g.round_results.filter(r => r.winner_id === g.player1_id).length
  const w2 = g.round_results.filter(r => r.winner_id === g.player2_id).length
  let handWinner: string | null = null
  if (w1 >= 2) handWinner = g.player1_id
  else if (w2 >= 2) handWinner = g.player2_id
  else if (g.round_number === 3) handWinner = w1 > w2 ? g.player1_id : w2 > w1 ? g.player2_id
    : g.round_results[0].winner_id ?? g.mano_player
  else if (g.round_number === 2 && w1 + w2 === 1) handWinner = g.round_results.find(r => r.winner_id)!.winner_id
  if (!handWinner) { g.round_number++; g.current_turn = winner ?? g.mano_player; return }
  addScore(g, handWinner, tr.status === 'accepted' ? tr.value : 1)
  if (!finish(t)) { g.awaiting_deal = true; g.envido_reveal = reveal(t) }
}
export function step(input: Trial, action: Action): Trial {
  requireRule(input.bot ? input.version === BOTS_VERSION : input.version === VERSION, 'Esta versión de partida necesita su motor original.')
  const t = structuredClone(input)
  apply(t, action)
  if (t.bot && action.player === t.owner) {
    const s = t.bot.style
    if (action.type === 'sing_envido') {
      s.envido_sung++
      if (getEnvidoPoints(fullHand(input, input.owner)) < 24) s.envido_bluff++
    } else if (action.type === 'sing_truco') {
      s.truco_sung++
      if (handPower(input.hands[0]) < 12) s.truco_bluff++
    } else if (action.type === 'respond_envido' && !action.accept) s.envido_folded++
    else if (action.type === 'respond_truco' && !action.accept) s.truco_folded++
    else if (action.type === 'advance_hand' && t.game.hand_number !== input.game.hand_number) s.hands_played++
  }
  t.revision++; t.actions.push({ action: structuredClone(action), rng: t.rng })
  return t
}
export function legalActions(t: Trial, player: string): Action[] {
  const candidates: Action[] = [
    ...t.hands[index(t.game, player)].map(card => ({ player, type: 'play_card', card })),
    ...envTypes.map(value => ({ player, type: 'sing_envido', value })),
    ...trTypes.map(value => ({ player, type: 'sing_truco', value })),
    ...['respond_envido', 'respond_truco'].flatMap(type => [true, false].map(accept => ({ player, type, accept }))),
    ...['tengo', 'son_buenas', 'mazo'].map(value => ({ player, type: 'envido_say', value })),
    { player, type: 'irse_al_mazo' }, { player, type: 'advance_hand' },
  ]
  return candidates.filter(a => { try { step(t, a); return true } catch { return false } })
}
// Tobías: rama vigente de bot_step, dificultad 1, mentiroso 1 y agresivo 2.
// La lectura de fama/estilo vale cero con dificultad <= 5.
export function botDecision(t: Trial): Action | null {
  if (t.bot) return decideBot({ game: t.game, remaining: t.hands[1], full: fullHand(t, t.game.player2_id) }, t.bot, () => random(t))
  const g = t.game, es = g.envido_state, tr = g.truco_state
  if (g.status !== 'playing' || g.awaiting_deal) return null
  if (es.status === 'declaring' ? es.declare_turn !== BOT : g.current_turn !== BOT) return null
  const cards = t.hands[1], rr = random(t), et = getEnvidoPoints(fullHand(t, BOT))
  const standing = g.round_results.reduce((v, r) => v + (r.winner_id === BOT ? 1 : r.winner_id ? -1 : 0), 0)
  const eff = Math.round(cards.reduce((v, c) => v + 15 - c.rank, 0) * 3 / Math.max(cards.length, 1)) + standing * 6
  const action = (type: string, extra: Partial<Action> = {}): Action => ({ player: BOT, type, ...extra })
  if (es.status === 'declaring') return action('envido_say', { value: es.mano_declared == null || et > es.mano_declared
    || rr >= .02 ? 'tengo' : 'son_buenas' })
  if (pendingEnv(g) && es.last_singer !== BOT) {
    const need = es.status === 'falta_envido' ? 33 : es.status === 'real_envido' ? 28 : 26
    return action('respond_envido', { accept: et >= need || (es.status !== 'falta_envido' && rr < .5) })
  }
  if (pendingTr(g) && tr.last_singer !== BOT) return action('respond_truco', { accept: eff >= 21 || rr < .6 })
  const canEnv = es.status === 'none' && g.round_number === 1 && tr.status !== 'accepted'
    && !g.played_cards.some(c => c.player_id === BOT)
  if (canEnv && (et >= 27 || (et >= 23 && rr < 1 / 12 - .03))) return action('sing_envido', { value: 'envido' })
  if (tr.status === 'none' && eff >= 24 && rr < .34) return action('sing_truco', { value: 'truco' })
  const opponent = g.played_cards.find(c => c.round === g.round_number && c.player_id !== BOT)?.card
  if (g.round_number === 2 && opponent) {
    const best = Math.min(...cards.map(c => c.rank))
    if (((standing < 0 && best >= opponent.rank) || (standing === 0 && best > opponent.rank)) && random(t) < .64) {
      return action('irse_al_mazo')
    }
  }
  let chosen: Card
  if (rr < .1) {
    if (opponent) chosen = [...cards].filter(c => c.rank < opponent.rank).sort((a, b) => b.rank - a.rank)[0]
      ?? [...cards].sort((a, b) => b.rank - a.rank)[0]
    else chosen = [...cards].sort((a, b) => a.rank - b.rank)[standing < 0 || g.round_number >= 2 ? 0 : Math.floor((cards.length - 1) / 2)]
  } else chosen = cards.map(card => ({ card, r: random(t) })).sort((a, b) => a.r - b.r)[0].card
  return action('play_card', { card: chosen })
}
export function botStep(input: Trial): Trial {
  const t = structuredClone(input), action = botDecision(t)
  requireRule(!!action, 'El rival está esperando.')
  return step(t, action!)
}
