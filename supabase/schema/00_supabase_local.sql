-- ============================================================
-- TRUCAZO — Andamiaje de Supabase para una base LOCAL de prueba
--
-- ⚠️  ESTO NO SE CORRE NUNCA EN SUPABASE. Allá ya existe todo esto.
--
-- Supabase no es "Postgres pelado": encima le agrega cosas que el resto de los
-- archivos dan por sentadas (los roles anon/authenticated, el schema auth con
-- la tabla de usuarios, el depósito de archivos, los permisos por defecto).
-- Este archivo arma una imitación mínima de todo eso, para poder levantar una
-- copia de la base en una máquina cualquiera y probar contra ella.
--
-- Es lo primero que corre scripts/rebuild-db.sh.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Los roles
-- ------------------------------------------------------------
-- anon          = visitante sin cuenta
-- authenticated = alguien con sesión iniciada (incluidos los invitados)
-- service_role   = la llave secreta del servidor, se saltea la RLS
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. El schema auth (los usuarios)
-- ------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  instance_id         uuid,
  id                  uuid primary key,
  aud                 varchar(255),
  role                varchar(255),
  email               varchar(255),
  encrypted_password  varchar(255),
  email_confirmed_at  timestamptz,
  raw_app_meta_data   jsonb default '{}'::jsonb,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Quién sos vos. En Supabase esto sale del token de la sesión; acá lo leemos de
-- una variable que las pruebas fijan a mano con set_config().
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;

-- Explícito a propósito: auth.uid() la usan 363 reglas de seguridad. En Supabase
-- viene abierta. Si quedara cerrada, TODA la app rebota con "permission denied
-- for function uid" y parece un problema de otra cosa.
grant execute on function auth.uid() to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 3. El depósito de archivos (avatares y fotos de las reseñas)
-- ------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now()
);

create table if not exists storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text references storage.buckets(id),
  name        text,
  owner       uuid,
  created_at  timestamptz default now(),
  metadata    jsonb
);

alter table storage.objects enable row level security;

-- Parte una ruta "carpeta/archivo.jpg" en sus tramos. Las reglas de subida la
-- usan para exigir que el primer tramo sea el id del que sube.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 4. El cron, de mentira
-- ------------------------------------------------------------
-- En Supabase, pg_cron es el que llama solo a los barridos de limpieza. Esa
-- extensión no existe en un Postgres común, así que dejamos una imitación que
-- no hace nada: alcanza para que las migraciones que la nombran no se caigan.
-- Que los barridos no corran solos en una base de prueba da igual.
create schema if not exists cron;

create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint
language sql
as $$ select 0::bigint; $$;

create or replace function cron.unschedule(job_name text)
returns boolean
language sql
as $$ select true; $$;

-- ------------------------------------------------------------
-- 5. Realtime
-- ------------------------------------------------------------
-- La lista de tablas cuyos cambios se transmiten en vivo. Las migraciones le
-- van sumando tablas.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- ------------------------------------------------------------
-- 6. Los permisos de tabla que Supabase da por defecto  ← CRÍTICO
-- ------------------------------------------------------------
-- Supabase le da a anon y authenticated permiso amplio sobre todo el schema
-- public, y confía la protección REAL a la RLS (las políticas de policies.sql).
--
-- Sin esto, una base local da FALSOS NEGATIVOS: cualquier intento de trampa
-- rebota con "permission denied for table" y las pruebas de seguridad pasan en
-- verde sin haber probado absolutamente nada.
--
-- Ojo: esto va acá porque las tablas todavía no existen; scripts/rebuild-db.sh
-- vuelve a aplicar los grants AL FINAL, cuando ya están todas creadas.
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
