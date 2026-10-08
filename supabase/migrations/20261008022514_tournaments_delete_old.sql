-- Eliminación de torneos terminados desde administración. Borrado lógico:
-- conservar premios, monedas, partidas y auditoría; quitar de las proyecciones.
begin;

alter table public.tournaments add column deleted_at timestamptz;
alter table public.tournaments add constraint tournaments_deleted_terminal
  check (deleted_at is null or status in ('completed', 'cancelled'));

create function public.tournament_admin_delete(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
begin
  select * into v_tournament from public.tournaments
    where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;
  if v_tournament.status not in ('completed', 'cancelled') then
    raise exception 'Solo se pueden eliminar torneos finalizados o cancelados';
  end if;
  -- El bloqueo de fila serializa los clics concurrentes y los reintentos.
  if v_tournament.deleted_at is null then
    update public.tournaments set deleted_at = now(), updated_at = now(),
      updated_by = v_actor where id = p_tournament_id;
    update public.tournament_email_jobs set status = 'cancelled', updated_at = now()
      where tournament_id = p_tournament_id and status in ('pending', 'processing', 'failed');
    delete from public.tournament_notifications where tournament_id = p_tournament_id;
    perform tournament_internal.audit(p_tournament_id, v_actor, 'tournament_deleted');
  end if;
  return jsonb_build_object('status', 'deleted', 'tournament_id', p_tournament_id);
end;
$$;

revoke all on function public.tournament_admin_delete(uuid) from public, anon, authenticated;
grant execute on function public.tournament_admin_delete(uuid) to authenticated;

create or replace function public.tournament_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesion';
  end if;
  v_is_admin := tournament_internal.is_admin(v_user_id);

  return jsonb_build_object(
    'drafts', case when v_is_admin then coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.deleted_at is null and t.status = 'draft'
        ) draft_items
    ), '[]'::jsonb) else '[]'::jsonb end,
    'upcoming', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.deleted_at is null and t.status = 'published' and t.starts_at > now()
        ) upcoming_items
    ), '[]'::jsonb),
    'active', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz desc)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.deleted_at is null and (t.status = 'running'
             or (t.status = 'published' and t.starts_at <= now()))
        ) active_items
    ), '[]'::jsonb),
    'past', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz desc)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.deleted_at is null and t.status in ('completed', 'cancelled')
            and (v_is_admin or t.published_at is not null)
        ) past_items
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.tournament_detail(p_tournament_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  t public.tournaments;
begin
  if v_user_id is null then raise exception 'Necesitas iniciar sesion'; end if;
  v_is_admin := tournament_internal.is_admin(v_user_id);
  select * into t from public.tournaments where id = p_tournament_id and deleted_at is null;
  if not found or (t.published_at is null and not v_is_admin) then
    raise exception 'Torneo no disponible'; end if;
  return jsonb_build_object(
    'tournament', to_jsonb(t) - 'created_by' - 'updated_by',
    'active_players', tournament_internal.active_player_count(t.id, null),
    'participants', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'kind', e.kind, 'status', e.status,
      'checked_in', exists(select 1 from public.tournament_checkins c where c.entry_id = e.id),
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', mem.user_id, 'username', p.username, 'avatar_url', p.avatar_url)
        order by mem.created_at) from public.tournament_entry_members mem
        join public.profiles p on p.id = mem.user_id
        where mem.entry_id = e.id and mem.status = 'accepted'), '[]'::jsonb)
    ) order by e.priority_at, e.sequence_no) from public.tournament_entries e
      where e.tournament_id = t.id and e.status = 'active'), '[]'::jsonb),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'kind', e.kind,
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', mem.user_id, 'username', p.username, 'avatar_url', p.avatar_url)
        order by mem.created_at) from public.tournament_entry_members mem
        join public.profiles p on p.id = mem.user_id
        where mem.entry_id = e.id and mem.status = 'accepted'), '[]'::jsonb)
    ) order by e.priority_at, e.sequence_no) from public.tournament_entries e
      where e.tournament_id = t.id and e.status = 'waitlisted'), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(to_jsonb(g) order by g.group_number)
      from public.tournament_groups g where g.tournament_id = t.id), '[]'::jsonb),
    'group_members', coalesce((select jsonb_agg(to_jsonb(gm) || jsonb_build_object(
      'rank', array_position(tournament_internal.group_order(g.id), gm.entry_id))
      order by g.group_number, array_position(tournament_internal.group_order(g.id), gm.entry_id))
      from public.tournament_group_members gm join public.tournament_groups g on g.id = gm.group_id
      where gm.tournament_id = t.id), '[]'::jsonb),
    'competition_entries', coalesce((select jsonb_agg(jsonb_build_object(
      'entry_id', e.id, 'username', tournament_internal.current_name(e.id),
      'avatar_url', (select p.avatar_url from public.tournament_entry_members mem
        join public.profiles p on p.id=mem.user_id
        where mem.entry_id=e.id and mem.status='accepted'
        order by mem.accepted_at,mem.user_id limit 1),
      'status', e.status) order by e.sequence_no)
      from public.tournament_entries e where e.tournament_id=t.id
        and exists(select 1 from public.tournament_entry_members mem
          where mem.entry_id=e.id and mem.status='accepted')), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object(
      'side_a_username', coalesce(m.side_a_username,
        tournament_internal.current_name(m.side_a_entry_id)),
      'side_b_username', coalesce(m.side_b_username,
        tournament_internal.current_name(m.side_b_entry_id)))
      order by m.round_number, m.phase, m.match_number)
      from public.tournament_matches m where m.tournament_id = t.id), '[]'::jsonb),
    'admin_entries', case when v_is_admin then coalesce((
      select jsonb_agg(jsonb_build_object(
        'entry', to_jsonb(e), 'members', coalesce((
          select jsonb_agg(to_jsonb(mem) order by mem.created_at)
          from public.tournament_entry_members mem where mem.entry_id = e.id
        ), '[]'::jsonb)) order by e.priority_at, e.sequence_no)
      from public.tournament_entries e where e.tournament_id = t.id
    ), '[]'::jsonb) else null end
  );
end;
$$;

commit;
