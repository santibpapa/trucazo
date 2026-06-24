/**
 * Prueba focalizada del modo "a 15": que el objetivo se propague a la partida
 * y que la falta envido valga según ese objetivo (15 - max(scores)).
 * Crea 2 usuarios de prueba. Correr: npx tsx scripts/e2e_target15.ts
 */
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
let bad = 0
const assert = (c: boolean, m: string) => c ? console.log('  ✓ ' + m) : (bad++, console.error('  ✗ ' + m))
const nc = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function signUp(c: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const email = `truco-t15-${tag}-${rnd}@example.com`, username = `t15_${tag}_${rnd}`
  const { data, error } = await c.auth.signUp({ email, password: 'Test1234!', options: { data: { username } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error('Confirm email activado: desactivalo para correr el test')
  const uid = data.user!.id
  const { error: pErr } = await c.from('profiles').insert({ id: uid, username, coins: 1000 })
  if (pErr) throw new Error(`perfil ${tag}: ${pErr.message}`)
  return { uid, username }
}

async function main() {
  console.log('Prueba modo "a 15" ...\n')
  const A = nc(), B = nc()
  const a = await signUp(A, 'A'); const b = await signUp(B, 'B')

  const { data: table, error: ctErr } = await A.rpc('create_table', {
    p_name: 'Mesa a 15', p_bet: 10, p_is_private: false, p_private_code: null, p_target_score: 15,
  })
  if (ctErr || !table) throw new Error('create_table: ' + (ctErr?.message ?? 'sin datos'))
  assert(table.target_score === 15, `la mesa quedó a ${table.target_score}`)
  const gid = table.id

  const { error: jErr } = await B.rpc('join_table', { p_table_id: gid })
  if (jErr) throw new Error('join_table: ' + jErr.message)

  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })
  const { data: game } = await A.from('games').select('*').eq('id', gid).single()
  assert((game as any).target_score === 15, `la partida quedó a ${(game as any).target_score}`)

  // A es mano: canta falta envido. Con 0-0, vale 15 - max(0,0) = 15.
  const { data: sang, error: sErr } = await A.rpc('sing_envido', { p_game_id: gid, p_type: 'falta_envido' })
  if (sErr) throw new Error('sing_envido: ' + sErr.message)
  assert((sang as any).envido_state.value === 15, `falta envido a 15 vale ${(sang as any).envido_state.value} (esperado 15)`)

  // limpieza
  await A.from('tables').delete().eq('id', gid)

  console.log('')
  console.log(bad === 0 ? '✅ Modo "a 15" OK (objetivo propagado + falta envido correcta).' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
