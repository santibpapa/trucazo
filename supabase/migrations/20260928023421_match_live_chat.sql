-- Conversación escrita independiente del estado autoritativo de ambas mesas.
begin;

create table public.match_chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  team_table_id uuid references public.team_tables(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default clock_timestamp(),
  client_request_id uuid not null,
  constraint match_chat_one_table check ((game_id is null) <> (team_table_id is null)),
  unique (sender_id, client_request_id)
);
create index match_chat_game_recent on public.match_chat_messages(game_id, created_at desc, id desc) where game_id is not null;
create index match_chat_team_recent on public.match_chat_messages(team_table_id, created_at desc, id desc) where team_table_id is not null;
create index match_chat_sender_recent on public.match_chat_messages(sender_id, created_at desc);
create index match_chat_expiry on public.match_chat_messages(created_at);

alter table public.match_chat_messages enable row level security;
revoke all on public.match_chat_messages from public, anon, authenticated;
grant select on public.match_chat_messages to authenticated;
create policy match_chat_participants on public.match_chat_messages
  for select to authenticated using (
    created_at > now() - interval '72 hours'
    and (
      (game_id is not null and exists (
        select 1 from public.games g
        where g.id = game_id and auth.uid() in (g.player1_id, g.player2_id)
      ))
      or (team_table_id is not null and exists (
        select 1 from public.team_seats s
        where s.table_id = team_table_id and s.user_id = auth.uid() and s.seat is not null
      ))
    )
  );

create function public.send_match_chat_message(
  p_mode text, p_match_id uuid, p_body text, p_request_id uuid
) returns public.match_chat_messages
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_old public.match_chat_messages;
  v_row public.match_chat_messages;
  v_body text;
  v_now timestamptz;
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id = v_user and u.is_anonymous is false
  ) then raise exception 'Solo los usuarios registrados pueden escribir en el chat'; end if;
  select * into v_profile from public.profiles where id = v_user and not is_bot;
  if not found then raise exception 'Perfil no disponible'; end if;
  if p_mode not in ('game', 'team') or p_mode is null or p_match_id is null or p_request_id is null then
    raise exception 'Partida o solicitud inválida';
  end if;
  if p_mode = 'game' then
    if not exists (
      select 1 from public.games g join public.profiles rival
        on rival.id = case when g.player1_id = v_user then g.player2_id else g.player1_id end
      where g.id = p_match_id and v_user in (g.player1_id, g.player2_id)
        and g.campaign_rival_id is null and not rival.is_bot
    ) then raise exception 'Chat no disponible en esta partida'; end if;
  else
    if not exists (
      select 1 from public.team_tables t
      where t.id = p_match_id
        and exists (select 1 from public.team_seats s
                    where s.table_id=t.id and s.user_id=v_user and s.seat is not null)
        and (select count(*) from public.team_seats s
             where s.table_id=t.id and s.seat is not null and s.user_id is not null) >= 2
    ) then raise exception 'Chat no disponible en esta mesa'; end if;
  end if;
  v_body := regexp_replace(coalesce(p_body, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if char_length(v_body) < 1 or char_length(v_body) > 200 then
    raise exception 'Escribí un mensaje de hasta 200 caracteres';
  end if;

  -- El lock es solo del chat del autor; no toma la versión ni el reloj del juego.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('trucazo-match-chat'), pg_catalog.hashtext(v_user::text));
  select * into v_old from public.match_chat_messages
    where sender_id = v_user and client_request_id = p_request_id;
  if found then
    if v_old.body <> v_body or v_old.game_id is distinct from
       (case when p_mode='game' then p_match_id else null end)
       or v_old.team_table_id is distinct from
       (case when p_mode='team' then p_match_id else null end) then
      raise exception 'Esta solicitud ya se usó para otro mensaje';
    end if;
    return v_old;
  end if;
  if p_mode = 'game' then
    if not exists (select 1 from public.games where id=p_match_id and status='playing') then
      raise exception 'La partida ya no está en juego'; end if;
  else
    if not exists (select 1 from public.team_tables where id=p_match_id and status='playing') then
      raise exception 'La mesa ya no está en juego'; end if;
  end if;
  v_now := clock_timestamp();
  if exists (select 1 from public.match_chat_messages
             where sender_id=v_user and body=v_body and created_at > v_now - interval '10 seconds'
               and ((p_mode='game' and game_id=p_match_id) or (p_mode='team' and team_table_id=p_match_id))) then
    raise exception 'Ya enviaste ese mensaje';
  end if;
  if exists (select 1 from public.match_chat_messages
             where sender_id=v_user and created_at > v_now - interval '3 seconds') then
    raise exception 'Esperá 3 segundos antes de enviar otro mensaje';
  end if;
  insert into public.match_chat_messages(game_id,team_table_id,sender_id,sender_name,body,created_at,client_request_id)
    values (case when p_mode='game' then p_match_id end,
            case when p_mode='team' then p_match_id end,
            v_user,v_profile.username,v_body,v_now,p_request_id)
    returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.send_match_chat_message(text,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.send_match_chat_message(text,uuid,text,uuid) to authenticated;

do $$ begin
  if exists (select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_catalog.pg_publication_tables
                     where pubname='supabase_realtime' and schemaname='public' and tablename='match_chat_messages') then
    alter publication supabase_realtime add table public.match_chat_messages;
  end if;
end $$;

create schema if not exists match_chat_internal;
revoke all on schema match_chat_internal from public, anon, authenticated;
create function match_chat_internal.cleanup() returns void
language sql security definer set search_path = '' as $$
  delete from public.match_chat_messages where created_at < clock_timestamp() - interval '72 hours';
$$;
revoke all on function match_chat_internal.cleanup() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname='cron') then
    perform cron.schedule('trucazo-match-chat-cleanup', '0 * * * *',
                          'select match_chat_internal.cleanup()');
  end if;
end $$;
commit;
