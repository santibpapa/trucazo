'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/lib/types'
import { createDeck, getCardImage, getEnvidoPoints, type Card } from '@/lib/truco'
import { Button, CoinIcon, Modal } from '@/components/ui'
import GameTable from '@/components/game/GameTable'
import { EmoteTray } from '@/components/game/MesaUI'
import { useGameAnnouncements } from '@/components/game/useGameAnnouncements'
import MatchChat from '@/components/game/MatchChat'
import type { MatchChatMessage } from '@/components/game/useMatchChat'
import { EMOTES } from '@/lib/emotes'
import { useCardFlight } from '@/components/game/CardMotion'
import { playSound, isMuted, setMuted } from '@/lib/sounds'
import { fraseDelBot, type MomentoFrase } from '@/lib/botFrases'
import { botThinkMs } from '@/lib/bot-presentation'
import { track } from '@vercel/analytics'
import { trackFirstParty } from '@/lib/analytics/client'

const FinishScreen = dynamic(() => import('@/components/game/FinishScreen'))
const CampaignLives = dynamic(() => import('@/components/CampaignLives'))
const ObjectiveProgressDelta = dynamic(() => import('@/components/objectives/ObjectiveProgressDelta'))

interface Props {
  game: Game
  serverNow: number
  currentUserId: string
  isGuest?: boolean
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
  tournamentId?: string | null
}

type EnvidoType = 'envido' | 'real_envido' | 'falta_envido'

function ResultObjectives({ gameId, isGuest }: { gameId: string; isGuest: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="secondary" size="sm" fullWidth onClick={() => setOpen(true)}>Objetivos de esta partida</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Objetivos de esta partida" showCloseButton
      panelClassName="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <ObjectiveProgressDelta gameId={gameId} isGuest={isGuest} />
    </Modal>
  </>
}

// Emotes / chat rápido (efímeros, por broadcast)

const EMOTE_COOLDOWN_MS = 3000

export default function GameClient({ game: initialGame, serverNow, currentUserId, isGuest = false, myHand: initialMyHand, campaignRivalSlug, salonSlug = 'clasico', myAvatarUrl, opponentAvatarUrl, myFrame, opponentFrame, myMedal, opponentMedal, myAccessory, opponentAccessory, opponentIsBot = false, tournamentId = null }: Props) {
  const router = useRouter()
  const [game, setGame] = useState<Game>(initialGame)
  const latestGame = useRef(game)
  latestGame.current = game
  const cardFlight = useCardFlight(game.hand_number)
  const initialCardKeys = useRef(new Set(initialGame.played_cards.map(pc => `${initialGame.hand_number}:${pc.player_id}:${pc.round}`)))
  const [myHand, setMyHand] = useState<Card[]>(initialMyHand)
  const [actionLoading, setLoading] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [recoveryRevision, setRecoveryRevision] = useState(0)
  const loading = actionLoading || recovering
  // Segundos que le quedan al jugador de turno (reloj por jugada)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  // Saludo de gracias al volver de dejar una reseña
  const [showThanks, setShowThanks] = useState(false)
  // El timeout por jugada se dispara una sola vez por turno (clave = turn_started_at)
  const timeoutFiredRef = useRef<string | null>(null)
  const serverClockRef = useRef({ serverNow, startedAt: performance.now() })
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
  const [chatBubbles, setChatBubbles] = useState<MatchChatMessage[]>([])
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
  // no llegó a usar, al cerrar la mano o la partida.
  const envidoReveal = game.awaiting_deal || game.status === 'finished' ? game.envido_reveal : null
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
  const isMyTurn = game.status === 'playing' && !game.awaiting_deal && game.current_turn === currentUserId
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
  const { announce, showAnnounce } = useGameAnnouncements({ game, currentUserId, myUsername, opponentUsername, isPlayer1, soundReadyRef, botHabla })

  // Las tres cartas visibles conservan prioridad. El resto del mazo se prepara
  // después de cargar la pantalla, de a dos y con prioridad baja.
  useEffect(() => {
    const deck = createDeck()
    let stopped = false
    let index = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const next = () => {
      if (stopped || index >= deck.length) return
      const img = new Image()
      img.decoding = 'async'
      img.fetchPriority = 'low'
      img.onload = img.onerror = next
      img.src = getCardImage(deck[index++])
    }
    const start = () => { timer = setTimeout(() => { next(); next() }, 1500) }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('load', start) }
  }, [])

  // Al volver de dejar una reseña (?gracias=1), mostramos un saludo y limpiamos la URL.
  useEffect(() => {
    const local = window.location.hash.startsWith('#/game/')
    if (new URLSearchParams(local ? window.location.hash.split('?')[1] : window.location.search).get('gracias') === '1') {
      setShowThanks(true)
      window.history.replaceState(null, '', local ? window.location.hash.split('?')[0] : window.location.pathname)
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
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void refreshGame()
      })

    const recover = () => {
      if (document.visibilityState === 'visible') void refreshGame()
    }
    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [game.id, game.status])

  // Al volver a la pantalla o recuperar conexión, leer el estado confirmado y
  // sólo la mano propia. Nunca repetir la última acción para "recuperarla".
  useEffect(() => {
    let disposed = false
    let pending = false
    const recover = async () => {
      if (pending || document.visibilityState !== 'visible' || !navigator.onLine) return
      pending = true
      setRecovering(true)
      try {
        const [snapshot, hand] = await Promise.all([
          supabase.from('games').select('*').eq('id', game.id).single(),
          supabase.from('game_hands').select('cards').eq('game_id', game.id).eq('player_id', currentUserId).single(),
        ])
        if (disposed || (await supabase.auth.getSession()).data.session?.user.id !== currentUserId) return
        if (snapshot.error || hand.error) { setActionError('No pudimos actualizar la mesa. Reintentamos al recuperar conexión.'); return }
        if (snapshot.data) applyServerGame(snapshot.data as Game)
        if (hand.data) setMyHand((hand.data.cards as Card[]) ?? [])
        setRecoveryRevision(value => value + 1)
      } finally {
        pending = false
        if (!disposed) setRecovering(false)
      }
    }
    window.addEventListener('focus', recover)
    window.addEventListener('online', recover)
    window.addEventListener('mobile:refresh', recover)
    document.addEventListener('visibilitychange', recover)
    return () => {
      disposed = true
      window.removeEventListener('focus', recover)
      window.removeEventListener('online', recover)
      window.removeEventListener('mobile:refresh', recover)
      document.removeEventListener('visibilitychange', recover)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, currentUserId])

  // Respaldo por polling, por si el realtime no entrega los cambios.
  // Se saltea si hubo una acción local hace muy poco (para no revertir lo optimista).
  useEffect(() => {
    if (game.status === 'finished') return

    const interval = setInterval(async () => {
      if (Date.now() - lastActionRef.current < 2000) return
      await refreshGame()
    }, 2500)

    return () => clearInterval(interval)
  }, [game.id, game.status])

  // Estimamos la hora del servidor desde el render y un reloj monotónico local.
  // Recargar o recibir tarde un turno no vuelve a regalar el límite completo.
  // Postgres sigue validando el plazo real: este reloj sólo decide cuándo pedirlo.
  useEffect(() => {
    if (game.status !== 'playing' || game.awaiting_deal || !game.turn_started_at) {
      setSecondsLeft(null)
      return
    }
    const limit = game.time_limit
    let disposed = false
    const tick = () => {
      const clock = serverClockRef.current
      const now = clock.serverNow + performance.now() - clock.startedAt
      const elapsed = (now - Date.parse(game.turn_started_at)) / 1000
      const left = Math.max(0, Math.min(limit, Math.ceil(limit - elapsed)))
      setSecondsLeft(left)
      if (left <= 0 && timeoutFiredRef.current !== game.turn_started_at) {
        timeoutFiredRef.current = game.turn_started_at
        void (async () => {
          let resolved = false
          try {
            const { data, error } = await supabase.rpc('timeout_mazo', { p_game_id: game.id })
              .abortSignal(AbortSignal.timeout(8000))
            if (disposed) return
            if (!error && data) {
              applyServerGame(data as Game)
              resolved = true
            }
          } catch {
            // También reintentamos si el transporte lanza una excepción.
          } finally {
            // Rechazo temprano, error o falta de respuesta: liberar el próximo intento.
            if (!disposed && !resolved) timeoutFiredRef.current = null
          }
        })()
      }
    }
    tick()
    const iv = setInterval(tick, 500)
    return () => {
      disposed = true
      clearInterval(iv)
      if (timeoutFiredRef.current === game.turn_started_at) timeoutFiredRef.current = null
    }
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
    const touch = async () => { await supabase.rpc('touch_presence', { p_game_id: game.id }) }
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
    try {
      const { data, error } = await supabase.rpc('advance_hand', { p_game_id: game.id })
        .abortSignal(AbortSignal.timeout(8000))
      if (rpcFailed('advance_hand RPC:', error) || !data) return false
      applyServerGame(data as Game)
      await refetchMyHand()
      return true
    } catch (error) {
      rpcFailed('advance_hand RPC:', error instanceof Error ? error : { message: 'No se pudo repartir. Reintentando…' })
      return false
    }
  }

  // Delay para apreciar el cierre de la mano: cuando queda awaiting_deal, se
  // muestra la mesa resuelta y, tras un momento, se reparte la próxima. Ambos
  // clientes lo agendan; advance_hand es idempotente, así que no duplica.
  useEffect(() => {
    if (game.status !== 'playing' || !game.awaiting_deal) return
    // Si hay cartas de envido para mostrar, damos un poco más de tiempo para verlas.
    let disposed = false
    const advance = async () => {
      const done = await advanceHand()
      // El polling puede seguir recibiendo awaiting_deal=true tras un fallo.
      // Ese estado no cambia las dependencias del efecto: hay que reintentarlo.
      if (!done && !disposed) timer = setTimeout(advance, 3000)
    }
    let timer = setTimeout(advance, game.envido_reveal ? 2600 : 1800)
    return () => { disposed = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.awaiting_deal, game.status, game.id, game.hand_number, recoveryRevision])

  // La pantalla de fin ("Ganaste/Perdiste") se muestra con un pequeño delay tras
  // terminar la partida, para alcanzar a ver la última jugada resuelta en la mesa
  // (p. ej. el tanto que cantó el bot en el envido) y no saltar de golpe. Si la
  // partida ya venía terminada al abrir, se muestra al instante.
  const [showFinish, setShowFinish] = useState(game.status === 'finished')
  const finishDelay = game.envido_reveal ? 2600 : 2000
  useEffect(() => {
    if (game.status !== 'finished') { setShowFinish(false); return }
    if (showFinish) return
    const t = setTimeout(() => setShowFinish(true), finishDelay)
    return () => clearTimeout(t)
  }, [game.status, finishDelay, showFinish])

  // Pantalla del juego fija: bloquea el scroll/rebote del body mientras estás
  // en la partida (sobre todo en iOS). Se restaura al salir al lobby. La
  // pantalla de fin NO se bloquea: puede ser más alta que el celular (varias
  // misiones) y necesita scroll para llegar a los botones.
  const finishShown = game.status === 'finished' && showFinish
  useEffect(() => {
    if (finishShown) return
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
  }, [finishShown])

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
    const thinkMs = botThinkMs(game, currentUserId)
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
        applyServerGame(next)
      }
    }, thinkMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurnKey, game.id, recoveryRevision])

  // El banner de error de una acción se autodescarta a los 4s
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(''), 4000)
    return () => clearTimeout(t)
  }, [actionError])

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



  // Loguea y muestra el error de una RPC; devuelve true si hubo error.
  function rpcFailed(label: string, error: { message?: string } | null): boolean {
    if (!error) return false
    if (latestGame.current.status === 'finished' && !['request_rematch RPC:', 'start_campaign_duel RPC:'].includes(label)) return true
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
      .abortSignal(AbortSignal.timeout(8000))
      .single()
    if (data) setMyHand((data.cards as Card[]) ?? [])
  }

  // Releer al conectar/volver: los cambios ocurridos durante el corte no se reproducen.
  async function refreshGame() {
    try {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .abortSignal(AbortSignal.timeout(8000))
        .single()
      if (data) applyServerGame(data as Game)
      await refetchMyHand()
    } catch (error) {
      console.error('refresh game:', error)
    }
  }

  // Realtime, polling y reintentos pueden llegar fuera de orden. Un snapshot
  // anterior no debe revivir una espera de reparto ni una partida terminada.
  function applyServerGame(next: Game) {
    if (next.status === 'finished' && latestGame.current.status !== 'finished') setActionError('')
    setGame(prev => (prev.status === 'finished' && next.status !== 'finished'
      || Date.parse(next.updated_at) < Date.parse(prev.updated_at) ? prev : next))
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
    if (data) applyServerGame(data as Game)
    await refetchMyHand()
    setLoading(false)
  }

  // ---- ENVIDO (resuelto en el servidor) ----
  async function singEnvido(type: EnvidoType) {
    if (loading) return
    if (!isMyTurn && !hasPendingEnvido) return
    setLoading(true)
    setActionError('')
    try {
      lastActionRef.current = Date.now()
      const { data, error } = await supabase.rpc('sing_envido', { p_game_id: game.id, p_type: type }).abortSignal(AbortSignal.timeout(8000))
      if (!rpcFailed('sing_envido RPC:', error) && data) applyServerGame(data as Game)
    } catch (error) {
      rpcFailed('singEnvido RPC:', error instanceof Error ? error : { message: 'No se pudo completar la acción. Volvé a intentar.' })
    } finally {
      setLoading(false)
    }
  }

  async function respondEnvido(accept: boolean) {
    if (loading) return
    setLoading(true)
    setActionError('')
    try {
      lastActionRef.current = Date.now()
      // Burbuja del que responde (como en el chat rápido)
      const bubble = accept ? '¡Quiero!' : '¡No quiero!'
      chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text: bubble } })
      setMyEmote(bubble)
      // Si acepta, el servidor abre el diálogo de tantos (la mano declara primero).
      // Si no, resuelve el "no quiero" como antes.
      const { data, error } = await supabase.rpc('respond_envido', { p_game_id: game.id, p_accept: accept }).abortSignal(AbortSignal.timeout(8000))
      if (!rpcFailed('respond_envido RPC:', error) && data) applyServerGame(data as Game)
    } catch (error) {
      rpcFailed('respondEnvido RPC:', error instanceof Error ? error : { message: 'No se pudo completar la acción. Volvé a intentar.' })
    } finally {
      setLoading(false)
    }
  }

  // Diálogo de tantos (después del "quiero"): 'tengo' revela tu tanto (lo calcula
  // el server de tus cartas), 'son_buenas' cede sin revelar, 'mazo' abandona la mano.
  async function envidoSay(action: 'tengo' | 'son_buenas' | 'mazo') {
    if (loading) return
    setLoading(true)
    setActionError('')
    try {
      lastActionRef.current = Date.now()
      const bubble = action === 'tengo' ? `Tengo ${myEnvido}`
        : action === 'son_buenas' ? 'Son buenas' : 'Me voy al mazo'
      chatChannelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text: bubble } })
      setMyEmote(bubble)
      const { data, error } = await supabase.rpc('envido_say', { p_game_id: game.id, p_action: action }).abortSignal(AbortSignal.timeout(8000))
      if (rpcFailed('envido_say RPC:', error) || !data) return
      applyServerGame(data as Game)
      // La relectura de cartas no debe mantener bloqueados los controles.
      void refetchMyHand().catch(error => { console.error('refetch envido hand:', error) })
    } catch (error) {
      rpcFailed('envidoSay RPC:', error instanceof Error ? error : { message: 'No se pudo completar la acción. Volvé a intentar.' })
    } finally {
      setLoading(false)
    }
  }

  // ---- TRUCO (resuelto en el servidor) ----
  async function singTruco(type: 'truco' | 'retruco' | 'vale_cuatro') {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const { data, error } = await supabase.rpc('sing_truco', { p_game_id: game.id, p_type: type })
    if (!rpcFailed('sing_truco RPC:', error) && data) applyServerGame(data as Game)
    setLoading(false)
  }

  async function respondTruco(accept: boolean) {
    if (loading) return
    setLoading(true)
    lastActionRef.current = Date.now()
    const { data, error } = await supabase.rpc('respond_truco', { p_game_id: game.id, p_accept: accept })
    if (!rpcFailed('respond_truco RPC:', error) && data) applyServerGame(data as Game)
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
    if (!rpcFailed('irse_al_mazo RPC:', error) && data) applyServerGame(data as Game)
    // La próxima mano la reparte el delay (advance_hand) al ver awaiting_deal
    setLoading(false)
  }

  // Abandonar la partida: cuenta como derrota, el rival se lleva el pozo (server-side)
  async function forfeit() {
    if (loading) return
    if (!window.confirm('¿Seguro que querés abandonar? Pierdes la partida y el pozo.')) return
    setLoading(true)
    const { data, error } = await supabase.rpc('forfeit', { p_game_id: game.id })
    if (!rpcFailed('forfeit RPC:', error) && data) applyServerGame(data as Game)
    setLoading(false)
  }

  // Pedir revancha: cuando ambos lo piden, el server crea la nueva partida.
  async function requestRematch() {
    if (loading) return
    setLoading(true)
    const { data, error } = await supabase.rpc('request_rematch', { p_game_id: game.id })
    if (!rpcFailed('request_rematch RPC:', error) && data) applyServerGame(data as Game)
    setLoading(false)
  }

  function goToLobby() {
    router.push('/lobby')
    router.refresh()
  }

  async function playAgainCampaign() {
    if (!game.campaign_rival_id) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('start_campaign_duel', { p_rival_id: game.campaign_rival_id }).abortSignal(AbortSignal.timeout(8000))
      if (error?.message.includes('CAMPAIGN_NO_LIVES')) {
        window.dispatchEvent(new Event('campaign-no-lives'))
        return
      }
      if (!rpcFailed('start_campaign_duel RPC:', error) && data) {
        router.push(`/game/${(data as Game).id}`)
        router.refresh()
      } else {
        setActionError('No se pudo empezar el duelo de nuevo.')
      }
    } catch { setActionError('No se pudo empezar el duelo de nuevo.') }
    finally { setLoading(false) }
  }

  // Mis cartas de la última mano (las que me quedaron + las que jugué), para
  // el abanico de la pantalla de fin. Si no llegaron, van dorsos.
  const lastHandCards: (Card | null)[] = [
    ...myCards,
    ...game.played_cards.filter(pc => pc.player_id === currentUserId).map(pc => pc.card),
  ].slice(0, 3)
  while (lastHandCards.length < 3) lastHandCards.push(null)

  // Modo historia: fin del duelo. El bot no pide revancha ni se mueven monedas
  // del pozo; ofrecemos jugar de nuevo o volver a la galería.
  if (game.status === 'finished' && isCampaign && showFinish) {
    const won = game.winner_id === currentUserId
    return (
      <FinishScreen
        won={won}
        salonSlug={salonSlug}
        hand={lastHandCards}
        title={won ? '¡Ganaste!' : 'Perdiste'}
        subtitle={won
          ? <>Le ganaste a <b className="font-semibold text-cream">{opponentUsername}</b> {myScore} a {opponentScore}</>
          : <><b className="font-semibold text-cream">{opponentUsername}</b> te ganó {opponentScore} a {myScore}</>}
        note={won
          ? 'Mirá el mapa: capaz se abrió algo nuevo.'
          : game.winner_id ? undefined : 'Partida anulada.'}
        me={{ url: myAvatarUrl, name: myUsername, score: myScore, highlight: won }}
        opponent={{ url: campaignRivalSlug ? `/personajes/${campaignRivalSlug}.webp` : opponentAvatarUrl, name: opponentUsername, score: opponentScore, highlight: !won }}
        extra={won && (game.campaign_points_earned > 0 || game.campaign_reward > 0) && (
          // Premios del duelo: puntos de ranking (si ganó algo) y monedas (solo
          // la primera vez que vencés a este rival).
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
      >
        <ResultObjectives gameId={game.id} isGuest={isGuest} />

        {showThanks && (
          <p className="text-xs font-semibold text-gold text-center">¡Gracias por tu reseña! 🌟</p>
        )}
        {actionError && <p className="text-sm text-negative text-center">{actionError}</p>}

        <div className="flex items-center gap-2">
          <CampaignLives />
          <Button variant="primary" size="md" fullWidth onClick={playAgainCampaign} disabled={loading}>
            {won ? 'Jugar de nuevo' : 'Revancha'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={() => router.push('/historia')} disabled={loading}>
            Volver al modo historia
          </Button>
          <Button variant="secondary" size="sm" fullWidth onClick={() => router.push(`/resena?game=${game.id}`)}>
            Dejar reseña
          </Button>
        </div>
      </FinishScreen>
    )
  }

  if (game.status === 'finished' && showFinish && tournamentId) {
    const voided = game.winner_id == null
    const won = game.winner_id === currentUserId
    return (
      <FinishScreen
        won={won}
        salonSlug={salonSlug}
        hand={lastHandCards}
        title={voided ? 'Partida detenida' : won ? '¡Ganaste el cruce!' : 'Terminó el cruce'}
        subtitle={voided ? 'Un administrador revisará esta partida.' : won
          ? <>Le ganaste a <b className="font-semibold text-cream">{opponentUsername}</b> {myScore} a {opponentScore}</>
          : <><b className="font-semibold text-cream">{opponentUsername}</b> te ganó {opponentScore} a {myScore}</>}
        note={voided ? 'Volvé al torneo para seguir las novedades.' : 'Consultá el cuadro para ver la próxima ronda.'}
        me={{ url: myAvatarUrl, name: myUsername, score: myScore, highlight: !voided && won }}
        opponent={{ url: opponentAvatarUrl, name: opponentUsername, score: opponentScore, highlight: !voided && !won }}
      >
        {!voided && <ResultObjectives gameId={game.id} isGuest={isGuest} />}
        <Button variant="primary" size="md" fullWidth
          onClick={() => router.push(`/torneos/${tournamentId}`)}>
          Volver al torneo
        </Button>
      </FinishScreen>
    )
  }

  if (game.status === 'finished' && showFinish) {
    // Partida anulada (abandonada por ambos): sin ganador, se reembolsa la apuesta.
    const voided = game.winner_id == null
    const won = game.winner_id === currentUserId
    const net = game.bet / 2
    const endedByTimeout = (won ? (isPlayer1 ? game.mazo_count_p2 : game.mazo_count_p1)
      : (isPlayer1 ? game.mazo_count_p1 : game.mazo_count_p2)) >= 3
    const endedByForfeit = !voided && !endedByTimeout && Math.max(myScore, opponentScore) < game.target_score
    const myVote = isPlayer1 ? game.rematch_p1 : game.rematch_p2
    const oppVote = isPlayer1 ? game.rematch_p2 : game.rematch_p1
    const rematchCount = (game.rematch_p1 ? 1 : 0) + (game.rematch_p2 ? 1 : 0)
    const someoneWantsRematch = rematchCount > 0
    return (
      <FinishScreen
        won={won}
        salonSlug={salonSlug}
        hand={lastHandCards}
        title={voided ? 'Partida anulada' : won ? '¡Ganaste!' : 'Perdiste'}
        subtitle={voided
          ? 'Los dos abandonaron la mesa.'
          : endedByTimeout
            ? won ? 'Tu rival agotó sus oportunidades de tiempo.' : 'Agotaste tus oportunidades de tiempo.'
          : endedByForfeit
            ? won ? 'Tu rival abandonó la partida.' : 'Abandonaste la partida.'
          : won
            ? <>Le ganaste a <b className="font-semibold text-cream">{opponentUsername}</b> {myScore} a {opponentScore}</>
            : <><b className="font-semibold text-cream">{opponentUsername}</b> te ganó {opponentScore} a {myScore}</>}
        me={{ url: myAvatarUrl, name: myUsername, score: myScore, highlight: !voided && won }}
        opponent={{ url: opponentAvatarUrl, name: opponentUsername, score: opponentScore, highlight: !voided && !won }}
        extra={voided ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-4 py-2 font-display font-bold text-muted">
            <CoinIcon size={18} />
            Apuesta reembolsada
          </div>
        ) : (
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-display text-lg font-bold tabular ${
              won
                ? 'border-positive/40 bg-positive/10 text-positive'
                : 'border-negative/40 bg-negative/10 text-negative'
            }`}
          >
            <CoinIcon size={18} />
            {won ? '+' : '−'}{net.toLocaleString('es-AR')}
          </div>
        )}
      >
        {!voided && <ResultObjectives gameId={game.id} isGuest={isGuest} />}

        {showThanks && (
          <p className="text-xs font-semibold text-gold text-center">¡Gracias por tu reseña! 🌟</p>
        )}
        {actionError && <p className="text-sm text-negative text-center">{actionError}</p>}

        {someoneWantsRematch && (
          <p className="text-sm font-semibold text-gold-600 flex items-center justify-center gap-2">
            {myVote && !oppVote ? 'Esperando a tu rival…'
              : oppVote && !myVote ? `${opponentUsername} quiere revancha`
              : '¡Revancha!'}
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs tabular">{rematchCount}/2</span>
          </p>
        )}
        <Button variant="primary" size="md" fullWidth onClick={requestRematch} disabled={loading || myVote}>
          {myVote ? 'Revancha pedida' : 'Revancha'}
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" fullWidth onClick={goToLobby} disabled={loading}>
            Volver al lobby
          </Button>
          <Button variant="secondary" size="sm" fullWidth onClick={() => router.push(`/resena?game=${game.id}`)}>
            Dejar reseña
          </Button>
        </div>
      </FinishScreen>
    )
  }

  // Dorsos del rival: 3 menos las cartas que ya jugó en esta mano.
  // El abanico del rival descuenta también las cartas que bajó por el envido
  const oppRevealedCount = envidoReveal && !revealIsMine ? envidoReveal.cards.length : 0
  const oppCardsLeft = Math.max(0, 3 - game.played_cards.filter(pc => pc.player_id === opponentId).length - oppRevealedCount)
  return (
    <GameTable
      game={game}
      currentUserId={currentUserId}
      opponentId={opponentId}
      myUsername={myUsername}
      opponentUsername={opponentUsername}
      myScore={myScore}
      opponentScore={opponentScore}
      isMano={isMano}
      isMyTurn={isMyTurn}
      meActive={meActive}
      salonSlug={salonSlug}
      campaignRivalSlug={campaignRivalSlug}
      myAvatarUrl={myAvatarUrl}
      opponentAvatarUrl={opponentAvatarUrl}
      myFrame={myFrame}
      opponentFrame={opponentFrame}
      myMedal={myMedal}
      opponentMedal={opponentMedal}
      myAccessory={myAccessory}
      opponentAccessory={opponentAccessory}
      myCards={myCards}
      oppCardsLeft={oppCardsLeft}
      revealByRound={revealByRound}
      revealIsMine={revealIsMine}
      cardFlight={cardFlight}
      loading={loading}
      actionError={actionError}
      secondsLeft={secondsLeft}
      muted={muted}
      toggleMute={toggleMute}
      emoteTray={emoteTray}
      myEmote={myEmote}
      oppEmote={oppEmote}
      chatBubbles={game.status === 'playing' ? chatBubbles : []}
      announce={announce}
      hasPendingEnvido={hasPendingEnvido}
      hasPendingTruco={hasPendingTruco}
      isDeclaring={isDeclaring}
      myDeclareTurn={myDeclareTurn}
      manoDeclared={manoDeclared}
      myEnvido={myEnvido}
      canSingEnvido={canSingEnvido}
      canSingTruco={canSingTruco}
      playCard={playCard}
      singEnvido={singEnvido}
      respondEnvido={respondEnvido}
      singTruco={singTruco}
      respondTruco={respondTruco}
      envidoSay={envidoSay}
      irseAlMazo={irseAlMazo}
      initialCardKeys={initialCardKeys.current}
      cardsDisabled={!isMyTurn || loading || !!myPlayedCard || hasPendingEnvido || hasPendingTruco || isDeclaring}
      dismissError={() => setActionError('')}
      toggleEmotes={() => setEmoteTray(v => !v)}
      onLeave={forfeit}
      chatControl={process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT === 'true' && game.status === 'playing' && !isCampaign
        ? <MatchChat key={game.id} mode="game" matchId={game.id} userId={currentUserId} isGuest={isGuest} quick={EMOTES} onQuickSend={sendEmote} quickCooldown={emoteCooldown} onBubblesChange={setChatBubbles} /> : undefined}
      emoteTrayContent={emoteTray && !(process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT === 'true' && game.status === 'playing' && !isCampaign)
        ? <EmoteTray onSend={sendEmote} cooldown={emoteCooldown} /> : undefined}
    />
  )
}
