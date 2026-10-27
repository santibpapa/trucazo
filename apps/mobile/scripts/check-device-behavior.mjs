// Aceptación del comportamiento nativo con QA3 existente; sólo lecturas remotas.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { deviceCDP } from './device-cdp.mjs'

const pkg = 'ar.com.trucazo.capacitor.dev', serial = process.env.ANDROID_QA_SERIAL || 'emulator-5554'
const port = Number(process.env.ANDROID_QA_CDP || 9224)
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const report = { scope: 'APK instalado + sesión QA3 propia + servidor local/Supabase reales; sin mesas, compras ni mensajes', cases: [], screens: [] }
let c
async function wait(test, label) {
  for (let i = 0; i < 120; i++) { if (await test()) return; await pause(150) }
  throw Error('No apareció: ' + label)
}
async function connect() {
  await wait(async () => {
    try { const pid = adb(['shell', 'pidof', pkg]).trim(); if (!pid) return false
      adb(['forward', 'tcp:' + port, 'localabstract:webview_devtools_remote_' + pid]); c = await deviceCDP({ port }); return true
    } catch { return false }
  }, 'WebView debug')
}
const check = expression => c.evaluate(expression)
const click = async name => {
  await wait(() => check(`(()=>{const b=Array.from(document.querySelectorAll('button,a')).find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(name)}&&!b.disabled&&b.getClientRects().length&&!b.closest('[inert]'));if(!b)return false;b.click();return true})()`), name)
}
const go = async (path, text) => { await check('location.hash=' + JSON.stringify('#' + path)); await wait(() => check('document.body.innerText.includes(' + JSON.stringify(text) + ')'), path) }
const fill = async (selector, text) => check(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,${JSON.stringify(text)});field.dispatchEvent(new Event('input',{bubbles:true}))})()`)
async function shot(name) { await writeFile('android/generated/android-14-' + serial + '-' + name + '.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')) }
const back = () => adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
try {
  await connect()
  assert.equal(await check("JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id"), '2c9dd1e8-a39b-41e7-af2a-f67502691795')
  report.device = { serial, model: adb(['shell', 'getprop', 'ro.product.model']).trim(), android: adb(['shell', 'getprop', 'ro.build.version.release']).trim(),
    api: adb(['shell', 'getprop', 'ro.build.version.sdk']).trim(), userAgent: await check('navigator.userAgent'), app: await check('Capacitor.Plugins.App.getInfo()') }
  await go('/lobby', 'Mesas disponibles')
  await click('Crear mesa'); await wait(() => check("!!document.querySelector('[role=dialog]')"), 'modal')
  await fill('input[name=tableName]', 'Borrador ANDROID-14')
  // Volver de otra app no debe remontar el lobby ni borrar su borrador.
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']); await pause(600)
  adb(['shell', 'am', 'start', '-n', pkg + '/.MainActivity']); await pause(1800)
  assert.equal(await check("document.querySelector('input[name=tableName]')?.value"), 'Borrador ANDROID-14', 'Suspensión perdió el borrador')
  report.cases.push('suspensión conserva ventana y borrador')
  back(); await wait(() => check("!document.querySelector('[role=dialog]')"), 'Atrás cierra modal')
  assert.equal(await check('location.hash'), '#/lobby')
  await click('Perfil'); back(); await wait(() => check("document.querySelector('button[aria-label=Perfil]')?.getAttribute('aria-expanded')==='false'"), 'menú cerrado')
  report.cases.push('Atrás cierra modal y menú sin navegar')
  await go('/ranking', 'Ranking'); back(); await wait(() => check("location.hash==='#/lobby'"), 'historial')
  await go('/tienda', 'Tienda'); await click('Ver mesa: Cafetín porteño')
  await wait(() => check("!!document.querySelector('dialog[open]')"), 'visor')
  back(); await wait(() => check("!document.querySelector('dialog[open]')"), 'visor cerrado')
  report.cases.push('historial y visor nativo cerrados con Atrás')
  if (process.argv.includes('--prepare-empty') && !await check("(async()=>!!(await Capacitor.Plugins.CampaignStore.read({owner:'2c9dd1e8-a39b-41e7-af2a-f67502691795'})).body)()")) {
    await go('/historia/offline', 'Descargar Historia'); await click('Descargar Historia')
    await wait(() => check("document.body.innerText.includes('Sin internet · guardado')"), 'primera descarga en instalación nueva')
    report.cases.push('primera descarga QA3 en instalación nueva, sin reemplazar guardados previos')
  }
  for (const [path, text, name] of [['/profile', 'androidqa3', 'profile'], ['/ranking', 'Ranking', 'ranking'], ['/tienda', 'Tienda', 'shop'],
    ['/comunidad', 'Comunidad', 'community'], ['/torneos', 'Torneos', 'tournaments'], ['/historia', 'Jugar sin internet', 'history-online'],
    ['/historia/offline', 'Sin internet · guardado', 'history-offline'], ['/notificaciones', 'Notificaciones', 'notifications'], ['/ayuda', 'Ayuda', 'help']]) {
    await go(path, text); await pause(400); await shot(name)
    const view = await check(`(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,missing:Array.from(document.images).filter(i=>i.complete&&!i.naturalWidth).map(i=>new URL(i.src).pathname)}))()`)
    assert.equal(view.scrollWidth, view.width, path + ' desborda horizontalmente'); assert.deepEqual(view.missing, [], path + ' tiene imágenes rotas')
    report.screens.push({ path, ...view })
  }
  // Cierre del proceso: la ruta y la cuenta se recuperan sin importar otra sesión.
  await go('/profile', 'androidqa3')
  await wait(() => check("document.querySelector('h1')?.textContent==='androidqa3'&&localStorage.getItem('trucazo:mobile:screen:2c9dd1e8-a39b-41e7-af2a-f67502691795')==='/profile'"), 'pantalla recordada')
  await pause(1500)
  c.close(); c = null
  adb(['shell', 'am', 'force-stop', pkg]); adb(['shell', 'am', 'start', '-n', pkg + '/.MainActivity'])
  await connect(); await wait(() => check("location.hash==='#/profile'&&document.querySelector('h1')?.textContent==='androidqa3'"), 'perfil después de cierre')
  report.cases.push('pérdida de proceso recupera cuenta y pantalla')
  await go('/lobby', 'Mesas disponibles'); back()
  await wait(() => check('document.hidden'), 'Atrás en lobby minimiza')
  adb(['shell', 'am', 'start', '-n', pkg + '/.MainActivity']); await wait(() => check('!document.hidden'), 'regreso al lobby')
  report.cases.push('Atrás en lobby minimiza; regreso con sesión conservada')
  await writeFile('android/generated/android-14-' + serial + '-behavior.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} catch (error) {
  report.failure = error.message
  report.lastScreen = await c?.evaluate("({route:location.hash,title:document.querySelector('h1')?.textContent,status:document.querySelector('[role=alert],[role=status]')?.textContent})").catch(() => null)
  await writeFile('android/generated/android-14-' + serial + '-behavior-failure.json', JSON.stringify(report, null, 2))
  throw error
} finally { await c?.evaluate("location.hash='#/lobby'").catch(() => {}); c?.close() }
