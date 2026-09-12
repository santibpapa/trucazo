// Exclusivo de la preview desechable. No forma parte del servidor de producción.
const http = require('node:http')
const proxy = require('next/dist/compiled/http-proxy').createProxyServer({})

if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Este proxy requiere el entorno aislado de GitHub Actions')
}
const api = 'http://127.0.0.1:54321'
const app = 'http://127.0.0.1:3000'

function route(req) {
  const url = new URL(req.url, 'http://preview.local')
  if (!url.pathname.startsWith('/supabase/')) return app
  const path = url.pathname.slice('/supabase'.length)
  // Ni Studio, ni administración de usuarios, ni otras APIs del stack local.
  if (!/^\/auth\/v1\/(signup|token|logout|user|settings|health)$/.test(path)
    && !path.startsWith('/rest/v1/') && !path.startsWith('/realtime/v1/')) return null
  // La puerta pública siempre utiliza la clave pública de esta ejecución.
  req.headers.apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url.searchParams.has('apikey')) url.searchParams.set('apikey', req.headers.apikey)
  req.url = path + url.search
  return api
}

proxy.on('error', (_err, _req, res) => {
  if (res.writeHead && !res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain' })
  res.end('La preview se está preparando. Volvé a intentar en unos segundos.')
})

const server = http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  const url = new URL(req.url, 'http://preview.local')
  if (url.pathname === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    return res.end('User-agent: *\nDisallow: /\n')
  }
  if (url.pathname === '/__preview/viewport') {
    const width = Math.max(280, Math.min(1440, Number(url.searchParams.get('w')) || 390))
    const height = Math.max(320, Math.min(1000, Number(url.searchParams.get('h')) || 844))
    const path = url.searchParams.get('path') || '/lobby'
    const safePath = /^\/(lobby|login|game\/[a-zA-Z0-9/-]+)$/.test(path) ? path : '/lobby'
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(`<!doctype html><html lang="es"><title>Revisión de pantalla 2vs2</title>
      <style>body{margin:16px;background:#28201c;color:#fff;font:16px sans-serif}form{margin-bottom:12px}input{width:80px}input[name=path]{width:400px}iframe{display:block;border:1px solid #c49b59}</style>
      <form><label>Ancho <input name="w" type="number" value="${width}"></label>
      <label>Alto <input name="h" type="number" value="${height}"></label>
      <label>Página <input name="path" value="${safePath}"></label><button>Ver pantalla</button></form>
      <iframe title="Partida en pantalla de prueba" src="${safePath}" width="${width}" height="${height}"></iframe></html>`)
  }
  // La preview no envía emails ni recibe tareas externas de producción.
  if (url.pathname.startsWith('/api/email/') || url.pathname.startsWith('/api/cron/')) {
    res.writeHead(404); return res.end()
  }
  const target = route(req)
  if (!target) { res.writeHead(404); return res.end() }
  proxy.web(req, res, { target })
})
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/supabase/realtime/v1/')) return socket.destroy()
  const target = route(req)
  if (!target) return socket.destroy()
  proxy.ws(req, socket, head, { target })
})
server.listen(4173, '127.0.0.1')
