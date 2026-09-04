-- ============================================================
-- TRUCAZO — Ciclo de retorno: misiones, desafío semanal y racha
-- Fecha: 2026-09-04
--
-- La asignación y el progreso viven por completo en Postgres. El cliente sólo
-- consulta el estado y reclama recompensas ya validadas. Una marca única por
-- jugador/partida hace que los reintentos no puedan duplicar progreso.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. CATÁLOGOS Y PROGRESO PRIVADO
-- ------------------------------------------------------------

create table if not exists public.daily_mission_templates (
  slug text primary key,
  name text not null,
  description text not null,
  event_type text not null check (event_type in (
    'game_finished', 'human_game_won', 'public_human_game',
    'campaign_game', 'campaign_game_won', 'friend_game', 'rematch_game'
  )),
  target_value integer not null check (target_value > 0),
  reward_amount integer not null check (reward_amount between 1 and 90),
  category text not null check (category in ('participation', 'competition', 'history', 'social')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'competitive')),
  allowed_modes text[] not null default '{}',
  active boolean not null default true
);

create table if not exists public.daily_mission_assignments (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  template_slug text not null references public.daily_mission_templates(slug),
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  reward_amount_snapshot integer not null check (reward_amount_snapshot between 1 and 90),
  primary key (profile_id, local_date, template_slug)
);

create table if not exists public.weekly_challenge_templates (
  slug text primary key,
  name text not null,
  description text not null,
  event_type text not null check (event_type in (
    'game_finished', 'game_won', 'campaign_unique_first_win', 'human_unique_opponent'
  )),
  target_value integer not null check (target_value > 0),
  reward_amount integer not null check (reward_amount > 0),
  active boolean not null default true
);

create table if not exists public.weekly_challenges (
  week_start date primary key,
  template_slug text not null references public.weekly_challenge_templates(slug),
  name_snapshot text not null,
  description_snapshot text not null,
  event_type_snapshot text not null,
  target_value_snapshot integer not null check (target_value_snapshot > 0),
  reward_amount_snapshot integer not null check (reward_amount_snapshot > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_challenge_progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null references public.weekly_challenges(week_start) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  primary key (profile_id, week_start)
);

-- Sólo se usa para desafíos que cuentan rivales diferentes. Nunca se expone al cliente.
create table if not exists public.weekly_challenge_uniques (
  profile_id uuid not null,
  week_start date not null,
  unique_key uuid not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, week_start, unique_key),
  foreign key (profile_id, week_start)
    references public.weekly_challenge_progress(profile_id, week_start) on delete cascade
);

create table if not exists public.profile_activity_streaks (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  longest_streak_days integer not null default 0 check (longest_streak_days >= 0),
  last_active_local_date date,
  protection_week_start date,
  protection_used_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.objective_game_events (
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('persona', 'bot', 'historia', 'privada', 'amigo', 'revancha')),
  won boolean not null,
  opponent_id uuid references public.profiles(id) on delete set null,
  progress_delta jsonb not null default '[]'::jsonb check (jsonb_typeof(progress_delta) = 'array'),
  streak_event text not null default 'unchanged' check (streak_event in (
    'started', 'continued', 'protection_used', 'reset', 'unchanged'
  )),
  processed_at timestamptz not null default now(),
  primary key (game_id, profile_id)
);

create index if not exists daily_mission_assignments_profile_date_idx
  on public.daily_mission_assignments(profile_id, local_date desc);
create index if not exists weekly_challenge_progress_profile_week_idx
  on public.weekly_challenge_progress(profile_id, week_start desc);
create index if not exists objective_game_events_profile_time_idx
  on public.objective_game_events(profile_id, processed_at desc);

alter table public.daily_mission_templates enable row level security;
alter table public.daily_mission_assignments enable row level security;
alter table public.weekly_challenge_templates enable row level security;
alter table public.weekly_challenges enable row level security;
alter table public.weekly_challenge_progress enable row level security;
alter table public.weekly_challenge_uniques enable row level security;
alter table public.profile_activity_streaks enable row level security;
alter table public.objective_game_events enable row level security;

revoke all on table public.daily_mission_templates from public, anon, authenticated;
revoke all on table public.daily_mission_assignments from public, anon, authenticated;
revoke all on table public.weekly_challenge_templates from public, anon, authenticated;
revoke all on table public.weekly_challenges from public, anon, authenticated;
revoke all on table public.weekly_challenge_progress from public, anon, authenticated;
revoke all on table public.weekly_challenge_uniques from public, anon, authenticated;
revoke all on table public.profile_activity_streaks from public, anon, authenticated;
revoke all on table public.objective_game_events from public, anon, authenticated;

grant select on table public.daily_mission_assignments to authenticated;
grant select on table public.weekly_challenge_progress to authenticated;
grant select on table public.profile_activity_streaks to authenticated;
grant select on table public.objective_game_events to authenticated;
grant all on table public.daily_mission_templates to service_role;
grant all on table public.daily_mission_assignments to service_role;
grant all on table public.weekly_challenge_templates to service_role;
grant all on table public.weekly_challenges to service_role;
grant all on table public.weekly_challenge_progress to service_role;
grant all on table public.weekly_challenge_uniques to service_role;
grant all on table public.profile_activity_streaks to service_role;
grant all on table public.objective_game_events to service_role;

drop policy if exists "ver mis misiones diarias" on public.daily_mission_assignments;
create policy "ver mis misiones diarias" on public.daily_mission_assignments
  for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists "ver mi desafio semanal" on public.weekly_challenge_progress;
create policy "ver mi desafio semanal" on public.weekly_challenge_progress
  for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists "ver mi racha" on public.profile_activity_streaks;
create policy "ver mi racha" on public.profile_activity_streaks
  for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists "ver mis avances por partida" on public.objective_game_events;
create policy "ver mis avances por partida" on public.objective_game_events
  for select to authenticated using ((select auth.uid()) = profile_id);

-- ------------------------------------------------------------
-- 2. CATÁLOGO INICIAL (valores configurados en la base)
-- ------------------------------------------------------------

insert into public.daily_mission_templates
  (slug, name, description, event_type, target_value, reward_amount, category, difficulty, allowed_modes, active)
values
  ('finish_1', 'Primera del día', 'Terminá 1 partida válida.', 'game_finished', 1, 20, 'participation', 'easy', array['persona','bot','historia','privada','amigo','revancha'], true),
  ('finish_2', 'Mesa en marcha', 'Terminá 2 partidas válidas.', 'game_finished', 2, 25, 'participation', 'easy', array['persona','bot','historia','privada','amigo','revancha'], true),
  ('finish_3', 'Tres en la mesa', 'Terminá 3 partidas válidas.', 'game_finished', 3, 30, 'participation', 'medium', array['persona','bot','historia','privada','amigo','revancha'], true),
  ('finish_4', 'Tarde de truco', 'Terminá 4 partidas válidas.', 'game_finished', 4, 30, 'participation', 'medium', array['persona','bot','historia','privada','amigo','revancha'], true),
  ('win_human_1', 'Duelo ganado', 'Ganá 1 partida contra una persona.', 'human_game_won', 1, 40, 'competition', 'competitive', array['persona','privada','amigo','revancha'], true),
  ('win_human_2', 'Mano firme', 'Ganá 2 partidas contra personas.', 'human_game_won', 2, 40, 'competition', 'competitive', array['persona','privada','amigo','revancha'], true),
  ('win_human_3', 'Racha de victorias', 'Ganá 3 partidas contra personas.', 'human_game_won', 3, 40, 'competition', 'competitive', array['persona','privada','amigo','revancha'], true),
  ('public_human_1', 'Cancha abierta', 'Jugá 1 partida pública contra una persona.', 'public_human_game', 1, 20, 'competition', 'easy', array['persona'], true),
  ('public_human_2', 'Cancha abierta', 'Jugá 2 partidas públicas contra personas.', 'public_human_game', 2, 30, 'competition', 'medium', array['persona'], true),
  ('public_human_3', 'Gira pública', 'Jugá 3 partidas públicas contra personas.', 'public_human_game', 3, 35, 'competition', 'medium', array['persona'], true),
  ('campaign_play_1', 'Kilómetros de truco', 'Jugá 1 duelo del Modo Historia.', 'campaign_game', 1, 20, 'history', 'easy', array['historia'], true),
  ('campaign_play_2', 'Camino de provincias', 'Jugá 2 duelos del Modo Historia.', 'campaign_game', 2, 25, 'history', 'easy', array['historia'], true),
  ('campaign_play_3', 'Ruta del truco', 'Jugá 3 duelos del Modo Historia.', 'campaign_game', 3, 30, 'history', 'medium', array['historia'], true),
  ('campaign_win_1', 'Historia escrita', 'Ganá 1 duelo del Modo Historia.', 'campaign_game_won', 1, 30, 'history', 'medium', array['historia'], true),
  ('campaign_win_2', 'Conquista provincial', 'Ganá 2 duelos del Modo Historia.', 'campaign_game_won', 2, 35, 'history', 'medium', array['historia'], true),
  ('campaign_win_3', 'Leyenda del camino', 'Ganá 3 duelos del Modo Historia.', 'campaign_game_won', 3, 40, 'history', 'competitive', array['historia'], true),
  ('friend_game_1', 'Mesa entre amigos', 'Terminá 1 partida privada con un amigo.', 'friend_game', 1, 30, 'social', 'medium', array['amigo'], true),
  ('friend_game_2', 'Dupla conocida', 'Terminá 2 partidas privadas con amigos.', 'friend_game', 2, 35, 'social', 'medium', array['amigo'], true),
  ('friend_game_3', 'Peña de amigos', 'Terminá 3 partidas privadas con amigos.', 'friend_game', 3, 40, 'social', 'competitive', array['amigo'], true),
  ('rematch_1', 'Hay revancha', 'Pedí o aceptá una revancha y terminala.', 'rematch_game', 1, 30, 'social', 'medium', array['revancha'], true),
  ('rematch_2', 'La mejor de tres', 'Terminá 2 partidas de revancha.', 'rematch_game', 2, 35, 'social', 'medium', array['revancha'], true),
  ('rematch_3', 'No termina acá', 'Terminá 3 partidas de revancha.', 'rematch_game', 3, 40, 'social', 'competitive', array['revancha'], true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  event_type = excluded.event_type,
  target_value = excluded.target_value,
  reward_amount = excluded.reward_amount,
  category = excluded.category,
  difficulty = excluded.difficulty,
  allowed_modes = excluded.allowed_modes,
  active = excluded.active;

insert into public.weekly_challenge_templates
  (slug, name, description, event_type, target_value, reward_amount, active)
values
  ('weekly_finish_10', 'Diez partidas', 'Terminá 10 partidas válidas esta semana.', 'game_finished', 10, 150, true),
  ('weekly_win_5', 'Cinco victorias', 'Ganá 5 partidas en cualquier modo.', 'game_won', 5, 150, true),
  ('weekly_campaign_2', 'Nuevos territorios', 'Vencé por primera vez a 2 rivales distintos de Historia.', 'campaign_unique_first_win', 2, 150, true),
  ('weekly_humans_3', 'Tres rivales', 'Jugá con 3 rivales humanos diferentes.', 'human_unique_opponent', 3, 150, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  event_type = excluded.event_type,
  target_value = excluded.target_value,
  reward_amount = excluded.reward_amount,
  active = excluded.active;

-- ------------------------------------------------------------
-- 3. ASIGNACIÓN PEREZOSA, DETERMINISTA Y CON TOPE DE 90/DÍA
-- ------------------------------------------------------------

create or replace function public._ensure_objectives(p_profile_id uuid, p_local_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_week_start date := p_local_date - (extract(isodow from p_local_date)::integer - 1);
  v_count integer;
  v_has_friends boolean;
  v_has_campaign boolean;
  v_combo record;
  v_weekly public.weekly_challenge_templates%rowtype;
begin
  if p_profile_id is null or p_local_date is null then return; end if;
  if not exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = p_profile_id
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
  ) then return; end if;

  select count(*) into v_count
    from public.daily_mission_assignments a
   where a.profile_id = p_profile_id and a.local_date = p_local_date;

  if v_count = 0 then
    select exists (
      select 1 from public.friendships f
       where f.status = 'accepted'
         and p_profile_id in (f.requester_id, f.addressee_id)
    ) into v_has_friends;

    select exists (
      select 1
        from public.campaign_rivals r
        join public.campaign_provinces pv on pv.id = r.province_id
        join public.profiles p on p.id = p_profile_id
       where p.campaign_points >= r.points_required
         and p.campaign_points >= pv.points_required
    ) into v_has_campaign;

    -- Se elige una combinación completa para que el tope no favorezca siempre
    -- las misiones más baratas. También se prioriza no usar las tres del día anterior:
    -- con el catálogo normal, una misión exacta nunca se repite dos días seguidos.
    select
      participation.slug as participation_slug,
      participation.reward_amount as participation_reward,
      competition.slug as competition_slug,
      competition.reward_amount as competition_reward,
      varied.slug as varied_slug,
      varied.reward_amount as varied_reward
      into v_combo
      from public.daily_mission_templates participation
      cross join public.daily_mission_templates competition
      cross join public.daily_mission_templates varied
     where participation.active and participation.category = 'participation'
       and competition.active and competition.category = 'competition'
       and varied.active and varied.category in ('history', 'social')
       and participation.reward_amount + competition.reward_amount + varied.reward_amount <= 90
       and (
         (varied.category = 'history' and v_has_campaign)
         or (varied.event_type = 'friend_game' and v_has_friends)
         or varied.event_type = 'rematch_game'
       )
     order by (
       select count(*)
         from public.daily_mission_assignments yesterday
        where yesterday.profile_id = p_profile_id
          and yesterday.local_date = p_local_date - 1
          and yesterday.template_slug in (participation.slug, competition.slug, varied.slug)
     ), md5(
       p_profile_id::text || p_local_date::text ||
       participation.slug || competition.slug || varied.slug
     )
     limit 1;
    if not found then raise exception 'no hay una combinación de misiones elegible dentro del tope diario'; end if;

    insert into public.daily_mission_assignments
      (profile_id, local_date, template_slug, reward_amount_snapshot)
    values
      (p_profile_id, p_local_date, v_combo.participation_slug, v_combo.participation_reward),
      (p_profile_id, p_local_date, v_combo.competition_slug, v_combo.competition_reward),
      (p_profile_id, p_local_date, v_combo.varied_slug, v_combo.varied_reward)
    on conflict (profile_id, local_date, template_slug) do nothing;
  end if;

  select * into v_weekly
    from public.weekly_challenge_templates t
   where t.active
   order by md5(v_week_start::text || t.slug)
   limit 1;
  if not found then raise exception 'no hay desafíos semanales activos'; end if;

  insert into public.weekly_challenges
    (week_start, template_slug, name_snapshot, description_snapshot,
     event_type_snapshot, target_value_snapshot, reward_amount_snapshot)
  values
    (v_week_start, v_weekly.slug, v_weekly.name, v_weekly.description,
     v_weekly.event_type, v_weekly.target_value, v_weekly.reward_amount)
  on conflict (week_start) do nothing;

  insert into public.weekly_challenge_progress(profile_id, week_start)
  values (p_profile_id, v_week_start)
  on conflict (profile_id, week_start) do nothing;
end;
$function$;

-- ------------------------------------------------------------
-- 4. PROGRESO: LO DISPARA EL CAMBIO REAL DE GAMES A FINISHED
-- ------------------------------------------------------------

create or replace function public._record_objective_game(p_game_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_game public.games%rowtype;
  v_table public.tables%rowtype;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_week_start date;
  v_opponent uuid;
  v_opponent_is_bot boolean;
  v_mode text;
  v_won boolean;
  v_campaign_first_win boolean := false;
  v_delta jsonb := '[]'::jsonb;
  v_streak_event text := 'unchanged';
  v_old integer;
  v_new integer;
  v_step integer;
  v_inserted integer;
  v_streak public.profile_activity_streaks%rowtype;
  r record;
begin
  select * into v_game from public.games g where g.id = p_game_id;
  if not found or v_game.status <> 'finished' or v_game.winner_id is null then return; end if;
  if p_profile_id not in (v_game.player1_id, v_game.player2_id) then return; end if;
  if not exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = p_profile_id
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
  ) then return; end if;

  -- No cuentan partidas anuladas ni abandonos instantáneos sin una sola acción.
  if coalesce(jsonb_array_length(v_game.played_cards), 0) = 0
     and v_game.hand_number <= 1
     and v_game.player1_score + v_game.player2_score = 0 then
    return;
  end if;

  insert into public.objective_game_events(game_id, profile_id, mode, won)
  values (p_game_id, p_profile_id, 'persona', v_game.winner_id = p_profile_id)
  on conflict (game_id, profile_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return; end if;

  select * into v_table from public.tables t where t.id = p_game_id;
  v_opponent := case when p_profile_id = v_game.player1_id then v_game.player2_id else v_game.player1_id end;
  select coalesce(p.is_bot, false) into v_opponent_is_bot
    from public.profiles p where p.id = v_opponent;
  v_won := v_game.winner_id = p_profile_id;

  if v_game.campaign_rival_id is not null then
    v_mode := 'historia';
    v_campaign_first_win := v_won and not exists (
      select 1 from public.campaign_progress cp
       where cp.user_id = p_profile_id and cp.rival_id = v_game.campaign_rival_id
    );
  elsif v_opponent_is_bot then
    v_mode := 'bot';
  elsif exists (select 1 from public.games old_game where old_game.rematch_game_id = p_game_id) then
    v_mode := 'revancha';
  elsif coalesce(v_table.is_private, false) and exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and least(f.requester_id, f.addressee_id) = least(p_profile_id, v_opponent)
       and greatest(f.requester_id, f.addressee_id) = greatest(p_profile_id, v_opponent)
  ) then
    v_mode := 'amigo';
  elsif coalesce(v_table.is_private, false) then
    v_mode := 'privada';
  else
    v_mode := 'persona';
  end if;

  update public.objective_game_events
     set mode = v_mode, won = v_won, opponent_id = v_opponent
   where game_id = p_game_id and profile_id = p_profile_id;

  perform public._ensure_objectives(p_profile_id, v_today);
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);

  for r in
    select a.template_slug, a.progress, a.completed_at, a.reward_amount_snapshot,
           t.name, t.event_type, t.target_value
      from public.daily_mission_assignments a
      join public.daily_mission_templates t on t.slug = a.template_slug
     where a.profile_id = p_profile_id and a.local_date = v_today
     for update of a
  loop
    v_step := case
      when r.event_type = 'game_finished' then 1
      when r.event_type = 'human_game_won' and v_won and not v_opponent_is_bot and v_mode <> 'historia' then 1
      when r.event_type = 'public_human_game' and v_mode = 'persona' then 1
      when r.event_type = 'campaign_game' and v_mode = 'historia' then 1
      when r.event_type = 'campaign_game_won' and v_mode = 'historia' and v_won then 1
      when r.event_type = 'friend_game' and v_mode = 'amigo' then 1
      when r.event_type = 'rematch_game' and v_mode = 'revancha' then 1
      else 0
    end;
    if v_step = 0 or r.progress >= r.target_value then continue; end if;

    v_old := r.progress;
    v_new := least(r.target_value, r.progress + v_step);
    update public.daily_mission_assignments a
       set progress = v_new,
           completed_at = case when v_new >= r.target_value then coalesce(a.completed_at, now()) else a.completed_at end
     where a.profile_id = p_profile_id and a.local_date = v_today
       and a.template_slug = r.template_slug;
    v_delta := v_delta || jsonb_build_array(jsonb_build_object(
      'type', 'daily', 'identifier', r.template_slug, 'name', r.name,
      'previous', v_old, 'current', v_new, 'target', r.target_value,
      'reward', r.reward_amount_snapshot,
      'mode', v_mode,
      'completed', v_new >= r.target_value,
      'newly_completed', v_old < r.target_value and v_new >= r.target_value
    ));
  end loop;

  select c.*, p.progress as player_progress
    into r
    from public.weekly_challenges c
    join public.weekly_challenge_progress p on p.week_start = c.week_start
   where c.week_start = v_week_start and p.profile_id = p_profile_id
   for update of p;

  if found and r.player_progress < r.target_value_snapshot then
    v_step := case
      when r.event_type_snapshot = 'game_finished' then 1
      when r.event_type_snapshot = 'game_won' and v_won then 1
      else 0
    end;

    if r.event_type_snapshot = 'campaign_unique_first_win'
       and v_mode = 'historia' and v_campaign_first_win then
      insert into public.weekly_challenge_uniques(profile_id, week_start, unique_key)
      values (p_profile_id, v_week_start, v_game.campaign_rival_id)
      on conflict do nothing;
      get diagnostics v_step = row_count;
    elsif r.event_type_snapshot = 'human_unique_opponent'
       and not v_opponent_is_bot and v_mode <> 'historia' then
      insert into public.weekly_challenge_uniques(profile_id, week_start, unique_key)
      values (p_profile_id, v_week_start, v_opponent)
      on conflict do nothing;
      get diagnostics v_step = row_count;
    end if;

    if v_step > 0 then
      v_old := r.player_progress;
      v_new := least(r.target_value_snapshot, r.player_progress + v_step);
      update public.weekly_challenge_progress p
         set progress = v_new,
             completed_at = case when v_new >= r.target_value_snapshot then coalesce(p.completed_at, now()) else p.completed_at end
       where p.profile_id = p_profile_id and p.week_start = v_week_start;
      v_delta := v_delta || jsonb_build_array(jsonb_build_object(
        'type', 'weekly', 'identifier', r.template_slug, 'name', r.name_snapshot,
        'previous', v_old, 'current', v_new, 'target', r.target_value_snapshot,
        'reward', r.reward_amount_snapshot,
        'mode', v_mode,
        'completed', v_new >= r.target_value_snapshot,
        'newly_completed', v_old < r.target_value_snapshot and v_new >= r.target_value_snapshot
      ));
    end if;
  end if;

  insert into public.profile_activity_streaks
    (profile_id, current_streak_days, longest_streak_days, last_active_local_date, updated_at)
  values (p_profile_id, 1, 1, v_today, now())
  on conflict (profile_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    v_streak_event := 'started';
  else
    select * into v_streak
      from public.profile_activity_streaks s where s.profile_id = p_profile_id for update;
    if v_streak.last_active_local_date = v_today then
      v_streak_event := 'unchanged';
    elsif v_streak.last_active_local_date = v_today - 1 then
      update public.profile_activity_streaks
         set current_streak_days = current_streak_days + 1,
             longest_streak_days = greatest(longest_streak_days, current_streak_days + 1),
             last_active_local_date = v_today,
             updated_at = now()
       where profile_id = p_profile_id;
      v_streak_event := 'continued';
    elsif v_streak.last_active_local_date = v_today - 2
          and (v_streak.protection_week_start is distinct from v_week_start
               or v_streak.protection_used_at is null) then
      update public.profile_activity_streaks
         set current_streak_days = current_streak_days + 1,
             longest_streak_days = greatest(longest_streak_days, current_streak_days + 1),
             last_active_local_date = v_today,
             protection_week_start = v_week_start,
             protection_used_at = now(),
             updated_at = now()
       where profile_id = p_profile_id;
      v_streak_event := 'protection_used';
    else
      update public.profile_activity_streaks
         set current_streak_days = 1,
             longest_streak_days = greatest(longest_streak_days, 1),
             last_active_local_date = v_today,
             updated_at = now()
       where profile_id = p_profile_id;
      v_streak_event := 'reset';
    end if;
  end if;

  update public.objective_game_events
     set progress_delta = v_delta, streak_event = v_streak_event
   where game_id = p_game_id and profile_id = p_profile_id;
end;
$function$;

create or replace function public.record_objectives_on_game_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'finished' and old.status is distinct from 'finished'
     and new.winner_id is not null then
    perform public._record_objective_game(new.id, new.player1_id);
    perform public._record_objective_game(new.id, new.player2_id);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_record_objectives on public.games;
create trigger trg_record_objectives
after update of status on public.games
for each row execute function public.record_objectives_on_game_finished();

-- ------------------------------------------------------------
-- 5. RPC DE LECTURA Y RECLAMO ATÓMICO
-- ------------------------------------------------------------

create or replace function public.get_my_objectives(p_game_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_week_start date;
  v_daily jsonb;
  v_weekly jsonb;
  v_streak jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_coins integer;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if not exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = v_uid
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
  ) then
    raise exception 'perfil no encontrado';
  end if;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);
  perform public._ensure_objectives(v_uid, v_today);

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'daily',
    'identifier', a.template_slug,
    'name', t.name,
    'description', t.description,
    'category', t.category,
    'difficulty', t.difficulty,
    'progress', least(a.progress, t.target_value),
    'target', t.target_value,
    'reward', a.reward_amount_snapshot,
    'completed_at', a.completed_at,
    'claimed_at', a.claimed_at,
    'status', case when a.claimed_at is not null then 'claimed'
                   when a.completed_at is not null then 'ready'
                   else 'in_progress' end,
    'ends_label', 'Termina hoy'
  ) order by case t.category when 'participation' then 1 when 'competition' then 2 else 3 end), '[]'::jsonb)
    into v_daily
    from public.daily_mission_assignments a
    join public.daily_mission_templates t on t.slug = a.template_slug
   where a.profile_id = v_uid and a.local_date = v_today;

  select jsonb_build_object(
    'type', 'weekly',
    'identifier', c.template_slug,
    'name', c.name_snapshot,
    'description', c.description_snapshot,
    'category', 'weekly',
    'difficulty', 'weekly',
    'progress', least(p.progress, c.target_value_snapshot),
    'target', c.target_value_snapshot,
    'reward', c.reward_amount_snapshot,
    'completed_at', p.completed_at,
    'claimed_at', p.claimed_at,
    'status', case when p.claimed_at is not null then 'claimed'
                   when p.completed_at is not null then 'ready'
                   else 'in_progress' end,
    'ends_label', 'Termina el domingo'
  ) into v_weekly
    from public.weekly_challenges c
    join public.weekly_challenge_progress p on p.week_start = c.week_start
   where c.week_start = v_week_start and p.profile_id = v_uid;

  select jsonb_build_object(
    'current_days', coalesce(s.current_streak_days, 0),
    'longest_days', coalesce(s.longest_streak_days, 0),
    'last_active_date', s.last_active_local_date,
    'protection_available', s.protection_week_start is distinct from v_week_start
                            or s.protection_used_at is null,
    'protection_used', s.protection_week_start = v_week_start
                       and s.protection_used_at is not null
  ) into v_streak
    from public.profile_activity_streaks s where s.profile_id = v_uid;
  v_streak := coalesce(v_streak, jsonb_build_object(
    'current_days', 0, 'longest_days', 0, 'last_active_date', null,
    'protection_available', true, 'protection_used', false
  ));

  if p_game_id is not null then
    select e.progress_delta into v_recent
      from public.objective_game_events e
     where e.game_id = p_game_id and e.profile_id = v_uid;
    v_recent := coalesce(v_recent, '[]'::jsonb);
  end if;

  select p.coins into v_coins from public.profiles p where p.id = v_uid;

  return jsonb_build_object(
    'generated_at', now(),
    'local_date', v_today,
    'day_ends_at', (v_today + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires',
    'week_start', v_week_start,
    'week_ends_at', (v_week_start + 7)::timestamp at time zone 'America/Argentina/Buenos_Aires',
    'daily', v_daily,
    'weekly', v_weekly,
    'streak', v_streak,
    'coins', v_coins,
    'recent_progress', v_recent,
    'streak_event', case when p_game_id is null then 'unchanged' else coalesce((
      select e.streak_event from public.objective_game_events e
       where e.game_id = p_game_id and e.profile_id = v_uid
    ), 'unchanged') end
  );
end;
$function$;

create or replace function public.claim_objective_reward(p_type text, p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_week_start date;
  v_reward integer;
  v_claimed timestamptz;
  v_completed timestamptz;
  v_claimed_today integer;
  v_coins integer;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if not exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = v_uid
       and not p.is_bot
       and not coalesce(u.is_anonymous, false)
  ) then
    raise exception 'perfil no encontrado';
  end if;
  if p_type not in ('daily', 'weekly') or nullif(trim(p_identifier), '') is null then
    raise exception 'objetivo inválido';
  end if;
  v_week_start := v_today - (extract(isodow from v_today)::integer - 1);
  perform public._ensure_objectives(v_uid, v_today);

  -- Serializa todos los reclamos del perfil, incluso si vienen de dos pestañas.
  select p.coins into v_coins from public.profiles p where p.id = v_uid for update;
  if not found then raise exception 'perfil no encontrado'; end if;

  if p_type = 'daily' then
    select a.reward_amount_snapshot, a.completed_at, a.claimed_at
      into v_reward, v_completed, v_claimed
      from public.daily_mission_assignments a
     where a.profile_id = v_uid and a.local_date = v_today
       and a.template_slug = p_identifier
     for update;
    if not found then raise exception 'misión no encontrada'; end if;
    if v_claimed is not null then return public.get_my_objectives(null); end if;
    if v_completed is null then raise exception 'la misión todavía no está completa'; end if;

    select coalesce(sum(a.reward_amount_snapshot), 0) into v_claimed_today
      from public.daily_mission_assignments a
     where a.profile_id = v_uid and a.local_date = v_today and a.claimed_at is not null;
    if v_claimed_today + v_reward > 90 then raise exception 'alcanzaste el tope diario de recompensas'; end if;

    update public.daily_mission_assignments
       set claimed_at = now()
     where profile_id = v_uid and local_date = v_today and template_slug = p_identifier;
  else
    select c.reward_amount_snapshot, p.completed_at, p.claimed_at
      into v_reward, v_completed, v_claimed
      from public.weekly_challenges c
      join public.weekly_challenge_progress p on p.week_start = c.week_start
     where c.week_start = v_week_start and p.profile_id = v_uid
       and c.template_slug = p_identifier
     for update of p;
    if not found then raise exception 'desafío semanal no encontrado'; end if;
    if v_claimed is not null then return public.get_my_objectives(null); end if;
    if v_completed is null then raise exception 'el desafío todavía no está completo'; end if;

    update public.weekly_challenge_progress
       set claimed_at = now()
     where profile_id = v_uid and week_start = v_week_start;
  end if;

  update public.profiles set coins = coins + v_reward where id = v_uid;
  return public.get_my_objectives(null);
end;
$function$;

revoke execute on function public._ensure_objectives(uuid, date) from public, anon, authenticated;
revoke execute on function public._record_objective_game(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.record_objectives_on_game_finished() from public, anon, authenticated;
revoke execute on function public.get_my_objectives(uuid) from public, anon;
revoke execute on function public.claim_objective_reward(text, text) from public, anon;
grant execute on function public.get_my_objectives(uuid) to authenticated;
grant execute on function public.claim_objective_reward(text, text) to authenticated;

-- ------------------------------------------------------------
-- 6. ANALÍTICA DE PRIMERA PARTE
-- ------------------------------------------------------------

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'page_view', 'guest_session_started', 'register_completed', 'game_started',
    'objectives_viewed', 'objective_progressed', 'objective_completed',
    'objective_reward_claimed', 'weekly_challenge_completed',
    'streak_continued', 'streak_protection_used'
  ));

create or replace function public.record_analytics_event(
  p_event_id uuid,
  p_visitor_id uuid,
  p_session_id uuid,
  p_event_name text,
  p_path text,
  p_user_id uuid,
  p_source text,
  p_medium text,
  p_campaign text,
  p_content text,
  p_referrer_host text,
  p_country_code text,
  p_device_type text,
  p_browser text,
  p_operating_system text,
  p_properties jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_game_id uuid;
begin
  if p_event_id is null or p_visitor_id is null or p_session_id is null then
    raise exception 'identificadores inválidos';
  end if;
  if p_event_name not in (
    'page_view', 'guest_session_started', 'register_completed', 'game_started',
    'objectives_viewed', 'objective_progressed', 'objective_completed',
    'objective_reward_claimed', 'weekly_challenge_completed',
    'streak_continued', 'streak_protection_used'
  ) then
    raise exception 'evento inválido';
  end if;
  if p_path is null or p_path !~ '^/' or length(p_path) > 300 then
    raise exception 'ruta inválida';
  end if;
  if p_properties is null or jsonb_typeof(p_properties) <> 'object'
     or pg_column_size(p_properties) > 4096 then
    raise exception 'propiedades inválidas';
  end if;

  if p_user_id is not null and exists (
    select 1 from public.profiles p where p.id = p_user_id and p.is_admin
  ) then return; end if;
  if exists (select 1 from public.analytics_events e where e.event_id = p_event_id) then return; end if;
  if (select count(*) from public.analytics_events e
      where e.visitor_id = p_visitor_id and e.occurred_at >= v_now - interval '1 minute') >= 30 then return; end if;
  if (select count(*) from public.analytics_events e
      where e.visitor_id = p_visitor_id and e.occurred_at >= v_now - interval '1 hour') >= 300 then return; end if;
  if (select count(*) from public.analytics_events e
      where e.occurred_at >= v_now - interval '1 minute') >= 2000 then return; end if;

  if p_event_name = 'game_started' then
    begin v_game_id := (p_properties->>'game_id')::uuid;
    exception when invalid_text_representation then return; end;
    if p_user_id is null or v_game_id is null or not exists (
      select 1 from public.games g where g.id = v_game_id and p_user_id in (g.player1_id, g.player2_id)
    ) then return; end if;
    if exists (
      select 1 from public.analytics_events e
       where e.visitor_id = p_visitor_id and e.event_name = 'game_started'
         and e.properties->>'game_id' = v_game_id::text
    ) then return; end if;
  end if;

  if p_event_name in ('guest_session_started', 'register_completed') and exists (
    select 1 from public.analytics_events e
     where e.visitor_id = p_visitor_id and e.event_name = p_event_name
       and e.occurred_at >= v_now - interval '1 day'
  ) then return; end if;

  insert into public.analytics_visitors (
    visitor_id, first_seen_at, last_seen_at, first_source, first_medium,
    first_campaign, first_content, first_referrer_host, first_landing_path,
    last_user_id, country_code, device_type, browser, operating_system
  ) values (
    p_visitor_id, v_now, v_now, left(p_source, 160), left(p_medium, 80),
    left(p_campaign, 120), left(p_content, 120), left(p_referrer_host, 160),
    p_path, p_user_id, left(p_country_code, 2), left(p_device_type, 30),
    left(p_browser, 40), left(p_operating_system, 40)
  ) on conflict (visitor_id) do update set
    last_seen_at = excluded.last_seen_at,
    last_user_id = coalesce(excluded.last_user_id, analytics_visitors.last_user_id),
    country_code = coalesce(excluded.country_code, analytics_visitors.country_code),
    device_type = coalesce(excluded.device_type, analytics_visitors.device_type),
    browser = coalesce(excluded.browser, analytics_visitors.browser),
    operating_system = coalesce(excluded.operating_system, analytics_visitors.operating_system);

  insert into public.analytics_sessions (
    session_id, visitor_id, user_id, started_at, last_seen_at, source, medium,
    campaign, content, referrer_host, landing_path, country_code, device_type,
    browser, operating_system
  ) values (
    p_session_id, p_visitor_id, p_user_id, v_now, v_now, left(p_source, 160),
    left(p_medium, 80), left(p_campaign, 120), left(p_content, 120),
    left(p_referrer_host, 160), p_path, left(p_country_code, 2),
    left(p_device_type, 30), left(p_browser, 40), left(p_operating_system, 40)
  ) on conflict (session_id) do update set
    last_seen_at = excluded.last_seen_at,
    user_id = coalesce(excluded.user_id, analytics_sessions.user_id);

  insert into public.analytics_events (
    event_id, visitor_id, session_id, user_id, event_name, path, properties, occurred_at
  ) values (
    p_event_id, p_visitor_id, p_session_id, p_user_id, p_event_name,
    p_path, p_properties, v_now
  ) on conflict (event_id) do nothing;
end;
$function$;

revoke execute on function public.record_analytics_event(
  uuid, uuid, uuid, text, text, uuid, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_analytics_event(
  uuid, uuid, uuid, text, text, uuid, text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

commit;
