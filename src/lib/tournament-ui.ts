import type {
  Tournament,
  TournamentDraftInput,
  TournamentFormat,
  TournamentMode,
  TournamentStatus,
} from '@/lib/tournaments'

export const TOURNAMENT_CAPACITIES: Record<
  TournamentMode,
  Record<TournamentFormat, Array<4 | 8 | 16 | 32>>
> = {
  '1v1': {
    knockout: [4, 8, 16, 32],
    groups: [8, 16, 32],
  },
  '2v2': {
    knockout: [8, 16, 32],
    groups: [16, 32],
  },
}

export const TOURNAMENT_MODE_LABEL: Record<TournamentMode, string> = {
  '1v1': 'Mano a mano',
  '2v2': 'Parejas 2 vs 2',
}

export const TOURNAMENT_FORMAT_LABEL: Record<TournamentFormat, string> = {
  knockout: 'Eliminación directa',
  groups: 'Grupos + eliminación',
}

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  running: 'En juego',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'
const argentinaDateTime = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TZ,
})

const argentinaInputParts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ARGENTINA_TZ,
})

export function formatTournamentDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${argentinaDateTime.format(date).replace(/\u202f|\u00a0/g, ' ')} hs`
}

export function isoToArgentinaInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const values = Object.fromEntries(
    argentinaInputParts
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

/** Los formularios siempre representan hora argentina, aunque se abran desde otro huso. */
export function argentinaInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00-03:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function defaultTournamentStart(): string {
  return isoToArgentinaInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
}

export function validateTournamentDraft(input: TournamentDraftInput): string[] {
  const errors: string[] = []
  const name = input.name.trim()
  if (name.length < 3 || name.length > 80) {
    errors.push('El nombre debe tener entre 3 y 80 caracteres.')
  }
  if (input.description.length > 2000) {
    errors.push('La descripción no puede superar los 2.000 caracteres.')
  }
  if (!TOURNAMENT_CAPACITIES[input.mode][input.format].includes(input.capacity)) {
    errors.push('Ese cupo no permite respetar el formato, los grupos y el tercer puesto.')
  }
  if (input.targetScore !== 15 && input.targetScore !== 30) {
    errors.push('Las partidas deben jugarse a 15 o 30 puntos.')
  }
  for (const [label, value] of [
    ['primer puesto', input.prizeFirst],
    ['segundo puesto', input.prizeSecond],
    ['tercer puesto', input.prizeThird],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`Las monedas del ${label} deben ser un número entero positivo o cero.`)
    }
  }
  const startsAt = new Date(input.startsAt).getTime()
  if (!Number.isFinite(startsAt) || startsAt <= Date.now()) {
    errors.push('Elegí una fecha y hora futuras.')
  }
  return errors
}

export type CheckInState = 'not_open' | 'open' | 'closed' | 'unavailable'

export function tournamentCheckInState(
  tournament: Tournament,
  now = Date.now(),
): CheckInState {
  if (tournament.status !== 'published' || tournament.roster_frozen_at) return 'unavailable'
  const start = new Date(tournament.starts_at).getTime()
  if (!Number.isFinite(start)) return 'unavailable'
  if (now >= start) return 'closed'
  if (now >= start - 30 * 60 * 1000) return 'open'
  return 'not_open'
}

export function tournamentPlacesLabel(tournament: Tournament): string {
  const occupied = tournament.active_players ?? 0
  const noun = tournament.mode === '2v2' ? 'jugadores' : 'lugares'
  return `${occupied} de ${tournament.capacity} ${noun}`
}
