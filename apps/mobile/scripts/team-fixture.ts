// SQL vigente de parejas en PostgreSQL descartable; Auth/cron son andamiaje local.
import { readFile } from 'node:fs/promises'
import { onlineFixture } from './online-fixture'
import { statement } from '../../../scripts/offline-catalog'

export async function teamFixture() {
  const base = await onlineFixture(), { db } = base
  await db.exec(`create role service_role; grant usage on schema auth to authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,is_anonymous boolean default false);
    create function auth.fixture_profile() returns trigger language plpgsql as $$begin
      insert into public.profiles(id,username) values(new.id,new.raw_user_meta_data->>'username') on conflict do nothing;
      return new; end$$;
    create trigger fixture_profile after insert on auth.users for each row execute function auth.fixture_profile();
    create schema cron;
    create function cron.schedule(text,text,text) returns bigint language sql as $$select 0::bigint$$;
    create table public.profile_medals(profile_id uuid,medal_slug text);`)
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  await db.exec(statement(schema, schema.indexOf('create table if not exists public.email_preferences (')))
  for (const file of ['20260909211038_team_2vs2.sql','20260913191141_team_2vs2_maintenance.sql',
    '20260914100000_team_2vs2_abandono.sql','20260914170000_team_2vs2_bots_hablan.sql',
    '20260928023421_match_live_chat.sql','20260928165300_match_chat_bots.sql']) {
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'))
  }
  async function rpc(name: string, body: Record<string, unknown>, owner: string) {
    if (!['team_create','team_join','team_action','team_snapshot','team_lobby','team_presence','team_say','send_match_chat_message'].includes(name)) return base.rpc(name, body, owner)
    const args = Object.keys(body)
    if (args.some(arg=>!/^p_[a-z_]+$/.test(arg))) throw new Error('Parámetro inválido')
    return base.asUser(owner, async () => (await db.query<{value: any}>(
      `select to_jsonb(public.${name}(${args.map((arg,i)=>`${arg} => $${i+1}`).join(',')})) value`,
      args.map(arg=>body[arg] !== null && typeof body[arg]==='object'?JSON.stringify(body[arg]):body[arg]),
    )).rows[0].value)
  }
  return { ...base, rpc }
}
