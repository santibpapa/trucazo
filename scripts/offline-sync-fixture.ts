import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { seedCatalog, readCatalog, statement, currentFunctions } from './offline-catalog'

export const SYNC_OWNER = '00000000-0000-4000-a000-000000000001'
export const SYNC_MIGRATION = 'supabase/migrations/20261011123215_offline_campaign_sync.sql'
// PostgreSQL aislado compartido por las pruebas SQL y del navegador. No usa
// credenciales ni consultas a producción.
export async function syncFixture() {
  const db = new PGlite()
  await seedCatalog(db)
  const catalog = await readCatalog(db), schema = await readFile('supabase/schema/tables.sql', 'utf8')
  await db.exec(`create schema auth; create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
    create table profiles(id uuid primary key,username text,is_bot boolean default false,coins int default 1000,campaign_points int default 0);
    insert into profiles(id,username) values('${SYNC_OWNER}','Jugador');
    insert into profiles(id,username,is_bot) select bot_id,display_name,true from campaign_rivals;
    set check_function_bodies=off;
    select set_config('request.jwt.claim.sub','${SYNC_OWNER}',false),set_config('request.jwt.claims','{"is_anonymous":false}',false);
    create table lobby_bots(bot_id uuid,difficulty int,trait_liar int,trait_aggressive int);`)
  for (const name of ['games','tables','game_hands','bot_decisions','campaign_style','campaign_progress']) {
    await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + name + ' (')))
  }
  await db.exec('alter table games add primary key(id); alter table tables add primary key(id); alter table campaign_style add primary key(user_id); alter table campaign_progress add primary key(user_id,rival_id); alter table games add foreign key(id) references tables(id);')
  const defs = await currentFunctions('20261011123215_offline_campaign_sync.sql')
  const names = ['_bot_hand_power','_truco_deck','_envido_points','_envido_quiero_value','_envido_reject_value','_envido_winning_cards','_envido_reveal_for','_round_leader','_who_plays_next','_turn_after_envido','play_card','sing_envido','respond_envido','envido_say','sing_truco','respond_truco','irse_al_mazo','advance_hand','_record_style','_northwest_win_probability','_northwest_card_choice','_northwest_plan','_northwest_bot_step','_bot_step_pre_noroeste','bot_step','finish_game','export_offline_campaign']
  for (const name of names) await db.exec(defs.get(name)!)
  await db.exec('revoke all on all functions in schema public from public,anon,authenticated;')
  await db.exec(await readFile(SYNC_MIGRATION, 'utf8'))
  return { db, catalog, defs }
}
