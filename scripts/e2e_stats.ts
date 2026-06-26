/**
 * Prueba de estadísticas: finish_game suma games_played/won/lost.
 * Correr: npx tsx scripts/e2e_stats.ts
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
const prof = async (c: SupabaseClient, id: string) =>
  (await c.from('profiles').select('games_played, games_won, games_lost').eq('id', id).single()).data as any

async function signUp(c: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const { data, error } = await c.auth.signUp({ email: `truco-st-${tag}-${rnd}@example.com`, password: 'Test1234!', options: { data: { username: `st_${tag}_${rnd}` } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error('Confirm email activado: desactivalo para el test')
  const uid = data.user!.id
  await c.from('profiles').insert({ id: uid, username: `st_${tag}_${rnd}`, coins: 1000 })
  return uid
}

async function main() {
  console.log('Prueba de estadísticas ...\n')
  const A = nc(), B = nc()
  const a = await signUp(A, 'A'); const b = await signUp(B, 'B')

  const before = await prof(A, a)
  assert(before.games_played === 0, 'A arranca con 0 jugadas')

  const { data: table } = await A.rpc('create_table', { p_name: 'Mesa ST', p_bet: 10, p_is_private: false, p_private_code: null, p_target_score: 30 })
  const gid = table.id
  await B.rpc('join_table', { p_table_id: gid })
  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })
  await B.rpc('forfeit', { p_game_id: gid }) // gana A

  const pa = await prof(A, a), pb = await prof(B, b)
  assert(pa.games_played === 1 && pa.games_won === 1 && pa.games_lost === 0, `A: jugadas=${pa.games_played} ganadas=${pa.games_won} perdidas=${pa.games_lost}`)
  assert(pb.games_played === 1 && pb.games_won === 0 && pb.games_lost === 1, `B: jugadas=${pb.games_played} ganadas=${pb.games_won} perdidas=${pb.games_lost}`)

  await A.from('tables').delete().eq('id', gid)

  console.log('')
  console.log(bad === 0 ? '✅ Estadísticas OK.' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
