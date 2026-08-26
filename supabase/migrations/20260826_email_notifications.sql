-- ============================================================
-- EMAILS — novedades y recordatorios para volver a jugar
--
-- Las tablas quedan cerradas al navegador. Solo el servidor de Vercel, usando
-- la clave service_role, puede leer preferencias, reclamar envíos y marcarlos.
-- Las novedades que ya existían NO se mandan: solo las publicadas después de
-- aplicar esta migración quedan habilitadas para email.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. PREFERENCIAS Y REGISTRO DE ENVÍOS
-- ------------------------------------------------------------

create table if not exists public.email_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  news_enabled         boolean not null default true,
  reengagement_enabled boolean not null default true,
  unsubscribe_token    uuid not null default gen_random_uuid() unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.email_deliveries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('news', 'never_played', 'inactive')),
  news_id     uuid references public.news(id) on delete set null,
  dedupe_key  text not null unique,
  status      text not null default 'sending'
              check (status in ('sending', 'sent', 'failed')),
  attempts    integer not null default 1 check (attempts > 0),
  provider_id text,
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists email_deliveries_user_created_idx
  on public.email_deliveries (user_id, created_at desc);

alter table public.email_preferences enable row level security;
alter table public.email_deliveries enable row level security;

revoke all on table public.email_preferences from anon, authenticated, public;
revoke all on table public.email_deliveries from anon, authenticated, public;
grant select, insert, update on table public.email_preferences to service_role;
grant select, insert, update on table public.email_deliveries to service_role;

-- Los perfiles existentes empiezan suscriptos. Cada correo incluye una baja
-- inmediata y la página de preferencias permite apagar cada tipo por separado.
insert into public.email_preferences (user_id)
select p.id
from public.profiles p
where not p.is_bot
on conflict (user_id) do nothing;

-- También crea las preferencias para cada perfil futuro. Es SECURITY DEFINER
-- porque el perfil puede nacer desde una sesión con permisos muy limitados.
create or replace function public.ensure_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not new.is_bot then
    insert into public.email_preferences (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.ensure_email_preferences()
  from anon, authenticated, public;
grant execute on function public.ensure_email_preferences() to service_role;

drop trigger if exists trg_ensure_email_preferences on public.profiles;
create trigger trg_ensure_email_preferences
  after insert on public.profiles
  for each row execute function public.ensure_email_preferences();

-- ------------------------------------------------------------
-- 2. SOLO LAS NOVEDADES NUEVAS SE MANDAN POR EMAIL
-- ------------------------------------------------------------

alter table public.news
  add column if not exists email_enabled boolean not null default false;
alter table public.news
  add column if not exists email_completed_at timestamptz;

-- El ADD anterior deja false en todo lo histórico. Desde este punto, cada
-- publicación nueva entra automáticamente en el envío diario.
alter table public.news alter column email_enabled set default true;

-- ------------------------------------------------------------
-- 3. RPC INTERNAS, EXCLUSIVAS DEL SERVIDOR
-- ------------------------------------------------------------

-- Devuelve la actividad y las preferencias de un lote de usuarios. El email
-- no vive acá: se obtiene en el servidor mediante Auth Admin de Supabase.
create or replace function public.email_recipient_activity(p_user_ids uuid[])
returns table (
  user_id uuid,
  username text,
  registered_at timestamptz,
  last_played_at timestamptz,
  news_enabled boolean,
  reengagement_enabled boolean,
  unsubscribe_token uuid
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.username,
    p.created_at,
    max(h.created_at),
    ep.news_enabled,
    ep.reengagement_enabled,
    ep.unsubscribe_token
  from public.profiles p
  join public.email_preferences ep on ep.user_id = p.id
  left join public.game_history h on h.player_id = p.id
  where p.id = any(p_user_ids)
    and not p.is_bot
    and not p.is_admin
  group by
    p.id, p.username, p.created_at,
    ep.news_enabled, ep.reengagement_enabled, ep.unsubscribe_token;
$$;

revoke execute on function public.email_recipient_activity(uuid[])
  from anon, authenticated, public;
grant execute on function public.email_recipient_activity(uuid[]) to service_role;

-- Reclama un envío de forma atómica. Si dos ejecuciones del cron se pisan,
-- solo una recibe un id y manda el correo. Los fallos y reclamos abandonados
-- hace más de 30 minutos pueden reintentarse.
create or replace function public.claim_email_deliveries(
  p_jobs jsonb,
  p_limit integer default 90
)
returns table (out_dedupe_key text, delivery_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_job jsonb;
  v_id uuid;
  v_claimed integer := 0;
  v_kind text;
begin
  if jsonb_typeof(p_jobs) <> 'array' then
    raise exception 'la lista de emails es inválida';
  end if;

  for v_job in select value from jsonb_array_elements(p_jobs)
  loop
    exit when v_claimed >= greatest(1, least(coalesce(p_limit, 90), 100));
    v_id := null;
    v_kind := v_job->>'kind';
    if v_kind not in ('news', 'never_played', 'inactive') then
      raise exception 'tipo de email inválido';
    end if;

    insert into public.email_deliveries (
      user_id, kind, news_id, dedupe_key, status
    ) values (
      (v_job->>'user_id')::uuid,
      v_kind,
      nullif(v_job->>'news_id', '')::uuid,
      v_job->>'dedupe_key',
      'sending'
    )
    on conflict (dedupe_key) do update
      set status = 'sending',
          attempts = email_deliveries.attempts + 1,
          last_error = null,
          updated_at = now()
    where email_deliveries.status = 'failed'
       or (
         email_deliveries.status = 'sending'
         and email_deliveries.updated_at < now() - interval '30 minutes'
       )
    returning id into v_id;

    if v_id is not null then
      out_dedupe_key := v_job->>'dedupe_key';
      delivery_id := v_id;
      v_claimed := v_claimed + 1;
      return next;
    end if;
  end loop;
end;
$$;

revoke execute on function public.claim_email_deliveries(jsonb, integer)
  from anon, authenticated, public;
grant execute on function public.claim_email_deliveries(jsonb, integer)
  to service_role;

commit;
