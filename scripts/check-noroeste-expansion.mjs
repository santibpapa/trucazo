import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sql = await readFile(path.join(root,'supabase/migrations/20260923120000_campana_ruta_noroeste.sql'),'utf8')
const brain = await readFile(path.join(root,'supabase/migrations/20260923121000_campana_noroeste_estrategia.sql'),'utf8')
const ui = await readFile(path.join(root,'src/app/historia/HistoriaClient.tsx'),'utf8')
const phrases = await readFile(path.join(root,'src/lib/botFrases.ts'),'utf8')
const provinces=['la-rioja','catamarca','tucuman','salta','jujuy']
const rivals=[
  'olivarero','chayera','pirquinero','hilandera',
  'nogalero','tejedora','arriero-puna','alfarera',
  'canero','empanadera','zafrero','zafrera-mayor',
  'bagualero','vinatera','gaucho-valle','carpera',
  'salinero','carnavalera','quebradeno','duena-silencio',
]
assert.equal(new Set(provinces).size,5)
assert.equal(new Set(rivals).size,20)
const provinceRows=[...sql.matchAll(/'ca7a0000-0000-4000-b000-0{10}(1[1-5])',\s*(1[1-5]),\s*'([^']+)',\s*'[^']+',\s*(\d+)/g)]
assert.deepEqual(provinceRows.map(m=>m[3]),provinces)
assert.ok(provinceRows.every(m=>m[1]===m[2]))
assert.equal((sql.match(/where slug='antartica'/g)??[]).length,6)
const rows=[...sql.matchAll(/\((\d+),(1[1-5]),'([^']+)','[^']+','[^']+','(\w+)',(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/g)]
assert.equal(rows.length,20,'exactamente 20 fichas')
assert.deepEqual(rows.map(m=>m[3]),rivals)
assert.deepEqual(rows.map(m=>Number(m[1])),Array.from({length:20},(_,i)=>i+47))
assert.equal(new Set(rows.map(m=>Number(m[8]))).size,20,'ranking único')
assert.equal(rows.at(-1)[3],'duena-silencio')
assert.equal(Number(rows.at(-1)[8]),46500)

for (const slug of provinces) {
  assert.ok(ui.includes(`'${slug}':`),`faltan coordenadas de ${slug}`)
  const meta=await sharp(path.join(root,'public/historia',`provincia-${slug}.webp`)).metadata()
  assert.equal(meta.width,1254);assert.equal(meta.height,1254);assert.equal(meta.hasAlpha,true)
}
for (const slug of rivals) {
  assert.ok(phrases.includes(`${slug.includes('-')?`'${slug}'`:slug}:`),`faltan frases ${slug}`)
  const meta=await sharp(path.join(root,'public/personajes',`${slug}.webp`)).metadata()
  assert.equal(meta.width,512);assert.equal(meta.height,512)
}

assert.match(brain,/pg_get_functiondef\('public\.bot_step\(uuid\)'::regprocedure\)/)
assert.match(brain,/where game_id=p_game_id and player_id=v_bot/)
assert.doesNotMatch(brain,/game_hands[^;]*player_id=v_human/i)
assert.match(brain,/return public\._bot_step_pre_noroeste\(p_game_id\)/)
assert.match(brain,/revoke execute on function public\._northwest_bot_step\(uuid\) from public, anon, authenticated/)

// Escenario mínimo: 26 recompensas originales + 20 patagónicas, sin margen.
let points=3045+[500,540,580,620,650,700,750,800,850,900,950,1000,
  1050,1100,1150,1200,1250,1300,1350,1400].reduce((a,b)=>a+b,0)
assert.equal(points,21685)
for (let i=0;i<provinces.length;i++) {
  const group=rows.slice(i*4,i*4+4)
  assert.ok(points>=Number(provinceRows[i][4]),`provincia ${provinces[i]} inalcanzable`)
  for(const row of group) {
    assert.ok(points>=Number(row[7]),`rival ${row[3]} inalcanzable sin revancha`)
    points+=Number(row[9])
  }
}
assert.ok(points>46500,'Aurelia se puede superar con primeras victorias')
assert.ok(21685<Number(provinceRows[2][4]),'no se abre toda la ruta de entrada')
console.log(`Ruta del Noroeste: 5 provincias, 20 rivales, 25 recursos; recorrido mínimo ${points} puntos`)
