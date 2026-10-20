// Auth, navegador y SQL reales. Exclusivamente la copia vacía del runner de CI.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

assert.equal(process.env.GITHUB_ACTIONS, 'true')
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:54321')
assert.equal(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000')
const api = process.env.NEXT_PUBLIC_SUPABASE_URL
const origin = process.env.NEXT_PUBLIC_SITE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const screenshots = join(process.env.RUNNER_TEMP, 'invite-screenshots')
await mkdir(screenshots, { recursive: true })
const client = () => createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false } })
async function rpc(c, name, args) {
  const r = await c.rpc(name, args)
  assert.equal(r.error, null, `${name}: ${r.error?.message}`)
  return r.data
}
async function person() {
  const c = client()
  const { data, error } = await c.auth.signInAnonymously()
  assert.equal(error, null, error?.message)
  return { c, session: data.session, id: data.user.id }
}
async function browserSession(context) {
  const cookies = await context.cookies()
  const reader = createServerClient(api, key, { cookies: { getAll: () => cookies, setAll: () => {} } })
  const { data: { session } } = await reader.auth.getSession()
  assert.ok(session)
  const c = client()
  assert.equal((await c.auth.setSession(session)).error, null)
  const { data: { user }, error } = await c.auth.getUser()
  assert.equal(error, null)
  return { c, id: user.id }
}
async function ownerCookies(context, session) {
  const cookies = []
  const writer = createServerClient(api, key, { cookies: { getAll: () => [], setAll: values => cookies.push(...values) } })
  assert.equal((await writer.auth.setSession(session)).error, null)
  await context.addCookies(cookies.map(({ name, value, options }) => ({ name, value, url: origin,
    httpOnly: options.httpOnly ?? false, secure: false, sameSite: 'Lax' })))
}
async function table(owner, mode, privateTable) {
  const created = mode === '1v1'
    ? await rpc(owner.c, 'create_table', { p_name: 'Truco con amigos', p_bet: 100, p_is_private: privateTable,
      p_private_code: privateTable ? randomUUID().slice(0, 6).toUpperCase() : null, p_target_score: 15, p_time_limit: 30 })
    : (await rpc(owner.c, 'team_create', { p_request_id: randomUUID(), p_name: 'Truco con amigos', p_bet: 100,
      p_is_private: privateTable, p_target_score: 15, p_time_limit: 30 })).table
  const token = await rpc(owner.c, 'get_table_invite', { p_table_id: created.id, p_mode: mode })
  return { id: created.id, path: `/invitar/${token}`, token, created }
}
async function coins(c, id) {
  const r = await c.from('profiles').select('coins').eq('id', id).single()
  assert.equal(r.error, null)
  return r.data.coins
}
const browser = await chromium.launch({ headless: true })
try {
  for (const mode of ['1v1', '2v2']) for (const privateTable of [false, true]) {
    const owner = await person()
    const t = await table(owner, mode, privateTable)
    const ownerContext = await browser.newContext()
    await ownerCookies(ownerContext, owner.session)
    const creator = await ownerContext.newPage()
    await creator.goto(`${origin}${mode === '1v1' ? '/game/' : '/game/parejas/'}${t.id}`)
    await creator.getByRole('button', { name: 'Invitar por enlace', exact: true }).click()
    await creator.getByRole('button', { name: 'Compartir', exact: true }).waitFor()
    assert.equal(await creator.getByRole('textbox', { name: 'Enlace de invitación' }).inputValue(), `${origin}${t.path}`)

    const context = await browser.newContext({ viewport: { width: privateTable ? 360 : 1280, height: privateTable ? 640 : 900 } })
    const page = await context.newPage()
    let joins = 0
    page.on('request', r => { if (r.url().includes('/rpc/join_table_invite')) joins++ })
    await page.goto(`${origin}${t.path}`)
    await page.getByRole('heading', { name: 'Truco con amigos' }).waitFor()
    if (privateTable) await page.screenshot({ path: join(screenshots, `invitacion-${mode}-movil.png`), fullPage: true })
    assert.equal(joins, 0, 'abrir no confirma')
    const preview = await rpc(owner.c, 'preview_table_invite', { p_token: t.token })
    assert.equal(preview.occupied, 1)
    await page.getByLabel('Tu nombre para jugar').fill(`Amigo${randomUUID().slice(0, 6)}`)
    await page.getByRole('button', { name: 'Continuar como invitado', exact: true }).click()
    await page.getByRole('button', { name: 'Unirme', exact: true }).waitFor()
    assert.equal(joins, 0, 'identificarse no paga la apuesta')
    const guest = await browserSession(context)
    assert.equal(await coins(guest.c, guest.id), 1000)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.getByRole('button', { name: 'Unirme', exact: true }).click()
    await page.waitForURL(`${origin}${mode === '1v1' ? '/game/' : '/game/parejas/'}${t.id}`)
    assert.equal(await coins(guest.c, guest.id), 900)
    await rpc(guest.c, 'join_table_invite', { p_token: t.token })
    assert.equal(await coins(guest.c, guest.id), 900, 'reintentar no repite el cobro')
    if (mode === '2v2') {
      assert.equal((await rpc(guest.c, 'team_snapshot', { p_table_id: t.id })).my_seat, null)
      await page.getByRole('button', { name: 'Sentarme en el asiento 3', exact: true }).click()
      await page.getByRole('button', { name: 'Sentarme en el asiento 3', exact: true }).waitFor({ state: 'detached' })
      assert.equal((await rpc(guest.c, 'team_snapshot', { p_table_id: t.id })).my_seat, 2)
      if (privateTable) await page.screenshot({ path: join(screenshots, 'asiento-parejas-movil.png'), fullPage: true })
    }
    await page.goto(`${origin}${t.path}`)
    await page.getByRole('button', { name: 'Volver a mi mesa', exact: true }).waitFor()
    assert.equal(await coins(guest.c, guest.id), 900)
    await context.close(); await ownerContext.close()
    console.log(`PASS: ${mode} ${privateTable ? 'privada' : 'pública'}, compartir, invitado, confirmación y cobro único`)
  }

  for (const method of ['email', 'registro']) {
    const owner = await person(), t = await table(owner, '1v1', true)
    const email = `invite-${randomUUID()}@test.invalid`, password = `Trucazo-${randomUUID()}`
    if (method === 'email') {
      const r = await client().auth.signUp({ email, password, options: { data: { username: randomUUID().slice(0, 12) } } })
      assert.equal(r.error, null, r.error?.message)
      assert.ok(r.data.session)
    }
    const context = await browser.newContext(), page = await context.newPage()
    await page.goto(`${origin}${t.path}`)
    await page.getByRole('link', { name: method === 'email' ? 'Ya tengo cuenta · Iniciar sesión' : 'Crear una cuenta', exact: true }).click()
    await page.getByLabel(method === 'email' ? 'Email o usuario' : 'Email', { exact: true }).fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    if (method === 'registro') await page.getByLabel('Nombre de usuario', { exact: true }).fill(randomUUID().slice(0, 12))
    await page.getByRole('button', { name: method === 'email' ? 'Iniciar sesión' : /Registrarse y ganar/ }).click()
    await page.waitForURL(`${origin}${t.path}`)
    await page.getByRole('button', { name: 'Unirme', exact: true }).waitFor()
    const account = await browserSession(context)
    assert.equal(await coins(account.c, account.id), 1000, 'login/registro no cobra')
    await page.goto(`${origin}/login?next=${encodeURIComponent(t.path)}`)
    await page.waitForURL(`${origin}${t.path}`)
    await page.getByRole('button', { name: 'Unirme', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Unirme', exact: true }).click()
    await page.waitForURL(`${origin}/game/${t.id}`)
    assert.equal(await coins(account.c, account.id), 900)
    await context.close()
    console.log(`PASS: ${method} vuelve a la invitación antes de confirmar`)
  }

  // Dos conexiones reales disputan el último lugar; después el ganador reintenta
  // simultáneamente desde dos conexiones HTTP. Debe haber un único descuento.
  for (const mode of ['1v1', '2v2']) {
    const owner = await person(), t = await table(owner, mode, true)
    if (mode === '2v2') for (let i = 0; i < 2; i++) {
      const filler = await person()
      await rpc(filler.c, 'join_table_invite', { p_token: t.token })
    }
    const a = await person(), b = await person()
    const results = await Promise.all([a.c, b.c].map(c => c.rpc('join_table_invite', { p_token: t.token })))
    assert.equal(results.filter(r => !r.error).length, 1, 'un solo ganador para el último lugar')
    const winner = results[0].error ? b : a, loser = winner === a ? b : a
    assert.equal(await coins(winner.c, winner.id), 900)
    assert.equal(await coins(loser.c, loser.id), 1000)
    await Promise.all([rpc(winner.c, 'join_table_invite', { p_token: t.token }), rpc(winner.c, 'join_table_invite', { p_token: t.token })])
    assert.equal(await coins(winner.c, winner.id), 900)
    console.log(`PASS: ${mode}, último lugar concurrente y reintento simultáneo`)
  }

  const owner = await person(), t = await table(owner, '1v1', true)
  await rpc(owner.c, 'cancel_table', { p_table_id: t.id })
  const context = await browser.newContext(), page = await context.newPage()
  await page.goto(`${origin}${t.path}`)
  await page.getByRole('heading', { name: 'Esta invitación ya no está disponible' }).waitFor()
  await page.goto(`${origin}/invitar/${randomUUID()}`)
  await page.getByRole('heading', { name: 'Esta invitación ya no está disponible' }).waitFor()
  await context.close()
  console.log('PASS: enlaces cerrados y desconocidos')
} finally { await browser.close() }
