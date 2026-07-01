-- ============================================================
-- TRUCAZO — Modo Historia (vs bots), ETAPA 1: cimientos del backend
-- Fecha: 2026-06-29
--
-- Qué hace esta migración (todo junto y atómico):
--   1. Estructura: marca de "soy un bot" en profiles, tabla de rivales
--      (campaign_rivals), tabla de progreso del jugador (campaign_progress) y
--      una marca en games para saber que una partida es un duelo de campaña.
--   2. Seguridad: RLS y permisos de las tablas nuevas.
--   3. Datos: crea las 10 cuentas-bot (en auth.users + profiles) y la galería de
--      rivales con su dificultad, puntaje y premio.
--   4. Lógica: finish_game ahora distingue los duelos de campaña (no toca monedas
--      ni estadísticas; registra el avance y paga el premio una sola vez).
--      Funciones nuevas: start_campaign_duel, get_campaign y bot_step.
--
-- IMPORTANTE: la lógica del bot vive en SQL (server-side). El bot juega sus
-- turnos vía bot_step, que "se hace pasar" por el bot dentro de la transacción
-- y reusa las MISMAS funciones que un humano (play_card, respond_envido, etc.),
-- así nunca puede saltarse una regla. En esta etapa el bot juega "tonto"
-- (etapa 2 le pone la inteligencia por niveles). Idempotente.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. ESTRUCTURA
-- ------------------------------------------------------------

-- Marca de cuenta-bot. Sirve para distinguir bots de humanos en cualquier lado
-- (por ejemplo, para que las partidas vs bots no cuenten en el ranking).
alter table public.profiles add column if not exists is_bot boolean not null default false;

-- Galería de rivales del modo historia. Es data: una fila por personaje.
create table if not exists public.campaign_rivals (
  id           uuid primary key default gen_random_uuid(),
  order_index  integer not null unique,             -- posición en la escalera (1 = primero)
  slug         text not null unique,                -- identificador corto y estable
  display_name text not null,                       -- "Tobías, el Novato"
  tagline      text not null,                       -- frase de personalidad
  difficulty   integer not null,                    -- 1..10 (qué tan vivo juega; etapa 2)
  target_score integer not null,                    -- a cuántos puntos es el duelo (15 o 30)
  reward_coins integer not null,                    -- premio en monedas la 1ª vez que lo vencés
  bot_id       uuid not null references public.profiles(id),  -- la cuenta-bot que lo encarna
  constraint campaign_rivals_target_score_chk check (target_score = any (array[15, 30]))
);

-- Progreso del jugador: una fila = "este jugador venció a este rival". La sola
-- existencia de la fila significa "vencido" (y premio ya cobrado).
create table if not exists public.campaign_progress (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  rival_id  uuid not null references public.campaign_rivals(id) on delete cascade,
  beaten_at timestamptz not null default now(),
  primary key (user_id, rival_id)
);

-- Marca en games: null = partida normal (vs humano); con valor = duelo de campaña
-- contra ese rival. Las partidas normales no cambian en nada.
alter table public.games add column if not exists campaign_rival_id uuid references public.campaign_rivals(id);

-- ------------------------------------------------------------
-- 2. SEGURIDAD (RLS + permisos)
-- ------------------------------------------------------------

alter table public.campaign_rivals enable row level security;
alter table public.campaign_progress enable row level security;

-- La galería de rivales la puede leer cualquiera (no se escribe desde el cliente).
drop policy if exists "rivales visibles para todos" on public.campaign_rivals;
create policy "rivales visibles para todos" on public.campaign_rivals
  for select to anon, authenticated using (true);

-- Cada uno ve solo su propio progreso. Se escribe solo por funciones definer.
drop policy if exists "ver mi progreso" on public.campaign_progress;
create policy "ver mi progreso" on public.campaign_progress
  for select to authenticated using (auth.uid() = user_id);

grant select on public.campaign_rivals to anon, authenticated;
grant select on public.campaign_progress to authenticated;

-- ------------------------------------------------------------
-- 3. DATOS: las 10 cuentas-bot + la galería de rivales
--
-- UUIDs fijos para que la migración sea repetible (re-correrla no duplica nada).
-- Las cuentas-bot nunca inician sesión: solo existen para "ser jugadores".
-- ------------------------------------------------------------

-- 3a. Usuarios (auth.users). Email/marca mínimos; sin contraseña usable.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000001','authenticated','authenticated','bot1@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Tobías, el Novato"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000002','authenticated','authenticated','bot2@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Doña Rosa, la Vecina"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000003','authenticated','authenticated','bot3@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Aldo, el Carnicero"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000004','authenticated','authenticated','bot4@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Carmela, la Tana"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000005','authenticated','authenticated','bot5@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Ramón, el Tahúr"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000006','authenticated','authenticated','bot6@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Doña Elvira, la Patrona"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000007','authenticated','authenticated','bot7@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Don Genaro, el Maestro"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000008','authenticated','authenticated','bot8@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Lucho, el Campeón"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000009','authenticated','authenticated','bot9@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Sofía, la Coneja"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','b0700000-0000-4000-a000-000000000010','authenticated','authenticated','bot10@trucazo.bot', now(), '{"provider":"bot","providers":["bot"]}', '{"username":"Don Salvador, el Mudo"}', now(), now())
on conflict (id) do nothing;

-- 3b. Perfiles de los bots (por si el trigger handle_new_user no los creó, los
-- insertamos; y en cualquier caso marcamos is_bot y fijamos el nombre visible).
insert into public.profiles (id, username, is_bot) values
  ('b0700000-0000-4000-a000-000000000001','Tobías, el Novato', true),
  ('b0700000-0000-4000-a000-000000000002','Doña Rosa, la Vecina', true),
  ('b0700000-0000-4000-a000-000000000003','Aldo, el Carnicero', true),
  ('b0700000-0000-4000-a000-000000000004','Carmela, la Tana', true),
  ('b0700000-0000-4000-a000-000000000005','Ramón, el Tahúr', true),
  ('b0700000-0000-4000-a000-000000000006','Doña Elvira, la Patrona', true),
  ('b0700000-0000-4000-a000-000000000007','Don Genaro, el Maestro', true),
  ('b0700000-0000-4000-a000-000000000008','Lucho, el Campeón', true),
  ('b0700000-0000-4000-a000-000000000009','Sofía, la Coneja', true),
  ('b0700000-0000-4000-a000-000000000010','Don Salvador, el Mudo', true)
on conflict (id) do update set is_bot = true, username = excluded.username;

-- 3c. La galería de rivales.
insert into public.campaign_rivals (id, order_index, slug, display_name, tagline, difficulty, target_score, reward_coins, bot_id) values
  ('c1a70000-0000-4000-b000-000000000001', 1,  'novato',   'Tobías, el Novato',       'Recién aprende; tira cualquier carta y casi no canta.',                 1,  15, 50,   'b0700000-0000-4000-a000-000000000001'),
  ('c1a70000-0000-4000-b000-000000000002', 2,  'vecina',   'Doña Rosa, la Vecina',    'Prolija con lo básico; canta el envido cuando lo tiene.',               2,  15, 75,   'b0700000-0000-4000-a000-000000000002'),
  ('c1a70000-0000-4000-b000-000000000003', 3,  'carnicero','Aldo, el Carnicero',      'Agresivo con el truco, pero se le ve venir.',                           3,  15, 100,  'b0700000-0000-4000-a000-000000000003'),
  ('c1a70000-0000-4000-b000-000000000004', 4,  'tana',     'Carmela, la Tana',        'Sólida, buen envido; ya empieza a medirte.',                            4,  15, 150,  'b0700000-0000-4000-a000-000000000004'),
  ('c1a70000-0000-4000-b000-000000000005', 5,  'tahur',    'Ramón, el Tahúr',         'Empieza a farolear y a mentir el envido.',                              5,  30, 250,  'b0700000-0000-4000-a000-000000000005'),
  ('c1a70000-0000-4000-b000-000000000006', 6,  'patrona',  'Doña Elvira, la Patrona', 'Juega muy bien y te presiona seguido.',                                 6,  30, 400,  'b0700000-0000-4000-a000-000000000006'),
  ('c1a70000-0000-4000-b000-000000000007', 7,  'maestro',  'Don Genaro, el Maestro',  'Casi óptimo: miente, te lee y cuenta las cartas.',                      7,  30, 700,  'b0700000-0000-4000-a000-000000000007'),
  ('c1a70000-0000-4000-b000-000000000008', 8,  'campeon',  'Lucho, el Campeón',       'Ganó todos los torneos del club; afiladísimo y farol constante.',       8,  30, 1000, 'b0700000-0000-4000-a000-000000000008'),
  ('c1a70000-0000-4000-b000-000000000009', 9,  'coneja',   'Sofía, la Coneja',        'Rapidísima e impredecible; te descoloca con jugadas raras pero filosas.',9,  30, 1500, 'b0700000-0000-4000-a000-000000000009'),
  ('c1a70000-0000-4000-b000-000000000010', 10, 'mudo',     'Don Salvador, el Mudo',   'La leyenda: nunca habla, juego perfecto, imposible de leer.',           10, 30, 2500, 'b0700000-0000-4000-a000-000000000010')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. LÓGICA
-- ------------------------------------------------------------

-- 4a. finish_game: ahora distingue duelos de campaña. La rama de partida normal
-- (vs humano) queda EXACTAMENTE igual que antes.
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
  v_reward     integer;
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

  -- --- Duelo de campaña: sin monedas, sin estadísticas, sin historial ---
  if g.campaign_rival_id is not null then
    update games
       set status = 'finished', winner_id = p_winner_id,
           player1_score = p_p1_score, player2_score = p_p2_score, updated_at = now()
     where id = p_game_id;

    select id into v_human from profiles
     where id in (g.player1_id, g.player2_id) and not is_bot limit 1;

    -- Si ganó el humano, registramos el avance y pagamos el premio (una sola vez).
    if v_human is not null and p_winner_id = v_human then
      insert into campaign_progress (user_id, rival_id)
      values (v_human, g.campaign_rival_id)
      on conflict (user_id, rival_id) do nothing;
      if found then  -- fila nueva => primera vez que lo vence => pagar premio
        select reward_coins into v_reward from campaign_rivals where id = g.campaign_rival_id;
        update profiles set coins = coins + coalesce(v_reward, 0) where id = v_human;
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

-- 4b. start_campaign_duel: crea un duelo contra un rival (si está desbloqueado).
-- No cobra apuesta. Crea la mesa y la partida, reparte y devuelve la partida.
create or replace function public.start_campaign_duel(p_rival_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid        uuid := auth.uid();
  r          campaign_rivals%rowtype;
  v_min      integer;
  v_prev     uuid;
  v_username text;
  v_id       uuid := gen_random_uuid();
  h1 jsonb; h2 jsonb;
  g  games%rowtype;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into r from campaign_rivals where id = p_rival_id;
  if not found then raise exception 'rival no encontrado'; end if;

  -- ¿Está desbloqueado? El primero siempre; el resto si venciste al anterior.
  select min(order_index) into v_min from campaign_rivals;
  if r.order_index > v_min then
    select id into v_prev from campaign_rivals where order_index = r.order_index - 1;
    if not exists (select 1 from campaign_progress where user_id = uid and rival_id = v_prev) then
      raise exception 'todavía no desbloqueaste este rival';
    end if;
  end if;

  select username into v_username from profiles where id = uid;
  if v_username is null then raise exception 'perfil no encontrado'; end if;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  -- La partida necesita una mesa (por la llave foránea). Mesa privada, apuesta 0.
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

-- 4c. get_campaign: para la galería. Devuelve cada rival con si está vencido y
-- si está desbloqueado, para el jugador actual. (La pantalla es etapa 3.)
create or replace function public.get_campaign()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); v_result jsonb;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select coalesce(jsonb_agg(row order by (row->>'order_index')::int), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', cr.id,
      'order_index', cr.order_index,
      'slug', cr.slug,
      'display_name', cr.display_name,
      'tagline', cr.tagline,
      'difficulty', cr.difficulty,
      'target_score', cr.target_score,
      'reward_coins', cr.reward_coins,
      'beaten', (cp.user_id is not null),
      'unlocked', (
        cr.order_index = (select min(order_index) from campaign_rivals)
        or exists (
          select 1 from campaign_progress p
          join campaign_rivals prev on prev.id = p.rival_id
          where p.user_id = uid and prev.order_index = cr.order_index - 1
        )
      )
    ) as row
    from campaign_rivals cr
    left join campaign_progress cp on cp.rival_id = cr.id and cp.user_id = uid
  ) s;

  return v_result;
end;
$function$;

-- 4d. bot_step: el humano la llama cuando le toca jugar al bot. Se hace pasar por
-- el bot dentro de la transacción y reusa las funciones normales del juego. En
-- esta etapa el bot juega "tonto": responde simple y tira la primera carta.
create or replace function public.bot_step(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  uid    uuid := auth.uid();
  g      games%rowtype;
  v_bot  uuid;
  bhand  jsonb;
  i      int := 0;
  acted  boolean;
  es_status text; tr_status text;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if g.campaign_rival_id is null then raise exception 'no es un duelo de campaña'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  select id into v_bot from profiles where id in (g.player1_id, g.player2_id) and is_bot limit 1;
  if v_bot is null then raise exception 'esta partida no tiene bot'; end if;
  if uid = v_bot then raise exception 'el bot no juega solo'; end if;

  -- Hasta 12 acciones seguidas del bot (cantos encadenados, etc.). Se corta apenas
  -- le vuelve el turno al humano, termina la mano o termina la partida.
  loop
    i := i + 1;
    exit when i > 12;
    select * into g from games where id = p_game_id;
    exit when g.status <> 'playing' or g.awaiting_deal;

    es_status := g.envido_state->>'status';
    tr_status := g.truco_state->>'status';
    acted := false;

    -- Nos hacemos pasar por el bot solo para ejecutar su acción.
    perform set_config('request.jwt.claim.sub', v_bot::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_bot::text, 'role', 'authenticated')::text, true);

    if es_status = 'declaring' and (g.envido_state->>'declare_turn') = v_bot::text then
      perform public.envido_say(p_game_id, 'tengo');           -- declara su tanto
      acted := true;
    elsif es_status in ('envido','real_envido','falta_envido')
          and (g.envido_state->>'last_singer') is distinct from v_bot::text then
      perform public.respond_envido(p_game_id, false);         -- no quiero (tonto)
      acted := true;
    elsif tr_status in ('truco','retruco','vale_cuatro')
          and (g.truco_state->>'last_singer') is distinct from v_bot::text then
      perform public.respond_truco(p_game_id, true);           -- quiero (tonto)
      acted := true;
    elsif g.current_turn = v_bot then
      select cards into bhand from game_hands where game_id = p_game_id and player_id = v_bot;
      if bhand is null or jsonb_array_length(bhand) = 0 then
        acted := false;
      else
        perform public.play_card(p_game_id, bhand->0);         -- primera carta
        acted := true;
      end if;
    end if;

    -- Restauramos la identidad del humano que hizo la llamada.
    perform set_config('request.jwt.claim.sub', uid::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);

    exit when not acted;   -- nada que hacer => es turno del humano
  end loop;

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

grant execute on function public.start_campaign_duel(uuid) to authenticated;
grant execute on function public.get_campaign() to authenticated;
grant execute on function public.bot_step(uuid) to authenticated;

commit;
