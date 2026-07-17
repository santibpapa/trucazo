import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { cn } from '@/components/ui/cn'

// Página privada del admin: nunca la indexa Google.
export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

type Totales = {
  usuarios: number
  registrados_hoy: number
  jugaron_hoy: number
  partidas_hoy: number
}
type RegDia = { dia: string; cantidad: number }
type PartDia = { dia: string; partidas: number; jugadores: number }
type Stats = {
  totales: Totales
  registros_por_dia: RegDia[]
  partidas_por_dia: PartDia[]
}

// "2026-07-17" -> "17" (día del mes, sin cero adelante)
function diaLabel(iso: string): string {
  return String(Number(iso.slice(8, 10)))
}

// Tarjeta de un número grande de un vistazo.
function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-card',
        accent ? 'border-gold-700 bg-gold-soft' : 'border-line bg-surface',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-display text-3xl font-extrabold tabular-nums',
          accent ? 'text-gold' : 'text-cream',
        )}
      >
        {value.toLocaleString('es-AR')}
      </p>
    </div>
  )
}

// Gráfico de barras simple (una barra por día). Sin librerías: puro CSS.
function BarChart({
  bars,
  accent,
}: {
  bars: { label: string; value: number; title: string }[]
  accent: string // clase de fondo (color de la barra)
}) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5">
        {bars.map((b, i) => {
          const pct = (b.value / max) * 100
          const isToday = i === bars.length - 1
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={b.title}
            >
              <span className="text-[10px] font-semibold tabular-nums text-muted">
                {b.value > 0 ? b.value : ''}
              </span>
              <div
                className={cn(
                  'w-full rounded-t-md',
                  b.value > 0 ? accent : 'bg-surface2',
                  isToday && 'shadow-gold-ring',
                )}
                style={{ height: `${b.value > 0 ? Math.max(pct, 5) : 3}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {bars.map((b, i) => {
          const isToday = i === bars.length - 1
          return (
            <span
              key={i}
              className={cn(
                'flex-1 text-center text-[10px] tabular-nums',
                isToday ? 'font-bold text-gold' : 'text-subtle',
              )}
            >
              {b.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // La función se defiende sola: si no sos admin, tira error y te vas al lobby.
  const { data, error } = await supabase.rpc('admin_stats', { p_days: 14 })
  if (error || !data) redirect('/lobby')

  const stats = data as Stats
  const { totales } = stats

  const regBars = stats.registros_por_dia.map((d) => ({
    label: diaLabel(d.dia),
    value: d.cantidad,
    title: `${d.dia}: ${d.cantidad} registro(s)`,
  }))
  const partBars = stats.partidas_por_dia.map((d) => ({
    label: diaLabel(d.dia),
    value: d.partidas,
    title: `${d.dia}: ${d.partidas} partida(s) · ${d.jugadores} jugador(es)`,
  }))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-cream">
            Panel de estadísticas
          </h1>
          <p className="text-sm text-muted">Solo vos ves esto · últimos 14 días</p>
        </div>
        <a
          href="/lobby"
          className="shrink-0 text-sm font-semibold text-gold hover:underline"
        >
          ← Volver
        </a>
      </header>

      {/* Un vistazo */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Usuarios" value={totales.usuarios} />
        <StatCard label="Registros hoy" value={totales.registrados_hoy} accent />
        <StatCard label="Jugaron hoy" value={totales.jugaron_hoy} accent />
        <StatCard label="Partidas hoy" value={totales.partidas_hoy} />
      </section>

      {/* Registros por día */}
      <section className="mb-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold text-cream">
          Registros por día
        </h2>
        <BarChart bars={regBars} accent="bg-gold" />
      </section>

      {/* Partidas por día */}
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-1 font-display text-lg font-bold text-cream">
          Partidas por día
        </h2>
        <p className="mb-4 text-xs text-muted">
          Pasá el dedo (o el mouse) por una barra para ver jugadores activos.
        </p>
        <BarChart bars={partBars} accent="bg-info" />
      </section>
    </main>
  )
}
