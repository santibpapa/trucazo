/**
 * Prueba de la revancha (contra Supabase real, crea 2 usuarios).
 * Correr: npx tsx scripts/e2e_rematch.ts
 */
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
let bad = 0
const assert = (c: boolean, m: string) => c ? console.log('  ✓ ' + m) : (bad++, console.error('  ✗ ' + m))
const nc = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const coins = async (c: SupabaseClient, id: string) => (await c.from('profiles').select('coins').eq('id', id).single()).data!.coins

async function signUp(c: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const { data, error } = await c.auth.signUp({ email: `truco-rm-${tag}-${rnd}@example.com`, password: 'Test1234!', options: { data: { username: `rm_${tag}_${rnd}` } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error('Confirm email activado: desactivalo para el test')
  const uid = data.user!.id
  const { error: pErr } = await c.from('profiles').insert({ id: uid, username: `rm_${tag}_${rnd}`, coins: 1000 })
  if (pErr) throw new Error(`perfil ${tag}: ${pErr.message}`)
  return uid
}

async function main() {
  console.log('Prueba de revancha ...\n')
  const A = nc(), B = nc()
  const a = await signUp(A, 'A'); const b = await signUp(B, 'B')

  const { data: table, error: ctErr } = await A.rpc('create_table', { p_name: 'Mesa RM', p_bet: 10, p_is_private: false, p_private_code: null, p_target_score: 30 })
  if (ctErr || !table) throw new Error('create_table: ' + (ctErr?.message ?? ''))
  const gid = table.id
  await B.rpc('join_table', { p_table_id: gid })
  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })

  // Terminar: B abandona → gana A
  await B.rpc('forfeit', { p_game_id: gid })
  const fin = (await A.from('games').select('*').eq('id', gid).single()).data as any
  assert(fin.status === 'finished' && fin.winner_id === a, 'partida terminada, gana A')

  const aBefore = await coins(A, a), bBefore = await coins(B, b)

  // A pide revancha → 1/2, sin nueva partida
  const r1 = (await A.rpc('request_rematch', { p_game_id: gid })).data as any
  assert(r1.rematch_p1 === true && r1.rematch_game_id === null, 'A pidió revancha (1/2, sin nueva partida)')

  // chequeo de trampa: A no puede pedir dos veces y avanzar solo
  const r1b = (await A.rpc('request_rematch', { p_game_id: gid })).data as any
  assert(r1b.rematch_game_id === null, 'A pidiendo de nuevo no crea la revancha solo')

  // B pide revancha → se crea la nueva partida
  const r2 = (await B.rpc('request_rematch', { p_game_id: gid })).data as any
  assert(!!r2.rematch_game_id, 'con ambos votos se creó la revancha (rematch_game_id seteado)')
  const newId = r2.rematch_game_id

  // se descontó la apuesta a cada uno (per_stake = bet/2 = 10)
  assert(await coins(A, a) === aBefore - 10, `a A se le descontó la apuesta de la revancha (${aBefore} → ${aBefore - 10})`)
  assert(await coins(B, b) === bBefore - 10, `a B se le descontó la apuesta de la revancha (${bBefore} → ${bBefore - 10})`)

  // la nueva partida está lista
  const ng = (await A.from('games').select('*').eq('id', newId).single()).data as any
  assert(!!ng && ng.status === 'playing', 'la nueva partida existe y está en juego')
  assert(ng.player1_id === a && ng.player2_id === b, 'mismos jugadores en la revancha')
  assert(ng.target_score === 30 && ng.bet === fin.bet, 'mismo objetivo y mismo pozo')
  const myHand = (await A.from('game_hands').select('cards').eq('game_id', newId).eq('player_id', a).single()).data as any
  assert((myHand?.cards?.length ?? 0) === 3, 'A recibió 3 cartas nuevas en la revancha')

  // limpieza
  await A.from('tables').delete().eq('id', gid)
  await A.from('tables').delete().eq('id', newId)

  console.log('')
  console.log(bad === 0 ? '✅ Revancha OK.' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
