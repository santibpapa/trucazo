import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { tournamentFixture } from './tournament-fixture'
process.chdir(fileURLToPath(new URL('../../..', import.meta.url)))
async function main() {
  const f = await tournamentFixture(), passed: string[] = []
  try {
    for (const name of ['tournaments', 'tournaments_competition', 'tournaments_teams', 'tournaments_final', 'tournaments_delete']) {
      try { await f.db.exec((await readFile('supabase/tests/' + name + '.sql', 'utf8')).replace(/^\\.*$/gm, '')) }
      catch (error) { throw new Error(name + ': ' + (error as Error).message) }
      passed.push(name); console.log('OK', name)
    }
    await writeFile('android/generated/android-10-rules.json', JSON.stringify({ scope: 'PostgreSQL PGlite aislado; Auth/cron simulados y red bloqueada; no certifica concurrencia remota', passed }, null, 2))
  } finally { await f.db.close() }
}
void main().catch(error => { console.error(error.message); process.exitCode = 1 })
