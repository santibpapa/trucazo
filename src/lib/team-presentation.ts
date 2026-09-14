import type { Announce } from '@/components/game/MesaUI'
import type { TeamSnapshot } from './team-game'
import type { SoundName } from './sounds'

export const TEAM_LABELS: Record<string, string> = {
  mazo: 'Ir al mazo', envido: 'Envido', real_envido: 'Real Envido', falta_envido: 'Falta Envido',
  truco: 'Truco', retruco: 'Retruco', vale_cuatro: 'Vale Cuatro',
  envido_yes: 'Quiero', envido_no: 'No quiero', truco_yes: 'Quiero', truco_no: 'No quiero', son_buenas: 'Son buenas',
}

export const CANTO_SOUNDS: Record<string, SoundName> = {
  envido: 'envido', real_envido: 'real-envido', falta_envido: 'falta-envido',
  truco: 'truco', retruco: 'retruco', vale_cuatro: 'vale-cuatro',
  envido_yes: 'quiero', truco_yes: 'quiero', envido_no: 'no-quiero', truco_no: 'no-quiero',
}

/** Conserva el orden visual del 1vs1, mostrando sólo permisos del servidor. */
export function teamActionRows(legal: string[]): string[][] {
  const declaring = legal.includes('tengo') || legal.includes('son_buenas')
  const answeringTruco = legal.includes('truco_yes')
  return [
    declaring ? ['son_buenas', 'tengo', 'mazo'] : answeringTruco
      ? ['truco_yes', 'retruco', 'vale_cuatro', 'truco_no'] : ['envido_yes', 'envido_no'],
    ['envido', 'real_envido', 'falta_envido'],
    declaring ? [] : answeringTruco ? ['mazo'] : ['truco', 'retruco', 'vale_cuatro', 'mazo'],
  ].map(row => row.filter(action => legal.includes(action))).filter(row => row.length > 0)
}

/** Presentación de un evento público del servidor. No infiere cantos ni tantos ocultos. */
export function teamAnnouncement(snapshot: TeamSnapshot): Announce | null {
  const { game, my_seat: seat, members } = snapshot
  const event = game?.announcement
  if (!game || !event || seat == null) return null
  const relative = (event.seat - seat + 4) % 4
  const speaker = members.find(m => m.seat === event.seat)
  const response = event.action.endsWith('_yes') || event.action.endsWith('_no')
  return {
    hand: game.hand_number,
    side: (['bottom', 'right', 'top', 'left'] as const)[relative],
    eyebrow: response ? event.action.startsWith('envido') ? 'Envido' : 'Truco' : undefined,
    title: event.text,
    titleClass: response ? 'text-cream' : 'text-gold uppercase tracking-wide',
    subtitle: `lo ${response ? 'dijo' : 'cantó'} ${speaker?.username ?? 'un jugador'}`,
  }
}

/** El mismo snapshot puede llegar por RPC, Realtime y polling: no reinicia el cartel. */
export function announcementRemaining(at: string, serverNow: string): number {
  return Math.max(0, Math.min(3600, 3600 - (Date.parse(serverNow) - Date.parse(at)))) || 0
}
