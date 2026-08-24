-- ============================================================
-- TRUCAZO — La ficha completa de UNA persona (para el panel del admin)
-- Fecha: 2026-08-25
--
-- El panel ya mostraba la lista de gente. Faltaba poder apretar a una y ver
-- todo lo suyo. Eso hace admin_player(): junta en un solo pedido TODO lo que
-- la base sabe de esa persona.
--
--   * PERFIL     — nombre, foto, email, con qué se anotó, monedas, qué tiene
--                  puesto (marco, medalla, salón, accesorio).
--   * RANKING    — su puesto en el ranking online y en el de la campaña, y su
--                  "fama" (0 a 100), calculada con la MISMA cuenta que ve el
--                  jugador en Historia, así los dos números coinciden.
--   * RESUMEN    — partidas, ganadas, perdidas, efectividad, racha actual,
--                  mejor racha, monedas ganadas y perdidas, días que jugó.
--   * POR MODO   — lo mismo pero separado: contra personas, contra los bots
--                  del lobby, y en el modo campaña. Son tres juegos distintos
--                  y mezclarlos miente.
--   * CAMPAÑA    — cuántos rivales venció de cada provincia, y su estilo de
--                  juego (cuánto miente, cuánto se achica, cuán agresivo es),
--                  que la base ya venía midiendo en campaign_style.
--   * RIVALES    — contra quiénes jugó más y cómo le fue con cada uno.
--   * ACTIVIDAD  — sus partidas día por día.
--   * HISTORIAL  — las últimas 60 partidas, una por una, con marcador.
--
-- Solo responde si quien llama es admin. Todo en hora de Argentina.
-- Idempotente.
-- ============================================================

begin;

create or replace function public.admin_player(p_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare
  v_is_admin boolean;
  tz         text := 'America/Argentina/Buenos_Aires';
  today      date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  fama_cap   constant int := 2000;  -- los mismos números que ve el jugador
  manos_min  constant int := 8;
  result     jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select is_admin into v_is_admin from profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'solo el admin puede ver esto';
  end if;

  if not exists (select 1 from profiles where id = p_id and is_bot = false) then
    raise exception 'esa persona no existe';
  end if;

  with
  -- ----------------------------------------------------------
  -- Todas sus partidas, ya clasificadas por modo y por resultado.
  -- ----------------------------------------------------------
  mias as (
    select
      g.id,
      g.created_at,
      g.updated_at,
      g.status,
      g.bet,
      g.target_score,
      g.campaign_rival_id,
      (g.created_at at time zone tz)::date            as dia,
      case when g.player1_id = p_id then g.player2_id else g.player1_id end       as rival_id,
      case when g.player1_id = p_id then g.player2_username else g.player1_username end as rival_nombre,
      case when g.player1_id = p_id then g.player1_score else g.player2_score end as mi_puntaje,
      case when g.player1_id = p_id then g.player2_score else g.player1_score end as su_puntaje,
      case
        when g.status <> 'finished'      then 'en_curso'
        when g.winner_id is null         then 'anulada'
        when g.winner_id = p_id          then 'ganada'
        else 'perdida'
      end as resultado
    from games g
    where g.player1_id = p_id or g.player2_id = p_id
  ),
  con_modo as (
    select m.*,
           r.is_bot     as rival_bot,
           r.avatar_url as rival_avatar,
           case
             when m.campaign_rival_id is not null then 'campana'
             when r.is_bot                        then 'bot'
             else 'personas'
           end as modo
    from mias m
    left join profiles r on r.id = m.rival_id
  ),
  terminadas as (
    select * from con_modo where resultado in ('ganada', 'perdida')
  ),

  -- ----------------------------------------------------------
  -- Rachas. Se ordenan las partidas terminadas de la más nueva a la más
  -- vieja y se agrupan las seguidas que salieron igual ("islas").
  -- ----------------------------------------------------------
  ordenadas as (
    select (resultado = 'ganada') as gano,
           row_number() over (order by created_at desc) as rn
    from terminadas
  ),
  islas as (
    select gano, rn,
           rn - row_number() over (partition by gano order by rn) as isla
    from ordenadas
  ),
  actual as (
    select gano, isla from islas where rn = 1
  ),

  -- ----------------------------------------------------------
  -- Puestos en los dos rankings (el online es por partidas ganadas; el de la
  -- campaña, por puntos). Se cuentan solo personas, nunca bots.
  -- ----------------------------------------------------------
  yo as (
    select p.*, coalesce(u.is_anonymous, false) as anonimo,
           u.email, u.last_sign_in_at
    from profiles p
    left join auth.users u on u.id = p.id
    where p.id = p_id
  ),
  estilo as (select * from campaign_style where user_id = p_id)

  select jsonb_build_object(
    'generado_at', now(),

    'perfil', (
      select jsonb_build_object(
        'id', y.id,
        'nombre', y.username,
        'avatar_url', y.avatar_url,
        'creado_at', y.created_at,
        'tipo', case when y.anonimo then 'invitado'
                     when y.username is not null and exists (
                       select 1 from auth.users u2
                       where u2.id = y.id and u2.raw_app_meta_data->>'provider' = 'google')
                     then 'google' else 'email' end,
        'email', y.email,
        'es_admin', y.is_admin,
        'monedas', y.coins,
        'marco', y.active_frame,
        'medalla', y.active_medal,
        'salon', y.active_salon,
        'accesorio', y.active_accessory,
        'ultima_sesion', y.last_sign_in_at,
        'visto_at', (select last_seen_at from user_presence where user_id = p_id),
        'medallas', to_jsonb(player_medals(p_id))
      ) from yo y
    ),

    'ranking', (
      select jsonb_build_object(
        'online_puesto', case when y.games_won > 0 then (
            select count(*) + 1 from profiles o
            where o.is_bot = false and o.games_won > y.games_won) end,
        'online_total', (select count(*) from profiles where is_bot = false and games_won > 0),
        'campana_puesto', case when y.campaign_points > 0 then (
            select count(*) + 1 from profiles o
            where o.is_bot = false and o.campaign_points > y.campaign_points) end,
        'campana_total', (select count(*) from profiles where is_bot = false and campaign_points > 0),
        'campana_puntos', y.campaign_points,
        'fama', least(100, (coalesce(y.campaign_points, 0) * 100) / fama_cap)
      ) from yo y
    ),

    'resumen', jsonb_build_object(
      'partidas',       (select count(*) from con_modo),
      'ganadas',        (select count(*) from con_modo where resultado = 'ganada'),
      'perdidas',       (select count(*) from con_modo where resultado = 'perdida'),
      'en_curso',       (select count(*) from con_modo where resultado = 'en_curso'),
      'anuladas',       (select count(*) from con_modo where resultado = 'anulada'),
      'efectividad',    (select case when count(*) = 0 then null
                                else round(count(*) filter (where resultado = 'ganada') * 100.0
                                           / count(*)) end from terminadas),
      'racha',          (select count(*) from islas i join actual a
                          on i.gano = a.gano and i.isla = a.isla),
      'racha_ganando',  (select gano from actual),
      'mejor_racha',    (select coalesce(max(c), 0) from
                          (select count(*) c from islas where gano group by isla) t),
      'dias_jugados',   (select count(distinct dia) from con_modo),
      'primera_partida',(select min(created_at) from con_modo),
      'ultima_partida', (select max(created_at) from con_modo),
      'monedas_ganadas',(select coalesce(sum(coins_change), 0) from game_history
                          where player_id = p_id and coins_change > 0),
      'monedas_perdidas',(select coalesce(-sum(coins_change), 0) from game_history
                          where player_id = p_id and coins_change < 0),
      'minutos_jugados',(select coalesce(round(sum(extract(epoch from (updated_at - created_at))) / 60), 0)
                          from con_modo where resultado in ('ganada', 'perdida'))
    ),

    -- Los tres modos, siempre los tres (aunque estén en cero: que falte una
    -- fila se lee como un error, y un cero se lee como un cero).
    'por_modo', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'modo', m.modo,
               'partidas',    coalesce(c.partidas, 0),
               'ganadas',     coalesce(c.ganadas, 0),
               'perdidas',    coalesce(c.perdidas, 0),
               'efectividad', c.efectividad
             ) order by m.orden), '[]'::jsonb)
      from (values ('personas', 1), ('bot', 2), ('campana', 3)) as m(modo, orden)
      left join (
        select modo,
               count(*)                                          as partidas,
               count(*) filter (where resultado = 'ganada')       as ganadas,
               count(*) filter (where resultado = 'perdida')      as perdidas,
               case when count(*) filter (where resultado in ('ganada','perdida')) = 0 then null
                    else round(count(*) filter (where resultado = 'ganada') * 100.0
                         / count(*) filter (where resultado in ('ganada','perdida'))) end as efectividad
        from con_modo group by modo
      ) c on c.modo = m.modo
    ),

    'campana', jsonb_build_object(
      'vencidos', (select count(*) from campaign_progress where user_id = p_id),
      'total',    (select count(*) from campaign_rivals),
      'provincias', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'nombre', t.name, 'vencidos', t.vencidos, 'total', t.total
               ) order by t.order_index), '[]'::jsonb)
        from (
          select pv.name, pv.order_index,
                 count(cr.id) as total,
                 count(cp.user_id) as vencidos
          from campaign_provinces pv
          join campaign_rivals cr on cr.province_id = pv.id
          left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = p_id
          group by pv.id, pv.name, pv.order_index
        ) t
      ),
      -- El mismo cálculo que ve el jugador en Historia (no una versión aparte).
      'estilo', (
        select jsonb_build_object(
          'conocido',  coalesce(e.hands_played, 0) >= manos_min,
          'manos',     coalesce(e.hands_played, 0),
          'mentiroso', round((coalesce(e.envido_bluff,0) + coalesce(e.truco_bluff,0))::numeric
                       / greatest(1, coalesce(e.envido_sung,0) + coalesce(e.truco_sung,0)) * 100),
          'achicado',  round(least(1, (coalesce(e.envido_folded,0) + coalesce(e.truco_folded,0))::numeric
                       / greatest(1, coalesce(e.hands_played,0)) * 2) * 100),
          'agresivo',  round(least(1, (coalesce(e.envido_sung,0) + coalesce(e.truco_sung,0))::numeric
                       / greatest(1, coalesce(e.hands_played,0)) / 1.5) * 100)
        )
        from (select * from estilo union all
              select null, 0, 0, 0, 0, 0, 0, 0, null
              where not exists (select 1 from estilo)) e
      )
    ),

    'rivales', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'nombre', t.rival_nombre, 'es_bot', t.rival_bot, 'avatar_url', t.rival_avatar,
               'partidas', t.partidas, 'ganadas', t.ganadas, 'perdidas', t.perdidas
             ) order by t.partidas desc, t.rival_nombre), '[]'::jsonb)
      from (
        select rival_nombre, bool_or(rival_bot) as rival_bot, min(rival_avatar) as rival_avatar,
               count(*) as partidas,
               count(*) filter (where resultado = 'ganada')  as ganadas,
               count(*) filter (where resultado = 'perdida') as perdidas
        from con_modo group by rival_nombre
        order by count(*) desc, rival_nombre limit 10
      ) t
    ),

    'actividad', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'dia', d.dia, 'partidas', coalesce(c.cnt, 0)
             ) order by d.dia), '[]'::jsonb)
      from generate_series(today - 59, today, interval '1 day') as d(dia)
      left join (select dia, count(*) as cnt from con_modo group by dia) c
             on c.dia = d.dia::date
    ),

    'historial', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', t.id, 'fecha', t.created_at, 'modo', t.modo,
               'rival', t.rival_nombre, 'rival_bot', t.rival_bot,
               'resultado', t.resultado,
               'mi_puntaje', t.mi_puntaje, 'su_puntaje', t.su_puntaje,
               'apuesta', t.bet / 2, 'objetivo', t.target_score,
               'minutos', case when t.resultado in ('ganada', 'perdida')
                               then round(extract(epoch from (t.updated_at - t.created_at)) / 60)
                          end
             ) order by t.created_at desc), '[]'::jsonb)
      from (select * from con_modo order by created_at desc limit 60) t
    ),

    'colecciones', jsonb_build_object(
      'salones',    (select count(*) from profile_salons      where profile_id = p_id),
      'marcos',     (select count(*) from profile_frames      where profile_id = p_id),
      'accesorios', (select count(*) from profile_accessories where profile_id = p_id),
      'medallas',   (select count(*) from profile_medals      where profile_id = p_id)
    ),

    'social', jsonb_build_object(
      'amigos',   (select count(*) from friendships
                    where status = 'accepted' and (requester_id = p_id or addressee_id = p_id)),
      'mensajes', (select count(*) from chat_messages where user_id = p_id),
      'resenas',  (select count(*) from feedback where user_id = p_id)
    )
  ) into result;

  return result;
end;
$function$;

-- La función se defiende sola (chequea is_admin). Se otorga a usuarios logueados.
grant execute on function public.admin_player(uuid) to authenticated;

commit;
