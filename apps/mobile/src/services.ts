import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { WEB_ORIGIN } from './config'
import type { Profile, Table } from '../../../src/lib/types'
import type { ObjectivesData } from '../../../src/lib/objectives'
import { tournamentModeEnabled } from '../../../src/lib/tournaments'
import { hideCampaign } from './campaign-storage'
import { stopPush } from './push'
import type { Session } from '@supabase/supabase-js'
import type { ComponentProps } from 'react'
import type GameClient from '../../../src/app/game/[id]/GameClient'
import type { Card } from '../../../src/lib/truco'
import type { TeamSnapshot } from '../../../src/lib/team-game'

export const SESSION_KEY = 'trucazo:mobile:auth:v1'
// Identidad local para abrir Historia aun si el token venció sin red. Las API
// remotas siguen usando la sesión verificada/renovada por el SDK.
export function cachedSession(): Session | null {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try { const session = JSON.parse(stored) as Session; return session.user?.id && !session.user.is_anonymous ? session : null }
  catch { return null }
}
const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storageKey: SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
})
export function createClient() { return client }
export const appOrigin = () => WEB_ORIGIN

// Un teléfono desconectado no puede enterarse de una eliminación remota.
// Al volver a la red, un rechazo definitivo oculta Historia y retira la sesión.
export async function checkAccountAccess() {
  const owner = cachedSession()?.user.id
  if (!owner || !navigator.onLine) return
  const { data: { user }, error } = await client.auth.getUser()
  if (cachedSession()?.user.id && cachedSession()?.user.id !== owner) return
  const profile = !error && user?.id === owner ? await client.from('profiles').select('id').eq('id', owner).maybeSingle() : null
  if (cachedSession()?.user.id && cachedSession()?.user.id !== owner) return
  if (error && error.name === 'AuthApiError' && [400, 401, 403, 404].includes(error.status ?? 0)
    || profile && !profile.error && !profile.data) {
    await hideCampaign().catch(() => {})
    await stopPush(true).catch(() => {})
    if (cachedSession()?.user.id && cachedSession()?.user.id !== owner) return
    await client.auth.signOut({ scope: 'local' }).catch(() => {})
    if (cachedSession()?.user.id === owner) localStorage.removeItem(SESSION_KEY)
    return owner
  }
}

class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data: unknown) { super(message) }
}

export async function apiRequest<T>(path: string, body?: unknown, authenticated = true, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const owner = authenticated ? (await client.auth.getSession()).data.session : null
  if (authenticated && (!owner || owner.user.is_anonymous)) throw new Error('Entrá con tu cuenta.')
  if (owner) headers.Authorization = `Bearer ${owner.access_token}`
  const url = WEB_ORIGIN + path
  let status: number, data: T & { error?: string; reason?: string }
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({ url, method,
      headers: { ...headers, Origin: 'https://localhost', 'x-cap-user-agent': navigator.userAgent }, data: body, responseType: 'json',
      connectTimeout: 15000, readTimeout: 30000 })
    status = response.status; data = response.data
  } else {
    const response = await fetch(url, { method, headers,
      credentials: 'omit', body: body === undefined ? undefined : JSON.stringify(body) })
    status = response.status; data = await response.json()
  }
  // Una respuesta de A que llega después de salir/entrar como B se descarta.
  if (owner && (await client.auth.getSession()).data.session?.user.id !== owner.user.id) throw new Error('La cuenta cambió. Volvé a abrir esta pantalla.')
  if (status < 200 || status >= 300) throw new ApiError(status === 429 ? 'Demasiados intentos. Esperá un minuto.'
    : data?.error || (data?.reason === 'sin-config' ? 'Por ahora entrá con tu email.' : 'Email/usuario o contraseña incorrectos'), status, data)
  return data
}

export const appRequest: typeof fetch = async (input, init) => {
  if (typeof input !== 'string' || !/^\/api\//.test(input)) throw new Error('Destino de servicio inválido.')
  try {
    const data = await apiRequest(input, init?.body ? JSON.parse(String(init.body)) : undefined, true, init?.method)
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (failure) {
    return new Response(JSON.stringify(failure instanceof ApiError ? failure.data
      : { error: failure instanceof Error ? failure.message : 'No pudimos conectar.' }), { status: failure instanceof ApiError ? failure.status : 400 })
  }
}

export async function signIn(identifier: string, password: string) {
  const entry = identifier.trim()
  if (!entry || !password) throw new Error('Completá todos los campos')
  if (!navigator.onLine) throw new Error('Necesitás internet para iniciar sesión.')
  const result = entry.includes('@')
    ? await client.auth.signInWithPassword({ email: entry, password })
    : await client.auth.setSession(await apiRequest<{ access_token: string; refresh_token: string }>('/api/android/login', { username: entry, password }, false))
  if (result.error || !result.data.session || result.data.user?.is_anonymous) throw new Error('Email/usuario o contraseña incorrectos')
}

export async function signOut() {
  await stopPush()
  // Cerrar esta instalación conserva las otras sesiones web de la misma cuenta.
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw new Error('No se pudo cerrar la sesión. Reintentá con conexión.')
  await hideCampaign()
}

export async function loadLobby() {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user || user.is_anonymous) throw new Error('Entrá con tu cuenta.')
  const [profile, tables, game, medal, objectives, ready] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id).single(),
    client.from('tables').select('*').eq('status', 'waiting').eq('is_private', false).order('created_at', { ascending: false }),
    client.from('games').select('id').eq('status', 'playing').is('campaign_rival_id', null).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    client.rpc('active_medal_for', { p_uid: user.id }),
    client.rpc('get_my_objectives', { p_game_id: null }),
    tournamentModeEnabled ? client.rpc('tournament_ready_match') : Promise.resolve({ data: false }),
  ])
  if (profile.error || tables.error || game.error || profile.data?.id !== user.id) throw new Error('No pudimos cargar el lobby. Reintentá en un momento.')
  if ((await client.auth.getSession()).data.session?.user.id !== user.id) throw new Error('La cuenta cambió.')
  return { profile: profile.data as Profile, initialTables: (tables.data ?? []) as Table[], activeGameId: game.data?.id ?? null,
    myMedal: (medal.data as string | null) ?? 'ninguno', isGuest: false,
    initialObjectives: objectives.data as ObjectivesData | null, initialReadyMatch: ready.data === true }
}

export async function loadTeamGame(tableId: string, owner: string) {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || user?.id !== owner || user.is_anonymous) throw new Error('Entrá con tu cuenta para jugar en parejas.')
  const [snapshot, profile] = await Promise.all([
    client.rpc('team_snapshot', { p_table_id: tableId }),
    client.from('profiles').select('active_salon').eq('id', owner).single(),
  ])
  if ((await client.auth.getSession()).data.session?.user.id !== owner) throw new Error('La cuenta cambió. Volvé a abrir la mesa.')
  const initial = snapshot.data as TeamSnapshot | null
  if (snapshot.error || !initial?.members.some(member => member.user_id === owner) || profile.error) throw new Error('Esta mesa no está disponible para tu cuenta.')
  return { initial, userId: owner, isGuest: false, salonSlug: profile.data?.active_salon ?? 'clasico' }
}

export async function loadGame(tableId: string, owner: string): Promise<
  { table: Table; props: ComponentProps<typeof GameClient> | null }
> {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || user?.id !== owner || user.is_anonymous) throw new Error('Entrá con tu cuenta para jugar online.')
  const { data: row, error: tableError } = await client.from('tables').select('*').eq('id', tableId).single()
  if (tableError || !row || ![row.creator_id, row.opponent_id].includes(owner)) throw new Error('Esta mesa no está disponible para tu cuenta.')
  const table = row as Table
  if ((await client.auth.getSession()).data.session?.user.id !== owner) throw new Error('La cuenta cambió. Volvé a abrir la partida.')
  if (table.status === 'waiting') return { table, props: null }
  // start_game ya es idempotente. Reabrir la pantalla no vuelve a repartir.
  const { data: game, error: gameError } = await client.rpc('start_game', { p_game_id: tableId })
  if (gameError || !game || ![game.player1_id, game.player2_id].includes(owner)) throw new Error(gameError?.message || 'No pudimos abrir la partida.')
  const opponentId = game.player1_id === owner ? game.player2_id : game.player1_id
  const [hand, profile, opponent, medal, opponentMedal, rival, clock] = await Promise.all([
    client.from('game_hands').select('cards').eq('game_id', tableId).eq('player_id', owner).single(),
    client.from('profiles').select('active_salon,avatar_url,active_frame,active_accessory').eq('id', owner).single(),
    client.from('profiles').select('avatar_url,active_frame,active_accessory,is_bot').eq('id', opponentId).single(),
    client.rpc('active_medal_for', { p_uid: owner }),
    client.rpc('active_medal_for', { p_uid: opponentId }),
    game.campaign_rival_id ? client.from('campaign_rivals').select('slug').eq('id', game.campaign_rival_id).single() : Promise.resolve({ data: null, error: null }),
    client.rpc('app_compatibility'),
  ])
  if ((await client.auth.getSession()).data.session?.user.id !== owner) throw new Error('La cuenta cambió. Volvé a abrir la partida.')
  if (hand.error || profile.error || opponent.error || clock.error || !Number.isFinite(clock.data?.serverNow)) throw new Error('No pudimos cargar la mesa y tus cartas. Reintentá.')
  return { table, props: { game, serverNow: clock.data.serverNow, currentUserId: owner, myHand: (hand.data?.cards ?? []) as Card[],
    salonSlug: profile.data?.active_salon ?? 'clasico', myAvatarUrl: profile.data?.avatar_url,
    myFrame: profile.data?.active_frame, myAccessory: profile.data?.active_accessory,
    myMedal: medal.data ?? 'ninguno', opponentAvatarUrl: opponent.data?.avatar_url,
    opponentFrame: opponent.data?.active_frame, opponentAccessory: opponent.data?.active_accessory,
    opponentMedal: opponentMedal.data ?? 'ninguno', opponentIsBot: !!opponent.data?.is_bot,
    campaignRivalSlug: rival.data?.slug ?? null, tournamentId: row.tournament_id ?? null } }
}
