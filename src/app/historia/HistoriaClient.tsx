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
  trait_liar: number
  trait_aggressive: number
  target_score: number
  reward_coins: number
  points_required: number
  ranking_points: number
  points_reward: number
  beaten: boolean
  unlocked: boolean
}

interface Province {
  id: string
  order_index: number
  slug: string
  name: string
  points_required: number
  unlocked: boolean
  rivals: Rival[]
}

interface RankingRow {
  position: number
  name: string
  slug: string | null
  points: number
  is_user: boolean
  beaten: boolean | null
  province: string | null
}

interface Style {
  known: boolean
  hands: number
  liar: number
  folder: number
  aggressive: number
}

interface Props {
  points: number
  fama: number
  style: Style | null
  provinces: Province[]
  coins: number
}

type Pos = { x: number; y: number }

const SEEN_KEY = 'trucazo:campania:seen'
const TUTORIAL_KEY = 'trucazo:campania:tutorial'

// Pasos del tutorial de bienvenida (se muestra una sola vez por dispositivo).
// Editar acá para cambiar el contenido.
const TUTORIAL_PASOS: { titulo: string; texto: string }[] = [
  { titulo: 'Recorré Argentina', texto: 'Cada provincia tiene sus propios rivales, con su estilo y su nivel de juego.' },
  { titulo: 'Sumá puntos', texto: 'Ganá duelos para sumar puntos y desbloquear rivales y provincias nuevas.' },
  { titulo: 'Llegá a la cima', texto: 'Subí en el Ranking de Argentina hasta destronar al número 1.' },
  { titulo: 'Cuidá tu fama', texto: 'A medida que progresás te hacés una fama en el ambiente. Los rivales más picantes te empiezan a leer: si mentís mucho el envido o te achicás seguido, se dan cuenta y te lo hacen pagar. Mirá tu fama tocando la barra abajo de las monedas.' },
]

// Medida real del mapa político (public/historia/mapa-argentina.webp). El
// escenario usa esta proporción fija así entra completo en pantalla (en compu
// manda el alto, en celular el ancho). Si cambiás la imagen, actualizá esto.
const MAP_W = 976
const MAP_H = 1611

// Posición de cada provincia sobre el mapa (en % del escenario). Estimadas a
// ojo; se afinan arrastrando con el "modo ajuste" (?ajustar=1).
const MARCADORES: Record<string, Pos> = {
  'santiago-del-estero': { x: 44.3, y: 20.1 },
  'santa-fe':            { x: 52.3, y: 29.6 },
  'cordoba':             { x: 41.6, y: 31.5 },
  'mendoza':             { x: 23.3, y: 38.9 },
  'buenos-aires':        { x: 55, y: 43.4 },
  'la-pampa':            { x: 38.2, y: 44.3 },
  'neuquen':             { x: 25.7, y: 48.5 },
  'rio-negro':           { x: 36.9, y: 54.3 },
  'chubut':              { x: 36, y: 65.2 },
  'tierra-del-fuego':    { x: 39, y: 91.9 },
}

// Lugares de los rivales DENTRO de cada provincia (en % del cuadro flotante).
// Hay 6 lugares por provincia (hoy se usan menos; los nuevos rivales de la
// etapa 3 van cayendo en los que siguen). También se afinan con ?ajustar=1
// abriendo la provincia.
const LUGARES: Record<string, Pos[]> = {
  'buenos-aires':        [{ x: 31, y: 37 }, { x: 69.5, y: 23 }, { x: 30.2, y: 71.8 }, { x: 82.9, y: 54 }, { x: 55.1, y: 68 }, { x: 50.8, y: 8.2 }],
  'santa-fe':            [{ x: 67.4, y: 9.5 }, { x: 50.6, y: 44.2 }, { x: 45, y: 68 }, { x: 38, y: 89.9 }, { x: 47.3, y: 24.1 }, { x: 60, y: 15 }],
  'cordoba':             [{ x: 40.4, y: 48.8 }, { x: 39.5, y: 77.8 }, { x: 62, y: 58 }, { x: 39.2, y: 18.4 }, { x: 66.4, y: 22.1 }, { x: 50, y: 80 }],
  'mendoza':             [{ x: 42, y: 30 }, { x: 72.8, y: 59.7 }, { x: 41.5, y: 79.1 }, { x: 60, y: 20 }, { x: 30, y: 50 }, { x: 55, y: 80 }],
  'santiago-del-estero': [{ x: 61.6, y: 43.8 }, { x: 40, y: 62 }, { x: 68, y: 13.1 }, { x: 64.2, y: 76.2 }, { x: 35, y: 30 }, { x: 65, y: 55 }],
  'la-pampa':            [{ x: 30, y: 31 }, { x: 67, y: 26 }, { x: 33, y: 67 }, { x: 70, y: 70 }],
  'neuquen':             [{ x: 31, y: 25 }, { x: 67, y: 28 }, { x: 37, y: 66 }, { x: 70, y: 72 }],
  'rio-negro':           [{ x: 26, y: 32 }, { x: 66, y: 26 }, { x: 39, y: 68 }, { x: 74, y: 66 }],
  'chubut':              [{ x: 28, y: 29 }, { x: 68, y: 27 }, { x: 33, y: 69 }, { x: 72, y: 70 }],
  'tierra-del-fuego':    [{ x: 12, y: 35 }, { x: 25, y: 55 }, { x: 47, y: 70 }, { x: 68, y: 84 }],
}

export default function HistoriaClient({ points, fama, style, provinces: initialProvinces, coins }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showFama, setShowFama] = useState(false)
  const [openProv, setOpenProv] = useState<string | null>(null)
  // Cierre suave: primero corre la animación de salida y recién ahí se desmonta.
  const [closing, setClosing] = useState(false)
  const [selected, setSelected] = useState<Rival | null>(null)
  const [showRanking, setShowRanking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  function closeProv() {
    if (closing) return
    setClosing(true)
    setTimeout(() => { setOpenProv(null); setClosing(false) }, 230)
  }

  // Efecto de entrada: las nubes se abren y se quitan al terminar la animación.
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3600)
    return () => clearTimeout(t)
  }, [])

  // Posiciones editables (modo ajuste). Empiezan en las constantes.
  const [marcadores, setMarcadores] = useState(MARCADORES)
  const [lugares, setLugares] = useState(LUGARES)
  const stageRef = useRef<HTMLDivElement>(null)
  const squareRef = useRef<HTMLDivElement>(null)

  const provinces = [...initialProvinces].sort((a, b) => a.order_index - b.order_index)
  const allRivals = provinces.flatMap(p => p.rivals.map(r => ({ r, prov: p.slug })))


  useEffect(() => {
    // Acepta ?ajustar=1 y también ?ajuste=1 (para no pelearse con el dedo).
    const q = new URLSearchParams(window.location.search)
    setEditing(q.get('ajustar') === '1' || q.get('ajuste') === '1')
  }, [])

  // Animaciones de novedad (comparadas contra lo que el jugador ya vio en este
  // dispositivo) + auto-abrir la provincia donde acaba de ganar.
  const [reveal, setReveal] = useState<{ ru: Set<string>; rb: Set<string>; pu: Set<string> }>({
    ru: new Set(), rb: new Set(), pu: new Set(),
  })
  const [showTutorial, setShowTutorial] = useState(false)
  const tutorialPending = useRef(false)
  const autoOpen = useRef<string | null>(null)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const snapshot = () => JSON.stringify({
      rivals_unlocked: allRivals.filter(x => x.r.unlocked).map(x => x.r.id),
      rivals_beaten: allRivals.filter(x => x.r.beaten).map(x => x.r.id),
      provinces_unlocked: provinces.filter(p => p.unlocked).map(p => p.slug),
    })
    let raw: string | null = null
    try { raw = localStorage.getItem(SEEN_KEY) } catch {}
    if (raw != null) {
      let seen: { rivals_unlocked?: string[]; rivals_beaten?: string[]; provinces_unlocked?: string[] } = {}
      try { seen = JSON.parse(raw) } catch {}
      const su = new Set(seen.rivals_unlocked ?? [])
      const sb = new Set(seen.rivals_beaten ?? [])
      const sp = new Set(seen.provinces_unlocked ?? [])
      const ru = new Set<string>(); const rb = new Set<string>(); const pu = new Set<string>()
      for (const { r } of allRivals) {
        if (r.unlocked && !su.has(r.id)) ru.add(r.id)
        if (r.beaten && !sb.has(r.id)) rb.add(r.id)
      }
      for (const p of provinces) if (p.unlocked && !sp.has(p.slug)) pu.add(p.slug)
      setReveal({ ru, rb, pu })
      // Si venís de ganar, la cámara te lleva de vuelta a esa provincia.
      const beatenNow = allRivals.find(x => rb.has(x.r.id))
      if (beatenNow) autoOpen.current = beatenNow.prov
    }
    try { localStorage.setItem(SEEN_KEY, snapshot()) } catch {}

    // Primera visita en este dispositivo: se agenda el tutorial de bienvenida.
    try { tutorialPending.current = localStorage.getItem(TUTORIAL_KEY) == null } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al terminar las nubes: primero el tutorial (si nunca lo vio); si no, la
  // provincia recién ganada se abre sola.
  useEffect(() => {
    if (intro) return
    if (tutorialPending.current) {
      tutorialPending.current = false
      const t = setTimeout(() => setShowTutorial(true), 250)
      return () => clearTimeout(t)
    }
    if (!autoOpen.current) return
    const slug = autoOpen.current
    autoOpen.current = null
    const t = setTimeout(() => setOpenProv(slug), 250)
    return () => clearTimeout(t)
  }, [intro])

  function closeTutorial() {
    setShowTutorial(false)
    try { localStorage.setItem(TUTORIAL_KEY, '1') } catch {}
  }

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

  // Modo ajuste: arrastrar actualiza la posición en % (marcador del mapa o
  // rival dentro de la provincia abierta, según corresponda).
  function dragMarker(slug: string, clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    setMarcadores(prev => ({ ...prev, [slug]: toPct(rect, clientX, clientY) }))
  }
  function dragLugar(prov: string, i: number, clientX: number, clientY: number) {
    const rect = squareRef.current?.getBoundingClientRect()
    if (!rect) return
    setLugares(prev => ({
      ...prev,
      [prov]: (prev[prov] ?? []).map((p, idx) => (idx === i ? toPct(rect, clientX, clientY) : p)),
    }))
  }

  async function copyPositions() {
    const m = Object.entries(marcadores)
      .map(([s, p]) => `  '${s}': { x: ${p.x}, y: ${p.y} },`).join('\n')
    const l = Object.entries(lugares)
      .map(([s, arr]) => `  '${s}': [${arr.map(p => `{ x: ${p.x}, y: ${p.y} }`).join(', ')}],`).join('\n')
    const text = `const MARCADORES: Record<string, Pos> = {\n${m}\n}\n\nconst LUGARES: Record<string, Pos[]> = {\n${l}\n}`
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const provAbierta = provinces.find(p => p.slug === openProv) ?? null

  return (
    // En celular el HUD flota arriba: el pt-14 corre el mapa hacia abajo para
    // que no tape el norte (Jujuy, Salta). En compu sobra lugar y no hace falta.
    <main className="fixed inset-0 overflow-hidden bg-base flex items-center justify-center pt-14 sm:pt-0">
      {/* Escenario: el mapa político entra completo a lo alto en compu; en celular
          se agranda un poco más allá del ancho (118vw) para no dejar tanto aire
          arriba/abajo — lo que sobra de océano a los costados se recorta parejo.
          Los marcadores van en % del escenario, así que no se desalinean. */}
      <div
        ref={stageRef}
        className="relative shrink-0"
        style={{
          width: `min(118vw, calc(100dvh * ${(MAP_W / MAP_H).toFixed(4)}))`,
          aspectRatio: `${MAP_W} / ${MAP_H}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/historia/mapa-argentina.webp"
          alt="Mapa de Argentina del modo historia"
          className="block w-full h-full object-contain select-none"
          draggable={false}
        />
        {/* Niebla: el país entero queda en penumbra (bloqueado) salvo un halo de
            luz alrededor de cada provincia jugable desbloqueada. En modo ajuste
            no va, para ver todo. */}
        {!editing && (
          <Fog spots={provinces.filter(p => p.unlocked).map(p => marcadores[p.slug] ?? { x: 50, y: 50 })} />
        )}
        {provinces.map(p => (
          <ProvinceMarker
            key={p.slug}
            p={p}
            pos={marcadores[p.slug] ?? { x: 50, y: 50 }}
            newlyUnlocked={reveal.pu.has(p.slug)}
            editing={editing}
            onOpen={() => (p.unlocked || editing) && setOpenProv(p.slug)}
            onDragTo={(cx, cy) => dragMarker(p.slug, cx, cy)}
          />
        ))}
      </div>

      {/* HUD: barra superior fija, con chips sólidos como los del lobby. Alineado
          arriba (items-start) para que Ranking y monedas queden en la línea del
          botón de volver; la barra de fama cuelga debajo de las monedas. */}
      <div className="fixed top-0 inset-x-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        {/* Chip principal: volver + título + puntos, todo junto. */}
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface2/95 pl-1.5 pr-4 py-1.5 shadow-card pointer-events-auto min-w-0">
          <Link
            href="/lobby"
            aria-label="Volver al lobby"
            className="w-9 h-9 rounded-full bg-base border border-gold/40 flex items-center justify-center text-cream hover:text-gold transition-colors shrink-0"
          >
            <BackIcon />
          </Link>
          <div className="flex flex-col leading-tight min-w-0">
            <h1 className="font-display text-sm sm:text-base font-extrabold text-cream truncate">Modo Historia</h1>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-gold tabular">
              <StarIcon />{points.toLocaleString('es-AR')} pts
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2 pointer-events-auto shrink-0">
          <button
            onClick={() => setShowRanking(true)}
            className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-surface2/95 px-3 py-2.5 text-xs font-bold text-gold hover:bg-gold/10 transition-colors shadow-card"
          >
            <PodiumIcon />
            Ranking
          </button>
          {/* Monedas arriba; abajo, la barra de fama (discreta, se toca para ver
              tu estilo). */}
          <div className="flex flex-col items-stretch gap-1.5">
            <Panel className="flex items-center justify-center gap-2 px-3 py-2 !rounded-full">
              <Coins amount={coins} size="sm" />
            </Panel>
            <button
              onClick={() => setShowFama(true)}
              aria-label={`Fama ${fama} de 100 — ver tu estilo`}
              className="group flex items-center gap-1.5 rounded-full border border-line bg-surface2/95 px-2.5 py-1.5 shadow-card hover:border-gold/60 transition-colors"
            >
              <FameIcon />
              <div className="h-1.5 w-12 sm:w-16 rounded-full bg-black/45 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold-700 to-gold transition-[width] duration-700 ease-out" style={{ width: `${fama}%` }} />
              </div>
              <span className="text-[10px] font-bold text-gold tabular">{fama}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed top-20 inset-x-0 z-30 flex justify-center px-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Modo ajuste: cartel compacto abajo-izquierda. */}
      {editing && (
        <div className="fixed bottom-3 left-3 z-[60] flex items-center gap-2 rounded-xl border border-gold/50 bg-black/70 backdrop-blur px-3 py-2 shadow-card">
          <span className="text-[11px] font-bold text-gold">AJUSTE</span>
          <Button size="sm" onClick={copyPositions}>{copied ? '¡Copiado!' : 'Copiar'}</Button>
        </div>
      )}

      {/* Provincia abierta: aparece flotando sobre el mapa oscurecido, y al
          cerrarse se despide con el mismo efecto (suave, en espejo). */}
      {provAbierta && (
        <div className={cn('fixed inset-0 z-30 flex flex-col items-center justify-center p-4', closing ? 'animate-fade-out' : 'animate-fade-in')}>
          <button
            aria-label="Cerrar provincia"
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px] cursor-default"
            onClick={closeProv}
          />
          <div className="relative flex flex-col items-center gap-2 max-w-full">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-cream drop-shadow text-center">
                {provAbierta.name}
              </h2>
              <button
                onClick={closeProv}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface2/90 border border-line text-cream hover:text-gold hover:border-gold/60 transition-colors shadow-card"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-xs text-cream/70 -mt-1">
              {provAbierta.rivals.filter(r => r.beaten).length}/{provAbierta.rivals.length} vencidos
            </p>

            {/* El cuadro flotante: entra con zoom suave y queda levitando. */}
            <div className={closing ? 'animate-float-out' : 'animate-float-in'}>
              <div
                ref={squareRef}
                className="relative animate-levitate"
                style={{ width: 'min(92vw, 68dvh)', height: 'min(92vw, 68dvh)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/historia/provincia-${provAbierta.slug}.webp`}
                  alt={`Provincia de ${provAbierta.name}`}
                  className="block w-full h-full object-contain select-none [filter:drop-shadow(0_34px_38px_rgba(0,0,0,0.65))]"
                  draggable={false}
                />
                {/* Penumbra leve sobre la provincia: se ve bien solo alrededor
                    de los rivales. En modo ajuste no va. */}
                {!editing && (
                  <ProvinceShade
                    slug={provAbierta.slug}
                    spots={provAbierta.rivals.map((_, i) => (lugares[provAbierta.slug] ?? [])[i] ?? { x: 50, y: 50 })}
                  />
                )}
                {provAbierta.rivals.map((r, i) => (
                  <RivalNode
                    key={r.id}
                    r={r}
                    pos={(lugares[provAbierta.slug] ?? [])[i] ?? { x: 50, y: 50 }}
                    newlyUnlocked={reveal.ru.has(r.id)}
                    newlyBeaten={reveal.rb.has(r.id)}
                    editing={editing}
                    onSelect={() => setSelected(r)}
                    onDragTo={(cx, cy) => dragLugar(provAbierta.slug, i, cx, cy)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Efecto de entrada: las nubes se abren y revelan el mapa. */}
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
            <h2 className="font-display text-2xl font-extrabold text-cream leading-tight">{selected.display_name}</h2>
            <p className="text-sm text-muted">{selected.tagline}</p>
            {/* Cómo juega: dificultad + rasgos de personalidad. */}
            <div className="w-full max-w-[230px] flex flex-col gap-1.5">
              <StatRow label="Dificultad" value={selected.difficulty} />
              <StatRow label="Mentiroso" value={selected.trait_liar} />
              <StatRow label="Agresivo" value={selected.trait_aggressive} />
            </div>
            <span className="text-[11px] uppercase tracking-wide text-subtle">Partida a {selected.target_score} puntos</span>
            {/* Los puntos que otorga se descubren al final de la partida; acá
                solo se ve el premio en monedas (si todavía no lo cobró). */}
            <div className="flex items-center gap-3">
              {!selected.beaten ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                  <CoinIcon size={12} />{selected.reward_coins.toLocaleString('es-AR')}
                </span>
              ) : (
                <span className="text-[11px] text-subtle">Ya lo venciste — la revancha suma menos</span>
              )}
            </div>
            <Button variant="primary" size="md" fullWidth onClick={() => play(selected.id)} disabled={loadingId != null} className="mt-1">
              {loadingId === selected.id ? 'Empezando…' : selected.beaten ? 'Revancha' : 'Jugar'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Panel de fama + estilo (al tocar la barra) */}
      <Modal open={showFama} onClose={() => setShowFama(false)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center shadow-gold-ring">
            <FameIcon size={22} />
          </span>
          <h2 className="font-display text-2xl font-extrabold text-cream leading-tight">Tu fama</h2>
          <div className="w-full flex items-center gap-2">
            <div className="h-2.5 flex-1 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold-700 to-gold" style={{ width: `${fama}%` }} />
            </div>
            <span className="text-sm font-bold text-gold tabular">{fama}/100</span>
          </div>
          <p className="text-xs text-muted -mt-1">
            Tu fama crece con tu progreso. Cuanta más tenés, más te leen los rivales picantes.
          </p>

          <div className="w-full border-t border-line/60 pt-3 mt-1">
            <p className="text-[11px] uppercase tracking-wide text-subtle mb-2">Cómo te ven en la mesa</p>
            {style && style.known ? (
              <div className="flex flex-col gap-2">
                <StyleRow label="Mentiroso" value={style.liar} hint="Cuánto faroleás el envido y el truco" />
                <StyleRow label="Se achica" value={style.folder} hint="Cuánto te bajás cuando te cantan" />
                <StyleRow label="Agresivo" value={style.aggressive} hint="Cuánto cantás vos" />
              </div>
            ) : (
              <p className="text-sm text-muted py-2">
                Jugá unos duelos más y el ambiente va a empezar a conocer tu estilo.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Tutorial de bienvenida (una sola vez por dispositivo) */}
      <Modal open={showTutorial} onClose={closeTutorial}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center shadow-gold-ring">
            <StarIcon size={20} />
          </span>
          <h2 className="font-display text-2xl font-extrabold text-cream leading-tight">Modo Historia</h2>
          <div className="flex flex-col gap-3 w-full text-left">
            {TUTORIAL_PASOS.map((paso, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-surface2 border border-gold/40 text-gold font-display text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-cream leading-tight">{paso.titulo}</p>
                  <p className="text-xs text-muted mt-0.5">{paso.texto}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" size="md" fullWidth onClick={closeTutorial}>
            ¡A jugar!
          </Button>
        </div>
      </Modal>

      {/* Ranking de Argentina */}
      {showRanking && (
        <RankingOverlay
          onClose={() => setShowRanking(false)}
          supabase={supabase}
        />
      )}
    </main>
  )
}

// Penumbra dentro de la provincia abierta: una copia oscurecida de la MISMA
// silueta (así el velo respeta la forma y no dibuja un cuadrado), con agujeros
// de luz difusos donde están los rivales. Todo en SVG para que ande igual en
// cualquier navegador.
function ProvinceShade({ slug, spots }: { slug: string; spots: Pos[] }) {
  const S = 1000
  return (
    <svg
      className="absolute inset-0 z-[5] w-full h-full pointer-events-none"
      viewBox={`0 0 ${S} ${S}`}
      aria-hidden="true"
    >
      <defs>
        <filter id="prov-dim">
          <feColorMatrix type="matrix" values="0.4 0 0 0 0  0 0.4 0 0 0  0 0 0.4 0 0  0 0 0 1 0" />
        </filter>
        <filter id="prov-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="50" />
        </filter>
        <mask id={`prov-holes-${slug}`}>
          <rect width={S} height={S} fill="#fff" />
          <g filter="url(#prov-blur)">
            {spots.map((s, i) => (
              <circle key={i} cx={(s.x / 100) * S} cy={(s.y / 100) * S} r={140} fill="#000" />
            ))}
          </g>
        </mask>
      </defs>
      <image
        href={`/historia/provincia-${slug}.webp`}
        width={S}
        height={S}
        preserveAspectRatio="xMidYMid meet"
        filter="url(#prov-dim)"
        mask={`url(#prov-holes-${slug})`}
        opacity="0.6"
      />
    </svg>
  )
}

// La niebla del mapa: un velo oscuro sobre todo el escenario con "faroles" de
// luz (agujeros difusos) en las provincias desbloqueadas.
function Fog({ spots }: { spots: Pos[] }) {
  return (
    <svg
      className="absolute inset-0 z-[5] w-full h-full pointer-events-none"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="fog-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="55" />
        </filter>
        <mask id="fog-mask">
          <rect width={MAP_W} height={MAP_H} fill="#fff" />
          <g filter="url(#fog-blur)">
            {spots.map((s, i) => (
              <circle key={i} cx={(s.x / 100) * MAP_W} cy={(s.y / 100) * MAP_H} r={165} fill="#000" />
            ))}
          </g>
        </mask>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="#0C0708" opacity="0.55" mask="url(#fog-mask)" />
    </svg>
  )
}

function toPct(rect: DOMRect, clientX: number, clientY: number): Pos {
  const r1 = (n: number) => Math.round(n * 10) / 10
  return {
    x: r1(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))),
    y: r1(Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))),
  }
}

// Marcador de una provincia sobre el mapa. Desbloqueada = medallón dorado con
// el avance; bloqueada = candado con los puntos que pide.
function ProvinceMarker({
  p, pos, newlyUnlocked, editing, onOpen, onDragTo,
}: {
  p: Province; pos: Pos; newlyUnlocked: boolean; editing: boolean
  onOpen: () => void; onDragTo: (clientX: number, clientY: number) => void
}) {
  const dragging = useRef(false)
  // En modo ajuste, un toque sin arrastre ABRE la provincia (para acomodar los
  // rivales de adentro) y un arrastre la mueve. moved distingue una cosa de la
  // otra, con un umbral de 6px para que el temblor del dedo no cuente.
  const moved = useRef(false)
  const start = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const beaten = p.rivals.filter(r => r.beaten).length
  const complete = p.rivals.length > 0 && beaten === p.rivals.length

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: 'clamp(32px, 5.5dvh, 50px)',
        height: 'clamp(32px, 5.5dvh, 50px)',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className={cn('relative w-full h-full', !editing && newlyUnlocked && 'animate-unlock-pop')}>
        {!editing && newlyUnlocked && (
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 z-20 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-ink shadow-gold animate-scale-in whitespace-nowrap">
            ¡Nueva!
          </span>
        )}
        <button
          onClick={editing ? undefined : onOpen}
          disabled={!editing && !p.unlocked}
          onPointerDown={editing ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; moved.current = false; start.current = { x: e.clientX, y: e.clientY } } : undefined}
          onPointerMove={editing ? (e) => {
            if (!dragging.current) return
            if (Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) > 6) moved.current = true
            if (moved.current) onDragTo(e.clientX, e.clientY)
          } : undefined}
          onPointerUp={editing ? () => { dragging.current = false; if (!moved.current) onOpen() } : undefined}
          aria-label={p.unlocked ? `Entrar a ${p.name}` : `${p.name} bloqueada`}
          className={cn(
            'relative w-full h-full rounded-full flex items-center justify-center border-2 bg-surface2/90 shadow-card transition touch-none',
            editing ? 'cursor-move ring-2 ring-gold/70' : p.unlocked && 'cursor-pointer [@media(hover:hover)]:hover:scale-105',
            complete ? 'border-gold shadow-gold-ring' : p.unlocked ? 'border-gold/70' : 'border-ink/70',
          )}
        >
          {p.unlocked || editing ? (
            complete ? (
              <span className="text-gold"><CheckIcon /></span>
            ) : (
              <span className="font-display text-[13px] font-extrabold text-cream tabular leading-none">
                {beaten}/{p.rivals.length}
              </span>
            )
          ) : (
            <span className="text-subtle scale-90"><LockIcon /></span>
          )}
        </button>

        {/* Nombre (y puntos que pide, si está bloqueada) debajo del marcador. En
            modo ajuste el nombre es la puerta de entrada (el medallón se arrastra). */}
        <div className={cn('absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 flex flex-col items-center gap-0.5', !editing && 'pointer-events-none')}>
          {/* En modo ajuste, tocar el nombre abre la provincia (el medallón se
              arrastra); en modo normal es solo una etiqueta. */}
          {editing ? (
            <button
              onClick={onOpen}
              className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-gold whitespace-nowrap shadow-card"
            >
              {p.name}
            </button>
          ) : (
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-cream whitespace-nowrap shadow-card">
              {p.name}
            </span>
          )}
          {!p.unlocked && !editing && (
            <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-gold whitespace-nowrap inline-flex items-center gap-0.5">
              <StarIcon size={8} />{p.points_required.toLocaleString('es-AR')} pts
            </span>
          )}
          {editing && (
            <span className="rounded bg-black/80 px-1 text-[9px] font-bold text-gold whitespace-nowrap">
              {pos.x},{pos.y}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Un rival dentro de la provincia abierta. Bloqueado = candado + puntos que pide.
function RivalNode({
  r, pos, newlyUnlocked, newlyBeaten, editing, onSelect, onDragTo,
}: {
  r: Rival; pos: Pos; newlyUnlocked: boolean; newlyBeaten: boolean
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
        width: 'clamp(40px, 7dvh, 64px)',
        height: 'clamp(40px, 7dvh, 64px)',
        transform: 'translate(-50%, -50%)',
      }}
    >
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
            'relative w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center bg-surface2/90 font-display text-base font-bold text-cream shadow-card transition touch-none',
            editing ? 'cursor-move ring-2 ring-gold/70' : r.unlocked && 'cursor-pointer [@media(hover:hover)]:hover:scale-105',
            r.beaten ? 'border-gold shadow-gold-ring' : 'border-ink/70',
          )}
        >
          {showFace ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/personajes/${r.slug}.webp`}
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

        {/* Debajo de la cara: el nombre. Un bloqueado no revela quién es, pero
            muestra cuántos puntos pide (la zanahoria). */}
        {!editing && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 flex flex-col items-center gap-0.5 pointer-events-none">
            {r.unlocked ? (
              <span className="rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-cream whitespace-nowrap shadow-card max-w-[16ch] truncate">
                {r.display_name.split(',')[0]}
              </span>
            ) : (
              <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-gold whitespace-nowrap inline-flex items-center gap-0.5">
                <StarIcon size={8} />{r.points_required.toLocaleString('es-AR')} pts
              </span>
            )}
          </div>
        )}

        {editing && (
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 rounded bg-black/80 px-1 text-[9px] font-bold text-gold whitespace-nowrap">
            {pos.x},{pos.y}
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

// El Ranking de Argentina: todos los rivales + vos, por puntos.
function RankingOverlay({ onClose, supabase }: {
  onClose: () => void
  supabase: ReturnType<typeof createClient>
}) {
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_campaign_ranking').then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) setFailed(true)
      else setRows(data as RankingRow[])
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base/95 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center justify-between gap-3 p-4 max-w-md w-full mx-auto">
        <h2 className="font-display text-xl font-extrabold text-cream">Ranking de Argentina</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar ranking"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-surface2/80 border border-line text-cream hover:text-gold hover:border-gold/60 transition-colors shadow-card"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="max-w-md mx-auto flex flex-col gap-1.5">
          {failed && <Alert>No se pudo cargar el ranking. Probá de nuevo.</Alert>}
          {!rows && !failed && <p className="text-sm text-muted text-center py-8">Cargando…</p>}
          {rows?.map(row => (
            <div
              key={`${row.position}-${row.name}`}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2',
                row.is_user
                  ? 'border-gold bg-gold/10 shadow-gold-ring'
                  : 'border-line bg-surface/80',
              )}
            >
              <span
                className={cn(
                  'w-7 text-center font-display font-extrabold tabular shrink-0',
                  row.position === 1 ? 'text-gold text-lg' : row.position <= 3 ? 'text-gold-600' : 'text-subtle',
                )}
              >
                {row.position}
              </span>
              <Face
                slug={row.slug ?? ''}
                name={row.name}
                className="w-9 h-9 rounded-full overflow-hidden border border-line shrink-0 text-sm"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold truncate', row.is_user ? 'text-gold' : 'text-cream')}>
                  {row.name} {row.is_user && <span className="text-[10px] uppercase tracking-wide">(vos)</span>}
                </p>
                {row.beaten != null && (
                  <p className="text-[10px] text-subtle">{row.beaten ? 'Ya lo venciste' : 'Sin vencer'}</p>
                )}
              </div>
              <span className="text-sm font-bold text-cream tabular shrink-0">
                {row.points.toLocaleString('es-AR')} <span className="text-[10px] text-subtle font-semibold">pts</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Retrato con respaldo a la inicial.
function Face({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className={cn('flex items-center justify-center bg-surface2 font-display font-bold text-cream', className)}>
      {imgFailed || !slug ? (
        name.charAt(0)
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/personajes/${slug}.webp`} alt={name} onError={() => setImgFailed(true)} className="w-full h-full object-cover" />
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

// Una fila del estilo del jugador: rasgo + barra 0..100 + nivel bajo/medio/alto.
function StyleRow({ label, value, hint }: { label: string; value: number; hint: string }) {
  const nivel = value < 33 ? 'Bajo' : value < 66 ? 'Medio' : 'Alto'
  return (
    <div className="flex items-center gap-2" title={hint}>
      <span className="text-xs font-semibold text-cream w-20 text-left shrink-0">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-black/40 overflow-hidden">
        <div className="h-full bg-gold" style={{ width: `${Math.max(4, value)}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gold w-9 text-right shrink-0">{nivel}</span>
    </div>
  )
}

// Una fila "rasgo: barrita de 10" (dificultad, mentiroso, agresivo).
function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2" aria-label={`${label}: ${value} de 10`}>
      <span className="text-[11px] font-semibold text-subtle">{label}</span>
      <span className="inline-flex items-center gap-0.5" title={`${label} ${value}/10`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={cn('h-2.5 w-1 rounded-full', i < value ? 'bg-gold' : 'bg-line')} />
        ))}
      </span>
    </div>
  )
}

function StarIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.26 6.6.7-4.9 4.5 1.35 6.54L12 16.77 6.05 20l1.35-6.54-4.9-4.5 6.6-.7L12 2z" />
    </svg>
  )
}

function FameIcon({ size = 13 }: { size?: number }) {
  // Laureles (símbolo de fama/renombre).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold" aria-hidden="true">
      <path d="M12 4v13" />
      <path d="M12 17c-3 0-5-2-5-6 3 0 5 2 5 6z" />
      <path d="M12 17c3 0 5-2 5-6-3 0-5 2-5 6z" />
      <path d="M9 20h6" />
    </svg>
  )
}

function PodiumIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21V9H3v12h6zM15 21V3H9v18h6zM21 21v-8h-6v8h6z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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
