import { useEffect, useRef, useState } from 'react'
import GameTable from '../components/game/GameTable'
import FinishScreen from '../components/game/FinishScreen'
import { EmoteTray } from '../components/game/MesaUI'
import { useCardFlight } from '../components/game/CardMotion'
import { useGameAnnouncements } from '../components/game/useGameAnnouncements'
import { Button, CoinIcon } from '../components/ui'
import { legalActions, type Action } from '../lib/offline-trial/engine'
import { getEnvidoPoints, type Card } from '../lib/truco'
import { fraseDelBot, type MomentoFrase } from '../lib/botFrases'
import { isMuted, setMuted } from '../lib/sounds'
import type { Campaign } from '../lib/offline-campaign/model'

export default function OfflineGame({ campaign, busy, onAction, onLeave, onReplay }: {
  campaign: Campaign; busy: boolean; onAction: (action: Action) => Promise<void>;
  onLeave: () => void; onReplay: (id: string) => Promise<void>
}) {
  const trial = campaign.trial!, g = trial.game, owner = campaign.owner
  const rival = campaign.official.catalog.rivals.find(r => r.id === trial.rival)!
  const profile = campaign.presentation, myUsername = profile?.username ?? 'Vos'
  const cardFlight = useCardFlight(g.hand_number)
  const initialCardKeys = useRef(new Set(g.played_cards.map(pc => `${g.hand_number}:${pc.player_id}:${pc.round}`)))
  const [muted, setMutedState] = useState(isMuted)
  const [emoteTray, setEmoteTray] = useState(false), [cooldown, setCooldown] = useState(false)
  const [myEmote, setMyEmote] = useState<string | null>(null), [oppEmote, setOppEmote] = useState<string | null>(null)
  const usedPhrases = useRef(new Set<string>()), phraseAt = useRef(0), soundReadyRef = useRef(false)
  function botHabla(moment: MomentoFrase) {
    if (Date.now() - phraseAt.current < 5000) return
    const phrase = fraseDelBot(rival.slug, moment, usedPhrases.current)
    if (phrase) { phraseAt.current = Date.now(); setOppEmote(phrase) }
  }
  const { announce } = useGameAnnouncements({ game: g, currentUserId: owner, myUsername,
    opponentUsername: rival.display_name, isPlayer1: true, soundReadyRef, botHabla })
  useEffect(() => { soundReadyRef.current = true }, [])
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
  useEffect(() => {
    if (g.status === 'finished') botHabla(g.winner_id === owner ? 'pierde_partida' : 'gana_partida')
    // El saludo corresponde al cambio de resultado, como en la mesa online.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.status])
  useEffect(() => {
    if (!cooldown) return
    const t = setTimeout(() => setCooldown(false), 3000)
    return () => clearTimeout(t)
  }, [cooldown])
  const [showFinish, setShowFinish] = useState(g.status === 'finished')
  useEffect(() => {
    if (g.status !== 'finished') return
    const t = setTimeout(() => setShowFinish(true), 2000)
    return () => clearTimeout(t)
  }, [g.status])
  const actions = legalActions(trial, owner)
  const has = (type: string) => actions.some(a => a.type === type)
  const act = (type: string, extra: Partial<Action> = {}) => onAction({ player: owner, type, ...extra })
  const revealIsMine = g.envido_reveal?.player_id === owner, revealByRound = new Map<number, Card>()
  if (g.envido_reveal) {
    let round = 1
    for (const card of g.envido_reveal.cards) {
      while (round <= 3 && g.played_cards.some(pc => pc.round === round && pc.player_id === g.envido_reveal!.player_id)) round++
      if (round > 3) break
      revealByRound.set(round++, card)
    }
  }
  const myCards = trial.hands[0].filter(c => !(revealIsMine && g.envido_reveal!.cards.some(rc => rc.suit === c.suit && rc.value === c.value)))
  const fullHand = [...trial.hands[0], ...g.played_cards.filter(pc => pc.player_id === owner).map(pc => pc.card)]
  if (g.status === 'finished' && showFinish) {
    const receipt = campaign.receipts?.find(p => p.id === trial.id)
    const won = g.winner_id === owner, reward = receipt ?? campaign.pending.find(p => p.id === trial.id)?.projected_reward
    return <div id="result">
      <FinishScreen won={won} salonSlug={profile?.active_salon} hand={[...fullHand, null, null, null].slice(0, 3)}
        title={won ? '¡Ganaste!' : 'Perdiste'}
        subtitle={won ? <>Le ganaste a <b className="font-semibold text-cream">{rival.display_name}</b> {g.player1_score} a {g.player2_score}</>
          : <><b className="font-semibold text-cream">{rival.display_name}</b> te ganó {g.player2_score} a {g.player1_score}</>}
        note={won ? 'Mirá el mapa: capaz se abrió algo nuevo.' : 'Volvé a intentarlo, le vas a encontrar la vuelta.'}
        me={{ url: profile?.avatar_url, name: myUsername, score: g.player1_score, highlight: won }}
        opponent={{ url: '/personajes/' + rival.slug + '.webp', name: rival.display_name, score: g.player2_score, highlight: !won }}
        extra={won && reward && <div className="flex items-center gap-2" id="result-reward">
          {reward.points > 0 && <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-display font-bold text-gold shadow-gold-ring animate-scale-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26 6.6.7-4.9 4.5 1.35 6.54L12 16.77 6.05 20l1.35-6.54-4.9-4.5 6.6-.7L12 2z" /></svg>
            +{reward.points.toLocaleString('es-AR')} pts
          </div>}
          {reward.coins > 0 && <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-display font-bold text-gold shadow-gold-ring animate-scale-in"><CoinIcon size={18} />+{reward.coins.toLocaleString('es-AR')}</div>}
        </div>}>
        <p className="text-xs text-muted text-center">{receipt ? 'Partida confirmada. Premio acreditado.' : 'Guardado en este dispositivo. Premios por confirmar al sincronizar.'}</p>
        <Button variant="primary" size="md" fullWidth disabled={busy} onClick={() => void onReplay(rival.id)}>{won ? 'Jugar de nuevo' : 'Revancha'}</Button>
        <div className="flex gap-2">
          <Button id="new-game" variant="secondary" size="sm" fullWidth onClick={onLeave}>Volver al modo historia</Button>
          <Button variant="secondary" size="sm" fullWidth disabled={!receipt} title={receipt ? undefined : 'Disponible cuando esta partida esté sincronizada'} onClick={() => window.location.assign('/resena?game=' + trial.id)}>Dejar reseña</Button>
        </div>
      </FinishScreen>
    </div>
  }
  return <div id="table" className="h-dvh">
    <GameTable game={{ ...g, bet: 0 }} currentUserId={owner} opponentId={g.player2_id}
      myUsername={myUsername} opponentUsername={rival.display_name} myScore={g.player1_score} opponentScore={g.player2_score}
      isMano={g.mano_player === owner} isMyTurn={!g.awaiting_deal && g.current_turn === owner} meActive={actions.length > 0 && !g.awaiting_deal}
      salonSlug={profile?.active_salon ?? 'clasico'} campaignRivalSlug={rival.slug}
      myAvatarUrl={profile?.avatar_url} myFrame={profile?.active_frame} myMedal={profile?.active_medal} myAccessory={profile?.active_accessory}
      myCards={myCards} oppCardsLeft={Math.max(0, 3 - g.played_cards.filter(pc => pc.player_id !== owner).length - (!revealIsMine ? g.envido_reveal?.cards.length ?? 0 : 0))}
      revealByRound={revealByRound} revealIsMine={!!revealIsMine} cardFlight={cardFlight} initialCardKeys={initialCardKeys.current}
      cardsDisabled={busy || !has('play_card')} loading={busy} actionError="" dismissError={() => {}} secondsLeft={null}
      muted={muted} toggleMute={() => { setMuted(!muted); setMutedState(!muted) }} emoteTray={emoteTray} toggleEmotes={() => setEmoteTray(v => !v)}
      emoteTrayContent={emoteTray && <EmoteTray cooldown={cooldown} onSend={text => { if (!cooldown) { setMyEmote(text); setEmoteTray(false); setCooldown(true) } }} />}
      myEmote={myEmote} oppEmote={oppEmote} announce={announce}
      hasPendingEnvido={has('respond_envido')} hasPendingTruco={has('respond_truco')} isDeclaring={g.envido_state.status === 'declaring'}
      myDeclareTurn={has('envido_say')} manoDeclared={g.envido_state.mano_declared} myEnvido={getEnvidoPoints(fullHand)}
      canSingEnvido={has('sing_envido')} canSingTruco={has('sing_truco')}
      playCard={card => act('play_card', { card })} singEnvido={value => void act('sing_envido', { value })}
      respondEnvido={accept => void act('respond_envido', { accept })} singTruco={value => void act('sing_truco', { value })}
      respondTruco={accept => void act('respond_truco', { accept })} envidoSay={value => void act('envido_say', { value })}
      irseAlMazo={() => void act('irse_al_mazo')} onLeave={onLeave} leaveLabel="Guardar y salir" />
  </div>
}
