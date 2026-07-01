'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Panel, Coins, Alert, Modal, CoinIcon, cn } from '@/components/ui'

interface Rival {
  id: string
  order_index: number
  slug: string
  display_name: string
  tagline: string
  difficulty: number
  target_score: number
  reward_coins: number
  beaten: boolean
  unlocked: boolean
}

interface Props {
  initialRivals: Rival[]
  coins: number
}
type Pos = { x: number; y: number }

const SEEN_KEY = 'trucazo:campaign:seen'

// Medida real del mapa (una sola tira vertical para compu y celular). El
// escenario usa esta proporción fija, así tiene alto conocido desde el arranque
// (no espera a que cargue la imagen) y los medallones caen en su lugar al
// instante. Si cambiás la imagen por otra de distinta medida, actualizá esto.
const MAP_W = 711
const MAP_H = 2212
// Cuántas "pantallas" de alto mide el mapa en compu (a más, más viaje al bajar).
const SCROLL_SCREENS = 3
// Duración del deslizamiento de la cámara al desbloquear un rival (ms). A más,
// más lento. Es la perilla para regular la velocidad del auto-scroll.
const GLIDE_MS = 2600
// Ancho del escenario: en compu es una tira centrada (según el alto de pantalla);
// en celular ocupa todo el ancho. El min() elige solo el que corresponda.
const STAGE_WIDTH = `min(100vw, calc(100dvh * ${((MAP_W / MAP_H) * SCROLL_SCREENS).toFixed(4)}))`

// Posiciones de los 10 medallones sobre el camino (en % del mapa), en orden de
// rival (1 = Tobías, arriba/norte ... 10 = Don Salvador, abajo/sur). Estimadas a
// ojo sobre el zigzag; se afinan con el "modo ajuste" (?ajustar=1).
const NODOS: Pos[] = [
  { x: 38.7, y: 7.5 },
  { x: 49.8, y: 14.9 },
  { x: 47.2, y: 23.8 },
  { x: 38.4, y: 33.5 },
  { x: 55, y: 41.9 },
  { x: 49.3, y: 52.1 },
  { x: 64.5, y: 62.3 },
  { x: 40.3, y: 69.7 },
  { x: 59.3, y: 81 },
  { x: 48.5, y: 92.2 },
]

export default function HistoriaClient({ initialRivals, coins }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Rival | null>(null)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  // Efecto de entrada: las nubes se abren y se quitan al terminar la animación.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3600)
    return () => clearTimeout(t)
  }, [])
  // Posiciones editables (para el modo ajuste). Empiezan en la constante.
  const [nodos, setNodos] = useState<Pos[]>(NODOS)
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  // Deslizamiento pendiente (índice de rival), que arranca recién cuando las
  // nubes terminan. null = no hay que deslizar.
  const glideTo = useRef<number | null>(null)

  const rivals = [...initialRivals].sort((a, b) => a.order_index - b.order_index)
  const vencidos = rivals.filter(r => r.beaten).length
  const currentIndex = rivals.findIndex(r => r.unlocked && !r.beaten)
  const currentId = currentIndex >= 0 ? rivals[currentIndex].id : null
  // "Niebla de guerra": el tramo del mapa todavía no descubierto (los rivales
  // bloqueados, después del que te toca) queda oscurecido. Arranca a mitad de
  // camino entre el rival actual y el siguiente. null = ya ganaste todo → sin niebla.
  const fogStart =
    currentIndex >= 0 && currentIndex < rivals.length - 1
      ? (nodos[currentIndex].y + nodos[currentIndex + 1].y) / 2
      : null

  useEffect(() => {
    setEditing(new URLSearchParams(window.location.search).get('ajustar') === '1')
  }, [])

  // Centra en pantalla el medallón i (dentro del contenedor que scrollea). Con
  // duration=0 salta al instante; con duration>0 anima a mano (velocidad propia,
  // que el navegador no deja regular con 'smooth').
  function scrollToIndex(i: number, duration = 0) {
    const c = scrollRef.current
    const el = nodeRefs.current[i]
    if (!c || !el) return
    const cRect = c.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const delta = eRect.top + eRect.height / 2 - (cRect.top + cRect.height / 2)
    const to = c.scrollTop + delta
    if (duration <= 0) { c.scrollTop = to; return }
    const from = c.scrollTop
    const t0 = performance.now()
    // easeInOutCubic: arranca y frena suave.
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      c.scrollTop = from + (to - from) * ease(p)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // Animaciones de desbloqueo (comparadas contra lo que el jugador ya vio) +
  // auto-scroll: al abrirse las nubes, la "cámara" baja sola hasta el rival que
  // te toca (deslizamiento visible en compu y celu, ya no tapado por las nubes).
  const [reveal, setReveal] = useState<{ u: Set<string>; b: Set<string> }>({ u: new Set(), b: new Set() })
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const snapshot = () => JSON.stringify({
      unlocked: rivals.filter(r => r.unlocked).map(r => r.id),
      beaten: rivals.filter(r => r.beaten).map(r => r.id),
    })
    const nu = new Set<string>()
    const nb = new Set<string>()
    let raw: string | null = null
    try { raw = localStorage.getItem(SEEN_KEY) } catch {}
    if (raw != null) {
      let seen: { unlocked?: string[]; beaten?: string[] } = {}
      try { seen = JSON.parse(raw) } catch {}
      const su = new Set(seen.unlocked ?? [])
      const sb = new Set(seen.beaten ?? [])
      for (const r of rivals) {
        if (r.unlocked && !su.has(r.id)) nu.add(r.id)
        if (r.beaten && !sb.has(r.id)) nb.add(r.id)
      }
      setReveal({ u: nu, b: nb })
    }
    try { localStorage.setItem(SEEN_KEY, snapshot()) } catch {}

    // Auto-scroll SOLO cuando se desbloqueó un rival (venís de ganar): la cámara
    // arranca en el rival recién vencido y baja hasta el nuevo. Si no hay nada
    // nuevo, solo se posiciona en tu rival, sin deslizar.
    const target = currentIndex >= 0 ? currentIndex : rivals.length - 1
    const hayDesbloqueo = nu.size > 0
    const start = hayDesbloqueo ? Math.max(0, target - 1) : target
    // Posiciono al instante (todavía tapado por las nubes).
    requestAnimationFrame(() => scrollToIndex(start))
    // Si hay que deslizar, lo dejo pendiente: arranca recién cuando terminan las nubes.
    if (start !== target) glideTo.current = target
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El deslizamiento pendiente arranca solo cuando las nubes ya terminaron
  // (intro pasa a false), así nunca queda tapado por ellas.
  useEffect(() => {
    if (intro || glideTo.current == null) return
    const target = glideTo.current
    glideTo.current = null
    const t = setTimeout(() => scrollToIndex(target, GLIDE_MS), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro])

  async function play(rivalId: string) {
    setLoadingId(rivalId)
    setError('')
    const { data, error } = await supabase.rpc('start_campaign_duel', { p_rival_id: rivalId })
    if (error || !data) {
      setError('No se pudo empezar el duelo. Probá de nuevo.')
      setLoadingId(null)
      return
    }
    router.push(`/game/${(data as { id: string }).id}`)
    router.refresh()
  }

  // Modo ajuste: arrastrar un medallón actualiza su posición en %.
  function dragTo(i: number, clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    const r1 = (n: number) => Math.round(n * 10) / 10
    setNodos(prev => prev.map((p, idx) => (idx === i ? { x: r1(x), y: r1(y) } : p)))
  }

  async function copyPositions() {
    const text = nodos.map(p => `  { x: ${p.x}, y: ${p.y} },`).join('\n')
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main ref={scrollRef} className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-base">
      {/* Escenario: el mapa es una TIRA ALTA (varias pantallas). Se scrollea hacia
          abajo. En compu queda una columna centrada (a los costados, el fondo
          oscuro de base); en celular ocupa todo el ancho. La proporción fija le da
          alto conocido desde el vamos, así los medallones caen exactos al instante. */}
      <div
        ref={stageRef}
        className="relative mx-auto"
        style={{ width: STAGE_WIDTH, aspectRatio: `${MAP_W} / ${MAP_H}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/historia/fondo.png"
          alt="Mapa del modo historia"
          className="block w-full h-full object-cover select-none"
          draggable={false}
        />
        {rivals.map((r, i) => (
          <MapNode
            key={r.id}
            r={r}
            pos={nodos[i] ?? { x: 50, y: 50 }}
            isCurrent={r.id === currentId}
            newlyUnlocked={reveal.u.has(r.id)}
            newlyBeaten={reveal.b.has(r.id)}
            editing={editing}
            nodeRef={(el) => { nodeRefs.current[i] = el }}
            onSelect={() => setSelected(r)}
            onDragTo={(cx, cy) => dragTo(i, cx, cy)}
          />
        ))}

        {/* Niebla de guerra: oscurece el tramo no descubierto (de fogStart% hacia
            abajo), difuminada arriba para que el borde de "lo revelado" sea suave.
            En modo ajuste no va, así se ven todos los medallones para acomodarlos. */}
        {!editing && fogStart != null && (
          <div
            className="pointer-events-none absolute inset-0 z-[15]"
            style={{
              background: `linear-gradient(to bottom, transparent ${fogStart}%, rgba(12,7,8,0.55) ${Math.min(fogStart + 7, 100)}%, rgba(6,3,4,0.9) 100%)`,
            }}
          />
        )}
      </div>

      {/* HUD: barra superior fija sobre el mapa (no se va con el scroll). */}
      <div className="fixed top-0 inset-x-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <Link
            href="/lobby"
            aria-label="Volver al lobby"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface2/80 border border-line text-cream hover:text-gold hover:border-gold/60 transition-colors shadow-card"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-cream leading-none drop-shadow">Modo Historia</h1>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1.5 w-20 sm:w-28 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-gold transition-[width] duration-700 ease-out" style={{ width: `${(vencidos / rivals.length) * 100}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-gold tabular">{vencidos}/{rivals.length}</span>
            </div>
          </div>
        </div>
        <Panel className="flex items-center gap-2 px-3 py-1.5 !rounded-full pointer-events-auto shrink-0">
          <Coins amount={coins} size="sm" />
        </Panel>
      </div>

      {error && (
        <div className="fixed top-20 inset-x-0 z-30 flex justify-center px-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Modo ajuste: cartel compacto abajo-izquierda. pointer-events-none en el
          contenedor (así se puede arrastrar un medallón que quede "debajo"); solo
          el botón Copiar queda activo. */}
      {editing && (
        <div className="fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-xl border border-gold/50 bg-black/70 backdrop-blur px-3 py-2 shadow-card pointer-events-none">
          <span className="text-[11px] font-bold text-gold">AJUSTE</span>
          <Button size="sm" className="pointer-events-auto" onClick={copyPositions}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </Button>
        </div>
      )}

      {/* Efecto de entrada: las nubes (textura de ruido fractal) se abren y
          revelan el mapa. */}
      {intro && (
        <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[88%] animate-clouds-left"><CloudLayer side="left" /></div>
          <div className="absolute inset-y-0 right-0 w-[88%] animate-clouds-right"><CloudLayer side="right" /></div>
        </div>
      )}

      {/* Panel del rival elegido */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Face
              slug={selected.slug}
              name={selected.display_name}
              className={cn(
                'w-24 h-24 rounded-full overflow-hidden border-2',
                selected.beaten ? 'border-gold shadow-gold-ring' : 'border-line',
              )}
            />
            {selected.id === currentId && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-gold">Tu próximo desafío</span>
            )}
            <h2 className="font-display text-2xl font-extrabold text-cream leading-tight">{selected.display_name}</h2>
            <p className="text-sm text-muted">{selected.tagline}</p>
            <div className="flex items-center gap-3">
              <DifficultyBar value={selected.difficulty} />
              <span className="text-[11px] uppercase tracking-wide text-subtle">a {selected.target_score}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                <CoinIcon size={12} />{selected.reward_coins.toLocaleString('es-AR')}
              </span>
            </div>
            <Button variant="primary" size="md" fullWidth onClick={() => play(selected.id)} disabled={loadingId != null} className="mt-1">
              {loadingId === selected.id ? 'Empezando…' : selected.beaten ? 'Revancha' : 'Jugar'}
            </Button>
          </div>
        )}
      </Modal>
    </main>
  )
}

// Un medallón del mapa (posicionado en %). Bloqueado = candado (misterio).
// En modo ajuste se puede arrastrar y muestra su número + coordenadas.
function MapNode({
  r, pos, isCurrent, newlyUnlocked, newlyBeaten, editing, nodeRef, onSelect, onDragTo,
}: {
  r: Rival; pos: Pos; isCurrent: boolean; newlyUnlocked: boolean; newlyBeaten: boolean
  editing: boolean; nodeRef: (el: HTMLDivElement | null) => void
  onSelect: () => void; onDragTo: (clientX: number, clientY: number) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const dragging = useRef(false)
  const showFace = (r.unlocked || editing) && !imgFailed

  return (
    <div
      ref={nodeRef}
      className="absolute z-10"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: 'clamp(36px, 6dvh, 64px)',
        height: 'clamp(36px, 6dvh, 64px)',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* El contenedor de afuera tiene TAMAÑO FIJO y hace el centrado (translate),
          así el avatar cae exacto sobre su punto. La animación de "pop" va en el
          contenedor de adentro para no pisar ese centrado. */}
      <div className={cn('relative w-full h-full', !editing && newlyUnlocked && 'animate-unlock-pop')}>
        {!editing && newlyUnlocked && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 z-20 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-ink shadow-gold animate-scale-in whitespace-nowrap">
            ¡Nuevo!
          </span>
        )}
        <button
          onClick={editing || !r.unlocked ? undefined : onSelect}
          disabled={!editing && !r.unlocked}
          onPointerDown={editing ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true } : undefined}
          onPointerMove={editing ? (e) => { if (dragging.current) onDragTo(e.clientX, e.clientY) } : undefined}
          onPointerUp={editing ? () => { dragging.current = false } : undefined}
          aria-label={r.unlocked ? `Ver a ${r.display_name}` : 'Rival bloqueado'}
          className={cn(
            'relative w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center bg-surface2/85 font-display text-base font-bold text-cream shadow-card transition touch-none',
            editing ? 'cursor-move ring-2 ring-gold/70' : r.unlocked && 'cursor-pointer [@media(hover:hover)]:hover:scale-105',
            r.beaten ? 'border-gold shadow-gold-ring' : isCurrent ? 'border-gold' : 'border-ink/70',
            !editing && isCurrent && 'animate-pulse-glow',
          )}
        >
          {showFace ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/personajes/${r.slug}.png`}
              alt={r.display_name}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : r.unlocked || editing ? (
            r.display_name.charAt(0)
          ) : (
            <span className="text-subtle scale-75"><LockIcon /></span>
          )}
        </button>

        {editing && (
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 rounded bg-black/80 px-1 text-[9px] font-bold text-gold whitespace-nowrap">
            {r.order_index}· {pos.x},{pos.y}
          </span>
        )}

        {!editing && r.beaten && (
          <span
            className={cn(
              'absolute -bottom-1 -right-1 z-20 w-5 h-5 rounded-full bg-positive text-white flex items-center justify-center shadow-card',
              newlyBeaten && 'animate-unlock-pop',
            )}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}

// Retrato con respaldo a la inicial.
function Face({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className={cn('flex items-center justify-center bg-surface2 font-display text-3xl font-bold text-cream', className)}>
      {imgFailed ? (
        name.charAt(0)
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/personajes/${slug}.png`} alt={name} onError={() => setImgFailed(true)} className="w-full h-full object-cover" />
      )}
    </div>
  )
}

// Capa de nube con textura de ruido fractal (SVG feTurbulence). El ruido genera
// la forma algodonosa; el feColorMatrix la tiñe color pergamino y define qué tan
// espesa es (fila del alpha). La máscara difumina el borde interior (hacia el
// centro) para que las dos capas se junten sin costura.
function CloudLayer({ side }: { side: 'left' | 'right' }) {
  const seed = side === 'left' ? 7 : 21
  return (
    <svg className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={`cloudtex-${side}`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.015" numOctaves={5} seed={seed} stitchTiles="stitch" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.905
                    0 0 0 0 0.862
                    0 0 0 0 0.760
                    0 0 0 2.4 -0.15"
          />
        </filter>
        <linearGradient id={`feather-${side}`} x1="0" y1="0" x2="1" y2="0">
          {side === 'left' ? (
            <>
              <stop offset="0" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.62" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.38" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </>
          )}
        </linearGradient>
        <mask id={`mask-${side}`}>
          <rect width="100%" height="100%" fill={`url(#feather-${side})`} />
        </mask>
      </defs>
      <g mask={`url(#mask-${side})`}>
        <rect width="100%" height="100%" fill="#000" filter={`url(#cloudtex-${side})`} />
      </g>
    </svg>
  )
}

function DifficultyBar({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Dificultad ${value}/10`} aria-label={`Dificultad ${value} de 10`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={cn('h-2.5 w-1 rounded-full', i < value ? 'bg-gold' : 'bg-line')} />
      ))}
    </span>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
