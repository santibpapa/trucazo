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
          <WaitingRoom tableId={params.id} isPrivate={table.is_private} />
          <CancelTableButton tableId={params.id} />
        </Panel>
      </main>
    )
  }

  // Crea la partida y reparte las manos en el servidor (idempotente y a prueba
  // de carrera). Las cartas viven en game_hands, no en games, así no se filtran.
  const { data: game } = await supabase.rpc('start_game', { p_game_id: params.id })

  if (!game) redirect('/lobby')

  // Foto del rival (profiles es de lectura pública). En campaña el rival es un
  // bot y usa su ilustración por slug, así que su foto no importa.
  const opponentId = game.player1_id === user.id ? game.player2_id : game.player1_id

  // De acá en adelante todo depende sólo de quién sos y de la partida, que ya
  // tenemos: ninguna de estas consultas necesita el resultado de otra. Antes se
  // pedían una atrás de otra, seis idas y vueltas a la base con la pantalla en
  // blanco esperando. Ahora salen todas juntas y se tarda lo que tarde la más
  // lenta, no la suma.
  const [handRow, rival, prof, myMedalData, opp, oppMedal] = await Promise.all([
    // Mi mano: la RLS de game_hands solo me deja ver la mía.
    supabase
      .from('game_hands')
      .select('cards')
      .eq('game_id', params.id)
      .eq('player_id', user.id)
      .single()
      .then(r => r.data),
    // Modo historia: el "slug" del rival para mostrar su ilustración.
    game.campaign_rival_id
      ? supabase
          .from('campaign_rivals')
          .select('slug')
          .eq('id', game.campaign_rival_id)
          .single()
          .then(r => r.data)
      : Promise.resolve(null),
    // Salón (fondo de la mesa) elegido por este jugador y su foto de perfil.
    supabase
      .from('profiles')
      .select('active_salon, avatar_url, active_frame, active_accessory')
      .eq('id', user.id)
      .single()
      .then(r => r.data),
    // Medalla destacada (ya validada) del jugador, para el pin del asiento.
    supabase.rpc('active_medal_for', { p_uid: user.id }).then(r => r.data),
    // Si el rival es un bot del lobby, esta pantalla es la que le da pie para
    // que juegue sus turnos (igual que en el modo historia).
    opponentId
      ? supabase
          .from('profiles')
          .select('avatar_url, active_frame, active_accessory, is_bot')
          .eq('id', opponentId)
          .single()
          .then(r => r.data)
      : Promise.resolve(null),
    opponentId
      ? supabase.rpc('active_medal_for', { p_uid: opponentId }).then(r => r.data)
      : Promise.resolve(null),
  ])

  const myHand = (handRow?.cards as Card[]) ?? []
  const campaignRivalSlug = rival?.slug ?? null
  const salonSlug = prof?.active_salon ?? 'clasico'
  const myAvatarUrl = prof?.avatar_url ?? null
  const myFrame = prof?.active_frame ?? 'ninguno'
  const myAccessory = prof?.active_accessory ?? 'ninguno'
  const myMedal = (myMedalData as string | null) ?? 'ninguno'

  // Sin rival sentado, estos quedan en null como antes (no en 'ninguno').
  const opponentAvatarUrl = opponentId ? opp?.avatar_url ?? null : null
  const opponentFrame = opponentId ? opp?.active_frame ?? null : null
  const opponentAccessory = opponentId ? opp?.active_accessory ?? 'ninguno' : null
  const opponentMedal = opponentId ? (oppMedal as string | null) ?? 'ninguno' : null
  const opponentIsBot = opponentId ? !!opp?.is_bot : false

  return (
    <GameClient
      game={game}
      currentUserId={user.id}
      isGuest={user.is_anonymous === true}
      myHand={myHand}
      campaignRivalSlug={campaignRivalSlug}
      salonSlug={salonSlug}
      myAvatarUrl={myAvatarUrl}
      opponentAvatarUrl={opponentAvatarUrl}
      myFrame={myFrame}
      opponentFrame={opponentFrame}
      myMedal={myMedal}
      opponentMedal={opponentMedal}
      myAccessory={myAccessory}
      opponentAccessory={opponentAccessory}
      opponentIsBot={opponentIsBot}
    />
  )
}
