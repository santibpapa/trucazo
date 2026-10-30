-- ANDROID-17. Contrato de versiones; no modifica reglas ni premios de juego.
begin;
create schema app_compatibility;
revoke all on schema app_compatibility from public, anon, authenticated;

create table app_compatibility.policy (
  singleton boolean primary key default true check (singleton),
  minimum_code integer not null default 17 check (minimum_code >= 17),
  replacement_code integer,
  replacement_url text check (replacement_url ~ '^https://(www\.trucazo\.com\.ar/|play\.google\.com/store/apps/details\?id=ar\.com\.trucazo\.app$)'),
  replacement_available boolean not null default false,
  check (minimum_code = 17 or (replacement_available and replacement_code >= minimum_code and replacement_url is not null))
);
insert into app_compatibility.policy(singleton) values (true);

-- La versión se vincula a la sesión firmada por Auth. Omitir una cabecera
-- en una llamada directa no elimina ese vínculo. Auth limpia al cerrar sesión.
create table app_compatibility.sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version_code integer not null check (version_code >= 17)
);
alter table app_compatibility.policy enable row level security;
alter table app_compatibility.sessions enable row level security;
revoke all on all tables in schema app_compatibility from public, anon, authenticated;

create function app_compatibility.status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'compatible', s.version_code is null or s.version_code >= p.minimum_code,
    'versionCode', s.version_code, 'minimumCode', p.minimum_code,
    'updateUrl', case when p.replacement_available then p.replacement_url end,
    'contract', 'trucazo-online-v1', 'serverNow', floor(extract(epoch from statement_timestamp()) * 1000),
    'activeGameId', (select g.id from public.games g where g.status = 'playing'
      and auth.uid() in (g.player1_id, g.player2_id) order by g.updated_at desc limit 1),
    'activeTeamId', (select t.id from public.team_tables t join public.team_seats m on m.table_id = t.id
      where t.status = 'playing' and m.user_id = auth.uid() order by t.updated_at desc limit 1))
  from app_compatibility.policy p
  left join app_compatibility.sessions s
    on s.session_id = nullif(auth.jwt()->>'session_id', '')::uuid and s.user_id = auth.uid()
  where p.singleton;
$$;
revoke all on function app_compatibility.status() from public, anon, authenticated;

create function public.app_compatibility(p_version_code integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); sid uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if uid is null or sid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Entrá con tu cuenta.' using errcode = '42501';
  end if;
  if p_version_code is not null then
    if p_version_code < 17 then raise exception 'Versión inválida'; end if;
    insert into app_compatibility.sessions(session_id, user_id, version_code)
      values (sid, uid, p_version_code)
      on conflict (session_id) do update set version_code = greatest(app_compatibility.sessions.version_code, excluded.version_code)
      where app_compatibility.sessions.user_id = uid and app_compatibility.sessions.version_code < excluded.version_code;
  end if;
  return app_compatibility.status();
end;
$$;
revoke all on function public.app_compatibility(integer) from public, anon;
grant execute on function public.app_compatibility(integer) to authenticated;

-- Lecturas y las operaciones del contrato v1 que terminan una partida o
-- confirman una cola siguen disponibles. No se permite crear/join/revancha,
-- comprar ni comenzar campañas nuevas desde una versión retirada.
create function app_compatibility.check_request() returns void
language plpgsql security definer set search_path = '' as $$
declare path text := ltrim(coalesce(current_setting('request.path', true), ''), '/');
begin
  if auth.uid() is null or path = 'rpc/app_compatibility' then return; end if;
  if not exists (select 1 from app_compatibility.sessions s cross join app_compatibility.policy p
    where s.session_id = nullif(auth.jwt()->>'session_id', '')::uuid and s.user_id = auth.uid()
      and s.version_code < p.minimum_code) then return; end if;
  if current_setting('request.method', true) in ('GET', 'HEAD') and path not like 'rpc/%' then return; end if;
  if path = any(array[
    'rpc/start_game', 'rpc/play_card', 'rpc/sing_envido', 'rpc/respond_envido', 'rpc/envido_say',
    'rpc/sing_truco', 'rpc/respond_truco', 'rpc/irse_al_mazo', 'rpc/advance_hand',
    'rpc/timeout_mazo', 'rpc/bot_step', 'rpc/touch_presence', 'rpc/forfeit', 'rpc/cancel_table',
    'rpc/team_snapshot', 'rpc/team_action', 'rpc/team_presence', 'rpc/team_say', 'rpc/sync_offline_campaign',
    'rpc/active_medal_for', 'rpc/get_my_objectives', 'rpc/send_match_chat_message',
    'rpc/native_push_unbind', 'rpc/community_safety_state'
  ]) then return; end if;
  raise sqlstate 'PGRST' using
    message = jsonb_build_object('code', 'app_update_required', 'message', 'Actualizá Trucazo para empezar otra partida.',
      'details', 'Podés terminar tu partida y sincronizar Historia.', 'hint', app_compatibility.status()->>'updateUrl')::text,
    detail = '{"status":426}' ;
end;
$$;
revoke all on function app_compatibility.check_request() from public;
grant usage on schema app_compatibility to anon, authenticated;
grant execute on function app_compatibility.check_request() to anon, authenticated;

-- Preservar cualquier control previo: no sobrescribirlo sin revisión.
do $$
declare configured text;
begin
  select split_part(option, '=', 2) into configured from pg_roles r, unnest(r.rolconfig) option
    where r.rolname = 'authenticator' and option like 'pgrst.db_pre_request=%';
  if configured is not null and configured <> 'app_compatibility.check_request' then
    raise exception 'Ya existe un control previo: %. Integrarlo antes de aplicar.', configured;
  end if;
end;
$$;
alter role authenticator set pgrst.db_pre_request = 'app_compatibility.check_request';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
commit;
