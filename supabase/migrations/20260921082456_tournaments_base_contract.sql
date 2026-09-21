-- ============================================================
-- TRUCAZO — Torneos PR 1: base de datos, seguridad y contrato
--
-- Esta migracion fija el modelo y la API transaccional. No crea partidas,
-- sorteos, premios ni emails: esas capacidades siguen apagadas hasta sus PR.
-- ============================================================

begin;

create schema if not exists tournament_internal;
revoke all on schema tournament_internal from public, anon, authenticated;

-- ------------------------------------------------------------
-- 1. MODELO PRINCIPAL
-- ------------------------------------------------------------

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 3 and 80),
  description text not null default '' check (length(description) <= 2000),
  mode text not null check (mode in ('1v1', '2v2')),
  format text not null check (format in ('knockout', 'groups')),
  capacity smallint not null check (capacity in (4, 8, 16, 32)),
  target_score smallint not null check (target_score in (15, 30)),
  prize_first integer not null default 0 check (prize_first >= 0),
  prize_second integer not null default 0 check (prize_second >= 0),
  prize_third integer not null default 0 check (prize_third >= 0),
  starts_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'running', 'completed', 'cancelled')),
  published_at timestamptz,
  paused_at timestamptz,
  roster_frozen_at timestamptz,
  schedule_version integer not null default 1 check (schedule_version >= 1),
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_valid_structure check (
    (mode = '1v1' and format = 'knockout' and capacity in (4, 8, 16, 32))
    or (mode = '1v1' and format = 'groups' and capacity in (8, 16, 32))
    or (mode = '2v2' and format = 'knockout' and capacity in (8, 16, 32))
    or (mode = '2v2' and format = 'groups' and capacity in (16, 32))
  ),
  constraint tournaments_cancelled_fields check (
    (status = 'cancelled') = (cancelled_at is not null)
  )
);

create index tournaments_status_starts_idx
  on public.tournaments(status, starts_at);
create index tournaments_created_by_idx
  on public.tournaments(created_by);
create index tournaments_updated_by_idx
  on public.tournaments(updated_by);

create table public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  status text not null check (
    status in ('active', 'waitlisted', 'eliminated', 'disqualified', 'withdrawn', 'replaced')
  ),
  kind text not null default 'solo' check (kind in ('solo', 'team')),
  sequence_no bigint generated always as identity,
  priority_at timestamptz not null default now(),
  draw_seed uuid not null default gen_random_uuid(),
  replaced_entry_id uuid references public.tournament_entries(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tournament_id),
  check (replaced_entry_id is null or status = 'replaced')
);

create index tournament_entries_tournament_status_priority_idx
  on public.tournament_entries(tournament_id, status, priority_at, sequence_no);
create index tournament_entries_replaced_entry_idx
  on public.tournament_entries(replaced_entry_id)
  where replaced_entry_id is not null;
create index tournament_entries_created_by_idx
  on public.tournament_entries(created_by);

create table public.tournament_entry_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_id uuid not null,
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('captain', 'invitee', 'assigned', 'replacement')),
  status text not null check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'replaced')),
  invited_by uuid references public.profiles(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  withdrawn_at timestamptz,
  replaced_at timestamptz,
  replaced_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id) on delete cascade,
  unique (entry_id, user_id),
  check (status <> 'pending' or (role = 'invitee' and invited_by is not null and invited_at is not null)),
  check (status <> 'accepted' or accepted_at is not null),
  check (status <> 'rejected' or rejected_at is not null),
  check (status <> 'withdrawn' or withdrawn_at is not null),
  check (status <> 'replaced' or replaced_at is not null)
);

create unique index tournament_member_one_live_membership_idx
  on public.tournament_entry_members(tournament_id, user_id)
  where status in ('pending', 'accepted');
create unique index tournament_member_one_captain_idx
  on public.tournament_entry_members(entry_id)
  where role = 'captain' and status = 'accepted';
create unique index tournament_member_one_pending_invite_idx
  on public.tournament_entry_members(entry_id)
  where status = 'pending';
create index tournament_members_entry_status_idx
  on public.tournament_entry_members(entry_id, status);
create index tournament_members_user_status_idx
  on public.tournament_entry_members(user_id, status);
create index tournament_members_invited_by_idx
  on public.tournament_entry_members(invited_by)
  where invited_by is not null;
create index tournament_members_replaced_by_idx
  on public.tournament_entry_members(replaced_by)
  where replaced_by is not null;

create table public.tournament_checkins (
  entry_id uuid primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  foreign key (entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id) on delete cascade
);

create index tournament_checkins_tournament_idx
  on public.tournament_checkins(tournament_id, confirmed_at);
create index tournament_checkins_confirmed_by_idx
  on public.tournament_checkins(confirmed_by);

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_number smallint not null check (group_number > 0),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed')),
  draw_seed uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (id, tournament_id),
  unique (tournament_id, group_number)
);

create table public.tournament_group_members (
  group_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_id uuid not null,
  position smallint not null check (position between 1 and 4),
  wins smallint not null default 0 check (wins >= 0),
  losses smallint not null default 0 check (losses >= 0),
  points_for integer not null default 0 check (points_for >= 0),
  points_against integer not null default 0 check (points_against >= 0),
  tie_break_seed uuid not null default gen_random_uuid(),
  primary key (group_id, entry_id),
  foreign key (group_id, tournament_id)
    references public.tournament_groups(id, tournament_id) on delete cascade,
  foreign key (entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id) on delete cascade,
  unique (group_id, position),
  unique (tournament_id, entry_id)
);

create index tournament_group_members_entry_idx
  on public.tournament_group_members(entry_id);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid,
  phase text not null check (
    phase in ('group', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final')
  ),
  round_number smallint not null check (round_number > 0),
  match_number smallint not null check (match_number > 0),
  side_a_entry_id uuid,
  side_b_entry_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'playing', 'finished', 'forfeit', 'cancelled')),
  ready_at timestamptz,
  entry_deadline timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  game_id uuid references public.games(id),
  team_game_id uuid references public.team_games(id),
  winner_entry_id uuid,
  loser_entry_id uuid,
  score_a integer check (score_a is null or score_a >= 0),
  score_b integer check (score_b is null or score_b >= 0),
  finish_reason text check (finish_reason is null or length(finish_reason) <= 200),
  result_applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (group_id, tournament_id)
    references public.tournament_groups(id, tournament_id),
  foreign key (side_a_entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id),
  foreign key (side_b_entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id),
  foreign key (winner_entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id),
  foreign key (loser_entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id),
  unique (id, tournament_id),
  check ((phase = 'group') = (group_id is not null)),
  check (side_a_entry_id is null or side_b_entry_id is null or side_a_entry_id <> side_b_entry_id),
  check (game_id is null or team_game_id is null),
  check (
    winner_entry_id is null
    or (side_a_entry_id is not null and winner_entry_id = side_a_entry_id)
    or (side_b_entry_id is not null and winner_entry_id = side_b_entry_id)
  ),
  check (
    loser_entry_id is null
    or (side_a_entry_id is not null and loser_entry_id = side_a_entry_id)
    or (side_b_entry_id is not null and loser_entry_id = side_b_entry_id)
  ),
  check (winner_entry_id is null or loser_entry_id is null or winner_entry_id <> loser_entry_id)
);

create index tournament_matches_tournament_status_idx
  on public.tournament_matches(tournament_id, status, phase, round_number);
create unique index tournament_matches_elimination_slot_idx
  on public.tournament_matches(tournament_id, phase, round_number, match_number)
  where group_id is null;
create unique index tournament_matches_group_slot_idx
  on public.tournament_matches(group_id, round_number, match_number)
  where group_id is not null;
create index tournament_matches_group_idx
  on public.tournament_matches(group_id)
  where group_id is not null;
create index tournament_matches_side_a_idx
  on public.tournament_matches(side_a_entry_id)
  where side_a_entry_id is not null;
create index tournament_matches_side_b_idx
  on public.tournament_matches(side_b_entry_id)
  where side_b_entry_id is not null;
create unique index tournament_matches_game_idx
  on public.tournament_matches(game_id)
  where game_id is not null;
create unique index tournament_matches_team_game_idx
  on public.tournament_matches(team_game_id)
  where team_game_id is not null;

create table public.tournament_match_presence (
  match_id uuid not null,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_id uuid not null,
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id),
  foreign key (match_id, tournament_id)
    references public.tournament_matches(id, tournament_id) on delete cascade,
  foreign key (entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id)
);

create index tournament_match_presence_entry_idx
  on public.tournament_match_presence(entry_id);
create index tournament_match_presence_user_idx
  on public.tournament_match_presence(user_id, joined_at);

create table public.tournament_awards (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_id uuid not null,
  user_id uuid not null references public.profiles(id),
  placement smallint not null check (placement between 1 and 3),
  coins integer not null check (coins >= 0),
  medal_slug text not null,
  dedupe_key text not null unique,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (entry_id, tournament_id)
    references public.tournament_entries(id, tournament_id),
  unique (tournament_id, user_id, placement)
);

create index tournament_awards_entry_idx
  on public.tournament_awards(entry_id);
create index tournament_awards_user_idx
  on public.tournament_awards(user_id, created_at desc);

create table public.tournament_notifications (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index tournament_notifications_user_unread_idx
  on public.tournament_notifications(user_id, created_at desc)
  where read_at is null;
create index tournament_notifications_tournament_idx
  on public.tournament_notifications(tournament_id);

create table public.tournament_email_jobs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  job_type text not null,
  audience jsonb,
  due_at timestamptz not null,
  schedule_version integer not null check (schedule_version >= 1),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts smallint not null default 0 check (attempts >= 0),
  dedupe_key text not null unique,
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or audience is not null)
);

create index tournament_email_jobs_due_idx
  on public.tournament_email_jobs(status, due_at)
  where status in ('pending', 'failed');
create index tournament_email_jobs_tournament_idx
  on public.tournament_email_jobs(tournament_id, schedule_version);
create index tournament_email_jobs_user_idx
  on public.tournament_email_jobs(user_id)
  where user_id is not null;

-- ------------------------------------------------------------
-- 2. DATOS INTERNOS, AUDITORIA E IDEMPOTENCIA
-- ------------------------------------------------------------

create table tournament_internal.audit_log (
  id bigint generated always as identity primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  entry_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tournament_audit_tournament_idx
  on tournament_internal.audit_log(tournament_id, created_at desc);
create index tournament_audit_actor_idx
  on tournament_internal.audit_log(actor_id, created_at desc);

create table tournament_internal.mutation_requests (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  action text not null,
  payload jsonb not null,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  entry_id uuid,
  created_at timestamptz not null default now(),
  primary key (actor_id, request_id)
);

create index tournament_requests_tournament_idx
  on tournament_internal.mutation_requests(tournament_id)
  where tournament_id is not null;

alter table tournament_internal.audit_log enable row level security;
alter table tournament_internal.mutation_requests enable row level security;
revoke all on all tables in schema tournament_internal from public, anon, authenticated;
revoke all on all sequences in schema tournament_internal from public, anon, authenticated;

-- Todas las tablas expuestas quedan cerradas. La lectura y las mutaciones pasan
-- exclusivamente por las RPC de abajo, que devuelven proyecciones controladas.
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_entry_members enable row level security;
alter table public.tournament_checkins enable row level security;
alter table public.tournament_groups enable row level security;
alter table public.tournament_group_members enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_match_presence enable row level security;
alter table public.tournament_awards enable row level security;
alter table public.tournament_notifications enable row level security;
alter table public.tournament_email_jobs enable row level security;

revoke all on public.tournaments,
  public.tournament_entries,
  public.tournament_entry_members,
  public.tournament_checkins,
  public.tournament_groups,
  public.tournament_group_members,
  public.tournament_matches,
  public.tournament_match_presence,
  public.tournament_awards,
  public.tournament_notifications,
  public.tournament_email_jobs
from public, anon, authenticated;

revoke all on sequence public.tournament_entries_sequence_no_seq
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. HELPERS PRIVADOS
-- ------------------------------------------------------------

create function tournament_internal.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.is_admin from public.profiles p where p.id = p_user_id
  ), false);
$$;

create function tournament_internal.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not tournament_internal.is_admin(v_user_id) then
    raise exception 'Solo un administrador puede realizar esta accion';
  end if;
  return v_user_id;
end;
$$;

create function tournament_internal.is_eligible_participant(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = p_user_id
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
       and u.email_confirmed_at is not null
       and u.email is not null
       and lower(split_part(u.email, '@', 2)) not in ('example.com', 'example.net', 'example.org', 'test.com', 'trucazo.bot')
       and lower(split_part(u.email, '@', 2)) !~ '([.]example[.](com|net|org)|[.](invalid|localhost|test))$'
  );
$$;

create function tournament_internal.require_participant()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesion';
  end if;
  if not tournament_internal.is_eligible_participant(v_user_id) then
    raise exception 'Esta cuenta no puede participar en torneos';
  end if;
  return v_user_id;
end;
$$;

create function tournament_internal.audit(
  p_tournament_id uuid,
  p_actor_id uuid,
  p_action text,
  p_entry_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into tournament_internal.audit_log(
    tournament_id, actor_id, action, entry_id, details
  ) values (
    p_tournament_id, p_actor_id, p_action, p_entry_id, coalesce(p_details, '{}'::jsonb)
  );
$$;

create function tournament_internal.active_player_count(
  p_tournament_id uuid,
  p_excluded_entry_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.tournament_entry_members m
    join public.tournament_entries e on e.id = m.entry_id
   where e.tournament_id = p_tournament_id
     and e.status = 'active'
     and m.status = 'accepted'
     and (p_excluded_entry_id is null or e.id <> p_excluded_entry_id);
$$;

create function tournament_internal.entry_snapshot(p_tournament_id uuid, p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'entry', to_jsonb(e),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', member.user_id,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'role', member.role,
        'status', member.status,
        'invited_at', member.invited_at,
        'accepted_at', member.accepted_at
      ) order by member.created_at)
      from public.tournament_entry_members member
      join public.profiles p on p.id = member.user_id
      where member.entry_id = e.id
        and member.status in ('pending', 'accepted')
    ), '[]'::jsonb),
    'checkin', (
      select to_jsonb(c) from public.tournament_checkins c where c.entry_id = e.id
    )
  )
  from public.tournament_entries e
  join public.tournament_entry_members mine on mine.entry_id = e.id
  where e.tournament_id = p_tournament_id
    and mine.user_id = p_user_id
    and mine.status in ('pending', 'accepted')
  order by mine.created_at desc
  limit 1;
$$;

create function tournament_internal.admin_snapshot(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(t) || jsonb_build_object(
    'active_players', tournament_internal.active_player_count(t.id, null),
    'waitlisted_players', (
      select count(*)::integer
        from public.tournament_entry_members m
        join public.tournament_entries e on e.id = m.entry_id
       where e.tournament_id = t.id
         and e.status = 'waitlisted'
         and m.status = 'accepted'
    )
  )
  from public.tournaments t
  where t.id = p_tournament_id;
$$;

create function tournament_internal.store_request(
  p_actor_id uuid,
  p_request_id uuid,
  p_action text,
  p_payload jsonb,
  p_tournament_id uuid,
  p_entry_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing tournament_internal.mutation_requests;
begin
  if p_request_id is null then
    raise exception 'La solicitud necesita un identificador';
  end if;

  select * into v_existing
    from tournament_internal.mutation_requests r
   where r.actor_id = p_actor_id and r.request_id = p_request_id;

  if found then
    if v_existing.action <> p_action or v_existing.payload <> p_payload then
      raise exception 'Ese identificador de solicitud ya fue usado para otra accion';
    end if;
    return;
  end if;

  insert into tournament_internal.mutation_requests(
    actor_id, request_id, action, payload, tournament_id, entry_id
  ) values (
    p_actor_id, p_request_id, p_action, p_payload, p_tournament_id, p_entry_id
  );
end;
$$;

create function tournament_internal.request_result(
  p_actor_id uuid,
  p_request_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_existing tournament_internal.mutation_requests;
begin
  if p_request_id is null then
    raise exception 'La solicitud necesita un identificador';
  end if;

  select * into v_existing
    from tournament_internal.mutation_requests r
   where r.actor_id = p_actor_id and r.request_id = p_request_id;

  if not found then
    return null;
  end if;
  if v_existing.action <> p_action or v_existing.payload <> p_payload then
    raise exception 'Ese identificador de solicitud ya fue usado para otra accion';
  end if;

  return jsonb_build_object(
    'tournament_id', v_existing.tournament_id,
    'entry_id', v_existing.entry_id
  );
end;
$$;

-- ------------------------------------------------------------
-- 4. LECTURAS SEGURAS
-- ------------------------------------------------------------

create function public.tournament_list()
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
        ) past_items
    ), '[]'::jsonb)
  );
end;
$$;

create function public.tournament_detail(p_tournament_id uuid)
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
  if not found or (v_tournament.status = 'draft' and not v_is_admin) then
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

create function public.tournament_my_entry(p_tournament_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Necesitas iniciar sesion';
  end if;
  return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
end;
$$;

-- ------------------------------------------------------------
-- 5. ADMINISTRACION TRANSACCIONAL
-- ------------------------------------------------------------

create function public.tournament_admin_create(
  p_request_id uuid,
  p_name text,
  p_description text,
  p_mode text,
  p_format text,
  p_capacity integer,
  p_target_score integer,
  p_prize_first integer,
  p_prize_second integer,
  p_prize_third integer,
  p_starts_at timestamptz,
  p_publish boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
  v_payload jsonb;
  v_previous jsonb;
begin
  if p_request_id is null or p_publish is null then
    raise exception 'Solicitud invalida';
  end if;

  v_payload := jsonb_build_object(
    'name', btrim(p_name), 'description', coalesce(p_description, ''),
    'mode', p_mode, 'format', p_format, 'capacity', p_capacity,
    'target_score', p_target_score, 'prize_first', p_prize_first,
    'prize_second', p_prize_second, 'prize_third', p_prize_third,
    'starts_at', p_starts_at, 'publish', p_publish
  );

  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 7201));
  v_previous := tournament_internal.request_result(
    v_actor, p_request_id, 'admin_create', v_payload
  );
  if v_previous is not null then
    return tournament_internal.admin_snapshot((v_previous->>'tournament_id')::uuid);
  end if;

  if p_publish and p_starts_at <= now() then
    raise exception 'La fecha de inicio debe ser futura';
  end if;

  insert into public.tournaments(
    name, description, mode, format, capacity, target_score,
    prize_first, prize_second, prize_third, starts_at,
    status, published_at, created_by, updated_by
  ) values (
    btrim(p_name), coalesce(p_description, ''), p_mode, p_format, p_capacity, p_target_score,
    p_prize_first, p_prize_second, p_prize_third, p_starts_at,
    case when p_publish then 'published' else 'draft' end,
    case when p_publish then now() else null end,
    v_actor, v_actor
  ) returning * into v_tournament;

  perform tournament_internal.store_request(
    v_actor, p_request_id, 'admin_create', v_payload, v_tournament.id, null
  );
  perform tournament_internal.audit(
    v_tournament.id, v_actor,
    case when p_publish then 'tournament_created_and_published' else 'tournament_created' end,
    null, v_payload
  );

  return tournament_internal.admin_snapshot(v_tournament.id);
end;
$$;

create function public.tournament_admin_update(
  p_request_id uuid,
  p_tournament_id uuid,
  p_name text,
  p_description text,
  p_mode text,
  p_format text,
  p_capacity integer,
  p_target_score integer,
  p_prize_first integer,
  p_prize_second integer,
  p_prize_third integer,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
  v_payload jsonb;
  v_previous jsonb;
begin
  v_payload := jsonb_build_object(
    'tournament_id', p_tournament_id, 'name', btrim(p_name),
    'description', coalesce(p_description, ''), 'mode', p_mode,
    'format', p_format, 'capacity', p_capacity, 'target_score', p_target_score,
    'prize_first', p_prize_first, 'prize_second', p_prize_second,
    'prize_third', p_prize_third, 'starts_at', p_starts_at
  );
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 7201));
  v_previous := tournament_internal.request_result(
    v_actor, p_request_id, 'admin_update', v_payload
  );
  if v_previous is not null then
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;
  if v_tournament.status <> 'draft' then
    raise exception 'La estructura solo se puede editar mientras el torneo es borrador';
  end if;

  update public.tournaments
     set name = btrim(p_name),
         description = coalesce(p_description, ''),
         mode = p_mode,
         format = p_format,
         capacity = p_capacity,
         target_score = p_target_score,
         prize_first = p_prize_first,
         prize_second = p_prize_second,
         prize_third = p_prize_third,
         starts_at = p_starts_at,
         updated_by = v_actor,
         updated_at = now()
   where id = p_tournament_id;

  perform tournament_internal.store_request(
    v_actor, p_request_id, 'admin_update', v_payload, p_tournament_id, null
  );
  perform tournament_internal.audit(
    p_tournament_id, v_actor, 'tournament_updated', null, v_payload
  );
  return tournament_internal.admin_snapshot(p_tournament_id);
end;
$$;

create function public.tournament_admin_publish(
  p_request_id uuid,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
  v_payload jsonb := jsonb_build_object('tournament_id', p_tournament_id);
  v_previous jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 7201));
  v_previous := tournament_internal.request_result(
    v_actor, p_request_id, 'admin_publish', v_payload
  );
  if v_previous is not null then
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;
  if v_tournament.status = 'published' then
    perform tournament_internal.store_request(
      v_actor, p_request_id, 'admin_publish', v_payload, p_tournament_id, null
    );
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;
  if v_tournament.status <> 'draft' then
    raise exception 'Este torneo no se puede publicar';
  end if;
  if v_tournament.starts_at <= now() then
    raise exception 'La fecha de inicio debe ser futura';
  end if;

  update public.tournaments
     set status = 'published', published_at = now(), updated_by = v_actor, updated_at = now()
   where id = p_tournament_id;
  perform tournament_internal.store_request(
    v_actor, p_request_id, 'admin_publish', v_payload, p_tournament_id, null
  );
  perform tournament_internal.audit(p_tournament_id, v_actor, 'tournament_published');
  return tournament_internal.admin_snapshot(p_tournament_id);
end;
$$;

create function public.tournament_admin_reschedule(
  p_request_id uuid,
  p_tournament_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
  v_payload jsonb := jsonb_build_object(
    'tournament_id', p_tournament_id, 'starts_at', p_starts_at
  );
  v_previous jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 7201));
  v_previous := tournament_internal.request_result(
    v_actor, p_request_id, 'admin_reschedule', v_payload
  );
  if v_previous is not null then
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'La fecha de inicio debe ser futura';
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;
  if v_tournament.status not in ('draft', 'published') then
    raise exception 'Este torneo ya no se puede reprogramar';
  end if;

  update public.tournaments
     set starts_at = p_starts_at,
         schedule_version = schedule_version + 1,
         updated_by = v_actor,
         updated_at = now()
   where id = p_tournament_id;
  perform tournament_internal.store_request(
    v_actor, p_request_id, 'admin_reschedule', v_payload, p_tournament_id, null
  );
  perform tournament_internal.audit(
    p_tournament_id, v_actor, 'tournament_rescheduled', null,
    jsonb_build_object('from', v_tournament.starts_at, 'to', p_starts_at)
  );
  return tournament_internal.admin_snapshot(p_tournament_id);
end;
$$;

create function public.tournament_admin_cancel(
  p_request_id uuid,
  p_tournament_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := tournament_internal.require_admin();
  v_tournament public.tournaments;
  v_payload jsonb := jsonb_build_object(
    'tournament_id', p_tournament_id, 'reason', btrim(p_reason)
  );
  v_previous jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 7201));
  v_previous := tournament_internal.request_result(
    v_actor, p_request_id, 'admin_cancel', v_payload
  );
  if v_previous is not null then
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;
  if v_tournament.status = 'completed' then
    raise exception 'Un torneo terminado no se puede cancelar';
  end if;
  if v_tournament.status = 'cancelled' then
    perform tournament_internal.store_request(
      v_actor, p_request_id, 'admin_cancel', v_payload, p_tournament_id, null
    );
    return tournament_internal.admin_snapshot(p_tournament_id);
  end if;

  update public.tournaments
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = nullif(btrim(p_reason), ''),
         updated_by = v_actor,
         updated_at = now()
   where id = p_tournament_id;
  perform tournament_internal.store_request(
    v_actor, p_request_id, 'admin_cancel', v_payload, p_tournament_id, null
  );
  perform tournament_internal.audit(
    p_tournament_id, v_actor, 'tournament_cancelled', null,
    jsonb_build_object('reason', nullif(btrim(p_reason), ''))
  );
  return tournament_internal.admin_snapshot(p_tournament_id);
end;
$$;

-- ------------------------------------------------------------
-- 6. INSCRIPCION, PAREJAS, RETIRO Y CHECK-IN
-- ------------------------------------------------------------

create function public.tournament_register_solo(
  p_request_id uuid,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := tournament_internal.require_participant();
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_entry_status text;
  v_payload jsonb := jsonb_build_object('tournament_id', p_tournament_id);
  v_previous jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7202));
  v_previous := tournament_internal.request_result(
    v_user_id, p_request_id, 'register_solo', v_payload
  );
  if v_previous is not null then
    return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found or v_tournament.status <> 'published' then
    raise exception 'La inscripcion no esta abierta';
  end if;
  if v_tournament.roster_frozen_at is not null or now() >= v_tournament.starts_at then
    raise exception 'La inscripcion ya cerro';
  end if;

  if exists (
    select 1 from public.tournament_entry_members m
    where m.tournament_id = p_tournament_id
      and m.user_id = v_user_id
      and m.status = 'pending'
  ) then
    raise exception 'Ya tenes una invitacion pendiente en este torneo';
  end if;

  select e.* into v_entry
    from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id
   where e.tournament_id = p_tournament_id
     and m.user_id = v_user_id
     and m.status = 'accepted'
     and e.status in ('active', 'waitlisted')
   order by e.created_at desc
   limit 1;

  if found then
    perform tournament_internal.store_request(
      v_user_id, p_request_id, 'register_solo', v_payload,
      p_tournament_id, v_entry.id
    );
    return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
  end if;

  v_entry_status := case
    when tournament_internal.active_player_count(p_tournament_id, null) < v_tournament.capacity
      then 'active'
    else 'waitlisted'
  end;

  insert into public.tournament_entries(
    tournament_id, status, kind, created_by
  ) values (
    p_tournament_id, v_entry_status, 'solo', v_user_id
  ) returning * into v_entry;

  insert into public.tournament_entry_members(
    tournament_id, entry_id, user_id, role, status, accepted_at
  ) values (
    p_tournament_id, v_entry.id, v_user_id, 'captain', 'accepted', now()
  );

  -- Quien se anota durante la ventana de check-in confirma en el mismo acto.
  if v_entry_status = 'active'
     and now() >= v_tournament.starts_at - interval '30 minutes' then
    insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
    values (v_entry.id, p_tournament_id, v_user_id)
    on conflict (entry_id) do nothing;
  end if;

  perform tournament_internal.store_request(
    v_user_id, p_request_id, 'register_solo', v_payload,
    p_tournament_id, v_entry.id
  );
  perform tournament_internal.audit(
    p_tournament_id, v_user_id, 'entry_registered', v_entry.id,
    jsonb_build_object('status', v_entry_status, 'kind', 'solo')
  );
  return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
end;
$$;

create function public.tournament_invite_partner(
  p_request_id uuid,
  p_tournament_id uuid,
  p_partner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := tournament_internal.require_participant();
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_entry_status text;
  v_payload jsonb := jsonb_build_object(
    'tournament_id', p_tournament_id, 'partner_id', p_partner_id
  );
  v_previous jsonb;
begin
  if p_partner_id is null or p_partner_id = v_user_id then
    raise exception 'Elegi otro jugador como companero';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7202));
  v_previous := tournament_internal.request_result(
    v_user_id, p_request_id, 'invite_partner', v_payload
  );
  if v_previous is not null then
    return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found or v_tournament.status <> 'published' or v_tournament.mode <> '2v2' then
    raise exception 'Este torneo no acepta parejas';
  end if;
  if v_tournament.roster_frozen_at is not null or now() >= v_tournament.starts_at then
    raise exception 'La inscripcion ya cerro';
  end if;
  if not tournament_internal.is_eligible_participant(p_partner_id) then
    raise exception 'El companero elegido no puede participar';
  end if;

  if exists (
    select 1 from public.tournament_entry_members m
    where m.tournament_id = p_tournament_id
      and m.user_id = v_user_id
      and m.status = 'pending'
  ) then
    raise exception 'Primero responde tu invitacion pendiente';
  end if;
  if exists (
    select 1 from public.tournament_entry_members m
    where m.tournament_id = p_tournament_id
      and m.user_id = p_partner_id
      and m.status in ('pending', 'accepted')
  ) then
    raise exception 'Ese jugador ya esta inscripto o invitado';
  end if;

  select e.* into v_entry
    from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id
   where e.tournament_id = p_tournament_id
     and m.user_id = v_user_id
     and m.status = 'accepted'
     and e.status in ('active', 'waitlisted')
   order by e.created_at desc
   limit 1;

  if found then
    if v_entry.kind <> 'solo' or exists (
      select 1 from public.tournament_entry_members m
      where m.entry_id = v_entry.id and m.status = 'pending'
    ) then
      raise exception 'Tu inscripcion ya tiene una pareja o invitacion';
    end if;
  else
    v_entry_status := case
      when tournament_internal.active_player_count(p_tournament_id, null) < v_tournament.capacity
        then 'active'
      else 'waitlisted'
    end;
    insert into public.tournament_entries(
      tournament_id, status, kind, created_by
    ) values (
      p_tournament_id, v_entry_status, 'solo', v_user_id
    ) returning * into v_entry;
    insert into public.tournament_entry_members(
      tournament_id, entry_id, user_id, role, status, accepted_at
    ) values (
      p_tournament_id, v_entry.id, v_user_id, 'captain', 'accepted', now()
    );

    if v_entry_status = 'active'
       and now() >= v_tournament.starts_at - interval '30 minutes' then
      insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
      values (v_entry.id, p_tournament_id, v_user_id)
      on conflict (entry_id) do nothing;
    end if;
  end if;

  insert into public.tournament_entry_members(
    tournament_id, entry_id, user_id, role, status,
    invited_by, invited_at
  ) values (
    p_tournament_id, v_entry.id, p_partner_id, 'invitee', 'pending',
    v_user_id, now()
  );

  perform tournament_internal.store_request(
    v_user_id, p_request_id, 'invite_partner', v_payload,
    p_tournament_id, v_entry.id
  );
  perform tournament_internal.audit(
    p_tournament_id, v_user_id, 'partner_invited', v_entry.id,
    jsonb_build_object('partner_id', p_partner_id)
  );
  return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
end;
$$;

create function public.tournament_respond_invitation(
  p_request_id uuid,
  p_tournament_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := tournament_internal.require_participant();
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_invitation public.tournament_entry_members;
  v_entry_status text;
  v_payload jsonb := jsonb_build_object(
    'tournament_id', p_tournament_id, 'accept', p_accept
  );
  v_previous jsonb;
begin
  if p_accept is null then raise exception 'Respuesta invalida'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7202));
  v_previous := tournament_internal.request_result(
    v_user_id, p_request_id, 'respond_invitation', v_payload
  );
  if v_previous is not null then
    if p_accept then
      return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
    end if;
    return jsonb_build_object('status', 'rejected');
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Torneo no disponible'; end if;

  select m.* into v_invitation
    from public.tournament_entry_members m
   where m.tournament_id = p_tournament_id
     and m.user_id = v_user_id
     and m.status = 'pending'
   order by m.created_at desc
   limit 1
   for update;

  if not found then
    select e.* into v_entry
      from public.tournament_entries e
      join public.tournament_entry_members m on m.entry_id = e.id
     where e.tournament_id = p_tournament_id
       and m.user_id = v_user_id
       and m.status = case when p_accept then 'accepted' else 'rejected' end
     order by m.created_at desc
     limit 1;
    if not found then raise exception 'No hay una invitacion pendiente'; end if;
    perform tournament_internal.store_request(
      v_user_id, p_request_id, 'respond_invitation', v_payload,
      p_tournament_id, v_entry.id
    );
    if p_accept then
      return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
    end if;
    return jsonb_build_object('status', 'rejected');
  end if;

  select * into v_entry
    from public.tournament_entries
   where id = v_invitation.entry_id
   for update;

  if not p_accept then
    update public.tournament_entry_members
       set status = 'rejected', rejected_at = now()
     where id = v_invitation.id;
    perform tournament_internal.store_request(
      v_user_id, p_request_id, 'respond_invitation', v_payload,
      p_tournament_id, v_entry.id
    );
    perform tournament_internal.audit(
      p_tournament_id, v_user_id, 'partner_invitation_rejected', v_entry.id
    );
    return jsonb_build_object('status', 'rejected');
  end if;

  if v_tournament.status <> 'published'
     or v_tournament.roster_frozen_at is not null
     or now() >= v_tournament.starts_at then
    raise exception 'La inscripcion ya cerro';
  end if;
  if v_entry.status not in ('active', 'waitlisted') or v_entry.kind <> 'solo' then
    raise exception 'La invitacion ya no esta disponible';
  end if;

  v_entry_status := case
    when tournament_internal.active_player_count(p_tournament_id, v_entry.id)
         <= v_tournament.capacity - 2
      then 'active'
    else 'waitlisted'
  end;

  update public.tournament_entry_members
     set status = 'accepted', accepted_at = now()
   where id = v_invitation.id;
  update public.tournament_entries
     set kind = 'team',
         status = v_entry_status,
         priority_at = v_invitation.invited_at,
         updated_at = now()
   where id = v_entry.id;

  if v_entry_status = 'waitlisted' then
    delete from public.tournament_checkins where entry_id = v_entry.id;
  end if;

  perform tournament_internal.store_request(
    v_user_id, p_request_id, 'respond_invitation', v_payload,
    p_tournament_id, v_entry.id
  );
  perform tournament_internal.audit(
    p_tournament_id, v_user_id, 'partner_invitation_accepted', v_entry.id,
    jsonb_build_object('status', v_entry_status)
  );
  return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
end;
$$;

create function public.tournament_withdraw(
  p_request_id uuid,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := tournament_internal.require_participant();
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_payload jsonb := jsonb_build_object('tournament_id', p_tournament_id);
  v_previous jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7202));
  v_previous := tournament_internal.request_result(
    v_user_id, p_request_id, 'withdraw', v_payload
  );
  if v_previous is not null then
    return jsonb_build_object('status', 'withdrawn');
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found or v_tournament.status <> 'published' then
    raise exception 'Torneo no disponible';
  end if;
  if now() >= v_tournament.starts_at - interval '30 minutes' then
    raise exception 'El check-in ya abrio; solo un administrador puede retirarte';
  end if;

  select e.* into v_entry
    from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id
   where e.tournament_id = p_tournament_id
     and m.user_id = v_user_id
     and m.status = 'accepted'
     and e.status in ('active', 'waitlisted')
   order by e.created_at desc
   limit 1
   for update of e;
  if not found then raise exception 'No tenes una inscripcion para retirar'; end if;

  update public.tournament_entry_members
     set status = 'withdrawn', withdrawn_at = now()
   where entry_id = v_entry.id and status in ('pending', 'accepted');
  update public.tournament_entries
     set status = 'withdrawn', updated_at = now()
   where id = v_entry.id;
  delete from public.tournament_checkins where entry_id = v_entry.id;

  perform tournament_internal.store_request(
    v_user_id, p_request_id, 'withdraw', v_payload,
    p_tournament_id, v_entry.id
  );
  perform tournament_internal.audit(
    p_tournament_id, v_user_id, 'entry_withdrawn', v_entry.id
  );
  return jsonb_build_object('status', 'withdrawn');
end;
$$;

create function public.tournament_check_in(
  p_request_id uuid,
  p_tournament_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := tournament_internal.require_participant();
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_payload jsonb := jsonb_build_object('tournament_id', p_tournament_id);
  v_previous jsonb;
  v_inserted integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7202));
  v_previous := tournament_internal.request_result(
    v_user_id, p_request_id, 'check_in', v_payload
  );
  if v_previous is not null then
    return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
  end if;

  select * into v_tournament
    from public.tournaments where id = p_tournament_id for update;
  if not found or v_tournament.status <> 'published' then
    raise exception 'Torneo no disponible';
  end if;
  if now() < v_tournament.starts_at - interval '30 minutes'
     or now() >= v_tournament.starts_at then
    raise exception 'El check-in no esta abierto';
  end if;

  select e.* into v_entry
    from public.tournament_entries e
    join public.tournament_entry_members m on m.entry_id = e.id
   where e.tournament_id = p_tournament_id
     and e.status = 'active'
     and m.user_id = v_user_id
     and m.status = 'accepted'
   order by e.created_at desc
   limit 1
   for update of e;
  if not found then raise exception 'No tenes una inscripcion activa'; end if;

  insert into public.tournament_checkins(entry_id, tournament_id, confirmed_by)
  values (v_entry.id, p_tournament_id, v_user_id)
  on conflict (entry_id) do nothing;
  get diagnostics v_inserted = row_count;

  perform tournament_internal.store_request(
    v_user_id, p_request_id, 'check_in', v_payload,
    p_tournament_id, v_entry.id
  );
  if v_inserted = 1 then
    perform tournament_internal.audit(
      p_tournament_id, v_user_id, 'entry_checked_in', v_entry.id
    );
  end if;
  return tournament_internal.entry_snapshot(p_tournament_id, v_user_id);
end;
$$;

-- ------------------------------------------------------------
-- 7. PRIVILEGIOS MINIMOS
-- ------------------------------------------------------------

revoke execute on all functions in schema tournament_internal
  from public, anon, authenticated;
revoke all on all tables in schema tournament_internal
  from public, anon, authenticated;
revoke all on all sequences in schema tournament_internal
  from public, anon, authenticated;

alter default privileges in schema tournament_internal
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema tournament_internal
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema tournament_internal
  revoke all on sequences from public, anon, authenticated;

revoke execute on function public.tournament_list(),
  public.tournament_detail(uuid),
  public.tournament_my_entry(uuid),
  public.tournament_admin_create(uuid,text,text,text,text,integer,integer,integer,integer,integer,timestamptz,boolean),
  public.tournament_admin_update(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,timestamptz),
  public.tournament_admin_publish(uuid,uuid),
  public.tournament_admin_reschedule(uuid,uuid,timestamptz),
  public.tournament_admin_cancel(uuid,uuid,text),
  public.tournament_register_solo(uuid,uuid),
  public.tournament_invite_partner(uuid,uuid,uuid),
  public.tournament_respond_invitation(uuid,uuid,boolean),
  public.tournament_withdraw(uuid,uuid),
  public.tournament_check_in(uuid,uuid)
from public, anon;

grant execute on function public.tournament_list() to authenticated;
grant execute on function public.tournament_detail(uuid) to authenticated;
grant execute on function public.tournament_my_entry(uuid) to authenticated;
grant execute on function public.tournament_admin_create(uuid,text,text,text,text,integer,integer,integer,integer,integer,timestamptz,boolean) to authenticated;
grant execute on function public.tournament_admin_update(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,timestamptz) to authenticated;
grant execute on function public.tournament_admin_publish(uuid,uuid) to authenticated;
grant execute on function public.tournament_admin_reschedule(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.tournament_admin_cancel(uuid,uuid,text) to authenticated;
grant execute on function public.tournament_register_solo(uuid,uuid) to authenticated;
grant execute on function public.tournament_invite_partner(uuid,uuid,uuid) to authenticated;
grant execute on function public.tournament_respond_invitation(uuid,uuid,boolean) to authenticated;
grant execute on function public.tournament_withdraw(uuid,uuid) to authenticated;
grant execute on function public.tournament_check_in(uuid,uuid) to authenticated;

commit;
