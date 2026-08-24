'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/components/ui/cn'
import {
  duracion, ETIQUETA_MODO, fechaYHora, haceCuanto, numero,
  type Ficha, type Modo, type Resultado,
} from '../lib'

// ============================================================
// Partida por partida: las últimas 60, con filtro por modo. Es el detalle fino
// que contesta "¿cómo le fue?" cuando los promedios no alcanzan.
// ============================================================

type Partida = Ficha['historial'][number]
type Filtro = 'todas' | Modo

const COLOR_RESULTADO: Record<Resultado, string> = {
  ganada: 'border-positive/40 bg-positive/10 text-positive',
  perdida: 'border-negative/40 bg-negative/10 text-negative',
  en_curso: 'border-info/40 bg-info/10 text-info',
  anulada: 'border-line bg-surface2 text-subtle',
}

const TEXTO_RESULTADO: Record<Resultado, string> = {
  ganada: 'Ganó',
  perdida: 'Perdió',
  en_curso: 'En curso',
  anulada: 'Anulada',
}

const ETIQUETA_CORTA: Record<Modo, string> = {
  personas: 'Persona',
  bot: 'Bot',
  campana: 'Campaña',
}

export default function Historial({
  partidas,
  ahora,
}: {
  partidas: Partida[]
  ahora: string
}) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  // Solo se ofrecen los modos que esta persona jugó de verdad: un filtro que
  // siempre da cero es ruido.
  const modos = useMemo(
    () => (['personas', 'bot', 'campana'] as Modo[]).filter(m => partidas.some(p => p.modo === m)),
    [partidas],
  )
  const lista = filtro === 'todas' ? partidas : partidas.filter(p => p.modo === filtro)

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-card">
      <header className="flex flex-col gap-3 border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-cream">Partida por partida</h2>
          <p className="text-xs text-muted">
            Las últimas {numero(partidas.length)}, de la más nueva a la más vieja
          </p>
        </div>
        {modos.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por modo">
            {(['todas', ...modos] as Filtro[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filtro === f
                    ? 'border-gold-700 bg-gold-soft text-gold'
                    : 'border-line bg-surface2 text-muted hover:text-cream',
                )}
              >
                {f === 'todas' ? 'Todas' : ETIQUETA_MODO[f]}
              </button>
            ))}
          </div>
        )}
      </header>

      {lista.length === 0 ? (
        <p className="p-10 text-center text-sm text-subtle">Todavía no jugó ninguna partida.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-subtle">
                <th scope="col" className="px-4 py-2.5 font-semibold">Cuándo</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Rival</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">Cómo salió</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">Marcador</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">Apuesta</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">Duró</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id} className="border-b border-line/50 last:border-0 hover:bg-surface2/40">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <p className="text-cream">{haceCuanto(p.fecha, ahora)}</p>
                    <p className="text-xs tabular-nums text-subtle">{fechaYHora(p.fecha)}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="truncate text-cream">{p.rival}</p>
                    <p className="text-xs text-subtle">{ETIQUETA_CORTA[p.modo]}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={cn(
                        'whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold',
                        COLOR_RESULTADO[p.resultado],
                      )}
                    >
                      {TEXTO_RESULTADO[p.resultado]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center tabular-nums">
                    <b className={p.mi_puntaje >= p.su_puntaje ? 'text-cream' : 'text-muted'}>
                      {p.mi_puntaje}
                    </b>
                    <span className="mx-1 text-subtle">–</span>
                    <b className={p.su_puntaje > p.mi_puntaje ? 'text-cream' : 'text-muted'}>
                      {p.su_puntaje}
                    </b>
                    <span className="ml-1.5 text-xs text-subtle">a {p.objetivo}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-cream">
                    {p.modo === 'campana' ? <span className="text-subtle">—</span> : numero(p.apuesta)}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                    {p.minutos !== null ? duracion(p.minutos) : <span className="text-subtle">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
