import Link from 'next/link'
import { cn } from '@/components/ui/cn'
import { Columnas, Embudo } from '../Graficos'
import { RANGOS } from '../Tablero'
import { diaCorto, diaLargo, fechaYHora, numero, VIZ } from '../lib'
import type { AcquisitionStats } from './lib'

export default function AnalyticsDashboard({
  stats,
  dias,
}: {
  stats: AcquisitionStats
  dias: number
}) {
  const { totales: t } = stats
  const puntos = stats.serie.map(d => ({
    etiqueta: diaCorto(d.dia),
    detalle: diaLargo(d.dia),
    valores: { visitantes: d.visitantes, sesiones: d.sesiones },
  }))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-1 inline-block text-sm font-medium text-muted transition-colors hover:text-gold">
            ← Volver a estadísticas
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-cream sm:text-3xl">
            Tráfico y adquisición
          </h1>
          <p className="text-sm text-muted">
            De dónde llegan y qué hacen. Datos al {fechaYHora(stats.generado_at)}.
          </p>
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1" aria-label="Período">
          {RANGOS.map(r => (
            <Link
              key={r}
              href={`/admin/analytics?dias=${r}`}
              aria-current={r === dias ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
                r === dias ? 'bg-gold-soft text-gold shadow-gold-ring' : 'text-muted hover:text-cream',
              )}
            >
              {r} días
            </Link>
          ))}
        </nav>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Visitantes hoy" value={t.visitantes_hoy} note={`${numero(t.visitantes_ayer)} ayer`} color={VIZ.altas} />
        <Card label={`Visitantes en ${dias} días`} value={t.visitantes} note={`${numero(t.sesiones)} sesiones`} color={VIZ.activos} />
        <Card label="Empezaron una partida" value={t.jugaron} note={percentage(t.jugaron, t.visitantes)} color={VIZ.partidas} />
        <Card label="Volvieron otro día" value={t.volvieron} note={percentage(t.volvieron, t.visitantes)} />
      </section>

      <p className="mb-6 rounded-xl border border-gold/25 bg-gold-soft/10 px-4 py-3 text-xs leading-relaxed text-muted">
        Este tablero empieza a contar desde que se aplica esta versión; no puede reconstruir visitas anteriores.
        “Directo / sin identificar” incluye enlaces escritos, favoritos y aplicaciones como WhatsApp que a veces ocultan el origen.
      </p>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Block title="Visitantes y sesiones" subtitle="Una persona aproximada puede abrir más de una sesión.">
          <Columnas
            puntos={puntos}
            unidad="visitas"
            series={[
              { clave: 'visitantes', nombre: 'Visitantes', color: VIZ.activos },
              { clave: 'sesiones', nombre: 'Sesiones', color: VIZ.altas },
            ]}
          />
        </Block>

        <Block title="Qué hicieron" subtitle={`Sobre ${numero(t.visitantes)} visitantes de estos ${dias} días.`}>
          <Embudo pasos={[
            { nombre: 'Visitaron la página', valor: t.visitantes, ayuda: 'Personas aproximadas, no recargas.' },
            { nombre: 'Entraron con un usuario', valor: t.identificados, ayuda: 'Cuenta, Google o modo invitado.' },
            { nombre: 'Empezaron una partida', valor: t.jugaron, ayuda: 'Llegaron efectivamente a la mesa.' },
            { nombre: 'Volvieron otro día', valor: t.volvieron, ayuda: 'Tuvieron sesiones en dos días distintos.' },
          ]} />
        </Block>
      </div>

      <Block title="De dónde llegaron" subtitle="El origen de cada sesión; Google acá significa búsqueda orgánica, no inicio de sesión con Google." className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-subtle">
                <th className="pb-2 font-semibold">Origen</th>
                <th className="pb-2 font-semibold">Canal</th>
                <th className="pb-2 text-right font-semibold">Personas</th>
                <th className="pb-2 text-right font-semibold">Sesiones</th>
                <th className="pb-2 text-right font-semibold">Jugaron</th>
                <th className="pb-2 text-right font-semibold">Registros</th>
              </tr>
            </thead>
            <tbody>
              {stats.fuentes.map(row => (
                <tr key={`${row.source}:${row.medium}`} className="border-b border-line/60 last:border-0">
                  <td className="py-3 font-semibold text-cream">{row.source}</td>
                  <td className="py-3 text-muted">{row.medium}</td>
                  <td className="py-3 text-right tabular-nums text-cream">{numero(row.visitantes)}</td>
                  <td className="py-3 text-right tabular-nums text-muted">{numero(row.sesiones)}</td>
                  <td className="py-3 text-right tabular-nums text-muted">{numero(row.jugaron)}</td>
                  <td className="py-3 text-right tabular-nums text-muted">{numero(row.registros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.fuentes.length === 0 && <Empty />}
        </div>
      </Block>

      {stats.campanas.length > 0 && (
        <Block title="Campañas identificadas" subtitle="Enlaces con UTM: emails de Trucazo, QR y futuras acciones." className="mb-4">
          <Rows rows={stats.campanas.map(row => ({
            label: row.campaign,
            value: row.visitantes,
            note: `${numero(row.sesiones)} sesiones · ${numero(row.jugaron)} jugaron`,
          }))} total={t.visitantes} />
        </Block>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Block title="Páginas de entrada" subtitle="La primera página de cada sesión.">
          <Rows rows={stats.entradas.map(row => ({ label: row.path, value: row.visitantes }))} total={t.visitantes} />
        </Block>
        <Block title="Dispositivos" subtitle="Sin guardar el identificador completo del navegador.">
          <Rows rows={stats.dispositivos.map(row => ({ label: row.nombre, value: row.visitantes }))} total={t.visitantes} />
        </Block>
        <Block title="Navegadores y países" subtitle="País aproximado informado por el alojamiento.">
          <Rows rows={stats.navegadores.map(row => ({ label: row.nombre, value: row.visitantes }))} total={t.visitantes} />
          <div className="mt-5 border-t border-line pt-4">
            <Rows rows={stats.paises.slice(0, 6).map(row => ({ label: countryName(row.codigo), value: row.visitantes }))} total={t.visitantes} />
          </div>
        </Block>
      </div>

      <p className="mt-5 text-center text-xs text-subtle">
        Se excluyen el panel admin, administradores autenticados y bots evidentes. Ningún filtro automático es perfecto.
      </p>
    </main>
  )
}

function Card({ label, value, note, color }: { label: string; value: number; note: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-extrabold text-cream">{numero(value)}</p>
      <p className="mt-1 text-xs text-subtle">{note}</p>
    </div>
  )
}

function Block({ title, subtitle, className, children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
      <h2 className="font-display text-lg font-bold text-cream">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-muted">{subtitle}</p>
      {children}
    </section>
  )
}

function Rows({ rows, total }: { rows: { label: string; value: number; note?: string }[]; total: number }) {
  if (rows.length === 0) return <Empty />
  return (
    <ul className="space-y-3">
      {rows.map(row => (
        <li key={row.label}>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 break-words text-cream">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-cream">{numero(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(total ? row.value / total * 100 : 0, row.value ? 2 : 0)}%` }} />
          </div>
          {row.note && <p className="mt-1 text-xs text-subtle">{row.note}</p>}
        </li>
      ))}
    </ul>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-subtle">Todavía no hay datos en este período.</p>
}

function percentage(value: number, total: number) {
  return total ? `${Math.round(value / total * 100)}% de los visitantes` : 'Todavía sin datos'
}

function countryName(code: string) {
  if (code === '—') return 'Sin identificar'
  try {
    return new Intl.DisplayNames(['es-AR'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}
