import { readFile } from 'node:fs/promises'
import { teamFixture } from './team-fixture'
import { communityFixture } from './community-fixture'
import { ids } from './online-fixture'

export const safetyMigration = '20261015145540_community_safety.sql'
export async function safetyFixture() {
  const base = await communityFixture(await teamFixture()), { db } = base
  await db.exec(`alter table auth.users add column raw_app_meta_data jsonb default '{}';
    insert into auth.users(id,raw_user_meta_data) values
    ('${ids.A}','{"username":"Cuenta A"}'),('${ids.B}','{"username":"Cuenta B"}');
    create schema storage;
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated,anon;
    create policy fixture_storage on storage.objects for all using(true) with check(true);`)
  await db.exec(await readFile('supabase/migrations/' + safetyMigration, 'utf8'))
  await db.exec('update community_safety.settings set enforce_rules=true')
  async function rpc(name: string, body: Record<string, unknown>, owner: string): Promise<any> {
    if (!['accept_community_rules','community_safety_state','set_player_block','report_community_content','moderation_reports','moderation_feedback','resolve_community_report'].includes(name)) return base.rpc(name, body, owner)
    const args = Object.keys(body)
    if (args.some(arg => !/^p_[a-z_]+$/.test(arg))) throw Error('Parámetro inválido')
    return base.asUser(owner, async () => (await db.query<{ value: unknown }>(
      `select to_jsonb(public.${name}(${args.map((arg, i) => `${arg} => $${i + 1}`).join(',')})) value`, args.map(arg => body[arg]),
    )).rows[0].value)
  }
  return { ...base, rpc }
}
