import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'
const c = await deviceCDP(), mode = process.argv[2] || 'off'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const wait = async predicate => { for (let i = 0; i < 100; i++) { if (await predicate()) return; await pause(150) } throw Error('No se guardó la preferencia') }
try {
  await c.evaluate("location.hash='#/notificaciones'")
  await wait(() => c.evaluate("document.querySelectorAll('input[type=checkbox]').length===3"))
  const checked = mode !== 'off'
  await c.evaluate(`(()=>{const field=document.querySelector('input[type=checkbox]');if(field.checked!==${checked})field.click()})()`)
  await wait(() => c.evaluate(`(()=>{const f=document.querySelector('input[type=checkbox]');return f.checked===${checked}&&!f.disabled})()`))
  const state = await c.evaluate(`(async()=>{const s=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'));const r=await Capacitor.Plugins.CapacitorHttp.request({url:'http://localhost:3000/api/android/push',method:'GET',headers:{Authorization:'Bearer '+s.access_token,Origin:'https://localhost'},responseType:'json'});return {status:r.status,preferences:r.data.preferences}})()`)
  assert.equal(state.status, 200); assert.equal(state.preferences.invite, checked)
  assert.equal(state.preferences.checkin, true); assert.equal(state.preferences.match, true)
  await writeFile('android/generated/android-13-preferences-' + mode + '.json', JSON.stringify({ realScreenAndApi: true, ...state }, null, 2))
  console.log(JSON.stringify({ mode, preferences: state.preferences, realScreenAndApi: true }))
} finally { c.close() }
