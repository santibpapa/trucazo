begin;

-- Claves opacas por mesa: no se publican en tables, team_tables ni Realtime.
create schema if not exists invite_internal;
revoke all on schema invite_internal from public, anon, authenticated;
create table invite_internal.links (
  token uuid primary key default gen_random_uuid(),
  table_id uuid unique references public.tables(id) on delete cascade,
  team_table_id uuid unique references public.team_tables(id) on delete cascade,
  constraint one_invited_table check (num_nonnulls(table_id, team_table_id) = 1)
);
alter table invite_internal.links enable row level security;
revoke all on invite_internal.links from public, anon, authenticated;

create function public.get_table_invite(p_table_id uuid, p_mode text default '1v1') returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result uuid;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if p_mode = '1v1' then
    if not exists (select 1 from public.tables t where t.id = p_table_id
      and t.creator_id = uid and t.status = 'waiting' and t.tournament_id is null) then
      raise exception 'Mesa no disponible';
    end if;
    insert into invite_internal.links(table_id) values (p_table_id) on conflict (table_id) do nothing;
    select token into result from invite_internal.links where table_id = p_table_id;
  elsif p_mode = '2v2' then
    if not exists (select 1 from public.team_tables t join public.team_seats s on s.table_id = t.id
      where t.id = p_table_id and s.user_id = uid and t.status = 'waiting' and t.tournament_id is null) then
      raise exception 'Mesa no disponible';
    end if;
    insert into invite_internal.links(team_table_id) values (p_table_id) on conflict (team_table_id) do nothing;
    select token into result from invite_internal.links where team_table_id = p_table_id;
  else
    raise exception 'Modalidad inválida';
  end if;
  return result;
end;
$$;

-- La clave habilita sólo esta vista previa. No devuelve IDs de jugadores, código
-- privado, cartas, saldo ni el ID de mesa a quien todavía no pertenece a ella.
create function public.preview_table_invite(p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare link invite_internal.links; t public.tables; tt public.team_tables;
  member boolean; occupied integer; destination text;
begin
  select * into link from invite_internal.links where token = p_token;
  if not found then return null; end if;
  if link.table_id is not null then
    select * into t from public.tables where id = link.table_id;
    if not found or t.status not in ('waiting', 'playing') or t.tournament_id is not null then return null; end if;
    member := coalesce(auth.uid() in (t.creator_id, t.opponent_id), false);
    destination := case when member then '/game/' || t.id end;
    return jsonb_build_object('mode', '1v1', 'name', t.name, 'creator_username', t.creator_username,
      'bet', t.bet, 'target_score', t.target_score, 'time_limit', t.time_limit,
      'occupied', case when t.opponent_id is null then 1 else 2 end, 'capacity', 2,
      'available', t.status = 'waiting' and t.opponent_id is null, 'destination', destination);
  end if;
  select * into tt from public.team_tables where id = link.team_table_id;
  if not found or tt.status not in ('waiting', 'playing') or tt.tournament_id is not null then return null; end if;
  member := exists (select 1 from public.team_seats where table_id = tt.id and user_id = auth.uid());
  select count(*) into occupied from public.team_seats where table_id = tt.id;
  destination := case when member then '/game/parejas/' || tt.id end;
  return jsonb_build_object('mode', '2v2', 'name', tt.name,
    'creator_username', (select username from public.profiles where id = tt.creator_id),
    'bet', tt.bet, 'target_score', tt.target_score, 'time_limit', tt.time_limit,
    'occupied', occupied, 'capacity', 4, 'available', tt.status = 'waiting' and occupied < 4,
    'destination', destination);
end;
$$;

-- Confirmación explícita. Los cobros y la elección de asiento siguen en las RPC
-- existentes. El bloqueo y la pertenencia hacen seguro reintentar aun sin respuesta.
create function public.join_table_invite(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); link invite_internal.links; t public.tables; tt public.team_tables;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  select * into link from invite_internal.links where token = p_token;
  if not found then raise exception 'Invitación no disponible'; end if;
  if link.table_id is not null then
    select * into t from public.tables where id = link.table_id for update;
    if not found or t.status not in ('waiting', 'playing') or t.tournament_id is not null then
      raise exception 'Invitación no disponible';
    end if;
    if uid in (t.creator_id, t.opponent_id) then return '/game/' || t.id; end if;
    if t.status <> 'waiting' or t.opponent_id is not null then raise exception 'Invitación no disponible'; end if;
    if t.is_private then perform public.join_table_by_code(t.private_code);
    else perform public.join_table(t.id); end if;
    return '/game/' || t.id;
  end if;
  -- Mismo orden de bloqueos que team_join: primero persona, después mesa.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into tt from public.team_tables where id = link.team_table_id for update;
  if not found or tt.status not in ('waiting', 'playing') or tt.tournament_id is not null then
    raise exception 'Invitación no disponible';
  end if;
  if exists (select 1 from public.team_seats where table_id = tt.id and user_id = uid) then
    return '/game/parejas/' || tt.id;
  end if;
  if tt.status <> 'waiting' then raise exception 'Invitación no disponible'; end if;
  if tt.is_private then perform public.team_join(gen_random_uuid(), null, tt.private_code);
  else perform public.team_join(gen_random_uuid(), tt.id); end if;
  return '/game/parejas/' || tt.id;
end;
$$;

revoke all on function public.get_table_invite(uuid, text) from public, anon, authenticated;
revoke all on function public.preview_table_invite(uuid) from public, anon, authenticated;
revoke all on function public.join_table_invite(uuid) from public, anon, authenticated;
grant execute on function public.get_table_invite(uuid, text) to authenticated;
grant execute on function public.preview_table_invite(uuid) to anon, authenticated;
grant execute on function public.join_table_invite(uuid) to authenticated;

commit;
