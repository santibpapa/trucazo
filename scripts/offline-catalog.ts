import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import type { Catalog } from '../src/lib/offline-campaign/model'

export function statement(source: string, start: number): string {
  let quoted = false, comment = false
  for (let n = start; n < source.length; n++) {
    const c = source[n]
    if (comment) { if (c === '\n') comment = false; continue }
    if (!quoted && c === '-' && source[n + 1] === '-') { comment = true; n++; continue }
    if (c === "'") { if (quoted && source[n + 1] === "'") { n++; continue }; quoted = !quoted }
    if (!quoted && c === ';') return source.slice(start, n + 1)
  }
  throw new Error('SQL de catálogo incompleto.')
}
// Definiciones vigentes, incluida la rama clásica renombrada por Noroeste.
export async function currentFunctions(before?: string) {
  const names = (await readdir('supabase/migrations')).sort().filter(f => !before || f < before)
  const definitions = new Map<string, string>()
  const pattern = /create(?:\s+or\s+replace)?\s+function\s+(?:public\.)?(\w+)\s*\([\s\S]*?\bas\s+(\$(?:\w+)?\$)[\s\S]*?\2\s*;/gi
  for (const name of ['supabase/schema/functions.sql', ...names.map(f => 'supabase/migrations/' + f)]) {
    const source = (await readFile(name, 'utf8')).replace(/\r/g, '')
    for (const match of Array.from(source.matchAll(pattern))) {
      definitions.set(match[1].toLowerCase(), match[0])
      if (name.endsWith('20260815_bots_lobby.sql') && match[1] === 'bot_step') {
        definitions.set('_bot_step_pre_noroeste', match[0].replace('public.bot_step(', 'public._bot_step_pre_noroeste('))
      }
    }
  }
  return definitions
}
// Únicamente los datos públicos de las migraciones; nunca Auth ni funciones.
export async function seedCatalog(db: PGlite) {
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  for (const name of ['campaign_provinces', 'campaign_rivals']) {
    const start = schema.indexOf('create table if not exists public.' + name + ' (')
    await db.exec(statement(schema, start))
    await db.exec(`alter table public.${name} add primary key (id)`)
  }
  const sources = ['20260629_modo_historia.sql', '20260705_campana_provincias_1_backend.sql',
    '20260705_campana_provincias_2_rasgos.sql', '20260705_campana_provincias_3_rivales.sql',
    '20260706_campana_taglines_largas.sql', '20260817_campana_ruta_patagonica.sql', '20260923120000_campana_ruta_noroeste.sql']
  const files = await readdir('supabase/migrations')
  for (const name of sources) {
    if (!files.includes(name)) throw new Error('Falta catálogo: ' + name)
    const sql = await readFile('supabase/migrations/' + name, 'utf8')
    if (name.includes('noroeste')) {
      await db.exec(statement(sql, sql.indexOf('create temporary table northwest_roster')).replace(' on commit drop', ''))
      await db.exec(statement(sql, sql.indexOf('insert into northwest_roster')))
    }
    const commands = Array.from(sql.matchAll(/(?:insert into|update) public\.campaign_(?:provinces|rivals)\b/gi))
    for (const command of commands) await db.exec(statement(sql, command.index!))
  }
}
export async function readCatalog(db: PGlite): Promise<Catalog> {
  const provinces = await db.query<Catalog['provinces'][number]>('select id,order_index,slug,name,points_required,required_rival_id from public.campaign_provinces order by points_required,order_index')
  const rivals = await db.query<Catalog['rivals'][number]>('select id,order_index,slug,display_name,tagline,difficulty,target_score,reward_coins,bot_id,province_id,points_required,ranking_points,points_reward,trait_liar,trait_aggressive,strategy_profile from public.campaign_rivals order by order_index')
  if (provinces.rows.length !== 15 || rivals.rows.length !== 66) throw new Error('Catálogo de Historia incompleto.')
  return { provinces: provinces.rows, rivals: rivals.rows }
}
