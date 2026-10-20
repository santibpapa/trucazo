import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const config = JSON.parse(await readFile(`${root}android/twa-manifest.json`, 'utf8'))
// Leer el APK efectivamente firmado. En CI el keystore debug puede vivir en
// otra carpeta; no asociar por error un certificado ajeno al artefacto.
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT
if (!sdk) throw new Error('Configurá ANDROID_HOME con la carpeta del SDK de Android.')
const apk = process.argv[2] ?? `${root}android/generated/app/build/outputs/apk/debug/app-debug.apk`
const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java'
const result = spawnSync(java, ['-jar', join(sdk, 'build-tools', '35.0.0', 'lib', 'apksigner.jar'),
  'verify', '--print-certs', apk], { encoding: 'utf8' })
const digest = result.stdout?.match(/certificate SHA-256 digest: ([a-fA-F0-9]{64})/)?.[1]
if (result.status !== 0 || !digest) throw new Error('No se pudo verificar el APK. Construí assembleDebug y revisá SDK Build Tools 35.0.0.')
const fingerprint = digest.toUpperCase().match(/.{2}/g).join(':')
const assetlinks = [{ relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: config.packageId, sha256_cert_fingerprints: [fingerprint] } }]
await mkdir(`${root}android/artifacts`, { recursive: true })
await writeFile(`${root}android/artifacts/assetlinks-debug.json`, `${JSON.stringify(assetlinks, null, 2)}\n`)
console.log(`ANDROID_SHA256_FINGERPRINTS=${fingerprint}`)
console.log('Este certificado es de pruebas. No usarlo como firma de publicación en Play.')
