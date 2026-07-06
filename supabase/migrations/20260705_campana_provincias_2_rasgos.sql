-- ============================================================
-- TRUCAZO — Campaña por provincias, ETAPA 2b: rasgos de personalidad
-- Fecha: 2026-07-05
--
-- Cada rival gana dos rasgos visibles (1..10): qué tan MENTIROSO es (miente el
-- envido, farolea el truco) y qué tan AGRESIVO (canta y presiona seguido). La
-- pantalla los muestra como barras junto a la dificultad, y quedan sembrados
-- como base para el bot y el sistema de reputación futuro (hoy el cerebro del
-- bot sigue usando solo difficulty; el tuneo fino por rasgo vendrá después).
-- Idempotente.
-- ============================================================

begin;

alter table public.campaign_rivals add column if not exists trait_liar       smallint not null default 5;
alter table public.campaign_rivals add column if not exists trait_aggressive smallint not null default 5;

update public.campaign_rivals cr
   set trait_liar = v.liar, trait_aggressive = v.aggr
  from (values
    -- slug        mentiroso  agresivo   (fiel a la personalidad de cada uno)
    ('novato',       1,         2),
    ('vecina',       2,         2),
    ('carnicero',    2,         8),
    ('tana',         3,         4),
    ('tahur',        8,         5),
    ('patrona',      5,         7),
    ('maestro',      8,         6),
    ('campeon',      7,         9),
    ('coneja',       6,         8),
    ('mudo',         9,         7)
  ) as v(slug, liar, aggr)
 where cr.slug = v.slug;

-- get_campaign_map ahora incluye los dos rasgos en cada rival.
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
          'trait_liar', cr.trait_liar,
          'trait_aggressive', cr.trait_aggressive,
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

commit;
