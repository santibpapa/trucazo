-- ============================================================
-- TRUCAZO — Reloj por jugada + mazo automático por tiempo
-- Fecha: 2026-06-26
--
-- Cada partida tiene un límite de tiempo por jugada (15 o 30s, elegido al crear
-- la mesa). El reloj se reinicia en cada jugada (cada vez que cambia el turno).
-- Si a un jugador se le acaba el tiempo, se va al mazo automáticamente (pierde la
-- mano y el rival cobra lo que esté en juego). Al 3er mazo automático, ese jugador
-- pierde la partida. El mazo MANUAL (botón) no cuenta para los 3.
--
-- Reemplaza al sistema de "reclamar victoria" (que dependía de la conexión).
-- Este es puramente por tiempo. Idempotente.
-- ============================================================

begin;

-- ---- Columnas ----
alter table public.tables add column if not exists time_limit int not null default 30;
alter table public.games  add column if not exists time_limit int not null default 30;
alter table public.games  add column if not exists turn_started_at timestamptz not null default now();
alter table public.games  add column if not exists mazo_count_p1 int not null default 0;
alter table public.games  add column if not exists mazo_count_p2 int not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tables_time_limit_chk') then
    alter table public.tables add constraint tables_time_limit_chk check (time_limit in (15, 30));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'games_time_limit_chk') then
    alter table public.games add constraint games_time_limit_chk check (time_limit in (15, 30));
  end if;
end $$;

-- ---- Trigger: reiniciar el reloj del turno en cada acción de una partida en juego ----
-- Todas las acciones (jugar, cantar, responder, repartir) actualizan la fila de
-- games; al hacerlo, el turno del jugador "arranca" ahora. Centralizado acá para
-- no tener que tocar cada función.
create or replace function public._touch_turn_start()
returns trigger language plpgsql as $$
begin
  new.turn_started_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_turn_start on public.games;
create trigger trg_touch_turn_start
  before update on public.games
  for each row
  when (new.status = 'playing')
  execute function public._touch_turn_start();

-- ---- create_table: aceptar el límite de tiempo ----
drop function if exists public.create_table(text, integer, boolean, text, integer);

create function public.create_table(p_name text, p_bet integer, p_is_private boolean,
                                    p_private_code text default null,
                                    p_target_score int default 30,
                                    p_time_limit int default 30)
 returns tables language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_coins int;
  v_username text;
  v_row tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if p_bet < 10 then raise exception 'la apuesta minima es 10'; end if;
  if p_target_score not in (15, 30) then raise exception 'puntaje objetivo invalido'; end if;
  if p_time_limit not in (15, 30) then raise exception 'tiempo invalido'; end if;

  select coins, username into v_coins, v_username from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins < p_bet then raise exception 'monedas insuficientes'; end if;

  update profiles set coins = coins - p_bet where id = auth.uid();

  insert into tables (name, creator_id, creator_username, bet, is_private, private_code, status, target_score, time_limit)
  values (p_name, auth.uid(), v_username, p_bet, p_is_private, p_private_code, 'waiting', p_target_score, p_time_limit)
  returning * into v_row;

  return v_row;
end;
$function$;

grant execute on function public.create_table(text, integer, boolean, text, int, int) to anon, authenticated;

-- ---- start_game: copiar el límite de tiempo de la mesa a la partida ----
create or replace function public.start_game(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  t tables%rowtype; g games%rowtype; h1 jsonb; h2 jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id;
  if found then return g; end if;

  select * into t from tables where id = p_game_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.opponent_id is null then raise exception 'la mesa todavia no tiene rival'; end if;
  if auth.uid() <> t.creator_id and auth.uid() <> t.opponent_id then
    raise exception 'no sos jugador de esta mesa';
  end if;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  insert into games (
    id, player1_id, player2_id, player1_username, player2_username,
    current_turn, mano_player, bet, target_score, time_limit, turn_started_at
  ) values (
    p_game_id, t.creator_id, t.opponent_id, t.creator_username, t.opponent_username,
    t.creator_id, t.creator_id, t.bet * 2, t.target_score, t.time_limit, now()
  )
  on conflict (id) do nothing
  returning * into g;

  if g.id is null then
    select * into g from games where id = p_game_id;
    return g;
  end if;

  insert into game_hands (game_id, player_id, cards) values
    (p_game_id, t.creator_id,  h1),
    (p_game_id, t.opponent_id, h2)
  on conflict (game_id, player_id) do nothing;

  return g;
end;
$function$;

-- ---- timeout_mazo: el que se quedó sin tiempo se va al mazo (server valida el plazo) ----
-- La pueden llamar ambos clientes (el que espera la dispara contra el ausente); el
-- server chequea el plazo real con turn_started_at + time_limit, así nadie hace trampa.
create or replace function public.timeout_mazo(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; loser uuid; oppid uuid; stake int; s1 int; s2 int;
  new_count int; deadline timestamptz;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if g.awaiting_deal then raise exception 'esperando la proxima mano'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then raise exception 'not a player of this game'; end if;

  -- el que se queda sin tiempo es el que tiene el turno
  loser := g.current_turn;
  oppid := case when loser = g.player1_id then g.player2_id else g.player1_id end;

  -- validar que el tiempo realmente venció (autoridad del server)
  deadline := g.turn_started_at + make_interval(secs => g.time_limit);
  if now() < deadline then raise exception 'todavia hay tiempo'; end if;

  -- stake de la mano (igual que irse_al_mazo)
  stake := case when g.truco_state->>'status' = 'accepted' then (g.truco_state->>'value')::int else 1 end;
  s1 := g.player1_score + case when oppid = g.player1_id then stake else 0 end;
  s2 := g.player2_score + case when oppid = g.player2_id then stake else 0 end;

  -- contador de mazos automáticos del que se quedó sin tiempo
  new_count := case when loser = g.player1_id then g.mazo_count_p1 + 1 else g.mazo_count_p2 + 1 end;

  -- 3er mazo automático: pierde la partida (sin importar el puntaje)
  if new_count >= 3 then
    update games set
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, g.player1_score, g.player2_score);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- el rival cobra la mano; ¿llegó al objetivo? termina
  if s1 >= g.target_score or s2 >= g.target_score then
    update games set
      player1_score = s1, player2_score = s2,
      mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
      mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
      updated_at = now()
    where id = p_game_id;
    perform public.finish_game(p_game_id, oppid, s1, s2);
    select * into g from games where id = p_game_id;
    return g;
  end if;

  -- si no, deja la mano cerrada (awaiting_deal); el cliente muestra el cartel y,
  -- tras el delay, advance_hand reparte la próxima.
  update games set
    player1_score = s1, player2_score = s2,
    mazo_count_p1 = case when loser = g.player1_id then new_count else mazo_count_p1 end,
    mazo_count_p2 = case when loser = g.player2_id then new_count else mazo_count_p2 end,
    awaiting_deal = true, updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

grant execute on function public.timeout_mazo(uuid) to anon, authenticated;

commit;
