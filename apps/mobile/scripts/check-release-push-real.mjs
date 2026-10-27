// Piloto privado de las QA existentes. Nunca imprime tokens, claves ni sesiones.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { connectReleaseDevice } from './release-device.mjs'

nextEnv.loadEnvConfig(process.cwd())
const mode = process.argv[2] || 'status'
const file = 'android/generated/android-17-phone-push-20.json'
const saved = await loadQaAccounts(), recipient = saved.accounts[0], sender = saved.accounts[1]
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const rpc = async (client, name, body = {}) => {
  const result = await client.rpc(name, body)
  assert.equal(result.error, null, name + ': ' + result.error?.message)
  return result.data
}
const admin = () => createClient(saved.projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const login = async account => {
  const client = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const auth = await client.auth.signInWithPassword({ email: account.email, password: account.password })
  assert.equal(auth.error, null); assert.equal(auth.data.user.id, account.id)
  return client
}
if (mode === 'status' || mode === 'enable' || mode === 'delivered' || mode === 'background') {
  const c = await connectReleaseDevice()
  assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")||"null")?.user.id'), recipient.id)
  if (mode === 'background') await c.evaluate('Capacitor.Plugins.App.minimizeApp().then(()=>true)')
  else if (mode !== 'delivered') {
    await c.evaluate("location.hash='#/notificaciones'"); await pause(1200)
    if (mode === 'enable') {
      await c.evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Activar notificaciones'&&!b.disabled)?.click();true")
      await pause(3000)
    }
  }
  const result = await c.evaluate('(async()=>{const owner=JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")||"null")?.user.id;const s=await Capacitor.Plugins.PushBinding.state({owner});return {route:location.hash,screen:document.body.innerText.slice(0,2200),permission:(await Capacitor.Plugins.PushNotifications.checkPermissions()).receive,owner:s.owner,allowed:s.allowed,consented:s.consented,delivered:(await Capacitor.Plugins.PushNotifications.getDeliveredNotifications()).notifications.map(n=>({id:n.id,title:n.title,body:n.body,tag:n.tag}))}})()')
  if (mode === 'delivered') {
    const report = JSON.parse(await readFile(file, 'utf8'))
    report.receiptChecks = [...(report.receiptChecks || []), { at: new Date().toISOString(), route: result.route, delivered: result.delivered }]
    if (result.delivered.length) report.physicalReceipt = result.delivered
    report.receiptCheckedAt = new Date().toISOString()
    await writeFile(file, JSON.stringify(report, null, 2))
  }
  console.log(JSON.stringify(result))
} else if (mode === 'invite') {
  const from = await login(sender), to = await login(recipient)
  try {
    for (const client of [from, to]) {
      if (!(await rpc(client, 'community_safety_state')).accepted)
        await rpc(client, 'accept_community_rules', { p_version: '2026-10-15' })
    }
    const community = await rpc(from, 'get_community')
    const previous = community.friends.find(item => item.user_id === recipient.id)
    let createdFriendship = null
    if (!previous) {
      await rpc(from, 'send_friend_request', { p_username: recipient.username })
      const incoming = (await rpc(to, 'get_community')).incoming.find(item => item.username === sender.username)
      assert.ok(incoming); createdFriendship = incoming.friendship_id
      await rpc(to, 'respond_friend_request', { p_friendship_id: incoming.friendship_id, p_accept: true })
    }
    const invited = await rpc(from, 'invite_friend', { p_friend_id: recipient.id, p_bet: 10, p_target_score: 15, p_time_limit: 30 })
    const report = { scope: 'Redmi, release20, API HTTPS y FCM reales; piloto QA privado', createdAt: new Date().toISOString(),
      ...invited, from: sender.id, to: recipient.id, friendshipExisted: !!previous, createdFriendship }
    await writeFile(file, JSON.stringify(report, null, 2))
    const jobs = await rpc(admin(), 'native_push_jobs')
    console.log(JSON.stringify({ ...report, preparedJobCount: jobs.length }))
  } finally { await from.auth.signOut({ scope: 'local' }); await to.auth.signOut({ scope: 'local' }) }
} else if (mode === 'dispatch') {
  // Identificadores no secretos, leídos por separado y limitados al evento de esta prueba.
  const ids = process.argv.slice(3)
  assert.ok(ids.length && ids.every(id => /^[0-9a-f-]{36}$/i.test(id)))
  const jobs = await rpc(admin(), 'native_push_jobs')
  const results = []
  for (const id of ids) {
    const job = jobs.find(item => item.id === id); assert.ok(job, 'El envío no está pendiente')
    const response = await fetch('https://www.trucazo.com.ar/api/android/push/send?id=' + id,
      { method: 'POST', headers: { Authorization: 'Bearer ' + job.key } })
    const data = await response.json()
    results.push({ id, status: response.status, accepted: data.accepted === true, skipped: data.skipped === true })
  }
  const report = JSON.parse(await readFile(file, 'utf8')); report.dispatch = results
  await writeFile(file, JSON.stringify(report, null, 2)); console.log(JSON.stringify(results))
} else if (mode === 'cleanup') {
  const report = JSON.parse(await readFile(file, 'utf8')), from = await login(sender)
  assert.equal(report.from, sender.id); assert.equal(report.to, recipient.id)
  try {
    await rpc(from, 'cancel_game_invite', { p_invite_id: report.invite_id })
    if (!report.friendshipExisted) await rpc(from, 'remove_friend', { p_friendship_id: report.createdFriendship })
    report.cleanedUp = true
    await writeFile(file, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ cleanedUp: true }))
  } finally { await from.auth.signOut({ scope: 'local' }) }
} else throw Error('Usar status/enable/background/delivered/invite/dispatch/cleanup [IDs propios]')
