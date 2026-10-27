'use client'

import type { Card } from '@/lib/truco'
import type { PlayedCard, RoundResult } from '@/lib/types'
import PlayingCard from './PlayingCard'
import CardBack from './CardBack'
import { TableCard, useCardFlight } from './CardMotion'
import { SeatAvatar, TableAccessory, MesaButton, MesaAnnouncement, MesaHeader, MesaTurn, MesaToolbar, MesaDeck, DEAL_ORIGINS, type Announce } from './MesaUI'
import { SalonBackground, SalonTable } from './SalonScene'
import { getSalonTheme } from '@/lib/salones'
import styles from './salon.module.css'
import { MatchChatBubble } from './MatchChat'
import type { MatchChatMessage } from './useMatchChat'

const ENVIDO_LABEL: Record<string, string> = { envido: 'envido', real_envido: 'real envido', falta_envido: 'falta envido' }
const TRUCO_LABEL: Record<string, string> = { truco: 'truco', retruco: 'retruco', vale_cuatro: 'vale cuatro' }

export interface GameTableProps {
  game: { status: string; hand_number: number; round_number: number; target_score: number; bet: number; awaiting_deal: boolean;
    played_cards: PlayedCard[]; round_results: RoundResult[]; envido_state: { status: string; chain?: string[] }; truco_state: { status: string; value: number } }
  currentUserId: string; opponentId: string; myUsername: string; opponentUsername: string
  myScore: number; opponentScore: number; isMano: boolean; isMyTurn: boolean; meActive: boolean
  salonSlug: string; campaignRivalSlug?: string | null
  myAvatarUrl?: string | null; opponentAvatarUrl?: string | null
  myFrame?: string | null; opponentFrame?: string | null; myMedal?: string | null; opponentMedal?: string | null
  myAccessory?: string | null; opponentAccessory?: string | null
  myCards: Card[]; oppCardsLeft: number; revealByRound: Map<number, Card>; revealIsMine: boolean
  cardFlight: ReturnType<typeof useCardFlight>; initialCardKeys: ReadonlySet<string>; cardsDisabled: boolean
  loading: boolean; actionError: string; dismissError: () => void; secondsLeft: number | null
  muted: boolean; toggleMute: () => void; emoteTray: boolean; toggleEmotes: () => void
  chatBubbles?: MatchChatMessage[]
  chatControl?: React.ReactNode; emoteTrayContent?: React.ReactNode; myEmote: string | null; oppEmote: string | null
  announce: Announce | null; hasPendingEnvido: boolean; hasPendingTruco: boolean; isDeclaring: boolean
  myDeclareTurn: boolean; manoDeclared?: number | null; myEnvido: number; canSingEnvido: boolean; canSingTruco: boolean
  playCard: (card: Card) => Promise<void>; singEnvido: (value: 'envido' | 'real_envido' | 'falta_envido') => void
  respondEnvido: (accept: boolean) => void; singTruco: (value: 'truco' | 'retruco' | 'vale_cuatro') => void
  respondTruco: (accept: boolean) => void; envidoSay: (value: 'tengo' | 'son_buenas' | 'mazo') => void
  irseAlMazo: () => void; onLeave: () => void; leaveLabel?: string
}

/** Misma mesa online y offline: solo muestra datos y envía acciones al controlador. */
export default function GameTable({
  game, currentUserId, opponentId, myUsername, opponentUsername, myScore, opponentScore, isMano, isMyTurn, meActive, salonSlug, campaignRivalSlug, myAvatarUrl, opponentAvatarUrl, myFrame, opponentFrame, myMedal, opponentMedal, myAccessory, opponentAccessory, myCards, oppCardsLeft, revealByRound, revealIsMine, cardFlight, initialCardKeys, cardsDisabled, loading, actionError, dismissError, secondsLeft, muted, toggleMute, emoteTray, toggleEmotes, chatBubbles = [], chatControl, emoteTrayContent, myEmote, oppEmote, announce, hasPendingEnvido, hasPendingTruco, isDeclaring, myDeclareTurn, manoDeclared, myEnvido, canSingEnvido, canSingTruco, playCard, singEnvido, respondEnvido, singTruco, respondTruco, envidoSay, irseAlMazo, onLeave, leaveLabel = 'Abandonar partida'
}: GameTableProps) {
  const handClosed = game.awaiting_deal || game.status === 'finished'
  return (
    <main className={`${styles.game} ${getSalonTheme(salonSlug).integratedTable ? styles.reference : ''}`}>
      {!getSalonTheme(salonSlug).integratedTable && <SalonBackground slug={salonSlug} />}
      <div className={styles.shell}>
      {getSalonTheme(salonSlug).integratedTable && <SalonBackground slug={salonSlug} />}
      <MesaHeader salonSlug={salonSlug} left={{ name: `${myUsername} (vos)`, score: myScore }} right={{ name: opponentUsername, score: opponentScore }} target={game.target_score} pot={game.bet} mano={isMano ? 'vos' : 'rival'} />

      {/* Error de la última acción (se autodescarta). Flota sobre la mesa (h-0 +
          absolute) para no empujar el layout: la mesa no cambia de tamaño. */}
      {actionError && (
        <div className="relative z-40 h-0 overflow-visible">
        <div
          role="alert"
          onClick={dismissError}
          className="absolute inset-x-0 top-1 rounded-xl border border-negative/40 bg-negative/60 backdrop-blur p-2 text-center text-sm font-medium text-white shadow-card cursor-pointer animate-fade-up"
        >
          {actionError}
        </div>
        </div>
      )}

      {/* Cada fila reserva su lugar: los cantos y el reparto no mueven la mesa. */}
      <div className={styles.stage} ref={cardFlight.stageRef} data-card-stage>
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

        <MesaToolbar muted={muted} onToggleMute={toggleMute} emoteTray={emoteTray} onToggleEmotes={toggleEmotes} chatControl={chatControl} />
        {emoteTrayContent}

        {/* Burbujas de emote (efímeras) */}
        {chatBubbles.map(message => {
          const mine = message.sender_id === currentUserId
          if (mine ? myEmote : oppEmote) return null
          return <MatchChatBubble key={message.id} message={message} className={`absolute left-2 z-20 ${mine ? 'bottom-2 rounded-bl-sm border-gold/40 bg-gold/15' : 'top-2 rounded-tl-sm'}`} />
        })}
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
          <MesaAnnouncement announce={announce} />
        )}

        {/* Mazo: pila de dorsos de la que "salen" las cartas al repartir. En
            celular va más abajo, bien sobre el paño (arriba quedaba fuera del
            óvalo, que en la mesa achatada ya no llega a esa esquina). */}
        <MesaDeck />

        {/* Cartas del oponente boca abajo, en abanico (no conocemos sus cartas,
            solo cuántas le quedan). Alto fijo: cuando se queda sin cartas la fila
            no colapsa y nada de la mesa se mueve. */}
        <div className={styles.opponentHand} data-card-hand="opponent">
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

            // La carta ganadora va encima; en parda se mantiene el orden visual.
            const myCardOnTop = roundResult
              ? roundResult.winner_id === currentUserId
              : false

            // Posiciones definitivas desde el inicio, incluso en una parda.
            // El resultado solo cambia cuál queda encima, nunca sus coordenadas.
            const oppCardCls = `top-0 left-0 ${myCardOnTop ? 'z-0' : 'z-10'}`
            const myCardCls = `top-6 left-3 ${myCardOnTop ? 'z-10' : 'z-0'}`
            const myMotionKey = `${game.hand_number}:${currentUserId}:${roundNum}`
            const oppMotionKey = `${game.hand_number}:${opponentId}:${roundNum}`

            return (
              <div key={roundNum} className="flex flex-col items-center">
                <div className={styles.roundSlot}>
                  <div data-card-target={`${roundNum}-opponent`} data-card-rank={opponentRoundCard?.card.rank} className={`absolute ${styles.playedCard} ${oppCardCls}`}>
                    {opponentRoundCard && (
                      <TableCard
                        card={opponentRoundCard.card}
                        owner="opponent"
                        motionKey={oppMotionKey}
                        animate={!initialCardKeys.has(oppMotionKey)}
                      />
                    )}
                  </div>
                  {/* Mi carta entra desde la dirección de mi mano (abajo), en su lugar real. */}
                  <div data-card-target={`${roundNum}-me`} className={`absolute ${styles.playedCard} ${myCardCls}`}>
                    {myRoundCard && (
                      <TableCard
                        card={myRoundCard.card}
                        owner="me"
                        motionKey={myMotionKey}
                        animate={!initialCardKeys.has(myMotionKey)}
                      />
                    )}
                  </div>
                  {/* Carta del envido revelada: entra desde el lado del que la muestra */}
                  {revealCard && (
                    <PlayingCard
                      card={revealCard}
                      flip
                      style={{ '--fromY': revealIsMine ? '70px' : '-50px', boxShadow: '0 12px 20px -6px rgba(0,0,0,0.55)' } as React.CSSProperties}
                      className={`absolute ${styles.playedCard} z-10 ${revealIsMine ? 'top-6 left-3' : 'top-0 left-0'}`}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>

        {/* La mano tiene su propia fila, separada de las tres rondas jugadas. */}
        <div className={styles.hand} data-card-hand="me">
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
                  onClick={e => { void cardFlight.play(e.currentTarget, game.round_number, card, () => playCard(card)) }}
                  disabled={cardsDisabled}
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
      <MesaTurn active={meActive} seconds={handClosed ? null : secondsLeft}>
        {game.status === 'finished' ? 'Fin de la partida…' :
         game.awaiting_deal ? 'Fin de la mano…' :
         hasPendingEnvido ? `Te cantaron ${ENVIDO_LABEL[game.envido_state.status] ?? 'envido'} — respondé` :
         hasPendingTruco ? `Te cantaron ${TRUCO_LABEL[game.truco_state.status] ?? 'truco'} — respondé` :
         isDeclaring ? (myDeclareTurn ? 'Tu turno — decí tu tanto' : `Turno de ${opponentUsername}`) :
         isMyTurn ? 'Tu turno' : `Turno de ${opponentUsername}`}
      </MesaTurn>

      {/* Botones de acción (z-30: siempre por encima de la mesa, que asoma detrás).
          Alto FIJO (el del caso más alto: responder truco + envido va primero),
          con el contenido anclado abajo: aparezcan los botones que aparezcan, la
          mesa no cambia de tamaño ni se mueve nada. */}
      <div className={styles.actions} data-game-actions>
        {!handClosed && <>
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

        </>}
        {/* Abandonar la partida (derrota) */}
        <button onClick={onLeave} disabled={loading || handClosed}
          className="self-center -my-1 py-1.5 px-3 inline-flex items-center text-xs text-subtle hover:text-negative transition-colors disabled:opacity-50">
          {leaveLabel}
        </button>
      </div>
      </div>
    </main>
  )
}
