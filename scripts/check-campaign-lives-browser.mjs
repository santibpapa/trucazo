// Auth/Postgres/Next reales en CI; SDK publicitario simulado, sin impresiones pagas.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

assert.equal(process.env.GITHUB_ACTIONS, 'true')
assert.equal(process.env.PGHOST, '127.0.0.1')
assert.equal(process.env.PGPORT, '54322')
const api = process.env.NEXT_PUBLIC_SUPABASE_URL
const origin = process.env.NEXT_PUBLIC_SITE_URL
assert.equal(api, 'http://127.0.0.1:54321')
assert.equal(origin, 'http://localhost:3000')
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sql = query => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()
const screenshots = join(process.env.RUNNER_TEMP, 'campaign-lives-screenshots')
await mkdir(screenshots, { recursive: true })
async function capture(page, name) {
  await page.locator('.animate-clouds-left').waitFor({ state: 'detached' })
  await page.screenshot({ path: join(screenshots, name), fullPage: true, animations: 'disabled' })
}
async function checkHud(page, lifeLabel) {
  const ranking = await page.getByRole('button', { name: 'Ranking', exact: true }).boundingBox()
  const lives = await page.getByRole('button', { name: lifeLabel, exact: true }).boundingBox()
  const fame = await page.getByRole('button', { name: /^Fama / }).boundingBox()
  const title = await page.getByRole('heading', { name: 'Modo Historia', exact: true }).boundingBox()
  const back = await page.getByRole('link', { name: 'Volver al lobby', exact: true }).boundingBox()
  assert.ok(lives.y >= ranking.y + ranking.height, 'vidas debajo de Ranking')
  assert.ok(Math.abs(lives.x - ranking.x) < 1, 'vidas en la misma columna de Ranking')
  assert.ok(lives.x + lives.width <= fame.x, 'vidas no tapa fama')
  assert.ok(lives.y < 130, 'vidas queda en la barra superior')
  assert.ok(title.x >= 0 && title.x + title.width <= ranking.x, 'título completo sin quedar debajo de los controles')
  assert.ok(back.x + back.width <= ranking.x, 'volver no queda debajo de Ranking')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sin desborde horizontal')
}
async function checkNoLives(page) {
  assert.equal(await page.getByText(/\bvidas?\b|∞/i).count(), 0, 'sin mensajes de vidas durante la pausa')
  assert.equal(await page.getByRole('button', { name: /vidas de Historia|Vidas ilimitadas|Ver vidas/i }).count(), 0, 'sin indicador de vidas durante la pausa')
  assert.equal(await page.getByRole('heading', { name: 'Vidas de Historia', exact: true }).count(), 0, 'sin ventana de vidas durante la pausa')
  assert.equal(await page.getByText('∞', { exact: true }).count(), 0, 'sin símbolo de vidas infinitas')
  assert.equal(await page.getByRole('button', { name: 'Pedir', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Ver anuncio para recuperar 1 vida', exact: true }).count(), 0)
  assert.equal(await page.getByText(/Próxima vida en/).count(), 0)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sin desborde horizontal')
}
const rpc = async (c, name, args) => {
  const result = await c.rpc(name, args)
  assert.equal(result.error, null, `${name}: ${result.error?.message}`)
  return result.data
}
async function person() {
  const c = createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const result = await c.auth.signInAnonymously()
  assert.equal(result.error, null)
  const id = result.data.user.id
  const name = `Lives${randomUUID().slice(0, 6)}`
  // UUID y nombre generados por la prueba, nunca entradas de usuarios.
  sql(`update public.profiles set username='${name}' where id='${id}'`)
  return { c, id, name, session: result.data.session }
}
async function contextFor(browser, person) {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } })
  const cookies = []
  const writer = createServerClient(api, key, { cookies: { getAll: () => [], setAll: v => cookies.push(...v) } })
  assert.equal((await writer.auth.setSession(person.session)).error, null)
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: origin, httpOnly: false, secure: false, sameSite: 'Lax' })))
  await context.addInitScript(() => localStorage.setItem('trucazo:campania:tutorial', '1'))
  return context
}
const browser = await chromium.launch({ headless: true })
try {
  const a = await person(), b = await person()
  await rpc(a.c, 'send_friend_request', { p_username: b.name })
  const community = await rpc(b.c, 'get_community')
  const friendship = community.incoming[0]
  await rpc(b.c, 'respond_friend_request', { p_friendship_id: friendship.friendship_id, p_accept: true })
  const map = await rpc(a.c, 'get_campaign_map')
  const rival = map.provinces.flatMap(p => p.rivals).find(r => r.unlocked)
  assert.equal((await rpc(a.c, 'get_campaign_lives')).lives_enabled, false, 'pausado por defecto')
  let pausedDuel
  for (let i = 0; i < 4; i++) {
    pausedDuel = await rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id })
    await rpc(a.c, 'forfeit', { p_game_id: pausedDuel.id })
  }
  assert.equal((await rpc(a.c, 'get_campaign_lives')).lives, 3, 'la cuarta derrota tampoco consume vidas')
  sql(`update campaign_internal.lives set lives=0,next_life_at=statement_timestamp()+interval '20 minutes',depletion_id=gen_random_uuid() where user_id='${a.id}'`)
  const pausedContext = await contextFor(browser, a)
  const pausedPage = await pausedContext.newPage()
  await pausedPage.goto(`${origin}/historia`)
  for (const width of [320, 360, 390, 1280]) {
    await pausedPage.setViewportSize({ width, height: width === 1280 ? 800 : 640 })
    await pausedPage.getByRole('button', { name: 'Ranking', exact: true }).waitFor()
    await pausedPage.getByRole('button', { name: /^Fama / }).waitFor()
    await checkNoLives(pausedPage)
    await capture(pausedPage, `vidas-pausadas-mapa-${width}.png`)
  }
  await pausedPage.setViewportSize({ width: 360, height: 640 })
  const livesResponse = pausedPage.waitForResponse(response => response.url().endsWith('/rpc/get_campaign_lives'))
  await pausedPage.goto(`${origin}/game/${pausedDuel.id}`)
  assert.equal((await (await livesResponse).json()).lives_enabled, false)
  await pausedPage.getByRole('button', { name: 'Revancha', exact: true }).waitFor()
  await checkNoLives(pausedPage)
  await capture(pausedPage, 'resultado-sin-sistema-de-vidas.png')
  assert.equal(await pausedPage.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'resultado pausado sin scroll')
  await pausedPage.getByRole('button', { name: 'Revancha', exact: true }).click()
  await pausedPage.waitForURL(url => url.pathname.startsWith('/game/') && !url.pathname.endsWith(pausedDuel.id))
  const resumedId = pausedPage.url().split('/').at(-1)
  await rpc(a.c, 'forfeit', { p_game_id: resumedId })
  assert.equal((await rpc(a.c, 'get_campaign_lives')).lives, 0, 'saldo previo cero tampoco impide Revancha')
  await pausedContext.close()
  sql(`update campaign_internal.lives set lives=3,next_life_at=null,depletion_id=null where user_id='${a.id}'`)
  sql('update campaign_internal.ad_settings set lives_enabled=true where singleton')
  console.log('PASS: pausa real, cuatro derrotas, Revancha desde cero y vidas completamente ocultas')
  const starts = await Promise.all([rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id }), rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id })])
  assert.equal(starts[0].id, starts[1].id, 'inicios concurrentes retoman el mismo duelo')
  let lastDuel
  for (let i = 0; i < 3; i++) {
    const duel = await rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id })
    await rpc(a.c, 'forfeit', { p_game_id: duel.id })
    lastDuel = duel.id
    assert.equal((await rpc(a.c, 'get_campaign_lives')).lives, 2 - i)
  }
  assert.equal((await a.c.rpc('start_campaign_duel', { p_rival_id: rival.id })).error.message, 'CAMPAIGN_NO_LIVES')
  const aContext = await contextFor(browser, a), bContext = await contextFor(browser, b)
  const page = await aContext.newPage(), friendPage = await bContext.newPage()
  await page.goto(`${origin}/game/${lastDuel}`)
  await page.getByRole('button', { name: 'Revancha', exact: true }).click()
  await page.getByRole('heading', { name: 'Vidas de Historia', exact: true }).waitFor()
  const overlay = await page.getByRole('dialog').locator('..').boundingBox()
  assert.deepEqual(overlay, { x: 0, y: 0, width: 360, height: 640 }, 'la ventana cubre el viewport aunque la mesa tenga transformaciones')
  await capture(page, 'resultado-sin-vidas-movil.png')
  await page.getByRole('button', { name: 'Cerrar ventana', exact: true }).click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'resultado entra sin scroll')
  await page.goto(`${origin}/historia`)
  await checkHud(page, '0 de 3 vidas de Historia. Ver opciones')
  await page.getByRole('button', { name: '0 de 3 vidas de Historia. Ver opciones' }).click()
  await page.getByRole('heading', { name: 'Vidas de Historia', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Ver anuncio para recuperar 1 vida', exact: true }).count(), 0, 'apagado sin alta publicitaria')
  await page.getByRole('button', { name: 'Pedir', exact: true }).click()
  await page.getByText(`Esperando la ayuda de ${b.name}.`, { exact: true }).waitFor()
  await capture(page, 'sin-vidas-movil.png')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await friendPage.goto(`${origin}/comunidad`)
  await friendPage.getByRole('button', { name: 'Amigos', exact: true }).click()
  await friendPage.getByRole('button', { name: 'Enviar gratis', exact: true }).click()
  await friendPage.getByText('¡Vida enviada! Tus vidas siguen iguales.', { exact: true }).waitFor()
  await page.getByRole('button', { name: '1 de 3 vidas de Historia. Ver opciones' }).waitFor({ timeout: 22000 })
  assert.equal((await rpc(b.c, 'get_campaign_lives')).lives, 3)
  console.log('PASS: derrota, cero, pedido visible en Amigos y ayuda gratis entre dos sesiones')

  // Dos respuestas HTTP simultáneas al mismo pedido entregan una sola vida.
  let duel = await rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id })
  await rpc(a.c, 'forfeit', { p_game_id: duel.id })
  await rpc(a.c, 'request_campaign_life', { p_friend_id: b.id })
  const request = (await rpc(b.c, 'get_campaign_lives')).requests_in[0]
  const gifts = await Promise.all([rpc(b.c, 'send_campaign_life', { p_request_id: request.id }), rpc(b.c, 'send_campaign_life', { p_request_id: request.id })])
  assert.deepEqual(gifts.sort(), ['already_sent', 'sent'])
  assert.equal((await rpc(a.c, 'get_campaign_lives')).lives, 1)
  duel = await rpc(a.c, 'start_campaign_duel', { p_rival_id: rival.id })
  await rpc(a.c, 'forfeit', { p_game_id: duel.id })

  // Proveedor simulado: el código de integración y las acreditaciones son reales.
  sql('update campaign_internal.ad_settings set enabled=true where singleton')
  await aContext.route('https://securepubads.g.doubleclick.net/tag/js/gpt.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }))
  await aContext.addInitScript(() => {
    const listeners = new Map()
    const slot = { addService() {} }
    const service = { addEventListener(n, f) { listeners.set(n, f) }, removeEventListener(n) { listeners.delete(n) } }
    window.googletag = {
      cmd: { push(f) { f() } }, enums: { OutOfPageFormat: { REWARDED: 'rewarded' } },
      defineOutOfPageSlot() { return slot }, pubads() { return service }, enableServices() {}, destroySlots() {},
      display() {
        listeners.get('rewardedSlotReady')?.({ slot, makeRewardedVisible() {
          listeners.get('rewardedSlotGranted')?.({ slot })
          listeners.get('rewardedSlotClosed')?.({ slot })
        } })
      },
    }
  })
  await page.reload()
  await page.getByRole('button', { name: '0 de 3 vidas de Historia. Ver opciones' }).click()
  await page.getByRole('button', { name: 'Ver anuncio para recuperar 1 vida', exact: true }).click()
  await page.getByText('Ya podés seguir jugando.', { exact: true }).waitFor()
  assert.equal((await rpc(a.c, 'get_campaign_lives')).lives, 1)
  console.log('PASS: integración publicitaria con SDK simulado y recompensa real en SQL')

  // Adelantar únicamente el reloj del dato de prueba comprueba la recarga sin
  // esperar media hora ni permitir al navegador decidir el saldo.
  sql(`update campaign_internal.lives set next_life_at=statement_timestamp()-interval '31 minutes' where user_id='${a.id}'`)
  await page.getByRole('button', { name: 'Cerrar ventana', exact: true }).click()
  await page.getByRole('button', { name: /de 3 vidas de Historia/ }).click()
  await page.getByRole('button', { name: '3 de 3 vidas de Historia. Ver opciones' }).waitFor({ timeout: 22000 })
  await checkHud(page, '3 de 3 vidas de Historia. Ver opciones')
  await capture(page, 'vidas-completas-movil.png')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await aContext.close(); await bContext.close()
  console.log('PASS: recarga desde servidor, máximo tres y presentación móvil')
} finally { await browser.close() }
