// Puente de aceptación local: dos sesiones propias, registros reales intactos.
// No guarda credenciales, cuerpos ni cartas; nunca crea/corrige resultados.
import http from 'node:http'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const port = Number(process.env.ANDROID06_GATE_PORT || 3002)
const upstream = Number(process.env.ANDROID06_UPSTREAM_PORT || 3000)
const evidencePath = process.env.ANDROID06_EVIDENCE_PATH || 'android/generated/android-06-concurrent-transport.json'
let armed = false, waiting = [], evidence = [], serial = 0
const now = () => new Date().toISOString()
const reply = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}
const read = async req => {
  const parts = []; let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 2 * 1024 * 1024) throw Error('Lote demasiado grande')
    parts.push(chunk)
  }
  return Buffer.concat(parts)
}
const forward = (req, body, res, path = req.url, entry) => new Promise((resolve, reject) => {
  if (entry) entry.dispatchedAt = now()
  const headers = { ...req.headers, 'content-length': body.length }
  delete headers['transfer-encoding']
  // La web del puente hace solicitudes al mismo origen local. Al reenviar,
  // conservar esa relación sin ampliar los orígenes admitidos por la API.
  if (headers.origin === 'http://localhost:' + port && headers.host === 'localhost:' + port) {
    headers.origin = 'http://localhost:' + upstream
  }
  const out = http.request({ hostname: '127.0.0.1', port: upstream, path, method: req.method, headers }, incoming => {
    if (entry) { entry.headersAt = now(); entry.status = incoming.statusCode }
    if (res) { res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res) }
    const parts = []
    incoming.on('data', chunk => parts.push(chunk))
    incoming.on('end', () => {
      if (entry) entry.completedAt = now()
      resolve({ status: incoming.statusCode, body: Buffer.concat(parts) })
    })
  })
  out.on('error', reject); out.end(body)
})
async function release(pair) {
  try {
    const owners = await Promise.all(pair.map(async item => {
      const identity = await forward({ method: 'GET', headers: item.req.headers }, Buffer.alloc(0), null, '/api/android/historia?identity=1')
      assert.equal(identity.status, 200, 'Las dos sesiones deben estar ingresadas')
      return JSON.parse(identity.body).userId
    }))
    assert.equal(owners[0], owners[1], 'La cuenta debe ser la misma')
    const batches = pair.map(item => JSON.parse(item.body))
    for (const batch of batches) {
      assert.equal(batch.complete, true)
      assert.equal(batch.records.length, 1, 'Preparar una victoria por sesión')
      assert.equal(batch.records[0].trial.game.status, 'finished')
      assert.equal(batch.records[0].trial.result.winner, owners[0], 'La partida debe haberse ganado jugando')
      assert.ok(batch.records[0].projected_reward.coins > 0, 'Ambas descargas deben preceder a la primera victoria')
    }
    const [a, b] = batches.map(batch => batch.records[0])
    assert.notEqual(a.grant_id, b.grant_id, 'Cada sesión necesita su propia descarga')
    assert.notEqual(a.id, b.id, 'Cada sesión necesita su propia partida')
    assert.equal(a.trial.rival, b.trial.rival, 'Debe ser el mismo rival')
    const entries = pair.map((item, index) => ({ arrivalAt: item.arrivalAt, id: batches[index].records[0].id,
      grantId: batches[index].records[0].grant_id, owner: owners[index], rival: a.trial.rival,
      transport: item.req.headers.authorization ? 'native-bearer' : 'web-cookie' }))
    assert.equal(new Set(entries.map(entry => entry.transport)).size, 2, 'Usar web y APK con sus propias sesiones')
    const results = await Promise.all(pair.map((item, index) => forward(item.req, item.body, item.res, item.req.url, entries[index])))
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 200) {
        const result = JSON.parse(results[i].body)
        entries[i].receipts = result.receipts
        entries[i].balance = { coins: result.snapshot.coins, points: result.snapshot.points }
      }
    }
    const overlap = Math.max(...entries.map(entry => Date.parse(entry.dispatchedAt))) < Math.min(...entries.map(entry => Date.parse(entry.headersAt)))
    evidence.push({ pair: ++serial, overlap, entries })
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence.at(-1)))
  } catch (failure) {
    // Fallar antes de enviar si las sesiones/descargas no corresponden.
    for (const item of pair) if (!item.res.headersSent) reply(item.res, 503, { error: failure.message })
    console.log('Par no aceptado: ' + failure.message)
  }
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/__android06/status') return reply(res, 200, { armed, waiting: waiting.length, pairs: evidence })
    if (req.url === '/__android06/arm' && req.method === 'POST') {
      assert.equal(waiting.length, 0, 'Ya hay un envío esperando')
      armed = true; return reply(res, 200, { armed })
    }
    if (req.url === '/__android06/disarm' && req.method === 'POST') {
      armed = false
      for (const item of waiting) { clearTimeout(item.timer); reply(item.res, 503, { error: 'Prueba cancelada. Las partidas siguen guardadas.' }) }
      waiting = []; return reply(res, 200, { armed })
    }
    const body = await read(req)
    if (armed && req.method === 'POST' && req.url === '/api/android/historia') {
      const item = { req, res, body, arrivalAt: now() }
      item.timer = setTimeout(() => {
        waiting = waiting.filter(other => other !== item)
        if (!res.headersSent) reply(res, 503, { error: 'Falta el otro envío. Las partidas siguen guardadas.' })
      }, 25000)
      waiting.push(item)
      res.on('close', () => {
        clearTimeout(item.timer); waiting = waiting.filter(other => other !== item)
      })
      if (waiting.length === 2) {
        const pair = waiting; waiting = []; armed = false
        pair.forEach(item => clearTimeout(item.timer)); void release(pair)
      }
      return
    }
    await forward(req, body, res)
  } catch (failure) { if (!res.headersSent) reply(res, 503, { error: failure.message }) }
})
server.listen(port, '127.0.0.1', () => console.log('Puente local ANDROID-06 en http://localhost:' + port + ' → API :' + upstream + '; desarmado.'))
