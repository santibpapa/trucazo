-- ============================================================
-- MEDALLAS
-- Insignias que se GANAN (no se compran) al cumplir condiciones. Se muestran
-- como un pin en la esquina del avatar (la "destacada") y en una vitrina en el
-- perfil. Hay dos clases:
--   - 'event' (permanentes): se ganan una vez y quedan para siempre. Se otorgan
--     solas en el servidor (triggers) cuando cambian tus estadísticas.
--   - 'live'  (vivas): reflejan tu posición ACTUAL en un ranking; las tenés solo
--     mientras mantengas el puesto. No se guardan: se calculan al vuelo.
--
-- Qué crea:
--   - Tabla `medals` (catálogo, lectura pública).
--   - Tabla `profile_medals` (medallas permanentes ganadas por cada perfil).
--   - Columna `profiles.active_medal` (la destacada, default 'ninguno').
--   - `award_event_medals(uid, barrida)` → otorga las permanentes que correspondan.
--   - `player_medals(uid)` → lista de medallas ACTUALES (permanentes + vivas).
--   - `active_medal_for(uid)` → la destacada, si sigue siendo válida.
--   - `get_active_medals(ids[])` → destacadas válidas de varios perfiles (para pins).
--   - `set_active_medal(slug)` → elegir la destacada (valida que la tengas).
--   - Triggers que otorgan solas las medallas al terminar partidas / cambiar stats.
-- ============================================================

-- ---------- Catálogo ----------
create table if not exists public.medals (
  slug        text primary key,
  name        text not null,
  description text not null,
  emoji       text not null,
  kind        text not null default 'event',   -- 'event' | 'live'
  sort_order  integer not null default 0
);

alter table public.medals enable row level security;

drop policy if exists "medals_select_all" on public.medals;
create policy "medals_select_all" on public.medals
  for select to public using (true);

insert into public.medals (slug, name, description, emoji, kind, sort_order) values
  ('primera',      'Primera victoria',    'Ganaste tu primera partida.',                               '🥇', 'event', 1),
  ('barrida',      'La Barrida',          'Ganaste una partida sin dejar que el rival sume un punto.', '🧹', 'event', 2),
  ('racha',        'Racha de fuego',      'Ganaste 5 partidas seguidas.',                              '🔥', 'event', 3),
  ('veterano',     'Veterano',            'Jugaste 100 partidas.',                                     '🎖️', 'event', 4),
  ('millonario',   'Millonario',          'Juntaste 10.000 monedas.',                                  '💰', 'event', 5),
  ('conquistador', 'Conquistador',        'Completaste una provincia entera de la campaña.',           '🗺️', 'event', 6),
  ('top10',        'Top 10',              'Estás entre los 10 mejores por partidas ganadas.',          '🏆', 'live',  7),
  ('top5_campana', 'Top 5 de la campaña', 'Estás entre los 5 mejores del Ranking de Argentina.',       '🇦🇷', 'live',  8),
  ('rey',          'Rey de Argentina',    'Sos el número 1 del Ranking de Argentina.',                 '👑', 'live',  9)
on conflict (slug) do nothing;

-- ---------- Medallas permanentes ganadas ----------
create table if not exists public.profile_medals (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  medal_slug text not null references public.medals(slug) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (profile_id, medal_slug)
);

alter table public.profile_medals enable row level security;

-- Cada uno ve las suyas por lectura directa; las de otros se leen por RPC.
drop policy if exists "profile_medals_select_own" on public.profile_medals;
create policy "profile_medals_select_own" on public.profile_medals
  for select to authenticated using (profile_id = auth.uid());

-- ---------- Medalla destacada ----------
alter table public.profiles
  add column if not exists active_medal text not null default 'ninguno';

-- ---------- Otorgar medallas permanentes ----------
-- Revisa las condiciones y agrega las que falten. p_barrida = true solo cuando
-- viene del cierre de una partida 30-0 (el trigger de games lo pasa).
create or replace function public.award_event_medals(p_uid uuid, p_barrida boolean default false)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v      profiles%rowtype;
  v_win5 integer;
  v_prov boolean;
begin
  select * into v from profiles where id = p_uid;
  if not found or v.is_bot then return; end if;

  if p_barrida then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'barrida') on conflict do nothing;
  end if;

  if v.games_won >= 1 then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'primera') on conflict do nothing;
  end if;
  if v.games_played >= 100 then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'veterano') on conflict do nothing;
  end if;
  if v.coins >= 10000 then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'millonario') on conflict do nothing;
  end if;

  -- Racha: las últimas 5 partidas del historial, todas ganadas.
  select count(*) into v_win5 from (
    select result from game_history where player_id = p_uid order by created_at desc limit 5
  ) t where result = 'win';
  if v_win5 = 5 then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'racha') on conflict do nothing;
  end if;

  -- Conquistador: alguna provincia con todos sus rivales vencidos.
  select exists (
    select 1 from campaign_provinces pr
    where (select count(*) from campaign_rivals cr where cr.province_id = pr.id) > 0
      and (select count(*) from campaign_rivals cr where cr.province_id = pr.id)
        = (select count(*) from campaign_progress cp
             join campaign_rivals cr2 on cr2.id = cp.rival_id
            where cp.user_id = p_uid and cr2.province_id = pr.id)
  ) into v_prov;
  if v_prov then
    insert into profile_medals (profile_id, medal_slug) values (p_uid, 'conquistador') on conflict do nothing;
  end if;
end;
$function$;

-- ---------- Medallas ACTUALES de un jugador (permanentes + vivas) ----------
create or replace function public.player_medals(p_uid uuid)
returns text[]
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  arr    text[];
  v_won  integer;
  v_camp integer;
begin
  select coalesce(array_agg(medal_slug), '{}') into arr
    from profile_medals where profile_id = p_uid;

  select games_won, campaign_points into v_won, v_camp from profiles where id = p_uid;
  if not found then return arr; end if;

  -- Top 10 global por partidas ganadas (con al menos 1 ganada).
  if coalesce(v_won, 0) > 0
     and p_uid in (select id from profiles where not is_bot order by games_won desc limit 10) then
    arr := arr || 'top10';
  end if;

  -- Top 5 del Ranking de Argentina (con al menos 1 punto).
  if coalesce(v_camp, 0) > 0
     and p_uid in (select id from profiles where not is_bot order by campaign_points desc limit 5) then
    arr := arr || 'top5_campana';
  end if;

  -- Rey: el número 1 del Ranking de Argentina.
  if p_uid = (select id from profiles where not is_bot and campaign_points > 0
              order by campaign_points desc limit 1) then
    arr := arr || 'rey';
  end if;

  return arr;
end;
$function$;

-- ---------- La destacada, si sigue siendo válida ----------
create or replace function public.active_medal_for(p_uid uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v text;
begin
  select active_medal into v from profiles where id = p_uid;
  if v is null or v = 'ninguno' then return 'ninguno'; end if;
  if v = any (player_medals(p_uid)) then return v; end if;
  return 'ninguno';   -- era una medalla viva que ya perdió
end;
$function$;

-- ---------- Destacadas válidas de varios perfiles (para los pins) ----------
create or replace function public.get_active_medals(p_ids uuid[])
returns table (id uuid, medal text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
    select p.id, active_medal_for(p.id)
      from profiles p
     where p.id = any (p_ids)
       and active_medal_for(p.id) <> 'ninguno';
end;
$function$;

-- ---------- Elegir la destacada ----------
create or replace function public.set_active_medal(p_slug text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_slug <> 'ninguno' and not (p_slug = any (player_medals(uid))) then
    raise exception 'no tenés esta medalla';
  end if;
  update profiles set active_medal = p_slug where id = uid;
end;
$function$;

-- ---------- Triggers: otorgar solas al jugar ----------
-- Cuando cambian tus stats (ganadas, jugadas, monedas, puntos de campaña) se
-- revisan las medallas permanentes que puedas haber desbloqueado.
create or replace function public.award_medals_on_profile_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform award_event_medals(new.id, false);
  return new;
end;
$function$;

drop trigger if exists trg_award_medals on public.profiles;
create trigger trg_award_medals
  after update on public.profiles
  for each row
  when (old.games_won      is distinct from new.games_won
     or old.games_played   is distinct from new.games_played
     or old.coins          is distinct from new.coins
     or old.campaign_points is distinct from new.campaign_points)
  execute function award_medals_on_profile_change();

-- La Barrida necesita el resultado de la partida (30-0), que solo se conoce al
-- cerrar el juego; por eso va en un trigger sobre `games`.
create or replace function public.award_barrida_on_game_finish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'finished' and old.status is distinct from 'finished'
     and new.campaign_rival_id is null and new.winner_id is not null
     and ((new.player1_score = new.target_score and new.player2_score = 0)
       or (new.player2_score = new.target_score and new.player1_score = 0)) then
    perform award_event_medals(new.winner_id, true);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_award_barrida on public.games;
create trigger trg_award_barrida
  after update on public.games
  for each row
  execute function award_barrida_on_game_finish();

-- La "Racha de fuego" mira las últimas 5 del historial; hay que revisarla DESPUÉS
-- de guardar la partida recién jugada (el trigger de profiles corre antes de ese
-- insert), así que va sobre game_history.
create or replace function public.award_medals_on_history()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform award_event_medals(new.player_id, false);
  return new;
end;
$function$;

drop trigger if exists trg_award_on_history on public.game_history;
create trigger trg_award_on_history
  after insert on public.game_history
  for each row
  execute function award_medals_on_history();

-- ---------- Otorgar a los que YA cumplen (retroactivo) ----------
-- La Barrida no se puede dar retroactivamente (no guardamos el marcador viejo);
-- las demás sí, según las estadísticas actuales.
do $$
declare r record;
begin
  for r in select id from profiles where not is_bot loop
    perform award_event_medals(r.id, false);
  end loop;
end $$;
