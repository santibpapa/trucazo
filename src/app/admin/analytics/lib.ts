export type AcquisitionTotals = {
  visitantes_hoy: number
  visitantes_ayer: number
  visitantes: number
  sesiones: number
  paginas: number
  jugaron: number
  registros: number
  identificados: number
  volvieron: number
  directos: number
}

export type AcquisitionStats = {
  generado_at: string
  dias: number
  desde: string
  hasta: string
  totales: AcquisitionTotals
  serie: {
    dia: string
    visitantes: number
    sesiones: number
    paginas: number
    jugaron: number
  }[]
  fuentes: {
    source: string
    medium: string
    visitantes: number
    sesiones: number
    jugaron: number
    registros: number
  }[]
  campanas: {
    campaign: string
    visitantes: number
    sesiones: number
    jugaron: number
  }[]
  entradas: { path: string; visitantes: number }[]
  dispositivos: { nombre: string; visitantes: number }[]
  navegadores: { nombre: string; visitantes: number }[]
  paises: { codigo: string; visitantes: number }[]
}
