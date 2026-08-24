'use client'

import { useState } from 'react'
import { cn } from '@/components/ui/cn'
import { numero, techo, VIZ } from './lib'

// ============================================================
// Las piezas de dibujo del panel. Ninguna sabe de dónde salen los números:
// reciben datos ya cocinados y los muestran. Sin librerías de gráficos.
//
// Reglas que se respetan en todos:
//   * barras finas (máximo 22px) con la punta redondeada y la base al ras;
//   * un hueco de 2px del color del fondo entre barras que se tocan;
//   * grilla y ejes apagados: el dato es lo único que grita;
//   * SIEMPRE se puede pasar el dedo/mouse por encima y ver el detalle;
//   * los textos nunca van del color de la serie (se leen mal): el color lo
//     lleva el cuadradito de la referencia, al lado.
// ============================================================

export type Serie = { clave: string; nombre: string; color: string }
export type Punto = { etiqueta: string; detalle: string; valores: Record<string, number> }

// ------------------------------------------------------------
// Referencia (qué color es qué)
// ------------------------------------------------------------
function Referencia({ series }: { series: Serie[] }) {
  if (series.length < 2) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map(s => (
        <span key={s.clave} className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: s.color }}
            aria-hidden="true"
          />
          {s.nombre}
        </span>
      ))}
    </div>
  )
}

// ------------------------------------------------------------
// Globito con el detalle del día que se está tocando
// ------------------------------------------------------------
function Globito({
  punto,
  series,
  izquierda,
}: {
  punto: Punto
  series: Serie[]
  izquierda: boolean
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1 z-20 w-max min-w-[9rem] max-w-[13rem]',
        'rounded-xl border border-line bg-base/95 p-2.5 shadow-lift backdrop-blur-sm',
        izquierda ? 'left-0' : 'right-0',
      )}
      role="status"
    >
      <p className="mb-1.5 text-xs font-semibold text-cream">{punto.detalle}</p>
      <ul className="flex flex-col gap-1">
        {series.map(s => (
          <li key={s.clave} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="flex-1 text-muted">{s.nombre}</span>
            <span className="font-semibold tabular-nums text-cream">
              {numero(punto.valores[s.clave] ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------
// Gráfico de columnas por día. Dos modos:
//   'lado'    → una barra al lado de la otra (comparar dos cosas distintas)
//   'apilado' → una arriba de la otra (las partes de un mismo total)
// ------------------------------------------------------------
export function Columnas({
  puntos,
  series,
  modo = 'lado',
  alto = 176,
  unidad,
}: {
  puntos: Punto[]
  series: Serie[]
  modo?: 'lado' | 'apilado'
  alto?: number
  unidad: string
}) {
  const [activo, setActivo] = useState<number | null>(null)

  const totalDe = (p: Punto) =>
    modo === 'apilado'
      ? series.reduce((s, serie) => s + (p.valores[serie.clave] ?? 0), 0)
      : Math.max(...series.map(s => p.valores[s.clave] ?? 0), 0)

  const max = techo(Math.max(1, ...puntos.map(totalDe)))
  const marcas = [max, Math.round(max / 2), 0]

  // Con muchos días las etiquetas se pisan: se muestra una cada tantas.
  const salto = puntos.length > 45 ? 7 : puntos.length > 24 ? 3 : puntos.length > 12 ? 2 : 1
  const vacio = puntos.every(p => totalDe(p) === 0)

  return (
    <div>
      <div className="mb-3">
        <Referencia series={series} />
      </div>

      <div className="relative">
        {activo !== null && (
          <Globito
            punto={puntos[activo]}
            series={series}
            izquierda={activo > puntos.length / 2}
          />
        )}

        <div className="flex gap-2">
          {/* Eje de la izquierda */}
          <div
            className="flex w-8 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-subtle"
            style={{ height: alto }}
            aria-hidden="true"
          >
            {marcas.map(m => <span key={m}>{numero(m)}</span>)}
          </div>

          {/* La grilla y las barras */}
          <div className="relative flex-1" style={{ height: alto }}>
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {marcas.map(m => <div key={m} className="h-px w-full bg-line" />)}
            </div>

            <div className="relative flex h-full items-end gap-px">
              {puntos.map((p, i) => {
                const total = totalDe(p)
                return (
                  <div
                    key={p.etiqueta + i}
                    className={cn(
                      'relative flex h-full flex-1 cursor-default items-end justify-center rounded-sm',
                      activo === i && 'bg-surface2/60',
                    )}
                    onMouseEnter={() => setActivo(i)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    tabIndex={0}
                    role="img"
                    aria-label={`${p.detalle}: ${series
                      .map(s => `${numero(p.valores[s.clave] ?? 0)} ${s.nombre}`)
                      .join(', ')}`}
                  >
                    {modo === 'lado' ? (
                      <div className="flex h-full w-full items-end justify-center gap-[2px] px-[2px]">
                        {series.map(s => (
                          <Barra
                            key={s.clave}
                            valor={p.valores[s.clave] ?? 0}
                            max={max}
                            color={s.color}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex w-full max-w-[22px] flex-col-reverse justify-start gap-[2px]"
                        style={{ height: `${(total / max) * 100}%` }}
                      >
                        {series.map((s, k) => {
                          const v = p.valores[s.clave] ?? 0
                          if (v === 0) return null
                          return (
                            <div
                              key={s.clave}
                              className={cn(k === series.length - 1 && 'rounded-t-[4px]')}
                              style={{
                                height: `${(v / Math.max(total, 1)) * 100}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Eje de abajo */}
        <div className="mt-1.5 flex gap-2">
          <span className="w-8 shrink-0" aria-hidden="true" />
          <div className="flex flex-1 gap-px">
            {puntos.map((p, i) => {
              const ultimo = i === puntos.length - 1
              const mostrar = ultimo || (puntos.length - 1 - i) % salto === 0
              return (
                <span
                  key={p.etiqueta + i}
                  className={cn(
                    'min-w-0 flex-1 text-center text-[10px] tabular-nums',
                    ultimo ? 'font-bold text-gold' : 'text-subtle',
                  )}
                >
                  {mostrar ? (ultimo ? 'hoy' : p.etiqueta) : ''}
                </span>
              )
            })}
          </div>
        </div>

        {vacio && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-subtle">
            Todavía no hay {unidad} en este período.
          </p>
        )}
      </div>

      {/* La misma información en texto, para quien no puede ver el gráfico. */}
      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-xs text-subtle hover:text-muted">
          <span className="group-open:hidden">Ver los números ▾</span>
          <span className="hidden group-open:inline">Ocultar los números ▴</span>
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface2 text-subtle">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Día</th>
                {series.map(s => (
                  <th key={s.clave} className="px-2.5 py-1.5 text-right font-medium">
                    {s.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puntos.map((p, i) => (
                <tr key={p.etiqueta + i} className="border-t border-line/60">
                  <td className="px-2.5 py-1.5 text-muted">{p.detalle}</td>
                  {series.map(s => (
                    <td key={s.clave} className="px-2.5 py-1.5 text-right tabular-nums text-cream">
                      {numero(p.valores[s.clave] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/** Una barra sola: punta redondeada arriba, al ras abajo, finita. */
function Barra({ valor, max, color }: { valor: number; max: number; color: string }) {
  return (
    <div className="flex h-full w-full max-w-[22px] items-end">
      <div
        className="w-full rounded-t-[4px]"
        style={{
          height: valor > 0 ? `${Math.max((valor / max) * 100, 1.5)}%` : '2px',
          backgroundColor: valor > 0 ? color : 'rgba(122,100,96,0.35)',
        }}
      />
    </div>
  )
}

// ------------------------------------------------------------
// Embudo: de los que se anotaron, ¿hasta dónde llegaron?
// Un solo tono, de más oscuro a más claro, porque los pasos van en orden.
// ------------------------------------------------------------
export function Embudo({
  pasos,
}: {
  pasos: { nombre: string; valor: number; ayuda: string }[]
}) {
  const base = Math.max(pasos[0]?.valor ?? 0, 1)
  return (
    <ol className="flex flex-col gap-2.5">
      {pasos.map((p, i) => {
        const pct = Math.round((p.valor / base) * 100)
        return (
          <li key={p.nombre}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm text-cream">{p.nombre}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted">
                <b className="font-semibold text-cream">{numero(p.valor)}</b>
                {i > 0 && <span className="ml-1.5 text-subtle">{pct}%</span>}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(pct, p.valor > 0 ? 2 : 0)}%`,
                  backgroundColor: VIZ.rampa[Math.min(i, VIZ.rampa.length - 1)],
                }}
              />
            </div>
            <p className="mt-1 text-xs text-subtle">{p.ayuda}</p>
          </li>
        )
      })}
    </ol>
  )
}

// ------------------------------------------------------------
// A qué hora se juega. 24 columnas, una por hora.
// ------------------------------------------------------------
export function Horarios({ horas }: { horas: { hora: number; partidas: number }[] }) {
  const [activa, setActiva] = useState<number | null>(null)
  const max = Math.max(1, ...horas.map(h => h.partidas))
  const pico = horas.reduce((a, b) => (b.partidas > a.partidas ? b : a), horas[0])

  return (
    <div>
      <div className="relative flex h-24 items-end gap-[2px]">
        {horas.map(h => (
          <div
            key={h.hora}
            className="flex h-full flex-1 cursor-default items-end"
            onMouseEnter={() => setActiva(h.hora)}
            onMouseLeave={() => setActiva(null)}
            onFocus={() => setActiva(h.hora)}
            onBlur={() => setActiva(null)}
            tabIndex={0}
            role="img"
            aria-label={`${h.hora}:00 — ${numero(h.partidas)} partidas`}
          >
            <div
              className={cn('w-full rounded-t-[4px] transition-opacity',
                activa !== null && activa !== h.hora && 'opacity-50')}
              style={{
                height: h.partidas > 0 ? `${Math.max((h.partidas / max) * 100, 3)}%` : '2px',
                backgroundColor: h.partidas > 0 ? VIZ.partidas : 'rgba(122,100,96,0.35)',
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex gap-[2px]" aria-hidden="true">
        {horas.map(h => (
          <span key={h.hora} className="flex-1 text-center text-[9px] tabular-nums text-subtle">
            {h.hora % 6 === 0 ? h.hora : ''}
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {activa !== null ? (
          <>
            <b className="text-cream">{activa}:00 a {activa}:59</b> —{' '}
            {numero(horas[activa]?.partidas ?? 0)} partida
            {(horas[activa]?.partidas ?? 0) === 1 ? '' : 's'}
          </>
        ) : pico && pico.partidas > 0 ? (
          <>La hora más movida es a las <b className="text-cream">{pico.hora}:00</b>, con {numero(pico.partidas)} partidas.</>
        ) : (
          'Todavía no hay partidas en este período.'
        )}
      </p>
    </div>
  )
}

// ------------------------------------------------------------
// Medidor: una barra de 0 a 100 (fama, estilo de juego, avance de campaña).
// Un solo tono; el fondo es el mismo tono apagado, para que se vea el total.
// ------------------------------------------------------------
export function Medidor({
  etiqueta,
  valor,
  maximo = 100,
  texto,
  color = VIZ.altas,
  ayuda,
}: {
  etiqueta: string
  valor: number
  maximo?: number
  /** Lo que se muestra a la derecha. Si falta, se muestra "valor/maximo". */
  texto?: string
  color?: string
  ayuda?: string
}) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-cream">{etiqueta}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-cream">
          {texto ?? `${numero(valor)} / ${numero(maximo)}`}
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface2"
        role="img"
        aria-label={`${etiqueta}: ${texto ?? `${valor} de ${maximo}`}`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct, valor > 0 ? 2 : 0)}%`, backgroundColor: color }}
        />
      </div>
      {ayuda && <p className="mt-1 text-xs text-subtle">{ayuda}</p>}
    </div>
  )
}

// ------------------------------------------------------------
// Ganadas contra perdidas, en una sola barra.
//
// El verde y el rojo solos no alcanzan: para alguien que no distingue esos dos
// colores serían la misma barra. Por eso los números y las palabras van SIEMPRE
// escritos al lado, y el color es un apoyo, no la única pista.
// ------------------------------------------------------------
export function Reparto({
  ganadas,
  perdidas,
}: {
  ganadas: number
  perdidas: number
}) {
  const total = ganadas + perdidas
  if (total === 0) {
    return <p className="text-sm text-subtle">Todavía no terminó ninguna partida.</p>
  }
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface2">
        {ganadas > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${(ganadas / total) * 100}%`, backgroundColor: '#46A574' }}
          />
        )}
        {perdidas > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${(perdidas / total) * 100}%`, backgroundColor: '#D2553B' }}
          />
        )}
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
          <b className="tabular-nums text-cream">{numero(ganadas)}</b> ganadas
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 rounded-full bg-negative" aria-hidden="true" />
          <b className="tabular-nums text-cream">{numero(perdidas)}</b> perdidas
        </span>
      </p>
    </div>
  )
}
