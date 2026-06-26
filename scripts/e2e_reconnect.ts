/**
 * Prueba de "volver a la partida en curso": la consulta del lobby detecta la
 * partida 'playing' del jugador (vía RLS) y deja de detectarla al terminar.
 * Correr: npx tsx scripts/e2e_reconnect.ts
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

// misma consulta que usa lobby/page.tsx
const activeGame = async (c: SupabaseClient) =>
  (await c.from('games').select('id').eq('status', 'playing').order('updated_at', { ascending: false }).limit(1).maybeSingle()).data as any

async function signUp(c: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const { data, error } = await c.auth.signUp({ email: `truco-rc-${tag}-${rnd}@example.com`, password: 'Test1234!', options: { data: { username: `rc_${tag}_${rnd}` } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error('Confirm email activado: desactivalo para el test')
  const uid = data.user!.id
  await c.from('profiles').insert({ id: uid, username: `rc_${tag}_${rnd}`, coins: 1000 })
  return uid
}

async function main() {
  console.log('Prueba de volver a la partida ...\n')
  const A = nc(), B = nc()
  await signUp(A, 'A'); await signUp(B, 'B')

  assert(await activeGame(A) === null, 'sin partidas, A no tiene partida en curso')

  const { data: table } = await A.rpc('create_table', { p_name: 'Mesa RC', p_bet: 10, p_is_private: false, p_private_code: null, p_target_score: 30 })
  const gid = table.id
  await B.rpc('join_table', { p_table_id: gid })
  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })

  assert((await activeGame(A))?.id === gid, 'A detecta su partida en curso')
  assert((await activeGame(B))?.id === gid, 'B detecta su partida en curso')

  await B.rpc('forfeit', { p_game_id: gid }) // termina

  assert(await activeGame(A) === null, 'al terminar, A ya no tiene partida en curso')

  await A.from('tables').delete().eq('id', gid)

  console.log('')
  console.log(bad === 0 ? '✅ Volver a la partida OK.' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
