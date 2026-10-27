// Partida privada entre QA1 en release físico y QA2 por su sesión propia.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { connectReleaseDevice } from './release-device.mjs'

nextEnv.loadEnvConfig(process.cwd())
const qa = (await loadQaAccounts()).accounts, clients = [], c = await connectReleaseDevice()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const wait = async predicate => { for (let i = 0; i < 120; i++) { const value = await predicate(); if (value) return value; await sleep(150) } throw Error('No llegó el estado esperado') }
for (const account of qa) {
  const sdk = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const login = await sdk.auth.signInWithPassword({ email: account.email, password: account.password }); assert.equal(login.error, null)
  clients.push(sdk)
}
const rpc = async (n, name, body) => { const r = await clients[n].rpc(name, body); if (r.error) throw Error(name + ': ' + r.error.message); return r.data }
const profile = async () => Promise.all(clients.map(async (sdk, n) => { const r = await sdk.from('profiles').select('id,coins,games_played,games_won,campaign_points').eq('id', qa[n].id).single(); assert.equal(r.error, null); return r.data }))
const game = async id => { const r = await clients[0].from('games').select('*').eq('id', id).single(); assert.equal(r.error, null); return r.data }
let table
try {
  assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")).user.id'), qa[0].id)
  const waiting = await clients[0].from('tables').select('id').eq('creator_id', qa[0].id).eq('name', 'ANDROID-17 QA privada 15').eq('status', 'waiting')
  assert.equal(waiting.error, null)
  for (const previous of waiting.data) await rpc(0, 'cancel_table', { p_table_id: previous.id })
  const before = await profile()
  table = await rpc(0, 'create_table', { p_name: 'ANDROID-17 QA privada 15', p_bet: 10, p_is_private: true, p_private_code: randomBytes(3).toString('hex').toUpperCase(), p_target_score: 15, p_time_limit: 30 })
  await rpc(1, 'join_table_by_code', { p_code: table.private_code })
  await rpc(0, 'start_game', { p_game_id: table.id })
  const hands = await clients[0].from('game_hands').select('player_id').eq('game_id', table.id)
  assert.equal(hands.error, null); assert.equal(hands.data.length, 1); assert.equal(hands.data[0].player_id, qa[0].id)
  // Desfase sólo en JavaScript del comprobador; no cambia el reloj del teléfono.
  await c.evaluate(`(()=>{window.__acceptanceDateNow=Date.now;Date.now=()=>window.__acceptanceDateNow()+600000;location.hash=${JSON.stringify('#/game/' + table.id)};return true})()`)
  const rendered = await wait(() => c.evaluate(`(()=>{const stage=document.querySelector('[data-game-actions]'),text=document.body.innerText;if(!stage||!text.match(/⏱[ ]*[0-9]+s/))return null;return {text,height:innerHeight,scroll:document.documentElement.scrollHeight,buttons:Array.from(document.querySelectorAll('button')).filter(b=>!b.disabled).map(b=>b.textContent.trim())}})()`))
  const seconds = Number(rendered.text.match(/⏱\s*(\d+)s/)?.[1])
  assert.ok(seconds > 0 && seconds <= 30, 'El reloj del juego debe usar el servidor con el teléfono adelantado diez minutos')
  assert.equal(rendered.scroll, rendered.height)
  const sung = await c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>/^Falta Envido$/i.test(b.textContent.trim())&&!b.disabled);if(!b)return false;b.click();return true})()`)
  assert.equal(sung, true)
  await wait(async () => ['falta_envido'].includes((await game(table.id)).envido_state.status))
  await rpc(1, 'respond_envido', { p_game_id: table.id, p_accept: true })
  for (let i = 0; i < 4; i++) {
    const g = await game(table.id)
    if (g.status === 'finished') break
    if (g.envido_state.declare_turn === qa[1].id) await rpc(1, 'envido_say', { p_game_id: table.id, p_action: 'tengo' })
    else {
      await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>/^Tengo [0-9]+/.test(b.textContent.trim())&&!b.disabled);if(!b)return false;b.click();return true})()`))
      await wait(async () => (await game(table.id)).envido_state.declare_turn !== qa[0].id || (await game(table.id)).status === 'finished')
    }
  }
  const finished = await wait(async () => { const g = await game(table.id); return g.status === 'finished' ? g : null })
  await c.evaluate('(()=>{Date.now=window.__acceptanceDateNow;delete window.__acceptanceDateNow;return true})()')
  const after = await profile()
  await rpc(0, 'start_game', { p_game_id: table.id }); assert.deepEqual(await profile(), after)
  await wait(() => c.evaluate('document.body.innerText.includes("Revancha")'))
  await writeFile('android/generated/android-17-phone-online-15.png', execFileSync(process.env.ADB, ['-s', process.env.ANDROID_QA_SERIAL, 'exec-out', 'screencap', '-p']))
  const report = { scope: 'APK0.17.1/código19 en Redmi físico; Supabase HTTPS real; mesa privada QA1/QA2',
    id: table.id, target: 15, scores: [finished.player1_score, finished.player2_score], winner: finished.winner_id,
    ownHandOnly: true, serverClockWithTenMinuteDeviceSkew: seconds, noScroll: true, envidoFromPhone: true, before, after, duplicateStartDidNotPayAgain: true }
  await writeFile('android/generated/android-17-phone-online-15.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await c.evaluate('(()=>{if(window.__acceptanceDateNow){Date.now=window.__acceptanceDateNow;delete window.__acceptanceDateNow}return true})()').catch(() => {})
  if (table) {
    const status = await clients[0].from('tables').select('status').eq('id', table.id).maybeSingle()
    if (status.data?.status === 'waiting') await rpc(0, 'cancel_table', { p_table_id: table.id }).catch(() => {})
    else if (status.data?.status === 'playing') await rpc(0, 'forfeit', { p_game_id: table.id }).catch(() => {})
  }
  await c.evaluate("location.hash='#/lobby'").catch(() => {})
  for (const sdk of clients) await sdk.auth.signOut({ scope: 'local' })
}
