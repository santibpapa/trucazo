-- ============================================================
-- TRUCAZO — Dos bots más que sólo se sientan en mesas de la gente
-- Fecha: 2026-11-04
--
-- Qué resuelve: los 3 bots del lobby también abren sus propias mesas, así que
-- muchas veces están todos ocupados (dos esperando en su mesa y uno jugando).
-- Si en ese momento alguien abre una mesa pública 1v1, ningún bot llega.
--
--   1. lobby_bots.opens_tables: si el bot abre mesas propias (los 3 de
--      siempre: sí; los nuevos: no).
--   2. Dos cuentas bot nuevas, con nombre de jugador común, que nunca abren
--      mesa: quedan libres para sentarse en las de la gente.
--   3. _free_lobby_bot: al sentarse en una mesa prefiere a los nuevos; al
--      abrir mesas del lobby sólo elige a los 3 de siempre.
--   4. ensure_lobby_tables: igual que antes, pero pide un bot que abra mesas.
--
-- bot_join_table no cambia. Los nuevos juegan con el mismo cerebro y nivel
-- que los 3 de siempre (nivel 10 del cerebro anterior al Noroeste).
-- Idempotente: se puede correr más de una vez sin efecto extra.
-- ============================================================

begin;

-- Misma cola que bot_join_table y ensure_lobby_tables: nadie elige bot
-- mientras se hace el cambio.
select pg_advisory_xact_lock(811501);

-- 1. QUIÉN ABRE MESAS ------------------------------------------------------

alter table public.lobby_bots
  add column if not exists opens_tables boolean not null default true;

-- 2. LAS CUENTAS -----------------------------------------------------------

do $accounts$
declare
  b record;
  v_name text;
begin
  for b in select * from (values
    ('b0710000-0000-4000-a000-000000000004'::uuid, 'lobby4@trucazo.bot'),
    ('b0710000-0000-4000-a000-000000000005'::uuid, 'lobby5@trucazo.bot')
  ) as v(id, email) loop
    -- Si ya existe (segunda corrida), conserva su nombre.
    select username into v_name from public.profiles where id = b.id;
    if v_name is null then
      select n.name into v_name
        from public.lobby_bot_names n
       where not exists (
               select 1 from public.profiles p where lower(p.username) = lower(n.name))
       order by random()
       limit 1;
    end if;
    if v_name is null then
      raise exception 'no quedan nombres libres en lobby_bot_names';
    end if;

    insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', b.id, 'authenticated',
            'authenticated', b.email, now(), '{"provider":"bot","providers":["bot"]}',
            jsonb_build_object('username', v_name), now(), now())
    on conflict (id) do nothing;

    -- Monedas y partidas las fija force_profile_defaults (1000 y 0): las
    -- partidas se suman jugando y _bot_topup recarga monedas antes de cada mesa.
    -- La antigüedad sí se respeta, para que no figure "se unió hoy".
    insert into public.profiles (id, username, is_bot, created_at)
    values (b.id, v_name, true,
            now() - make_interval(days => 20 + floor(random() * 50)::int))
    on conflict (id) do update set
      is_bot = true,
      created_at = least(public.profiles.created_at, excluded.created_at);

    insert into public.lobby_bots (bot_id, difficulty, trait_liar, trait_aggressive, opens_tables)
    values (b.id, 10, 3 + floor(random() * 7)::smallint, 3 + floor(random() * 7)::smallint, false)
    on conflict (bot_id) do update set opens_tables = false;
  end loop;

  -- Misma reparación que 20260829163123: GoTrue no tolera tokens en NULL.
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users'
               and column_name = 'confirmation_token') then
    update auth.users set confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, '')
    where raw_app_meta_data->>'provider' = 'bot';
  end if;
end $accounts$;

-- 3. ELEGIR BOT LIBRE ------------------------------------------------------
-- Un bot libre: sin mesa propia esperando y sin partida en curso (igual que
-- antes). Con p_para_abrir sólo devuelve bots que abren mesas; sin él, prefiere
-- a los que nunca abren, así los otros siguen disponibles para el lobby.

drop function if exists public._free_lobby_bot();

create or replace function public._free_lobby_bot(p_para_abrir boolean default false)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_bot uuid;
begin
  select lb.bot_id into v_bot
    from lobby_bots lb
   where (not p_para_abrir or lb.opens_tables)
     and not exists (
           select 1 from tables t
            where t.creator_id = lb.bot_id and t.status = 'waiting')
     and not exists (
           select 1 from tables t
           left join games gm on gm.id = t.id
            where (t.creator_id = lb.bot_id or t.opponent_id = lb.bot_id)
              and t.status = 'playing'
              and (gm.id is null or gm.status = 'playing')
              and coalesce(gm.updated_at, t.created_at) > now() - interval '30 minutes')
   order by lb.opens_tables, random()
   limit 1;
  return v_bot;
end;
$function$;

revoke execute on function public._free_lobby_bot(boolean) from anon, authenticated, public;

-- 4. MESAS DEL LOBBY: SÓLO LOS QUE ABREN MESAS -----------------------------
-- Copia de la versión vigente; el único cambio es _free_lobby_bot(true).

create or replace function public.ensure_lobby_tables()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_want  constant int := 2;      -- mesas públicas en espera que queremos ver
  v_lock  constant bigint := 811501;
  v_names constant text[] := array[
    'sale una', 'sin llorar', 'una y me voy', 'venite',
    'dale nomas', 'sale truco', 'truquito', 'una rapidita',
    'quien se prende', 'pasen', 'jugamos?', 'la ultima',
    'tengo un rato', 'a ver que sale', 'una mas', 'aca se juega',
    'vengan de a uno', 'el desquite', 'hoy gano yo', 'dale que arranca',
    'mate y truco', 'de sobremesa', 'se juega', 'el ultimo y me voy'
  ];
  v_open  int;
  v_bot   uuid;
  v_un    text;
  v_bet   int;
  v_score int;
  n       int := 0;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  -- De a uno por vez: el que llega segundo espera y después vuelve a contar.
  perform pg_advisory_xact_lock(v_lock);

  select count(*) into v_open from tables where status = 'waiting' and not is_private;

  while v_open + n < v_want loop
    v_bot := public._free_lobby_bot(true);
    exit when v_bot is null;

    perform public._bot_topup(v_bot);
    perform public._rename_lobby_bot(v_bot);
    select username into v_un from profiles where id = v_bot;

    v_bet   := (array[20, 50, 100])[1 + floor(random() * 3)];
    v_score := case when random() < 0.5 then 15 else 30 end;

    update profiles set coins = coins - v_bet where id = v_bot;

    insert into tables (name, creator_id, creator_username, bet, is_private,
                        private_code, status, target_score, time_limit)
    values (case when random() < 0.5 then 'Mesa de ' || v_un
                 else v_names[1 + floor(random() * array_length(v_names, 1))]
            end,
            v_bot, v_un, v_bet, false, null, 'waiting', v_score, 30);

    n := n + 1;
  end loop;

  return n;
end;
$function$;

commit;
