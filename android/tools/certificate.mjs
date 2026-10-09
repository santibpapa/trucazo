import { X509Certificate } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const config = JSON.parse(await readFile(`${root}android/twa-manifest.json`, 'utf8'))
// assembleDebug genera/usa el certificado estándar de pruebas de esta PC.
const keystore = process.argv[2] ?? `${homedir()}/.android/debug.keystore`
const result = spawnSync('keytool', ['-exportcert', '-keystore', keystore,
  '-alias', 'androiddebugkey', '-storepass', 'android', '-rfc'], { encoding: 'utf8' })
if (result.status !== 0) throw new Error('Primero construí assembleDebug; no se encontró su certificado de prueba.')
const fingerprint = new X509Certificate(result.stdout).fingerprint256
const assetlinks = [{ relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: config.packageId, sha256_cert_fingerprints: [fingerprint] } }]
await mkdir(`${root}android/artifacts`, { recursive: true })
await writeFile(`${root}android/artifacts/assetlinks-debug.json`, `${JSON.stringify(assetlinks, null, 2)}\n`)
console.log(`ANDROID_SHA256_FINGERPRINTS=${fingerprint}`)
console.log('Este certificado es de pruebas. No usarlo como firma de publicación en Play.')
