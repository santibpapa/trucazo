'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/lib/types'
import { createDeck, getCardImage, getEnvidoPoints, type Card } from '@/lib/truco'
import { Panel, Button, CoinIcon } from '@/components/ui'
import PlayingCard from '@/components/game/PlayingCard'
import CardBack from '@/components/game/CardBack'
import { playSound, isMuted, setMuted } from '@/lib/sounds'
import { SalonBackground, SalonTable } from '@/components/game/SalonScene'
import styles from '@/components/game/salon.module.css'
import { fraseDelBot, type MomentoFrase } from '@/lib/botFrases'
import { getFrameTheme } from '@/lib/marcos'
import { getMedal } from '@/lib/medallas'
import { track } from '@vercel/analytics'
import { trackFirstParty } from '@/lib/analytics/client'
import ObjectiveProgressDelta from '@/components/objectives/ObjectiveProgressDelta'

interface Props {
  game: Game
  currentUserId: string
  myHand: Card[]
  // Modo historia: slug del rival, para mostrar su ilustración en la mesa.
  campaignRivalSlug?: string | null
  // Fotos de perfil (URL) de cada jugador, para los asientos del marcador.
  myAvatarUrl?: string | null
  opponentAvatarUrl?: string | null
  // Marco decorativo (aro) del avatar de cada jugador, comprado en la Tienda.
  myFrame?: string | null
  opponentFrame?: string | null
  // Medalla destacada (ya validada) de cada jugador, para el pin del asiento.
  myMedal?: string | null
  opponentMedal?: string | null
  // Accesorio de la mesa de cada jugador (imagen sobre el paño en su lado).
  myAccessory?: string | null
  opponentAccessory?: string | null
  // Salón (fondo de la mesa) elegido por este jugador en la Tienda.
  salonSlug?: string
  // El rival es uno de los bots del lobby (partida normal, con monedas).
  opponentIsBot?: boolean
}

type EnvidoType = 'envido' | 'real_envido' | 'falta_envido'

// Etiquetas legibles para los cantos (el estado guarda el snake_case)
const ENVIDO_LABEL: Record<string, string> = {
  envido: 'envido', real_envido: 'real envido', falta_envido: 'falta envido',
}
const TRUCO_LABEL: Record<string, string> = {
  truco: 'truco', retruco: 'retruco', vale_cuatro: 'vale cuatro',
}

// Emotes / chat rápido (efímeros, por broadcast)
const EMOTES = ['👏', '😂', '😎', '🔥', '🃏', '¡Mentiroso!', '¡Andá!', '¡Achicate!', '¡Quiero!', '¡Buena!']
const EMOTE_COOLDOWN_MS = 3000

// Cartel central de anuncios (cantos / resultados). side define de qué lado sale:
// 'top' = lo hizo el rival (entre sus cartas y el centro), 'bottom' = lo hice yo.
type Announce = {
  side: 'top' | 'bottom'
  eyebrow?: string
  title: string
  titleClass: string
  subtitle?: string
  subtitleClass?: string
  // Tablero de 2 columnas (vos / rival) para el resultado del envido. El ganador
  // va en verde y el perdedor en rojo; points null = tanto oculto ("son buenas").
  score?: {
    left: { label: string; points: number | null; won: boolean }
    right: { label: string; points: number | null; won: boolean }
  }
  // Mano en la que se mostró el cartel: al empezar una mano nueva descartamos los
  // carteles de manos anteriores para que no tapen la mesa nueva.
  hand?: number
}

// Punto de partida de cada carta al repartir, apuntando al mazo (arriba-derecha).
// La de la izquierda (i=0) viaja más lejos para que las tres converjan en el mazo.
const DEAL_ORIGINS: Array<Record<string, string>> = [
  { '--dx': '95px', '--dy': '-110px', '--rot': '14deg' },
  { '--dx': '55px', '--dy': '-120px', '--rot': '9deg' },
  { '--dx': '22px', '--dy': '-110px', '--rot': '5deg' },
]


// Asiento del marcador: la cara del rival de campaña (/personajes/{slug}.webp) o
// una silueta genérica. El aro dorado latiendo marca al que le toca actuar.
function SeatAvatar({ slug, imageUrl, name, active, frame, medal }: { slug?: string | null; imageUrl?: string | null; name: string; active?: boolean; frame?: string | null; medal?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false)
  // El rival de campaña usa su ilustración (slug); el resto, su foto de perfil.
  const src = slug ? `/personajes/${slug}.webp` : imageUrl || null
  // Marco comprado en la Tienda, alrededor del retrato de cada jugador.
  const theme = getFrameTheme(frame)

  const face =
    src && !imgFailed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setImgFailed(true)}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
    ) : (
      <PersonIcon />
    )

  const leather = 'linear-gradient(180deg, #3a2224 0%, #2a1517 100%)'

  // El marco comprado conserva su aro alrededor del retrato circular.
  const box = theme ? (
    <div
      className={`shrink-0 overflow-hidden transition-shadow relative ${styles.avatar} ${
        active ? 'ring-1 ring-gold/60 animate-pulse-glow' : ''
      }`}
      style={{ background: theme.ring, boxShadow: active ? undefined : theme.glow }}
    >
      <div
        className={`absolute inset-[3px] overflow-hidden flex items-center justify-center ${styles.avatarInner}`}
        style={{ background: leather }}
      >
        {face}
      </div>
    </div>
  ) : (
    <div
      className={`shrink-0 overflow-hidden flex items-center justify-center transition-shadow ${styles.avatar} ${
        active ? 'border-gold ring-1 ring-gold/60 animate-pulse-glow' : 'border-line'
      }`}
      style={{ background: leather }}
    >
      {face}
    </div>
  )

  const medalMeta = getMedal(medal)
  if (!medalMeta) return box

  // Pin de la medalla destacada en la esquina del asiento.
  return (
    <div className="relative shrink-0">
      {box}
      <span
        aria-hidden="true"
        title={medalMeta.name}
        className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border border-line bg-surface2 shadow-card leading-none w-5 h-5 text-[13px]"
      >
        {medalMeta.emoji}
      </span>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-gold/50 mt-1.5">
      <circle cx="12" cy="8" r="3.6" fill="currentColor" />
      <path d="M4 20.5c1.2-3.8 4.3-5.8 8-5.8s6.8 2 8 5.8V22H4v-1.5Z" fill="currentColor" />
    </svg>
  )
}

// Accesorio comprado en la Tienda, apoyado sobre el paño en el lado del jugador.
// El rival va a la IZQUIERDA y un poco abajo de sus cartas; el mío a la DERECHA.
// Se ubican en los costados (donde no caen cartas) para que no queden tapados.
// Imagen /accesorios/{slug}.webp; si falta, se oculta sola (onError).
function TableAccessory({ slug, who }: { slug?: string | null; who: 'me' | 'opponent' }) {
  if (!slug || slug === 'ninguno') return null
  const pos =
    who === 'opponent'
      ? 'top-[24%] left-1 sm:left-4'   // rival: izquierda, debajo de sus cartas
      : 'bottom-[13%] right-0 sm:right-2' // yo: derecha, un poco más abajo
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/accesorios/${slug}.webp`}
      alt=""
      aria-hidden="true"
      onError={e => { e.currentTarget.style.display = 'none' }}
      className={`pointer-events-none absolute ${pos} z-[5] w-14 sm:w-20 object-contain select-none drop-shadow-[0_8px_10px_rgba(0,0,0,0.55)]`}
    />
  )
}

// Botones de la mesa: píldoras oscuras con borde dorado (estilo salón). 'gold'
// es la acción estrella (Truco); el resto varía borde/texto según la intención.
type MesaTone = 'gold' | 'outline' | 'positive' | 'danger' | 'ghost'
const MESA_TONES: Record<MesaTone, string> = {
  gold: 'text-ink font-display font-extrabold tracking-wide border border-[#8a6a2c] bg-gradient-to-b from-[#E8CF84] via-gold to-[#A98532] shadow-gold hover:brightness-105',
  outline:
    'text-cream border border-gold/70 bg-gradient-to-b from-[#43282b] to-[#241214] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-gold',
  positive:
    'text-positive border border-positive/60 bg-gradient-to-b from-[#26302a] to-[#141a16] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-positive',
  danger:
    'text-[#F0A98F] border border-negative/60 bg-gradient-to-b from-[#3c221c] to-[#1f100c] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_16px_-8px_rgba(0,0,0,0.7)] hover:border-negative',
  ghost: 'text-muted border border-line/80 bg-black/30 hover:text-cream hover:border-gold/40',
}

function MesaButton({
  tone = 'outline',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: MesaTone }) {
  return (
    <button
      className={`w-full h-11 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold select-none transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${MESA_TONES[tone]} ${styles.action} ${className ?? ''}`}
      {...props}
    />
  )
}

export default function GameClient({ game: initialGame, currentUserId, myHand: initialMyHand, campaignRivalSlug, salonSlug = 'clasico', myAvatarUrl, opponentAvatarUrl, myFrame, opponentFrame, myMedal, opponentMedal, myAccessory, opponentAccessory, opponentIsBot = false }: Props) {
  const router = useRouter()
  const [game, setGame] = useState<Game>(initialGame)
  const [myHand, setMyHand] = useState<Card[]>(initialMyHand)
  const [loading, setLoading] = useState(false)
  // Segundos que le quedan al jugador de turno (reloj por jugada)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  // Saludo de gracias al volver de dejar una reseña
  const [showThanks, setShowThanks] = useState(false)
  // Cartel central de anuncios (cantos y resultados), sale del lado del que actuó
  const [announce, setAnnounce] = useState<Announce | null>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot del truco_state previo, para detectar el "no quiero" (canto pendiente → mano nueva)
  const prevTrucoRef = useRef<{ status: string; singer: string | null; value: number; hand: number } | null>(null)
  // El timeout por jugada se dispara una sola vez por turno (clave = turn_started_at)
  const timeoutFiredRef = useRef<string | null>(null)
  // Para detectar cuándo sube el contador de mazos por tiempo y mostrar el cartel
  const prevMazoRef = useRef<{ p1: number; p2: number } | null>(null)
  // Momento de la última acción local; el polling de respaldo se pausa un toque
  // después de jugar para no pisar la actualización optimista con datos viejos.
  const lastActionRef = useRef(0)
  // Emotes / chat rápido
  const [emoteTray, setEmoteTray] = useState(false)
  const [emoteCooldown, setEmoteCooldown] = useState(false)
  const [myEmote, setMyEmote] = useState<string | null>(null)
  const [oppEmote, setOppEmote] = useState<string | null>(null)
  const chatChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  // Sonido
  const [muted, setMutedState] = useState(false)
  useEffect(() => { setMutedState(isMuted()) }, [])
  useEffect(() => {
    const key = `trucazo:tracked-game:${initialGame.id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {}
    track('partida_iniciada', {
      mode: campaignRivalSlug ? 'historia' : opponentIsBot ? 'bot' : 'persona',
      target_score: initialGame.target_score,
    })
    trackFirstParty('game_started', {
      game_id: initialGame.id,
      mode: campaignRivalSlug ? 'historia' : opponentIsBot ? 'bot' : 'persona',
      target_score: initialGame.target_score,
    })
  }, [campaignRivalSlug, initialGame.id, initialGame.target_score, opponentIsBot])
  function toggleMute() { const v = !muted; setMuted(v); setMutedState(v) }
  // Evita disparar sonidos de cantos/final al montar (p. ej. al refrescar en
  // medio de un canto): recién quedan "vivos" tras el primer render.
  const soundReadyRef = useRef(false)
  const playedCountRef = useRef(initialGame.played_cards.length)
  const supabase = createClient()

  const isPlayer1 = currentUserId === game.player1_id
  const opponentId = isPlayer1 ? game.player2_id : game.player1_id

  // Cartas del envido a revelar (el ganador cerró la mano sin mostrarlas): se
  // bajan a la mesa como una jugada normal, ocupando las rondas que ese jugador
  // no llegó a usar, mientras se espera la próxima mano.
  const envidoReveal = game.awaiting_deal ? game.envido_reveal : null
  const revealIsMine = envidoReveal?.player_id === currentUserId
  const revealByRound = new Map<number, Card>()
  if (envidoReveal) {
    let r = 1
    for (const card of envidoReveal.cards) {
      while (r <= 3 && game.played_cards.some(pc => pc.round === r && pc.player_id === envidoReveal.player_id)) r++
      if (r > 3) break
      revealByRound.set(r, card)
      r++
    }
  }

  // Lo que muestro en la mano nunca incluye una carta que ya jugué (está en la
  // mesa). game.played_cards es autoridad del servidor, así que aunque una
  // relectura tardía de game_hands reviva la carta un instante, no se ve el
  // "fantasma": la filtramos contra lo ya jugado en esta mano.
  // Tampoco incluye una carta mía que se está revelando por el envido (ya "cayó").
  const myCards = myHand.filter(
    c => !game.played_cards.some(
      pc => pc.player_id === currentUserId && pc.card.suit === c.suit && pc.card.value === c.value,
    ) && !(revealIsMine && envidoReveal!.cards.some(rc => rc.suit === c.suit && rc.value === c.value)),
  )
  const myScore = isPlayer1 ? game.player1_score : game.player2_score
  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
  const myUsername = isPlayer1 ? game.player1_username : game.player2_username
  const opponentUsername = isPlayer1 ? game.player2_username : game.player1_username
  // awaiting_deal = la mano terminó y se está mostrando antes de repartir la próxima:
  // congelamos las acciones para que se vea la última carta.
  const isMyTurn = !game.awaiting_deal && game.current_turn === currentUserId
  const isMano = game.mano_player === currentUserId

  const currentRoundCards = game.played_cards.filter(pc => pc.round === game.round_number)
  const myPlayedCard = currentRoundCards.find(pc => pc.player_id === currentUserId)

  // Diálogo de tantos del envido (después del "quiero").
  const isDeclaring = game.envido_state.status === 'declaring'
  const manoDeclared = game.envido_state.mano_declared
  // Me toca declarar/responder en el diálogo
  const myDeclareTurn = isDeclaring && !game.awaiting_deal && game.envido_state.declare_turn === currentUserId
  // Mi tanto real (de mis 3 cartas: las que tengo + las que ya jugué esta mano)
  const myEnvido = getEnvidoPoints([
    ...myHand,
    ...game.played_cards.filter(pc => pc.player_id === currentUserId).map(pc => pc.card),
  ])

  // El envido se puede cantar en la 1ª ronda mientras no hayas jugado tu carta.
  // Así también lo puede cantar el "pie" después de que la mano jugó la suya.
  // Sigue disponible aunque haya un truco pendiente (regla "el envido va primero"),
  // pero no una vez que el truco fue aceptado y la mano ya está en juego.
  const iHavePlayedThisHand = game.played_cards.some(pc => pc.player_id === currentUserId)
  const canSingEnvido =
    game.envido_state.status === 'none' &&
    game.round_number === 1 &&
    !iHavePlayedThisHand &&
    game.truco_state.status !== 'accepted'
  // Puedo cantar/escalar truco si no canté yo el último
  const canSingTruco =
    game.truco_state.status === 'none' ||
    (game.truco_state.status === 'accepted' &&
      game.truco_state.value < 4 &&
      game.truco_state.last_singer !== currentUserId)
  const hasPendingEnvido =
    ['envido', 'real_envido', 'falta_envido'].includes(game.envido_state.status) &&
    game.envido_state.last_singer !== currentUserId
  // El envido va primero: mientras haya un envido sin resolver (cantado o
  // declarando tantos), el truco pendiente queda en pausa y no se responde.
  const envidoUnresolved =
    ['envido', 'real_envido', 'falta_envido', 'declaring'].includes(game.envido_state.status)
  const hasPendingTruco =
    ['truco', 'retruco', 'vale_cuatro'].includes(game.truco_state.status) &&
    game.truco_state.last_singer !== currentUserId &&
    !envidoUnresolved

  // El rival es un bot: en el modo historia (rival de la campaña) o en una mesa
  // normal del lobby. Cuando no me toca a mí hacer nada, le doy pie al bot (el
  // servidor decide y juega por él). botTurnKey identifica el estado concreto en
  // que el bot debe actuar, para disparar bot_step una sola vez por turno (y no
  // en cada re-render del reloj).
  const isCampaign = game.campaign_rival_id != null
  const isBotGame = isCampaign || opponentIsBot
  const humanCanAct =
    (isMyTurn && !isDeclaring) || hasPendingEnvido || hasPendingTruco || myDeclareTurn
  const botShouldAct =
    isBotGame && game.status === 'playing' && !game.awaiting_deal && !humanCanAct
  const botTurnKey = botShouldAct
    ? `${game.hand_number}-${game.round_number}-${game.current_turn}-${game.envido_state.status}-${game.truco_state.status}-${game.envido_state.declare_turn ?? ''}`
    : null

  // Me toca actuar (jugar o responder): lo usan el marcador, la pastilla de
  // turno y el destello dorado del borde de la pantalla.
  const meActive = !game.awaiting_deal && game.status === 'playing' && humanCanAct

  // Pantalla del juego fija: bloquea el scroll/rebote del body mientras estás
  // en la partida (sobre todo en iOS). Se restaura al salir al lobby.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
      position: body.style.position,
      width: body.style.width,
      height: body.style.height,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    body.style.position = 'fixed'
    body.style.width = '100%'
    body.style.height = '100%'
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.overscrollBehavior = prev.overscroll
      body.style.position = prev.position
      body.style.width = prev.width
      body.style.height = prev.height
    }
  }, [])

  // Precarga las 40 cartas una sola vez: cuando se reparte una mano nueva las
  // imágenes ya están en caché del navegador y aparecen al instante, sin
  // "pintarse a medias" mientras el PNG termina de bajar.
  useEffect(() => {
    for (const card of createDeck()) {
      const img = new Image()
      img.src = getCardImage(card)
    }
  }, [])

  // Al volver de dejar una reseña (?gracias=1), mostramos un saludo y limpiamos la URL.
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('gracias') === '1') {
      setShowThanks(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Tiempo real: suscripción a cambios de la partida
  // (Requiere que la tabla `games` tenga la replicación realtime habilitada en Supabase)
  useEffect(() => {
    if (game.status === 'finished') return

    const channel = supabase
      .channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => { applyServerGame(payload.new as Game); refetchMyHand() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [game.id, game.status])

  // Respaldo por polling, por si el realtime no entrega los cambios.
  // Se saltea si hubo una acción local hace muy poco (para no revertir lo optimista).
  useEffect(() => {
    if (game.status === 'finished') return

    const interval = setInterval(async () => {
      if (Date.now() - lastActionRef.current < 2000) return
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single()
      if (data) applyServerGame(data as Game)
      await refetchMyHand()
    }, 2500)

    return () => clearInterval(interval)
  }, [game.id, game.status])

  // Reloj por jugada. Lo medimos con el PROPIO reloj de este equipo: anclamos al
  // momento en que ve el turno nuevo y contamos los segundos transcurridos. Así no
  // importa si el reloj del equipo está desfasado respecto al servidor (antes
  // mezclábamos la hora del server con la del cliente y un reloj atrasado mostraba
  // de más). Al agotarse, cualquiera de los dos dispara timeout_mazo y el server
  // valida el plazo real (turn_started_at + time_limit), así no se hace trampa.
  useEffect(() => {
    if (game.status !== 'playing' || game.awaiting_deal || !game.turn_started_at) {
      setSecondsLeft(null)
      return
    }
    const anchor = Date.now()       // momento en que este cliente ve el turno
    const limit = game.time_limit
    const tick = () => {
      const elapsed = (Date.now() - anchor) / 1000
      const left = Math.max(0, Math.ceil(limit - elapsed))
      setSecondsLeft(left)
      if (left <= 0 && timeoutFiredRef.current !== game.turn_started_at) {
        timeoutFiredRef.current = game.turn_started_at
        supabase.rpc('timeout_mazo', { p_game_id: game.id }).then(({ data, error }) => {
          if (data) setGame(data as Game)
          // El server rechaza si todavía no venció: liberamos el guard para reintentar.
          else if (error) timeoutFiredRef.current = null
        })
      }
    }
    tick()
    const iv = setInterval(tick, 500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.awaiting_deal, game.turn_started_at, game.time_limit, game.id])

  // Cartel en el centro cuando alguien se va al mazo por tiempo (sube su contador).
  useEffect(() => {
    const c1 = game.mazo_count_p1 ?? 0
    const c2 = game.mazo_count_p2 ?? 0
    const prev = prevMazoRef.current
    if (prev) {
      const loser: 'p1' | 'p2' | null = c1 > prev.p1 ? 'p1' : c2 > prev.p2 ? 'p2' : null
      if (loser) {
        const loserIsMe = (loser === 'p1') === isPlayer1
        const count = loser === 'p1' ? c1 : c2
        const remaining = Math.max(0, 3 - count)
        showAnnounce({
          side: loserIsMe ? 'bottom' : 'top',
          eyebrow: 'Sin tiempo',
          title: loserIsMe ? 'Te fuiste al mazo' : `${opponentUsername} se fue al mazo`,
          titleClass: 'text-negative',
          subtitle: remaining > 0
            ? (loserIsMe
                ? `Te ${remaining === 1 ? 'queda 1 oportunidad' : `quedan ${remaining} oportunidades`}`
                : `${remaining === 1 ? 'Queda 1 oportunidad' : `Quedan ${remaining} oportunidades`} hasta darte la victoria`)
            : (loserIsMe ? 'Perdiste la partida' : '¡Ganaste la partida!'),
          subtitleClass: 'text-cream/85',
        }, 4200)
      }
    }
    prevMazoRef.current = { p1: c1, p2: c2 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.mazo_count_p1, game.mazo_count_p2])

  // Heartbeat de presencia en la DB: lo usa el barrido de respaldo (sweep_stale_games)
  // para reembolsar partidas donde ambos jugadores desaparecieron hace rato.
  useEffect(() => {
    if (game.status === 'finished') return
    const touch = () => { supabase.rpc('touch_presence', { p_game_id: game.id }) }
    touch()
    const iv = setInterval(touch, 8000)
    return () => clearInterval(iv)
  }, [game.id, game.status])

  // Chat rápido: canal de broadcast efímero (no toca la DB). Recibimos solo los
  // emotes del rival (broadcast no devuelve los propios); el mío lo muestro local.
  useEffect(() => {
    if (game.status === 'finished') return
    const channel = supabase.channel(`chat-${game.id}`)
    channel
      .on('broadcast', { event: 'emote' }, ({ payload }) => {
        setOppEmote((payload as { text?: string })?.text ?? null)
      })
      .subscribe()
    chatChannelRef.current = channel
    return () => { supabase.removeChannel(channel); chatChannelRef.current = null }
  }, [game.id, game.status])

  // Las burbujas de emote se autodescartan
  useEffect(() => {
    if (!myEmote) return
    const t = setTimeout(() => setMyEmote(null), 2800)
    return () => clearTimeout(t)
  }, [myEmote])
  useEffect(() => {
    if (!oppEmote) return
    const t = setTimeout(() => setOppEmote(null), 2800)
    return () => clearTimeout(t)
  }, [oppEmote])

  // El rival de campaña "habla": frase en su globito de emote según el momento.
  // Las frases propias del personaje salen máximo una vez por partida (el set
  // las recuerda) y entre frase y frase hay un respiro para que no sea un loro.
  const botFrasesUsadasRef = useRef<Set<string>>(new Set())
  const botFraseAtRef = useRef(0)
  function botHabla(momento: MomentoFrase) {
    if (!campaignRivalSlug) return
    const now = Date.now()
    if (now - botFraseAtRef.current < 5000) return
    const frase = fraseDelBot(campaignRivalSlug, momento, botFrasesUsadasRef.current)
    if (!frase) return
    botFraseAtRef.current = now
    setOppEmote(frase)
  }

  function sendEmote(text: string) {
    if (emoteCooldown) return
    chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text } })
    setMyEmote(text)
    setEmoteTray(false)
    setEmoteCooldown(true)
    setTimeout(() => setEmoteCooldown(false), EMOTE_COOLDOWN_MS)
  }

  // Reparte la próxima mano (server-side, idempotente). Lo dispara el delay.
  async function advanceHand() {
    const { data, error } = await supabase.rpc('advance_hand', { p_game_id: game.id })
    if (!rpcFailed('advance_hand RPC:', error) && data) setGame(data as Game)
    await refetchMyHand()
  }

  // Delay para apreciar el cierre de la mano: cuando queda awaiting_deal, se
  // muestra la mesa resuelta y, tras un momento, se reparte la próxima. Ambos
  // clientes lo agendan; advance_hand es idempotente, así que no duplica.
  useEffect(() => {
    if (game.status !== 'playing' || !game.awaiting_deal) return
    // Si hay cartas de envido para mostrar, damos un poco más de tiempo para verlas.
    const t = setTimeout(() => { advanceHand() }, game.envido_reveal ? 2600 : 1800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.awaiting_deal, game.status, game.id])

  // La pantalla de fin ("Ganaste/Perdiste") se muestra con un pequeño delay tras
  // terminar la partida, para alcanzar a ver la última jugada resuelta en la mesa
  // (p. ej. el tanto que cantó el bot en el envido) y no saltar de golpe. Si la
  // partida ya venía terminada al abrir, se muestra al instante.
  const [showFinish, setShowFinish] = useState(game.status === 'finished')
  useEffect(() => {
    if (game.status !== 'finished') { setShowFinish(false); return }
    if (showFinish) return
    const t = setTimeout(() => setShowFinish(true), 2000)
    return () => clearTimeout(t)
  }, [game.status, showFinish])

  // Frase de despedida del rival de campaña: aprovecha el ratito entre que
  // termina la partida y aparece la pantalla de fin.
  useEffect(() => {
    if (game.status !== 'finished' || !isCampaign || !game.winner_id) return
    botHabla(game.winner_id === currentUserId ? 'pierde_partida' : 'gana_partida')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status])

  // Partida terminada: seguimos escuchando para la revancha (votos y nueva partida).
  useEffect(() => {
    if (game.status !== 'finished') return
    const channel = supabase
      .channel(`rematch-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => applyServerGame(payload.new as Game),
      )
      .subscribe()
    const iv = setInterval(async () => {
      const { data } = await supabase.from('games').select('*').eq('id', game.id).single()
      if (data) applyServerGame(data as Game)
    }, 2500)
    return () => { supabase.removeChannel(channel); clearInterval(iv) }
  }, [game.id, game.status])

  // Cuando se concreta la revancha, ambos van a la nueva partida.
  useEffect(() => {
    if (game.rematch_game_id) {
      router.push(`/game/${game.rematch_game_id}`)
      router.refresh()
    }
  }, [game.rematch_game_id])

  // Modo historia: le doy pie al bot cuando le toca. bot_step hace UNA sola
  // acción por llamada. El tiempo de "pensar" varía según la situación (antes
  // era un 2s clavado, y ese metrónomo delataba a la máquina): la carta sale
  // rapidito, decir el tanto un poco más, y una decisión grande (le cantaron
  // truco o envido) se piensa bastante más — con una pausa dramática cada
  // tanto, como quien duda de verdad. La dependencia es botTurnKey (estable
  // entre re-renders del reloj y distinto en cada acción del bot), así cada
  // canto/jugada del bot se dispara por separado y espaciado.
  useEffect(() => {
    if (!botTurnKey) return
    const bigCall =
      (['truco', 'retruco', 'vale_cuatro'].includes(game.truco_state.status) &&
        game.truco_state.last_singer === currentUserId &&
        !envidoUnresolved) ||
      (['envido', 'real_envido', 'falta_envido'].includes(game.envido_state.status) &&
        game.envido_state.last_singer === currentUserId)
    const thinkMs = bigCall
      ? 1800 + Math.random() * 2400 + (Math.random() < 0.18 ? 1800 : 0)
      : game.envido_state.status === 'declaring'
        ? 1200 + Math.random() * 1100
        : 1100 + Math.random() * 1300
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('bot_step', { p_game_id: game.id })
      if (!rpcFailed('bot_step RPC:', error) && data) {
        lastActionRef.current = Date.now()
        const next = data as Game
        // ¿El bot se fue al mazo? La mano quedó en espera sin que él haya
        // jugado su carta de esta ronda (y no fue un "no quiero" al truco).
        // Siempre lo anuncia: con una frase suya o con el cartelito clásico.
        const botCartas = next.played_cards.filter(pc => pc.player_id !== currentUserId).length
        if (next.awaiting_deal && !game.awaiting_deal && next.truco_state.status !== 'rejected'
            && botCartas < next.round_number && campaignRivalSlug) {
          setOppEmote(fraseDelBot(campaignRivalSlug, 'mazo', botFrasesUsadasRef.current) ?? 'Me voy al mazo')
        }
        setGame(next)
      }
    }, thinkMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurnKey, game.id])

  // El banner de error de una acción se autodescarta a los 4s
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(''), 4000)
    return () => clearTimeout(t)
  }, [actionError])

  // Anuncio del envido: canto (envido/real/falta, lado del que canta) y resultado
  // (quiero/no quiero, lado del que responde). Depende de status/last_singer/winner.
  useEffect(() => {
    const es = game.envido_state
    const st = es.status
    const chain = es.chain ?? []
    const tier = chain[chain.length - 1] ?? 'envido'

    // Canto
    if (st === 'envido' || st === 'real_envido' || st === 'falta_envido') {
      const mine = es.last_singer === currentUserId
      if (soundReadyRef.current) {
        playSound(st === 'real_envido' ? 'real-envido' : st === 'falta_envido' ? 'falta-envido' : 'envido')
      }
      showAnnounce({
        side: mine ? 'bottom' : 'top',
        title: ENVIDO_LABEL[tier] ?? 'envido',
        titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${mine ? myUsername : opponentUsername}`,
      })
      if (!mine) botHabla('canta_envido')
      return
    }

    // Diálogo de tantos (después del "quiero")
    if (st === 'declaring') {
      if (manoDeclared == null) {
        // Recién aceptado: "Quiero" (lo dijo el que respondió, no el cantor)
        const responderIsMe = es.last_singer !== currentUserId
        if (soundReadyRef.current) playSound('quiero')
        showAnnounce({ side: responderIsMe ? 'bottom' : 'top',
          eyebrow: ENVIDO_LABEL[tier] ?? 'envido', title: 'Quiero', titleClass: 'text-cream' })
        if (!responderIsMe) botHabla('quiere')
      } else {
        // La mano declaró su tanto
        const manoIsMe = game.mano_player === currentUserId
        showAnnounce({ side: manoIsMe ? 'bottom' : 'top',
          title: `Tengo ${manoDeclared}`, titleClass: 'text-gold uppercase tracking-wide' })
      }
      return
    }

    // Resultado
    if ((st === 'accepted' || st === 'rejected') && es.winner_id != null) {
      const responderIsMe = es.last_singer !== currentUserId
      const side: 'top' | 'bottom' = responderIsMe ? 'bottom' : 'top'
      const won = es.winner_id === currentUserId
      const eyebrow = ENVIDO_LABEL[tier] ?? 'envido'

      if (st === 'rejected') {
        if (soundReadyRef.current) playSound('no-quiero')
        showAnnounce({ side, eyebrow, title: 'No quiero', titleClass: 'text-cream' })
        if (!responderIsMe) botHabla('no_quiere')
        return
      }

      const theirs = isPlayer1 ? es.player2_points : es.player1_points
      const mineP = isPlayer1 ? es.player1_points : es.player2_points
      // "Son buenas": alguien no reveló su tanto (queda null). Si están los dos, tablero.
      const hidden = mineP == null || theirs == null

      if (hidden) {
        // El tanto del pie queda oculto; solo mostramos el resultado, sin puntos.
        showAnnounce({ side, eyebrow,
          title: won ? 'Son buenas' : 'Perdiste',
          titleClass: won ? 'text-positive' : 'text-negative' })
      } else {
        // Ambos tantos visibles → tablero de 2 columnas (vos / rival).
        showAnnounce({
          side,
          title: (ENVIDO_LABEL[tier] ?? 'envido').toUpperCase(),
          titleClass: 'text-gold',
          score: {
            left: { label: 'Vos', points: mineP ?? null, won },
            right: { label: opponentUsername, points: theirs ?? null, won: !won },
          },
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.envido_state.status, game.envido_state.last_singer, game.envido_state.winner_id, game.envido_state.mano_declared])

  // "33 en mesa": el ganador del envido cerró la mano sin mostrar las cartas de
  // su tanto, así que se bajan a la mesa y se anuncia como un canto.
  useEffect(() => {
    if (!game.awaiting_deal || !game.envido_reveal) return
    const mine = game.envido_reveal.player_id === currentUserId
    const pts = game.envido_reveal.player_id === game.player1_id
      ? game.envido_state.player1_points
      : game.envido_state.player2_points
    if (soundReadyRef.current) playSound('carta')
    showAnnounce({
      side: mine ? 'bottom' : 'top',
      title: pts != null ? `${pts} en mesa` : 'en mesa',
      titleClass: 'text-gold uppercase tracking-wide',
      subtitle: `el envido de ${mine ? myUsername : opponentUsername}`,
    })
    // Deps booleanas: cada update del server trae un objeto envido_reveal nuevo
    // con el mismo contenido, y no queremos re-disparar el sonido/cartel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.awaiting_deal, !!game.envido_reveal])

  // Anuncio central del truco: canto, "quiero" y "no quiero".
  // El "no quiero" se infiere: un canto pendiente solo puede terminar en mano
  // nueva si lo rechazaron (no se puede ir al mazo ni ganar la mano con un canto
  // sin responder), así que "antes pendiente + hand_number subió" = no quiero.
  useEffect(() => {
    const ts = game.truco_state
    const st = ts.status
    const prev = prevTrucoRef.current

    if (st === 'truco' || st === 'retruco' || st === 'vale_cuatro') {
      // Canto: lado del que canta
      const byMe = ts.last_singer === currentUserId
      if (soundReadyRef.current) {
        playSound(st === 'vale_cuatro' ? 'vale-cuatro' : st === 'retruco' ? 'retruco' : 'truco')
      }
      showAnnounce({ side: byMe ? 'bottom' : 'top',
        title: TRUCO_LABEL[st] ?? 'truco', titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${byMe ? myUsername : opponentUsername}` })
      if (!byMe) botHabla(st === 'truco' ? 'canta_truco' : 'sube')
    } else if (st === 'accepted' && prev?.status !== 'accepted') {
      // Quiero: lado del que responde (no es el que cantó)
      const responderIsMe = ts.last_singer !== currentUserId
      if (soundReadyRef.current) playSound('quiero')
      showAnnounce({ side: responderIsMe ? 'bottom' : 'top',
        eyebrow: 'Truco', title: 'Quiero', titleClass: 'text-cream' })
      if (!responderIsMe) botHabla('quiere')
    } else if (st === 'rejected' && prev?.status !== 'rejected') {
      // No quiero: el que cantó (last_singer) gana el valor anterior. El cartel
      // sale del lado del que rechazó (el que NO es el cantor).
      const winnerIsMe = ts.last_singer === currentUserId
      const canto =
        prev && ['truco', 'retruco', 'vale_cuatro'].includes(prev.status)
          ? (TRUCO_LABEL[prev.status] ?? 'truco')
          : ts.value === 4 ? 'vale cuatro' : ts.value === 3 ? 'retruco' : 'truco'
      if (soundReadyRef.current) playSound('no-quiero')
      showAnnounce({ side: winnerIsMe ? 'top' : 'bottom',
        eyebrow: canto, title: 'No quiero', titleClass: 'text-cream' })
      if (winnerIsMe) botHabla('no_quiere')
    }

    prevTrucoRef.current = { status: st, singer: ts.last_singer ?? null, value: ts.value ?? 1, hand: game.hand_number }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.truco_state.status, game.truco_state.last_singer, game.hand_number])

  // Sonido de carta: cada vez que aparece una carta nueva en la mesa (tuya o del
  // rival). Se basa en que played_cards crece; al empezar mano nueva vuelve a 0,
  // así que un descenso no suena.
  useEffect(() => {
    const n = game.played_cards.length
    if (n > playedCountRef.current) playSound('carta')
    playedCountRef.current = n
  }, [game.played_cards.length])

  // Sonido de fin de partida (una sola vez, y no al refrescar la pantalla final).
  useEffect(() => {
    if (game.status !== 'finished' || !soundReadyRef.current) return
    if (game.winner_id == null) return // partida anulada
    playSound(game.winner_id === currentUserId ? 'gano' : 'perdi')
  }, [game.status, game.winner_id, currentUserId])

  // Marca los sonidos como "vivos" tras el primer render. Va DESPUÉS de los
  // efectos de canto/final para que en el montaje esos vean el ref todavía en
  // false y no suenen.
  useEffect(() => { soundReadyRef.current = true }, [])

  // Al empezar una mano nueva, descartamos cualquier cartel que haya quedado de
  // una mano anterior (p. ej. el "No quiero" del truco), para no tapar la mesa
  // nueva. El cartel que nace junto con la mano nueva queda etiquetado con ella,
  // así que no se descarta.
  useEffect(() => {
    setAnnounce(prev => (prev && prev.hand != null && prev.hand < game.hand_number ? null : prev))
  }, [game.hand_number])


  // Muestra un cartel de anuncio y lo autodescarta (cancelando el anterior).
  // Lo etiquetamos con la mano actual para poder descartarlo al empezar otra.
  function showAnnounce(a: Announce, ms = 3600) {
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setAnnounce({ ...a, hand: game.hand_number })
    announceTimer.current = setTimeout(() => setAnnounce(null), ms)
  }

  // Loguea y muestra el error de una RPC; devuelve true si hubo error.
  function rpcFailed(label: string, error: { message?: string } | null): boolean {
    if (!error) return false
    console.error(label, error)
    setActionError(error.message || 'No se pudo completar la acción')
    return true
  }

  // Mi mano vive en game_hands (la RLS solo me deja ver la mía). La recargamos
  // cuando llega un cambio de la partida (p.ej. al repartir una mano nueva).
  async function refetchMyHand() {
    const { data } = await supabase
      .from('game_hands')
      .select('cards')
      .eq('game_id', game.id)
      .eq('player_id', currentUserId)
      .single()
    if (data) setMyHand((data.cards as Card[]) ?? [])
  }

  // Aplica un estado que llega del server por realtime/polling. Si la partida ya
  // terminó, ignora cualquier aviso atrasado que la quiera volver a "en juego"
  // (evita que el tablero reaparezca un instante después del cartel de fin).
  function applyServerGame(next: Game) {
    setGame(prev => (prev.status === 'finished' && next.status !== 'finished' ? prev : next))
  }

  // Jugar una carta: el servidor valida turno/carta, resuelve la ronda y la mano,
  // otorga el truco y reparte/termina. El cliente solo refleja lo que devuelve.
  async function playCard(card: Card) {
    if (!isMyTurn || loading) return
    if (hasPendingEnvido || hasPendingTruco || myPlayedCard || isDeclaring) return

    setLoading(true)
    lastActionRef.current = Date.now()

    // Optimista: saco la carta de mi mano para que la UI responda al toque.
    setMyHand(prev => prev.filter(c => !(c.value === card.value && c.suit === card.suit)))

    const { data, error } = await supabase.rpc('play_card', {
      p_game_id: game.id,
      p_card: card,
    })
    if (rpcFailed('play_card RPC:', error)) {
      await refetchMyHand() // revertir lo optimista si falló
      setLoading(false)
      return
    }
    if (data) setGame(data as Game)
    await refetchMyHand()
    setLoading(false)
  }

  // ---- ENVIDO (resuelto en el servidor) ----
  async function singEnvido(type: EnvidoType) {
    if (loading) return
    if (!isMyTurn && !hasPendingEnvido) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const { data, error } = await supabase.rpc('sing_envido', { p_game_id: game.id, p_type: type })
    if (!rpcFailed('sing_envido RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  async function respondEnvido(accept: boolean) {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    // Burbuja del que responde (como en el chat rápido)
    const bubble = accept ? '¡Quiero!' : '¡No quiero!'
    chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text: bubble } })
    setMyEmote(bubble)
    // Si acepta, el servidor abre el diálogo de tantos (la mano declara primero).
    // Si no, resuelve el "no quiero" como antes.
    const { data, error } = await supabase.rpc('respond_envido', { p_game_id: game.id, p_accept: accept })
    if (!rpcFailed('respond_envido RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  // Diálogo de tantos (después del "quiero"): 'tengo' revela tu tanto (lo calcula
  // el server de tus cartas), 'son_buenas' cede sin revelar, 'mazo' abandona la mano.
  async function envidoSay(action: 'tengo' | 'son_buenas' | 'mazo') {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const bubble = action === 'tengo' ? `Tengo ${myEnvido}`
      : action === 'son_buenas' ? 'Son buenas' : 'Me voy al mazo'
    chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text: bubble } })
    setMyEmote(bubble)
    const { data, error } = await supabase.rpc('envido_say', { p_game_id: game.id, p_action: action })
    if (!rpcFailed('envido_say RPC:', error) && data) setGame(data as Game)
    await refetchMyHand()
    setLoading(false)
  }

  // ---- TRUCO (resuelto en el servidor) ----
  async function singTruco(type: 'truco' | 'retruco' | 'vale_cuatro') {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const { data, error } = await supabase.rpc('sing_truco', { p_game_id: game.id, p_type: type })
    if (!rpcFailed('sing_truco RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  async function respondTruco(accept: boolean) {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const { data, error } = await supabase.rpc('respond_truco', { p_game_id: game.id, p_accept: accept })
    if (!rpcFailed('respond_truco RPC:', error) && data) setGame(data as Game)
    await refetchMyHand() // por si el rechazo repartió una mano nueva
    setLoading(false)
  }

  async function irseAlMazo() {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    // Cartelito de la acción (como un emote), del lado del que se va al mazo
    chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text: 'Me voy al mazo' } })
    setMyEmote('Me voy al mazo')
    const { data, error } = await supabase.rpc('irse_al_mazo', { p_game_id: game.id })
    if (!rpcFailed('irse_al_mazo RPC:', error) && data) setGame(data as Game)
    // La próxima mano la reparte el delay (advance_hand) al ver awaiting_deal
    setLoading(false)
  }

  // Abandonar la partida: cuenta como derrota, el rival se lleva el pozo (server-side)
  async function forfeit() {
    if (loading) return
    if (!window.confirm('¿Seguro que querés abandonar? Pierdes la partida y el pozo.')) return
    setLoading(true)
    const { data, error } = await supabase.rpc('forfeit', { p_game_id: game.id })
    if (!rpcFailed('forfeit RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  // Pedir revancha: cuando ambos lo piden, el server crea la nueva partida.
  async function requestRematch() {
    if (loading) return
    setLoading(true)
    const { data, error } = await supabase.rpc('request_rematch', { p_game_id: game.id })
    if (!rpcFailed('request_rematch RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  function goToLobby() {
    router.push('/lobby')
    router.refresh()
  }

  async function playAgainCampaign() {
    if (!game.campaign_rival_id) return
    setLoading(true)
    const { data, error } = await supabase.rpc('start_campaign_duel', { p_rival_id: game.campaign_rival_id })
    if (!rpcFailed('start_campaign_duel RPC:', error) && data) {
      router.push(`/game/${(data as Game).id}`)
      router.refresh()
    } else {
      setActionError('No se pudo empezar el duelo de nuevo.')
      setLoading(false)
    }
  }

  // Modo historia: fin del duelo. El bot no pide revancha ni se mueven monedas
  // del pozo; ofrecemos jugar de nuevo o volver a la galería.
  if (game.status === 'finished' && isCampaign && showFinish) {
    const won = game.winner_id === currentUserId
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <Panel className="w-full max-w-sm p-8 text-center flex flex-col items-center gap-5 animate-scale-in">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              won ? 'bg-gold/15 text-gold shadow-gold-ring' : 'bg-negative/15 text-negative'
            }`}
          >
            {won ? <TrophyIcon /> : <FlagIcon />}
          </div>
          <h2 className="font-display text-3xl font-extrabold text-cream">
            {won ? '¡Ganaste!' : 'Perdiste'}
          </h2>

          {/* Premios del duelo: puntos de ranking (si ganó algo) y monedas (solo
              la primera vez que vencés a este rival). */}
          {won && (game.campaign_points_earned > 0 || game.campaign_reward > 0) && (
            <div className="flex items-center gap-2">
              {game.campaign_points_earned > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-display font-bold text-gold shadow-gold-ring animate-scale-in">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.9 6.26 6.6.7-4.9 4.5 1.35 6.54L12 16.77 6.05 20l1.35-6.54-4.9-4.5 6.6-.7L12 2z" />
                  </svg>
                  +{game.campaign_points_earned.toLocaleString('es-AR')} pts
                </div>
              )}
              {game.campaign_reward > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-display font-bold text-gold shadow-gold-ring animate-scale-in">
                  <CoinIcon size={18} />
                  +{game.campaign_reward.toLocaleString('es-AR')}
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-muted">
            {won
              ? `Le ganaste a ${opponentUsername}. Mirá el mapa: capaz se abrió algo nuevo.`
              : `${opponentUsername} te ganó esta vez. Volvé a intentarlo, le vas a encontrar la vuelta.`}
          </p>

          <ObjectiveProgressDelta gameId={game.id} />

          {actionError && <p className="text-sm text-negative">{actionError}</p>}

          <div className="w-full flex flex-col gap-2">
            <Button variant="primary" size="md" fullWidth onClick={playAgainCampaign} disabled={loading}>
              {won ? 'Jugar de nuevo' : 'Revancha'}
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => router.push('/historia')} disabled={loading}>
              Volver al modo historia
            </Button>
          </div>

          {/* Pedido de reseña (temporal: por ahora aparece apenas termina cada partida) */}
          <div className="w-full flex flex-col items-center gap-2 border-t border-line/60 pt-4">
            {showThanks && (
              <p className="text-xs font-semibold text-gold text-center">¡Gracias por tu reseña! 🌟</p>
            )}
            <p className="text-xs text-muted text-center">¿Nos podrás ayudar con una breve reseña del juego?</p>
            <Button variant="secondary" size="sm" fullWidth onClick={() => router.push(`/resena?game=${game.id}`)}>
              Dejar reseña
            </Button>
          </div>
        </Panel>
      </main>
    )
  }

  if (game.status === 'finished' && showFinish) {
    // Partida anulada (abandonada por ambos): sin ganador, se reembolsa la apuesta.
    const voided = game.winner_id == null
    const won = game.winner_id === currentUserId
    const net = game.bet / 2
    const myVote = isPlayer1 ? game.rematch_p1 : game.rematch_p2
    const oppVote = isPlayer1 ? game.rematch_p2 : game.rematch_p1
    const rematchCount = (game.rematch_p1 ? 1 : 0) + (game.rematch_p2 ? 1 : 0)
    const someoneWantsRematch = rematchCount > 0
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <Panel className="w-full max-w-sm p-8 text-center flex flex-col items-center gap-5 animate-scale-in">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              voided ? 'bg-surface2 text-muted' : won ? 'bg-gold/15 text-gold shadow-gold-ring' : 'bg-negative/15 text-negative'
            }`}
          >
            {voided ? <FlagIcon /> : won ? <TrophyIcon /> : <FlagIcon />}
          </div>
          <h2 className="font-display text-3xl font-extrabold text-cream">
            {voided ? 'Partida anulada' : won ? '¡Ganaste!' : 'Perdiste'}
          </h2>
          {voided ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-4 py-2 font-display font-bold text-muted">
              <CoinIcon size={18} />
              Apuesta reembolsada
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-display font-bold ${
                won
                  ? 'border-positive/40 bg-positive/10 text-positive'
                  : 'border-negative/40 bg-negative/10 text-negative'
              }`}
            >
              <CoinIcon size={18} />
              {won ? '+' : '−'}{net.toLocaleString('es-AR')}
            </div>
          )}

          {!voided && <ObjectiveProgressDelta gameId={game.id} />}

          {actionError && <p className="text-sm text-negative">{actionError}</p>}

          {/* Cuadro de revancha: se ilumina si alguno la pidió y muestra el conteo */}
          <div
            className={`w-full rounded-2xl border p-3 flex flex-col gap-3 transition-colors ${
              someoneWantsRematch ? 'border-gold bg-gold/10 shadow-gold-ring' : 'border-line bg-surface2'
            }`}
          >
            {showThanks && (
              <p className="text-xs font-semibold text-gold text-center">¡Gracias por tu reseña! 🌟</p>
            )}
            {someoneWantsRematch && (
              <p className="text-sm font-semibold text-gold flex items-center justify-center gap-2">
                {myVote && !oppVote ? 'Esperando a tu rival…'
                  : oppVote && !myVote ? `${opponentUsername} quiere revancha`
                  : '¡Revancha!'}
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs tabular">{rematchCount}/2</span>
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" fullWidth onClick={goToLobby} disabled={loading}>
                Volver al lobby
              </Button>
              <Button variant="primary" size="sm" fullWidth onClick={requestRematch} disabled={loading || myVote}>
                {myVote ? 'Revancha pedida' : 'Revancha'}
              </Button>
            </div>

            {/* Pedido de reseña */}
            <div className="flex flex-col items-center gap-2 border-t border-line/60 pt-3">
              <p className="text-xs text-muted text-center">¿Nos podrás ayudar con una breve reseña del juego?</p>
              <Button variant="secondary" size="sm" fullWidth onClick={() => router.push(`/resena?game=${game.id}`)}>
                Dejar reseña
              </Button>
            </div>
          </div>
        </Panel>
      </main>
    )
  }

  // Dorsos del rival: 3 menos las cartas que ya jugó en esta mano.
  // El abanico del rival descuenta también las cartas que bajó por el envido
  const oppRevealedCount = envidoReveal && !revealIsMine ? envidoReveal.cards.length : 0
  const oppCardsLeft = Math.max(0, 3 - game.played_cards.filter(pc => pc.player_id === opponentId).length - oppRevealedCount)
  return (
    <main className={styles.game}>
      <SalonBackground slug={salonSlug} />
      <div className={styles.shell}>
      <div className={styles.brand} aria-label="Trucazo">TRUCAZO</div>
      <div className={styles.scoreboard} aria-label="Marcador">
        <div className={styles.scoreRow}>
          <div className={styles.scorePlayer}>
            <span className={styles.scoreName}>{myUsername} (vos)</span>
            <span className={styles.scoreValue}>{myScore}</span>
          </div>
          <div className={styles.scoreDetail}>
            <span>A {game.target_score}</span>
            {game.bet > 0 && <span className="inline-flex items-center gap-1"><CoinIcon size={12} />{game.bet}</span>}
            <small>{game.bet > 0 ? 'Pozo · ' : ''}Mano: {isMano ? 'vos' : 'rival'}</small>
          </div>
          <div className={styles.scorePlayer}>
            <span className={styles.scoreName}>{opponentUsername}</span>
            <span className={styles.scoreValue}>{opponentScore}</span>
          </div>
        </div>
      </div>

      {/* Error de la última acción (se autodescarta). Flota sobre la mesa (h-0 +
          absolute) para no empujar el layout: la mesa no cambia de tamaño. */}
      {actionError && (
        <div className="relative z-40 h-0 overflow-visible">
        <div
          role="alert"
          onClick={() => setActionError('')}
          className="absolute inset-x-0 top-1 rounded-xl border border-negative/40 bg-negative/60 backdrop-blur p-2 text-center text-sm font-medium text-white shadow-card cursor-pointer animate-fade-up"
        >
          {actionError}
        </div>
        </div>
      )}

      {/* Cada fila reserva su lugar: los cantos y el reparto no mueven la mesa. */}
      <div className={styles.stage}>
        <SalonTable slug={salonSlug} />
        <div className={styles.tablePlay}>
          <div className={`${styles.seat} ${styles.opponentSeat}`}>
            <SeatAvatar slug={campaignRivalSlug} imageUrl={opponentAvatarUrl} name={opponentUsername} active={!meActive} frame={opponentFrame} medal={opponentMedal} />
            <span className={styles.seatName}>{opponentUsername}</span>
          </div>
        {/* Accesorios sobre el paño: el del rival a la izquierda (debajo de sus
            cartas) y el mío a la derecha, en los costados para no pisar cartas. */}
        <TableAccessory slug={opponentAccessory} who="opponent" />
        <TableAccessory slug={myAccessory} who="me" />

        <div className={styles.toolbar}>
        {/* Silenciar / activar sonidos */}
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          className={styles.toolButton}
        >
          {muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>

        {/* Chat rápido: botón + bandeja de emotes */}
        <button
          onClick={() => setEmoteTray(v => !v)}
          aria-label="Chat rápido"
          aria-expanded={emoteTray}
          className={styles.toolButton}
        >
          <ChatIcon />
        </button>
        </div>
        {emoteTray && (
          <div className="absolute top-12 right-2 z-30 flex flex-wrap justify-end gap-1.5 max-w-[15rem] rounded-2xl border border-line bg-base/95 backdrop-blur p-2 shadow-lift animate-scale-in">
            {EMOTES.map(e => {
              const isText = /[a-zA-ZÁÉÍÓÚáéíóú]/.test(e)
              return (
                <button
                  key={e}
                  onClick={() => sendEmote(e)}
                  disabled={emoteCooldown}
                  className={`h-9 px-2.5 rounded-xl bg-surface2 hover:bg-surface border border-line hover:border-gold flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:border-line ${
                    isText ? 'text-sm font-semibold text-cream whitespace-nowrap' : 'text-xl'
                  }`}
                >
                  {e}
                </button>
              )
            })}
          </div>
        )}

        {/* Burbujas de emote (efímeras) */}
        {oppEmote && (
          <div className="absolute top-2 left-2 z-20 rounded-2xl rounded-tl-sm border border-line bg-base/90 backdrop-blur px-3 py-1.5 text-lg shadow-card animate-scale-in">
            {oppEmote}
          </div>
        )}
        {myEmote && (
          <div className="absolute bottom-2 left-2 z-20 rounded-2xl rounded-bl-sm border border-gold/40 bg-gold/15 backdrop-blur px-3 py-1.5 text-lg shadow-card animate-scale-in">
            {myEmote}
          </div>
        )}

        {/* Cartel de anuncio (cantos / resultados): sale del lado del que actuó.
            Solo se muestra si pertenece a la mano actual: apenas empieza una mano
            nueva, ningún cartel de una mano anterior sigue en pantalla (aunque una
            actualización tardía del servidor intente revivirlo). */}
        {announce && announce.hand === game.hand_number && (
          <div className={`absolute inset-x-0 z-30 px-3 -translate-y-1/2 pointer-events-none ${announce.side === 'top' ? 'top-[30%]' : 'top-[70%]'}`}>
            <div
              className="mx-auto max-w-[16rem] rounded-2xl border border-gold/40 bg-[#160b0d]/90 backdrop-blur-md px-5 py-3 text-center shadow-lift animate-announce-in"
              style={{ '--enterY': announce.side === 'top' ? '-22px' : '22px' } as React.CSSProperties}
            >
              {announce.score ? (
                <>
                  {/* Título centrado arriba (ENVIDO / REAL ENVIDO / …) */}
                  <div className={`font-display text-lg font-extrabold uppercase tracking-[0.2em] ${announce.titleClass}`}>
                    {announce.title}
                  </div>
                  {/* Dos columnas: vos / rival, con su tanto. Ganador verde, perdedor rojo. */}
                  <div className="mt-2.5 grid grid-cols-2 divide-x divide-white/15">
                    {[announce.score.left, announce.score.right].map((c, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5 px-2 min-w-0">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide truncate max-w-[6.5rem] ${c.won ? 'text-positive' : 'text-negative'}`}>
                          {c.label}
                        </span>
                        <span className={`font-display text-3xl font-extrabold tabular leading-none ${c.won ? 'text-positive' : 'text-negative'}`}>
                          {c.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {announce.eyebrow && (
                    <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold">{announce.eyebrow}</div>
                  )}
                  <div className={`font-display text-xl font-extrabold mt-1 ${announce.titleClass}`}>{announce.title}</div>
                  {announce.subtitle && (
                    <div className={`text-sm mt-1 ${announce.subtitleClass ?? 'text-cream/85'}`}>{announce.subtitle}</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Mazo: pila de dorsos de la que "salen" las cartas al repartir. En
            celular va más abajo, bien sobre el paño (arriba quedaba fuera del
            óvalo, que en la mesa achatada ya no llega a esa esquina). */}
        <div className={styles.deck} aria-hidden="true">
          <div className="relative w-7 sm:w-9 aspect-[11/17] drop-shadow-md">
            <CardBack className="absolute inset-0 translate-x-[3px] -translate-y-[3px] opacity-60" />
            <CardBack className="absolute inset-0 translate-x-[1.5px] -translate-y-[1.5px] opacity-80" />
            <CardBack className="absolute inset-0" />
          </div>
        </div>

        {/* Cartas del oponente boca abajo, en abanico (no conocemos sus cartas,
            solo cuántas le quedan). Alto fijo: cuando se queda sin cartas la fila
            no colapsa y nada de la mesa se mueve. */}
        <div className={styles.opponentHand}>
          {[...Array(oppCardsLeft)].map((_, i) => {
            const mid = (oppCardsLeft - 1) / 2
            return (
              <div
                // Abanico invertido (es la mano del rival vista desde enfrente):
                // pivote arriba → juntas arriba, separadas abajo.
                key={i}
                style={{
                  transform: `rotate(${(mid - i) * 8}deg) translateY(${Math.abs(i - mid) * -4}px)`,
                  transformOrigin: '50% -30%',
                }}
              >
                <CardBack className={styles.back} />
              </div>
            )
          })}
        </div>

        {/* Historial de rondas: 3 ranuras SIEMPRE reservadas (aunque estén vacías),
            así la fila nunca se re-centra y cada carta cae en un lugar fijo y se
            queda ahí (mesa real). Se centra en el espacio entre el abanico del
            rival y la mano (que ya no se superpone: tiene su propia fila). */}
        <div className={styles.rounds}>
          {[1, 2, 3].map(roundNum => {
            const roundCards = game.played_cards.filter(pc => pc.round === roundNum)
            const myRoundCard = roundCards.find(pc => pc.player_id === currentUserId)
            const opponentRoundCard = roundCards.find(pc => pc.player_id !== currentUserId)
            const roundResult = game.round_results.find(r => r.round === roundNum)
            // Carta del envido revelada que "cae" en esta ronda (como jugada normal)
            const revealCard = revealByRound.get(roundNum)

            // La carta ganadora va encima; en parda (empate) van parejas a la misma altura
            const isTie = roundResult ? roundResult.winner_id === null : false
            const myCardOnTop = roundResult
              ? roundResult.winner_id === currentUserId
              : false

            let oppCardCls: string
            let myCardCls: string
            // Tu carta SIEMPRE va abajo-derecha; la del rival SIEMPRE arriba-izquierda.
            // La ganadora queda encima (z-10). Así se distingue quién ganó la ronda.
            if (isTie) {
              oppCardCls = 'top-1 left-0 sm:top-2 z-0'
              myCardCls = 'top-1 left-3 sm:top-2 sm:left-4 z-0'
            } else if (myCardOnTop) {
              oppCardCls = 'top-0 left-0 z-0'
              myCardCls = 'top-6 left-3 sm:top-7 sm:left-4 z-10'
            } else {
              oppCardCls = 'top-0 left-0 z-10'
              myCardCls = 'top-6 left-3 sm:top-7 sm:left-4 z-0'
            }

            return (
              <div key={roundNum} className="flex flex-col items-center">
                <div className={styles.roundSlot}>
                  {opponentRoundCard && (
                    <PlayingCard
                      card={opponentRoundCard.card}
                      flip
                      // La sombra va inline (box-shadow) y no como filtro drop-shadow:
                      // el filtro es caro en celulares y hacía perder cuadros del flip.
                      style={{ '--fromY': '-50px', boxShadow: '0 12px 20px -6px rgba(0,0,0,0.55)' } as React.CSSProperties}
                      className={`absolute ${styles.playedCard} ${oppCardCls}`}
                    />
                  )}
                  {/* Mi carta entra desde la dirección de mi mano (abajo), en su lugar real. */}
                  {myRoundCard && (
                    <PlayingCard
                      card={myRoundCard.card}
                      flip
                      style={{ '--fromY': '70px', boxShadow: '0 12px 20px -6px rgba(0,0,0,0.55)' } as React.CSSProperties}
                      className={`absolute ${styles.playedCard} ${myCardCls}`}
                    />
                  )}
                  {/* Carta del envido revelada: entra desde el lado del que la muestra */}
                  {revealCard && (
                    <PlayingCard
                      card={revealCard}
                      flip
                      style={{ '--fromY': revealIsMine ? '70px' : '-50px', boxShadow: '0 12px 20px -6px rgba(0,0,0,0.55)' } as React.CSSProperties}
                      className={`absolute ${styles.playedCard} z-10 ${revealIsMine ? 'top-6 left-3 sm:top-7 sm:left-4' : 'top-0 left-0'}`}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>

        {/* La mano tiene su propia fila, separada de las tres rondas jugadas. */}
        <div className={styles.hand}>
          {myCards.map((card, i) => {
            const mid = (myCards.length - 1) / 2
            return (
              <div
                // Key por identidad de carta: al repartir una mano nueva cambian las
                // cartas → se remontan → se vuelve a disparar el reparto escalonado.
                key={`${card.suit}-${card.value}`}
                className="relative"
                style={{
                  transform: `rotate(${(i - mid) * 7}deg) translateY(${Math.abs(i - mid) * 7}px)`,
                  transformOrigin: '50% 135%',
                  zIndex: i + 1,
                }}
              >
                <PlayingCard
                  card={card}
                  interactive
                  deal
                  // Origen aproximado en el mazo (arriba-derecha): la carta de la
                  // izquierda viaja más a la derecha para converger hacia el mazo.
                  style={{
                    animationDelay: `${i * 110}ms`,
                    ...DEAL_ORIGINS[Math.min(i, DEAL_ORIGINS.length - 1)],
                  } as React.CSSProperties}
                  onClick={() => playCard(card)}
                  disabled={!isMyTurn || loading || !!myPlayedCard || hasPendingEnvido || hasPendingTruco || isDeclaring}
                  className={styles.handCard}
                />
              </div>
            )
          })}
        </div>
        <div className={`${styles.seat} ${styles.mySeat}`}>
          <SeatAvatar imageUrl={myAvatarUrl} name={myUsername} active={meActive} frame={myFrame} medal={myMedal} />
          <span className={styles.seatName}>{myUsername}</span>
        </div>
      </div>

      {/* Estado y reloj debajo de la mano, con espacio reservado para los cantos. */}
      <div className={styles.turn}>
        <div
          role="status"
          className={`${styles.turnLabel} ${meActive ? styles.turnActive : ''}`}
        >
          {game.awaiting_deal ? 'Fin de la mano…' :
           hasPendingEnvido ? `Te cantaron ${ENVIDO_LABEL[game.envido_state.status] ?? 'envido'} — respondé` :
           hasPendingTruco ? `Te cantaron ${TRUCO_LABEL[game.truco_state.status] ?? 'truco'} — respondé` :
           isDeclaring ? (myDeclareTurn ? 'Tu turno — decí tu tanto' : `Turno de ${opponentUsername}`) :
           isMyTurn ? 'Tu turno' : `Turno de ${opponentUsername}`}
          {!game.awaiting_deal && secondsLeft != null && (
            <span className={`ml-2 tabular ${secondsLeft <= 5 ? 'text-negative font-bold' : 'opacity-80'}`}>
              ⏱ {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Botones de acción (z-30: siempre por encima de la mesa, que asoma detrás).
          Alto FIJO (el del caso más alto: responder truco + envido va primero),
          con el contenido anclado abajo: aparezcan los botones que aparezcan, la
          mesa no cambia de tamaño ni se mueve nada. */}
      <div className={styles.actions}>
        {/* Responder envido */}
        {hasPendingEnvido && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <MesaButton tone="positive" onClick={() => respondEnvido(true)} disabled={loading}>Quiero</MesaButton>
              <MesaButton tone="danger" onClick={() => respondEnvido(false)} disabled={loading}>No quiero</MesaButton>
            </div>
            {/* Escalar el envido */}
            <div className="flex gap-2">
              {game.envido_state.status === 'envido' &&
                (game.envido_state.chain?.filter(c => c === 'envido').length ?? 0) < 2 && (
                <MesaButton onClick={() => singEnvido('envido')} disabled={loading}>Envido</MesaButton>
              )}
              {game.envido_state.status === 'envido' && (
                <MesaButton onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</MesaButton>
              )}
              {game.envido_state.status !== 'falta_envido' && (
                <MesaButton onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</MesaButton>
              )}
            </div>
          </div>
        )}

        {/* Diálogo de tantos: la mano (Tengo/Mazo) o el pie (Son buenas/Tengo/Mazo) */}
        {myDeclareTurn && (
          <div className="flex gap-2">
            {manoDeclared != null && (
              <MesaButton onClick={() => envidoSay('son_buenas')} disabled={loading}>Son buenas</MesaButton>
            )}
            <MesaButton tone="gold" onClick={() => envidoSay('tengo')} disabled={loading}>Tengo {myEnvido}</MesaButton>
            <MesaButton tone="ghost" onClick={() => envidoSay('mazo')} disabled={loading}>Ir al mazo</MesaButton>
          </div>
        )}

        {isMyTurn && !isDeclaring && !hasPendingEnvido && !hasPendingTruco && canSingEnvido && (
          <div className="flex gap-2">
            <MesaButton onClick={() => singEnvido('envido')} disabled={loading}>Envido</MesaButton>
            <MesaButton onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</MesaButton>
            <MesaButton onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</MesaButton>
          </div>
        )}

        {/* Responder truco */}
        {hasPendingTruco && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <MesaButton tone="positive" onClick={() => respondTruco(true)} disabled={loading}>Quiero</MesaButton>
              {game.truco_state.status !== 'vale_cuatro' && (
                <MesaButton tone="gold" onClick={() => singTruco(game.truco_state.status === 'truco' ? 'retruco' : 'vale_cuatro')} disabled={loading}>
                  {game.truco_state.status === 'truco' ? 'Retruco' : 'Vale Cuatro'}
                </MesaButton>
              )}
              <MesaButton tone="danger" onClick={() => respondTruco(false)} disabled={loading}>No quiero</MesaButton>
            </div>
            {/* El envido va primero: se puede cantar envido en respuesta al truco */}
            {canSingEnvido && (
              <>
                <p className="text-[11px] leading-none text-center text-cream/60">…o el envido va primero:</p>
                <div className="flex gap-2">
                  <MesaButton onClick={() => singEnvido('envido')} disabled={loading}>Envido</MesaButton>
                  <MesaButton onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</MesaButton>
                  <MesaButton onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</MesaButton>
                </div>
              </>
            )}
          </div>
        )}

        {/* Truco + Irse al mazo comparten fila para ahorrar alto; si no se puede
            cantar truco, Irse al mazo queda solo. */}
        {isMyTurn && !isDeclaring && !hasPendingEnvido && !hasPendingTruco && (
          <div className="flex gap-2">
            {canSingTruco && (
              <MesaButton tone="gold" className="h-11 text-base" onClick={() => singTruco(
                game.truco_state.status === 'none' ? 'truco' :
                game.truco_state.value === 2 ? 'retruco' : 'vale_cuatro'
              )} disabled={loading}>
                {game.truco_state.status === 'none' ? 'Truco' :
                  game.truco_state.value === 2 ? 'Retruco' : 'Vale Cuatro'}
              </MesaButton>
            )}
            <MesaButton tone="ghost" className={canSingTruco ? 'h-11' : 'h-10'} onClick={irseAlMazo} disabled={loading}>
              Ir al mazo
            </MesaButton>
          </div>
        )}

        {/* Abandonar la partida (derrota) */}
        <button onClick={forfeit} disabled={loading}
          className="self-center -my-1 py-1.5 px-3 inline-flex items-center text-xs text-subtle hover:text-negative transition-colors disabled:opacity-50">
          Abandonar partida
        </button>
      </div>
      </div>
    </main>
  )
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a7 7 0 0 1 7-7h2a7 7 0 0 1 0 14H8l-3.5 2.5.5-3.7A7 7 0 0 1 4 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoundOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9a3.5 3.5 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12v4m-3 4h6m-5 0 .5-4m4.5 4-.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 21V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 5h11l-2 3.5L17 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
