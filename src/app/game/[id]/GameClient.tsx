'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/lib/types'
import { getCardLabel, getCardImage, getEnvidoPoints, compareCards } from '@/lib/truco'
import type { Card } from '@/lib/truco'

interface Props {
  game: Game
  currentUserId: string
}

export default function GameClient({ game: initialGame, currentUserId }: Props) {
  const router = useRouter()
  const [game, setGame] = useState<Game>(initialGame)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [log, setLog] = useState<string[]>([])
  const supabase = createClient()

  const isPlayer1 = currentUserId === game.player1_id
  const myCards = isPlayer1 ? game.player1_cards : game.player2_cards
  const myScore = isPlayer1 ? game.player1_score : game.player2_score
  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score
  const myUsername = isPlayer1 ? game.player1_username : game.player2_username
  const opponentUsername = isPlayer1 ? game.player2_username : game.player1_username
  const isMyTurn = game.current_turn === currentUserId
  console.log('isMyTurn:', isMyTurn, 'current_turn:', game.current_turn, 'currentUserId:', currentUserId)
  const isMano = game.mano_player === currentUserId

  const currentRoundCards = game.played_cards.filter(pc => pc.round === game.round_number)
  const myPlayedCard = currentRoundCards.find(pc => pc.player_id === currentUserId)
  const opponentPlayedCard = currentRoundCards.find(pc => pc.player_id !== currentUserId)

  const canSingEnvido = game.envido_state.status === 'none' && game.played_cards.filter(pc => pc.round === game.round_number).length === 0
  const canSingTruco = game.truco_state.status === 'none' || game.truco_state.status === 'accepted'
  const hasPendingEnvido = ['envido', 'real_envido', 'falta_envido'].includes(game.envido_state.status) && game.envido_state.last_singer !== currentUserId
  const hasPendingTruco = ['truco', 'retruco', 'vale_cuatro'].includes(game.truco_state.status) && game.truco_state.last_singer !== currentUserId

  // Tiempo real
  useEffect(() => {
    if (game.status === 'finished') return

    const interval = setInterval(async () => {
      if (Date.now() - lastUpdate < 500) return
      
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single()

      if (data) {
        setGame(data as Game)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [game.id, lastUpdate, game.status])

  useEffect(() => {
    if (game.status === 'finished') {
      setTimeout(() => {
        router.push(`/lobby`)
        router.refresh()
      }, 3000)
    }
  }, [game.status])

  async function updateGame(updates: Partial<Game>) {
    const { error } = await supabase
      .from('games')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', game.id)

    if (error) console.error(error)
  }

  async function playCard(card: Card) {
    if (!isMyTurn || loading) return
    if (hasPendingEnvido || hasPendingTruco) return

    setLoading(true)
    setLastUpdate(Date.now())

    const newPlayedCards = [...game.played_cards, {
      player_id: currentUserId,
      card,
      round: game.round_number,
    }]

    const newMyCards = myCards.filter(c => !(c.value === card.value && c.suit === card.suit))
    const p1Cards = isPlayer1 ? newMyCards : game.player1_cards
    const p2Cards = isPlayer1 ? game.player2_cards : newMyCards

    const currentRound = newPlayedCards.filter(pc => pc.round === game.round_number)

    if (currentRound.length === 2) {
      await resolveRound(newPlayedCards, p1Cards, p2Cards, currentRound)
    } else {
      const opponentId = isPlayer1 ? game.player2_id : game.player1_id
      // Actualizar estado local inmediatamente
      setGame(prev => ({
        ...prev,
        played_cards: newPlayedCards,
        player1_cards: p1Cards,
        player2_cards: p2Cards,
        current_turn: opponentId,
      }))
      await updateGame({
        played_cards: newPlayedCards,
        player1_cards: p1Cards,
        player2_cards: p2Cards,
        current_turn: opponentId,
      })
    }

    setLoading(false)
  }

  async function resolveRound(
    newPlayedCards: any[],
    p1Cards: Card[],
    p2Cards: Card[],
    currentRound: any[]
  ) {
    const card1 = currentRound.find((pc: any) => pc.player_id === game.player1_id)?.card
    const card2 = currentRound.find((pc: any) => pc.player_id === game.player2_id)?.card

    let roundWinner: string | null = null
    if (card1 && card2) {
      const result = compareCards(card1, card2)
      if (result === 1) roundWinner = game.player1_id
      else if (result === -1) roundWinner = game.player2_id
      else roundWinner = null // empate
    }

    const newRoundResults = [...game.round_results, {
      round: game.round_number,
      winner_id: roundWinner,
    }]

    // Verificar si termina la mano
    const handWinner = getHandWinner(newRoundResults, game.mano_player, game.player1_id, game.player2_id)

    if (handWinner !== undefined) {
      await resolveHand(handWinner, newPlayedCards, p1Cards, p2Cards, newRoundResults)
    } else {
      // Siguiente ronda
      const nextRound = game.round_number + 1
      const nextTurn = roundWinner !== null ? roundWinner : game.mano_player
      await updateGame({
        played_cards: newPlayedCards,
        player1_cards: p1Cards,
        player2_cards: p2Cards,
        round_number: nextRound,
        round_results: newRoundResults,
        current_turn: nextTurn,
      })
    }
  }

  function getHandWinner(
    results: any[],
    manoPlayer: string,
    p1: string,
    p2: string
  ): string | null | undefined {
    const p1Wins = results.filter(r => r.winner_id === p1).length
    const p2Wins = results.filter(r => r.winner_id === p2).length
    const ties = results.filter(r => r.winner_id === null).length

    if (p1Wins >= 2) return p1
    if (p2Wins >= 2) return p2
    if (results.length === 3) {
      if (p1Wins > p2Wins) return p1
      if (p2Wins > p1Wins) return p2
      return manoPlayer // empate total
    }
    if (ties === 1 && results.length === 2) {
      const nonTie = results.find(r => r.winner_id !== null)
      if (nonTie) return nonTie.winner_id
    }
    return undefined // no terminó
  }

  async function resolveHand(
    handWinner: string | null,
    newPlayedCards: any[],
    p1Cards: Card[],
    p2Cards: Card[],
    newRoundResults: any[]
  ) {
    const trucoValue = game.truco_state.status === 'accepted' ? game.truco_state.value :
      game.truco_state.status === 'rejected' ? game.truco_state.value - 1 : 1

    let p1Score = game.player1_score
    let p2Score = game.player2_score

    if (handWinner === game.player1_id) p1Score += trucoValue
    else if (handWinner === game.player2_id) p2Score += trucoValue

    // Verificar si termina el juego
    if (p1Score >= 30 || p2Score >= 30) {
      const gameWinner = p1Score >= 30 ? game.player1_id : game.player2_id
      await finishGame(gameWinner, p1Score, p2Score, newPlayedCards, newRoundResults)
      return
    }

    // Nueva mano
    const suits = ['espada', 'basto', 'oro', 'copa']
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
    const deck: any[] = []
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value, rank: 0 })
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    const p1 = deck.slice(0, 3)
    const p2 = deck.slice(3, 6)
    const newMano = handWinner || game.mano_player === game.player1_id ? game.player2_id : game.player1_id

    await updateGame({
      played_cards: [],
      player1_cards: p1,
      player2_cards: p2,
      player1_score: p1Score,
      player2_score: p2Score,
      current_turn: newMano,
      mano_player: newMano,
      hand_number: game.hand_number + 1,
      round_number: 1,
      round_results: [],
      envido_state: { status: 'none', last_singer: null, value: 0, chain: [] },
      truco_state: { status: 'none', last_singer: null, value: 2 },
    })
  }

  async function finishGame(winnerId: string, p1Score: number, p2Score: number, newPlayedCards: any[], newRoundResults: any[]) {
    await updateGame({
      status: 'finished',
      winner_id: winnerId,
      player1_score: p1Score,
      player2_score: p2Score,
      played_cards: newPlayedCards,
      round_results: newRoundResults,
    })

    // Acreditar monedas al ganador
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', winnerId)
      .single()

    if (winnerProfile) {
      await supabase
        .from('profiles')
        .update({ coins: winnerProfile.coins + game.bet })
        .eq('id', winnerId)
    }

    // Registrar historial
    const loserId = winnerId === game.player1_id ? game.player2_id : game.player1_id
    const winnerUsername = winnerId === game.player1_id ? game.player1_username : game.player2_username
    const loserUsername = winnerId === game.player1_id ? game.player2_username : game.player1_username

    await supabase.from('game_history').insert([
      {
        player_id: winnerId,
        opponent_id: loserId,
        opponent_username: loserUsername,
        result: 'win',
        coins_change: game.bet / 2,
      },
      {
        player_id: loserId,
        opponent_id: winnerId,
        opponent_username: winnerUsername,
        result: 'loss',
        coins_change: -(game.bet / 2),
      },
    ])
  }

  async function singEnvido(type: 'envido' | 'real_envido' | 'falta_envido') {
    if (!isMyTurn && !hasPendingEnvido) return
    setLoading(true)

    const chain = [...(game.envido_state.chain || []), type]
    let value = 0
    if (type === 'falta_envido') value = 30 - Math.min(game.player1_score, game.player2_score)
    else {
      for (const c of chain) {
        if (c === 'envido') value += 2
        if (c === 'real_envido') value += 3
        if (c === 'falta_envido') value += 30
      }
    }

    await updateGame({
      envido_state: { status: type, last_singer: currentUserId, value, chain },
      current_turn: isPlayer1 ? game.player2_id : game.player1_id,
    })
    setLoading(false)
  }

  async function respondEnvido(accept: boolean) {
    setLoading(true)

    if (accept) {
      const myPoints = getEnvidoPoints(myCards)
      const opponentId = isPlayer1 ? game.player2_id : game.player1_id
      const { data: opponentGame } = await supabase
        .from('games')
        .select('player1_cards, player2_cards')
        .eq('id', game.id)
        .single()

      const opponentCards = isPlayer1 ? opponentGame?.player2_cards : opponentGame?.player1_cards
      const opponentPoints = getEnvidoPoints(opponentCards || [])

      let envidoWinner: string
      if (myPoints > opponentPoints) envidoWinner = currentUserId
      else if (opponentPoints > myPoints) envidoWinner = opponentId
      else envidoWinner = game.mano_player

      const envidoValue = game.envido_state.value
      let p1Score = game.player1_score
      let p2Score = game.player2_score

      if (envidoWinner === game.player1_id) p1Score += envidoValue
      else p2Score += envidoValue

      await updateGame({
        envido_state: { ...game.envido_state, status: 'accepted' },
        player1_score: p1Score,
        player2_score: p2Score,
        current_turn: game.mano_player,
      })
    } else {
      // No quiero — gana quien cantó pero cobra menos
      const singer = game.envido_state.last_singer!
      const rejectedValue = (game.envido_state.chain || []).length > 0 ? 1 : 1

      let p1Score = game.player1_score
      let p2Score = game.player2_score

      if (singer === game.player1_id) p1Score += rejectedValue
      else p2Score += rejectedValue

      await updateGame({
        envido_state: { ...game.envido_state, status: 'rejected' },
        player1_score: p1Score,
        player2_score: p2Score,
        current_turn: game.mano_player,
      })
    }

    setLoading(false)
  }

  async function singTruco(type: 'truco' | 'retruco' | 'vale_cuatro') {
    setLoading(true)
    const value = type === 'truco' ? 2 : type === 'retruco' ? 3 : 4
    const opponentId = isPlayer1 ? game.player2_id : game.player1_id

    await updateGame({
      truco_state: { status: type, last_singer: currentUserId, value },
      current_turn: opponentId,
    })
    setLoading(false)
  }

  async function respondTruco(accept: boolean) {
    setLoading(true)

    if (accept) {
      await updateGame({
        truco_state: { ...game.truco_state, status: 'accepted' },
        current_turn: currentUserId,
      })
    } else {
      // No quiero truco
      const singer = game.truco_state.last_singer!
      const value = game.truco_state.value - 1

      let p1Score = game.player1_score
      let p2Score = game.player2_score

      if (singer === game.player1_id) p1Score += value
      else p2Score += value

      if (p1Score >= 30 || p2Score >= 30) {
        const winner = p1Score >= 30 ? game.player1_id : game.player2_id
        await finishGame(winner, p1Score, p2Score, game.played_cards, game.round_results)
      } else {
        await updateGame({
          truco_state: { ...game.truco_state, status: 'rejected' },
          player1_score: p1Score,
          player2_score: p2Score,
          current_turn: game.mano_player,
        })
      }
    }

    setLoading(false)
  }

  async function irseAlMazo() {
    setLoading(true)
    const opponentId = isPlayer1 ? game.player2_id : game.player1_id
    const p1Score = isPlayer1 ? game.player1_score : game.player1_score + 1
    const p2Score = isPlayer1 ? game.player2_score + 1 : game.player2_score

    if (p1Score >= 30 || p2Score >= 30) {
      await finishGame(opponentId, p1Score, p2Score, game.played_cards, game.round_results)
    } else {
      const suits = ['espada', 'basto', 'oro', 'copa']
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
    const deck: any[] = []
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value, rank: 0 })
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    const p1 = deck.slice(0, 3)
    const p2 = deck.slice(3, 6)
      const newMano = game.mano_player === game.player1_id ? game.player2_id : game.player1_id

      await updateGame({
        played_cards: [],
        player1_cards: p1,
        player2_cards: p2,
        player1_score: p1Score,
        player2_score: p2Score,
        current_turn: newMano,
        mano_player: newMano,
        hand_number: game.hand_number + 1,
        round_number: 1,
        round_results: [],
        envido_state: { status: 'none', last_singer: null, value: 0, chain: [] },
        truco_state: { status: 'none', last_singer: null, value: 2 },
      })
    }
    setLoading(false)
  }

  if (game.status === 'finished') {
    const won = game.winner_id === currentUserId
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="bg-green-900 border border-green-700 rounded-2xl p-8 w-full max-w-sm text-center flex flex-col gap-4">
          <p className="text-6xl">{won ? '🏆' : '😔'}</p>
          <h2 className="text-3xl font-bold text-yellow-400">{won ? '¡Ganaste!' : 'Perdiste'}</h2>
          <p className="text-green-300">
            {won ? `+${game.bet} monedas` : `-${game.bet / 2} monedas`}
          </p>
          <p className="text-green-500 text-sm">Volviendo al lobby...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen p-3 gap-3 max-w-lg mx-auto">
      {/* Marcador */}
      <div className="flex justify-between items-center bg-green-900 border border-green-700 rounded-xl p-3">
        <div className="text-center">
          <p className="text-green-400 text-xs">{opponentUsername}</p>
          <p className="text-2xl font-bold text-white">{opponentScore}</p>
        </div>
        <div className="text-center">
          <p className="text-green-500 text-xs">Pozo 🪙 {game.bet}</p>
          <p className="text-yellow-400 text-xs">Mano: {isMano ? 'Vos' : opponentUsername}</p>
        </div>
        <div className="text-center">
          <p className="text-green-400 text-xs">{myUsername} (vos)</p>
          <p className="text-2xl font-bold text-white">{myScore}</p>
        </div>
      </div>

      {/* Indicador de turno */}
      <div className={`text-center py-2 rounded-xl text-sm font-bold ${isMyTurn ? 'bg-yellow-400 text-green-950' : 'bg-green-800 text-green-400'}`}>
        {hasPendingEnvido ? '🎯 Te cantaron envido — respondé' :
         hasPendingTruco ? '⚔️ Te cantaron truco — respondé' :
         isMyTurn ? '✅ Tu turno' : `⏳ Turno de ${opponentUsername}`}
      </div>

      {/* Mesa de juego */}
      <div className="bg-green-800 border border-green-600 rounded-xl p-4 flex flex-col gap-4 min-h-48">
        {/* Cartas del oponente boca abajo */}
        <div className="flex justify-center gap-2">
          {[...Array(isPlayer1 ? game.player2_cards.length : game.player1_cards.length)].map((_, i) => (
            <div key={i} className="w-12 h-16 bg-blue-900 border-2 border-blue-700 rounded-lg flex items-center justify-center text-blue-500 text-xs">
              🂠
            </div>
          ))}
        </div>

        {/* Historial de rondas */}
        <div className="flex justify-center gap-4 items-center min-h-32 py-2">
          {[1, 2, 3].map(roundNum => {
            const roundCards = game.played_cards.filter(pc => pc.round === roundNum)
            const myRoundCard = roundCards.find(pc => pc.player_id === currentUserId)
            const opponentRoundCard = roundCards.find(pc => pc.player_id !== currentUserId)
            const roundResult = game.round_results.find(r => r.round === roundNum)
            const iCurrent = roundNum === game.round_number

            if (roundNum > game.round_number && roundCards.length === 0) return null

            // La carta ganadora va encima
            const myCardOnTop = roundResult
              ? roundResult.winner_id === currentUserId
              : false

            return (
              <div key={roundNum} className="flex flex-col items-center gap-1">
                <span className="text-green-500 text-xs">R{roundNum}</span>
                <div className="relative w-16 h-24">
                  {/* Carta perdedora abajo */}
                  {opponentRoundCard && (
                  <div className={`absolute w-14 h-20 rounded-lg overflow-hidden shadow ${myCardOnTop ? 'top-0 left-0' : 'top-4 left-2'}`}>
                    <img src={getCardImage(opponentRoundCard.card)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {myRoundCard && (
                  <div className={`absolute w-14 h-20 rounded-lg overflow-hidden shadow-lg ${myCardOnTop ? 'top-4 left-2' : 'top-0 left-0'}`}>
                    <img src={getCardImage(myRoundCard.card)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                  {/* Placeholders ronda actual */}
                  {iCurrent && !opponentRoundCard && (
                    <div className="absolute top-0 left-0 w-14 h-20 border-2 border-dashed border-green-600 rounded-lg" />
                  )}
                  {iCurrent && !myRoundCard && (
                    <div className="absolute top-4 left-2 w-14 h-20 border-2 border-dashed border-yellow-600 rounded-lg" />
                  )}
                </div>
              </div>
            )
          })}

          {game.played_cards.length === 0 && (
            <p className="text-green-600 text-sm">Jugá una carta para empezar</p>
          )}
        </div>

        {/* Mis cartas */}
        <div className="flex justify-center gap-2">
          {myCards.map((card, i) => (
            <button
              key={i}
              onClick={() => playCard(card)}
              disabled={!isMyTurn || loading || !!myPlayedCard || hasPendingEnvido || hasPendingTruco}
              className="w-16 h-24 rounded-lg overflow-hidden hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-transparent hover:border-yellow-400"
            >
              <img src={getCardImage(card)} alt={getCardLabel(card)} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2">
        {/* Envido */}
        {hasPendingEnvido && (
          <div className="flex gap-2">
            <button onClick={() => respondEnvido(true)} disabled={loading}
              className="flex-1 bg-green-500 text-white font-bold py-2 rounded-xl hover:bg-green-400 transition disabled:opacity-50">
              ✅ Quiero ({game.envido_state.value} pts)
            </button>
            <button onClick={() => respondEnvido(false)} disabled={loading}
              className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl hover:bg-red-500 transition disabled:opacity-50">
              ❌ No quiero
            </button>
          </div>
        )}

        {isMyTurn && !hasPendingEnvido && !hasPendingTruco && canSingEnvido && (
          <div className="flex gap-2">
            <button onClick={() => singEnvido('envido')} disabled={loading}
              className="flex-1 bg-blue-700 text-white font-bold py-2 rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm">
              Envido
            </button>
            <button onClick={() => singEnvido('real_envido')} disabled={loading}
              className="flex-1 bg-blue-700 text-white font-bold py-2 rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm">
              Real Envido
            </button>
            <button onClick={() => singEnvido('falta_envido')} disabled={loading}
              className="flex-1 bg-blue-700 text-white font-bold py-2 rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm">
              Falta Envido
            </button>
          </div>
        )}

        {/* Truco */}
        {hasPendingTruco && (
          <div className="flex gap-2">
            <button onClick={() => respondTruco(true)} disabled={loading}
              className="flex-1 bg-green-500 text-white font-bold py-2 rounded-xl hover:bg-green-400 transition disabled:opacity-50">
              ✅ Quiero
            </button>
            {game.truco_state.status !== 'vale_cuatro' && (
              <button onClick={() => singTruco(game.truco_state.status === 'truco' ? 'retruco' : 'vale_cuatro')} disabled={loading}
                className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-xl hover:bg-orange-500 transition disabled:opacity-50 text-sm">
                {game.truco_state.status === 'truco' ? 'Retruco' : 'Vale Cuatro'}
              </button>
            )}
            <button onClick={() => respondTruco(false)} disabled={loading}
              className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl hover:bg-red-500 transition disabled:opacity-50">
              ❌ No quiero
            </button>
          </div>
        )}

        {isMyTurn && !hasPendingTruco && !hasPendingEnvido && canSingTruco && (
          <button onClick={() => singTruco(
            game.truco_state.status === 'none' ? 'truco' :
            game.truco_state.status === 'accepted' && game.truco_state.value === 2 ? 'retruco' : 'vale_cuatro'
          )} disabled={loading}
            className="bg-red-700 text-white font-bold py-2 rounded-xl hover:bg-red-600 transition disabled:opacity-50">
            ⚔️ {game.truco_state.status === 'none' ? 'Truco' :
              game.truco_state.value === 2 ? 'Retruco' : 'Vale Cuatro'}
          </button>
        )}

        {/* Irse al mazo */}
        {isMyTurn && !hasPendingEnvido && !hasPendingTruco && (
          <button onClick={irseAlMazo} disabled={loading}
            className="border border-green-600 text-green-500 font-bold py-2 rounded-xl hover:bg-green-900 transition disabled:opacity-50 text-sm">
            🏳️ Irse al mazo
          </button>
        )}
      </div>
    </main>
  )
}