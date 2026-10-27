// Control de aceptación por instrumentación firmada aparte; no requiere CDP.
// No registra scripts, contraseñas ni sesiones en archivos o consola.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const controlFile = new URL('../../../android/generated/private/android-17-device-control.json', import.meta.url)
async function connection({ port, token }) {
  const request = async (path, body = {}) => {
    const response = await fetch('http://127.0.0.1:' + port + path, { method: 'POST', headers: {
      Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) })
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    return data
  }
  return { evaluate: async script => (await request('/evaluate', { script })).value, stop: () => request('/stop') }
}
export async function connectReleaseDevice() { return connection(JSON.parse(await readFile(controlFile, 'utf8'))) }

export async function releaseDevice({ serial, port = 9237, adbPath = process.env.ADB } = {}) {
  assert.ok(serial && adbPath, 'Indicar serial y cargar scripts/android-env.ps1')
  const token = randomBytes(24).toString('hex')
  const args = ['-s', serial]
  execFileSync(adbPath, [...args, 'forward', 'tcp:' + port, 'tcp:9237'])
  const processTest = spawn(adbPath, [...args, 'shell', 'am', 'instrument', '-w', '-e', 'class',
    'ar.com.trucazo.capacitor.dev.ReleaseAcceptanceTest', '-e', 'acceptanceToken', token,
    'ar.com.trucazo.app.test/androidx.test.runner.AndroidJUnitRunner'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  processTest.stdout.on('data', data => { output += data.toString().replaceAll(token, '[local]') })
  processTest.stderr.on('data', data => { output += data.toString().replaceAll(token, '[local]') })
  const request = async (path, body = {}) => {
    const response = await fetch('http://127.0.0.1:' + port + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) })
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    return data
  }
  let connected = false
  for (let i = 0; i < 120; i++) {
    try { await request('/evaluate', { script: 'true' }); connected = true; break } catch { await new Promise(r => setTimeout(r, 250)) }
    if (processTest.exitCode !== null) break
  }
  if (!connected) { processTest.kill(); throw new Error('No inició el comprobador firmado: ' + output.slice(-2000)) }
  return {
    connection: { port, token },
    finished: new Promise(resolve => processTest.once('exit', resolve)),
    evaluate: async script => (await request('/evaluate', { script })).value,
    send: async (method, params) => {
      assert.equal(method, 'Page.captureScreenshot')
      return { data: execFileSync(adbPath, [...args, 'exec-out', 'screencap', '-p']).toString('base64') }
    },
    async close() {
      await request('/stop').catch(() => {})
      await new Promise(resolve => { if (processTest.exitCode !== null) resolve(); else processTest.once('exit', resolve) })
      execFileSync(adbPath, [...args, 'forward', '--remove', 'tcp:' + port])
      await writeFile(new URL('../../../android/generated/android-17-release-device-' + serial + '.log', import.meta.url), output)
    },
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const device = await releaseDevice({ serial: process.argv[2] })
  try {
    await writeFile(controlFile, JSON.stringify(device.connection), { mode: 0o600 })
    console.log('Comprobador firmado disponible por conexión local privada.')
    await device.finished
  } finally { await device.close(); await unlink(controlFile).catch(() => {}) }
}
