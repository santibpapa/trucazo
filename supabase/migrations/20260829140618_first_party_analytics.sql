-- ============================================================
-- TRUCAZO — Analítica propia de adquisición y conversión
-- Fecha: 2026-08-29
--
-- Registra visitantes, sesiones y cuatro eventos concretos sin guardar IP ni
-- el user-agent completo. El navegador nunca accede a las tablas: escribe a
-- través de una ruta del servidor y sólo el admin puede leer el resumen.
-- ============================================================

begin;

create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_source text not null,
  first_medium text not null,
  first_campaign text,
  first_content text,
  first_referrer_host text,
  first_landing_path text not null,
  last_user_id uuid references auth.users(id) on delete set null,
  country_code text,
  device_type text,
  browser text,
  operating_system text
);

create table if not exists public.analytics_sessions (
  session_id uuid primary key,
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source text not null,
  medium text not null,
  campaign text,
  content text,
  referrer_host text,
  landing_path text not null,
  country_code text,
  device_type text,
  browser text,
  operating_system text
);

create table if not exists public.analytics_events (
  event_id uuid primary key,
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  session_id uuid not null references public.analytics_sessions(session_id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in (
    'page_view', 'guest_session_started', 'register_completed', 'game_started'
  )),
  path text not null,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_visitors_last_seen_idx
  on public.analytics_visitors(last_seen_at desc);
create index if not exists analytics_visitors_user_idx
  on public.analytics_visitors(last_user_id) where last_user_id is not null;
create index if not exists analytics_sessions_started_idx
  on public.analytics_sessions(started_at desc);
create index if not exists analytics_sessions_visitor_idx
  on public.analytics_sessions(visitor_id, started_at desc);
create index if not exists analytics_sessions_source_idx
  on public.analytics_sessions(source, medium, started_at desc);
create index if not exists analytics_events_time_idx
  on public.analytics_events(occurred_at desc);
create index if not exists analytics_events_name_time_idx
  on public.analytics_events(event_name, occurred_at desc);
create index if not exists analytics_events_visitor_idx
  on public.analytics_events(visitor_id, occurred_at desc);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

revoke all on table public.analytics_visitors from public, anon, authenticated;
revoke all on table public.analytics_sessions from public, anon, authenticated;
revoke all on table public.analytics_events from public, anon, authenticated;
grant all on table public.analytics_visitors to service_role;
grant all on table public.analytics_sessions to service_role;
grant all on table public.analytics_events to service_role;

-- La ruta /api/analytics llama esta función con service_role. Se usa una sola
-- transacción para que nunca quede un evento sin su visitante o su sesión.
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
  if p_event_name not in ('page_view', 'guest_session_started', 'register_completed', 'game_started') then
    raise exception 'evento inválido';
  end if;
  if p_path is null or p_path !~ '^/' or length(p_path) > 300 then
    raise exception 'ruta inválida';
  end if;
  if p_properties is null or jsonb_typeof(p_properties) <> 'object'
     or pg_column_size(p_properties) > 4096 then
    raise exception 'propiedades inválidas';
  end if;

  -- Las visitas del dueño autenticado no contaminan sus propias estadísticas.
  if p_user_id is not null and exists (
    select 1 from public.profiles p where p.id = p_user_id and p.is_admin
  ) then
    return;
  end if;

  -- Reintentos del mismo pedido son gratis y no consumen el límite.
  if exists (select 1 from public.analytics_events e where e.event_id = p_event_id) then
    return;
  end if;

  -- Defensa en profundidad. El endpoint también exige mismo origen, pero esas
  -- cabeceras pueden falsificarse fuera de un navegador. Estos topes protegen
  -- los números y la base aunque alguien llame la ruta con un script.
  if (select count(*) from public.analytics_events e
      where e.visitor_id = p_visitor_id
        and e.occurred_at >= v_now - interval '1 minute') >= 30 then
    return;
  end if;
  if (select count(*) from public.analytics_events e
      where e.visitor_id = p_visitor_id
        and e.occurred_at >= v_now - interval '1 hour') >= 300 then
    return;
  end if;
  -- Cortacircuito global: el tráfico humano actual está a varios órdenes de
  -- magnitud. Evita una escritura sin techo aun si rotaran visitor_id.
  if (select count(*) from public.analytics_events e
      where e.occurred_at >= v_now - interval '1 minute') >= 2000 then
    return;
  end if;

  -- Un comienzo de partida sólo vale si la partida existe y el usuario
  -- autenticado participa de ella. Así no alcanza con inventar el evento.
  if p_event_name = 'game_started' then
    begin
      v_game_id := (p_properties->>'game_id')::uuid;
    exception when invalid_text_representation then
      return;
    end;
    if p_user_id is null or v_game_id is null or not exists (
      select 1 from public.games g
      where g.id = v_game_id and p_user_id in (g.player1_id, g.player2_id)
    ) then
      return;
    end if;
    if exists (
      select 1 from public.analytics_events e
      where e.visitor_id = p_visitor_id
        and e.event_name = 'game_started'
        and e.properties->>'game_id' = v_game_id::text
    ) then
      return;
    end if;
  end if;

  -- Una alta no se puede repetir a fuerza de refrescar o reenviar el pedido.
  if p_event_name in ('guest_session_started', 'register_completed') and exists (
    select 1 from public.analytics_events e
    where e.visitor_id = p_visitor_id
      and e.event_name = p_event_name
      and e.occurred_at >= v_now - interval '1 day'
  ) then
    return;
  end if;

  insert into public.analytics_visitors (
    visitor_id, first_seen_at, last_seen_at, first_source, first_medium,
    first_campaign, first_content, first_referrer_host, first_landing_path,
    last_user_id, country_code, device_type, browser, operating_system
  ) values (
    p_visitor_id, v_now, v_now, left(p_source, 160), left(p_medium, 80),
    left(p_campaign, 120), left(p_content, 120), left(p_referrer_host, 160),
    p_path, p_user_id, left(p_country_code, 2), left(p_device_type, 30),
    left(p_browser, 40), left(p_operating_system, 40)
  )
  on conflict (visitor_id) do update set
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
  )
  on conflict (session_id) do update set
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

-- Conservación: los eventos detallados, las sesiones y los visitantes sin
-- actividad se eliminan a los 365 días. Los borrados respetan las FK y no
-- afectan cuentas, perfiles ni partidas.
create or replace function public.sweep_old_analytics(p_days int default 365)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_cutoff timestamptz;
  v_events int;
  v_sessions int;
  v_visitors int;
begin
  if p_days is null or p_days < 30 or p_days > 730 then
    raise exception 'p_days debe estar entre 30 y 730';
  end if;

  v_cutoff := now() - make_interval(days => p_days);

  delete from public.analytics_events where occurred_at < v_cutoff;
  get diagnostics v_events = row_count;

  delete from public.analytics_sessions where last_seen_at < v_cutoff;
  get diagnostics v_sessions = row_count;

  delete from public.analytics_visitors where last_seen_at < v_cutoff;
  get diagnostics v_visitors = row_count;

  return jsonb_build_object(
    'eventos', v_events, 'sesiones', v_sessions, 'visitantes', v_visitors
  );
end;
$function$;

revoke execute on function public.sweep_old_analytics(int)
  from public, anon, authenticated;
grant execute on function public.sweep_old_analytics(int) to service_role;

-- Resumen listo para dibujar. Igual que admin_stats, comprueba al dueño en el
-- servidor: el permiso authenticated no alcanza para leer datos.
create or replace function public.admin_acquisition(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $function$
declare
  v_is_admin boolean;
  tz text := 'America/Argentina/Buenos_Aires';
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_days int := greatest(1, least(coalesce(p_days, 30), 180));
  since date;
  since_at timestamptz;
  until_at timestamptz;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select is_admin into v_is_admin from profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'solo el admin puede ver esto';
  end if;

  since := today - (v_days - 1);
  since_at := since::timestamp at time zone tz;
  until_at := (today + 1)::timestamp at time zone tz;

  with
  eventos as (
    select e.*, (e.occurred_at at time zone tz)::date as dia
    from analytics_events e
    where e.occurred_at >= since_at and e.occurred_at < until_at
  ),
  sesiones as (
    select s.*, (s.started_at at time zone tz)::date as dia
    from analytics_sessions s
    where s.started_at >= since_at and s.started_at < until_at
  ),
  visitantes as (
    select distinct visitor_id from eventos
  ),
  retornos as (
    select visitor_id
    from sesiones
    group by visitor_id
    having count(distinct dia) >= 2
  ),
  registros_sesion as (
    -- Alta por email informada por el cliente (incluye el caso en que todavía
    -- falta confirmar el correo) o cuenta real recién creada durante la sesión,
    -- que permite atribuir también las altas nuevas de Google.
    select distinct e.session_id, e.visitor_id
    from eventos e
    where e.event_name = 'register_completed'
    union
    select distinct s.session_id, s.visitor_id
    from sesiones s
    join auth.users u on u.id = s.user_id
     and not coalesce(u.is_anonymous, false)
     and u.created_at between s.started_at - interval '10 minutes'
                          and s.last_seen_at + interval '10 minutes'
  ),
  dias as (
    select d::date as dia from generate_series(since, today, interval '1 day') d
  ),
  serie_dia as (
    select
      d.dia,
      count(distinct e.visitor_id) as visitantes,
      count(distinct e.session_id) as sesiones,
      count(*) filter (where e.event_name = 'page_view') as paginas,
      count(distinct e.visitor_id) filter (where e.event_name = 'game_started') as jugaron
    from dias d
    left join eventos e on e.dia = d.dia
    group by d.dia
  ),
  fuentes as (
    select
      s.source,
      s.medium,
      count(distinct s.visitor_id) as visitantes,
      count(distinct s.session_id) as sesiones,
      count(distinct e.visitor_id) filter (where e.event_name = 'game_started') as jugaron,
      count(distinct r.visitor_id) as registros
    from sesiones s
    left join eventos e on e.session_id = s.session_id
    left join registros_sesion r on r.session_id = s.session_id
    group by s.source, s.medium
  ),
  campanas as (
    select
      s.campaign,
      count(distinct s.visitor_id) as visitantes,
      count(distinct s.session_id) as sesiones,
      count(distinct e.visitor_id) filter (where e.event_name = 'game_started') as jugaron
    from sesiones s
    left join eventos e on e.session_id = s.session_id
    where s.campaign is not null
    group by s.campaign
  ),
  entradas as (
    select landing_path, count(distinct visitor_id) as visitantes
    from sesiones group by landing_path
  ),
  dispositivos as (
    select coalesce(device_type, 'Sin identificar') as nombre,
           count(distinct visitor_id) as visitantes
    from sesiones group by coalesce(device_type, 'Sin identificar')
  ),
  navegadores as (
    select coalesce(browser, 'Sin identificar') as nombre,
           count(distinct visitor_id) as visitantes
    from sesiones group by coalesce(browser, 'Sin identificar')
  ),
  paises as (
    select coalesce(country_code, '—') as codigo,
           count(distinct visitor_id) as visitantes
    from sesiones group by coalesce(country_code, '—')
  )
  select jsonb_build_object(
    'generado_at', now(),
    'dias', v_days,
    'desde', since,
    'hasta', today,
    'totales', jsonb_build_object(
      'visitantes_hoy', (select count(distinct visitor_id) from eventos where dia = today),
      'visitantes_ayer', (select count(distinct visitor_id) from eventos where dia = today - 1),
      'visitantes', (select count(*) from visitantes),
      'sesiones', (select count(*) from sesiones),
      'paginas', (select count(*) from eventos where event_name = 'page_view'),
      'jugaron', (select count(distinct visitor_id) from eventos where event_name = 'game_started'),
      'registros', (select count(distinct visitor_id) from registros_sesion),
      'identificados', (select count(distinct visitor_id) from eventos where user_id is not null),
      'volvieron', (select count(*) from retornos),
      'directos', (select count(distinct visitor_id) from sesiones where medium = 'directo')
    ),
    'serie', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', dia, 'visitantes', visitantes, 'sesiones', sesiones,
        'paginas', paginas, 'jugaron', jugaron
      ) order by dia), '[]'::jsonb) from serie_dia
    ),
    'fuentes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'source', source, 'medium', medium, 'visitantes', visitantes,
        'sesiones', sesiones, 'jugaron', jugaron, 'registros', registros
      ) order by visitantes desc, sesiones desc, source), '[]'::jsonb) from fuentes
    ),
    'campanas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'campaign', campaign, 'visitantes', visitantes, 'sesiones', sesiones,
        'jugaron', jugaron
      ) order by visitantes desc, campaign), '[]'::jsonb) from campanas
    ),
    'entradas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', landing_path, 'visitantes', visitantes
      ) order by visitantes desc, landing_path), '[]'::jsonb)
      from (select * from entradas order by visitantes desc, landing_path limit 12) x
    ),
    'dispositivos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nombre', nombre, 'visitantes', visitantes
      ) order by visitantes desc, nombre), '[]'::jsonb) from dispositivos
    ),
    'navegadores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nombre', nombre, 'visitantes', visitantes
      ) order by visitantes desc, nombre), '[]'::jsonb) from navegadores
    ),
    'paises', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', codigo, 'visitantes', visitantes
      ) order by visitantes desc, codigo), '[]'::jsonb) from paises
    )
  ) into result;

  return result;
end;
$function$;

revoke execute on function public.admin_acquisition(int) from public, anon;
grant execute on function public.admin_acquisition(int) to authenticated;

-- pg_cron ya está habilitado en Trucazo por los barridos de mesas y partidas.
-- Se reprograma de forma idempotente y corre una vez por día.
select cron.schedule(
  'sweep-old-analytics-trucazo',
  '35 4 * * *',
  $$ select public.sweep_old_analytics(365); $$
);

commit;
