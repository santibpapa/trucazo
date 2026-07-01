import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Card } from '@/lib/truco'
import { Panel } from '@/components/ui'
import GameClient from './GameClient'
import CancelTableButton from './CancelTableButton'
import WaitingRoom from './WaitingRoom'

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
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <Panel className="w-full max-w-sm p-8 text-center flex flex-col gap-5 animate-fade-up">
          <div className="flex flex-col items-center gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:400ms]" />
            </span>
            <h2 className="font-display text-2xl font-bold text-cream">Esperando rival</h2>
          </div>
          <p className="text-sm text-muted">
            {table.private_code
              ? 'Pasale este código a tu rival para que se una.'
              : 'Tu mesa ya está publicada. En cuanto alguien entre, arranca la partida.'}
          </p>
          {table.private_code && (
            <div className="rounded-2xl border border-gold/30 bg-base py-5 shadow-gold-ring">
              <p className="font-display text-4xl font-extrabold tracking-[0.3em] text-gold">
                {table.private_code}
              </p>
            </div>
          )}
          <p className="text-xs text-subtle">La pantalla se actualiza sola.</p>
          <WaitingRoom tableId={params.id} />
          <CancelTableButton tableId={params.id} />
        </Panel>
      </main>
    )
  }

  // Crea la partida y reparte las manos en el servidor (idempotente y a prueba
  // de carrera). Las cartas viven en game_hands, no en games, así no se filtran.
  const { data: game } = await supabase.rpc('start_game', { p_game_id: params.id })

  if (!game) redirect('/lobby')

  // Mi mano: la RLS de game_hands solo me deja ver la mía.
  const { data: handRow } = await supabase
    .from('game_hands')
    .select('cards')
    .eq('game_id', params.id)
    .eq('player_id', user.id)
    .single()

  const myHand = (handRow?.cards as Card[]) ?? []

  // Modo historia: traemos el "slug" del rival para mostrar su ilustración.
  let campaignRivalSlug: string | null = null
  if (game.campaign_rival_id) {
    const { data: rival } = await supabase
      .from('campaign_rivals')
      .select('slug')
      .eq('id', game.campaign_rival_id)
      .single()
    campaignRivalSlug = rival?.slug ?? null
  }

  return (
    <GameClient
      game={game}
      currentUserId={user.id}
      myHand={myHand}
      campaignRivalSlug={campaignRivalSlug}
    />
  )
}