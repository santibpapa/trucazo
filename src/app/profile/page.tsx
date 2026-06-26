import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Panel, Logo, Coins, CoinIcon, buttonClass } from '@/components/ui'
import { Profile, GameHistory } from '@/lib/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/lobby')

  const { data: historyData } = await supabase
    .from('game_history')
    .select('*')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const history = (historyData ?? []) as GameHistory[]

  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0

  const stats = [
    { label: 'Jugadas', value: profile.games_played },
    { label: 'Ganadas', value: profile.games_won },
    { label: 'Perdidas', value: profile.games_lost },
    { label: '% Victorias', value: profile.games_played > 0 ? `${winRate}%` : '—' },
  ]

  return (
    <main className="flex flex-col min-h-screen p-4 sm:p-6 gap-5 max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 pt-1">
        <Logo size="md" />
        <Link href="/lobby" className={buttonClass('ghost', 'sm')}>← Lobby</Link>
      </header>

      {/* Identidad + monedas */}
      <Panel className="p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-subtle">Jugador</p>
          <h1 className="font-display text-2xl font-extrabold text-cream truncate">{profile.username}</h1>
        </div>
        <Coins amount={profile.coins} />
      </Panel>

      {/* Estadísticas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <Panel key={s.label} className="p-4 flex flex-col items-center gap-1 text-center">
            <span className="font-display text-2xl font-extrabold text-gold tabular">{s.value}</span>
            <span className="text-[11px] uppercase tracking-wider text-subtle">{s.label}</span>
          </Panel>
        ))}
      </section>

      {/* Historial */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-bold text-cream">Últimas partidas</h2>

        {history.length === 0 ? (
          <Panel className="p-10 text-center flex flex-col gap-1 border-dashed">
            <p className="font-medium text-muted">Todavía no jugaste ninguna partida</p>
            <p className="text-sm text-subtle">Cuando juegues, acá vas a ver tu historial.</p>
          </Panel>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(h => {
              const won = h.result === 'win'
              return (
                <Panel key={h.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      won ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative'
                    }`}>
                      {won ? 'G' : 'P'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cream truncate">
                        {won ? 'Ganaste' : 'Perdiste'} vs {h.opponent_username}
                      </p>
                      <p className="text-[11px] text-subtle">
                        {new Date(h.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 font-display font-bold tabular ${
                    won ? 'text-positive' : 'text-negative'
                  }`}>
                    <CoinIcon size={14} />{won ? '+' : '−'}{Math.abs(h.coins_change).toLocaleString('es-AR')}
                  </span>
                </Panel>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
