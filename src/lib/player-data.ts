import type { SupabaseClient } from '@supabase/supabase-js'
import type { Accessory, Frame, GameHistory, Profile, Salon } from './types'

// Las mismas consultas para web y app; RLS y las RPC conservan la autoridad.
export async function loadProfile(client: SupabaseClient, owner: string) {
  const [profile, history, medals] = await Promise.all([
    client.from('profiles').select('*').eq('id', owner).single(),
    client.from('game_history').select('*').eq('player_id', owner).order('created_at', { ascending: false }).limit(20),
    client.rpc('player_medals', { p_uid: owner }),
  ])
  for (const result of [profile, history, medals]) if (result.error) throw result.error
  return { profile: profile.data as Profile, history: (history.data ?? []) as GameHistory[], earnedMedals: (medals.data ?? []) as string[] }
}

export interface RankedPlayer {
  id: string
  username: string
  avatar_url: string | null
  active_frame: string | null
  games_won: number
  games_played: number
}

export async function loadRanking(client: SupabaseClient, owner: string) {
  const [top, mine] = await Promise.all([
    client.from('profiles').select('id,username,avatar_url,active_frame,games_won,games_played')
      .eq('is_bot', false).gt('games_won', 0).order('games_won', { ascending: false })
      .order('games_played', { ascending: true }).order('id', { ascending: true }).limit(50),
    client.from('profiles').select('id,username,avatar_url,active_frame,games_won,games_played').eq('id', owner).single(),
  ])
  if (top.error || mine.error) throw top.error || mine.error
  const players = (top.data ?? []) as RankedPlayer[], myRow = mine.data as RankedPlayer
  const myIndex = players.findIndex(p => p.id === owner)
  const ids = Array.from(new Set([...players.map(p => p.id), owner]))
  const [medals, ahead] = await Promise.all([
    client.rpc('get_active_medals', { p_ids: ids }),
    myIndex < 0 && myRow.games_won > 0
      ? client.from('profiles').select('id', { count: 'exact', head: true }).eq('is_bot', false)
        .gt('games_won', myRow.games_won)
      : Promise.resolve({ count: 0, error: null }),
  ])
  if (medals.error || ahead.error) throw medals.error || ahead.error
  return { players, myRow, myIndex, myRank: myIndex >= 0 ? myIndex + 1 : myRow.games_won > 0 ? (ahead.count ?? 0) + 1 : null,
    medals: (medals.data ?? []) as { id: string; medal: string }[] }
}

export async function loadShop(client: SupabaseClient, owner: string) {
  const [profile, salons, ownedSalons, frames, ownedFrames, accessories, ownedAccessories] = await Promise.all([
    client.from('profiles').select('coins,active_salon,active_frame,active_accessory,avatar_url,username').eq('id', owner).single(),
    client.from('salons').select('*').order('sort_order'),
    client.from('profile_salons').select('salon_slug').eq('profile_id', owner),
    client.from('frames').select('*').order('sort_order'),
    client.from('profile_frames').select('frame_slug').eq('profile_id', owner),
    client.from('accessories').select('*').order('sort_order'),
    client.from('profile_accessories').select('accessory_slug').eq('profile_id', owner),
  ])
  for (const result of [profile, salons, ownedSalons, frames, ownedFrames, accessories, ownedAccessories]) if (result.error) throw result.error
  const p = profile.data!
  return { initialCoins: p.coins as number, initialActiveSalon: p.active_salon ?? 'clasico',
    salons: (salons.data ?? []) as Salon[], initialOwnedSalons: (ownedSalons.data ?? []).map(o => o.salon_slug as string),
    initialActiveFrame: p.active_frame ?? 'ninguno', frames: (frames.data ?? []) as Frame[],
    initialOwnedFrames: (ownedFrames.data ?? []).map(o => o.frame_slug as string),
    initialActiveAccessory: p.active_accessory ?? 'ninguno', accessories: (accessories.data ?? []) as Accessory[],
    initialOwnedAccessories: (ownedAccessories.data ?? []).map(o => o.accessory_slug as string),
    avatarUrl: p.avatar_url ?? null, username: p.username as string }
}
