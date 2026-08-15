import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migration = await readFile(path.join(repo, 'supabase/migrations/20260817_campana_ruta_patagonica.sql'), 'utf8')
const client = await readFile(path.join(repo, 'src/app/historia/HistoriaClient.tsx'), 'utf8')
const phrases = await readFile(path.join(repo, 'src/lib/botFrases.ts'), 'utf8')

const provinces = ['la-pampa', 'neuquen', 'rio-negro', 'chubut', 'tierra-del-fuego']
const rivals = [
  'payador', 'bolichera', 'domador', 'telera',
  'petrolero', 'criancera', 'paleontologo', 'montanista',
  'fruticultora', 'ferroviario', 'cervecera', 'buzo',
  'gales', 'guardafauna', 'pesquero', 'navegante',
  'guardafaros', 'pionera', 'hachero', 'antartica',
]

assert.equal(new Set(provinces).size, 5)
assert.equal(new Set(rivals).size, 20)

for (const slug of provinces) {
  assert.match(migration, new RegExp(`'${slug}'`), `falta provincia ${slug} en la migración`)
  assert.ok(client.includes(`'${slug}':`), `falta marcador/lugares para ${slug}`)
  const metadata = await sharp(path.join(repo, 'public/historia', `provincia-${slug}.webp`)).metadata()
  assert.equal(metadata.width, 1254, `ancho incorrecto en ${slug}`)
  assert.equal(metadata.height, 1254, `alto incorrecto en ${slug}`)
  assert.equal(metadata.hasAlpha, true, `el mapa ${slug} debe conservar transparencia`)
}

for (const slug of rivals) {
  assert.match(migration, new RegExp(`'${slug}'`), `falta rival ${slug} en la migración`)
  assert.match(phrases, new RegExp(`\\b${slug}\\s*:`), `faltan frases para ${slug}`)
  const metadata = await sharp(path.join(repo, 'public/personajes', `${slug}.webp`)).metadata()
  assert.equal(metadata.width, 512, `ancho incorrecto en ${slug}`)
  assert.equal(metadata.height, 512, `alto incorrecto en ${slug}`)
}

const rivalRows = migration.match(/'c1a70000-0000-4000-b000-0000000000(?:2[7-9]|3[0-9]|4[0-6])'/g) ?? []
assert.equal(rivalRows.length, 20, 'la migración debe insertar exactamente 20 rivales')
assert.match(migration, /difficulty <> 10 or target_score <> 30/)

// La economía conserva la fórmula vigente y alcanza cada umbral aun sin plus
// por margen: 3.403 es el líder observado antes de esta expansión.
const rewards = [500, 540, 580, 620, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400]
const provinceThresholds = [3000, 4800, 7600, 11000, 15000]
let points = 3403
for (let province = 0; province < 5; province += 1) {
  assert.ok(points >= provinceThresholds[province], `no se alcanza la provincia ${provinces[province]}`)
  points += rewards.slice(province * 4, province * 4 + 4).reduce((sum, reward) => sum + reward, 0)
}
assert.ok(points > 21130, 'vencer los 20 rivales debe permitir superar el nuevo puesto 1')

console.log(`Ruta Patagónica OK: ${provinces.length} provincias, ${rivals.length} rivales, ${points} puntos mínimos finales`)
