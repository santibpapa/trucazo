import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { cn } from '@/components/ui/cn'
import { ETIQUETA_TIPO, fechaYHora, haceCuanto, numero, type TipoCuenta } from '../lib'

export type Resena = {
  id: string
  fecha: string
  general: number | null
  estetica: number | null
  entendio: boolean | null
  problema: boolean | null
  comentario: string | null
  /** Enlace privado de cada captura (vence en una hora), o null si no se pudo firmar. */
  capturas: (string | null)[]
  persona: {
    id: string
    nombre: string
    avatar_url: string | null
    email: string | null
    tipo: TipoCuenta | null
    creado_at: string
    ultima_sesion: string | null
    partidas: number
    monedas: number
    resenas: number
  } | null
}

function promedio(valores: (number | null)[]): string {
  const v = valores.filter((n): n is number => n !== null)
  if (!v.length) return '—'
  return (v.reduce((a, b) => a + b, 0) / v.length).toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

function porcentaje(valores: (boolean | null)[]): string {
  const v = valores.filter((b): b is boolean => b !== null)
  if (!v.length) return '—'
  return `${Math.round((v.filter(Boolean).length / v.length) * 100)} %`
}

export default function ResenasScreen({ resenas, total, ahora }: { resenas: Resena[]; total: number; ahora: string }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-20 sm:px-6">
      <header className="mb-6">
        <Link href="/admin" className="mb-1 inline-block text-sm font-medium text-muted transition-colors hover:text-gold">
          ← Volver a estadísticas
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-cream sm:text-3xl">Reseñas</h1>
        <p className="text-sm text-muted">
          {total > resenas.length
            ? `Las ${numero(resenas.length)} más nuevas de ${numero(total)}.`
            : `${numero(total)} en total, de la más nueva a la más vieja.`}{' '}
          Horarios de Argentina.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato etiqueta="Puntaje general" valor={promedio(resenas.map(r => r.general))} pie="promedio de 5" />
        <Dato etiqueta="Estética" valor={promedio(resenas.map(r => r.estetica))} pie="promedio de 5" />
        <Dato etiqueta="Entendió el juego" valor={porcentaje(resenas.map(r => r.entendio))} pie="dijo que sí" />
        <Dato etiqueta="Tuvo problemas" valor={porcentaje(resenas.map(r => r.problema))} pie="dijo que sí" />
      </section>

      {resenas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
          Todavía nadie dejó una reseña.
        </p>
      ) : (
        <ul className="space-y-3">
          {resenas.map(r => <Tarjeta key={r.id} r={r} ahora={ahora} />)}
        </ul>
      )}
    </main>
  )
}

function Tarjeta({ r, ahora }: { r: Resena; ahora: string }) {
  const p = r.persona
  return (
    <li className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-semibold text-cream">
          {fechaYHora(r.fecha)} <span className="font-normal text-subtle">({haceCuanto(r.fecha, ahora)})</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Respuesta etiqueta="Entendió" valor={r.entendio} />
          <Respuesta etiqueta="Tuvo problemas" valor={r.problema} alerta />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Estrellas etiqueta="General" valor={r.general} />
        <Estrellas etiqueta="Estética" valor={r.estetica} />
      </div>

      {r.comentario ? (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-base/60 p-3 text-sm text-cream">{r.comentario}</p>
      ) : (
        <p className="mt-3 text-sm italic text-subtle">Sin comentario.</p>
      )}

      {r.capturas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.capturas.map((url, i) => url ? (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold-soft/20"
            >
              Ver captura {i + 1}
            </a>
          ) : (
            <span key={i} className="rounded-lg border border-line px-3 py-1.5 text-xs text-subtle">
              Captura {i + 1}: no disponible
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        {p ? (
          <div className="flex items-center gap-3">
            <Avatar url={p.avatar_url} name={p.nombre} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/persona/${p.id}`} className="font-bold text-cream hover:text-gold">
                  {p.nombre}
                </Link>
                {p.tipo && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{ETIQUETA_TIPO[p.tipo]}</span>
                )}
                {p.resenas > 1 && (
                  <span className="rounded-full border border-gold/60 px-2 py-0.5 text-xs text-gold">
                    {p.resenas} reseñas
                  </span>
                )}
              </div>
              <p className="break-words text-sm text-muted">
                {p.email ?? (p.tipo === 'invitado' ? 'sin email (entró como invitado)' : 'sin email')}
              </p>
              <p className="text-xs text-subtle">
                Se anotó {haceCuanto(p.creado_at, ahora)} · {numero(p.partidas)} {p.partidas === 1 ? 'partida' : 'partidas'} · {numero(p.monedas)} monedas
                {p.ultima_sesion && <> · última sesión {haceCuanto(p.ultima_sesion, ahora)}</>}
              </p>
            </div>
            <Link
              href={`/admin/persona/${p.id}`}
              className="shrink-0 rounded-xl border border-gold/60 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold-soft/20"
            >
              Ver ficha
            </Link>
          </div>
        ) : (
          <p className="text-sm text-subtle">La cuenta que dejó esta reseña ya no existe.</p>
        )}
      </div>
    </li>
  )
}

function Dato({ etiqueta, valor, pie }: { etiqueta: string; valor: string; pie: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="font-display text-2xl font-extrabold text-gold">{valor}</p>
      <p className="text-xs text-subtle">{pie}</p>
    </div>
  )
}

function Estrellas({ etiqueta, valor }: { etiqueta: string; valor: number | null }) {
  return (
    <span className="text-muted">
      {etiqueta}{' '}
      {valor === null ? '—' : (
        <span aria-label={`${valor} de 5`}>
          <span className="text-gold">{'★'.repeat(valor)}</span>
          <span className="text-line">{'★'.repeat(5 - valor)}</span>
          <b className="ml-1 text-cream">{valor}/5</b>
        </span>
      )}
    </span>
  )
}

function Respuesta({ etiqueta, valor, alerta }: { etiqueta: string; valor: boolean | null; alerta?: boolean }) {
  if (valor === null) return null
  const marcada = alerta ? valor : !valor
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs font-medium',
        marcada ? 'border-negative/60 text-negative' : 'border-line text-muted',
      )}
    >
      {etiqueta}: {valor ? 'sí' : 'no'}
    </span>
  )
}
