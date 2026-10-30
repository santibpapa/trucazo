import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const mobile = fileURLToPath(new URL('..', import.meta.url))
const evidence = path.resolve(mobile, '../../android/generated')
await mkdir(evidence, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname
  try {
    const file = path.join(mobile, 'dist', name === '/' ? 'index.html' : name.slice(1))
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath: process.env.PWA_BROWSER_EXECUTABLE })
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } })
  const errors = [], remote = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== origin) { remote.push(route.request().url()); return route.abort() }
    return route.continue()
  })
  await page.goto(origin)
  await page.getByRole('button', { name: 'Iniciar sesión' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(evidence, 'android-02-base-browser.png') })
  const style = () => {
    const input = document.querySelector('input')
    const panel = input.closest('main > div')
    const css = element => {
      const s = getComputedStyle(element)
      return { geist: /geist/i.test(s.fontFamily), fontSize: s.fontSize, color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius, padding: s.padding }
    }
    return { input: css(input), panel: css(panel), width: panel.getBoundingClientRect().width }
  }
  const localStyle = await page.evaluate(style)
  assert.equal(localStyle.input.geist, true)
  const web = await browser.newPage({ viewport: { width: 360, height: 640 } })
  await web.goto((process.env.MOBILE_WEB_ORIGIN || 'http://127.0.0.1:3000') + '/login?android=1')
  await web.getByRole('button', { name: 'Iniciar sesión' }).waitFor()
  await web.evaluate(() => document.fonts.ready)
  assert.deepEqual(localStyle, await web.evaluate(style))
  await web.screenshot({ path: path.join(evidence, 'android-02-base-web.png') })
  const regularWeb = await browser.newPage()
  await regularWeb.goto((process.env.MOBILE_WEB_ORIGIN || 'http://127.0.0.1:3000') + '/login')
  await regularWeb.getByRole('button', { name: 'Entrar como invitado' }).waitFor()
  await regularWeb.getByRole('link', { name: 'Registrate gratis' }).click()
  await regularWeb.waitForURL('**/register')
  await page.getByRole('link', { name: 'Registrate gratis' }).click()
  await page.getByRole('heading', { name: 'Crear tu cuenta' }).waitFor()
  await page.goBack()
  await page.getByRole('button', { name: 'Iniciar sesión' }).waitFor()
  await page.context().setOffline(true)
  await page.getByRole('status').filter({ hasText: 'Sin conexión' }).waitFor()
  await page.locator('input').nth(0).fill('prueba')
  await page.locator('input').nth(1).fill('prueba')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.getByRole('alert').filter({ hasText: 'Necesitás internet' }).waitFor()
  assert.deepEqual(remote, [])
  assert.deepEqual(errors, [])
  await writeFile(path.join(evidence, 'android-02-browser.json'), JSON.stringify({ remoteRequests: remote, pageErrors: errors, sharedStyles: localStyle, navigation: true, offlineNotice: true }, null, 2))
  console.log('OK interfaz local sin peticiones remotas, navegación, aviso offline y estilos iguales al acceso web a 360×640.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
