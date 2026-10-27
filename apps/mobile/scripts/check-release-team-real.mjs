// Tres QA existentes y un bot, mesa privada; reglas y monedas sólo en SQL.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { connectReleaseDevice } from './release-device.mjs'

nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts(), accounts = [...saved.accounts, saved.registrationAccount]
const clients = [], c = await connectReleaseDevice(), sleep = ms => new Promise(r => setTimeout(r, ms))
const build = await c.evaluate("fetch('/build-info.json').then(r=>r.json()).then(({version,versionCode})=>({version,versionCode}))")
const deviceTag = process.env.ANDROID_QA_SERIAL?.startsWith('emulator-') ? 'emulator' : 'phone'
const wait = async fn => { for (let i = 0; i < 120; i++) { const value = await fn(); if (value) return value; await sleep(150) } throw Error('La mesa de parejas no llegó al estado esperado') }
for (const a of accounts) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const login = await client.auth.signInWithPassword({ email: a.email, password: a.password }); assert.equal(login.error, null); clients.push(client)
}
const rpc = async (n, name, body) => { const r = await clients[n].rpc(name, body); if (r.error) throw Error(name + ': ' + r.error.message); return r.data }
const balances = () => Promise.all(clients.map(async (sdk, n) => { const r = await sdk.from('profiles').select('id,coins').eq('id', accounts[n].id).single(); assert.equal(r.error, null); return r.data }))
let id
const snap = (n = 0) => rpc(n, 'team_snapshot', { p_table_id: id })
const action = async (n, p_action, extra = {}) => rpc(n, 'team_action', { p_table_id: id, p_request_id: randomUUID(), p_version: (await snap(n)).table.version, p_action, ...extra })
try {
  assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")).user.id'), accounts[0].id)
  const before = await balances()
  const initial = await rpc(0, 'team_create', { p_request_id: randomUUID(), p_name: 'ANDROID-17 parejas QA privada', p_bet: 10, p_target_score: 30, p_time_limit: 30, p_is_private: true })
  id = initial.table.id
  await action(0, 'seat', { p_seat: 1 })
  for (const [n, seat] of [[1, 0], [2, 3]]) {
    await rpc(n, 'team_join', { p_request_id: randomUUID(), p_code: initial.table.private_code })
    await action(n, 'seat', { p_seat: seat })
  }
  await action(0, 'add_bot', { p_seat: 2 }); await action(0, 'start')
  const privateHand = await clients[0].from('team_hands').select('seat').eq('table_id', id)
  assert.equal(privateHand.error, null); assert.deepEqual(privateHand.data, [{ seat: 1 }])
  await c.evaluate('location.hash=' + JSON.stringify('#/game/parejas/' + id))
  await wait(() => c.evaluate('!!document.querySelector("[data-team-stage]")'))
  await action(1, 'truco')
  await wait(() => c.evaluate('Array.from(document.querySelectorAll("button")).some(b=>b.textContent.trim()==="Falta Envido"&&!b.disabled)'))
  const layout = await c.evaluate(`({height:innerHeight,scroll:document.documentElement.scrollHeight,buttons:Array.from(document.querySelectorAll('button')).map(b=>({text:b.textContent.trim(),rect:b.getBoundingClientRect().toJSON()})).filter(b=>b.rect.width&&b.rect.height)})`)
  assert.equal(layout.scroll, layout.height)
  assert.ok(layout.buttons.every(b => b.rect.top >= 0 && b.rect.bottom <= layout.height))
  const safeArea = await c.evaluate(`(()=>{const e=document.createElement('div');e.style.padding='var(--safe-area-inset-top,env(safe-area-inset-top)) 0 var(--safe-area-inset-bottom,env(safe-area-inset-bottom))';document.body.append(e);const s=getComputedStyle(e),top=parseFloat(s.paddingTop),bottom=parseFloat(s.paddingBottom);e.remove();return {top,bottom,headerTop:document.querySelector('[aria-label="Trucazo"]').getBoundingClientRect().top}})()`)
  assert.ok(safeArea.headerTop >= safeArea.top)
  assert.ok(layout.buttons.every(b => b.rect.top >= safeArea.top && b.rect.bottom <= layout.height - safeArea.bottom))
  await writeFile('android/generated/android-17-' + deviceTag + '-team-long-options-' + build.versionCode + '.png', execFileSync(process.env.ADB, ['-s', process.env.ANDROID_QA_SERIAL, 'exec-out', 'screencap', '-p']))
  await c.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Quiero'&&!b.disabled).click()`)
  await wait(async () => (await snap()).game.truco.status === 'accepted')
  const rival = await snap(1)
  await action(1, 'play', { p_card: rival.hand[0] })
  await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')?.startsWith('Jugar ')&&!b.disabled);if(!b)return false;b.click();return true})()`))
  await wait(async () => (await snap()).game.played.length >= 2)
  const played = (await snap()).game.played.length
  await action(0, 'forfeit')
  const finished = await snap(), after = await balances()
  await action(0, 'forfeit'); assert.deepEqual(await balances(), after)
  await wait(() => c.evaluate('document.body.innerText.includes("Volver al lobby")'))
  const report = { scope: 'Release instalado, Supabase HTTPS real, tres QA y bot en mesa privada', build, safeArea, device: deviceTag, serial: process.env.ANDROID_QA_SERIAL, id, target: 30,
    ownHandOnly: true, longTrucoOptionsInScreen: true, viewportHeight: layout.height, playedFromNative: true, playedCards: played,
    finished: finished.table.status, finishReason: finished.game.finish_reason, before, after, noDuplicatePayout: true }
  await writeFile('android/generated/android-17-' + deviceTag + '-team-real-' + build.versionCode + '.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  if (id) { const state = await snap().catch(() => null); if (state?.table.status === 'waiting') await action(0, 'leave').catch(() => {}); else if (state?.table.status === 'playing') await action(0, 'forfeit').catch(() => {}) }
  await c.evaluate("location.hash='#/lobby'").catch(() => {})
  for (const sdk of clients) await sdk.auth.signOut({ scope: 'local' })
}
