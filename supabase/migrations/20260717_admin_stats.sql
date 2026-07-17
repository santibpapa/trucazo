-- ============================================================
-- TRUCAZO — Panel de estadísticas del admin (datos del juego)
-- Fecha: 2026-07-17
--
-- admin_stats() junta en un solo pedido los números para la página secreta
-- /admin: totales de un vistazo + registros por día + partidas por día.
-- Solo responde si quien llama es admin (profiles.is_admin); a cualquier otro
-- le tira error. Toda la cuenta es server-side (regla de la casa).
--
-- Todo se calcula en HORA DE ARGENTINA, así "hoy" es el día de acá.
-- Los bots del modo historia no cuentan como usuarios ni como jugadores.
-- ============================================================

begin;

create or replace function public.admin_stats(p_days int default 14)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_is_admin boolean;
  tz    text := 'America/Argentina/Buenos_Aires';
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select is_admin into v_is_admin from profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'solo el admin puede ver esto';
  end if;

  select jsonb_build_object(
    -- Tarjetas de un vistazo
    'totales', jsonb_build_object(
      'usuarios', (select count(*) from profiles where is_bot = false),
      'registrados_hoy', (
        select count(*) from profiles
        where is_bot = false
          and (created_at at time zone tz)::date = today
      ),
      'jugaron_hoy', (
        select count(distinct x.p) from games g
        cross join lateral (values (g.player1_id), (g.player2_id)) as x(p)
        join profiles pr on pr.id = x.p and pr.is_bot = false
        where (g.created_at at time zone tz)::date = today
      ),
      'partidas_hoy', (
        select count(*) from games
        where (created_at at time zone tz)::date = today
      )
    ),
    -- Registros por día (una barra por día, incluye los días en cero)
    'registros_por_dia', (
      select coalesce(jsonb_agg(
               jsonb_build_object('dia', d.dia, 'cantidad', coalesce(c.cnt, 0))
               order by d.dia), '[]'::jsonb)
      from generate_series(today - (p_days - 1), today, interval '1 day') as d(dia)
      left join (
        select (created_at at time zone tz)::date as dia, count(*) as cnt
        from profiles where is_bot = false
        group by 1
      ) c on c.dia = d.dia::date
    ),
    -- Partidas por día (+ jugadores distintos ese día)
    'partidas_por_dia', (
      select coalesce(jsonb_agg(
               jsonb_build_object('dia', d.dia,
                                  'partidas', coalesce(c.partidas, 0),
                                  'jugadores', coalesce(c.jugadores, 0))
               order by d.dia), '[]'::jsonb)
      from generate_series(today - (p_days - 1), today, interval '1 day') as d(dia)
      left join (
        select (g.created_at at time zone tz)::date as dia,
               count(distinct g.id) as partidas,
               count(distinct x.p) filter (where pr.is_bot = false) as jugadores
        from games g
        cross join lateral (values (g.player1_id), (g.player2_id)) as x(p)
        join profiles pr on pr.id = x.p
        group by 1
      ) c on c.dia = d.dia::date
    )
  ) into result;

  return result;
end;
$function$;

-- La función se defiende sola (chequea is_admin). Se otorga a usuarios logueados.
grant execute on function public.admin_stats(int) to authenticated;

commit;
