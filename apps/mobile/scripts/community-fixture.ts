// Comunidad SQL vigente en una base descartable, sin usuarios ni mensajes reales.
import { readFile } from 'node:fs/promises'
import { onlineFixture } from './online-fixture'
import { currentFunctions, statement } from '../../../scripts/offline-catalog'

export async function communityFixture(supplied?: Awaited<ReturnType<typeof onlineFixture>>) {
  const base = supplied ?? await onlineFixture()
  const { db } = base
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  for (const name of ['user_presence', 'chat_messages', 'groups', 'group_members', 'group_invites', 'news', 'feedback']) {
    await db.exec(statement(schema, schema.indexOf('create table if not exists public.' + name + ' (')))
  }
  await db.exec(`alter table user_presence add primary key(user_id);
    alter table chat_messages add primary key(id); alter table groups add primary key(id);
    alter table group_members add primary key(user_id); alter table group_invites add primary key(id);
    alter table news add primary key(id); alter table feedback add primary key(id);
    alter table group_members add foreign key(group_id) references groups(id) on delete cascade;
    alter table group_invites add foreign key(group_id) references groups(id) on delete cascade;
    alter table group_invites add unique(group_id,to_id);
    create unique index friendships_pair on friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));`)
  const names = ['get_community', 'touch_online', 'send_friend_request', 'respond_friend_request', 'remove_friend',
    'create_group', 'invite_to_group', 'respond_group_invite', 'leave_group', 'kick_group_member', 'delete_group',
    'send_chat_message', 'delete_chat_message', 'clear_chat', 'publish_news', 'delete_news', 'submit_feedback']
  const definitions = await currentFunctions()
  for (const name of names) await db.exec(definitions.get(name)!)
  const policies = await readFile('supabase/schema/policies.sql', 'utf8')
  for (const table of ['chat_messages', 'news', 'friendships', 'group_invites']) {
    await db.exec(`alter table ${table} enable row level security; grant select on ${table} to authenticated;`)
    for (const policy of Array.from(policies.matchAll(/create policy[^;]+;/g))) if (policy[0].includes('on public.' + table + ' for SELECT')) await db.exec(policy[0])
  }
  async function rpc(name: string, body: Record<string, unknown>, owner: string) {
    if (!names.includes(name)) return base.rpc(name, body, owner)
    const args = Object.keys(body)
    if (args.some(arg => !/^p_[a-z_]+$/.test(arg))) throw new Error('Parámetro inválido')
    return base.asUser(owner, async () => (await db.query<{ value: any }>(
      `select to_jsonb(public.${name}(${args.map((arg, i) => `${arg} => $${i + 1}`).join(',')})) value`, args.map(arg => body[arg]),
    )).rows[0].value)
  }
  return { ...base, rpc }
}
