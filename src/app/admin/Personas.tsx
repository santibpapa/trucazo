'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui'
import { cn } from '@/components/ui/cn'
import {
  diaDe, diaLargo, ETIQUETA_TIPO, fechaYHora, haceCuanto, numero,
  type Persona, type TipoCuenta,
} from './lib'

// ============================================================
// "Quién y cuándo": la lista de personas, la más nueva arriba y agrupada por
// día de registro. Se puede buscar por nombre o email, filtrar (los que
// jugaron, los que no, los invitados) y ordenar por cualquier columna.
// Todo pasa en el navegador: los datos ya vinieron enteros del servidor.
// ============================================================

type Filtro = 'todos' | 'jugaron' | 'no_jugaron' | 'con_cuenta' | 'invitados'
type Orden = 'creado_at' | 'partidas' | 'ganadas' | 'ultima_partida'

const FILTROS: { clave: Filtro; nombre: string }[] = [
  { clave: 'todos', nombre: 'Todas' },
  { clave: 'jugaron', nombre: 'Jugaron' },
  { clave: 'no_jugaron', nombre: 'No jugaron' },
  { clave: 'con_cuenta', nombre: 'Con cuenta' },
  { clave: 'invitados', nombre: 'Invitados' },
]

const COLOR_TIPO: Record<TipoCuenta, string> = {
  email: 'border-line bg-surface2 text-muted',
  google: 'border-info/40 bg-info/10 text-info',
  invitado: 'border-line bg-surface2 text-subtle',
}

export default function Personas({
  personas,
  ahora,
}: {
  personas: Persona[]
  ahora: string
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [orden, setOrden] = useState<Orden>('creado_at')

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const filtradas = personas.filter(p => {
      if (q && !p.nombre.toLowerCase().includes(q) &&
          !(p.email ?? '').toLowerCase().includes(q)) return false
      if (filtro === 'jugaron') return p.partidas > 0
      if (filtro === 'no_jugaron') return p.partidas === 0
      if (filtro === 'con_cuenta') return p.tipo !== 'invitado'
      if (filtro === 'invitados') return p.tipo === 'invitado'
      return true
    })
    const valor = (p: Persona) =>
      orden === 'creado_at' ? new Date(p.creado_at).getTime()
      : orden === 'partidas' ? p.partidas
      : orden === 'ganadas' ? p.ganadas
      : p.ultima_partida ? new Date(p.ultima_partida).getTime() : 0
    return [...filtradas].sort((a, b) => valor(b) - valor(a))
  }, [personas, busqueda, filtro, orden])

  // Los renglones de día solo tienen sentido con la lista ordenada por fecha
  // de registro; en cualquier otro orden serían un estorbo.
  const agrupar = orden === 'creado_at'
  const jugaron = lista.filter(p => p.partidas > 0).length

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-card">
      <header className="flex flex-col gap-3 border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-cream">Quién se anotó y cuándo</h2>
          <p className="text-xs text-muted">
            <b className="tabular-nums text-cream">{numero(lista.length)}</b> personas ·{' '}
            <b className="tabular-nums text-cream">{numero(jugaron)}</b> jugaron alguna partida
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar persona"
            className="w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-sm text-cream placeholder:text-subtle focus:border-gold-700 focus:outline-none sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar personas">
            {FILTROS.map(f => (
              <button
                key={f.clave}
                type="button"
                onClick={() => setFiltro(f.clave)}
                aria-pressed={filtro === f.clave}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filtro === f.clave
                    ? 'border-gold-700 bg-gold-soft text-gold'
                    : 'border-line bg-surface2 text-muted hover:text-cream',
                )}
              >
                {f.nombre}
              </button>
            ))}
          </div>
        </div>
      </header>

      {lista.length === 0 ? (
        <p className="p-10 text-center text-sm text-subtle">
          No hay nadie que cumpla con eso.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-subtle">
                <th scope="col" className="px-4 py-2.5 font-semibold">Persona</th>
                <Ordenable actual={orden} clave="creado_at" set={setOrden}>Se anotó</Ordenable>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">¿Jugó?</th>
                <Ordenable actual={orden} clave="partidas" set={setOrden} centro>Partidas</Ordenable>
                <Ordenable actual={orden} clave="ganadas" set={setOrden} centro>Ganó / Perdió</Ordenable>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">Días que jugó</th>
                <Ordenable actual={orden} clave="ultima_partida" set={setOrden}>Última partida</Ordenable>
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Ver la ficha</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => {
                const dia = diaDe(p.creado_at)
                const nuevoDia = agrupar && (i === 0 || diaDe(lista[i - 1].creado_at) !== dia)
                const delDia = nuevoDia
                  ? lista.filter(x => diaDe(x.creado_at) === dia).length
                  : 0
                return (
                  <RenglonPersona
                    key={p.id}
                    persona={p}
                    ahora={ahora}
                    encabezadoDia={nuevoDia ? { dia, cantidad: delDia } : null}
                    onAbrir={() => router.push(`/admin/persona/${p.id}`)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Ordenable({
  actual, clave, set, centro, children,
}: {
  actual: Orden
  clave: Orden
  set: (o: Orden) => void
  centro?: boolean
  children: React.ReactNode
}) {
  const activo = actual === clave
  return (
    <th
      scope="col"
      className={cn('px-3 py-2.5 font-semibold', centro && 'text-center')}
      aria-sort={activo ? 'descending' : 'none'}
    >
      <button
        type="button"
        onClick={() => set(clave)}
        className={cn('hover:text-cream', activo && 'text-gold')}
      >
        {children}
        <span aria-hidden="true" className="ml-1">{activo ? '▾' : ''}</span>
      </button>
    </th>
  )
}

function RenglonPersona({
  persona: p,
  ahora,
  encabezadoDia,
  onAbrir,
}: {
  persona: Persona
  ahora: string
  encabezadoDia: { dia: string; cantidad: number } | null
  onAbrir: () => void
}) {
  return (
    <>
      {encabezadoDia && (
        <tr className="bg-surface2/60">
          <th
            scope="colgroup"
            colSpan={8}
            className="px-4 py-1.5 text-left text-xs font-semibold text-muted"
          >
            <span className="text-cream">{diaLargo(encabezadoDia.dia)}</span>
            <span className="ml-2 text-subtle">
              · {encabezadoDia.cantidad} {encabezadoDia.cantidad === 1 ? 'persona' : 'personas'}
            </span>
          </th>
        </tr>
      )}
      {/* Toda la fila lleva a la ficha (cómodo con el dedo), y el nombre es
          además un enlace de verdad, para que ande el teclado y "abrir en otra
          pestaña". Tocar el enlace navega igual, así que no hay conflicto. */}
      <tr
        onClick={onAbrir}
        className="cursor-pointer border-b border-line/50 last:border-0 hover:bg-surface2/40"
      >
        {/* Persona */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar url={p.avatar_url} name={p.nombre} size={30} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium text-cream">
                <Link
                  href={`/admin/persona/${p.id}`}
                  className="truncate hover:text-gold hover:underline"
                >
                  {p.nombre}
                </Link>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium',
                    COLOR_TIPO[p.tipo],
                  )}
                >
                  {ETIQUETA_TIPO[p.tipo]}
                </span>
              </p>
              <p className="truncate text-xs text-subtle">{p.email ?? 'sin email'}</p>
            </div>
          </div>
        </td>

        {/* Se anotó */}
        <td className="whitespace-nowrap px-3 py-2.5">
          <p className="tabular-nums text-cream">{fechaYHora(p.creado_at)}</p>
          <p className="text-xs text-subtle">{haceCuanto(p.creado_at, ahora)}</p>
        </td>

        {/* ¿Jugó? */}
        <td className="px-3 py-2.5 text-center">
          {p.partidas > 0 ? (
            <span className="rounded-full border border-positive/40 bg-positive/10 px-2 py-0.5 text-xs font-semibold text-positive">
              Sí
            </span>
          ) : (
            <span className="rounded-full border border-line bg-surface2 px-2 py-0.5 text-xs font-semibold text-subtle">
              No
            </span>
          )}
        </td>

        {/* Partidas */}
        <td className="px-3 py-2.5 text-center">
          <p className="font-semibold tabular-nums text-cream">{numero(p.partidas)}</p>
          {p.partidas > 0 && (
            <p className="text-xs text-subtle">
              {numero(p.partidas_personas)} vs. personas · {numero(p.partidas_maquina)} vs. máquina
            </p>
          )}
        </td>

        {/* Ganó / Perdió */}
        <td className="px-3 py-2.5 text-center tabular-nums">
          {p.partidas > 0 ? (
            <span className="text-cream">
              <b className="text-positive">{numero(p.ganadas)}</b>
              <span className="mx-1 text-subtle">/</span>
              <b className="text-negative">{numero(p.perdidas)}</b>
            </span>
          ) : (
            <span className="text-subtle">—</span>
          )}
        </td>

        {/* Días que jugó */}
        <td className="px-3 py-2.5 text-center tabular-nums text-cream">
          {p.dias_jugados > 0 ? numero(p.dias_jugados) : <span className="text-subtle">—</span>}
        </td>

        {/* Última partida */}
        <td className="whitespace-nowrap px-3 py-2.5">
          {p.ultima_partida ? (
            <>
              <p className="text-cream">{haceCuanto(p.ultima_partida, ahora)}</p>
              <p className="text-xs text-subtle tabular-nums">{fechaYHora(p.ultima_partida)}</p>
            </>
          ) : (
            <span className="text-subtle">Nunca jugó</span>
          )}
        </td>

        {/* La flechita: la pista visual de que la fila se puede abrir. */}
        <td className="px-3 py-2.5 text-right text-subtle" aria-hidden="true">›</td>
      </tr>
    </>
  )
}
