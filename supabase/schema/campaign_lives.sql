-- Foto de referencia; la reconstrucción aplica la migración histórica.
-- Historia: tres vidas, recarga por reloj del servidor y ayuda gratuita.
begin;

create schema if not exists campaign_internal;
revoke all on schema campaign_internal from public, anon, authenticated;

-- El alta de la cuenta publicitaria es manual. No emitir tickets antes de activarla.
create table campaign_internal.ad_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  lives_enabled boolean not null default false
);
insert into campaign_internal.ad_settings default values;
alter table campaign_internal.ad_settings enable row level security;

create table campaign_internal.lives (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lives integer not null default 3 check (lives between 0 and 3),
  next_life_at timestamptz,
  depletion_id uuid,
  ad_ticket uuid,
  ad_episode uuid,
  ad_expires_at timestamptz,
  ad_claimed boolean not null default false,
  check ((lives = 3) = (next_life_at is null)),
  check ((lives = 0) = (depletion_id is not null))
);
create table campaign_internal.life_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  depletion_id uuid not null,
  expires_at timestamptz not null,
  granted_at timestamptz,
  unique (requester_id, depletion_id),
  check (requester_id <> friend_id)
);
create index on campaign_internal.life_requests(friend_id, expires_at) where granted_at is null;
alter table campaign_internal.lives enable row level security;
alter table campaign_internal.life_requests enable row level security;
revoke all on all tables in schema campaign_internal from public, anon, authenticated;

-- Siempre bloquea la fila: recarga, derrota, ayuda e inicio se serializan.
create function campaign_internal.refresh_lives(p_user uuid)
returns campaign_internal.lives language plpgsql security invoker set search_path = '' as $$
declare s campaign_internal.lives; n integer; t timestamptz := statement_timestamp();
begin
  insert into campaign_internal.lives(user_id) values(p_user) on conflict do nothing;
  select * into strict s from campaign_internal.lives where user_id = p_user for update;
  if s.next_life_at <= t then
    n := least(3 - s.lives, 1 + floor(extract(epoch from (t - s.next_life_at)) / 1800)::integer);
    update campaign_internal.lives set
      lives = lives + n,
      next_life_at = case when lives + n = 3 then null else next_life_at + n * interval '30 minutes' end,
      depletion_id = null
    where user_id = p_user returning * into s;
  end if;
  return s;
end;
$$;

create function campaign_internal.record_loss()
returns trigger language plpgsql security definer set search_path = '' as $$
declare loser uuid; s campaign_internal.lives;
begin
  if not (select lives_enabled from campaign_internal.ad_settings where singleton) then return new; end if;
  if new.campaign_rival_id is null or new.winner_id is null then return new; end if;
  loser := case when new.winner_id = new.player1_id then new.player2_id else new.player1_id end;
  if not exists(select 1 from public.profiles where id = loser and not is_bot) then return new; end if;
  s := campaign_internal.refresh_lives(loser);
  if s.lives > 0 then
    update campaign_internal.lives set lives = lives - 1,
      next_life_at = coalesce(next_life_at, statement_timestamp() + interval '30 minutes'),
      depletion_id = case when lives = 1 then gen_random_uuid() end
    where user_id = loser;
  end if;
  return new;
end;
$$;
create trigger campaign_life_loss after update of status on public.games
for each row when (old.status = 'playing' and new.status = 'finished')
execute function campaign_internal.record_loss();

create function public.get_campaign_lives()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s campaign_internal.lives;
  v_lives_enabled boolean := (select lives_enabled from campaign_internal.ad_settings where singleton);
begin
  if uid is null then raise exception 'no autenticado'; end if;
  s := campaign_internal.refresh_lives(uid);
  return jsonb_build_object(
    'lives_enabled', v_lives_enabled,
    'user_id', uid, 'lives', s.lives, 'next_life_at', s.next_life_at, 'server_now', statement_timestamp(),
    'ads_enabled', (select enabled and lives_enabled from campaign_internal.ad_settings where singleton),
    'active_game_id', (select id from public.games where campaign_rival_id is not null
      and status = 'playing' and uid in (player1_id, player2_id) order by created_at desc limit 1),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username)
      from public.friendships f join public.profiles p on p.id = case when f.requester_id = uid then f.addressee_id else f.requester_id end
      where f.status = 'accepted' and uid in (f.requester_id, f.addressee_id) and not p.is_bot), '[]'::jsonb),
    'request_out', case when v_lives_enabled then (select jsonb_build_object('username', p.username) from campaign_internal.life_requests r
      join public.profiles p on p.id = r.friend_id where r.requester_id = uid
      and r.depletion_id = s.depletion_id and r.granted_at is null and r.expires_at > statement_timestamp()) end,
    'requests_in', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'username', p.username))
      from campaign_internal.life_requests r join public.profiles p on p.id = r.requester_id
      join campaign_internal.lives l on l.user_id = r.requester_id and l.lives = 0 and l.depletion_id = r.depletion_id
      where v_lives_enabled and r.friend_id = uid and r.granted_at is null and r.expires_at > statement_timestamp()
      and exists(select 1 from public.friendships f where f.status = 'accepted'
        and ((f.requester_id = uid and f.addressee_id = r.requester_id)
          or (f.addressee_id = uid and f.requester_id = r.requester_id)))), '[]'::jsonb)
  );
end;
$$;

create function public.request_campaign_life(p_friend_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s campaign_internal.lives;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  s := campaign_internal.refresh_lives(uid);
  if not (select lives_enabled from campaign_internal.ad_settings where singleton) then raise exception 'las vidas están pausadas'; end if;
  if s.lives <> 0 then raise exception 'podés pedir una vida cuando te quedás sin vidas'; end if;
  if not exists(select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = uid and f.addressee_id = p_friend_id)
      or (f.addressee_id = uid and f.requester_id = p_friend_id))) then
    raise exception 'elegí a uno de tus amigos';
  end if;
  insert into campaign_internal.life_requests(requester_id, friend_id, depletion_id, expires_at)
    values(uid, p_friend_id, s.depletion_id, s.next_life_at) on conflict(requester_id, depletion_id) do nothing;
  return public.get_campaign_lives();
end;
$$;

create function public.send_campaign_life(p_request_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r campaign_internal.life_requests; s campaign_internal.lives;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if not (select lives_enabled from campaign_internal.ad_settings where singleton) then return 'expired'; end if;
  select * into r from campaign_internal.life_requests where id = p_request_id and friend_id = uid;
  if not found then raise exception 'pedido no disponible'; end if;
  s := campaign_internal.refresh_lives(r.requester_id);
  select * into r from campaign_internal.life_requests where id = p_request_id for update;
  if r.granted_at is not null then return 'already_sent'; end if;
  if r.expires_at <= statement_timestamp() or s.lives <> 0 or s.depletion_id is distinct from r.depletion_id then return 'expired'; end if;
  if not exists(select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = uid and f.addressee_id = r.requester_id)
      or (f.addressee_id = uid and f.requester_id = r.requester_id))) then return 'expired'; end if;
  update campaign_internal.lives set lives = 1, depletion_id = null where user_id = r.requester_id;
  update campaign_internal.life_requests set granted_at = statement_timestamp() where id = r.id;
  return 'sent';
end;
$$;

-- Google rewarded WEB informa la recompensa en el navegador: no tiene SSV.
-- El ticket ata la acreditación a cuenta/episodio, vence y sólo acredita una vez;
-- no constituye prueba criptográfica de haber visto el anuncio. Ver docs/juego.md.
create function public.begin_campaign_life_ad()
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s campaign_internal.lives;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if not (select enabled and lives_enabled from campaign_internal.ad_settings where singleton) then raise exception 'anuncios no habilitados'; end if;
  s := campaign_internal.refresh_lives(uid);
  if s.lives <> 0 then raise exception 'el anuncio está disponible al quedarte sin vidas'; end if;
  if s.ad_episode = s.depletion_id and not s.ad_claimed and s.ad_expires_at > statement_timestamp() then return s.ad_ticket; end if;
  update campaign_internal.lives set ad_ticket = gen_random_uuid(), ad_episode = depletion_id,
    ad_expires_at = statement_timestamp() + interval '15 minutes', ad_claimed = false
    where user_id = uid returning * into s;
  return s.ad_ticket;
end;
$$;

create function public.complete_campaign_life_ad(p_ticket uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s campaign_internal.lives;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  s := campaign_internal.refresh_lives(uid);
  if p_ticket is null or s.ad_ticket is distinct from p_ticket then raise exception 'anuncio no disponible'; end if;
  if s.ad_claimed then return public.get_campaign_lives(); end if;
  if s.ad_expires_at <= statement_timestamp() then raise exception 'el anuncio venció; probá de nuevo'; end if;
  -- Una vista completa conserva su recompensa aunque llegue ayuda o recarga
  -- durante el video. El ticket impide repetirla; el máximo sigue siendo tres.
  update campaign_internal.lives set
    lives = least(3, lives + 1),
    next_life_at = case when lives + 1 >= 3 then null else next_life_at end,
    depletion_id = null,
    ad_claimed = true where user_id = uid;
  return public.get_campaign_lives();
end;
$$;

revoke all on all functions in schema campaign_internal from public, anon, authenticated;
revoke all on function public.get_campaign_lives(), public.request_campaign_life(uuid),
  public.send_campaign_life(uuid), public.begin_campaign_life_ad(), public.complete_campaign_life_ad(uuid) from public, anon, authenticated;
grant execute on function public.get_campaign_lives() to authenticated;
grant execute on function public.request_campaign_life(uuid) to authenticated;
grant execute on function public.send_campaign_life(uuid) to authenticated;
grant execute on function public.begin_campaign_life_ad() to authenticated;
grant execute on function public.complete_campaign_life_ad(uuid) to authenticated;

create or replace function public.start_campaign_duel(p_rival_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid        uuid := auth.uid();
  r          campaign_rivals%rowtype;
  pv         campaign_provinces%rowtype;
  v_pts      integer;
  v_username text;
  v_id       uuid := gen_random_uuid();
  h1 jsonb; h2 jsonb;
  g  games%rowtype;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into r from campaign_rivals where id = p_rival_id;
  if not found then raise exception 'rival no encontrado'; end if;
  if r.province_id is null then raise exception 'rival sin provincia'; end if;

  select username, campaign_points into v_username, v_pts from profiles where id = uid;
  if v_username is null then raise exception 'perfil no encontrado'; end if;
  v_pts := coalesce(v_pts, 0);

  -- Un rival ya vencido siempre acepta la revancha; los candados de puntos
  -- valen solo para los que nunca venciste.
  if not exists (select 1 from campaign_progress where user_id = uid and rival_id = p_rival_id) then
    select * into pv from campaign_provinces where id = r.province_id;
    if v_pts < pv.points_required then raise exception 'todavía no desbloqueaste esta provincia'; end if;
    if pv.required_rival_id is not null and not exists (
      select 1 from campaign_progress
      where user_id = uid and rival_id = pv.required_rival_id
    ) then
      raise exception 'todavía no desbloqueaste esta provincia';
    end if;
    if v_pts < r.points_required then raise exception 'todavía no desbloqueaste este rival'; end if;
  end if;

  perform campaign_internal.refresh_lives(uid);
  -- No se descarta un duelo al pedir otro; también serializa inicios simultáneos.
  select * into g from games where campaign_rival_id is not null and status = 'playing'
    and uid in (player1_id, player2_id) order by created_at desc limit 1;
  if found then return g; end if;
  if (select lives_enabled from campaign_internal.ad_settings where singleton)
    and (select lives from campaign_internal.lives where user_id = uid) = 0 then
    raise exception 'CAMPAIGN_NO_LIVES' using errcode = 'P0001';
  end if;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into tables (id, name, creator_id, creator_username, opponent_id, opponent_username,
                      bet, is_private, status, target_score, time_limit)
  values (v_id, 'Modo historia', uid, v_username, r.bot_id, r.display_name,
          0, true, 'playing', r.target_score, 30);

  insert into games (id, player1_id, player2_id, player1_username, player2_username,
                     current_turn, mano_player, bet, target_score, time_limit, turn_started_at,
                     campaign_rival_id)
  values (v_id, uid, r.bot_id, v_username, r.display_name,
          uid, uid, 0, r.target_score, 30, now(), p_rival_id)
  returning * into g;

  insert into game_hands (game_id, player_id, cards) values
    (v_id, uid,      h1),
    (v_id, r.bot_id, h2);

  begin perform public._record_style(v_id, 'hand_played'); exception when others then null; end;
  return g;
end;
$function$;

commit;
