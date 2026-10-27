// Sólo pruebas: reglas y RLS reales en PostgreSQL descartable; sin Supabase remoto.
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { currentFunctions, statement } from '../../../scripts/offline-catalog'

export const ids = { A: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', B: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', bot: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' }
export async function onlineFixture() {
  const db = new PGlite()
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  await db.exec(`create schema auth; create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    set check_function_bodies=off;`)
  for (const name of ['profiles','tables','games','game_hands','game_history','game_presence','campaign_style','campaign_rivals','campaign_progress','bot_decisions','friendships','game_invites']) {
    await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + name + ' (')))
  }
  await db.exec(`alter table profiles add primary key(id); alter table tables add primary key(id);
    alter table games add primary key(id); alter table game_hands add primary key(game_id,player_id);
    alter table game_presence add primary key(game_id,player_id); alter table campaign_style add primary key(user_id);
    alter table campaign_progress add primary key(user_id,rival_id); alter table friendships add primary key(id);
    alter table game_invites add primary key(id);`)
  const bots = await readFile('supabase/migrations/20260815_bots_lobby.sql','utf8')
  await db.exec(statement(bots,bots.indexOf('create table if not exists public.lobby_bots')))
  const botNames = await readFile('supabase/migrations/20260815_bots_lobby_2_nombres.sql','utf8')
  await db.exec(statement(botNames,botNames.indexOf('create table if not exists public.lobby_bot_names')))
  await db.exec(statement(botNames,botNames.indexOf('insert into public.lobby_bot_names')))
  const functions = await currentFunctions()
  const names = ['_truco_deck','_deal_hands','_envido_points','_envido_quiero_value','_envido_reject_value',
    '_envido_winning_cards','_envido_reveal_for','_round_leader','_who_plays_next','_turn_after_envido','_record_style',
    'create_table','join_table','join_table_by_code','start_game','cancel_table','finish_game','forfeit','request_rematch',
    'play_card','sing_envido','respond_envido','envido_say','sing_truco','respond_truco','irse_al_mazo','advance_hand',
    'timeout_mazo','touch_presence','_bot_hand_power','_bot_topup','_free_lobby_bot','_rename_lobby_bot',
    'bot_join_table','_bot_step_pre_noroeste','bot_step','invite_friend','respond_game_invite','cancel_game_invite']
  for (const name of names) {
    if (!functions.has(name)) throw new Error('Falta función SQL: '+name)
    await db.exec(functions.get(name)!)
  }
  const policies = await readFile('supabase/schema/policies.sql','utf8')
  for (const table of ['games','game_hands','profiles','game_invites']) {
    await db.exec(`alter table ${table} enable row level security`)
    const policy = Array.from(policies.matchAll(/create policy[^;]+;/g)).find(m=>m[0].includes('on public.'+table+' for SELECT'))
    if (!policy) throw new Error('Falta RLS: '+table)
    await db.exec(policy[0])
  }
  const privateTables = await readFile('supabase/migrations/20260815_seguridad_1_mesas_privadas.sql','utf8')
  await db.exec('alter table tables enable row level security')
  await db.exec(statement(privateTables,privateTables.indexOf('create policy "Mesas publicas y las mias"')))
  await db.exec(`grant usage on schema public to authenticated; grant select on profiles,tables,games,game_hands,game_invites to authenticated;
    insert into profiles(id,username,is_bot) values('${ids.A}','Cuenta A',false),('${ids.B}','Cuenta B',false),('${ids.bot}','Bot de prueba',true);
    insert into lobby_bots(bot_id) values('${ids.bot}');`)
  // Las solicitudes de dos clientes comparten esta conexión de prueba. Serializar
  // incluye identidad, consulta y limpieza, para que ninguna use el rol ajeno.
  let queue = Promise.resolve<unknown>(null)
  function asUser<T>(owner: string, operation: () => Promise<T>): Promise<T> {
    const result = queue.then(async () => {
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[owner,JSON.stringify({sub:owner,is_anonymous:false,role:'authenticated'})])
      await db.exec('set role authenticated')
      try { return await operation() } finally { await db.exec('reset role') }
    })
    queue = result.catch(()=>null)
    return result
  }
  async function rpc(name: string, body: Record<string, unknown>, owner: string) {
    // Regresiones de juego: normas ya aceptadas. safetyFixture prueba el SQL real.
    if (name === 'community_safety_state') return { accepted: true, restricted_until: null, blocks: [], reports: [] }
    if (!names.includes(name) || name.startsWith('_') || name === 'finish_game') throw new Error('RPC no pública en la prueba')
    const args = Object.keys(body)
    if (args.some(arg=>!/^p_[a-z_]+$/.test(arg))) throw new Error('Parámetro inválido')
    return asUser(owner, async () => (await db.query<{value: unknown}>(
      `select to_jsonb(public.${name}(${args.map((arg,i)=>`${arg} => $${i+1}`).join(',')})) value`,
      args.map(arg=>typeof body[arg]==='object'?JSON.stringify(body[arg]):body[arg]),
    )).rows[0].value)
  }
  async function read(table: string, query: URLSearchParams, owner: string) {
    if (!['profiles','tables','games','game_hands'].includes(table)) return []
    const conditions: string[] = [], args: unknown[] = []
    for (const [column, filter] of Array.from(query.entries())) {
      if (!/^[a-z_]+$/.test(column) || ['select','order','limit'].includes(column)) continue
      if (filter === 'is.null') conditions.push(`${column} is null`)
      else if (filter.startsWith('eq.')) { args.push(filter.slice(3)); conditions.push(`${column} = $${args.length}`) }
    }
    return asUser(owner, async () => (await db.query(
      `select * from ${table}${conditions.length?' where '+conditions.join(' and '):''}`,args,
    )).rows)
  }
  return { db, rpc, read, asUser }
}
