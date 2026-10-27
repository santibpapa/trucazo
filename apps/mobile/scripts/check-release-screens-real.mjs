// Consulta pantallas de la QA propia. No compra, reclama premios ni publica mensajes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { connectReleaseDevice } from './release-device.mjs'
import { loadQaAccounts } from './qa-accounts.mjs'

const c = await connectReleaseDevice(), qa = (await loadQaAccounts()).accounts[0]
const serial = process.env.ANDROID_QA_SERIAL
assert.ok(serial, 'Indicar el serial del teléfono')
const build = await c.evaluate("fetch('/build-info.json').then(r=>r.json()).then(({version,versionCode})=>({version,versionCode}))")
assert.equal(await c.evaluate('JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")).user.id'), qa.id)
const results = []
try {
  for (const [route, title] of [['profile', qa.username], ['ranking', 'Ranking'], ['tienda', 'Tienda'], ['torneos', 'Torneos'], ['convivencia', 'Convivencia']]) {
    await c.evaluate('location.hash=' + JSON.stringify('#/' + route))
    let view
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 200))
      view = await c.evaluate(`({title:document.querySelector('h1')?.textContent.trim(),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,alerts:Array.from(document.querySelectorAll('[role=alert]')).map(x=>x.textContent)})`)
      if (view.title === title) break
    }
    assert.equal(view.title, title, route + ': no cargó la pantalla')
    assert.ok(view.scrollWidth <= view.width, route + ': desborde horizontal')
    assert.deepEqual(view.alerts, [], route + ': alerta inesperada')
    results.push({ route, ...view })
    await writeFile('android/generated/android-17-phone-' + route + '-' + build.versionCode + '.png', execFileSync(process.env.ADB, ['-s', serial, 'exec-out', 'screencap', '-p']))
  }
  const report = { scope: 'Release físico + Supabase HTTPS real; lectura QA1, sin acciones de economía/social', build, results }
  await writeFile('android/generated/android-17-phone-screens-' + build.versionCode + '.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await c.evaluate("location.hash='#/lobby'").catch(() => {}) }
