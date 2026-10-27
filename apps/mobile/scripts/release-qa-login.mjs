// Formulario normal del release. Sólo las tres cuentas QA ya autorizadas.
import assert from 'node:assert/strict'
import { loadQaAccounts } from './qa-accounts.mjs'
import { connectReleaseDevice } from './release-device.mjs'
import { pathToFileURL } from 'node:url'

export async function releaseQaLogin(n) {
  const saved = await loadQaAccounts(), accounts = [...saved.accounts, saved.registrationAccount]
  const account = accounts[n - 1]; assert.ok(account, 'Elegir QA1, QA2 o QA3')
  const c = await connectReleaseDevice(), pause = () => new Promise(r => setTimeout(r, 150))
  const wait = async fn => { for (let i = 0; i < 160; i++) { if (await fn()) return; await pause() } throw Error('El formulario no llegó al estado esperado') }
  const owner = () => c.evaluate('JSON.parse(localStorage.getItem("trucazo:mobile:auth:v1")||"null")?.user.id||null')
  const current = await owner()
  if (current === account.id) return { username: account.username, alreadySignedIn: true }
  if (current) {
    assert.ok(accounts.some(a => a.id === current), 'No cerrar una cuenta personal')
    await c.evaluate("location.hash='#/lobby'")
    await wait(() => c.evaluate('!!document.querySelector("button[aria-label=Perfil]")'))
    await c.evaluate('document.querySelector("button[aria-label=Perfil]").click()')
    await wait(() => c.evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Cerrar sesión'&&!b.disabled);if(!b)return false;b.click();return true})()`))
    await wait(async () => !await owner())
  }
  await wait(() => c.evaluate('!!document.querySelector("input[name=password]")'))
  for (const [name, value] of [['identifier', account.email], ['password', account.password]]) await c.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify('input[name=' + name + ']')});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
  await c.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Iniciar sesión').click()`)
  await wait(async () => await owner() === account.id && await c.evaluate('document.body.innerText.includes("Mesas disponibles")'))
  return { username: account.username, login: 'normal email form', passed: true }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await releaseQaLogin(Number(process.argv[2] || 1))))
