-- ============================================================
-- COMUNIDAD — Etapa 3: grupos ("clanes"/"partys") básicos
--
-- groups         : el grupo (nombre, descripción, líder).
-- group_members  : quién está en qué grupo (un grupo por jugador: user_id es PK).
-- group_invites  : invitación a un amigo para sumarse a un grupo.
--
-- Cliente SOLO lee (RLS); todo se escribe por RPCs security definer. Base para
-- el 2x2/3x3 competitivo futuro. Realtime en group_invites para el aviso en vivo
-- (policy `to public`, igual que game_invites — ver gotcha de Realtime).
-- ============================================================

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  leader_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  group_id  uuid not null references public.groups(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists group_members_group_idx on public.group_members (group_id);

create table if not exists public.group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint group_invites_unique unique (group_id, to_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

-- Lecturas (por si el cliente lee directo; get_community es definer igual).
create policy "ver mi grupo" on public.groups for select to public
  using (id in (select group_id from group_members where user_id = auth.uid()));
create policy "ver co-miembros" on public.group_members for select to public
  using (group_id in (select group_id from group_members where user_id = auth.uid()));
create policy "ver mis invitaciones de grupo" on public.group_invites for select to public
  using (auth.uid() = to_id or auth.uid() = from_id);

alter publication supabase_realtime add table public.group_invites;

-- ------------------------------------------------------------
-- Crear grupo. El creador queda como líder y primer miembro.
-- ------------------------------------------------------------
create or replace function public.create_group(p_name text, p_description text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me    uuid := auth.uid();
  v_nm  text := btrim(coalesce(p_name, ''));
  v_id  uuid;
begin
  if me is null then raise exception 'no autenticado'; end if;
  if length(v_nm) = 0 then raise exception 'ponele un nombre al grupo'; end if;
  if length(v_nm) > 40 then raise exception 'el nombre es muy largo (máximo 40)'; end if;
  if exists (select 1 from group_members where user_id = me) then
    raise exception 'ya estás en un grupo';
  end if;

  insert into groups (name, description, leader_id)
  values (v_nm, left(btrim(coalesce(p_description, '')), 200), me)
  returning id into v_id;

  insert into group_members (user_id, group_id) values (me, v_id);
  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Invitar a un amigo a mi grupo (cualquier miembro puede invitar).
-- ------------------------------------------------------------
create or replace function public.invite_to_group(p_friend_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me   uuid := auth.uid();
  v_gid uuid;
  v_count int;
begin
  if me is null then raise exception 'no autenticado'; end if;
  select group_id into v_gid from group_members where user_id = me;
  if v_gid is null then raise exception 'no estás en ningún grupo'; end if;

  if not exists (
    select 1 from friendships
     where status = 'accepted'
       and ((requester_id = me and addressee_id = p_friend_id)
         or (requester_id = p_friend_id and addressee_id = me))
  ) then
    raise exception 'solo podés invitar a tus amigos';
  end if;

  if exists (select 1 from group_members where user_id = p_friend_id and group_id = v_gid) then
    raise exception 'ya está en el grupo';
  end if;

  select count(*) into v_count from group_members where group_id = v_gid;
  if v_count >= 20 then raise exception 'el grupo está lleno'; end if;

  insert into group_invites (group_id, from_id, to_id)
  values (v_gid, me, p_friend_id)
  on conflict (group_id, to_id) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- Responder una invitación de grupo. Aceptar = sumarse (si no estoy en otro).
-- ------------------------------------------------------------
create or replace function public.respond_group_invite(p_invite_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare inv group_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into inv from group_invites where id = p_invite_id for update;
  if not found then return; end if;
  if inv.to_id <> auth.uid() then raise exception 'esta invitación no es para vos'; end if;

  if not p_accept then
    delete from group_invites where id = inv.id;
    return;
  end if;

  if exists (select 1 from group_members where user_id = auth.uid()) then
    raise exception 'ya estás en un grupo';
  end if;
  if not exists (select 1 from groups where id = inv.group_id) then
    delete from group_invites where id = inv.id;
    raise exception 'el grupo ya no existe';
  end if;
  if (select count(*) from group_members where group_id = inv.group_id) >= 20 then
    raise exception 'el grupo está lleno';
  end if;

  insert into group_members (user_id, group_id) values (auth.uid(), inv.group_id);
  delete from group_invites where to_id = auth.uid();  -- limpio mis otras invitaciones
end;
$$;

-- ------------------------------------------------------------
-- Salir del grupo. Si sale el líder: pasa el mando al más antiguo; si queda
-- vacío, el grupo se disuelve.
-- ------------------------------------------------------------
create or replace function public.leave_group()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me      uuid := auth.uid();
  v_gid   uuid;
  v_leader uuid;
  v_next  uuid;
begin
  if me is null then raise exception 'no autenticado'; end if;
  select group_id into v_gid from group_members where user_id = me;
  if v_gid is null then return; end if;

  delete from group_members where user_id = me;

  select leader_id into v_leader from groups where id = v_gid;
  if v_leader = me then
    select user_id into v_next from group_members
     where group_id = v_gid order by joined_at asc limit 1;
    if v_next is null then
      delete from groups where id = v_gid;  -- vacío: se disuelve (cascade)
    else
      update groups set leader_id = v_next where id = v_gid;
    end if;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Expulsar a un miembro (solo el líder; no a sí mismo).
-- ------------------------------------------------------------
create or replace function public.kick_group_member(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_gid uuid;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select id into v_gid from groups where leader_id = auth.uid();
  if v_gid is null then raise exception 'no sos el líder de ningún grupo'; end if;
  if p_user_id = auth.uid() then raise exception 'no te podés expulsar a vos mismo'; end if;
  delete from group_members where user_id = p_user_id and group_id = v_gid;
end;
$$;

-- ------------------------------------------------------------
-- Eliminar el grupo (solo el líder). Borra miembros e invitaciones (cascade).
-- ------------------------------------------------------------
create or replace function public.delete_group()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  delete from groups where leader_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------
-- get_community: se agregan 'group' (mi grupo con miembros) y 'group_invites_in'.
-- ------------------------------------------------------------
create or replace function public.get_community()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me             uuid := auth.uid();
  v_friends      jsonb;
  v_incoming     jsonb;
  v_outgoing     jsonb;
  v_invites_in   jsonb;
  v_invite_out   jsonb;
  v_group        jsonb;
  v_group_inv    jsonb;
begin
  if me is null then raise exception 'no autenticado'; end if;

  select coalesce(jsonb_agg(x.item order by (x.item->>'online') desc, lower(x.item->>'username')), '[]'::jsonb)
    into v_friends
    from (
      select jsonb_build_object(
        'friendship_id', f.id, 'user_id', p.id, 'username', p.username,
        'online', coalesce(up.last_seen_at > now() - interval '75 seconds', false),
        'playing', exists (select 1 from games g where g.status = 'playing' and (g.player1_id = p.id or g.player2_id = p.id))
      ) as item
      from friendships f
      join profiles p on p.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      left join user_presence up on up.user_id = p.id
     where f.status = 'accepted' and (f.requester_id = me or f.addressee_id = me)
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('friendship_id', f.id, 'user_id', p.id, 'username', p.username) order by f.created_at desc), '[]'::jsonb)
    into v_incoming from friendships f join profiles p on p.id = f.requester_id
   where f.status = 'pending' and f.addressee_id = me;

  select coalesce(jsonb_agg(jsonb_build_object('friendship_id', f.id, 'user_id', p.id, 'username', p.username) order by f.created_at desc), '[]'::jsonb)
    into v_outgoing from friendships f join profiles p on p.id = f.addressee_id
   where f.status = 'pending' and f.requester_id = me;

  select coalesce(jsonb_agg(jsonb_build_object('invite_id', gi.id, 'from_id', gi.from_id, 'from_username', gi.from_username,
           'table_id', gi.table_id, 'bet', gi.bet, 'target_score', gi.target_score) order by gi.created_at desc), '[]'::jsonb)
    into v_invites_in from game_invites gi where gi.to_id = me;

  select jsonb_build_object('invite_id', gi.id, 'to_id', gi.to_id, 'to_username', p.username,
           'table_id', gi.table_id, 'table_status', t.status)
    into v_invite_out from game_invites gi join profiles p on p.id = gi.to_id
    left join tables t on t.id = gi.table_id where gi.from_id = me;

  -- Mi grupo (con miembros y su estado conectado/jugando).
  select jsonb_build_object(
           'id', g.id, 'name', g.name, 'description', g.description,
           'leader_id', g.leader_id, 'is_leader', (g.leader_id = me),
           'members', (
             select coalesce(jsonb_agg(jsonb_build_object(
                 'user_id', p.id, 'username', p.username,
                 'is_leader', (p.id = g.leader_id),
                 'online', coalesce(up.last_seen_at > now() - interval '75 seconds', false),
                 'playing', exists (select 1 from games gg where gg.status = 'playing' and (gg.player1_id = p.id or gg.player2_id = p.id))
               ) order by (p.id = g.leader_id) desc, lower(p.username)), '[]'::jsonb)
             from group_members m join profiles p on p.id = m.user_id
             left join user_presence up on up.user_id = p.id
             where m.group_id = g.id)
         )
    into v_group
    from group_members gm join groups g on g.id = gm.group_id
   where gm.user_id = me;

  select coalesce(jsonb_agg(jsonb_build_object(
           'invite_id', gi.id, 'group_id', gi.group_id, 'group_name', g.name, 'from_username', p.username
         ) order by gi.created_at desc), '[]'::jsonb)
    into v_group_inv
    from group_invites gi join groups g on g.id = gi.group_id join profiles p on p.id = gi.from_id
   where gi.to_id = me;

  return jsonb_build_object(
    'friends', v_friends, 'incoming', v_incoming, 'outgoing', v_outgoing,
    'invites_in', v_invites_in, 'invite_out', v_invite_out,
    'group', v_group, 'group_invites_in', v_group_inv
  );
end;
$$;
