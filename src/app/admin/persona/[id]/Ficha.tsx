import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { cn } from '@/components/ui/cn'
import { getMedal } from '@/lib/medallas'
import { Columnas, Medidor, Reparto } from '../../Graficos'
import Historial from '../Historial'
import {
  diaCorto, diaLargo, duracion, ETIQUETA_MODO, ETIQUETA_TIPO,
  fechaYHora, haceCuanto, numero, VIZ, type Ficha as Datos,
} from '../../lib'

// ============================================================
// La ficha de una persona. Como el tablero: recibe las cuentas ya hechas y las
// dibuja; no sabe de sesiones ni de Supabase.
//
// Colores: las partidas van en verde igual que en el panel principal, y todo lo
// de la campaña (fama, avance, estilo) va en dorado. Cada cosa mantiene su color
// en toda la página.
// ============================================================

export default function Ficha({ datos }: { datos: Datos }) {
  const { perfil, ranking, resumen, por_modo, campana, rivales, social, colecciones } = datos
  const ahora = datos.generado_at
  const jugo = resumen.partidas > 0

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6">
      <Link
        href="/admin"
        className="mb-3 inline-block text-sm font-medium text-muted transition-colors hover:text-gold"
      >
        ← Volver a la lista
      </Link>

      {/* ---------------------------------------------------------- */}
      {/* Quién es                                                    */}
      {/* ---------------------------------------------------------- */}
      <header className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <Avatar
          url={perfil.avatar_url}
          name={perfil.nombre}
          size={64}
          frame={perfil.marco}
          medal={perfil.medalla}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-cream">{perfil.nombre}</h1>
            <Etiqueta>{ETIQUETA_TIPO[perfil.tipo]}</Etiqueta>
            {perfil.es_admin && <Etiqueta destacada>Admin</Etiqueta>}
          </div>
          <p className="truncate text-sm text-muted">
            {perfil.email ?? 'sin email (entró como invitado)'}
          </p>
          <p className="mt-0.5 text-xs text-subtle">
            Se anotó el {fechaYHora(perfil.creado_at)} ({haceCuanto(perfil.creado_at, ahora)})
            {perfil.visto_at && <> · visto {haceCuanto(perfil.visto_at, ahora)}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monedas</p>
          <p className="font-display text-2xl font-extrabold text-gold">{numero(perfil.monedas)}</p>
        </div>
      </header>

      {!jugo ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
          Se anotó pero <b className="text-cream">todavía no jugó ninguna partida</b>. No hay
          estadísticas para mostrar.
        </p>
      ) : (
        <>
          {/* ------------------------------------------------------ */}
          {/* Los números gruesos                                     */}
          {/* ------------------------------------------------------ */}
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Dato
              etiqueta="Partidas jugadas"
              valor={numero(resumen.partidas)}
              pie={`En ${numero(resumen.dias_jugados)} días distintos${
                resumen.en_curso > 0 ? ` · ${resumen.en_curso} en curso` : ''
              }`}
              color={VIZ.partidas}
            />
            <Dato
              etiqueta="Efectividad"
              valor={resumen.efectividad !== null ? `${resumen.efectividad}%` : '—'}
              pie={`${numero(resumen.ganadas)} ganadas · ${numero(resumen.perdidas)} perdidas`}
            />
            <Dato
              etiqueta="Racha actual"
              valor={
                resumen.racha_ganando === null
                  ? '—'
                  : `${numero(resumen.racha)} ${resumen.racha_ganando ? 'ganada' : 'perdida'}${
                      resumen.racha === 1 ? '' : 's'
                    }`
              }
              pie={`Su mejor racha fue de ${numero(resumen.mejor_racha)} seguidas`}
              tono={
                resumen.racha_ganando === null ? undefined : resumen.racha_ganando ? 'bien' : 'mal'
              }
            />
            <Dato
              etiqueta="Tiempo jugando"
              valor={duracion(resumen.minutos_jugados)}
              pie={`Desde el ${
                resumen.primera_partida ? fechaYHora(resumen.primera_partida) : '—'
              }`}
            />
          </section>

          {/* ------------------------------------------------------ */}
          {/* Cómo le va en cada modo — lo que antes se mezclaba       */}
          {/* ------------------------------------------------------ */}
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            {por_modo.map(m => (
              <section
                key={m.modo}
                className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
              >
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-cream">
                    {ETIQUETA_MODO[m.modo]}
                  </h2>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    <b className="text-cream">{numero(m.partidas)}</b> partidas
                  </span>
                </div>
                {m.partidas === 0 ? (
                  <p className="text-sm text-subtle">Nunca jugó en este modo.</p>
                ) : (
                  <>
                    <p className="mb-2 font-display text-2xl font-extrabold text-cream">
                      {m.efectividad !== null ? `${m.efectividad}%` : '—'}
                      <span className="ml-1.5 text-xs font-medium text-subtle">de efectividad</span>
                    </p>
                    <Reparto ganadas={m.ganadas} perdidas={m.perdidas} />
                  </>
                )}
              </section>
            ))}
          </div>

          {/* ------------------------------------------------------ */}
          {/* Ranking + campaña                                       */}
          {/* ------------------------------------------------------ */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Bloque
              titulo="Su lugar en los rankings"
              bajada="Los dos rankings del juego son distintos: el online se gana jugando contra personas, el de la campaña venciendo rivales."
            >
              <div className="mb-4 grid grid-cols-2 gap-3">
                <Puesto
                  nombre="Ranking online"
                  puesto={ranking.online_puesto}
                  total={ranking.online_total}
                  vacio="Todavía no ganó ninguna partida online"
                />
                <Puesto
                  nombre="Ranking de campaña"
                  puesto={ranking.campana_puesto}
                  total={ranking.campana_total}
                  vacio="Todavía no sumó puntos de campaña"
                />
              </div>
              <Medidor
                etiqueta="Fama"
                valor={ranking.fama}
                texto={`${ranking.fama} de 100`}
                ayuda={`${numero(
                  ranking.campana_puntos,
                )} puntos de campaña. Es el mismo número que ve la persona en Historia.`}
              />
            </Bloque>

            <Bloque titulo="Modo campaña" bajada="Cuántos rivales venció, provincia por provincia.">
              <div className="mb-4">
                <Medidor
                  etiqueta="Rivales vencidos"
                  valor={campana.vencidos}
                  maximo={campana.total}
                  texto={`${numero(campana.vencidos)} de ${numero(campana.total)}`}
                />
              </div>
              <ul className="flex flex-col gap-1.5">
                {campana.provincias.map(p => (
                  <li key={p.nombre} className="flex items-center gap-2.5 text-sm">
                    <span className="w-32 shrink-0 truncate text-muted">{p.nombre}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(p.vencidos / Math.max(p.total, 1)) * 100}%`,
                          backgroundColor: VIZ.altas,
                        }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-cream">
                      {p.vencidos}/{p.total}
                    </span>
                  </li>
                ))}
              </ul>
            </Bloque>
          </div>

          {/* ------------------------------------------------------ */}
          {/* Estilo de juego + rivales                               */}
          {/* ------------------------------------------------------ */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Bloque
              titulo="Cómo juega"
              bajada="El juego mide esto solo, mano a mano, en el modo campaña. Sirve para saber si se anima o si va a lo seguro."
            >
              {!campana.estilo.conocido ? (
                <p className="text-sm text-subtle">
                  Todavía jugó pocas manos de campaña ({numero(campana.estilo.manos)}) como para
                  sacar conclusiones. Hacen falta al menos 8.
                </p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  <Medidor
                    etiqueta="Miente"
                    valor={campana.estilo.mentiroso}
                    texto={`${campana.estilo.mentiroso}%`}
                    ayuda="De cada 100 veces que canta, cuántas lo hace sin tener las cartas."
                  />
                  <Medidor
                    etiqueta="Se achica"
                    valor={campana.estilo.achicado}
                    texto={`${campana.estilo.achicado}%`}
                    ayuda="Cuánto se baja cuando el rival le canta algo."
                  />
                  <Medidor
                    etiqueta="Es agresivo"
                    valor={campana.estilo.agresivo}
                    texto={`${campana.estilo.agresivo}%`}
                    ayuda="Cuánto canta envido y truco en vez de jugar callado."
                  />
                  <p className="text-xs text-subtle">
                    Medido sobre {numero(campana.estilo.manos)} manos de campaña.
                  </p>
                </div>
              )}
            </Bloque>

            <Bloque
              titulo="Contra quiénes jugó más"
              bajada="Sus rivales más frecuentes y cómo le fue con cada uno."
            >
              <ul className="flex flex-col gap-2.5">
                {rivales.map(r => (
                  <li key={r.nombre} className="flex items-center gap-3">
                    <Avatar url={r.avatar_url} name={r.nombre} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm text-cream">
                        {r.nombre}
                        {r.es_bot && <Etiqueta pequena>Bot</Etiqueta>}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs tabular-nums text-muted">
                      <b className="text-cream">{numero(r.partidas)}</b> partidas ·{' '}
                      <b className="text-positive">{numero(r.ganadas)}</b>
                      <span className="mx-0.5">/</span>
                      <b className="text-negative">{numero(r.perdidas)}</b>
                    </p>
                  </li>
                ))}
              </ul>
            </Bloque>
          </div>

          {/* ------------------------------------------------------ */}
          {/* Actividad                                               */}
          {/* ------------------------------------------------------ */}
          <section className="mb-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <h2 className="font-display text-lg font-bold text-cream">Cuándo jugó</h2>
            <p className="mb-4 mt-0.5 text-xs text-muted">Sus partidas de los últimos 60 días.</p>
            <Columnas
              puntos={datos.actividad.map(d => ({
                etiqueta: diaCorto(d.dia),
                detalle: diaLargo(d.dia),
                valores: { partidas: d.partidas },
              }))}
              unidad="partidas"
              series={[{ clave: 'partidas', nombre: 'Partidas', color: VIZ.partidas }]}
            />
          </section>

          {/* ------------------------------------------------------ */}
          {/* Historial detallado                                     */}
          {/* ------------------------------------------------------ */}
          <div className="mb-4">
            <Historial partidas={datos.historial} ahora={ahora} />
          </div>
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Lo que junta fuera de la mesa                               */}
      {/* ---------------------------------------------------------- */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Dato
          etiqueta="Monedas movidas"
          valor={`+${numero(resumen.monedas_ganadas)}`}
          pie={`Perdió ${numero(resumen.monedas_perdidas)} jugando contra personas`}
        />
        <Dato
          etiqueta="Cosas compradas"
          valor={numero(colecciones.salones + colecciones.marcos + colecciones.accesorios)}
          pie={`${colecciones.salones} salones · ${colecciones.marcos} marcos · ${colecciones.accesorios} accesorios`}
        />
        <Medallas slugs={perfil.medallas} />
        <Dato
          etiqueta="Amigos"
          valor={numero(social.amigos)}
          pie={`${numero(social.mensajes)} mensajes en el chat · ${numero(social.resenas)} reseñas`}
        />
      </section>
    </main>
  )
}

// ------------------------------------------------------------
// Piezas chicas
// ------------------------------------------------------------

function Etiqueta({
  children,
  destacada,
  pequena,
}: {
  children: React.ReactNode
  destacada?: boolean
  pequena?: boolean
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border font-medium',
        pequena ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs',
        destacada ? 'border-gold-700 bg-gold-soft text-gold' : 'border-line bg-surface2 text-muted',
      )}
    >
      {children}
    </span>
  )
}

function Dato({
  etiqueta,
  valor,
  pie,
  color,
  tono,
}: {
  etiqueta: string
  valor: string
  pie: string
  color?: string
  tono?: 'bien' | 'mal'
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
      <p
        className={cn(
          'mt-1 font-display text-2xl font-extrabold',
          tono === 'bien' ? 'text-positive' : tono === 'mal' ? 'text-negative' : 'text-cream',
        )}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-subtle">{pie}</p>
    </div>
  )
}

/** Las medallas con su nombre de verdad (el catálogo vive en src/lib/medallas.ts). */
function Medallas({ slugs }: { slugs: string[] }) {
  const medallas = slugs.map(s => getMedal(s)).filter(m => m !== null)
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Medallas ganadas</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-cream">{numero(slugs.length)}</p>
      {medallas.length === 0 ? (
        <p className="mt-1 text-xs text-subtle">Todavía ninguna</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {medallas.map(m => (
            <li
              key={m!.slug}
              title={m!.description}
              className="rounded-full border border-line bg-surface2 px-1.5 py-0.5 text-[11px] text-muted"
            >
              <span aria-hidden="true">{m!.emoji}</span> {m!.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Puesto({
  nombre,
  puesto,
  total,
  vacio,
}: {
  nombre: string
  puesto: number | null
  total: number
  vacio: string
}) {
  return (
    <div className="rounded-xl border border-line bg-surface2 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{nombre}</p>
      {puesto === null ? (
        <p className="mt-1 text-xs text-subtle">{vacio}</p>
      ) : (
        <p className="mt-1 font-display text-2xl font-extrabold text-cream">
          #{numero(puesto)}
          <span className="ml-1.5 text-xs font-medium text-subtle">de {numero(total)}</span>
        </p>
      )}
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
