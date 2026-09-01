-- Las partidas del Modo Historia terminan en public.games, pero a propósito no
-- incrementan las estadísticas multijugador ni escriben public.game_history.
-- Los emails usaban sólo game_history y por eso trataban a esos jugadores como
-- si nunca hubieran jugado.
begin;

-- La función se llama por tandas de usuarios. Estos índices evitan recorrer
-- las tablas completas para encontrar su actividad más reciente.
create index if not exists games_finished_player1_updated_idx
  on public.games (player1_id, updated_at desc)
  where status = 'finished';

create index if not exists games_finished_player2_updated_idx
  on public.games (player2_id, updated_at desc)
  where status = 'finished';

create index if not exists game_history_player_created_idx
  on public.game_history (player_id, created_at desc);

create or replace function public.email_recipient_activity(p_user_ids uuid[])
returns table (
  user_id uuid,
  username text,
  registered_at timestamptz,
  last_played_at timestamptz,
  news_enabled boolean,
  reengagement_enabled boolean,
  unsubscribe_token uuid
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with played as (
    select h.player_id as user_id, h.created_at as played_at
    from public.game_history h
    where h.player_id = any(p_user_ids)

    union all

    select g.player1_id, g.updated_at
    from public.games g
    where g.status = 'finished'
      and g.player1_id = any(p_user_ids)

    union all

    select g.player2_id, g.updated_at
    from public.games g
    where g.status = 'finished'
      and g.player2_id = any(p_user_ids)
  ), activity as (
    select played.user_id, max(played.played_at) as last_played_at
    from played
    group by played.user_id
  )
  select
    p.id,
    p.username,
    p.created_at,
    activity.last_played_at,
    ep.news_enabled,
    ep.reengagement_enabled,
    ep.unsubscribe_token
  from public.profiles p
  join public.email_preferences ep on ep.user_id = p.id
  left join activity on activity.user_id = p.id
  where p.id = any(p_user_ids)
    and not p.is_bot
    and not p.is_admin;
$$;

revoke execute on function public.email_recipient_activity(uuid[])
  from anon, authenticated, public;
grant execute on function public.email_recipient_activity(uuid[]) to service_role;

-- Si quedó un intento equivocado todavía no enviado, no debe reintentarse.
update public.email_deliveries d
set
  status = 'skipped',
  last_error = 'Omitido: el usuario ya tenía partidas terminadas',
  updated_at = now()
where d.kind = 'never_played'
  and d.status in ('sending', 'failed')
  and exists (
    select 1
    from public.games g
    where g.status = 'finished'
      and (g.player1_id = d.user_id or g.player2_id = d.user_id)
  );

-- A quienes ya recibieron el texto equivocado no se les manda otro recordatorio
-- inmediatamente. El mail que salió ya los invitaba a jugar; la próxima etapa
-- quedará habilitada cuando vuelvan a jugar y cambie last_played_at.
with mistaken_sent as (
  select d.user_id, max(g.updated_at) as last_played_at
  from public.email_deliveries d
  join public.games g
    on g.status = 'finished'
   and (g.player1_id = d.user_id or g.player2_id = d.user_id)
  where d.kind = 'never_played'
    and d.status = 'sent'
  group by d.user_id
), protected_stage as (
  select
    mistaken_sent.user_id,
    campaign.id as campaign_id,
    'campaign:' || campaign.id::text || ':' || mistaken_sent.user_id::text || ':' ||
      to_char(
        mistaken_sent.last_played_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US'
      ) || '+00:00' as dedupe_key
  from mistaken_sent
  cross join public.reengagement_campaigns campaign
  where campaign.audience = 'inactive'
)
insert into public.email_deliveries (
  user_id, kind, campaign_id, dedupe_key, status, last_error
)
select
  protected_stage.user_id,
  'inactive',
  protected_stage.campaign_id,
  protected_stage.dedupe_key,
  'skipped',
  'Omitido: ya recibió un recordatorio mal clasificado en esta etapa'
from protected_stage
on conflict (dedupe_key) do nothing;

commit;
