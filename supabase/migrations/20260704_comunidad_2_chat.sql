-- ============================================================
-- COMUNIDAD — Etapa 2: chat global con historial
--
-- profiles.is_admin : marca de administrador (el dueño). Puede borrar cualquier
--                     mensaje del chat y limpiarlo entero.
-- chat_messages     : mensajes del chat global. El cliente SOLO lee (RLS); se
--                     escribe/borra por RPCs security definer. Los mensajes
--                     viejos se limpian solos (oportunista, al enviar).
-- ============================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  username   text not null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at);

alter table public.chat_messages enable row level security;
create policy "chat visible para logueados" on public.chat_messages
  for select to authenticated using (true);

-- Aviso instantáneo de mensajes nuevos / borrados (respeta la RLS de SELECT).
alter publication supabase_realtime add table public.chat_messages;

-- Enviar un mensaje al chat global. Valida largo y pone un freno anti-spam
-- (1 mensaje cada ~1.5s por jugador). De paso limpia los mensajes viejos.
create or replace function public.send_chat_message(p_body text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me   uuid := auth.uid();
  v_un text;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'no autenticado'; end if;
  if length(v_body) = 0 then raise exception 'escribí algo'; end if;
  v_body := left(v_body, 300);  -- tope de largo

  if exists (
    select 1 from chat_messages
     where user_id = me and created_at > now() - interval '1.5 seconds'
  ) then
    raise exception 'esperá un momento antes de mandar otro mensaje';
  end if;

  select username into v_un from profiles where id = me;
  if not found then raise exception 'perfil no encontrado'; end if;

  insert into chat_messages (user_id, username, body) values (me, v_un, v_body);

  -- Limpieza oportunista de mensajes viejos (de vez en cuando, para no recargar).
  if random() < 0.05 then
    delete from chat_messages where created_at < now() - interval '3 days';
  end if;
end;
$$;

-- Borrar un mensaje: el admin puede borrar cualquiera; un jugador, el suyo.
create or replace function public.delete_chat_message(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  msg      chat_messages%rowtype;
  v_admin  boolean;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into msg from chat_messages where id = p_id;
  if not found then return; end if;  -- idempotente
  select is_admin into v_admin from profiles where id = auth.uid();
  if not coalesce(v_admin, false) and msg.user_id <> auth.uid() then
    raise exception 'no podés borrar este mensaje';
  end if;
  delete from chat_messages where id = p_id;
end;
$$;

-- Limpiar todo el chat (solo admin).
create or replace function public.clear_chat()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception 'solo un administrador puede limpiar el chat';
  end if;
  delete from chat_messages;
end;
$$;

-- El dueño del proyecto queda como administrador.
update public.profiles set is_admin = true
 where id = (select id from auth.users where lower(email) = 'santiagobpapalia@gmail.com');
