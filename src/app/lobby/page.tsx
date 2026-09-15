import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LobbyClient from './LobbyClient'
import type { ObjectivesData } from '@/lib/objectives'
import type { Profile } from '@/lib/types'

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userId = user.id

  // La API de Supabase a veces devuelve 502/504 durante unos segundos. Ese bache
  // no tiene que tirar el lobby entero, así que reintentamos antes de rendirnos.
  // maybeSingle() hace que "este usuario todavía no tiene perfil" vuelva como dato
  // vacío y no como error, para poder distinguirlo de "no pudimos preguntar".
  async function leerPerfil(): Promise<{ perfil: Profile | null; sinRespuesta: boolean }> {
    const hastaCuando = Date.now() + 4000 // tope de espera: la página no puede colgarse
    for (let intento = 1; ; intento++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (!error) return { perfil: data as Profile | null, sinRespuesta: false }
      console.error(`lobby: no se pudo leer el perfil (intento ${intento}):`, error.message)
      if (intento >= 3 || Date.now() >= hastaCuando) return { perfil: null, sinRespuesta: true }
      await new Promise((seguir) => setTimeout(seguir, 200 * intento))
    }
  }

  // Estas cuatro no dependen del perfil: sólo de quién sos, que ya sabemos. Se
  // largan acá, mientras se lee el perfil, y se esperan más abajo. Antes
  // arrancaban recién cuando el perfil había terminado de leerse: una ida y
  // vuelta a la base de puro tiempo perdido, con la pantalla en blanco.
  // Partida en curso del usuario (la RLS de games ya limita a las suyas).
  // Los duelos del modo historia no cuentan acá: son práctica, no una partida
  // apostada para retomar, y no deben quedar colgados como "partida en curso".
  const datosDelLobby = Promise.all([
    supabase
      .from('tables')
      .select('*')
      .eq('status', 'waiting')
      .eq('is_private', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('games')
      .select('id')
      .eq('status', 'playing')
      .is('campaign_rival_id', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Medalla destacada del usuario, ya validada (si era "viva" y la perdió, vuelve 'ninguno').
    supabase.rpc('active_medal_for', { p_uid: user.id }),
    // Además de leer, esta RPC crea de manera segura las tres asignaciones del día
    // cuando es la primera visita. Si la migración aún no se aplicó, el lobby igual abre.
    user.is_anonymous
      ? Promise.resolve({ data: null, error: null })
      : supabase.rpc('get_my_objectives', { p_game_id: null }),
  ])

  const { perfil, sinRespuesta } = await leerPerfil()
  let profile = perfil

  // Red de seguridad: si el usuario entró pero no tiene perfil (p. ej. un login
  // con Google que no llegó a crearlo), lo creamos acá para que el lobby nunca
  // quede sin perfil. Es idempotente: si ya existe, no hace nada.
  // Solo cuando la base contestó: si no contestó, el perfil puede existir igual
  // y no tiene sentido intentar crearlo.
  if (!profile && !sinRespuesta) {
    const base = (user.email?.split('@')[0] || 'Jugador').slice(0, 16)
    for (const username of [base, `${base}${Math.floor(1000 + Math.random() * 9000)}`]) {
      const { error } = await supabase.from('profiles').insert({ id: user.id, username })
      if (!error) break
      if (error.code !== '23505') break // error real (no "nombre repetido"): no insistimos
    }
    profile = (await leerPerfil()).perfil
  }

  const [{ data: tables }, { data: activeGame }, { data: myMedal }, { data: objectives }] =
    await datosDelLobby

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

  return (
    <LobbyClient
      profile={profile}
      initialTables={tables || []}
      activeGameId={activeGame?.id ?? null}
      myMedal={(myMedal as string | null) ?? 'ninguno'}
      isGuest={user.is_anonymous === true}
      initialObjectives={(objectives as ObjectivesData | null) ?? null}
    />
  )
}
