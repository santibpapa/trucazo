import { BOTS_VERSION, type BotConfig, type CampaignStyle } from '../offline-trial/bots'
import { createBotTrial, type Trial } from '../offline-trial/engine'

export const CAMPAIGN_VERSION = 'historia-local-v1'
export type Province = { id: string; order_index: number; slug: string; name: string; points_required: number; required_rival_id: string | null }
export type Rival = BotConfig & { order_index: number; slug: string; display_name: string; tagline: string;
  province_id: string; points_required: number; ranking_points: number; points_reward: number; reward_coins: number }
export type Catalog = { provinces: Province[]; rivals: Rival[] }
export type Progress = { rival_id: string; beaten_at: string; wins: number; rematch_points: number }
export type Presentation = { username: string; avatar_url: string | null; active_salon: string;
  active_frame: string | null; active_medal: string | null; active_accessory: string | null }
export type Snapshot = { version: string; engine_version: string; userId: string; exported_at: string;
  points: number; coins: number; style: CampaignStyle; progress: Progress[]; catalog: Catalog; presentation?: Presentation;
  grant?: { id: string; seed: number; rules: 'historia-sql-v1' } }
export type PendingResult = { id: string; status: 'pending'; finished_at: string; dependencies: string[];
  trial: Trial; projected_reward: { points: number; coins: number }; grant_id?: string; sequence?: number }
export type Receipt = { id: string; status: 'accepted'; points: number; coins: number; winner: string; scores: number[] }
export type Campaign = { version: string; owner: string; revision: number; package_digest: string;
  official: Snapshot; points: number; pending_coins: number; style: CampaignStyle; progress: Progress[];
  trial: Trial | null; dependencies: string[]; pending: PendingResult[]; presentation?: Presentation;
  next_sequence?: number; receipts?: Receipt[]; legacy_results?: PendingResult[] }

// Orden estable para comparar el catálogo SQL con el incluido en la descarga.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}'
  return JSON.stringify(value)
}
export function createCampaign(snapshot: Snapshot, digest: string): Campaign {
  if (snapshot.version !== CAMPAIGN_VERSION || snapshot.engine_version !== BOTS_VERSION) throw new Error('Historia necesita actualizarse.')
  return { version: CAMPAIGN_VERSION, owner: snapshot.userId, revision: 0, package_digest: digest,
    official: structuredClone(snapshot), points: snapshot.points, pending_coins: 0,
    style: structuredClone(snapshot.style), progress: structuredClone(snapshot.progress), trial: null, dependencies: [], pending: [],
    ...(snapshot.presentation ? { presentation: structuredClone(snapshot.presentation) } : {}) }
}
// Web y APK conservan la misma política de actualización y cola pendiente.
export function prepareSavedCampaign(old: Campaign | undefined, snapshot: Snapshot, digest: string): Campaign {
  if (old && (old.version !== CAMPAIGN_VERSION || old.official.engine_version !== snapshot.engine_version)) {
    throw new Error('Hay un guardado de otra versión. Se conserva para poder retomarlo.')
  }
  if (old && (old.pending.length || old.trial?.game.status === 'playing')
    && canonical(old.official.catalog) !== canonical(snapshot.catalog)) throw new Error('Hay partidas pendientes del catálogo anterior. Se conservan para sincronizar.')
  const legacy = snapshot.grant && old?.pending.length && old.pending.every(p => !p.grant_id)
  const saved = old?.trial?.game.status === 'playing' || (old?.pending.length && !legacy) ? structuredClone(old!) : createCampaign(snapshot, digest)
  if (legacy && old?.trial?.game.status !== 'playing') {
    saved.legacy_results = [...(old?.legacy_results ?? []), ...old!.pending]
    saved.receipts = old?.receipts
  } else if (old && saved.trial?.game.status !== 'playing' && !saved.pending.length) {
    saved.legacy_results = old.legacy_results; saved.receipts = old.receipts
  }
  if (snapshot.presentation) saved.presentation = structuredClone(snapshot.presentation)
  saved.package_digest = digest; saved.revision = (old?.revision ?? -1) + 1
  return saved
}
export const beaten = (c: Campaign, id: string) => c.progress.some(p => p.rival_id === id)
const gate = (c: Campaign, p: Province) => c.points >= p.points_required && (!p.required_rival_id || beaten(c, p.required_rival_id))
export const provinceUnlocked = (c: Campaign, p: Province) => gate(c, p)
  || c.official.catalog.rivals.some(r => r.province_id === p.id && beaten(c, r.id))
export const rivalUnlocked = (c: Campaign, r: Rival) => beaten(c, r.id)
  || c.points >= r.points_required && c.official.catalog.provinces.some(p => p.id === r.province_id && gate(c, p))
export function reward(rival: Rival, progress: Progress | undefined, scores: number[], won: boolean) {
  if (!won) return { points: 0, coins: 0 }
  const base = rival.points_reward
  // Cálculo entero: evita que un .5 exacto quede debajo por coma flotante.
  return progress ? { points: Math.max(0, Math.min(Math.floor(base / 10), Math.floor(base * 3 / 10) - progress.rematch_points)), coins: 0 }
    : { points: base + Math.floor((2 * base * Math.max(0, scores[0] - scores[1]) + 5 * rival.target_score) / (10 * rival.target_score)), coins: rival.reward_coins }
}
export function startDuel(current: Campaign, rivalId: string, seed: number, id: string): Campaign {
  if (current.trial?.game.status === 'playing') throw new Error('Continuá primero la partida guardada.')
  const rival = current.official.catalog.rivals.find(r => r.id === rivalId)
  if (!rival || !rivalUnlocked(current, rival)) throw new Error('Ese rival todavía está bloqueado.')
  const next = structuredClone(current)
  if (current.official.grant) seed = duelSeed(current.official.grant.seed, current.next_sequence ?? 0)
  next.trial = createBotTrial(current.owner, { rival, campaign_points: current.points, style: current.style }, seed, id)
  next.style = structuredClone(next.trial.bot!.style)
  next.dependencies = current.pending.map(p => p.id)
  next.revision++
  return next
}
export function applyTurn(current: Campaign, trial: Trial, finishedAt: string): Campaign {
  if (!current.trial || current.trial.id !== trial.id || trial.owner !== current.owner || trial.version !== BOTS_VERSION
    || trial.revision !== current.trial.revision + 1) throw new Error('La partida cambió. Volvé al último guardado.')
  const next = structuredClone(current)
  next.trial = trial; next.style = structuredClone(trial.bot!.style); next.revision++
  if (trial.result && !next.pending.some(p => p.id === trial.id)) {
    const rival = current.official.catalog.rivals.find(r => r.id === trial.rival)!
    const progress = next.progress.find(p => p.rival_id === rival.id), won = trial.result.winner === current.owner
    const projected = reward(rival, progress, trial.result.scores, won)
    next.pending.push({ id: trial.id, status: 'pending', finished_at: finishedAt,
      dependencies: [...current.dependencies], trial: structuredClone(trial), projected_reward: projected,
      ...(current.official.grant ? { grant_id: current.official.grant.id, sequence: current.next_sequence ?? 0 } : {}) })
    next.next_sequence = (current.next_sequence ?? 0) + 1
    next.points += projected.points; next.pending_coins += projected.coins
    if (won) {
      if (progress) { progress.wins++; progress.rematch_points += projected.points }
      else next.progress.push({ rival_id: rival.id, beaten_at: finishedAt, wins: 1, rematch_points: 0 })
    }
  }
  return next
}
export function duelSeed(seed: number, sequence: number) {
  const mask = BigInt(4294967295)
  return Math.max(1, Number((BigInt(seed) ^ ((BigInt(sequence) + BigInt(1)) * BigInt(2654435761) & mask)) & mask))
}
// Reemplazar la proyección sólo después de recibir y guardar todos los comprobantes.
export function confirmResults(current: Campaign, snapshot: Snapshot, receipts: Receipt[]): Campaign {
  if (current.trial?.game.status === 'playing' || snapshot.userId !== current.owner || !snapshot.grant
    || receipts.length !== current.pending.length || current.pending.some(p => !receipts.some(r => r.id === p.id && r.status === 'accepted'))) {
    throw new Error('La confirmación no corresponde al guardado. Se conservan las partidas.')
  }
  const next = createCampaign(snapshot, current.package_digest)
  next.presentation = current.presentation; next.trial = current.trial; next.legacy_results = current.legacy_results
  next.receipts = [...(current.receipts ?? []), ...receipts]; next.revision = current.revision + 1
  return next
}
