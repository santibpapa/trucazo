// PostgreSQL descartable. No usa claves ni datos del servidor remoto.
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { onlineFixture, ids } from './online-fixture'
import { currentFunctions, readCatalog, seedCatalog, statement } from '../../../scripts/offline-catalog'

export { ids }
export async function playerFixture() {
  const f = await onlineFixture(), { db } = f
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  await db.exec(`create role service_role; create table auth.users(id uuid primary key,is_anonymous boolean default false);
    insert into auth.users(id) values('${ids.A}'),('${ids.B}');`)
  for (const table of ['salons','frames','accessories','profile_salons','profile_frames','profile_accessories','profile_medals','campaign_provinces']) {
    await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + table + ' (')))
  }
  for (const table of ['salons','frames','accessories']) await db.exec(`alter table ${table} add primary key(slug)`)
  await db.exec('alter table campaign_provinces add primary key(id); alter table campaign_rivals add primary key(id);')
  const catalogDb = new PGlite()
  await seedCatalog(catalogDb)
  const catalog = await readCatalog(catalogDb)
  await catalogDb.close()
  for (const [table, rows] of [['campaign_provinces', catalog.provinces], ['campaign_rivals', catalog.rivals]] as const) {
    for (const row of rows) {
      const fields = Object.keys(row)
      await db.query(`insert into ${table}(${fields.join(',')}) values(${fields.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(row))
    }
  }
  await db.exec(`insert into profiles(id,username,is_bot) select bot_id,display_name,true from campaign_rivals;
    insert into salons(slug,name,description,price,sort_order) values('clasico','Club de barrio','Clásico',0,0),('cafetin','Cafetín','Café',100,1);
    insert into frames(slug,name,description,price,sort_order) values('ninguno','Sin marco','Sin marco',0,0),('dorado','Dorado','Dorado',100,1);
    insert into accessories(slug,name,description,price,sort_order) values('agua','Botella de agua','Agua',100,1);
    insert into profile_medals(profile_id,medal_slug) values('${ids.A}','primera_victoria');
    update profiles set coins=2000,games_played=4,games_won=3,games_lost=1 where id='${ids.A}';
    insert into game_history(player_id,opponent_id,opponent_username,result,coins_change) values('${ids.A}','${ids.B}','Rival QA','win',50);`)
  const objectives = await readFile('supabase/migrations/20260904150348_ciclo_retorno.sql', 'utf8')
  // La sección final de analítica no interviene en misiones ni economía.
  await db.exec(objectives.slice(0, objectives.indexOf('alter table public.analytics_events')) + '\ncommit;')
  const defs = await currentFunctions()
  const names = ['buy_salon','buy_frame','buy_accessory','set_active_salon','set_active_frame','set_active_accessory',
    'set_avatar_url','player_medals','active_medal_for','get_active_medals','set_active_medal','get_campaign_map','get_campaign_ranking','start_campaign_duel','claim_bonus']
  for (const name of names) await db.exec(defs.get(name)!)
  // El inicio vigente usa el estado de vidas, aunque estén pausadas.
  const lives = await readFile('supabase/schema/campaign_lives.sql', 'utf8')
  await db.exec(lives.replace(/create function public\./g, 'create or replace function public.'))
  const policies = await readFile('supabase/schema/policies.sql', 'utf8')
  for (const table of ['game_history','profile_salons','profile_frames','profile_accessories','profile_medals','campaign_progress']) {
    await db.exec(`alter table ${table} enable row level security`)
    for (const match of Array.from(policies.matchAll(/create policy[^;]+;/g))) if (match[0].includes('on public.' + table + ' for SELECT')) await db.exec(match[0])
  }
  await db.exec('grant select on salons,frames,accessories,profile_salons,profile_frames,profile_accessories,profile_medals,game_history,campaign_progress,campaign_rivals,campaign_provinces to authenticated')
  async function rpc(name: string, args: Record<string, unknown>, owner = ids.A) {
    if (!names.includes(name) && !['get_my_objectives','claim_objective_reward','forfeit'].includes(name)) return f.rpc(name, args, owner)
    const keys = Object.keys(args)
    if (keys.some(k => !/^p_[a-z_]+$/.test(k))) throw Error('Parámetro inválido')
    if (name === 'get_active_medals') return f.asUser(owner, async () => (await db.query('select * from public.get_active_medals($1)', Object.values(args))).rows)
    return f.asUser(owner, async () => (await db.query<{ value: any }>(`select to_jsonb(public.${name}(${keys.map((key,i) => key + ' => $' + (i+1)).join(',')})) value`, Object.values(args))).rows[0].value)
  }
  return { ...f, rpc, catalog }
}
