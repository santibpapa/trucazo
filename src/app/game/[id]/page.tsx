import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GameClient from './GameClient'

export default async function GamePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!table) redirect('/lobby')

  if (table.creator_id !== user.id && table.opponent_id !== user.id) {
    redirect('/lobby')
  }

  if (table.status === 'waiting') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="bg-green-900 border border-green-700 rounded-2xl p-8 w-full max-w-sm text-center flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-yellow-400">⏳ Esperando rival...</h2>
          <p className="text-green-300">Compartí el código con tu rival para que se una</p>
          {table.private_code && (
            <div className="bg-green-800 rounded-xl p-4">
              <p className="text-4xl font-bold text-white tracking-widest">{table.private_code}</p>
            </div>
          )}
          <p className="text-green-500 text-sm">La página se actualizará automáticamente</p>
          <a href="/lobby" className="text-green-500 hover:text-red-400 transition text-sm underline">
            Cancelar y volver al lobby
          </a>
        </div>
      </main>
    )
  }

  let { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!game && table.status === 'playing') {
    const suits = ['espada', 'basto', 'oro', 'copa']
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
    const deck: any[] = []

    function getRank(value: number, suit: string): number {
      if (value === 1 && suit === 'espada') return 1
      if (value === 1 && suit === 'basto') return 2
      if (value === 7 && suit === 'espada') return 3
      if (value === 7 && suit === 'oro') return 4
      if (value === 3) return 5
      if (value === 2) return 6
      if (value === 1) return 7
      if (value === 12) return 8
      if (value === 11) return 9
      if (value === 10) return 10
      if (value === 7) return 11
      if (value === 6) return 12
      if (value === 5) return 13
      if (value === 4) return 14
      return 15
    }

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value, rank: getRank(value, suit) })
      }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }

    const p1Cards = deck.slice(0, 3)
    const p2Cards = deck.slice(3, 6)

    const { data: newGame } = await supabase
      .from('games')
      .insert({
        id: params.id,
        player1_id: table.creator_id,
        player2_id: table.opponent_id,
        player1_username: table.creator_username,
        player2_username: table.opponent_username,
        player1_cards: p1Cards,
        player2_cards: p2Cards,
        current_turn: table.creator_id,
        mano_player: table.creator_id,
        bet: table.bet * 2,
      })
      .select()
      .single()

    game = newGame
  }

  if (!game) redirect('/lobby')

  return <GameClient game={game} currentUserId={user.id} />
}