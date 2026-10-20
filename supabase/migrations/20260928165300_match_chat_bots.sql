-- Habilita el chat escrito para personas en mesas con bots, sin respuestas escritas de bots.
begin;

-- Ningún mensaje de campaña se expone, incluso si una fila se insertara desde
-- un proceso interno ajeno a la RPC de jugadores.
alter policy match_chat_participants on public.match_chat_messages using (
  created_at > now() - interval '72 hours'
  and (
    (game_id is not null and exists (
      select 1 from public.games g
      where g.id = game_id and g.campaign_rival_id is null
        and auth.uid() in (g.player1_id, g.player2_id)
    ))
    or (team_table_id is not null and exists (
      select 1 from public.team_seats s
      where s.table_id = team_table_id and s.user_id = auth.uid() and s.seat is not null
    ))
  )
);

create or replace function public.send_match_chat_message(
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
    if not exists (select 1 from public.games g
                   where g.id = p_match_id and v_user in (g.player1_id, g.player2_id)
                     and g.campaign_rival_id is null) then
      raise exception 'Chat no disponible en esta partida'; end if;
  else
    if not exists (select 1 from public.team_seats s
                   where s.table_id = p_match_id and s.user_id = v_user and s.seat is not null) then
      raise exception 'Chat no disponible en esta mesa'; end if;
  end if;
  v_body := regexp_replace(coalesce(p_body, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if char_length(v_body) < 1 or char_length(v_body) > 200 then
    raise exception 'Escribí un mensaje de hasta 200 caracteres';
  end if;

  -- El lock es solo del autor; no toma la versión ni el reloj del juego.
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

commit;
