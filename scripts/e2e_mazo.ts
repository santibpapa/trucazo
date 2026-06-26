/**
 * Prueba de "irse al mazo" con delay (awaiting_deal).
 * Correr: npx tsx scripts/e2e_mazo.ts
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
const getGame = async (c: SupabaseClient, gid: string) => (await c.from('games').select('*').eq('id', gid).single()).data as any
const hand = async (c: SupabaseClient, gid: string, uid: string) => ((await c.from('game_hands').select('cards').eq('game_id', gid).eq('player_id', uid).single()).data?.cards ?? []) as any[]

async function signUp(c: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const { data, error } = await c.auth.signUp({ email: `truco-mz-${tag}-${rnd}@example.com`, password: 'Test1234!', options: { data: { username: `mz_${tag}_${rnd}` } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error('Confirm email activado: desactivalo para el test')
  const uid = data.user!.id
  await c.from('profiles').insert({ id: uid, username: `mz_${tag}_${rnd}`, coins: 1000 })
  return uid
}

async function main() {
  console.log('Prueba de irse al mazo (con delay) ...\n')
  const A = nc(), B = nc()
  const a = await signUp(A, 'A'); const b = await signUp(B, 'B')

  const { data: table } = await A.rpc('create_table', { p_name: 'Mesa MZ', p_bet: 10, p_is_private: false, p_private_code: null, p_target_score: 30 })
  const gid = table.id
  await B.rpc('join_table', { p_table_id: gid })
  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })

  const g0 = await getGame(A, gid)
  const mover = g0.current_turn === a ? A : B
  const otherScoreField = g0.current_turn === a ? 'player2_score' : 'player1_score'

  // el de turno se va al mazo
  const { data: mz, error: mzErr } = await mover.rpc('irse_al_mazo', { p_game_id: gid })
  if (mzErr) throw new Error('irse_al_mazo: ' + mzErr.message)
  assert(mz.awaiting_deal === true, 'irse al mazo deja awaiting_deal (cierre visible)')
  assert(mz[otherScoreField] === 1, `el rival cobró el punto en juego (${mz[otherScoreField]})`)
  assert(mz.hand_number === g0.hand_number, 'todavía no se repartió la mano nueva')

  // durante awaiting_deal no se puede jugar ni irse al mazo de nuevo
  {
    const { error } = await mover.rpc('irse_al_mazo', { p_game_id: gid })
    assert(!!error, 'no se puede ir al mazo durante el cierre: ' + (error?.message ?? ''))
  }

  // avanzar (lo haría el delay del cliente)
  const { data: ng } = await A.rpc('advance_hand', { p_game_id: gid })
  assert(ng.awaiting_deal === false && ng.hand_number === g0.hand_number + 1, 'advance_hand repartió la mano nueva')
  assert((await hand(A, gid, a)).length === 3, 'A tiene 3 cartas nuevas')

  await A.from('tables').delete().eq('id', gid)

  console.log('')
  console.log(bad === 0 ? '✅ Irse al mazo OK.' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
