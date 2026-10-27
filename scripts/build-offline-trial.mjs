// Entrada pública autocontenida: no incluye HTML de Next ni sesiones.
import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createDeck, getCardImage } from '../src/lib/truco.ts'
const images = {}
for (const path of [...createDeck().map(getCardImage), '/personajes/novato.webp']) {
  images[path] = 'data:image/webp;base64,' + (await readFile('public' + path)).toString('base64')
}
const bundle = await build({ entryPoints: ['src/offline-trial/app.ts'], bundle: true,
  write: false, minify: true, target: 'chrome100', define: { TRIAL_IMAGES: JSON.stringify(images) } })
await mkdir('public/android', { recursive: true })
const assets = []
for (const [path, bytes] of [['/android/tobias.js', bundle.outputFiles[0].contents],
  ['/android/tobias.html', await readFile('src/offline-trial/tobias.html')]]) {
  await writeFile('public' + path, bytes)
  assets.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length })
}
const digest = createHash('sha256').update(JSON.stringify(assets)).digest('hex')
await writeFile('public/android/tobias-manifest.json', JSON.stringify({ version: 'tobias-v1', digest, assets }))
console.log('Ensayo Tobías: ' + assets.reduce((v, a) => v + a.bytes, 0) + ' bytes; ' + digest.slice(0, 12))
