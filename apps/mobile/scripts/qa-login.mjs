// Ingreso normal de QA desde el archivo privado. No copia sesiones entre orígenes.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'

process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
const [target, number = '1'] = process.argv.slice(2)
assert.ok(['web', 'native'].includes(target), 'Usar web|native 1|2')
assert.ok(['1', '2', '3'].includes(number), 'Elegir la cuenta 1, 2 o 3')
const saved = await loadQaAccounts(), account = number === '3' ? saved.registrationAccount : saved.accounts[Number(number) - 1]
assert.ok(account?.id, 'La QA elegida debe existir; no crear otra cuenta para iniciar sesión')
const origin = process.env.ANDROID_QA_WEB_ORIGIN || 'http://localhost:3000'
assert.ok(['http://localhost:3000', 'http://localhost:3002', 'https://www.trucazo.com.ar'].includes(origin), 'Destino de QA no autorizado')
let connection
try {
  if (target === 'web') {
    const context = await chromium.launchPersistentContext('android/generated/private/qa-web-' + number, {
      headless: true, executablePath: process.env.PWA_BROWSER_EXECUTABLE,
    })
    try {
      const page = context.pages()[0] || await context.newPage()
      await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' })
      if (await page.locator('input[name=password]').count()) {
        // Esperar a que React haya conectado el formulario antes de escribir.
        await page.waitForFunction(() => Object.keys(document.querySelector('input[name=password]') || {}).some(key => key.startsWith('__reactProps$')))
        await page.locator('input[name=identifier]').fill(account.email)
        await page.locator('input[name=password]').fill(account.password)
        await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
      }
      await page.waitForURL('**/lobby**', { timeout: 30000 })
      await page.getByText(account.username, { exact: true }).first().waitFor()
      if (origin.startsWith('http://localhost:')) {
        const identity = await context.request.get(origin + '/api/android/historia?identity=1')
        assert.equal(identity.status(), 200); assert.equal((await identity.json()).userId, account.id)
      }
      await page.screenshot({ path: 'android/generated/android-qa-web-' + number + '-login.png' })
      console.log(JSON.stringify({ target, username: account.username, owner: account.id, origin, login: 'passed', persistentProfile: true }))
    } finally { await context.close() }
  } else {
    connection = await deviceCDP({ port: Number(process.env.ANDROID_QA_CDP_PORT || 9224) })
    // El agente deja primero el APK en ingreso por su salida local.
    // No cerrar aquí una cuenta personal ni interrumpir una partida.
    const ready = await connection.evaluate(`({owner:JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id,login:!!document.querySelector('input[name=password]')})`)
    assert.ok(ready.login || ready.owner === account.id, 'Dejar el APK en ingreso usando Cerrar sesión; se conservan los guardados')
    if (ready.login) await connection.evaluate(`(()=>{
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      for(const [name,value] of ${JSON.stringify([['identifier', account.email], ['password', account.password]])}){
        const input=document.querySelector('input[name='+name+']');set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));
      }
      setTimeout(()=>Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='Iniciar sesión'&&!b.disabled)?.click(),0);
      return true;
    })()`)
    let entered = false
    for (let i = 0; i < 60; i++) {
      entered = await connection.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id===${JSON.stringify(account.id)}&&!!document.querySelector('header')`)
      if (entered) break
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    assert.ok(entered, 'El APK no llegó al lobby de QA')
    console.log(JSON.stringify({ target, username: account.username, owner: account.id, login: 'passed' }))
  }
} catch (failure) {
  // Los errores de Playwright pueden incluir lo escrito en un input.
  const message = failure.message.replaceAll(account.password, '[privado]').replaceAll(account.email, '[correo QA]')
  console.error('QA login: ' + message); process.exitCode = 1
} finally { connection?.close() }
