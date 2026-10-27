import sharp from 'sharp'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobile = fileURLToPath(new URL('..', import.meta.url))
const resources = path.join(mobile, 'android/app/src/main/res')
// La primera construcción de la interfaz puede preceder a `cap add android`.
try { await access(resources) } catch { process.exit(0) }
const icon = path.resolve(mobile, '../../public/icon-512.png')
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const directory = path.join(resources, 'mipmap-' + density)
  await sharp(icon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher.png'))
  await sharp(icon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher_round.png'))
  const canvas = Math.round(size * 108 / 48)
  const inset = Math.round(canvas * 0.66)
  const foreground = await sharp(icon).resize(inset, inset).toBuffer()
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: '#1A0F10' } })
    .composite([{ input: foreground, gravity: 'centre' }]).png().toFile(path.join(directory, 'ic_launcher_foreground.png'))
}
await sharp(icon).png().toFile(path.join(resources, 'drawable/trucazo_mark.png'))
