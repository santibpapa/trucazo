import Link from 'next/link'
import { cn } from '@/components/ui/cn'
import { Columnas, Embudo, Horarios } from './Graficos'
import Personas from './Personas'
import { diaCorto, diaLargo, fechaYHora, numero, VIZ, type Stats } from './lib'

export const RANGOS = [7, 14, 30, 90]

// ============================================================
// El tablero entero. No sabe de sesiones ni de Supabase: recibe las cuentas ya
// hechas y las dibuja. (Los datos los trae page.tsx.)
// ============================================================
export default function Tablero({ stats, dias }: { stats: Stats; dias: number }) {
  const { totales: t, serie, embudo, horarios, generado_at: ahora } = stats

  // Los gráficos de arriba usan los mismos datos, pero cuentan cosas distintas:
  // uno habla de PERSONAS y el otro de PARTIDAS. Nunca se mezclan en un mismo eje.
  const puntos = serie.map(d => ({
    etiqueta: diaCorto(d.dia),
    detalle: diaLargo(d.dia),
    valores: {
      registros: d.registros,
      activos: d.activos,
      personas: d.partidas_personas,
      maquina: d.partidas - d.partidas_personas,
    },
  }))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      {/* ---------------------------------------------------------- */}
      {/* Encabezado + elegir el período                              */}
      {/* ---------------------------------------------------------- */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/lobby"
            className="mb-1 inline-block text-sm font-medium text-muted transition-colors hover:text-gold"
          >
            ← Volver al lobby
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-cream sm:text-3xl">
            Panel de estadísticas
          </h1>
          <p className="text-sm text-muted">
            Solo vos ves esto. Datos al {fechaYHora(ahora)} (hora de Argentina).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/analytics"
            className="rounded-xl border border-gold/60 bg-gold-soft/20 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold-soft/35"
          >
            Tráfico
          </Link>
          <Link
            href="/admin/emails"
            className="rounded-xl border border-gold/60 bg-gold-soft/20 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold-soft/35"
          >
            Emails
          </Link>
          <nav
            className="flex items-center gap-1 rounded-full border border-line bg-surface p-1"
            aria-label="Período"
          >
            {RANGOS.map(r => (
              <Link
                key={r}
                href={`/admin?dias=${r}`}
                aria-current={r === dias ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
                  r === dias
                    ? 'bg-gold-soft text-gold shadow-gold-ring'
                    : 'text-muted hover:text-cream',
                )}
              >
                {r} días
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* Hoy, de un vistazo                                          */}
      {/* ---------------------------------------------------------- */}
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-subtle">
        Hoy
      </h2>
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta
          etiqueta="Se anotaron hoy"
          valor={t.nuevos_hoy}
          color={VIZ.altas}
          delta={{ valor: t.nuevos_hoy - t.nuevos_ayer, contra: 'ayer' }}
          pie={`${numero(t.nuevos_7d)} en los últimos 7 días`}
        />
        <Tarjeta
          etiqueta="Jugaron hoy"
          valor={t.jugaron_hoy}
          color={VIZ.activos}
          delta={{ valor: t.jugaron_hoy - t.jugaron_ayer, contra: 'ayer' }}
          pie={`${numero(t.jugaron_7d)} personas distintas en 7 días`}
        />
        <Tarjeta
          etiqueta="Partidas hoy"
          valor={t.partidas_hoy}
          color={VIZ.partidas}
          delta={{ valor: t.partidas_hoy - t.partidas_ayer, contra: 'ayer' }}
          pie={`${numero(t.partidas_7d)} en los últimos 7 días`}
        />
        <Tarjeta
          etiqueta="En línea ahora"
          valor={t.online_ahora}
          pie={`${numero(t.en_curso)} partidas en curso · ${numero(t.mesas_esperando)} mesas esperando`}
        />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* El total acumulado                                          */}
      {/* ---------------------------------------------------------- */}
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-subtle">
        Desde que abrió Trucazo
      </h2>
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta
          etiqueta="Personas registradas"
          valor={t.personas}
          pie={`${numero(t.con_cuenta)} con cuenta · ${numero(t.invitados)} invitados`}
        />
        <Tarjeta
          etiqueta="Llegaron a jugar"
          valor={t.jugaron_alguna_vez}
          pie={
            t.personas > 0
              ? `${Math.round((t.jugaron_alguna_vez / t.personas) * 100)}% de los que se anotaron`
              : 'Todavía nadie'
          }
        />
        <Tarjeta
          etiqueta="Partidas jugadas"
          valor={t.partidas_total}
          pie={`${numero(t.partidas_personas_total)} entre personas · ${numero(t.partidas_maquina_total)} contra la máquina`}
        />
        <Tarjeta
          etiqueta="Reseñas recibidas"
          valor={t.resenas}
          pie={
            t.resenas_puntaje !== null
              ? `${t.resenas_puntaje} de 5 en promedio · ${numero(t.resenas_7d)} esta semana`
              : 'Todavía no dejaron ninguna'
          }
        />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Los dos gráficos grandes                                    */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Bloque
          titulo="Personas, día por día"
          bajada="Cuántas se anotaron y cuántas se sentaron a jugar cada día."
        >
          <Columnas
            puntos={puntos}
            unidad="personas"
            series={[
              { clave: 'registros', nombre: 'Se anotaron', color: VIZ.altas },
              { clave: 'activos', nombre: 'Jugaron', color: VIZ.activos },
            ]}
          />
        </Bloque>

        <Bloque
          titulo="Partidas, día por día"
          bajada="En verde las que se jugaron entre dos personas: son las que valen."
        >
          <Columnas
            puntos={puntos}
            unidad="partidas"
            modo="apilado"
            series={[
              { clave: 'maquina', nombre: 'Contra la máquina', color: VIZ.apagado },
              { clave: 'personas', nombre: 'Entre personas', color: VIZ.partidas },
            ]}
          />
        </Bloque>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Embudo + horarios                                           */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Bloque
          titulo="¿Se quedan?"
          bajada={`De las ${numero(embudo.registrados)} personas que se anotaron en estos ${dias} días.`}
        >
          <Embudo
            pasos={[
              {
                nombre: 'Se anotaron',
                valor: embudo.registrados,
                ayuda: 'Crearon una cuenta o entraron como invitados.',
              },
              {
                nombre: 'Jugaron al menos una',
                valor: embudo.jugaron_una,
                ayuda: 'Pasaron del lobby y se sentaron a una mesa.',
              },
              {
                nombre: 'Jugaron tres o más',
                valor: embudo.jugaron_tres,
                ayuda: 'La primera no fue por curiosidad: se engancharon.',
              },
              {
                nombre: 'Volvieron otro día',
                valor: embudo.volvieron,
                ayuda: 'La señal más importante: jugaron en dos días distintos.',
              },
            ]}
          />
        </Bloque>

        <Bloque
          titulo="A qué hora se juega"
          bajada={`Partidas por hora del día, sumando los últimos ${dias} días.`}
        >
          <Horarios horas={horarios} />
        </Bloque>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Quién y cuándo                                              */}
      {/* ---------------------------------------------------------- */}
      <Personas personas={stats.personas} ahora={ahora} />

      <p className="mt-4 text-center text-xs text-subtle">
        La lista muestra las últimas 500 personas registradas. Los bots de la campaña y
        del lobby no cuentan como personas, pero sus partidas sí aparecen como
        &laquo;contra la máquina&raquo;.
      </p>
    </main>
  )
}

// ------------------------------------------------------------
// Tarjeta de un número grande, con la comparación contra ayer.
// El color del puntito repite el del gráfico correspondiente, así se sabe de
// un vistazo qué tarjeta va con qué barra.
// ------------------------------------------------------------
function Tarjeta({
  etiqueta,
  valor,
  pie,
  color,
  delta,
}: {
  etiqueta: string
  valor: number
  pie: string
  color?: string
  delta?: { valor: number; contra: string }
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {color && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        {etiqueta}
      </p>

      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold text-cream">
          {numero(valor)}
        </span>
        {delta && delta.valor !== 0 && (
          <span
            className={cn(
              'text-xs font-semibold',
              delta.valor > 0 ? 'text-positive' : 'text-negative',
            )}
          >
            {delta.valor > 0 ? '▲' : '▼'} {numero(Math.abs(delta.valor))} vs. {delta.contra}
          </span>
        )}
        {delta && delta.valor === 0 && (
          <span className="text-xs text-subtle">igual que {delta.contra}</span>
        )}
      </p>

      <p className="mt-1 text-xs text-subtle">{pie}</p>
    </div>
  )
}

function Bloque({
  titulo,
  bajada,
  children,
}: {
  titulo: string
  bajada: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <h2 className="font-display text-lg font-bold text-cream">{titulo}</h2>
      <p className="mb-4 mt-0.5 text-xs text-muted">{bajada}</p>
      {children}
    </section>
  )
}
