import { build, transform } from 'esbuild'
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import tailwindConfig from '../tailwind.config'
import { createHash } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { seedCatalog, readCatalog } from './offline-catalog'
import { canonical, CAMPAIGN_VERSION } from '../src/lib/offline-campaign/model'
import { BOTS_VERSION } from '../src/lib/offline-trial/bots'
import { createDeck, getCardImage } from '../src/lib/truco'
import { SALON_THEMES } from '../src/lib/salones'

async function main() {
const db = new PGlite()
await seedCatalog(db)
const catalog = await readCatalog(db)
await db.close()
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const catalogHash = sha(canonical(catalog))
await mkdir('public/android/historia', { recursive: true })
const bundle = await build({ entryPoints: ['src/offline-campaign/app.tsx'], outfile: 'public/android/historia/app.js', bundle: true, write: false,
  jsx: 'automatic', external: ['/mesa/*'], minify: true, target: 'chrome100',
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"', CAMPAIGN_CATALOG: JSON.stringify(catalog), CATALOG_HASH: JSON.stringify(catalogHash) } })
await writeFile('public/android/historia/app.js', bundle.outputFiles.find(f => f.path.endsWith('.js'))!.contents)
const globals = await postcss([tailwindcss(tailwindConfig)]).process(await readFile('src/app/globals.css', 'utf8'), { from: 'src/app/globals.css' })
const css = await transform(globals.css + '\n' + bundle.outputFiles.find(f => f.path.endsWith('.css'))!.text, { loader: 'css', minify: true })
await writeFile('public/android/historia/app.css', css.code)
await copyFile('src/offline-campaign/historia.html', 'public/android/historia/index.html')
await copyFile('src/app/fonts/GeistVF.woff2', 'public/android/historia/font.woff2')
await writeFile('public/android/historia/catalog.json', JSON.stringify(catalog))
const paths = ['/android/historia/index.html', '/android/historia/app.js', '/android/historia/app.css', '/android/historia/font.woff2', '/android/historia/catalog.json',
  '/historia/mapa-argentina.webp', ...catalog.provinces.map(p => '/historia/provincia-' + p.slug + '.webp'),
  ...catalog.rivals.map(r => '/personajes/' + r.slug + '.webp'), ...createDeck().map(getCardImage),
  ...Object.values(SALON_THEMES).map(s => s.scene),
  '/mesa/club/table-mask.svg', '/mesa/club/rim-mask.svg', '/mesa/club/rim.webp', '/mesa/club/grain.svg',
  ...(await readdir('public/accesorios')).filter(f => f.endsWith('.webp')).map(f => '/accesorios/' + f),
  '/sounds/carta.wav', '/sounds/gano.wav', '/sounds/perdi.wav']
const assets = await Promise.all(paths.map(async path => {
  const bytes = await readFile('public' + path)
  return { path, sha256: sha(bytes), bytes: bytes.length }
}))
const digest = sha(JSON.stringify(assets))
await writeFile('public/android/historia/manifest.json', JSON.stringify({ version: CAMPAIGN_VERSION, engine_version: BOTS_VERSION,
  catalog_sha256: catalogHash, digest, assets }))
console.log('Historia completa: ' + assets.length + ' archivos; ' + assets.reduce((sum, a) => sum + a.bytes, 0) + ' bytes; ' + digest.slice(0, 12))
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
