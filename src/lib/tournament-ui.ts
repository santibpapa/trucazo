import type {
  Tournament,
  TournamentDetailData,
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

export const TOURNAMENT_PHASE_LABEL: Record<TournamentDetailData['matches'][number]['phase'], string> = {
  group: 'Grupos',
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarterfinal: 'Cuartos',
  semifinal: 'Semifinal',
  third_place: 'Tercer puesto',
  final: 'Final',
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

const argentinaTime = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TZ,
})

/** Sólo la hora en Argentina, por ejemplo "19:30". */
export function formatTournamentTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return argentinaTime.format(date).replace(/\u202f|\u00a0/g, ' ')
}

const argentinaTileParts = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: ARGENTINA_TZ,
})

const argentinaDayKey = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: ARGENTINA_TZ,
})

export interface TournamentDateTile {
  /** "SÁB" */
  weekday: string
  /** "8" */
  day: string
  /** "nov" */
  month: string
  /** "18:00" */
  time: string
  /** "Hoy" o "Mañana" cuando corresponde, en hora argentina. */
  relative: 'Hoy' | 'Mañana' | null
}

/** Partes de la fecha para el calendarito de las tarjetas, siempre en hora argentina. */
export function tournamentDateTile(iso: string, now = Date.now()): TournamentDateTile {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { weekday: '', day: '', month: '', time: iso, relative: null }
  const parts = Object.fromEntries(
    argentinaTileParts.formatToParts(date).map(part => [part.type, part.value]),
  )
  const clean = (value: string | undefined) => (value ?? '').replace(/\./g, '').trim()
  const key = argentinaDayKey.format(date)
  const relative = key === argentinaDayKey.format(new Date(now))
    ? 'Hoy'
    : key === argentinaDayKey.format(new Date(now + 24 * 60 * 60 * 1000)) ? 'Mañana' : null
  return {
    weekday: clean(parts.weekday).toLocaleUpperCase('es-AR'),
    day: clean(parts.day),
    month: clean(parts.month),
    time: formatTournamentTime(iso),
    relative,
  }
}

/** Hora en que abre la confirmación de presencia: 30 minutos antes del inicio. */
export function tournamentCheckInOpensAt(startsAt: string): string {
  const start = new Date(startsAt).getTime()
  if (!Number.isFinite(start)) return startsAt
  return new Date(start - 30 * 60 * 1000).toISOString()
}

/** Texto corto de cuánto falta: "Faltan 12 min", "Faltan 3 días". */
export function tournamentTimeUntil(iso: string, now: number): string {
  const difference = new Date(iso).getTime() - now
  if (difference <= 0) return 'Horario de inicio alcanzado'
  const minutes = Math.ceil(difference / 60_000)
  if (minutes < 60) return `Faltan ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Faltan ${hours} h ${minutes % 60} min`
  const days = Math.floor(hours / 24)
  return `Faltan ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Reloj "m:ss" para cuentas regresivas cortas. Nunca baja de 0:00. */
export function formatCountdown(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const compactUtc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/**
 * Enlace para agendar en Google Calendar la ventana de «Estoy listo»: desde
 * que abre la confirmación hasta la hora de inicio.
 */
export function tournamentCalendarUrl(tournament: Pick<Tournament, 'id' | 'name' | 'starts_at'>): string {
  const opensAt = tournamentCheckInOpensAt(tournament.starts_at)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${tournament.name} · Trucazo`,
    dates: `${compactUtc(opensAt)}/${compactUtc(tournament.starts_at)}`,
    details: `Entrá a Trucazo y tocá «Estoy listo» entre las ${formatTournamentTime(opensAt)} y las ${formatTournamentTime(tournament.starts_at)} (hora de Argentina). Si no, podés perder tu lugar.\nhttps://www.trucazo.com.ar/torneos/${tournament.id}`,
    ctz: ARGENTINA_TZ,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
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

export function escapeTournamentUsernamePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export function isExactTournamentUsername(actual: string, requested: string): boolean {
  return actual.toLocaleLowerCase('es-AR') === requested.toLocaleLowerCase('es-AR')
}

export interface PendingTournamentRequest {
  requestId: string
  fingerprint: string
}

export function tournamentRequestForRetry(
  pending: PendingTournamentRequest | null,
  fingerprint: string,
  createRequestId: () => string,
): PendingTournamentRequest {
  if (pending?.fingerprint === fingerprint) return pending
  return { requestId: createRequestId(), fingerprint }
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
