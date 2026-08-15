import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = join(root, 'src')
const migrationPath = join(
  root,
  'supabase/migrations/20260815_seguridad_6_privilegios_por_defecto.sql',
)
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

const migration = await readFile(migrationPath, 'utf8')
const allowlistBlock = migration.match(
  /-- CLIENT_RPC_ALLOWLIST_BEGIN([\s\S]*?)-- CLIENT_RPC_ALLOWLIST_END/,
)?.[1]

if (!allowlistBlock) throw new Error('No se encontró CLIENT_RPC_ALLOWLIST en la migración')

const allowed = new Set([...allowlistBlock.matchAll(/'([a-zA-Z0-9_]+)'/g)].map(match => match[1]))
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
