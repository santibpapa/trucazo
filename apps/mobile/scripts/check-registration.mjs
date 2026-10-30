// Alta real autorizada de androidqa3 por el formulario instalado. Reutilizable.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { QA_FILE, loadQaAccounts } from './qa-accounts.mjs'
import { deviceCDP } from './device-cdp.mjs'

nextEnv.loadEnvConfig(process.cwd())
const saved = await loadQaAccounts()
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const collision = await admin.from('profiles').select('id,username').eq('username', 'androidqa3').maybeSingle()
if (collision.error) throw Error('No se pudo comprobar androidqa3')
if (collision.data && collision.data.id !== saved.registrationAccount?.id) throw Error('androidqa3 ya pertenece a otra cuenta; no se modifica')
if (!saved.registrationAccount) {
  saved.registrationAccount = { username: 'androidqa3', email: 'androidqa3@qa.trucazo.test',
    password: 'Tq9!' + randomBytes(24).toString('base64url'), id: null,
    purpose: 'ANDROID-07: alta real autorizada; reutilizar, no recrear' }
  // Escribir sobre el archivo existente conserva su ACL privada de Windows.
  await writeFile(QA_FILE, JSON.stringify(saved, null, 2))
}
const qa = saved.registrationAccount, c = await deviceCDP()
const click = label => c.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()===${JSON.stringify(label)})?.click()`)
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await c.evaluate(expression)) return
    const error = await c.evaluate(`document.querySelector('[role=alert]')?.textContent||''`)
    if (error) throw Error(error)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw Error('La pantalla esperada no apareció; no se reintenta el alta automáticamente')
}
async function logout() {
  const owner = await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id`)
  if (!owner) return
  assert.ok(['d1512143-e3c0-44c3-8f2c-8904197f5fdb', ...saved.accounts.map(a=>a.id), qa.id].includes(owner), 'Cuenta inesperada')
  await c.evaluate(`location.hash='#/lobby'`)
  await wait(`!!document.querySelector('header')`)
  await click('Perfil')
  await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText.trim()==='Cerrar sesión')`)
  await click('Cerrar sesión')
  await wait(`!!document.querySelector('input[name=identifier]')`)
}
async function fill(fields) {
  await c.evaluate(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(const [name,value] of ${JSON.stringify(fields)}){const input=document.querySelector('input[name='+name+']');if(!input)throw Error('Falta el campo');set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()`)
}
try {
  await logout()
  let created = false
  if (!qa.id) {
    await c.evaluate(`document.querySelector('a[href="#/register"]').click()`)
    await wait(`!!document.querySelector('input[name=username]')`)
    await fill([['username', qa.username], ['email', qa.email], ['password', qa.password]])
    await c.evaluate(`document.querySelector('form').requestSubmit()`)
    await wait(`!!document.querySelector('header')&&!!JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')||'null')?.user.id`)
    qa.id = await c.evaluate(`JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1')).user.id`)
    qa.createdAt = new Date().toISOString()
    await writeFile(QA_FILE, JSON.stringify(saved, null, 2))
    created = true
  } else {
    await fill([['identifier', qa.username], ['password', qa.password]])
    await click('Iniciar sesión')
    await wait(`!!document.querySelector('header')`)
  }
  const user = await admin.auth.admin.getUserById(qa.id)
  if (user.error) throw Error('No se pudo verificar el alta en Auth')
  assert.equal(user.data.user.email, qa.email); assert.ok(user.data.user.email_confirmed_at)
  assert.equal(user.data.user.is_anonymous, false)
  const profile = await admin.from('profiles').select('id,username,coins,campaign_points,is_admin,is_bot').eq('id', qa.id).single()
  if (profile.error) throw Error('No se pudo verificar el perfil creado por el trigger')
  assert.equal(profile.data.username, qa.username); assert.equal(profile.data.is_admin, false); assert.equal(profile.data.is_bot, false)
  if (created) { assert.equal(profile.data.coins, 1000); assert.equal(profile.data.campaign_points, 0) }
  const preferences = await admin.from('email_preferences').update({ news_enabled:false, reengagement_enabled:false, ranking_enabled:false, tournaments_enabled:false }).eq('user_id', qa.id).select('user_id')
  if (preferences.error || preferences.data.length !== 1) throw Error('No se pudieron desactivar los correos de la cuenta QA')
  const marked = await admin.auth.admin.updateUserById(qa.id, { app_metadata: { ...user.data.user.app_metadata, qa_purpose: 'android-app-acceptance' } })
  if (marked.error) throw Error('No se pudo identificar la cuenta QA')
  assert.equal(await c.evaluate(`!!localStorage.getItem('trucazo:mobile:auth-flow:v1')`), false)
  await logout()
  await c.evaluate(`document.querySelector('a[href="#/register"]').click()`)
  await wait(`!!document.querySelector('input[name=username]')`)
  await fill([['username', qa.username], ['email', qa.email], ['password', qa.password]])
  await c.evaluate(`document.querySelector('form').requestSubmit()`)
  for (let i=0;i<60;i++) {
    if(await c.evaluate(`document.querySelector('[role=alert]')?.textContent.includes('nombre de usuario ya está en uso')`))break
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  assert.ok(await c.evaluate(`document.querySelector('[role=alert]')?.textContent.includes('nombre de usuario ya está en uso')`))
  await c.evaluate(`document.querySelector('a[href="#/login"]').click()`)
  await wait(`!!document.querySelector('input[name=identifier]')`)
  await fill([['identifier', qa.username], ['password', qa.password]])
  await click('Iniciar sesión')
  await wait(`!!document.querySelector('header')&&JSON.parse(localStorage.getItem('trucazo:mobile:auth:v1'))?.user.id===${JSON.stringify(qa.id)}`)
  const same = await admin.from('profiles').select('id').eq('username', qa.username)
  assert.equal(same.data.length, 1); assert.equal(same.data[0].id, qa.id)
  const result = { scope:'APK instalado/SDK/Supabase reales; formulario normal, confirmación apagada', owner:qa.id, username:qa.username,
    createdInThisRun:created, immediateSession:true, profile:profile.data, duplicateUsernameRejected:true,
    normalUsernamePasswordLogin:true, marketingDisabled:true, credentialsPrivate:true, verificationEmailsRequired:false }
  await writeFile('android/generated/android-07-registration-real.json', JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
} catch (failure) {
  console.error('Registro QA: '+failure.message.replaceAll(qa.password,'[privado]').replaceAll(qa.email,'[correo QA]'))
  process.exitCode=1
} finally { c.close() }
