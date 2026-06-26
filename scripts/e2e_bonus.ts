/**
 * Prueba del bonus anti-quiebra (contra Supabase real, crea 1 usuario).
 * Correr: npx tsx scripts/e2e_bonus.ts
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

async function main() {
  console.log('Prueba de bonus anti-quiebra ...\n')
  const A = nc()
  const rnd = Math.random().toString(36).slice(2, 8)
  const { data: su, error: suErr } = await A.auth.signUp({ email: `truco-bn-${rnd}@example.com`, password: 'Test1234!', options: { data: { username: `bn_${rnd}` } } })
  if (suErr) throw new Error('signUp: ' + suErr.message)
  if (!su.session) throw new Error('Confirm email activado: desactivalo para el test')
  const a = su.user!.id
  await A.from('profiles').insert({ id: a, username: `bn_${rnd}`, coins: 1000 })

  // Con monedas, no se puede reclamar
  {
    const { error } = await A.rpc('claim_bonus')
    assert(!!error, 'con monedas, claim_bonus se rechaza: ' + (error?.message ?? ''))
  }

  // Quedar sin monedas: crear una mesa apostando todo (1000) → saldo 0
  const { data: table, error: ctErr } = await A.rpc('create_table', { p_name: 'Todo o nada', p_bet: 1000, p_is_private: true, p_private_code: 'BONUS1', p_target_score: 30 })
  if (ctErr || !table) throw new Error('create_table: ' + (ctErr?.message ?? ''))
  assert(await coins(A, a) === 0, 'quedó sin monedas tras apostar todo (0)')

  // Ahora sí, reclamar restablece a 100
  {
    const { data, error } = await A.rpc('claim_bonus')
    if (error) throw new Error('claim_bonus: ' + error.message)
    assert(data === 100, `claim_bonus devolvió ${data} (esperado 100)`)
    assert(await coins(A, a) === 100, 'el saldo quedó en 100')
  }

  // Con 100, ya no se puede volver a reclamar
  {
    const { error } = await A.rpc('claim_bonus')
    assert(!!error, 'con 100 monedas, claim_bonus se rechaza de nuevo')
  }

  await A.from('tables').delete().eq('id', table.id)

  console.log('')
  console.log(bad === 0 ? '✅ Bonus anti-quiebra OK.' : `❌ ${bad} fallaron.`)
  process.exit(bad === 0 ? 0 : 1)
}
main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
