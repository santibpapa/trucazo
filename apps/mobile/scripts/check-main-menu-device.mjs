// Actualización y menú instalados. Lee los guardados; no juega ni acredita premios.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { releaseDevice } from './release-device.mjs'

const phase = process.argv[2], serial = process.argv[3]
assert.ok(['before', 'after'].includes(phase) && serial, 'Usar before/after y serial del emulador')
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const evidence = process.env.ANDROID_SESSION_EVIDENCE_DIR || 'android/generated'
await mkdir(evidence, { recursive: true })
const file = `${evidence}/android-main-menu-${serial}`
const menuVisible = `!!document.querySelector('nav[aria-label="Menú principal"]')`
const owners = ['29476689-d94b-4c1f-b7e7-5b23123de001', '9370e685-9dd0-4fab-a1a4-721a60f7d3dd',
  'b00d207b-8d36-4b59-8479-346b91ce762d', 'ebf2c130-304d-431f-9754-110715ca2892', '2c9dd1e8-a39b-41e7-af2a-f67502691795']
let c = await releaseDevice({ serial, port: serial.endsWith('5554') ? 9237 : 9238 })
const wait = async expression => {
  for (let i = 0; i < 100; i++) { if (await c.evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 150)) }
  throw Error('No apareció el estado esperado: ' + expression)
}
const click = text => c.evaluate(`(()=>{const e=Array.from(document.querySelectorAll('a,button')).find(e=>e.getAttribute('aria-label')===${JSON.stringify(text)}||e.textContent.trim().startsWith(${JSON.stringify(text)}));if(!e)return false;e.click();return true})()`)
const snapshot = () => c.evaluate(`(async()=>{
  const session=JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null'),stores=[];
  for(const owner of ${JSON.stringify(owners)}) {
    const s=await Capacitor.Plugins.CampaignStore.read({owner});
    stores.push({owner,sha256:s.body?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s.body))),b=>b.toString(16).padStart(2,'0')).join(''):null});
  }
  return {owner:session?.user.id,stores};
})()`)
try {
  await wait('!!globalThis.Capacitor?.Plugins?.CampaignStore')
  const initial = await snapshot()
  assert.ok(owners.slice(2).includes(initial.owner), 'Usar sólo la cuenta QA instalada; no operar una cuenta personal')
  if (phase === 'before') {
    await writeFile(file + '-before.json', JSON.stringify(initial, null, 2))
    console.log(JSON.stringify({ serial, phase, storedCampaigns: initial.stores.filter(s => s.sha256).length }))
  } else {
    const before = JSON.parse(await readFile(file + '-before.json', 'utf8'))
    assert.deepEqual(initial, before, 'Actualizar conserva identidad y bytes de los guardados')
    await c.evaluate("location.hash='#/inicio'")
    await wait(menuVisible)
    await wait(`Array.from(document.querySelectorAll('main img')).every(img=>img.complete&&img.naturalWidth>0)`)
    assert.equal(await c.evaluate('!!document.querySelector("main [role=status]")'), false, 'Menú sin indicador de conexión')
    const layout = await c.evaluate(`(()=>{const nodes=Array.from(document.querySelectorAll('nav[aria-label="Menú principal"] a,nav[aria-label="Menú principal"] button'));return {height:innerHeight,scroll:document.documentElement.scrollHeight,options:nodes.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}),background:document.querySelector('main img').naturalWidth>0}})()`)
    assert.equal(layout.options.length, 4); assert.equal(layout.scroll, layout.height); assert.equal(layout.background, true)
    assert.ok(layout.options.every(r => r.top >= 0 && r.bottom <= layout.height && r.height >= 44))
    await c.evaluate('(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true})()')
    await new Promise(resolve => setTimeout(resolve, 300))
    await writeFile(file + '-installed.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    assert.ok(await click('Ajustes')); await wait('!!document.querySelector("input[role=switch]")')
    const sound = await c.evaluate('document.querySelector("input[role=switch]").checked')
    await c.evaluate('document.querySelector("input[role=switch]").click()')
    assert.equal(await c.evaluate('document.querySelector("input[role=switch]").checked'), !sound)
    await c.evaluate('document.querySelector("input[role=switch]").click()')
    assert.ok(await click('Notificaciones')); await wait('document.querySelector("h1")?.textContent==="Notificaciones"')
    assert.ok(await click('← Volver a Ajustes')); await wait('!!document.querySelector("input[role=switch]")')
    assert.ok(await click('Mi cuenta')); await wait(`!!document.querySelector('a[href="#/ajustes"]')&&!!document.querySelector('h1')`)
    assert.ok(await click('← Ajustes')); await wait('!!document.querySelector("input[role=switch]")')
    adb(['shell', 'input', 'keyevent', '4']); await wait('location.hash==="#/inicio"')
    assert.ok(await click('Multijugador')); await wait('document.body.innerText.includes("Mesas disponibles")')
    assert.ok(await click('Volver al menú principal')); await wait('location.hash==="#/inicio"')
    // El enlace se abre por el mecanismo real de Android; el token ficticio no une ninguna mesa.
    const invitation = '/invitar/11111111-1111-4111-8111-111111111111'
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'https://www.trucazo.com.ar' + invitation, 'ar.com.trucazo.app'])
    await wait('location.hash===' + JSON.stringify('#' + invitation))
    await wait('document.body.innerText.includes("invitación")')
    await c.evaluate("location.hash='#/inicio'")
    adb(['shell', 'svc', 'wifi', 'disable']); adb(['shell', 'svc', 'data', 'disable'])
    await wait('navigator.onLine===false')
    await wait(menuVisible)
    assert.ok(await click('Modo Campaña')); await wait('!!document.querySelector("#campaign,#prepare")')
    assert.deepEqual(await snapshot(), before, 'Abrir campaña sin red conserva el guardado')
    // Los tutoriales existentes se cierran con Atrás antes de abandonar el mapa.
    for (let i = 0; i < 4 && await c.evaluate('location.hash!=="#/inicio"'); i++) adb(['shell', 'input', 'keyevent', '4'])
    await wait('location.hash==="#/inicio"')
    assert.ok(await click('Salir'))
    await new Promise(resolve => setTimeout(resolve, 500))
    assert.ok(!adb(['shell', 'dumpsys', 'activity', 'activities']).split('\n').filter(line => /mResumedActivity|topResumedActivity/.test(line)).some(line => line.includes('ar.com.trucazo.app/')), 'Salir devuelve al inicio del teléfono')
    adb(['shell', 'am', 'start', '-n', 'ar.com.trucazo.app/ar.com.trucazo.capacitor.dev.MainActivity'])
    await wait(menuVisible)
    assert.deepEqual(await snapshot(), before, 'Salir conserva la cuenta y los guardados')
    await c.close(); c = null
    adb(['shell', 'am', 'force-stop', 'ar.com.trucazo.app'])
    c = await releaseDevice({ serial, port: serial.endsWith('5554') ? 9237 : 9238 })
    await wait(menuVisible)
    assert.deepEqual(await snapshot(), before, 'Reabrir en frío conserva la cuenta y los guardados')
    const result = { serial, updatePreservesCampaigns: true, layout, settingsSound: true, backReturnsToMenu: true,
      multiplayer: true, invitationDirect: true, offlineCampaign: true, exitMinimizes: true, exitPreservesSession: true, coldStartMenu: true }
    await writeFile(file + '-after.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result))
  }
} finally {
  if (phase === 'after') { adb(['shell', 'svc', 'wifi', 'enable']); adb(['shell', 'svc', 'data', 'enable']) }
  await c?.close()
}
