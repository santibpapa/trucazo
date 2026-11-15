-- Panel de admin más liviano (15/11/2026).
--
-- Antes, cada vez que se abría /admin, admin_stats mandaba la ficha de TODAS
-- las personas registradas (4.109 el 15/11, unos 2 MB) para que la lista
-- buscara y filtrara en el navegador. Tardaba 2 a 3 segundos y crecía con cada
-- registro.
--
-- Ahora:
-- 1. admin_stats acepta p_personas. La web pide false y no recibe la lista.
--    El valor por defecto sigue siendo true, así las versiones de la app ya
--    instaladas (que llaman sólo con p_days) reciben lo mismo que antes.
-- 2. admin_people devuelve de a una página (50 por defecto) ya buscada,
--    filtrada y ordenada en el servidor, con el total de lo que coincide.
begin;

drop function if exists public.admin_stats(int);

create function public.admin_stats(p_days int default 30, p_personas boolean default true)
 returns jsonb language plpgsql security definer set search_path to 'public', 'auth'
as $function$
declare
  v_is_admin boolean;
  tz     text := 'America/Argentina/Buenos_Aires';
  today  date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_days int  := greatest(1, least(coalesce(p_days, 30), 180));  -- techo sano
  since  date;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select is_admin into v_is_admin from profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'solo el admin puede ver esto';
  end if;

  since := today - (v_days - 1);

  with
  -- ----------------------------------------------------------
  -- Las PERSONAS (todo lo que no es bot), con el tipo de cuenta.
  -- Los invitados entran con una cuenta anónima de Supabase.
  -- ----------------------------------------------------------
  personas as (
    select
      p.id,
      p.username,
      p.avatar_url,
      p.created_at,
      (p.created_at at time zone tz)::date as dia_alta,
      case
        when coalesce(u.is_anonymous, false) then 'invitado'
        when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google'
        else 'email'
      end as tipo,
      u.email,
      u.last_sign_in_at,
      p.coins,
      p.campaign_points
    from profiles p
    left join auth.users u on u.id = p.id
    where p.is_bot = false
  ),

  -- ----------------------------------------------------------
  -- Una fila por (partida, persona que la jugó). La partida contra un bot
  -- deja una sola fila; la partida entre dos personas deja dos.
  -- ----------------------------------------------------------
  jugadas as (
    select
      g.id                                   as game_id,
      x.yo                                   as player_id,
      (g.created_at at time zone tz)::date   as dia,
      g.created_at,
      g.status,
      g.winner_id,
      (g.campaign_rival_id is not null)      as es_campana,
      rival.is_bot                           as rival_bot
    from games g
    cross join lateral (values (g.player1_id, g.player2_id),
                               (g.player2_id, g.player1_id)) as x(yo, rival)
    join profiles yo    on yo.id    = x.yo    and yo.is_bot = false
    join profiles rival on rival.id = x.rival
  ),

  -- Resumen de juego de cada persona (de toda la historia, no solo la ventana).
  por_persona as (
    select
      player_id,
      count(*)                                                          as partidas,
      count(*) filter (where not rival_bot)                             as partidas_personas,
      count(*) filter (where rival_bot)                                 as partidas_maquina,
      count(*) filter (where winner_id = player_id)                     as ganadas,
      count(*) filter (where status = 'finished'
                         and winner_id is not null
                         and winner_id <> player_id)                    as perdidas,
      count(distinct dia)                                               as dias_jugados,
      min(created_at)                                                   as primera_partida,
      max(created_at)                                                   as ultima_partida
    from jugadas
    group by player_id
  ),

  -- ----------------------------------------------------------
  -- La grilla de días (incluye los días en cero, si no el gráfico miente).
  -- ----------------------------------------------------------
  dias as (
    select d::date as dia
    from generate_series(since, today, interval '1 day') d
  ),
  altas_dia as (
    select dia_alta as dia,
           count(*)                                    as registros,
           count(*) filter (where tipo <> 'invitado')  as con_cuenta,
           count(*) filter (where tipo = 'invitado')   as invitados
    from personas
    group by dia_alta
  ),
  juego_dia as (
    select dia,
           count(distinct player_id)                                  as activos,
           count(distinct game_id)                                    as partidas,
           count(distinct game_id) filter (where not rival_bot)       as partidas_personas
    from jugadas
    group by dia
  ),

  -- Cohorte: los que se anotaron DENTRO de la ventana (para el embudo).
  cohorte as (
    select p.id,
           coalesce(j.partidas, 0)     as partidas,
           coalesce(j.dias_jugados, 0) as dias_jugados
    from personas p
    left join por_persona j on j.player_id = p.id
    where p.dia_alta >= since
  )

  select jsonb_build_object(
    'generado_at', now(),
    'dias', v_days,
    'desde', since,
    'hasta', today,

    -- ----------------------------------------------------------
    -- La foto de hoy
    -- ----------------------------------------------------------
    'totales', jsonb_build_object(
      'personas',        (select count(*) from personas),
      'con_cuenta',      (select count(*) from personas where tipo <> 'invitado'),
      'invitados',       (select count(*) from personas where tipo = 'invitado'),
      'nuevos_hoy',      (select count(*) from personas where dia_alta = today),
      'nuevos_ayer',     (select count(*) from personas where dia_alta = today - 1),
      'nuevos_7d',       (select count(*) from personas where dia_alta > today - 7),
      'nuevos_previos_7d',(select count(*) from personas
                            where dia_alta > today - 14 and dia_alta <= today - 7),
      'jugaron_hoy',     (select count(distinct player_id) from jugadas where dia = today),
      'jugaron_ayer',    (select count(distinct player_id) from jugadas where dia = today - 1),
      'jugaron_7d',      (select count(distinct player_id) from jugadas where dia > today - 7),
      'jugaron_previos_7d',(select count(distinct player_id) from jugadas
                             where dia > today - 14 and dia <= today - 7),
      'jugaron_alguna_vez',(select count(*) from por_persona),
      'partidas_hoy',    (select count(distinct game_id) from jugadas where dia = today),
      'partidas_ayer',   (select count(distinct game_id) from jugadas where dia = today - 1),
      'partidas_7d',     (select count(distinct game_id) from jugadas where dia > today - 7),
      'partidas_previos_7d',(select count(distinct game_id) from jugadas
                              where dia > today - 14 and dia <= today - 7),
      'partidas_total',  (select count(distinct game_id) from jugadas),
      'partidas_personas_total', (select count(distinct game_id) from jugadas where not rival_bot),
      'partidas_maquina_total',  (select count(distinct game_id) from jugadas where rival_bot),
      'en_curso',        (select count(*) from games where status = 'playing'),
      'mesas_esperando', (select count(*) from tables where status = 'waiting'),
      'online_ahora',    (select count(*) from user_presence up
                           join profiles pr on pr.id = up.user_id and pr.is_bot = false
                          where up.last_seen_at > now() - interval '3 minutes'),
      'resenas',         (select count(*) from feedback),
      'resenas_7d',      (select count(*) from feedback
                           where (created_at at time zone tz)::date > today - 7),
      'resenas_puntaje', (select round(avg(rating_general)::numeric, 1)
                            from feedback where rating_general is not null)
    ),

    -- ----------------------------------------------------------
    -- Un renglón por día (para los gráficos)
    -- ----------------------------------------------------------
    'serie', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'dia',               d.dia,
               'registros',         coalesce(a.registros, 0),
               'registros_cuenta',  coalesce(a.con_cuenta, 0),
               'registros_invitado',coalesce(a.invitados, 0),
               'activos',           coalesce(j.activos, 0),
               'partidas',          coalesce(j.partidas, 0),
               'partidas_personas', coalesce(j.partidas_personas, 0)
             ) order by d.dia), '[]'::jsonb)
      from dias d
      left join altas_dia a on a.dia = d.dia
      left join juego_dia j on j.dia = d.dia
    ),

    -- ----------------------------------------------------------
    -- Quién y cuándo: la lista de personas, la más nueva primero.
    -- ----------------------------------------------------------
    -- Sólo si la piden (la app instalada sí; la web ya no, usa admin_people).
    'personas', case when p_personas then (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id',                p.id,
               'nombre',            p.username,
               'avatar_url',        p.avatar_url,
               'creado_at',         p.created_at,
               'tipo',              p.tipo,
               'email',             p.email,
               'monedas',           p.coins,
               'puntos_campana',    p.campaign_points,
               'partidas',          coalesce(j.partidas, 0),
               'partidas_personas', coalesce(j.partidas_personas, 0),
               'partidas_maquina',  coalesce(j.partidas_maquina, 0),
               'ganadas',           coalesce(j.ganadas, 0),
               'perdidas',          coalesce(j.perdidas, 0),
               'dias_jugados',      coalesce(j.dias_jugados, 0),
               'primera_partida',   j.primera_partida,
               'ultima_partida',    j.ultima_partida,
               'ultima_sesion',     p.last_sign_in_at,
               'visto_at',          up.last_seen_at
             ) order by p.created_at desc), '[]'::jsonb)
      from personas p
      left join por_persona   j  on j.player_id = p.id
      left join user_presence up on up.user_id  = p.id
    ) end,

    -- ----------------------------------------------------------
    -- Embudo: de los que se anotaron en la ventana, ¿hasta dónde llegaron?
    -- ----------------------------------------------------------
    'embudo', jsonb_build_object(
      'registrados',   (select count(*) from cohorte),
      'jugaron_una',   (select count(*) from cohorte where partidas >= 1),
      'jugaron_tres',  (select count(*) from cohorte where partidas >= 3),
      'volvieron',     (select count(*) from cohorte where dias_jugados >= 2)
    ),

    -- ----------------------------------------------------------
    -- A qué hora se juega (las 24 horas, siempre completas)
    -- ----------------------------------------------------------
    'horarios', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'hora', h.hora, 'partidas', coalesce(c.cnt, 0)
             ) order by h.hora), '[]'::jsonb)
      from generate_series(0, 23) as h(hora)
      left join (
        select extract(hour from (created_at at time zone tz))::int as hora,
               count(distinct game_id) as cnt
        from jugadas
        where dia >= since
        group by 1
      ) c on c.hora = h.hora
    )
  ) into result;

  return result;
end;
$function$;

revoke all on function public.admin_stats(int, boolean) from public, anon;
grant execute on function public.admin_stats(int, boolean) to authenticated;


-- ------------------------------------------------------------
-- La lista de personas del panel, de a una página.
--   p_query  : busca en nombre o email (sin distinguir mayúsculas).
--   p_filter : todos | jugaron | no_jugaron | con_cuenta | invitados
--   p_order  : creado_at | partidas | ganadas | dias_jugados | ultima_partida
--              (siempre de mayor a menor; a igual valor, la más nueva primero)
-- Cada persona trae dia_cantidad: cuántas de las que coinciden se anotaron ese
-- mismo día, para el renglón de día de la lista aunque no estén todas cargadas.
-- ------------------------------------------------------------
create function public.admin_people(
  p_query  text default null,
  p_filter text default 'todos',
  p_order  text default 'creado_at',
  p_limit  int  default 50,
  p_offset int  default 0
)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'auth'
as $function$
declare
  v_is_admin boolean;
  tz      text := 'America/Argentina/Buenos_Aires';
  v_q     text := nullif(lower(btrim(coalesce(p_query, ''))), '');
  v_limit int  := greatest(1, least(coalesce(p_limit, 50), 200));
  v_off   int  := greatest(0, coalesce(p_offset, 0));
  result  jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select is_admin into v_is_admin from profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'solo el admin puede ver esto';
  end if;

  with
  personas as (
    select
      p.id,
      p.username,
      p.avatar_url,
      p.created_at,
      (p.created_at at time zone tz)::date as dia_alta,
      case
        when coalesce(u.is_anonymous, false) then 'invitado'
        when coalesce(u.raw_app_meta_data->>'provider', '') = 'google' then 'google'
        else 'email'
      end as tipo,
      u.email,
      u.last_sign_in_at,
      p.coins,
      p.campaign_points
    from profiles p
    left join auth.users u on u.id = p.id
    where p.is_bot = false
      and (v_q is null
           or strpos(lower(p.username), v_q) > 0
           or strpos(lower(coalesce(u.email, '')), v_q) > 0)
  ),
  -- Igual que en admin_stats: una fila por (partida, persona que la jugó).
  jugadas as (
    select
      g.id                                   as game_id,
      x.yo                                   as player_id,
      (g.created_at at time zone tz)::date   as dia,
      g.created_at,
      g.status,
      g.winner_id,
      rival.is_bot                           as rival_bot
    from games g
    cross join lateral (values (g.player1_id, g.player2_id),
                               (g.player2_id, g.player1_id)) as x(yo, rival)
    join personas yo    on yo.id    = x.yo
    join profiles rival on rival.id = x.rival
  ),
  por_persona as (
    select
      player_id,
      count(*)                                                          as partidas,
      count(*) filter (where not rival_bot)                             as partidas_personas,
      count(*) filter (where rival_bot)                                 as partidas_maquina,
      count(*) filter (where winner_id = player_id)                     as ganadas,
      count(*) filter (where status = 'finished'
                         and winner_id is not null
                         and winner_id <> player_id)                    as perdidas,
      count(distinct dia)                                               as dias_jugados,
      min(created_at)                                                   as primera_partida,
      max(created_at)                                                   as ultima_partida
    from jugadas
    group by player_id
  ),
  filtradas as (
    select
      p.*,
      coalesce(j.partidas, 0)          as partidas,
      coalesce(j.partidas_personas, 0) as partidas_personas,
      coalesce(j.partidas_maquina, 0)  as partidas_maquina,
      coalesce(j.ganadas, 0)           as ganadas,
      coalesce(j.perdidas, 0)          as perdidas,
      coalesce(j.dias_jugados, 0)      as dias_jugados,
      j.primera_partida,
      j.ultima_partida
    from personas p
    left join por_persona j on j.player_id = p.id
    where case p_filter
            when 'jugaron'    then coalesce(j.partidas, 0) > 0
            when 'no_jugaron' then coalesce(j.partidas, 0) = 0
            when 'con_cuenta' then p.tipo <> 'invitado'
            when 'invitados'  then p.tipo = 'invitado'
            else true
          end
  ),
  contadas as (
    select f.*, count(*) over (partition by f.dia_alta) as dia_cantidad
    from filtradas f
  ),
  pagina as (
    select c.*,
           row_number() over (
             order by
               case p_order
                 when 'partidas'     then c.partidas
                 when 'ganadas'      then c.ganadas
                 when 'dias_jugados' then c.dias_jugados
               end desc nulls last,
               case when p_order = 'ultima_partida' then c.ultima_partida end desc nulls last,
               c.created_at desc,
               c.id
           ) as puesto
    from contadas c
  )
  select jsonb_build_object(
    'total',   (select count(*) from filtradas),
    'jugaron', (select count(*) from filtradas where partidas > 0),
    'personas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',                pg.id,
               'nombre',            pg.username,
               'avatar_url',        pg.avatar_url,
               'creado_at',         pg.created_at,
               'tipo',              pg.tipo,
               'email',             pg.email,
               'monedas',           pg.coins,
               'puntos_campana',    pg.campaign_points,
               'partidas',          pg.partidas,
               'partidas_personas', pg.partidas_personas,
               'partidas_maquina',  pg.partidas_maquina,
               'ganadas',           pg.ganadas,
               'perdidas',          pg.perdidas,
               'dias_jugados',      pg.dias_jugados,
               'primera_partida',   pg.primera_partida,
               'ultima_partida',    pg.ultima_partida,
               'ultima_sesion',     pg.last_sign_in_at,
               'visto_at',          up.last_seen_at,
               'dia_cantidad',      pg.dia_cantidad
             ) order by pg.puesto)
      from pagina pg
      left join user_presence up on up.user_id = pg.id
      where pg.puesto > v_off and pg.puesto <= v_off + v_limit
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.admin_people(text, text, text, int, int) from public, anon;
grant execute on function public.admin_people(text, text, text, int, int) to authenticated;

commit;
