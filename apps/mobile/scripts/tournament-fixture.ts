// Base descartable: reglas de torneos vigentes; nunca accede al servidor real.
import { readFile, readdir } from 'node:fs/promises'
import { teamFixture } from './team-fixture'
import { statement } from '../../../scripts/offline-catalog'

export async function tournamentFixture() {
  const base = await teamFixture(), { db } = base
  await db.exec(`alter table auth.users add column instance_id uuid, add column aud text,
    add column role text, add column email_confirmed_at timestamptz, add column raw_app_meta_data jsonb default '{}',
    add column created_at timestamptz default now(), add column updated_at timestamptz default now();
    drop trigger fixture_profile on auth.users;
    alter table profile_medals add primary key(profile_id,medal_slug);`)
  const schema = await readFile('supabase/schema/tables.sql', 'utf8')
  await db.exec(statement(schema, schema.indexOf('create table if not exists public.campaign_provinces (')))
  await db.exec(statement(schema, schema.indexOf('create table if not exists public.medals (')))
  const email = await readFile('supabase/migrations/20260826_email_notifications.sql', 'utf8')
  await db.exec(statement(email, email.indexOf('create table if not exists public.email_preferences (')))
  await db.exec(statement(email, email.indexOf('create table if not exists public.email_deliveries ('))
    .replace('references public.news(id) on delete set null', '').replace('references public.reengagement_campaigns(id) on delete restrict', ''))
  await db.exec(`alter table medals add primary key(slug);
    create schema net;
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 1000)
      returns bigint language plpgsql as $$begin raise exception 'Red prohibida en la prueba'; end$$;`)
  const objectives = await readFile('supabase/migrations/20260904150348_ciclo_retorno.sql', 'utf8')
  await db.exec(objectives.slice(0, objectives.indexOf('alter table public.analytics_events')) + '\ncommit;')
  for (const file of (await readdir('supabase/migrations')).sort().filter(name => /tournament/.test(name))) {
    await db.exec(await readFile('supabase/migrations/' + file, 'utf8'))
  }
  async function rpc(name: string, body: Record<string, unknown>, owner: string) {
    if (!/^tournament_[a-z_]+$/.test(name)) return base.rpc(name, body, owner)
    const args = Object.keys(body)
    if (args.some(arg => !/^p_[a-z_]+$/.test(arg))) throw new Error('Parámetro inválido')
    return base.asUser(owner, async () => (await db.query<{ value: any }>(
      `select to_jsonb(public.${name}(${args.map((arg, i) => `${arg} => $${i + 1}`).join(',')})) value`, args.map(arg => body[arg]),
    )).rows[0].value)
  }
  return { ...base, rpc }
}
