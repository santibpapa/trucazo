-- ============================================================
-- COMUNIDAD — Etapa 4: Novedades (foro solo-lectura)
--
-- news : anuncios/actualizaciones. Los lee todo el mundo; solo el admin publica
--        o borra (por RPCs security definer). El cliente lee directo (RLS).
-- ============================================================

create table if not exists public.news (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text not null,
  author_username text not null,
  created_at      timestamptz not null default now()
);
create index if not exists news_created_idx on public.news (created_at desc);

alter table public.news enable row level security;
create policy "novedades visibles para todos" on public.news
  for select to public using (true);

-- Publicar una novedad (solo admin).
create or replace function public.publish_news(p_title text, p_body text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me    uuid := auth.uid();
  v_un  text;
  v_ad  boolean;
  v_t   text := btrim(coalesce(p_title, ''));
  v_b   text := btrim(coalesce(p_body, ''));
  v_id  uuid;
begin
  if me is null then raise exception 'no autenticado'; end if;
  select username, is_admin into v_un, v_ad from profiles where id = me;
  if not coalesce(v_ad, false) then raise exception 'solo un administrador puede publicar'; end if;
  if length(v_t) = 0 then raise exception 'ponele un título'; end if;
  if length(v_b) = 0 then raise exception 'escribí el contenido'; end if;

  insert into news (title, body, author_username)
  values (left(v_t, 120), left(v_b, 4000), v_un)
  returning id into v_id;
  return v_id;
end;
$$;

-- Borrar una novedad (solo admin).
create or replace function public.delete_news(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception 'solo un administrador puede borrar novedades';
  end if;
  delete from news where id = p_id;
end;
$$;
