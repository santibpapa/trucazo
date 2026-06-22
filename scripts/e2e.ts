/**
 * Test END-TO-END contra el Supabase real, con 2 usuarios de prueba.
 * Reproduce exactamente lo que hace el cliente (RPCs + writes) y verifica:
 *   - que cada jugador SOLO ve su propia mano (game_hands + RLS)  ← el fix central
 *   - reparto, envido aceptado (cálculo server-side), jugar una mano, repartir de nuevo
 *   - finish_game mueve monedas e inserta historial
 *   - seguridad: no se puede autoeditar coins; finish_game rechaza ganador no-jugador
 *
 * ⚠️ Crea datos reales (2 usuarios de auth + perfiles + 1 partida) que quedan
 *    en tu proyecto. Los usuarios de auth no se pueden borrar con la anon key.
 *
 * Correr:  npx tsx scripts/e2e.ts
 */
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { compareCards } from '../src/lib/truco'
import type { Card } from '../src/lib/truco'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let bad = 0
const ok = (m: string) => console.log('  ✓ ' + m)
const fail = (m: string) => { bad++; console.error('  ✗ ' + m) }
const assert = (c: boolean, m: string) => c ? ok(m) : fail(m)
const sameCard = (a: Card, b: Card) => a.value === b.value && a.suit === b.suit

function newClient(): SupabaseClient {
  return createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function signUpUser(client: SupabaseClient, tag: string) {
  const rnd = Math.random().toString(36).slice(2, 8)
  const email = `truco-e2e-${tag}-${rnd}@example.com`
  const password = 'Test1234!'
  const username = `e2e_${tag}_${rnd}`
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { username } } })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error(
    `signUp ${tag}: no devolvió sesión → "Confirm email" está activado en Auth. ` +
    `Desactivalo temporalmente (Authentication → Providers → Email → Confirm email) y reintentá.`)
  const uid = data.user!.id
  const { error: pErr } = await client.from('profiles').insert({ id: uid, username, coins: 1000 })
  if (pErr) throw new Error(`crear perfil ${tag}: ${pErr.message}`)
  return { uid, username }
}

async function getGame(client: SupabaseClient, gid: string) {
  const { data } = await client.from('games').select('*').eq('id', gid).single()
  return data as any
}
async function getMyHand(client: SupabaseClient, gid: string, uid: string): Promise<Card[]> {
  const { data } = await client.from('game_hands').select('cards').eq('game_id', gid).eq('player_id', uid).single()
  return ((data?.cards as Card[]) ?? [])
}

// --- lógica de resolución (igual que el GameClient) ---
type RR = { round: number; winner_id: string | null }
function computeRoundResults(played: any[], p1: string, p2: string): RR[] {
  const res: RR[] = []
  for (let r = 1; r <= 3; r++) {
    const rc = played.filter(pc => pc.round === r)
    if (rc.length < 2) break
    const c1 = rc.find((pc: any) => pc.player_id === p1)?.card
    const c2 = rc.find((pc: any) => pc.player_id === p2)?.card
    let w: string | null = null
    if (c1 && c2) { const cmp = compareCards(c1, c2); w = cmp === 1 ? p1 : cmp === -1 ? p2 : null }
    res.push({ round: r, winner_id: w })
  }
  return res
}
function handWinner(res: RR[], mano: string, p1: string, p2: string): string | null | undefined {
  const w1 = res.filter(r => r.winner_id === p1).length
  const w2 = res.filter(r => r.winner_id === p2).length
  const ties = res.filter(r => r.winner_id === null).length
  if (w1 >= 2) return p1
  if (w2 >= 2) return p2
  if (res.length === 3) { if (w1 > w2) return p1; if (w2 > w1) return p2; return mano }
  if (ties === 1 && res.length === 2) { const nt = res.find(r => r.winner_id !== null); if (nt) return nt.winner_id }
  return undefined
}

async function main() {
  console.log('Test E2E contra Supabase real (crea 2 usuarios de prueba) ...\n')
  const A = newClient(), B = newClient()

  console.log('• Registro de usuarios')
  const a = await signUpUser(A, 'A')
  const b = await signUpUser(B, 'B')
  ok(`usuario A=${a.username}  usuario B=${b.username}`)

  console.log('\n• A crea mesa (apuesta 10), B se une')
  const { data: table, error: ctErr } = await A.rpc('create_table', { p_name: 'Mesa E2E', p_bet: 10, p_is_private: false, p_private_code: null })
  if (ctErr || !table) throw new Error('create_table: ' + (ctErr?.message ?? 'sin datos'))
  const gid = table.id
  const { error: jtErr } = await B.rpc('join_table', { p_table_id: gid })
  if (jtErr) throw new Error('join_table: ' + jtErr.message)
  ok('mesa creada y unida (id ' + gid.slice(0, 8) + '…)')

  console.log('\n• start_game (ambos) + reparto')
  await A.rpc('start_game', { p_game_id: gid })
  await B.rpc('start_game', { p_game_id: gid })
  let game = await getGame(A, gid)
  assert(!!game, 'la partida existe')
  assert(game.player1_id === a.uid && game.player2_id === b.uid, 'A es player1, B es player2')
  assert(game.mano_player === a.uid && game.current_turn === a.uid, 'A es mano y arranca')

  console.log('\n• 🔒 SEGURIDAD: cada uno solo ve su mano')
  const aHand = await getMyHand(A, gid, a.uid)
  const bHand = await getMyHand(B, gid, b.uid)
  assert(aHand.length === 3 && bHand.length === 3, 'cada jugador recibió 3 cartas')
  const { data: handsSeenByA } = await A.from('game_hands').select('player_id, cards').eq('game_id', gid)
  const { data: handsSeenByB } = await B.from('game_hands').select('player_id, cards').eq('game_id', gid)
  assert(handsSeenByA!.length === 1 && handsSeenByA![0].player_id === a.uid, 'A solo ve 1 fila de game_hands (la suya)')
  assert(handsSeenByB!.length === 1 && handsSeenByB![0].player_id === b.uid, 'B solo ve 1 fila de game_hands (la suya)')
  const aSeesB = (handsSeenByA ?? []).some(h => h.player_id === b.uid)
  const bSeesA = (handsSeenByB ?? []).some(h => h.player_id === a.uid)
  assert(!aSeesB, 'A NO puede ver la mano de B')
  assert(!bSeesA, 'B NO puede ver la mano de A')

  console.log('\n• Envido: A canta (sing_envido), B acepta (respond_envido) — server-side')
  const { data: sang, error: sErr } = await A.rpc('sing_envido', { p_game_id: gid, p_type: 'envido' })
  if (sErr) throw new Error('sing_envido: ' + sErr.message)
  assert((sang as any).envido_state.status === 'envido', 'sing_envido dejó el envido cantado (valor=' + (sang as any).envido_state.value + ')')
  assert((sang as any).current_turn === b.uid, 'tras cantar, el turno pasó a B')
  // chequeo de trampa: A no puede responder su propio envido
  {
    const { error } = await A.rpc('respond_envido', { p_game_id: gid, p_accept: true })
    assert(!!error, 'respond_envido rechaza responder tu propio canto: ' + (error?.message ?? ''))
  }
  const { data: envRes, error: envErr } = await B.rpc('respond_envido', { p_game_id: gid, p_accept: true })
  if (envErr) throw new Error('respond_envido: ' + envErr.message)
  game = envRes as any
  const expWinnerScore = 2
  const p1pts = game.envido_state.player1_points, p2pts = game.envido_state.player2_points
  assert(game.envido_state.status === 'accepted', 'envido quedó "accepted"')
  assert(typeof p1pts === 'number' && typeof p2pts === 'number', `puntos calculados (A=${p1pts}, B=${p2pts})`)
  const envWinner = p1pts > p2pts ? a.uid : p2pts > p1pts ? b.uid : game.mano_player
  assert(game.envido_state.winner_id === envWinner, 'ganador del envido correcto (mayor puntos; empate→mano)')
  const totalAfterEnv = game.player1_score + game.player2_score
  assert(totalAfterEnv === expWinnerScore, `se sumaron ${expWinnerScore} pts del envido (total=${totalAfterEnv})`)
  assert(game.current_turn === a.uid, 'el turno volvió a A tras el envido')

  console.log('\n• Truco: A canta (sing_truco), B acepta (respond_truco) — server-side')
  const { data: tr, error: trErr } = await A.rpc('sing_truco', { p_game_id: gid, p_type: 'truco' })
  if (trErr) throw new Error('sing_truco: ' + trErr.message)
  assert((tr as any).truco_state.status === 'truco' && (tr as any).truco_state.value === 2, 'truco cantado (valor 2)')
  assert((tr as any).current_turn === b.uid, 'tras cantar truco, responde B')
  {
    const { error } = await A.rpc('respond_truco', { p_game_id: gid, p_accept: true })
    assert(!!error, 'respond_truco rechaza responder tu propio canto: ' + (error?.message ?? ''))
  }
  const { data: trA, error: trAErr } = await B.rpc('respond_truco', { p_game_id: gid, p_accept: true })
  if (trAErr) throw new Error('respond_truco: ' + trAErr.message)
  assert((trA as any).truco_state.status === 'accepted', 'truco quedó aceptado')
  assert((trA as any).current_turn === a.uid, 'tras aceptar, juega el líder de la ronda (A)')

  console.log('\n• 🔒 SEGURIDAD: jugar fuera de turno / carta inexistente (turno de A)')
  {
    const bh = await getMyHand(B, gid, b.uid)
    const { error } = await B.rpc('play_card', { p_game_id: gid, p_card: bh[0] })
    assert(!!error, 'play_card rechaza jugar fuera de turno: ' + (error?.message ?? ''))
  }
  {
    const { error } = await A.rpc('play_card', { p_game_id: gid, p_card: { suit: 'oro', value: 99, rank: 0 } })
    assert(!!error, 'play_card rechaza una carta que no tenés: ' + (error?.message ?? ''))
  }

  console.log('\n• Se juega una mano completa vía play_card (resolución server-side)')
  const startHand = (await getGame(A, gid)).hand_number
  let safety = 0
  while (true) {
    if (++safety > 12) throw new Error('la mano no se resuelve')
    const gg = await getGame(A, gid)
    if (gg.status === 'finished' || gg.hand_number > startHand) { game = gg; break }
    const cur = gg.current_turn
    const client = cur === a.uid ? A : B
    const hand = await getMyHand(client, gid, cur)
    if (hand.length === 0) throw new Error('jugador sin cartas')
    const { data, error } = await client.rpc('play_card', { p_game_id: gid, p_card: hand[0] })
    if (error) throw new Error('play_card: ' + error.message)
    game = data as any
  }
  assert(game.hand_number === startHand + 1 || game.status === 'finished', 'la mano la resolvió el servidor')
  const newAHand = await getMyHand(A, gid, a.uid)
  assert(game.status === 'finished' || newAHand.length === 3, 'se repartió mano nueva (A tiene 3)')
  ok('mano jugada y resuelta por el servidor (play_card)')

  console.log('\n• Presencia + reclamar victoria (server-side)')
  await A.rpc('touch_presence', { p_game_id: gid })
  await B.rpc('touch_presence', { p_game_id: gid })
  ok('touch_presence funciona para ambos')
  {
    const { error } = await A.rpc('claim_victory', { p_game_id: gid })
    assert(!!error, 'claim_victory rechazado mientras el rival sigue activo: ' + (error?.message ?? ''))
  }

  console.log('\n• 🔒 SEGURIDAD: autoeditar monedas debe estar bloqueado')
  const coinsBefore = (await A.from('profiles').select('coins').eq('id', a.uid).single()).data!.coins
  await A.from('profiles').update({ coins: 999999 }).eq('id', a.uid)
  const coinsAfter = (await A.from('profiles').select('coins').eq('id', a.uid).single()).data!.coins
  assert(coinsBefore === coinsAfter, `coins no cambió por update directo (${coinsBefore} → ${coinsAfter})`)

  console.log('\n• 🔒 SEGURIDAD (Etapa 5): escrituras directas a la partida bloqueadas')
  {
    const before = await getGame(A, gid)
    await A.from('games').update({ player1_score: 99 }).eq('id', gid)
    const after = await getGame(A, gid)
    assert(before.player1_score === after.player1_score, `no se puede inflar el score directo (${before.player1_score} → ${after.player1_score})`)
  }
  {
    const before = await getMyHand(A, gid, a.uid)
    await A.from('game_hands').update({ cards: [] }).eq('game_id', gid).eq('player_id', a.uid)
    const after = await getMyHand(A, gid, a.uid)
    assert(before.length === after.length, `no se puede vaciar/editar la mano directo (${before.length} → ${after.length})`)
  }
  {
    const { error } = await A.rpc('finish_game', { p_game_id: gid, p_winner_id: a.uid, p_p1_score: 30, p_p2_score: 0 })
    assert(!!error, 'finish_game ya no es invocable directo por el cliente: ' + (error?.message ?? ''))
  }

  console.log('\n• Terminar la partida vía forfeit (B abandona → gana A)')
  const aBefore = (await A.from('profiles').select('coins').eq('id', a.uid).single()).data!.coins
  const bBefore = (await B.from('profiles').select('coins').eq('id', b.uid).single()).data!.coins
  const { error: ffErr } = await B.rpc('forfeit', { p_game_id: gid })
  if (ffErr) throw new Error('forfeit: ' + ffErr.message)
  const aAfter = (await A.from('profiles').select('coins').eq('id', a.uid).single()).data!.coins
  const bAfter = (await B.from('profiles').select('coins').eq('id', b.uid).single()).data!.coins
  const pot = game.bet // games.bet = apuesta*2 = 20
  assert(aAfter === aBefore + pot, `A (ganador) cobró el pozo (+${pot}): ${aBefore} → ${aAfter}`)
  assert(bAfter === bBefore, `B (abandonó) no cambia en el finish: ${bBefore} → ${bAfter}`)
  const finished = await getGame(A, gid)
  assert(finished.status === 'finished' && finished.winner_id === a.uid, 'la partida quedó finished con A ganador')
  const { data: histA } = await A.from('game_history').select('result').eq('player_id', a.uid)
  assert((histA ?? []).some(h => h.result === 'win'), 'se insertó historial "win" para A')

  console.log('\n• forfeit de nuevo respeta el estado (ya terminada)')
  {
    const { error } = await A.rpc('forfeit', { p_game_id: gid })
    assert(!!error, 'forfeit rechaza una partida ya terminada: ' + (error?.message ?? ''))
  }

  // limpieza posible: borrar la mesa (el creador puede)
  await A.from('tables').delete().eq('id', gid)

  console.log('')
  if (bad === 0) {
    console.log('✅ E2E OK: el flujo real funciona y las cartas del rival están ocultas.')
    console.log('   (Quedan en tu proyecto: 2 usuarios de auth de prueba, sus perfiles,')
    console.log('    1 partida finished y su historial. Los usuarios de auth se borran')
    console.log('    desde el dashboard si querés limpiarlos.)')
  } else {
    console.error(`❌ ${bad} verificación(es) fallaron.`)
  }
  process.exit(bad === 0 ? 0 : 1)
}

main().catch(e => { console.error('\n💥 ' + e.message); process.exit(1) })
