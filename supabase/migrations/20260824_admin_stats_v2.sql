-- ============================================================
-- TRUCAZO — Panel del admin v2: de "dos barritas" a estadísticas de verdad
-- Fecha: 2026-08-24
--
-- QUÉ CAMBIA
--   La versión vieja de admin_stats() devolvía solo tres cosas: cuánta gente hay,
--   cuántos se registraron por día y cuántas partidas hubo por día. Servía para
--   mirar de reojo, no para entender qué pasa.
--
--   Esta versión devuelve, en un solo pedido:
--     * TOTALES  — la foto de hoy contra ayer y contra la semana.
--     * SERIE    — un renglón por día: registros (separando registrados de
--                  invitados), personas que jugaron y partidas.
--     * PERSONAS — la lista, uno por uno: nombre, cuándo se anotó, con qué
--                  (email / Google / invitado), si jugó o no, cuántas, cuántas
--                  ganó, contra personas o contra la máquina, cuándo fue su
--                  primera y su última partida, y cuándo se lo vio por última vez.
--     * EMBUDO   — de los que se anotaron en la ventana, cuántos llegaron a jugar
--                  una, cuántos llegaron a tres y cuántos volvieron otro día.
--     * HORARIOS — a qué hora del día se juega (las 24 horas, hora de Argentina).
--
--   Sigue siendo SOLO para el admin (profiles.is_admin): a cualquier otro le tira
--   error. Todo se cuenta en el servidor y en hora de Argentina, así "hoy" es el
--   día de acá. Los bots (campaña y lobby) nunca cuentan como personas; sus
--   partidas sí se cuentan, pero aparte ("contra la máquina").
--
-- La firma no cambia: admin_stats(p_days int). Así el permiso que ya tiene
-- (grant execute a authenticated) sigue valiendo y no hay nada que reabrir.
-- Idempotente.
-- ============================================================

begin;

create or replace function public.admin_stats(p_days int default 30)
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
    'personas', (
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
      from (select * from personas order by created_at desc limit 500) p
      left join por_persona   j  on j.player_id = p.id
      left join user_presence up on up.user_id  = p.id
    ),

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

-- La función se defiende sola (chequea is_admin). El permiso ya estaba dado desde
-- la migración de privilegios; se repite acá para que corra sola si hace falta.
grant execute on function public.admin_stats(int) to authenticated;

commit;
