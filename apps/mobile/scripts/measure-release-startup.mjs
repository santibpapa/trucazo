// Señal estándar Android reportFullyDrawn: incluye inicio nativo y lobby útil.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { connectReleaseDevice } from './release-device.mjs'

const serial = process.env.ANDROID_QA_SERIAL
assert.ok(serial && process.env.ADB, 'Indicar teléfono y cargar entorno Android')
const adb = args => execFileSync(process.env.ADB, ['-s', serial, ...args], { encoding: 'utf8' })
const info = adb(['shell', 'dumpsys', 'package', 'ar.com.trucazo.app'])
const versionCode = Number(info.match(/versionCode=(\d+)/)?.[1]), version = info.match(/versionName=(\S+)/)?.[1]
assert.ok(versionCode && version)
await connectReleaseDevice().then(device => device.stop()).catch(() => {})
await new Promise(r => setTimeout(r, 1000))
const starts = []
for (let i = 0; i < 3; i++) {
  const launchedAt = new Date().toISOString()
  const launch = adb(['shell', 'am', 'start', '-S', '-W', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-n', 'ar.com.trucazo.app/ar.com.trucazo.capacitor.dev.MainActivity'])
  await new Promise(r => setTimeout(r, 6500))
  const lines = adb(['logcat', '-d', '-t', '1500', '-s', 'ActivityTaskManager:I', 'ActivityManager:I'])
    .split('\n').filter(line => line.includes('Fully drawn ar.com.trucazo.app/'))
  const line = lines.at(-1)
  assert.ok(line, 'Android no registró el lobby listo')
  const duration = line.match(/:\s*\+(?:(\d+)s)?(\d+)ms/)
  assert.ok(duration, 'Duración Android no reconocida')
  starts.push({ launchedAt, nativeFirstFrameMs: Number(launch.match(/TotalTime:\s*(\d+)/)?.[1]),
    lobbyUsableMs: Number(duration[1] || 0) * 1000 + Number(duration[2]), systemEvidence: line.trim() })
}
const result = { scope: 'Release real, arranque frío desde MAIN/LAUNCHER, Auth/datos Supabase HTTPS reales', version, versionCode,
  device: { model: adb(['shell', 'getprop', 'ro.product.model']).trim(), android: adb(['shell', 'getprop', 'ro.build.version.release']).trim() },
  serial, network: 'Wi-Fi', charging: true, starts, goalMs: 3000, passed: starts.every(x => x.lobbyUsableMs <= 3000) }
await writeFile('android/generated/android-17-phone-startup-' + versionCode + '.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
