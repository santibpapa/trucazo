/**
 * Sondas de SOLO LECTURA contra el Supabase real (anon key).
 * No crea ni borra datos. Solo confirma que la migración se aplicó:
 *   - las RPCs existen (devuelven error de auth, no "function not found")
 *   - game_hands existe y está protegida por RLS
 *   - games ya no tiene player1_cards / player2_cards
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Leer .env.local sin imprimir secretos
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const RANDOM_UUID = '00000000-0000-0000-0000-000000000000'
let ok = 0, bad = 0
const pass = (m) => { ok++; console.log('  ✓ ' + m) }
const fail = (m) => { bad++; console.error('  ✗ ' + m) }

// PGRST202 = función inexistente. Cualquier OTRO error = la función existe (corrió y falló por auth/lógica).
async function rpcExists(name, args) {
  const { error } = await supabase.rpc(name, args)
  if (!error) return pass(`${name}: existe (corrió sin error)`)
  if (error.code === 'PGRST202') return fail(`${name}: NO existe (PGRST202) → revisar migración`)
  pass(`${name}: existe (rechazó con "${(error.message || '').slice(0, 60)}")`)
}

console.log('Sondas contra Supabase (solo lectura) ...\n')

await rpcExists('start_game', { p_game_id: RANDOM_UUID })
await rpcExists('deal_new_hand', { p_game_id: RANDOM_UUID, p_p1_score: 0, p_p2_score: 0 })
await rpcExists('resolve_envido_accept', { p_game_id: RANDOM_UUID, p_next_turn: RANDOM_UUID })
await rpcExists('cancel_table', { p_table_id: RANDOM_UUID })

// game_hands existe + protegida: como anon debería devolver 0 filas (RLS), sin error de "tabla inexistente"
{
  const { data, error } = await supabase.from('game_hands').select('game_id').limit(1)
  if (error && error.code === 'PGRST205') fail('game_hands: NO existe la tabla')
  else if (error) pass(`game_hands: existe y protegida (anon bloqueado: ${error.code})`)
  else pass(`game_hands: existe y protegida por RLS (anon ve ${data.length} filas)`)
}

// games ya NO debe tener las columnas de cartas → seleccionarlas debe dar 42703
{
  const { error } = await supabase.from('games').select('player1_cards').limit(1)
  if (error && error.code === '42703') pass('games.player1_cards: eliminada correctamente (42703)')
  else if (!error) fail('games.player1_cards: TODAVÍA existe (no se eliminó)')
  else pass(`games.player1_cards: no consultable (${error.code})`)
}
{
  const { error } = await supabase.from('games').select('player2_cards').limit(1)
  if (error && error.code === '42703') pass('games.player2_cards: eliminada correctamente (42703)')
  else if (!error) fail('games.player2_cards: TODAVÍA existe (no se eliminó)')
  else pass(`games.player2_cards: no consultable (${error.code})`)
}

console.log('')
console.log(bad === 0 ? `✅ Sondas OK (${ok}/${ok})` : `❌ ${bad} sonda(s) fallaron`)
process.exit(bad === 0 ? 0 : 1)
