-- ============================================================
-- COMUNIDAD — Etapa 1: amigos, presencia global e invitaciones a jugar
--
-- Tablas nuevas:
--   user_presence : "estoy acá" global (latido desde lobby/comunidad; la
--                   pantalla de juego lo actualiza vía touch_presence).
--   friendships   : amistades. Una fila por par (requester → addressee),
--                   status 'pending' (solicitud) o 'accepted'. El índice único
--                   sobre (least, greatest) impide duplicados en ambos sentidos.
--   game_invites  : invitación "vení a jugar" de un amigo. Crea una mesa
--                   privada por abajo; si se rechaza/cancela, se reembolsa la
--                   apuesta y se borra la mesa. Una invitación activa por
--                   jugador (índice único en from_id).
--
-- Reglas: el cliente SOLO lee (SELECT con RLS). Todas las escrituras pasan por
-- RPCs security definer, igual que el resto del juego.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tablas + RLS
-- ------------------------------------------------------------

create table if not exists public.user_presence (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;
create policy "presencia visible para logueados" on public.user_presence
  for select to authenticated using (true);

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
alter table public.friendships enable row level security;
create policy "ver mis amistades" on public.friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create table if not exists public.game_invites (
  id            uuid primary key default gen_random_uuid(),
  from_id       uuid not null references public.profiles(id) on delete cascade,
  to_id         uuid not null references public.profiles(id) on delete cascade,
  from_username text not null,
  table_id      uuid not null references public.tables(id) on delete cascade,
  bet           integer not null,
  target_score  integer not null,
  created_at    timestamptz not null default now(),
  constraint game_invites_not_self check (from_id <> to_id)
);
create unique index if not exists game_invites_one_per_inviter
  on public.game_invites (from_id);
alter table public.game_invites enable row level security;
create policy "ver mis invitaciones" on public.game_invites
  for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

-- Aviso instantáneo de invitación (postgres_changes respeta la RLS de SELECT).
alter publication supabase_realtime add table public.game_invites;

-- ------------------------------------------------------------
-- 2) Presencia
-- ------------------------------------------------------------

-- Latido global: lo llaman lobby y comunidad cada ~30s.
create or replace function public.touch_online()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into user_presence (user_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = now();
end;
$$;

-- El latido de la partida ahora también marca presencia global, así los amigos
-- te ven "en línea" mientras jugás y al terminar.
create or replace function public.touch_presence(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare g games%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  insert into game_presence (game_id, player_id, last_seen_at)
  values (p_game_id, auth.uid(), now())
  on conflict (game_id, player_id) do update set last_seen_at = now();

  insert into user_presence (user_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = now();
end;
$$;

-- ------------------------------------------------------------
-- 3) Amigos
-- ------------------------------------------------------------

-- Mandar solicitud por nombre de usuario. Si el otro ya me había mandado una,
-- se acepta directo (nadie queda esperando al pedo).
create or replace function public.send_friend_request(p_username text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me    uuid := auth.uid();
  other profiles%rowtype;
  f     friendships%rowtype;
begin
  if me is null then raise exception 'no autenticado'; end if;

  select * into other from profiles
   where lower(username) = lower(trim(p_username)) and not is_bot;
  if not found then raise exception 'no hay ningún jugador con ese nombre'; end if;
  if other.id = me then raise exception 'no te podés agregar a vos mismo'; end if;

  select * into f from friendships
   where (requester_id = me and addressee_id = other.id)
      or (requester_id = other.id and addressee_id = me)
   for update;

  if found then
    if f.status = 'accepted' then raise exception 'ya son amigos'; end if;
    if f.requester_id = me then raise exception 'ya le mandaste una solicitud'; end if;
    update friendships set status = 'accepted', responded_at = now() where id = f.id;
    return jsonb_build_object('status', 'accepted', 'username', other.username);
  end if;

  insert into friendships (requester_id, addressee_id) values (me, other.id);
  return jsonb_build_object('status', 'pending', 'username', other.username);
end;
$$;

-- Aceptar (true) o rechazar (false) una solicitud que me llegó.
create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare f friendships%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into f from friendships where id = p_friendship_id for update;
  if not found then return; end if;  -- idempotente
  if f.addressee_id <> auth.uid() then raise exception 'esta solicitud no es para vos'; end if;
  if f.status <> 'pending' then return; end if;

  if p_accept then
    update friendships set status = 'accepted', responded_at = now() where id = f.id;
  else
    delete from friendships where id = f.id;
  end if;
end;
$$;

-- Eliminar un amigo, o cancelar una solicitud mía que sigue pendiente.
create or replace function public.remove_friend(p_friendship_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  delete from friendships
   where id = p_friendship_id
     and (requester_id = auth.uid() or addressee_id = auth.uid());
end;
$$;

-- ------------------------------------------------------------
-- 4) Invitaciones a jugar
-- ------------------------------------------------------------

-- Cancelar mi invitación activa: reembolsa la apuesta y borra la mesa (la
-- invitación cae en cascada). Idempotente.
create or replace function public.cancel_game_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  inv game_invites%rowtype;
  t   tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into inv from game_invites where id = p_invite_id for update;
  if not found then return; end if;
  if inv.from_id <> auth.uid() then raise exception 'no es tu invitación'; end if;

  select * into t from tables where id = inv.table_id for update;
  if found and t.status = 'waiting' then
    update profiles set coins = coins + t.bet where id = t.creator_id;
    delete from tables where id = t.id;  -- borra también la invitación (cascade)
  else
    delete from game_invites where id = inv.id;
  end if;
end;
$$;

-- Invitar a un amigo: crea una mesa privada (descuenta la apuesta, como
-- create_table) y deja la invitación. Si tenía otra invitación activa, se
-- cancela antes (con reembolso).
create or replace function public.invite_friend(
  p_friend_id uuid,
  p_bet integer default 10,
  p_target_score integer default 30,
  p_time_limit integer default 30
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me         uuid := auth.uid();
  v_coins    int;
  v_username text;
  v_table    tables%rowtype;
  v_old      game_invites%rowtype;
  v_invite   game_invites%rowtype;
begin
  if me is null then raise exception 'no autenticado'; end if;
  if p_bet < 10 then raise exception 'la apuesta minima es 10'; end if;
  if p_target_score not in (15, 30) then raise exception 'puntaje objetivo invalido'; end if;
  if p_time_limit not in (15, 30) then raise exception 'tiempo invalido'; end if;

  if not exists (
    select 1 from friendships
     where status = 'accepted'
       and ((requester_id = me and addressee_id = p_friend_id)
         or (requester_id = p_friend_id and addressee_id = me))
  ) then
    raise exception 'solo podés invitar a tus amigos';
  end if;

  select * into v_old from game_invites where from_id = me for update;
  if found then perform public.cancel_game_invite(v_old.id); end if;

  select coins, username into v_coins, v_username from profiles where id = me for update;
  if v_coins < p_bet then raise exception 'monedas insuficientes'; end if;
  update profiles set coins = coins - p_bet where id = me;

  insert into tables (name, creator_id, creator_username, bet, is_private, private_code,
                      status, target_score, time_limit)
  values ('Duelo de ' || v_username, me, v_username, p_bet, true,
          upper(substr(md5(random()::text), 1, 6)), 'waiting', p_target_score, p_time_limit)
  returning * into v_table;

  insert into game_invites (from_id, to_id, from_username, table_id, bet, target_score)
  values (me, p_friend_id, v_username, v_table.id, p_bet, p_target_score)
  returning * into v_invite;

  return jsonb_build_object('invite_id', v_invite.id, 'table_id', v_table.id);
end;
$$;

-- Responder una invitación que me llegó. Aceptar = unirse a la mesa (descuenta
-- mi apuesta) y devuelve el id de la partida; el que invitó entra por su
-- polling (mesa pasa a 'playing'). Rechazar = reembolso al que invitó y se
-- borra todo; devuelve null.
create or replace function public.respond_game_invite(p_invite_id uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  inv        game_invites%rowtype;
  t          tables%rowtype;
  v_coins    int;
  v_username text;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into inv from game_invites where id = p_invite_id for update;
  if not found then raise exception 'la invitación ya no está disponible'; end if;
  if inv.to_id <> auth.uid() then raise exception 'esta invitación no es para vos'; end if;

  select * into t from tables where id = inv.table_id for update;
  if not found or t.status <> 'waiting' or t.opponent_id is not null then
    delete from game_invites where id = inv.id;
    raise exception 'la invitación ya no está disponible';
  end if;

  if not p_accept then
    update profiles set coins = coins + t.bet where id = t.creator_id;
    delete from tables where id = t.id;  -- borra también la invitación (cascade)
    return null;
  end if;

  select coins, username into v_coins, v_username from profiles where id = auth.uid() for update;
  if v_coins < t.bet then raise exception 'monedas insuficientes'; end if;
  update profiles set coins = coins - t.bet where id = auth.uid();

  update tables
     set opponent_id = auth.uid(), opponent_username = v_username, status = 'playing'
   where id = t.id;

  delete from game_invites where id = inv.id;
  return t.id;
end;
$$;

-- ------------------------------------------------------------
-- 5) Vista general para la pantalla (una sola llamada)
-- ------------------------------------------------------------

create or replace function public.get_community()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me           uuid := auth.uid();
  v_friends    jsonb;
  v_incoming   jsonb;
  v_outgoing   jsonb;
  v_invites_in jsonb;
  v_invite_out jsonb;
begin
  if me is null then raise exception 'no autenticado'; end if;

  -- Amigos aceptados, con estado: conectado (latido < 75s) y/o jugando.
  select coalesce(jsonb_agg(x.item order by (x.item->>'online') desc, lower(x.item->>'username')), '[]'::jsonb)
    into v_friends
    from (
      select jsonb_build_object(
        'friendship_id', f.id,
        'user_id', p.id,
        'username', p.username,
        'online', coalesce(up.last_seen_at > now() - interval '75 seconds', false),
        'playing', exists (
          select 1 from games g
           where g.status = 'playing' and (g.player1_id = p.id or g.player2_id = p.id)
        )
      ) as item
      from friendships f
      join profiles p
        on p.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      left join user_presence up on up.user_id = p.id
     where f.status = 'accepted' and (f.requester_id = me or f.addressee_id = me)
    ) x;

  -- Solicitudes que me llegaron.
  select coalesce(jsonb_agg(jsonb_build_object(
           'friendship_id', f.id, 'user_id', p.id, 'username', p.username
         ) order by f.created_at desc), '[]'::jsonb)
    into v_incoming
    from friendships f join profiles p on p.id = f.requester_id
   where f.status = 'pending' and f.addressee_id = me;

  -- Solicitudes que mandé y siguen pendientes.
  select coalesce(jsonb_agg(jsonb_build_object(
           'friendship_id', f.id, 'user_id', p.id, 'username', p.username
         ) order by f.created_at desc), '[]'::jsonb)
    into v_outgoing
    from friendships f join profiles p on p.id = f.addressee_id
   where f.status = 'pending' and f.requester_id = me;

  -- Invitaciones a jugar que me llegaron.
  select coalesce(jsonb_agg(jsonb_build_object(
           'invite_id', gi.id, 'from_id', gi.from_id, 'from_username', gi.from_username,
           'table_id', gi.table_id, 'bet', gi.bet, 'target_score', gi.target_score
         ) order by gi.created_at desc), '[]'::jsonb)
    into v_invites_in
    from game_invites gi
   where gi.to_id = me;

  -- Mi invitación activa (para mostrar "esperando a Fulano…").
  select jsonb_build_object(
           'invite_id', gi.id, 'to_id', gi.to_id, 'to_username', p.username,
           'table_id', gi.table_id, 'table_status', t.status
         )
    into v_invite_out
    from game_invites gi
    join profiles p on p.id = gi.to_id
    left join tables t on t.id = gi.table_id
   where gi.from_id = me;

  return jsonb_build_object(
    'friends', v_friends,
    'incoming', v_incoming,
    'outgoing', v_outgoing,
    'invites_in', v_invites_in,
    'invite_out', v_invite_out
  );
end;
$$;
