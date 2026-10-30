import { createDeck, getEnvidoPoints, type Card } from '../truco'
import type { Action, Game } from './engine'

export const BOTS_VERSION = 'historia-bots-v1'
export const STRATEGIES = ['paciente', 'farolera', 'calculador', 'marcador', 'agresivo'] as const
export type BotConfig = {
  id: string; bot_id: string; difficulty: number; trait_liar: number; trait_aggressive: number;
  target_score: 15 | 30; strategy_profile: typeof STRATEGIES[number] | null;
}
export type CampaignStyle = {
  hands_played: number; envido_sung: number; envido_bluff: number; envido_folded: number;
  truco_sung: number; truco_bluff: number; truco_folded: number;
}
export const EMPTY_STYLE: CampaignStyle = {
  hands_played: 0, envido_sung: 0, envido_bluff: 0, envido_folded: 0,
  truco_sung: 0, truco_bluff: 0, truco_folded: 0,
}
export type BotSetup = { rival: BotConfig; campaign_points: number; style: CampaignStyle }
// El cerebro recibe solamente sus cartas y la mesa pública.
export type BotView = { game: Game; remaining: Card[]; full: Card[] }
const envTypes = ['envido', 'real_envido', 'falta_envido']
const trTypes = ['truco', 'retruco', 'vale_cuatro']
const same = (a: Card, b: Card) => a.suit === b.suit && a.value === b.value
export const handPower = (cards: Card[]) => Math.round(
  cards.reduce((v, c) => v + 15 - c.rank, 0) * 3 / Math.max(cards.length, 1))
function reading(setup: BotSetup, northwest: boolean) {
  const s = setup.style, hp = s.hands_played
  const read = Math.min(1, setup.campaign_points / 2000) * Math.min(1, hp / 20)
    * (northwest ? 1 : Math.max(0, (setup.rival.difficulty - 5) / 5))
  return { read, liar: (s.envido_bluff + s.truco_bluff) / Math.max(1, s.envido_sung + s.truco_sung),
    fold: Math.min(1, (s.envido_folded + s.truco_folded) / Math.max(1, hp) * 2),
    aggressive: Math.min(1, (s.envido_sung + s.truco_sung) / Math.max(1, hp) / 1.5) }
}
// Rama conservada por _bot_step_pre_noroeste, vigente para los primeros 46.
function classic(view: BotView, setup: BotSetup, draw: () => number): Action | null {
  const { game: g, remaining: cards, full } = view, bot = g.player2_id
  const es = g.envido_state, tr = g.truco_state, d = setup.rival.difficulty
  const liar = setup.rival.trait_liar - 5, aggressive = setup.rival.trait_aggressive - 5
  const style = reading(setup, false), call = style.read * style.liar * .45
  const bluff = style.read * (style.fold - style.aggressive) * .40
  const rr = draw(), et = getEnvidoPoints(full)
  const standing = g.round_results.reduce((v, r) => v + (r.winner_id === bot ? 1 : r.winner_id ? -1 : 0), 0)
  const eff = handPower(cards) + standing * 6
  const action = (type: string, extra: Partial<Action> = {}): Action => ({ player: bot, type, ...extra })
  if (es.status === 'declaring') return action('envido_say', { value: es.mano_declared == null
    || et > es.mano_declared || rr >= d / 10 + liar * .02 ? 'tengo' : 'son_buenas' })
  if (envTypes.includes(es.status) && es.last_singer !== bot) {
    const need = es.status === 'falta_envido' ? Math.max(29, 34 - d)
      : es.status === 'real_envido' ? Math.max(24, 29 - d) : Math.max(20, 27 - d)
    if (et >= 31 && d >= 6 && es.status !== 'falta_envido' && rr < .45) {
      return action('sing_envido', { value: es.status === 'envido' ? 'real_envido' : 'falta_envido' })
    }
    return action('respond_envido', { accept: et >= need || (es.status !== 'falta_envido'
      && (rr < call || (d <= 3 && rr < .5))) })
  }
  if (trTypes.includes(tr.status) && tr.last_singer !== bot) {
    if (eff >= 30 && d >= 6 && tr.value < 4 && rr < .40 + aggressive * .015) {
      return action('sing_truco', { value: tr.value === 3 ? 'vale_cuatro' : 'retruco' })
    }
    return action('respond_truco', { accept: eff >= Math.max(12, 22 - d) || rr < call || (d <= 3 && rr < .6) })
  }
  const canEnv = es.status === 'none' && g.round_number === 1 && tr.status !== 'accepted'
    && !g.played_cards.some(c => c.player_id === bot)
  if (canEnv && (et >= 27 || (et >= 23 && rr < d / 12 + aggressive * .01)
    || (et <= 20 && d >= 5 && rr < (d - 4) * .02 + liar * .005 + Math.max(0, bluff)))) {
    return action('sing_envido', { value: et >= 32 && d >= 7 ? 'real_envido' : 'envido' })
  }
  if (tr.status === 'none' && ((eff >= 24 && rr < .35 + .05 * d + aggressive * .02)
    || (eff <= 12 && d >= 6 && rr < (d - 5) * .035 + liar * .005 + Math.max(0, bluff)))) {
    return action('sing_truco', { value: 'truco' })
  }
  if (tr.status === 'accepted' && tr.last_singer !== bot && tr.value < 4
    && eff >= 30 && d >= 7 && rr < .30 + aggressive * .015) {
    return action('sing_truco', { value: tr.value === 2 ? 'retruco' : 'vale_cuatro' })
  }
  const opponent = g.played_cards.find(c => c.round === g.round_number && c.player_id !== bot)?.card
  if (g.round_number === 2 && opponent && cards.length) {
    const best = Math.min(...cards.map(c => c.rank))
    if (((standing < 0 && best >= opponent.rank) || (standing === 0 && best > opponent.rank))
      && draw() < .55 - aggressive * .03) return action('irse_al_mazo')
  }
  let chosen: Card | undefined
  if (rr < d / 10) {
    if (opponent) chosen = [...cards].filter(c => c.rank < opponent.rank).sort((a, b) => b.rank - a.rank)[0]
      ?? [...cards].sort((a, b) => b.rank - a.rank)[0]
    else chosen = [...cards].sort((a, b) => a.rank - b.rank)[standing < 0 || g.round_number >= 2 ? 0 : Math.floor((cards.length - 1) / 2)]
  } else chosen = cards.map(card => ({ card, r: draw() })).sort((a, b) => a.r - b.r)[0]?.card
  return chosen ? action('play_card', { card: chosen }) : null
}
// PostgreSQL divide estos conteos con 20 decimales y después multiplica sin
// perder precisión. Reproducirlos evita elegir otra carta en un empate mínimo.
const SQL_SCALE = BigInt('100000000000000000000')
const SQL_VOLUME = SQL_SCALE * SQL_SCALE * SQL_SCALE
function winWeight(w: bigint[], ties: bigint[], mano: boolean): bigint {
  let result = BigInt(0)
  const probability = (round: number, outcome: number) => outcome === 1 ? w[round]
    : outcome === 0 ? ties[round] : SQL_SCALE - w[round] - ties[round]
  for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) {
    const pa = probability(0, a), pb = probability(1, b)
    if (!pa || !pb) continue
    if (a + b > 0 && a >= 0 && b >= 0) { result += pa * pb * SQL_SCALE; continue }
    if (a + b < 0 && a <= 0 && b <= 0) continue
    for (const c of [-1, 0, 1]) {
      if (a + b + c > 0 || (a + b + c === 0 && mano)) result += pa * pb * probability(2, c)
    }
  }
  return result < BigInt(0) ? BigInt(0) : result > SQL_VOLUME ? SQL_VOLUME : result
}
export function northwestChoice({ game: g, remaining, full }: BotView) {
  const bot = g.player2_id, round = g.round_number - 1
  const known = [...full, ...g.played_cards.filter(c => c.player_id !== bot).map(c => c.card)]
  const unseen = createDeck().filter(c => !known.some(k => same(k, c))), n = Math.max(1, unseen.length)
  const decimal = (count: number) => (BigInt(count) * SQL_SCALE + BigInt(Math.floor(n / 2))) / BigInt(n)
  const odds = (rank: number) => [decimal(unseen.filter(c => c.rank > rank).length), decimal(unseen.filter(c => c.rank === rank).length)]
  const shown = g.played_cards.find(c => c.round === g.round_number && c.player_id !== bot)?.card
  const ownShown = g.played_cards.find(c => c.round === g.round_number && c.player_id === bot)?.card
  let best = BigInt(-1), bestCard: Card | null = null
  for (const candidate of ownShown ? [ownShown] : remaining) {
    const rest = remaining.filter(c => ownShown || !same(c, candidate)).sort((a, b) => a.rank - b.rank)
    for (const future of rest.length === 2 ? [rest, [...rest].reverse()] : [rest]) {
      const w = [BigInt(0), BigInt(0), BigInt(0)], ties = [BigInt(0), BigInt(0), BigInt(0)]
      for (const r of g.round_results) {
        if (r.winner_id === bot) w[r.round - 1] = SQL_SCALE
        else if (r.winner_id == null) ties[r.round - 1] = SQL_SCALE
      }
      ;[w[round], ties[round]] = shown ? [candidate.rank < shown.rank ? SQL_SCALE : BigInt(0), candidate.rank === shown.rank ? SQL_SCALE : BigInt(0)] : odds(candidate.rank)
      for (let j = 0; j < future.length; j++) [w[round + j + 1], ties[round + j + 1]] = odds(future[j].rank)
      const weight = winWeight(w, ties, g.mano_player === bot)
      if (weight > best || (weight === best && (!bestCard || candidate.rank > bestCard.rank))) {
        best = weight; bestCard = candidate
      }
    }
  }
  return { card: ownShown ? null : bestCard, chance: Number(best < BigInt(0) ? BigInt(0) : best) / Number(SQL_VOLUME) }
}
function northwest(view: BotView, setup: BotSetup, draw: () => number): Action | null {
  const g = view.game, bot = g.player2_id, es = g.envido_state, tr = g.truco_state
  const { strategy_profile: profile, trait_liar: liar, trait_aggressive: aggressive } = setup.rival
  const { card, chance: handChance } = northwestChoice(view), style = reading(setup, true)
  const et = getEnvidoPoints(view.full), rr = draw()
  const envChance = et === 33 && g.mano_player === bot ? 1 : Math.max(.04, Math.min(.97, .16 + (et - 20) * .055))
  const bluff = (profile === 'farolera' ? .08 : profile === 'agresivo' ? .045 : .015)
    + Math.max(0, style.fold - style.aggressive) * style.read * .12 + Math.max(0, liar - 5) * .004
  const humanScore = g.player1_score, botScore = g.player2_score
  const action = (type: string, extra: Partial<Action> = {}): Action => ({ player: bot, type, ...extra })
  if (es.status === 'declaring') return action('envido_say', {
    value: es.mano_declared == null || et > es.mano_declared ? 'tengo' : 'son_buenas' })
  if (envTypes.includes(es.status) && es.last_singer !== bot) {
    const value = Math.max(1, es.value), previous = es.chain.slice(0, -1)
    const reject = Math.max(1, es.chain.length <= 1 ? 1 : previous.includes('falta_envido')
      ? 30 - Math.max(botScore, humanScore) : previous.reduce((v, c) => v + (c === 'envido' ? 2 : c === 'real_envido' ? 3 : 0), 0))
    let acceptance = Math.max(es.status === 'falta_envido' ? .80 : es.status === 'real_envido' ? .65 : .47,
      (value - reject) / (2 * value) + .10)
    if (humanScore + value >= 30) acceptance += .06
    if (es.status !== 'falta_envido') acceptance -= style.liar * style.read * .12
    if (es.status === 'falta_envido' && et < 29) acceptance = 1
    if (humanScore + reject >= 30) acceptance = 0
    else if (botScore + value >= 30) acceptance = Math.min(acceptance,
      ((humanScore + value >= 30 ? 30 : value) - reject) / (30 + (humanScore + value >= 30 ? 30 : value)) + .05)
    if (es.status !== 'falta_envido' && envChance === 1) return action('sing_envido', { value: 'falta_envido' })
    if (es.status === 'envido' && envChance > .81 && rr < .30 && humanScore + 5 < 30) {
      return action('sing_envido', { value: 'real_envido' })
    }
    return action('respond_envido', { accept: envChance >= acceptance })
  }
  if (trTypes.includes(tr.status) && tr.last_singer !== bot) {
    let acceptance = .42 + (humanScore + tr.value >= 30 ? .12 : 0) - (botScore + tr.value >= 30 ? .06 : 0)
      - style.liar * style.read * .10
    const reject = Math.max(1, tr.value - 1)
    if (humanScore + reject >= 30) acceptance = 0
    else if (botScore + tr.value >= 30) acceptance = Math.min(acceptance,
      ((humanScore + tr.value >= 30 ? 30 : tr.value) - reject) / (30 + (humanScore + tr.value >= 30 ? 30 : tr.value)) + .05)
    if (tr.value < 4 && (handChance === 1 || (handChance > .78
      && rr < .25 + Math.max(0, aggressive - 5) * .025 && humanScore + tr.value + 1 < 30))) {
      return action('sing_truco', { value: tr.value === 2 ? 'retruco' : 'vale_cuatro' })
    }
    return action('respond_truco', { accept: handChance >= acceptance })
  }
  const canEnv = es.status === 'none' && g.round_number === 1 && tr.status !== 'accepted'
    && !g.played_cards.some(c => c.player_id === bot)
  if (canEnv && (et >= 27 || (et >= 25 && style.fold * style.read > .45 && rr < .60)
    || (et <= 19 && rr < bluff && humanScore + 2 < 30))) {
    return action('sing_envido', { value: envChance === 1 ? 'falta_envido' : et >= 32 && botScore + 3 >= 30 ? 'real_envido' : 'envido' })
  }
  const threshold = profile === 'paciente' ? .68 : profile === 'agresivo' ? .56
    : profile === 'marcador' ? botScore < humanScore ? .57 : .66 : .62
  if (tr.status === 'none' && (handChance > threshold || (handChance < .24 && rr < bluff && humanScore + 2 < 30))) {
    return action('sing_truco', { value: 'truco' })
  }
  if (tr.status === 'accepted' && tr.last_singer !== bot && tr.value < 4
    && (handChance === 1 || (handChance > .78 && rr < .18 && humanScore + tr.value + 1 < 30))) {
    return action('sing_truco', { value: tr.value === 2 ? 'retruco' : 'vale_cuatro' })
  }
  return card ? action('play_card', { card }) : null
}
export function decideBot(view: BotView, setup: BotSetup, draw: () => number): Action | null {
  const g = view.game, bot = g.player2_id
  if (g.status !== 'playing' || g.awaiting_deal) return null
  if (g.envido_state.status === 'declaring' ? g.envido_state.declare_turn !== bot : g.current_turn !== bot) return null
  return setup.rival.strategy_profile ? northwest(view, setup, draw) : classic(view, setup, draw)
}
