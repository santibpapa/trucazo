import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = join(root, 'src')
const migrationsRoot = join(root, 'supabase/migrations')
// La migración que cerró todo y reabrió la API del cliente. Su lista sigue
// siendo válida, pero NO se toca: ya está aplicada en producción. Las RPC que
// nazcan después traen su propio `grant execute` en su propia migración, y este
// script las junta a las dos fuentes para que no haya una lista que mantener a
// mano (y que se desactualice sin que nadie se entere).
const baseAllowlistFile = '20260815_seguridad_6_privilegios_por_defecto.sql'
const serverOnlyPath = 'src/app/api/login-usuario/route.ts'

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
  }))
  return nested.flat()
}

function rpcNames(source) {
  return [...source.matchAll(/\.rpc\(\s*['"]([a-zA-Z0-9_]+)['"]/g)].map(match => match[1])
}

const migrationFiles = (await readdir(migrationsRoot)).filter(f => f.endsWith('.sql')).sort()
const allowed = new Set()

for (const file of migrationFiles) {
  const sql = await readFile(join(migrationsRoot, file), 'utf8')

  // 1. La lista de la migración que reabrió la API del cliente.
  if (file === baseAllowlistFile) {
    const block = sql.match(
      /-- CLIENT_RPC_ALLOWLIST_BEGIN([\s\S]*?)-- CLIENT_RPC_ALLOWLIST_END/,
    )?.[1]
    if (!block) throw new Error(`No se encontró CLIENT_RPC_ALLOWLIST en ${file}`)
    for (const m of block.matchAll(/'([a-zA-Z0-9_]+)'/g)) allowed.add(m[1])
  }

  // 2. Los permisos sueltos, pero SOLO de las migraciones POSTERIORES a esa.
  //    Es que esa migración hizo un "revoke execute on all functions", así que
  //    todo permiso anterior quedó sin efecto: contarlos daría una lista con
  //    funciones que en la base real están cerradas (o que ya ni existen).
  if (file <= baseAllowlistFile) continue

  for (const m of sql.matchAll(
    /grant\s+execute\s+on\s+function\s+public\.([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\n?\s*to\s+[^;]*\bauthenticated\b/gi,
  )) {
    allowed.add(m[1])
  }
  for (const m of sql.matchAll(
    /revoke\s+execute\s+on\s+function\s+public\.([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\n?\s*from\s+[^;]*\bauthenticated\b/gi,
  )) {
    allowed.delete(m[1])
  }
}
const browserCalls = new Set()
const serverCalls = new Set()

for (const path of await sourceFiles(srcRoot)) {
  const names = rpcNames(await readFile(path, 'utf8'))
  const repoPath = relative(root, path).replaceAll('\\', '/')
  const target = repoPath === serverOnlyPath ? serverCalls : browserCalls
  for (const name of names) target.add(name)
}

const missing = [...browserCalls].filter(name => !allowed.has(name)).sort()
const unused = [...allowed].filter(name => !browserCalls.has(name)).sort()

if (missing.length || unused.length) {
  if (missing.length) console.error(`RPC usadas pero no concedidas: ${missing.join(', ')}`)
  if (unused.length) console.error(`RPC concedidas pero no usadas: ${unused.join(', ')}`)
  process.exitCode = 1
} else if (serverCalls.size !== 1 || !serverCalls.has('get_login_email')) {
  console.error(`RPC server-only inesperadas: ${[...serverCalls].sort().join(', ') || '(ninguna)'}`)
  process.exitCode = 1
} else {
  console.log(`Allowlist correcta: ${allowed.size} RPC cliente y get_login_email sólo en servidor.`)
}
