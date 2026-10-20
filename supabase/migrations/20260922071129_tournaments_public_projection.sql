-- Torneos PR 2: una cancelacion administrativa de un borrador no debe volverlo
-- visible para jugadores. Las funciones conservan el mismo contrato del PR 1;
-- solo se endurece la proyeccion publica.

begin;

-- Un borrador puede envejecer naturalmente, pero no nacer ni reprogramarse en
-- el pasado. El trigger cubre tambien llamadas directas que salteen la UI.
create function tournament_internal.validate_future_start()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at <= now() then
    raise exception 'La fecha de inicio debe ser futura';
  end if;
  return new;
end;
$$;

revoke execute on function tournament_internal.validate_future_start()
  from public, anon, authenticated;

create trigger tournaments_validate_future_start
  before insert or update of starts_at on public.tournaments
  for each row execute function tournament_internal.validate_future_start();

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
          where t.status = 'draft'
        ) draft_items
    ), '[]'::jsonb) else '[]'::jsonb end,
    'upcoming', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.status = 'published' and t.starts_at > now()
        ) upcoming_items
    ), '[]'::jsonb),
    'active', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz desc)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.status = 'running'
             or (t.status = 'published' and t.starts_at <= now())
        ) active_items
    ), '[]'::jsonb),
    'past', coalesce((
      select jsonb_agg(item order by (item->>'starts_at')::timestamptz desc)
        from (
          select (to_jsonb(t) - 'created_by' - 'updated_by') || jsonb_build_object(
            'active_players', tournament_internal.active_player_count(t.id, null)
          ) as item
          from public.tournaments t
          where t.status in ('completed', 'cancelled')
            and (v_is_admin or t.published_at is not null)
        ) past_items
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.tournament_detail(p_tournament_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_tournament public.tournaments;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesion';
  end if;
  v_is_admin := tournament_internal.is_admin(v_user_id);

  select * into v_tournament
    from public.tournaments t
   where t.id = p_tournament_id;
  if not found or (v_tournament.published_at is null and not v_is_admin) then
    raise exception 'Torneo no disponible';
  end if;

  v_result := jsonb_build_object(
    'tournament', to_jsonb(v_tournament) - 'created_by' - 'updated_by',
    'active_players', tournament_internal.active_player_count(v_tournament.id, null),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entry_id', e.id,
        'kind', e.kind,
        'status', e.status,
        'members', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'username', p.username,
            'avatar_url', p.avatar_url
          ) order by m.created_at), '[]'::jsonb)
          from public.tournament_entry_members m
          join public.profiles p on p.id = m.user_id
          where m.entry_id = e.id and m.status = 'accepted'
        ),
        'checked_in', exists(
          select 1 from public.tournament_checkins c where c.entry_id = e.id
        )
      ) order by e.priority_at, e.sequence_no)
      from public.tournament_entries e
      where e.tournament_id = v_tournament.id and e.status = 'active'
    ), '[]'::jsonb),
    'waitlist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entry_id', e.id,
        'kind', e.kind,
        'members', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'username', p.username,
            'avatar_url', p.avatar_url
          ) order by m.created_at), '[]'::jsonb)
          from public.tournament_entry_members m
          join public.profiles p on p.id = m.user_id
          where m.entry_id = e.id and m.status = 'accepted'
        )
      ) order by e.priority_at, e.sequence_no)
      from public.tournament_entries e
      where e.tournament_id = v_tournament.id and e.status = 'waitlisted'
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.group_number)
      from public.tournament_groups g where g.tournament_id = v_tournament.id
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.round_number, m.match_number)
      from public.tournament_matches m where m.tournament_id = v_tournament.id
    ), '[]'::jsonb)
  );

  if v_is_admin then
    v_result := v_result || jsonb_build_object(
      'admin_entries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'entry', to_jsonb(e),
          'members', (
            select coalesce(jsonb_agg(to_jsonb(member) order by member.created_at), '[]'::jsonb)
            from public.tournament_entry_members member where member.entry_id = e.id
          )
        ) order by e.priority_at, e.sequence_no)
        from public.tournament_entries e where e.tournament_id = v_tournament.id
      ), '[]'::jsonb)
    );
  end if;

  return v_result;
end;
$$;

commit;
