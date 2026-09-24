/**
 * Compara los 20 rivales contra Irene con bot_step y las reglas SQL reales.
 * No reimplementa cartas, cantos, puntajes ni el cerebro anterior en JavaScript.
 * Requiere una base LOCAL descartable reconstruida con scripts/rebuild-db.sh.
 * node scripts/sim-noroeste.mjs --local-test-db
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!process.argv.includes('--local-test-db')) {
  console.error('Sólo base LOCAL de pruebas: node scripts/sim-noroeste.mjs --local-test-db')
  process.exit(1)
}
const host = process.env.PGHOST || 'localhost'
const database = process.env.PGDATABASE || 'trucazo'
if (!['localhost', '127.0.0.1', '::1'].includes(host) ||
    process.env.PGHOSTADDR || process.env.PGSERVICE || process.env.PGSERVICEFILE ||
    !/^[a-zA-Z0-9_-]+$/.test(database)) {
  console.error('Conexión rechazada: sólo host loopback y nombre de base simple, sin servicios libpq.')
  process.exit(1)
}
const trials = Number(process.env.NOROESTE_TRIALS || 10)
const seedStart = Number(process.env.NOROESTE_SEED_START || 1)
if (!Number.isInteger(trials) || trials < 10 || trials > 100 ||
    !Number.isInteger(seedStart) || seedStart < 1 || seedStart > 1_000_000) {
  console.error('NOROESTE_TRIALS debe ser 10–100; NOROESTE_SEED_START, 1–1000000.')
  process.exit(1)
}
const sql = `set trucazo.benchmark_trials = '${trials}';
set trucazo.benchmark_seed_start = '${seedStart}';
${readFileSync(new URL('../supabase/tests/noroeste_tactica.sql', import.meta.url), 'utf8')}
${readFileSync(new URL('../supabase/tests/noroeste_benchmark.sql', import.meta.url), 'utf8')}`
console.log(`${trials * 40} partidas SQL a 30: 20 rivales × ${trials} semillas × 2 asientos.`)
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '--quiet',
  '-h', host, '-p', process.env.PGPORT || '5432',
  '-U', process.env.PGUSER || 'postgres', '-d', database], {
  input: sql, stdio: ['pipe', 'inherit', 'inherit'], timeout: 16 * 60 * 1000,
})
if (result.error) console.error(`No se pudo completar la prueba: ${result.error.message}`)
process.exit(result.status ?? 1)
