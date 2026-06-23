'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/lib/types'
import type { Card } from '@/lib/truco'
import { Panel, Button, CoinIcon } from '@/components/ui'
import PlayingCard from '@/components/game/PlayingCard'
import CardBack from '@/components/game/CardBack'

interface Props {
  game: Game
  currentUserId: string
  myHand: Card[]
}

type EnvidoType = 'envido' | 'real_envido' | 'falta_envido'

// Etiquetas legibles para los cantos (el estado guarda el snake_case)
const ENVIDO_LABEL: Record<string, string> = {
  envido: 'envido', real_envido: 'real envido', falta_envido: 'falta envido',
}
const TRUCO_LABEL: Record<string, string> = {
  truco: 'truco', retruco: 'retruco', vale_cuatro: 'vale cuatro',
}

// Cartel central de anuncios (cantos / resultados). side define de qué lado sale:
// 'top' = lo hizo el rival (entre sus cartas y el centro), 'bottom' = lo hice yo.
type Announce = {
  side: 'top' | 'bottom'
  eyebrow?: string
  title: string
  titleClass: string
  subtitle?: string
  subtitleClass?: string
}

// Punto de partida de cada carta al repartir, apuntando al mazo (arriba-derecha).
// La de la izquierda (i=0) viaja más lejos para que las tres converjan en el mazo.
const DEAL_ORIGINS: Array<Record<string, string>> = [
  { '--dx': '95px', '--dy': '-110px', '--rot': '14deg' },
  { '--dx': '55px', '--dy': '-120px', '--rot': '9deg' },
  { '--dx': '22px', '--dy': '-110px', '--rot': '5deg' },
]


export default function GameClient({ game: initialGame, currentUserId, myHand: initialMyHand }: Props) {
  const router = useRouter()
  const [game, setGame] = useState<Game>(initialGame)
  const [myHand, setMyHand] = useState<Card[]>(initialMyHand)
  const [loading, setLoading] = useState(false)
  const [opponentOnline, setOpponentOnline] = useState(true)
  const [canClaim, setCanClaim] = useState(false)
  const [actionError, setActionError] = useState('')
  // Cartel central de anuncios (cantos y resultados), sale del lado del que actuó
  const [announce, setAnnounce] = useState<Announce | null>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot del truco_state previo, para detectar el "no quiero" (canto pendiente → mano nueva)
  const prevTrucoRef = useRef<{ status: string; singer: string | null; value: number; hand: number } | null>(null)
  // Momento de la última acción local; el polling de respaldo se pausa un toque
  // después de jugar para no pisar la actualización optimista con datos viejos.
  const lastActionRef = useRef(0)
  const supabase = createClient()

  const isPlayer1 = currentUserId === game.player1_id
  const opponentId = isPlayer1 ? game.player2_id : game.player1_id
  const myCards = myHand
  const myScore = isPlayer1 ? game.player1_score : game.player2_score
  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
  const myUsername = isPlayer1 ? game.player1_username : game.player2_username
  const opponentUsername = isPlayer1 ? game.player2_username : game.player1_username
  const isMyTurn = game.current_turn === currentUserId
  const isMano = game.mano_player === currentUserId

  const currentRoundCards = game.played_cards.filter(pc => pc.round === game.round_number)
  const myPlayedCard = currentRoundCards.find(pc => pc.player_id === currentUserId)

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
  const hasPendingTruco =
    ['truco', 'retruco', 'vale_cuatro'].includes(game.truco_state.status) &&
    game.truco_state.last_singer !== currentUserId

  // Tiempo real: suscripción a cambios de la partida
  // (Requiere que la tabla `games` tenga la replicación realtime habilitada en Supabase)
  useEffect(() => {
    if (game.status === 'finished') return

    const channel = supabase
      .channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => { setGame(payload.new as Game); refetchMyHand() }
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
      if (data) setGame(data as Game)
      await refetchMyHand()
    }, 2500)

    return () => clearInterval(interval)
  }, [game.id, game.status])

  // Presencia: detectar si el rival sigue conectado a la partida
  useEffect(() => {
    if (game.status === 'finished') return

    const channel = supabase.channel(`presence-game-${game.id}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const online = Object.keys(channel.presenceState())
        setOpponentOnline(online.includes(opponentId))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [game.id, game.status, currentUserId, opponentId])

  // Heartbeat de presencia en la DB: lo usa claim_victory para verificar
  // server-side que el rival realmente se fue (no alcanza la presencia del cliente).
  useEffect(() => {
    if (game.status === 'finished') return
    const touch = () => { supabase.rpc('touch_presence', { p_game_id: game.id }) }
    touch()
    const iv = setInterval(touch, 8000)
    return () => clearInterval(iv)
  }, [game.id, game.status])

  // Si el rival se desconecta y no vuelve en 25s, se habilita reclamar la victoria
  const CLAIM_TIMEOUT_MS = 25000
  useEffect(() => {
    if (game.status !== 'playing' || opponentOnline) {
      setCanClaim(false)
      return
    }
    const t = setTimeout(() => setCanClaim(true), CLAIM_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [opponentOnline, game.status])

  useEffect(() => {
    if (game.status === 'finished') {
      const t = setTimeout(() => {
        router.push(`/lobby`)
        router.refresh()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [game.status])

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
      showAnnounce({
        side: mine ? 'bottom' : 'top',
        title: ENVIDO_LABEL[tier] ?? 'envido',
        titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${mine ? myUsername : opponentUsername}`,
      })
      return
    }

    // Resultado
    if ((st === 'accepted' || st === 'rejected') && es.winner_id != null) {
      const responderIsMe = es.last_singer !== currentUserId
      const side: 'top' | 'bottom' = responderIsMe ? 'bottom' : 'top'
      const won = es.winner_id === currentUserId
      const awarded = es.awarded ?? 0
      const eyebrow = ENVIDO_LABEL[tier] ?? 'envido'

      if (st === 'rejected') {
        showAnnounce({ side, eyebrow, title: 'No quiere', titleClass: 'text-cream',
          subtitle: `+${awarded} para ${won ? 'vos' : opponentUsername}`,
          subtitleClass: won ? 'text-positive' : 'text-negative' })
        return
      }

      // Ganó la mano → el pie no revela su puntaje ("son buenas"); el empate lo gana la mano.
      const sonBuenas = es.winner_id === game.mano_player
      const theirs = isPlayer1 ? es.player2_points : es.player1_points
      const mineP = isPlayer1 ? es.player1_points : es.player2_points

      if (sonBuenas) {
        if (won) {
          showAnnounce({ side, eyebrow, title: 'Son buenas', titleClass: 'text-positive',
            subtitle: `+${awarded}`, subtitleClass: 'text-positive/90 font-semibold' })
        } else {
          showAnnounce({ side, eyebrow, title: 'Perdiste', titleClass: 'text-negative',
            subtitle: `${opponentUsername} tiene ${theirs}` })
        }
      } else {
        showAnnounce({ side, eyebrow,
          title: won ? `¡Ganaste! +${awarded}` : `Ganó ${opponentUsername} +${awarded}`,
          titleClass: won ? 'text-positive' : 'text-negative',
          subtitle: (mineP != null && theirs != null) ? `vos ${mineP} — ${theirs} ${opponentUsername}` : undefined,
          subtitleClass: 'text-cream/85 tabular' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.envido_state.status, game.envido_state.last_singer, game.envido_state.winner_id])

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
      showAnnounce({ side: byMe ? 'bottom' : 'top',
        title: TRUCO_LABEL[st] ?? 'truco', titleClass: 'text-gold uppercase tracking-wide',
        subtitle: `lo cantó ${byMe ? 'vos' : opponentUsername}` })
    } else if (st === 'accepted' && prev?.status !== 'accepted') {
      // Quiero: lado del que responde (no es el que cantó)
      const responderIsMe = ts.last_singer !== currentUserId
      showAnnounce({ side: responderIsMe ? 'bottom' : 'top',
        eyebrow: 'Truco', title: 'Quiero', titleClass: 'text-cream',
        subtitle: `vale ${ts.value ?? 1}`, subtitleClass: 'text-gold font-semibold' })
    } else if (
      prev && ['truco', 'retruco', 'vale_cuatro'].includes(prev.status) &&
      st === 'none' && game.hand_number > prev.hand
    ) {
      // No quiero: lado del que rechaza; el que cantó gana el valor anterior
      const winnerIsMe = prev.singer === currentUserId
      const val = Math.max(1, prev.value - 1)
      showAnnounce({ side: winnerIsMe ? 'top' : 'bottom',
        eyebrow: TRUCO_LABEL[prev.status] ?? 'truco', title: 'No quiero', titleClass: 'text-cream',
        subtitle: `+${val} para ${winnerIsMe ? 'vos' : opponentUsername}`,
        subtitleClass: winnerIsMe ? 'text-positive' : 'text-negative' })
    }

    prevTrucoRef.current = { status: st, singer: ts.last_singer ?? null, value: ts.value ?? 1, hand: game.hand_number }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.truco_state.status, game.truco_state.last_singer, game.hand_number])


  // Muestra un cartel de anuncio y lo autodescarta (cancelando el anterior).
  function showAnnounce(a: Announce, ms = 3600) {
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setAnnounce(a)
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

  // Jugar una carta: el servidor valida turno/carta, resuelve la ronda y la mano,
  // otorga el truco y reparte/termina. El cliente solo refleja lo que devuelve.
  async function playCard(card: Card) {
    if (!isMyTurn || loading) return
    if (hasPendingEnvido || hasPendingTruco || myPlayedCard) return

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
    // El servidor calcula los puntos (lee las dos manos), reparte, decide el
    // turno siguiente y termina la partida si alguien llega a 30.
    const { data, error } = await supabase.rpc('respond_envido', { p_game_id: game.id, p_accept: accept })
    if (!rpcFailed('respond_envido RPC:', error) && data) setGame(data as Game)
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
    const { data, error } = await supabase.rpc('irse_al_mazo', { p_game_id: game.id })
    if (!rpcFailed('irse_al_mazo RPC:', error) && data) setGame(data as Game)
    await refetchMyHand() // repartió una mano nueva
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

  // Reclamar la victoria: el servidor solo la concede si el rival no dio señales
  // de vida hace más de 30s (heartbeat en game_presence).
  async function claimVictory() {
    if (loading) return
    setLoading(true)
    const { data, error } = await supabase.rpc('claim_victory', { p_game_id: game.id })
    if (!rpcFailed('claim_victory RPC:', error) && data) setGame(data as Game)
    setLoading(false)
  }

  if (game.status === 'finished') {
    // Partida anulada (abandonada por ambos): sin ganador, se reembolsa la apuesta.
    const voided = game.winner_id == null
    const won = game.winner_id === currentUserId
    const net = game.bet / 2
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
          <p className="text-sm text-subtle">Volviendo al lobby…</p>
        </Panel>
      </main>
    )
  }

  return (
    <main className="h-[100dvh] overflow-hidden flex flex-col p-2 sm:p-3 gap-2 max-w-lg md:max-w-2xl mx-auto w-full">
      {/* Marcador */}
      <Panel className="shrink-0 flex items-stretch justify-between gap-2 p-2.5">
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 text-center">
          <span className="text-xs text-muted truncate max-w-[7rem]">{opponentUsername}</span>
          <span className="font-display text-2xl font-extrabold text-cream tabular leading-none">{opponentScore}</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 px-3 border-x border-line">
          <span className="inline-flex items-center gap-1 font-display font-bold text-gold tabular text-sm">
            <CoinIcon size={13} />{game.bet}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-subtle">Pozo</span>
          <span className="text-[10px] text-muted">
            Mano: <b className="text-cream font-semibold">{isMano ? 'Vos' : opponentUsername}</b>
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 text-center">
          <span className="text-xs text-gold truncate max-w-[7rem]">{myUsername} (vos)</span>
          <span className="font-display text-2xl font-extrabold text-cream tabular leading-none">{myScore}</span>
        </div>
      </Panel>

      {/* Indicador de turno */}
      <div className={`shrink-0 text-center py-1.5 rounded-xl text-sm font-semibold transition-colors ${
        isMyTurn || hasPendingEnvido || hasPendingTruco
          ? 'bg-gold text-ink shadow-gold'
          : 'bg-surface2 text-muted border border-line'
      }`}>
        {hasPendingEnvido ? `Te cantaron ${ENVIDO_LABEL[game.envido_state.status] ?? 'envido'} — respondé` :
         hasPendingTruco ? `Te cantaron ${TRUCO_LABEL[game.truco_state.status] ?? 'truco'} — respondé` :
         isMyTurn ? 'Tu turno' : `Turno de ${opponentUsername}`}
      </div>

      {/* Error de la última acción (se autodescarta) */}
      {actionError && (
        <div
          role="alert"
          onClick={() => setActionError('')}
          className="shrink-0 rounded-xl border border-negative/40 bg-negative/12 p-2 text-center text-sm font-medium text-[#F0B3A4] cursor-pointer animate-fade-up"
        >
          {actionError}
        </div>
      )}

      {/* Rival desconectado */}
      {!opponentOnline && (
        <div className="shrink-0 rounded-xl border border-negative/40 bg-negative/12 p-2 text-center flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-[#F0B3A4]">
            {opponentUsername} parece desconectado…
          </p>
          {canClaim ? (
            <Button size="sm" onClick={claimVictory} disabled={loading}>
              Reclamar victoria
            </Button>
          ) : (
            <p className="text-xs text-[#F0B3A4]/80">Esperando a que vuelva…</p>
          )}
        </div>
      )}

      {/* Mesa de juego (paño) */}
      <div
        className="relative flex-1 min-h-0 rounded-2xl border border-line bg-surface2 shadow-card p-2 sm:p-3 flex flex-col justify-between overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(120% 90% at 50% 0%, rgba(201,162,75,0.08), transparent 60%)' }}
      >
        {/* Cartel de anuncio (cantos / resultados): sale del lado del que actuó */}
        {announce && (
          <div className={`absolute inset-x-0 z-30 px-3 -translate-y-1/2 pointer-events-none ${announce.side === 'top' ? 'top-[30%]' : 'top-[70%]'}`}>
            <div
              className="mx-auto max-w-[16rem] rounded-2xl border border-white/10 bg-black/65 backdrop-blur-md px-5 py-3 text-center shadow-lift animate-announce-in"
              style={{ '--enterY': announce.side === 'top' ? '-22px' : '22px' } as React.CSSProperties}
            >
              {announce.eyebrow && (
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold">{announce.eyebrow}</div>
              )}
              <div className={`font-display text-xl font-extrabold mt-1 ${announce.titleClass}`}>{announce.title}</div>
              {announce.subtitle && (
                <div className={`text-sm mt-1 ${announce.subtitleClass ?? 'text-cream/85'}`}>{announce.subtitle}</div>
              )}
            </div>
          </div>
        )}

        {/* Mazo: pila de dorsos de la que "salen" las cartas al repartir */}
        <div className="pointer-events-none absolute top-2 right-2 z-20" aria-hidden="true">
          <div className="relative w-7 sm:w-9 aspect-[5/7] drop-shadow-md">
            <CardBack className="absolute inset-0 translate-x-[3px] -translate-y-[3px] opacity-60" />
            <CardBack className="absolute inset-0 translate-x-[1.5px] -translate-y-[1.5px] opacity-80" />
            <CardBack className="absolute inset-0" />
          </div>
        </div>

        {/* Cartas del oponente boca abajo (no conocemos sus cartas, solo cuántas
            le quedan: 3 menos las que ya jugó en esta mano) */}
        <div className="flex justify-center gap-2">
          {[...Array(Math.max(0, 3 - game.played_cards.filter(pc => pc.player_id === opponentId).length))].map((_, i) => (
            <CardBack key={i} className="w-9 sm:w-12 aspect-[5/7]" />
          ))}
        </div>

        {/* Historial de rondas */}
        <div className="flex justify-center gap-3 sm:gap-8 items-center py-1">
          {[1, 2, 3].map(roundNum => {
            const roundCards = game.played_cards.filter(pc => pc.round === roundNum)
            const myRoundCard = roundCards.find(pc => pc.player_id === currentUserId)
            const opponentRoundCard = roundCards.find(pc => pc.player_id !== currentUserId)
            const roundResult = game.round_results.find(r => r.round === roundNum)
            const iCurrent = roundNum === game.round_number

            if (roundNum > game.round_number && roundCards.length === 0) return null

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
              myCardCls = 'top-3 left-3 sm:top-5 sm:left-4 z-10'
            } else {
              oppCardCls = 'top-0 left-0 z-10'
              myCardCls = 'top-3 left-3 sm:top-5 sm:left-4 z-0'
            }

            return (
              <div key={roundNum} className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-subtle">Ronda {roundNum}</span>
                <div className="relative w-16 h-24 sm:w-24 sm:h-36">
                  {opponentRoundCard && (
                    <PlayingCard
                      card={opponentRoundCard.card}
                      flip
                      style={{ '--fromY': '-50px' } as React.CSSProperties}
                      className={`absolute w-12 sm:w-20 ${oppCardCls}`}
                    />
                  )}
                  {/* Mi carta entra desde la dirección de mi mano (abajo), en su lugar real. */}
                  {myRoundCard && (
                    <PlayingCard
                      card={myRoundCard.card}
                      flip
                      style={{ '--fromY': '70px' } as React.CSSProperties}
                      className={`absolute w-12 sm:w-20 ${myCardCls}`}
                    />
                  )}
                  {/* Placeholders ronda actual */}
                  {iCurrent && !opponentRoundCard && (
                    <div className="absolute top-0 left-0 w-12 sm:w-20 aspect-[5/7] border border-dashed border-line rounded-xl" />
                  )}
                  {iCurrent && !myRoundCard && (
                    <div className="absolute top-3 left-3 sm:top-5 sm:left-4 w-12 sm:w-20 aspect-[5/7] border border-dashed border-gold/40 rounded-xl" />
                  )}
                </div>
              </div>
            )
          })}

          {game.played_cards.length === 0 && (
            <p className="text-sm text-subtle">Jugá una carta para empezar</p>
          )}
        </div>

        {/* Mis cartas */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {myCards.map((card, i) => (
            <PlayingCard
              // Key por identidad de carta: al repartir una mano nueva cambian las
              // cartas → se remontan → se vuelve a disparar el reparto escalonado.
              key={`${card.suit}-${card.value}`}
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
              disabled={!isMyTurn || loading || !!myPlayedCard || hasPendingEnvido || hasPendingTruco}
              className="w-16 sm:w-20"
            />
          ))}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="shrink-0 flex flex-col gap-1.5">
        {/* Responder envido */}
        {hasPendingEnvido && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-center text-muted">
              Se juegan {game.envido_state.value} pts — los gana quien tenga más envido
            </p>
            <div className="flex gap-2">
              <Button variant="positive" size="sm" fullWidth onClick={() => respondEnvido(true)} disabled={loading}>Quiero</Button>
              <Button variant="danger" size="sm" fullWidth onClick={() => respondEnvido(false)} disabled={loading}>No quiero</Button>
            </div>
            {/* Escalar el envido */}
            <div className="flex gap-2">
              {game.envido_state.status === 'envido' && (
                <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</Button>
              )}
              {game.envido_state.status !== 'falta_envido' && (
                <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</Button>
              )}
            </div>
          </div>
        )}

        {isMyTurn && !hasPendingEnvido && !hasPendingTruco && canSingEnvido && (
          <div className="flex gap-2">
            <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('envido')} disabled={loading}>Envido</Button>
            <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</Button>
            <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</Button>
          </div>
        )}

        {/* Responder truco */}
        {hasPendingTruco && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="positive" size="sm" fullWidth onClick={() => respondTruco(true)} disabled={loading}>Quiero</Button>
              {game.truco_state.status !== 'vale_cuatro' && (
                <Button variant="secondary" size="sm" fullWidth onClick={() => singTruco(game.truco_state.status === 'truco' ? 'retruco' : 'vale_cuatro')} disabled={loading}>
                  {game.truco_state.status === 'truco' ? 'Retruco' : 'Vale Cuatro'}
                </Button>
              )}
              <Button variant="danger" size="sm" fullWidth onClick={() => respondTruco(false)} disabled={loading}>No quiero</Button>
            </div>
            {/* El envido va primero: se puede cantar envido en respuesta al truco */}
            {canSingEnvido && (
              <>
                <p className="text-xs text-center text-muted">…o el envido va primero:</p>
                <div className="flex gap-2">
                  <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('envido')} disabled={loading}>Envido</Button>
                  <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('real_envido')} disabled={loading}>Real Envido</Button>
                  <Button variant="info" size="sm" fullWidth onClick={() => singEnvido('falta_envido')} disabled={loading}>Falta Envido</Button>
                </div>
              </>
            )}
          </div>
        )}

        {isMyTurn && !hasPendingTruco && !hasPendingEnvido && canSingTruco && (
          <Button onClick={() => singTruco(
            game.truco_state.status === 'none' ? 'truco' :
            game.truco_state.value === 2 ? 'retruco' : 'vale_cuatro'
          )} disabled={loading}>
            {game.truco_state.status === 'none' ? 'Truco' :
              game.truco_state.value === 2 ? 'Retruco' : 'Vale Cuatro'}
          </Button>
        )}

        {/* Irse al mazo */}
        {isMyTurn && !hasPendingEnvido && !hasPendingTruco && (
          <Button variant="ghost" size="sm" onClick={irseAlMazo} disabled={loading}>
            Irse al mazo
          </Button>
        )}

        {/* Abandonar la partida (derrota) */}
        <button onClick={forfeit} disabled={loading}
          className="text-xs text-subtle hover:text-negative transition-colors disabled:opacity-50">
          Abandonar partida
        </button>
      </div>
    </main>
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
