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

// Posiciones de los medallones para la imagen APAISADA (compu), en % del ancho/
// alto de la imagen, en orden de rival (1 = Tobías arriba/norte ... 10 = Don
// Salvador abajo/sur). Estimadas a ojo; se afinan con el "modo ajuste".
const NODOS: Pos[] = [
  { x: 43.3, y: 8.4 },
  { x: 45.6, y: 16.5 },
  { x: 43.5, y: 25.0 },
  { x: 46.3, y: 32.8 },
  { x: 45.6, y: 41.2 },
  { x: 43.2, y: 49.4 },
  { x: 45.8, y: 57.4 },
  { x: 42.5, y: 65.5 },
  { x: 39.7, y: 73.2 },
  { x: 42.1, y: 81.2 },
]

// Posiciones para la imagen VERTICAL (celular).
const NODOS_MOVIL: Pos[] = [
  { x: 45.0, y: 16.8 },
  { x: 50.5, y: 24.0 },
  { x: 48.1, y: 31.7 },
  { x: 43.5, y: 39.4 },
  { x: 40.4, y: 46.4 },
  { x: 39.8, y: 53.6 },
  { x: 40.4, y: 60.8 },
  { x: 37.4, y: 67.6 },
  { x: 36.9, y: 74.8 },
  { x: 40.9, y: 82.5 },
]

// Proporción (ancho/alto) real de cada imagen del mapa. Fija, así el escenario
// se arma igual siempre (no depende de cuándo "carga" la imagen). Si cambiás las
// imágenes por otras de distinta medida, actualizá estos números.
const DESKTOP_RATIO = 1672 / 941
const MOBILE_RATIO = 941 / 1672

export default function HistoriaClient({ initialRivals, coins }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Rival | null>(null)
  const [isPortrait, setIsPortrait] = useState(false)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  // Efecto de entrada: las nubes se abren y se quitan al terminar la animación.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3600)
    return () => clearTimeout(t)
  }, [])
  // Posiciones editables (para el modo ajuste). Empiezan en las constantes.
  const [posL, setPosL] = useState<Pos[]>(NODOS)
  const [posP, setPosP] = useState<Pos[]>(NODOS_MOVIL)
  const stageRef = useRef<HTMLDivElement>(null)

  const rivals = [...initialRivals].sort((a, b) => a.order_index - b.order_index)
  const vencidos = rivals.filter(r => r.beaten).length
  const currentId = rivals.find(r => r.unlocked && !r.beaten)?.id ?? null

  const nodos = isPortrait ? posP : posL
  const setNodos = isPortrait ? setPosP : setPosL
  const fondoSrc = isPortrait ? '/historia/fondo-movil.png' : '/historia/fondo.png'
  const ratio = isPortrait ? MOBILE_RATIO : DESKTOP_RATIO

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const update = () => setIsPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)
    setEditing(new URLSearchParams(window.location.search).get('ajustar') === '1')
    return () => mq.removeEventListener('change', update)
  }, [])

  // Animaciones de desbloqueo (comparadas contra lo que el jugador ya vio).
  const [reveal, setReveal] = useState<{ u: Set<string>; b: Set<string> }>({ u: new Set(), b: new Set() })
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const snapshot = () => JSON.stringify({
      unlocked: rivals.filter(r => r.unlocked).map(r => r.id),
      beaten: rivals.filter(r => r.beaten).map(r => r.id),
    })
    let raw: string | null = null
    try { raw = localStorage.getItem(SEEN_KEY) } catch {}
    if (raw == null) {
      try { localStorage.setItem(SEEN_KEY, snapshot()) } catch {}
      return
    }
    let seen: { unlocked?: string[]; beaten?: string[] } = {}
    try { seen = JSON.parse(raw) } catch {}
    const su = new Set(seen.unlocked ?? [])
    const sb = new Set(seen.beaten ?? [])
    const nu = new Set<string>()
    const nb = new Set<string>()
    for (const r of rivals) {
      if (r.unlocked && !su.has(r.id)) nu.add(r.id)
      if (r.beaten && !sb.has(r.id)) nb.add(r.id)
    }
    setReveal({ u: nu, b: nb })
    try { localStorage.setItem(SEEN_KEY, snapshot()) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <main className="fixed inset-0 overflow-hidden bg-base">
      {/* Escenario: el mapa entra completo en el ALTO de la pantalla (no se corta
          verticalmente por la barra del navegador ni la de Windows). Si sobra a
          los costados, queda el fondo oscuro de base (combina con el marco). */}
      <div
        ref={stageRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ height: '100dvh', width: `calc(100dvh * ${ratio})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fondoSrc}
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
            onSelect={() => setSelected(r)}
            onDragTo={(cx, cy) => dragTo(i, cx, cy)}
          />
        ))}
      </div>

      {/* HUD: barra superior flotante sobre el mapa. */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none">
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
        <div className="absolute top-20 inset-x-0 z-30 flex justify-center px-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Modo ajuste: cartel compacto abajo-izquierda. pointer-events-none en el
          contenedor (así se puede arrastrar un medallón que quede "debajo"); solo
          el botón Copiar queda activo. */}
      {editing && (
        <div className="absolute bottom-3 left-3 z-40 flex items-center gap-2 rounded-xl border border-gold/50 bg-black/70 backdrop-blur px-3 py-2 shadow-card pointer-events-none">
          <span className="text-[11px] font-bold text-gold">{isPortrait ? 'CELU' : 'COMPU'}</span>
          <Button size="sm" className="pointer-events-auto" onClick={copyPositions}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </Button>
        </div>
      )}

      {/* Efecto de entrada: las nubes (textura de ruido fractal) se abren y
          revelan el mapa. */}
      {intro && (
        <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
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
  r, pos, isCurrent, newlyUnlocked, newlyBeaten, editing, onSelect, onDragTo,
}: {
  r: Rival; pos: Pos; isCurrent: boolean; newlyUnlocked: boolean; newlyBeaten: boolean
  editing: boolean; onSelect: () => void; onDragTo: (clientX: number, clientY: number) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const dragging = useRef(false)
  const showFace = (r.unlocked || editing) && !imgFailed

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: 'clamp(28px, 4.6dvh, 49px)',
        height: 'clamp(28px, 4.6dvh, 49px)',
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
