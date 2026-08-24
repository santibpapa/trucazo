// Tipos y utilidades del panel del admin. Todo lo que hay acá es de PRESENTACIÓN:
// las cuentas ya vienen hechas del servidor (RPC admin_stats).

export type Totales = {
  personas: number
  con_cuenta: number
  invitados: number
  nuevos_hoy: number
  nuevos_ayer: number
  nuevos_7d: number
  nuevos_previos_7d: number
  jugaron_hoy: number
  jugaron_ayer: number
  jugaron_7d: number
  jugaron_previos_7d: number
  jugaron_alguna_vez: number
  partidas_hoy: number
  partidas_ayer: number
  partidas_7d: number
  partidas_previos_7d: number
  partidas_total: number
  partidas_personas_total: number
  partidas_maquina_total: number
  en_curso: number
  mesas_esperando: number
  online_ahora: number
  resenas: number
  resenas_7d: number
  resenas_puntaje: number | null
}

export type DiaSerie = {
  dia: string // "2026-08-24"
  registros: number
  registros_cuenta: number
  registros_invitado: number
  activos: number
  partidas: number
  partidas_personas: number
}

export type TipoCuenta = 'email' | 'google' | 'invitado'

export type Persona = {
  id: string
  nombre: string
  avatar_url: string | null
  creado_at: string
  tipo: TipoCuenta
  email: string | null
  monedas: number
  puntos_campana: number
  partidas: number
  partidas_personas: number
  partidas_maquina: number
  ganadas: number
  perdidas: number
  dias_jugados: number
  primera_partida: string | null
  ultima_partida: string | null
  ultima_sesion: string | null
  visto_at: string | null
}

export type Embudo = {
  registrados: number
  jugaron_una: number
  jugaron_tres: number
  volvieron: number
}

export type Stats = {
  generado_at: string
  dias: number
  desde: string
  hasta: string
  totales: Totales
  serie: DiaSerie[]
  personas: Persona[]
  embudo: Embudo
  horarios: { hora: number; partidas: number }[]
}

// ------------------------------------------------------------
// Colores de los gráficos
//
// No son los del tema al voleo: están elegidos para que se distingan entre sí
// sobre el fondo oscuro incluso para alguien que no ve bien los colores, y
// verificados con el validador de paletas (separación CVD, contraste y brillo).
// Cada cosa tiene SIEMPRE el mismo color en todo el panel:
//   altas = dorado · personas que jugaron = azul · partidas = verde
// ------------------------------------------------------------
export const VIZ = {
  altas: '#B08019',
  activos: '#4F9AD1',
  partidas: '#2E9E6E',
  /** El contexto que acompaña, sin robarle atención al dato principal. */
  apagado: '#7A6460',
  /** Escala de un solo tono para el embudo (de menos a más). */
  rampa: ['#6B4D12', '#916B18', '#B8871E', '#DFA934'],
} as const

// ------------------------------------------------------------
// Fechas: siempre en hora de Argentina, así "hoy" es el día de acá.
// ------------------------------------------------------------
const TZ = 'America/Argentina/Buenos_Aires'

const fmtFechaLarga = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ,
})
const fmtFechaCorta = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', timeZone: TZ,
})
// Reloj de 24 horas a propósito: el "p. m." de Intl trae un espacio raro que
// el servidor y el navegador escriben distinto, y React se queja de que la
// página no coincide. Con 24 horas no hay a. m./p. m. y además se lee mejor.
const fmtHora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
})

// El mismo día pero escrito "2026-08-24", para agrupar. Ojo: NO sirve cortar el
// texto ISO, porque ese viene en hora de Londres y a la noche ya es otro día acá.
const fmtDiaISO = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ,
})

/** Qué día de Argentina fue ese momento: "2026-08-24". */
export function diaDe(iso: string): string {
  return fmtDiaISO.format(new Date(iso))
}

// Un día suelto se lee al mediodía para que no se corra de fecha al pasarlo a
// hora de Argentina. Y se toman solo los primeros 10 caracteres: si el servidor
// manda "2026-08-24T00:00:00+00:00" en vez de "2026-08-24", igual se entiende.
// Una fecha rara no puede voltear la página entera: en el peor caso se muestra
// tal cual vino.
function alMediodia(iso: string): Date | null {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "2026-08-24" → "Lunes, 24 de agosto". */
export function diaLargo(iso: string): string {
  const d = alMediodia(iso)
  if (!d) return iso
  const t = fmtFechaLarga.format(d)
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "2026-08-24" → "24/08" (etiqueta del eje de los gráficos). */
export function diaCorto(iso: string): string {
  const d = alMediodia(iso)
  return d ? fmtFechaCorta.format(d) : iso
}

/** Momento exacto: "24/08 · 21:40". */
export function fechaYHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${fmtFechaCorta.format(d)} · ${fmtHora.format(d)}`.replace(/\u202f|\u00a0/g, ' ')
}

/** "hace 3 min" / "hace 2 h" / "hace 5 días". `ahora` viene del servidor, así el
 *  texto es el mismo en el servidor y en el navegador (si no, React protesta). */
export function haceCuanto(iso: string | null, ahora: string): string {
  if (!iso) return '—'
  const min = Math.floor((new Date(ahora).getTime() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  const m = Math.floor(d / 30)
  return m === 1 ? 'hace 1 mes' : `hace ${m} meses`
}

export function numero(n: number): string {
  return n.toLocaleString('es-AR')
}

/** Techo "redondo" para el eje de un gráfico (5, 10, 20, 50, 100...). */
export function techo(valor: number): number {
  if (valor <= 4) return Math.max(valor, 1)
  const magnitud = 10 ** Math.floor(Math.log10(valor))
  const n = valor / magnitud
  const paso = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return paso * magnitud
}

export const ETIQUETA_TIPO: Record<TipoCuenta, string> = {
  email: 'Con cuenta',
  google: 'Google',
  invitado: 'Invitado',
}

// ============================================================
// La ficha de UNA persona (RPC admin_player)
// ============================================================

export type Modo = 'personas' | 'bot' | 'campana'

export const ETIQUETA_MODO: Record<Modo, string> = {
  personas: 'Contra personas',
  bot: 'Contra bots del lobby',
  campana: 'Modo campaña',
}

export type Resultado = 'ganada' | 'perdida' | 'en_curso' | 'anulada'

export type Ficha = {
  generado_at: string
  perfil: {
    id: string
    nombre: string
    avatar_url: string | null
    creado_at: string
    tipo: TipoCuenta
    email: string | null
    es_admin: boolean
    monedas: number
    marco: string
    medalla: string
    salon: string
    accesorio: string
    ultima_sesion: string | null
    visto_at: string | null
    medallas: string[]
  }
  ranking: {
    online_puesto: number | null
    online_total: number
    campana_puesto: number | null
    campana_total: number
    campana_puntos: number
    fama: number
  }
  resumen: {
    partidas: number
    ganadas: number
    perdidas: number
    en_curso: number
    anuladas: number
    efectividad: number | null
    racha: number
    racha_ganando: boolean | null
    mejor_racha: number
    dias_jugados: number
    primera_partida: string | null
    ultima_partida: string | null
    monedas_ganadas: number
    monedas_perdidas: number
    minutos_jugados: number
  }
  por_modo: {
    modo: Modo
    partidas: number
    ganadas: number
    perdidas: number
    efectividad: number | null
  }[]
  campana: {
    vencidos: number
    total: number
    provincias: { nombre: string; vencidos: number; total: number }[]
    estilo: {
      conocido: boolean
      manos: number
      mentiroso: number
      achicado: number
      agresivo: number
    }
  }
  rivales: {
    nombre: string
    es_bot: boolean
    avatar_url: string | null
    partidas: number
    ganadas: number
    perdidas: number
  }[]
  actividad: { dia: string; partidas: number }[]
  historial: {
    id: string
    fecha: string
    modo: Modo
    rival: string
    rival_bot: boolean
    resultado: Resultado
    mi_puntaje: number
    su_puntaje: number
    apuesta: number
    objetivo: number
    minutos: number | null
  }[]
  colecciones: { salones: number; marcos: number; accesorios: number; medallas: number }
  social: { amigos: number; mensajes: number; resenas: number }
}

/** 98 → "1 h 38 min"; 45 → "45 min". */
export function duracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
