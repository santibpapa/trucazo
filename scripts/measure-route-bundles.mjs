import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

// Después de npm run build: suma los chunks iniciales de cada ruta, sin los
// imports dinámicos que todavía no se montaron. Las cifras están en bytes.
const manifest = JSON.parse(await readFile('.next/app-build-manifest.json', 'utf8'))
const result = {}
for (const route of ['/page', '/lobby/page', '/game/[id]/page', '/game/parejas/[id]/page']) {
  let bytes = 0
  let gzip = 0
  for (const file of new Set(manifest.pages[route])) {
    if (!file.endsWith('.js')) continue
    const content = await readFile(`.next/${file}`)
    bytes += content.length
    gzip += gzipSync(content).length
  }
  result[route] = { bytes, gzip }
}
console.log(JSON.stringify(result, null, 2))
