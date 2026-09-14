-- Mantenimiento 2vs2. No cambia reglas, plazos de partidas ni reemplaza personas.
begin;

create index team_seats_presence_idx on public.team_seats (table_id, last_seen_at)
  where user_id is not null;
create index team_tables_closed_updated_idx on public.team_tables (updated_at, id)
  where status in ('finished', 'cancelled');
create index team_requests_actions_table_idx on team_internal.requests (table_id)
  where payload->>'action' not in ('create', 'join');
alter table team_internal.requests enable row level security;

create or replace function public.team_presence(p_table_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  -- Mismo bloqueo que las acciones y el barrido: la presencia no puede quedar
  -- confirmada entre la última comprobación de ausencia y la cancelación.
  perform 1 from public.team_tables where id=p_table_id for update;
  update public.team_seats set last_seen_at=clock_timestamp()
    where table_id=p_table_id and user_id=auth.uid();
  if not found then raise exception 'No sos participante'; end if;
end;
$$;

create function team_internal.prune_requests() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  -- Crear/unirse puede cobrar: sus comprobantes se conservan indefinidamente.
  -- Las acciones de una mesa cerrada ya no pueden mutarla ni pagar otra vez.
  -- Lotes acotados para que el cron no haga una eliminación masiva de golpe.
  with expired as (
    select r.actor, r.request_id from team_internal.requests r
    join public.team_tables t on t.id=r.table_id
    where t.status in ('finished', 'cancelled')
      and t.updated_at<now()-interval '30 days'
      and r.payload->>'action' not in ('create', 'join')
    order by t.updated_at, t.id, r.actor, r.request_id
    limit 5000
    for update of r skip locked
  ), removed as (
    delete from team_internal.requests r using expired e
    where r.actor=e.actor and r.request_id=e.request_id returning 1
  ) select count(*) into n from removed;
  return n;
end;
$$;

create or replace function team_internal.sweep() returns integer
language plpgsql security definer set search_path = '' as $$
declare t record; n integer:=0; absence interval;
begin
  for t in select * from public.team_tables x where
    ((status='waiting' and created_at<now()-interval '15 minutes') or status='playing')
    and not exists(select 1 from public.team_seats s where s.table_id=x.id
      and s.user_id is not null and s.last_seen_at>=now()-
        case when x.status='waiting' then interval '15 minutes' else interval '10 minutes' end)
    for update skip locked
  loop
    absence:=case when t.status='waiting' then interval '15 minutes' else interval '10 minutes' end;
    -- Releer después de obtener el bloqueo: una presencia recién confirmada
    -- puede no estar en la instantánea que eligió los candidatos del barrido.
    if not exists(select 1 from public.team_seats s where s.table_id=t.id
      and s.user_id is not null and s.last_seen_at>=clock_timestamp()-absence) then
      perform team_internal.cancel(t.id); n:=n+1;
    end if;
  end loop;
  perform team_internal.prune_requests();
  return n;
end;
$$;

revoke all on function team_internal.prune_requests() from public, anon, authenticated;
revoke all on team_internal.requests from public, anon, authenticated;
-- CREATE OR REPLACE conserva los permisos anteriores de presence y sweep.

-- La actividad de parejas evita clasificar como inactivo a quien sí jugó.
-- No crea estadísticas, campañas ni envíos de email.
create or replace function public.email_recipient_activity(p_user_ids uuid[])
returns table (
  user_id uuid, username text, registered_at timestamptz, last_played_at timestamptz,
  news_enabled boolean, reengagement_enabled boolean, unsubscribe_token uuid
)
language sql stable security invoker set search_path = public, pg_temp as $$
  with played as (
    select h.player_id as user_id, h.created_at as played_at
    from public.game_history h where h.player_id=any(p_user_ids)
    union all
    select g.player1_id, g.updated_at from public.games g
    where g.status='finished' and g.player1_id=any(p_user_ids)
    union all
    select g.player2_id, g.updated_at from public.games g
    where g.status='finished' and g.player2_id=any(p_user_ids)
    union all
    select s.user_id, t.updated_at from public.team_seats s
    join public.team_tables t on t.id=s.table_id
    where t.status='finished' and s.user_id=any(p_user_ids)
  ), activity as (
    select played.user_id, max(played.played_at) as last_played_at
    from played group by played.user_id
  )
  select p.id, p.username, p.created_at, activity.last_played_at,
    ep.news_enabled, ep.reengagement_enabled, ep.unsubscribe_token
  from public.profiles p
  join public.email_preferences ep on ep.user_id=p.id
  left join activity on activity.user_id=p.id
  where p.id=any(p_user_ids) and not p.is_bot and not p.is_admin;
$$;
revoke execute on function public.email_recipient_activity(uuid[]) from public, anon, authenticated;
grant execute on function public.email_recipient_activity(uuid[]) to service_role;

commit;
