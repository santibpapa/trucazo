-- ============================================================
-- TRUCAZO — Campaña por provincias, ETAPA 1: backend (puntos + ranking)
-- Fecha: 2026-07-05
--
-- Reestructura el modo historia: de una escalera lineal de 10 rivales a un
-- mapa de Argentina con provincias. Qué hace esta migración:
--   1. Estructura: tabla de provincias (campaign_provinces); cada rival pasa a
--      pertenecer a una provincia y gana tres números nuevos: puntaje mínimo
--      para desafiarlo, puntaje que muestra en el ranking y puntos que da al
--      vencerlo. El jugador acumula puntos en profiles.campaign_points.
--   2. Datos: 5 provincias ("ruta clásica") y el reparto de los 10 rivales
--      actuales entre ellas, con la economía de puntos calibrada.
--   3. RESET APROBADO POR EL DUEÑO: se borra el progreso de campaña existente
--      (borrón y cuenta nueva; los premios podrán volver a cobrarse).
--   4. Lógica: finish_game otorga puntos (1ª victoria = puntos grandes + plus
--      por margen; revancha = miguita con tope anti-granja). start_campaign_duel
--      pasa a destrabar por puntos (rival y provincia). Funciones nuevas
--      get_campaign_map y get_campaign_ranking para las pantallas nuevas.
--
-- La vieja get_campaign() queda intacta a propósito: la pantalla actual sigue
-- funcionando hasta que se despliegue el frontend nuevo (etapa 2). Después se
-- podrá dar de baja en una migración de limpieza.
--
-- PERILLAS de la economía (para tunear): plus por margen = 20% del premio base
-- prorrateado por la diferencia final (30-0 => +20%; 30-29 => ~+1%). Revancha
-- ganada = 10% del base, con tope acumulado de 30% del base por rival.
-- Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. ESTRUCTURA
-- ------------------------------------------------------------

-- Provincias del mapa. points_required = puntos totales para que se abra.
create table if not exists public.campaign_provinces (
  id              uuid primary key,
  order_index     integer not null unique,   -- orden de la "ruta" (1 = arranque)
  slug            text not null unique,      -- coincide con public/historia/provincia-{slug}.webp
  name            text not null,
  points_required integer not null default 0
);

-- Cada rival pertenece a una provincia y tiene su lugar en la economía de puntos.
alter table public.campaign_rivals add column if not exists province_id     uuid references public.campaign_provinces(id);
alter table public.campaign_rivals add column if not exists points_required integer not null default 0;  -- puntos del jugador para desafiarlo
alter table public.campaign_rivals add column if not exists ranking_points  integer not null default 0;  -- su puntaje fijo en el ranking
alter table public.campaign_rivals add column if not exists points_reward   integer not null default 0;  -- puntos base que da la 1ª victoria

-- Los puntos de campaña del jugador (el número que manda todo el modo).
alter table public.profiles add column if not exists campaign_points integer not null default 0;

-- Progreso por rival: cuántas veces lo venció y cuántos puntos de revancha ya
-- cobró (para el tope anti-granja).
alter table public.campaign_progress add column if not exists wins           integer not null default 1;
alter table public.campaign_progress add column if not exists rematch_points integer not null default 0;

-- La pantalla de fin de duelo muestra también los puntos ganados.
alter table public.games add column if not exists campaign_points_earned integer not null default 0;

-- ------------------------------------------------------------
-- 2. SEGURIDAD
-- ------------------------------------------------------------

alter table public.campaign_provinces enable row level security;

drop policy if exists "provincias visibles para todos" on public.campaign_provinces;
create policy "provincias visibles para todos" on public.campaign_provinces
  for select to anon, authenticated using (true);

grant select on public.campaign_provinces to anon, authenticated;

-- ------------------------------------------------------------
-- 3. DATOS: las 5 provincias y el reparto de los 10 rivales
--
-- Economía calibrada: sumando los premios base de todos los rivales previos,
-- el jugador siempre llega al requisito del siguiente sin necesidad de moler
-- revanchas (quedan como ayuda para el que pierde el plus por margen).
-- Vencer al último (el Mudo, ranking 1010) deja al jugador arriba de 1010.
-- ------------------------------------------------------------

insert into public.campaign_provinces (id, order_index, slug, name, points_required) values
  ('ca7a0000-0000-4000-b000-000000000001', 1, 'buenos-aires',        'Buenos Aires',        0),
  ('ca7a0000-0000-4000-b000-000000000002', 2, 'santa-fe',            'Santa Fe',            100),
  ('ca7a0000-0000-4000-b000-000000000003', 3, 'cordoba',             'Córdoba',             250),
  ('ca7a0000-0000-4000-b000-000000000004', 4, 'mendoza',             'Mendoza',             350),
  ('ca7a0000-0000-4000-b000-000000000005', 5, 'santiago-del-estero', 'Santiago del Estero', 600)
on conflict (id) do update
  set order_index = excluded.order_index, slug = excluded.slug,
      name = excluded.name, points_required = excluded.points_required;

update public.campaign_rivals cr
   set province_id     = v.province_id::uuid,
       points_required = v.req,
       ranking_points  = v.rank,
       points_reward   = v.base
  from (values
    -- slug        provincia                                 req   rank  base
    ('novato',    'ca7a0000-0000-4000-b000-000000000001',      0,   12,   20),
    ('vecina',    'ca7a0000-0000-4000-b000-000000000001',      0,   40,   30),
    ('carnicero', 'ca7a0000-0000-4000-b000-000000000001',      0,   75,   45),
    ('tana',      'ca7a0000-0000-4000-b000-000000000001',      0,  130,   60),
    ('tahur',     'ca7a0000-0000-4000-b000-000000000002',    110,  200,   80),
    ('patrona',   'ca7a0000-0000-4000-b000-000000000002',    180,  300,  105),
    ('maestro',   'ca7a0000-0000-4000-b000-000000000003',    260,  420,  135),
    ('campeon',   'ca7a0000-0000-4000-b000-000000000004',    360,  575,  170),
    ('coneja',    'ca7a0000-0000-4000-b000-000000000004',    490,  770,  210),
    ('mudo',      'ca7a0000-0000-4000-b000-000000000005',    650, 1010,  260)
  ) as v(slug, province_id, req, rank, base)
 where cr.slug = v.slug;

-- RESET (aprobado): el mapa nuevo arranca de cero para todos. Al borrar el
-- progreso, los premios de la escalera vieja pueden volver a cobrarse
-- ("borrón y cuenta nueva", decisión del dueño del 2026-07-04).
delete from public.campaign_progress;

-- ------------------------------------------------------------
-- 4. LÓGICA
-- ------------------------------------------------------------

-- 4a. finish_game: la rama de campaña ahora otorga puntos de ranking.
create or replace function public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  g            games%rowtype;
  v_loser_id   uuid;
  v_winner_un  text;
  v_loser_un   text;
  v_net        numeric;
  v_human      uuid;
  r_base       integer;
  r_coins      integer;
  v_margin     integer;
  v_pts        integer;
  v_crumb      integer;
  v_acc        integer;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status = 'finished' then return; end if;  -- idempotente
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;
  if p_winner_id <> g.player1_id and p_winner_id <> g.player2_id then
    raise exception 'winner is not a player of this game';
  end if;

  -- --- Duelo de campaña: sin apuesta ni estadísticas; da puntos de ranking ---
  if g.campaign_rival_id is not null then
    update games
       set status = 'finished', winner_id = p_winner_id,
           player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
     where id = p_game_id;

    select id into v_human from profiles
     where id in (g.player1_id, g.player2_id) and not is_bot limit 1;

    if v_human is not null and p_winner_id = v_human then
      select points_reward, reward_coins into r_base, r_coins
        from campaign_rivals where id = g.campaign_rival_id;
      r_base  := coalesce(r_base, 0);
      r_coins := coalesce(r_coins, 0);

      -- Margen del marcador final (a favor del humano), para el plus.
      v_margin := case when v_human = g.player1_id
                       then p_p1_score - p_p2_score else p_p2_score - p_p1_score end;
      v_margin := greatest(coalesce(v_margin, 0), 0);

      insert into campaign_progress (user_id, rival_id)
      values (v_human, g.campaign_rival_id)
      on conflict (user_id, rival_id) do nothing;

      if found then
        -- Primera victoria: monedas + puntos base + plus por margen (hasta +20%).
        v_pts := r_base + round(r_base * 0.20 * v_margin::numeric / greatest(g.target_score, 1))::int;
        update profiles
           set coins = coins + r_coins, campaign_points = campaign_points + v_pts
         where id = v_human;
        update games
           set campaign_reward = r_coins, campaign_points_earned = v_pts
         where id = p_game_id;
      else
        -- Revancha ganada: miguita (10% del base) con tope acumulado (30% del base).
        select rematch_points into v_acc from campaign_progress
         where user_id = v_human and rival_id = g.campaign_rival_id;
        v_crumb := least(floor(r_base * 0.10)::int,
                         floor(r_base * 0.30)::int - coalesce(v_acc, 0));
        v_crumb := greatest(v_crumb, 0);

        update campaign_progress
           set wins = wins + 1, rematch_points = rematch_points + v_crumb
         where user_id = v_human and rival_id = g.campaign_rival_id;

        if v_crumb > 0 then
          update profiles set campaign_points = campaign_points + v_crumb where id = v_human;
          update games set campaign_points_earned = v_crumb where id = p_game_id;
        end if;
      end if;
    end if;
    return;
  end if;

  -- --- Partida normal (vs humano): comportamiento original intacto ---
  v_loser_id  := case when p_winner_id = g.player1_id then g.player2_id else g.player1_id end;
  v_winner_un := case when p_winner_id = g.player1_id then g.player1_username else g.player2_username end;
  v_loser_un  := case when p_winner_id = g.player1_id then g.player2_username else g.player1_username end;
  v_net       := g.bet / 2.0;

  update games
     set status = 'finished', winner_id = p_winner_id,
         player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
   where id = p_game_id;

  update profiles set coins = coins + g.bet where id = p_winner_id;

  update profiles set games_played = games_played + 1, games_won = games_won + 1 where id = p_winner_id;
  update profiles set games_played = games_played + 1, games_lost = games_lost + 1 where id = v_loser_id;

  insert into game_history (player_id, opponent_id, opponent_username, result, coins_change)
  values
    (p_winner_id, v_loser_id,  v_loser_un,  'win',   v_net),
    (v_loser_id,  p_winner_id, v_winner_un, 'loss', -v_net);
end;
$function$;

-- 4b. start_campaign_duel: el desbloqueo ya no es "venciste al anterior" sino
-- por puntos: alcanza el requisito del rival Y el de su provincia. El resto
-- (limpieza de duelos colgados, reparto, mesa) queda igual.
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

  select * into pv from campaign_provinces where id = r.province_id;
  if v_pts < pv.points_required then raise exception 'todavía no desbloqueaste esta provincia'; end if;
  if v_pts < r.points_required then raise exception 'todavía no desbloqueaste este rival'; end if;

  delete from tables t
   where t.creator_id = uid
     and exists (select 1 from games gg
                 where gg.id = t.id and gg.campaign_rival_id is not null and gg.status = 'playing');

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

  return g;
end;
$function$;

-- 4c. get_campaign_map: todo lo que necesita la pantalla nueva del mapa.
-- Devuelve los puntos del jugador y las provincias con sus rivales (cada uno
-- con vencido/desbloqueado calculado para el jugador actual).
create or replace function public.get_campaign_map()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid         uuid := auth.uid();
  v_pts       integer;
  v_provinces jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select campaign_points into v_pts from profiles where id = uid;
  v_pts := coalesce(v_pts, 0);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'order_index', p.order_index,
      'slug', p.slug,
      'name', p.name,
      'points_required', p.points_required,
      'unlocked', (v_pts >= p.points_required),
      'rivals', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', cr.id,
          'order_index', cr.order_index,
          'slug', cr.slug,
          'display_name', cr.display_name,
          'tagline', cr.tagline,
          'difficulty', cr.difficulty,
          'target_score', cr.target_score,
          'reward_coins', cr.reward_coins,
          'points_required', cr.points_required,
          'ranking_points', cr.ranking_points,
          'points_reward', cr.points_reward,
          'beaten', (cp.user_id is not null),
          'unlocked', (v_pts >= p.points_required and v_pts >= cr.points_required)
        ) order by cr.points_required, cr.order_index), '[]'::jsonb)
        from campaign_rivals cr
        left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
        where cr.province_id = p.id
      )
    ) order by p.order_index), '[]'::jsonb)
  into v_provinces
  from campaign_provinces p;

  return jsonb_build_object('points', v_pts, 'provinces', v_provinces);
end;
$function$;

-- 4d. get_campaign_ranking: el Ranking de Argentina. Todos los rivales (con su
-- puntaje fijo) + el jugador actual (con sus puntos), ordenados de mayor a
-- menor. En empate el bot queda arriba: para pasarlo hay que superarlo.
create or replace function public.get_campaign_ranking()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid      uuid := auth.uid();
  v_pts    integer;
  v_name   text;
  v_result jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select username, coalesce(campaign_points, 0) into v_name, v_pts
    from profiles where id = uid;
  if v_name is null then raise exception 'perfil no encontrado'; end if;

  with entries as (
    select cr.display_name as name, cr.slug as slug, cr.ranking_points as points,
           false as is_user, (cp.user_id is not null) as beaten, pv.slug as province
      from campaign_rivals cr
      join campaign_provinces pv on pv.id = cr.province_id
      left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
    union all
    select v_name, null, v_pts, true, null, null
  ), ordered as (
    select e.*, row_number() over (order by e.points desc, e.is_user asc, e.name) as position
      from entries e
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'position', o.position,
           'name', o.name,
           'slug', o.slug,
           'points', o.points,
           'is_user', o.is_user,
           'beaten', o.beaten,
           'province', o.province
         ) order by o.position), '[]'::jsonb)
    into v_result
    from ordered o;

  return v_result;
end;
$function$;

grant execute on function public.get_campaign_map() to authenticated;
grant execute on function public.get_campaign_ranking() to authenticated;

commit;
