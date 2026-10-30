// Aceptación push con QA existentes. Nunca imprime tokens, llaves ni sesiones.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'
nextEnv.loadEnvConfig(process.cwd())
const mode = process.argv[2] || 'enable', port = Number(process.argv[3] || 9224)
const serial = port === 9225 ? 'emulator-5556' : 'emulator-5554'
const adb = args => execFileSync(process.env.ADB || 'adb', ['-s', serial, ...args])
const c = await deviceCDP({ port })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const wait = async predicate => { for (let i = 0; i < 150; i++) { if (await predicate()) return; await pause(200) } throw Error('No apareció el estado esperado de notificaciones') }
const text = () => c.evaluate('document.body.innerText')
const click = name => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(name)}&&!b.disabled);if(!b)return false;b.click();return true})()`)
const shot = async name => writeFile('android/generated/android-13-' + name + '-' + port + '.png', adb(['exec-out', 'screencap', '-p']))
try {
  if (mode === 'enable') {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); adb(['shell', 'wm', 'dismiss-keyguard'])
    await c.evaluate("location.hash='#/notificaciones'")
    await wait(async () => (await text()).includes('Activar notificaciones'))
    const askPermission = port === 9225 && await c.evaluate("(async()=>(await Capacitor.Plugins.PushNotifications.checkPermissions()).receive!=='granted')()")
    assert.equal(await click('Activar notificaciones'), true)
    if (askPermission) {
      await pause(500)
      adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-allow.xml'])
      const xml = adb(['shell', 'cat', '/sdcard/trucazo-push-allow.xml']).toString()
      const allow = xml.match(/<node[^>]*resource-id="[^"]*permission_allow_button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
      assert.ok(allow, 'Debe aparecer la segunda solicitud normal de permiso')
      await shot('permission-allow')
      adb(['shell', 'input', 'tap', String(Math.floor((+allow[1] + +allow[3]) / 2)), String(Math.floor((+allow[2] + +allow[4]) / 2))])
    }
    await wait(async () => (await text()).includes('Activados en este dispositivo'))
    await shot('enabled')
    console.log(JSON.stringify({ mode, port, registeredFromNormalScreen: true }))
  } else if (mode === 'status') {
    const result = await c.evaluate('(async()=>{const n=await Capacitor.Plugins.PushBinding.state({owner:JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")||"null")?.user.id||""}),d=await Capacitor.Plugins.PushNotifications.getDeliveredNotifications();return {route:location.hash,owner:n.owner,allowed:n.allowed,consented:n.consented,delivered:d.notifications.map(x=>({tag:x.tag,title:x.title,body:x.body})),alert:document.querySelector("[role=alert]")?.textContent}})()')
    console.log(JSON.stringify(result))
  } else if (mode === 'invite') {
    const saved = await loadQaAccounts(), from = saved.accounts[0], to = saved.registrationAccount
    const client = account => { const instance = createClient(saved.projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }); return instance.auth.signInWithPassword({ email: account.email, password: account.password }).then(r => { assert.equal(r.error, null); return instance }) }
    const a = await client(from), b = await client(to)
    const rpc = async (instance, name, body) => { const result = await instance.rpc(name, body); assert.equal(result.error, null, name + ': ' + result.error?.message); return result.data }
    const community = await rpc(a, 'get_community', {})
    const previous = community.friends.find(item => item.user_id === to.id)
    if (!previous) {
      await rpc(a, 'send_friend_request', { p_username: to.username })
      const incoming = (await rpc(b, 'get_community', {})).incoming.find(item => item.username === from.username)
      assert.ok(incoming); await rpc(b, 'respond_friend_request', { p_friendship_id: incoming.friendship_id, p_accept: true })
    }
    const invited = await rpc(a, 'invite_friend', { p_friend_id: to.id, p_bet: 10, p_target_score: 15, p_time_limit: 30 })
    await writeFile('android/generated/android-13-real-invitation.json', JSON.stringify({ ...invited, from: from.id, to: to.id, friendshipExisted: !!previous }, null, 2))
    console.log(JSON.stringify({ invitationCreated: true, from: from.username, to: to.username, ...invited }))
    await a.auth.signOut({ scope: 'local' }); await b.auth.signOut({ scope: 'local' })
  } else if (mode === 'dispatch') {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const jobs = await admin.rpc('native_push_jobs'); assert.equal(jobs.error, null)
    let accepted = 0
    for (const job of jobs.data) {
      const response = await fetch('http://localhost:3000/api/android/push/send?id=' + job.id, { method: 'POST', headers: { Authorization: 'Bearer ' + job.key } })
      assert.equal(response.status, 200)
      if ((await response.json()).accepted) accepted++
    }
    console.log(JSON.stringify({ jobs: jobs.data.length, accepted, receiverStillNeedsVerification: true }))
  } else if (mode === 'shade') {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); adb(['shell', 'wm', 'dismiss-keyguard'])
    adb(['shell', 'cmd', 'statusbar', 'expand-notifications'])
    adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-visible.xml'])
    assert.ok(adb(['shell', 'cat', '/sdcard/trucazo-push-visible.xml']).toString().includes('Te invitaron a jugar'))
    await shot('received')
    console.log(JSON.stringify({ port, screenshot: 'android/generated/android-13-received-' + port + '.png' }))
  } else if (mode === 'tap') {
    adb(['shell', 'uiautomator', 'dump', '/sdcard/trucazo-push-tap.xml'])
    const xml = adb(['shell', 'cat', '/sdcard/trucazo-push-tap.xml']).toString()
    const node = xml.match(/<node[^>]*text="Te invitaron a jugar"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    assert.ok(node, 'Debe estar visible el aviso para tocarlo')
    adb(['shell', 'input', 'tap', String(Math.floor((+node[1] + +node[3]) / 2)), String(Math.floor((+node[2] + +node[4]) / 2))])
    await wait(() => c.evaluate("location.hash==='#/comunidad'&&document.body.innerText.toLowerCase().includes('mis amigos')"))
    await shot('destination')
    console.log(JSON.stringify({ port, tapOpenedCommunity: true }))
  } else throw Error('Usar enable/status/invite/dispatch/shade [9224|9225]')
} finally { c.close() }
