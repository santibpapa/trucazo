-- ============================================================
-- TRUCAZO — Ocultar las cartas del rival (server-authoritative de manos)
-- Fecha: 2026-06-20
--
-- Problema: player1_cards y player2_cards vivían en la fila de `games`,
-- que se transmite COMPLETA por Realtime (REPLICA IDENTITY FULL) a ambos
-- jugadores → cada uno podía ver la mano del otro en el navegador.
--
-- Solución:
--   * Las manos pasan a `game_hands`, con RLS por jugador y FUERA de Realtime.
--   * El reparto y la resolución del envido aceptado (que necesitan ver las
--     dos manos) pasan a funciones SECURITY DEFINER en el servidor.
--   * Se eliminan las columnas de cartas de `games`.
--
-- ⚠️ Las partidas EN CURSO creadas con el cliente viejo no tienen filas en
--    game_hands y van a quedar sin cartas. Terminá/abandoná esas partidas
--    antes de correr esto.
--
-- Idempotente. Revisar antes de correr.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Tabla de manos: una fila por (partida, jugador). NO se publica en Realtime.
-- ------------------------------------------------------------
create table if not exists public.game_hands (
  game_id   uuid not null references public.games(id) on delete cascade,
  player_id uuid not null,
  cards     jsonb not null default '[]'::jsonb,
  primary key (game_id, player_id)
);

alter table public.game_hands enable row level security;

-- Cada jugador solo puede ver/actualizar su propia mano.
-- (El INSERT lo hacen solo las funciones definer; no hay policy de insert.)
drop policy if exists "ver mi mano" on public.game_hands;
create policy "ver mi mano" on public.game_hands
  for select using (auth.uid() = player_id);

drop policy if exists "actualizar mi mano" on public.game_hands;
create policy "actualizar mi mano" on public.game_hands
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- ------------------------------------------------------------
-- Helper: mazo de 40 cartas con su rank (espejo de getRank en truco.ts)
-- ------------------------------------------------------------
create or replace function public._truco_deck()
returns jsonb
language sql
immutable
as $$
  select jsonb_agg(jsonb_build_object('suit', s, 'value', v, 'rank',
    case
      when v = 1  and s = 'espada'            then 1
      when v = 1  and s = 'basto'             then 2
      when v = 7  and s = 'espada'            then 3
      when v = 7  and s = 'oro'               then 4
      when v = 3                              then 5
      when v = 2                              then 6
      when v = 1  and s in ('copa','oro')     then 7
      when v = 12                             then 8
      when v = 11                             then 9
      when v = 10                             then 10
      when v = 7  and s in ('copa','basto')   then 11
      when v = 6                              then 12
      when v = 5                              then 13
      when v = 4                              then 14
      else 15
    end))
  from unnest(array['espada','basto','oro','copa']) s
  cross join unnest(array[1,2,3,4,5,6,7,10,11,12]) v;
$$;

-- ------------------------------------------------------------
-- Helper: reparte 3 + 3 cartas (mezcla en el servidor)
-- ------------------------------------------------------------
create or replace function public._deal_hands(out h1 jsonb, out h2 jsonb)
language plpgsql
as $$
declare
  cards jsonb[];
begin
  select array_agg(elem order by random())
    into cards
  from jsonb_array_elements(public._truco_deck()) elem;

  h1 := to_jsonb(array[cards[1], cards[2], cards[3]]);
  h2 := to_jsonb(array[cards[4], cards[5], cards[6]]);
end;
$$;

-- ------------------------------------------------------------
-- Helper: puntos de envido de una mano (espejo de getEnvidoPoints)
-- ------------------------------------------------------------
create or replace function public._envido_points(cards jsonb)
returns int
language plpgsql
immutable
as $$
declare
  best int := 0;
  r record;
begin
  for r in
    select cnt, digs from (
      select suit, count(*) as cnt, array_agg(dig order by dig desc) as digs
      from (
        select (c->>'suit') as suit,
               case when (c->>'value')::int <= 7 then (c->>'value')::int else 0 end as dig
        from jsonb_array_elements(cards) c
      ) x
      group by suit
    ) y
  loop
    if r.cnt >= 2 then
      best := greatest(best, coalesce(r.digs[1],0) + coalesce(r.digs[2],0) + 20);
    else
      best := greatest(best, coalesce(r.digs[1],0));
    end if;
  end loop;
  return best;
end;
$$;

-- ------------------------------------------------------------
-- start_game: crea la partida (sin cartas en games) y reparte en game_hands.
-- Idempotente y a prueba de carrera (on conflict). Reemplaza el insert que
-- antes hacía el cliente en page.tsx.
-- ------------------------------------------------------------
create or replace function public.start_game(p_game_id uuid)
 returns games
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  t  tables%rowtype;
  g  games%rowtype;
  h1 jsonb;
  h2 jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  -- ¿ya existe?
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
    current_turn, mano_player, bet
  ) values (
    p_game_id, t.creator_id, t.opponent_id, t.creator_username, t.opponent_username,
    t.creator_id, t.creator_id, t.bet * 2
  )
  on conflict (id) do nothing
  returning * into g;

  if g.id is null then
    -- otro proceso ganó el insert; devolver el existente
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

-- ------------------------------------------------------------
-- deal_new_hand: termina la mano actual y reparte una nueva. Reemplaza el
-- newHandState() del cliente (que repartía ambas manos en el navegador).
-- Los puntajes se pasan ya calculados (no son secretos).
-- ------------------------------------------------------------
create or replace function public.deal_new_hand(p_game_id uuid, p_p1_score int, p_p2_score int)
 returns games
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g        games%rowtype;
  new_mano uuid;
  h1       jsonb;
  h2       jsonb;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  new_mano := case when g.mano_player = g.player1_id then g.player2_id else g.player1_id end;

  select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

  update game_hands set cards = h1 where game_id = p_game_id and player_id = g.player1_id;
  update game_hands set cards = h2 where game_id = p_game_id and player_id = g.player2_id;

  update games set
    played_cards  = '[]'::jsonb,
    player1_score = p_p1_score,
    player2_score = p_p2_score,
    current_turn  = new_mano,
    mano_player   = new_mano,
    hand_number   = g.hand_number + 1,
    round_number  = 1,
    round_results = '[]'::jsonb,
    envido_state  = '{"value":0,"status":"none","last_singer":null,"chain":[]}'::jsonb,
    truco_state   = '{"value":1,"status":"none","last_singer":null}'::jsonb,
    updated_at    = now()
  where id = p_game_id
  returning * into g;

  return g;
end;
$function$;

-- ------------------------------------------------------------
-- resolve_envido_accept: calcula el envido leyendo LAS DOS manos (server-side)
-- y reparte los puntos. Reemplaza el cálculo que hacía el cliente leyendo la
-- mano del rival. El turno siguiente lo decide el cliente (no es secreto).
-- ------------------------------------------------------------
create or replace function public.resolve_envido_accept(p_game_id uuid, p_next_turn uuid)
 returns games
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g      games%rowtype;
  h1     jsonb;
  h2     jsonb;
  pts1   int;
  pts2   int;
  winner uuid;
  val    int;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  select cards into h1 from game_hands where game_id = p_game_id and player_id = g.player1_id;
  select cards into h2 from game_hands where game_id = p_game_id and player_id = g.player2_id;

  -- Reconstruir la mano original: cartas restantes + cartas ya jugadas esta mano
  h1 := coalesce(h1,'[]'::jsonb) || coalesce(
    (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
     where pc->>'player_id' = g.player1_id::text), '[]'::jsonb);
  h2 := coalesce(h2,'[]'::jsonb) || coalesce(
    (select jsonb_agg(pc->'card') from jsonb_array_elements(g.played_cards) pc
     where pc->>'player_id' = g.player2_id::text), '[]'::jsonb);

  pts1 := public._envido_points(h1);
  pts2 := public._envido_points(h2);

  if    pts1 > pts2 then winner := g.player1_id;
  elsif pts2 > pts1 then winner := g.player2_id;
  else                   winner := g.mano_player;  -- empate: gana la mano
  end if;

  val := coalesce((g.envido_state->>'value')::int, 0);

  update games set
    player1_score = player1_score + case when winner = g.player1_id then val else 0 end,
    player2_score = player2_score + case when winner = g.player2_id then val else 0 end,
    envido_state  = g.envido_state || jsonb_build_object(
                      'status','accepted', 'winner_id', winner,
                      'player1_points', pts1, 'player2_points', pts2, 'awarded', val),
    current_turn  = p_next_turn,
    updated_at    = now()
  where id = p_game_id
  returning * into g;

  return g;
end;
$function$;

-- ------------------------------------------------------------
-- Permisos para llamar las RPCs desde el cliente
-- ------------------------------------------------------------
grant execute on function public.start_game(uuid)                         to anon, authenticated;
grant execute on function public.deal_new_hand(uuid, int, int)            to anon, authenticated;
grant execute on function public.resolve_envido_accept(uuid, uuid)        to anon, authenticated;

-- ------------------------------------------------------------
-- Por último: quitar las cartas de games (ya no se transmiten por Realtime)
-- ------------------------------------------------------------
alter table public.games drop column if exists player1_cards;
alter table public.games drop column if exists player2_cards;

commit;
