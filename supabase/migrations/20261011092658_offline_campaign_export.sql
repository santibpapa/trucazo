-- Descarga inicial de Historia: una foto privada consistente de la cuenta.
-- Solo lectura. No acredita partidas ni premios offline.
begin;

create or replace function public.export_offline_campaign()
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then
    raise exception 'Entrá con una cuenta registrada.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'version', 'historia-local-v1', 'engine_version', 'historia-bots-v1',
    'userId', uid, 'exported_at', statement_timestamp(),
    'points', p.campaign_points, 'coins', p.coins,
    'style', jsonb_build_object(
      'hands_played', coalesce(s.hands_played,0), 'envido_sung', coalesce(s.envido_sung,0),
      'envido_bluff', coalesce(s.envido_bluff,0), 'envido_folded', coalesce(s.envido_folded,0),
      'truco_sung', coalesce(s.truco_sung,0), 'truco_bluff', coalesce(s.truco_bluff,0),
      'truco_folded', coalesce(s.truco_folded,0)),
    'progress', coalesce((select jsonb_agg(jsonb_build_object(
      'rival_id', cp.rival_id, 'beaten_at', cp.beaten_at, 'wins', cp.wins, 'rematch_points', cp.rematch_points)
      order by cp.rival_id) from public.campaign_progress cp where cp.user_id = uid), '[]'::jsonb),
    'catalog', jsonb_build_object(
      'provinces', (select jsonb_agg(jsonb_build_object(
        'id', pv.id, 'order_index', pv.order_index, 'slug', pv.slug, 'name', pv.name,
        'points_required', pv.points_required, 'required_rival_id', pv.required_rival_id)
        order by pv.points_required,pv.order_index) from public.campaign_provinces pv),
      'rivals', (select jsonb_agg(jsonb_build_object(
        'id', r.id, 'order_index', r.order_index, 'slug', r.slug, 'display_name', r.display_name,
        'tagline', r.tagline, 'difficulty', r.difficulty, 'target_score', r.target_score,
        'reward_coins', r.reward_coins, 'bot_id', r.bot_id, 'province_id', r.province_id,
        'points_required', r.points_required, 'ranking_points', r.ranking_points,
        'points_reward', r.points_reward, 'trait_liar', r.trait_liar,
        'trait_aggressive', r.trait_aggressive, 'strategy_profile', r.strategy_profile)
        order by r.order_index) from public.campaign_rivals r)))
  into result from public.profiles p left join public.campaign_style s on s.user_id = p.id
  where p.id = uid and not p.is_bot;
  if result is null then raise exception 'Cuenta no disponible.' using errcode = '42501'; end if;
  return result;
end;
$function$;

revoke all on function public.export_offline_campaign() from public, anon;
grant execute on function public.export_offline_campaign() to authenticated;
commit;
