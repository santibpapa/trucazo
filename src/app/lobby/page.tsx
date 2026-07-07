import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LobbyClient from './LobbyClient'

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Red de seguridad: si el usuario entró pero no tiene perfil (p. ej. un login
  // con Google que no llegó a crearlo), lo creamos acá para que el lobby nunca
  // quede sin perfil. Es idempotente: si ya existe, no hace nada.
  if (!profile) {
    const base = (user.email?.split('@')[0] || 'Jugador').slice(0, 16)
    for (const username of [base, `${base}${Math.floor(1000 + Math.random() * 9000)}`]) {
      const { error } = await supabase.from('profiles').insert({ id: user.id, username })
      if (!error) break
      if (error.code !== '23505') break // error real (no "nombre repetido"): no insistimos
    }
    const { data: reloaded } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = reloaded
  }

  // Si aun así no hay perfil, mostramos algo claro en vez de romper la pantalla.
  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-cream">No pudimos cargar tu perfil</p>
        <p className="max-w-xs text-sm text-muted">
          Reintentá en un momento. Si sigue pasando, cerrá sesión y volvé a entrar.
        </p>
        <a href="/lobby" className="font-semibold text-gold hover:underline">Reintentar</a>
      </main>
    )
  }

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('status', 'waiting')
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  // Partida en curso del usuario (la RLS de games ya limita a las suyas).
  // Los duelos del modo historia no cuentan acá: son práctica, no una partida
  // apostada para retomar, y no deben quedar colgados como "partida en curso".
  const { data: activeGame } = await supabase
    .from('games')
    .select('id')
    .eq('status', 'playing')
    .is('campaign_rival_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <LobbyClient
      profile={profile}
      initialTables={tables || []}
      activeGameId={activeGame?.id ?? null}
    />
  )
}