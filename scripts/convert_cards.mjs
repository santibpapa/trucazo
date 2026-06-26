/**
 * Convierte los SVG de la baraja (card_{eng}_{val}.svg, vectores pesados) a PNG
 * optimizados con los nombres en español que usa el juego ({palo}_{val}.png).
 * Correr: node scripts/convert_cards.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, statSync } from 'node:fs'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'cartas')

// palo español → nombre del archivo fuente (inglés)
const SUITS = { espada: 'swords', basto: 'clubs', oro: 'coins', copa: 'cups' }
const VALUES = ['01', '02', '03', '04', '05', '06', '07', '10', '11', '12']
const WIDTH = 600 // ancho del PNG (alto sale del aspecto del SVG)

let ok = 0, bytesIn = 0, bytesOut = 0
for (const [esp, eng] of Object.entries(SUITS)) {
  for (const v of VALUES) {
    const src = join(dir, `card_${eng}_${v}.svg`)
    const out = join(dir, `${esp}_${v}.png`)
    if (!existsSync(src)) { console.error('FALTA:', src); continue }
    bytesIn += statSync(src).size
    await sharp(src, { density: 900 })
      .resize({ width: WIDTH })
      .flatten({ background: '#ffffff' }) // las cartas son de fondo blanco: sin transparencias
      .png({ compressionLevel: 9, palette: true })
      .toFile(out)
    bytesOut += statSync(out).size
    ok++
  }
}
const mb = (b) => (b / 1024 / 1024).toFixed(1) + ' MB'
console.log(`\n✅ Convertidas ${ok} cartas a PNG (${WIDTH}px de ancho).`)
console.log(`   SVG fuente: ${mb(bytesIn)}  →  PNG: ${mb(bytesOut)}`)
