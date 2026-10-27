import { build, transform } from 'esbuild'
import { copyFile, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import type { Config } from 'tailwindcss'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
const tailwindConfig = createRequire(import.meta.url)('../../../tailwind.config.ts').default as Config

const mobile = fileURLToPath(new URL('..', import.meta.url))
const root = path.resolve(mobile, '../..')
const dist = path.join(mobile, 'dist')
const versionCode = Number((await readFile(path.join(mobile, 'android/app/build.gradle'), 'utf8')).match(/versionCode\s+(\d+)/)?.[1])
if (!Number.isSafeInteger(versionCode)) throw new Error('Falta el código de versión Android.')
async function main() {
const { loadEnvConfig } = createRequire(import.meta.url)('@next/env')
loadEnvConfig(root)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const origin = process.env.MOBILE_API_ORIGIN || 'https://www.trucazo.com.ar'
if (process.env.MOBILE_RELEASE === '1' && origin !== 'https://www.trucazo.com.ar') throw new Error('El candidato release requiere https://www.trucazo.com.ar.')
if (!url || !key) throw new Error('Falta la configuración pública de Supabase en .env.local.')
if (!origin.startsWith('https://') && origin !== 'http://localhost:3000') throw new Error('Los servicios requieren HTTPS; sólo se permite localhost:3000 para el ensayo debug con adb reverse.')
if (key.startsWith('sb_secret_') || (key.split('.').length === 3 && JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon')) throw new Error('La app sólo admite una llave pública de Supabase.')
await mkdir(dist, { recursive: true })
const campaignManifest = JSON.parse(await readFile(path.join(root, 'public/android/historia/manifest.json'), 'utf8'))
const catalog = JSON.parse(await readFile(path.join(root, 'public/android/historia/catalog.json'), 'utf8'))
const campaignAssets = campaignManifest.assets.filter((asset: { path: string }) => !asset.path.startsWith('/android/historia/'))
for (const asset of campaignAssets) {
  const destination = path.join(dist, asset.path.slice(1))
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(path.join(root, 'public', asset.path.slice(1)), destination)
}
const bundled = await build({
  absWorkingDir: root, entryPoints: ['apps/mobile/src/main.tsx'], outfile: path.join(dist, 'app.js'),
  bundle: true, metafile: true, jsx: 'automatic', minify: true, target: 'chrome100', external: ['/mesa/*'],
  alias: { '@/lib/supabase/client': path.join(mobile, 'src/services.ts'),
    '@/lib/app-request': path.join(mobile, 'src/services.ts'),
    '@/lib/analytics/transport': path.join(mobile, 'src/analytics.ts'),
    'next/navigation': path.join(mobile, 'src/navigation.tsx') },
  plugins: [{ name: 'mobile-next-presentation', setup(builder) {
    builder.onResolve({ filter: /^@\/components\/(GuestButton|TrackedLink)$/ }, args => ({ path: args.path, namespace: 'mobile-public' }))
    // Componentes compartidos conservan su analítica web; Android envía la propia.
    builder.onResolve({ filter: /^@vercel\/analytics$/ }, args => ({ path: args.path, namespace: 'mobile-web-metrics' }))
    builder.onLoad({ filter: /.*/, namespace: 'mobile-web-metrics' }, () => ({ contents: 'export function track() {}' }))
    builder.onLoad({ filter: /.*/, namespace: 'mobile-public' }, args => ({
      contents: `export { ${args.path.endsWith('GuestButton') ? 'GuestButton' : 'TrackedLink'} as default } from ${JSON.stringify(path.join(mobile, 'src/PublicLinks.tsx'))}`,
      loader: 'tsx', resolveDir: root,
    }))
    builder.onResolve({ filter: /^next\/(link|image)$/ }, args => ({ path: args.path, namespace: 'mobile-next' }))
    builder.onLoad({ filter: /.*/, namespace: 'mobile-next' }, args => ({
      contents: `export { ${args.path === 'next/link' ? 'Link' : 'Image'} as default } from ${JSON.stringify(path.join(mobile, 'src/navigation.tsx'))}`,
      loader: 'tsx', resolveDir: root,
    }))
  }}],
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(url),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(key),
    'process.env.NEXT_PUBLIC_ENABLE_2VS2': JSON.stringify(process.env.NEXT_PUBLIC_ENABLE_2VS2 ?? 'false'),
    'process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT': JSON.stringify(process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT ?? 'false'),
    'process.env.NEXT_PUBLIC_ENABLE_TOURNAMENTS': JSON.stringify(process.env.NEXT_PUBLIC_ENABLE_TOURNAMENTS ?? 'false'),
    MOBILE_API_ORIGIN: JSON.stringify(origin), MOBILE_RELEASE: JSON.stringify(process.env.MOBILE_RELEASE === '1'), MOBILE_VERSION_CODE: JSON.stringify(versionCode), MOBILE_CAMPAIGN_CATALOG: JSON.stringify(catalog) },
})
const packages = new Set<string>()
await mkdir(path.join(root, 'android/generated'), { recursive: true })
await writeFile(path.join(root, 'android/generated/android-mobile-bundle.json'), JSON.stringify(bundled.metafile, null, 2))
for (const input of Object.keys(bundled.metafile.inputs)) {
  const match = input.match(/^(.*node_modules\/(@[^/]+\/[^/]+|[^/]+))\//)
  if (match) packages.add(match[1])
}
packages.add('apps/mobile/node_modules/@capacitor/android')
const notices = ['Trucazo — licencias de componentes incluidos\n']
for (const directory of [...packages].sort()) {
  const base = path.join(root, directory), info = JSON.parse(await readFile(path.join(base, 'package.json'), 'utf8'))
  const files = (await readdir(base)).filter(name => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name))
  notices.push(`${info.name} ${info.version} — ${info.license ?? 'ver aviso'}\n`)
  for (const file of files) notices.push(await readFile(path.join(base, file), 'utf8'))
}
notices.push('Geist — Vercel y Basement Studio, SIL Open Font License 1.1\n' + await readFile(path.join(root, 'src/app/fonts/OFL.txt'), 'utf8'))
notices.push(await readFile(path.join(root, 'public/cartas/LICENCIA.txt'), 'utf8'))
notices.push('Android: AndroidX, Firebase Messaging e Installations usan Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0\nServicios de Google Play: https://developers.google.com/android/guides/overview#licenses\nNo se incorpora Firebase Analytics ni Crashlytics.')
await writeFile(path.join(dist, 'third-party-notices.txt'), notices.join('\n\n'))
const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (privilegedKey && (await readFile(path.join(dist, 'app.js'), 'utf8')).includes(privilegedKey)) throw new Error('Una llave privada entró al bundle; no instalar esta construcción.')
const styles = await postcss([tailwindcss({
  ...tailwindConfig,
  content: [path.join(root, 'src/components/**/*.{ts,tsx}'), path.join(root, 'src/app/**/*.{ts,tsx}'), path.join(root, 'src/offline-campaign/**/*.{ts,tsx}'), path.join(mobile, 'src/**/*.{html,ts,tsx}')],
})]).process(await readFile(path.join(root, 'src/app/globals.css'), 'utf8') + '\n' + await readFile(path.join(dist, 'app.css'), 'utf8'), { from: undefined })
await writeFile(path.join(dist, 'app.css'), (await transform(styles.css, { loader: 'css', minify: true })).code)
await Promise.all([
  readFile(path.join(mobile, 'src/index.html'), 'utf8').then(html => writeFile(path.join(dist, 'index.html'),
    html.replace('<link rel="stylesheet"', `<link rel="preconnect" href="${new URL(url).origin}" crossorigin>\n  <link rel="stylesheet"`))),
  copyFile(path.join(mobile, 'src/webview-update.html'), path.join(dist, 'webview-update.html')),
  copyFile(path.join(root, 'src/app/fonts/GeistVF.woff2'), path.join(dist, 'font.woff2')),
  copyFile(path.join(root, 'public/icon-512.png'), path.join(dist, 'icon-512.png')),
  cp(path.join(root, 'public/lobby'), path.join(dist, 'lobby'), { recursive: true }),
  cp(path.join(root, 'public/objetivos'), path.join(dist, 'objetivos'), { recursive: true }),
])
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const assets = [...campaignAssets]
for (const name of ['app.js', 'app.css', 'font.woff2', 'index.html']) {
  const bytes = await readFile(path.join(dist, name))
  assets.push({ path: '/' + name, sha256: sha(bytes), bytes: bytes.length })
}
await writeFile(path.join(dist, 'historia-manifest.json'), JSON.stringify({ version: campaignManifest.version,
  engine_version: campaignManifest.engine_version, catalog_sha256: campaignManifest.catalog_sha256, digest: sha(JSON.stringify(assets)), assets }))
await writeFile(path.join(dist, 'build-info.json'), JSON.stringify({
  version: JSON.parse(await readFile(path.join(mobile, 'package.json'), 'utf8')).version,
  versionCode,
  features: { pairs: process.env.NEXT_PUBLIC_ENABLE_2VS2 === 'true', tournaments: process.env.NEXT_PUBLIC_ENABLE_TOURNAMENTS === 'true', matchChat: process.env.NEXT_PUBLIC_ENABLE_MATCH_CHAT === 'true' },
  apiOrigin: origin, release: process.env.MOBILE_RELEASE === '1', bundleSha256: sha(await readFile(path.join(dist, 'app.js'))),
}))
console.log('Interfaz local Trucazo construida en apps/mobile/dist (sin HTML remoto).')
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
