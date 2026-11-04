-- Torneos renovados, etapa 2: marcador en vivo de la llave y compañeros recientes.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Etapa 2 de torneos: %', msg; end if; end $$;
create function pg_temp.uid(i integer) returns uuid language sql immutable as $$
  select ('dd300000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid $$;
grant execute on function pg_temp.check(boolean, text) to authenticated;

-- En producción existe; la base de prueba de torneos no siempre la trae.
create schema if not exists community_safety;
create table if not exists community_safety.blocks (
  owner_id uuid not null, target_id uuid not null,
  created_at timestamptz not null default now(), primary key(owner_id, target_id)
);

-- 1 yo · 2 rival reciente · 3 bloqueado · 4 bot · 5 invitado · 6 partida vieja
-- 7 compañero de parejas · 8 cuenta de prueba (dominio .test)
insert into auth.users(id, email, email_confirmed_at, is_anonymous)
select pg_temp.uid(i),
  case when i = 5 then null when i = 8 then 'prueba@trucazo.test' else 'etapa2-' || i || '@trucazo.com.ar' end,
  case when i = 5 then null else now() end, i = 5
from generate_series(1, 8) i;
insert into public.profiles(id, username, is_bot, coins, avatar_url)
select pg_temp.uid(i), 'Etapa2_' || i, i = 4, 100, 'https://example.org/' || i || '.png'
from generate_series(1, 8) i
on conflict(id) do update set is_bot = excluded.is_bot, username = excluded.username,
  avatar_url = excluded.avatar_url;

-- Partida mano a mano entre 1 e i. La base completa exige su mesa; la de
-- prueba de torneos no tiene esa tabla.
create function pg_temp.game(i integer, played timestamptz, bet integer, state text,
  s1 integer default 0, s2 integer default 0) returns uuid language plpgsql as $$
declare g uuid := gen_random_uuid();
begin
  if to_regclass('public.tables') is not null then
    execute 'insert into public.tables(id, name, creator_id, creator_username, opponent_id,
      opponent_username, bet, status) values ($1, ''Mesa'', $2, ''Etapa2_1'', $3, $4, $5, ''playing'')'
      using g, pg_temp.uid(1), pg_temp.uid(i), 'Etapa2_' || i, bet;
  end if;
  insert into public.games(id, player1_id, player2_id, player1_username, player2_username,
    current_turn, mano_player, bet, status, created_at, player1_score, player2_score)
  values (g, pg_temp.uid(1), pg_temp.uid(i), 'Etapa2_1', 'Etapa2_' || i,
    pg_temp.uid(1), pg_temp.uid(1), bet, state, played, s1, s2);
  return g;
end $$;

-- Partidas mano a mano: con 2, 3, 4, 5, 8 recientes; con 6 hace 90 días.
select pg_temp.game(i, case when i = 6 then now() - interval '90 days'
  else now() - (i || ' hours')::interval end, 10, 'finished')
from unnest(array[2, 3, 4, 5, 6, 8]) i;

-- 3 bloqueó a 1 después de jugar.
insert into community_safety.blocks(owner_id, target_id) values (pg_temp.uid(3), pg_temp.uid(1));

do $$
declare
  partners jsonb; ids uuid[];
  t1 uuid; t2 uuid; draft uuid; e1 uuid; e2 uuid; e3 uuid; e4 uuid; g uuid; tg uuid;
  live jsonb;
begin
  perform pg_temp.check(not has_function_privilege('anon', 'public.tournament_recent_partners()', 'execute'),
    'visitantes pueden pedir compañeros');
  perform pg_temp.check(not has_function_privilege('anon', 'public.tournament_live_scores(uuid)', 'execute'),
    'visitantes pueden pedir marcadores');

  -- Parejas: una mesa terminada donde 7 fue compañero hace 1 minuto.
  insert into public.team_tables(id, creator_id, name, bet, target_score, time_limit, status)
    values (gen_random_uuid(), pg_temp.uid(1), 'Mesa etapa 2', 10, 15, 30, 'finished') returning id into tg;
  insert into public.team_seats(table_id, user_id, seat, username, paid)
    values (tg, pg_temp.uid(1), 0, 'Etapa2_1', 10), (tg, pg_temp.uid(7), 2, 'Etapa2_7', 10);
  update public.team_tables set created_at = now() - interval '1 minute' where id = tg;

  perform set_config('request.jwt.claim.sub', pg_temp.uid(1)::text, true);
  set local role authenticated;
  partners := public.tournament_recent_partners();
  reset role;
  select array_agg((item->>'id')::uuid order by ord) into ids
    from jsonb_array_elements(partners) with ordinality as x(item, ord);
  perform pg_temp.check(ids = array[pg_temp.uid(7), pg_temp.uid(2)],
    'compañeros esperados 7 y 2 en ese orden, llegó ' || partners::text);
  perform pg_temp.check(partners->0->>'username' = 'Etapa2_7' and partners->0->>'avatar_url' like 'https://%',
    'faltan nombre o foto');

  -- Un invitado no recibe compañeros.
  perform set_config('request.jwt.claim.sub', pg_temp.uid(5)::text, true);
  set local role authenticated;
  perform pg_temp.check(public.tournament_recent_partners() = '[]'::jsonb, 'un invitado recibió compañeros');
  reset role;

  -- Marcador en vivo, mano a mano: jugador 1 es el lado A.
  insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
    published_at, created_by, updated_by)
  values ('Vivo 1v1', '1v1', 'knockout', 4, 30, now() + interval '1 day', 'running',
    now() - interval '1 day', pg_temp.uid(1), pg_temp.uid(1)) returning id into t1;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values (t1, 'active', 'solo', pg_temp.uid(1)) returning id into e1;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values (t1, 'active', 'solo', pg_temp.uid(2)) returning id into e2;
  insert into public.tournament_entry_members(tournament_id, entry_id, user_id, role, status, accepted_at)
    values (t1, e1, pg_temp.uid(1), 'captain', 'accepted', now()),
      (t1, e2, pg_temp.uid(2), 'captain', 'accepted', now());
  g := pg_temp.game(2, now(), 0, 'playing', 12, 7);
  insert into public.tournament_matches(tournament_id, phase, round_number, match_number,
    side_a_entry_id, side_b_entry_id, status, game_id)
    values (t1, 'semifinal', 1, 1, e1, e2, 'playing', g);
  insert into public.tournament_matches(tournament_id, phase, round_number, match_number,
    side_a_entry_id, side_b_entry_id, status, winner_entry_id, loser_entry_id, score_a, score_b,
    finished_at, result_applied_at)
    values (t1, 'semifinal', 1, 2, e2, e1, 'finished', e2, e1, 30, 20, now(), now());

  perform set_config('request.jwt.claim.sub', pg_temp.uid(2)::text, true);
  set local role authenticated;
  live := public.tournament_live_scores(t1);
  reset role;
  perform pg_temp.check(jsonb_array_length(live) = 1, 'debía haber un cruce en vivo: ' || live::text);
  perform pg_temp.check((live->0->>'score_a')::int = 12 and (live->0->>'score_b')::int = 7,
    'puntos 1v1 mal asignados: ' || live::text);

  -- Un invitado no ve marcadores (igual que el espectador).
  perform set_config('request.jwt.claim.sub', pg_temp.uid(5)::text, true);
  set local role authenticated;
  perform pg_temp.check(public.tournament_live_scores(t1) = '[]'::jsonb, 'un invitado vio marcadores');
  reset role;

  -- Parejas: el equipo 0 es el lado A.
  insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
    published_at, created_by, updated_by)
  values ('Vivo 2v2', '2v2', 'knockout', 8, 30, now() + interval '1 day', 'running',
    now() - interval '1 day', pg_temp.uid(1), pg_temp.uid(1)) returning id into t2;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values (t2, 'active', 'team', pg_temp.uid(1)) returning id into e3;
  insert into public.tournament_entries(tournament_id, status, kind, created_by)
    values (t2, 'active', 'team', pg_temp.uid(2)) returning id into e4;
  insert into public.team_games(id, scores) values (tg, array[9, 15]);
  insert into public.tournament_matches(tournament_id, phase, round_number, match_number,
    side_a_entry_id, side_b_entry_id, status, team_game_id)
    values (t2, 'final', 1, 1, e3, e4, 'playing', tg);

  -- Un borrador no muestra nada.
  insert into public.tournaments(name, mode, format, capacity, target_score, starts_at, status,
    created_by, updated_by)
  values ('Borrador', '1v1', 'knockout', 4, 30, now() + interval '1 day', 'draft',
    pg_temp.uid(1), pg_temp.uid(1)) returning id into draft;

  perform set_config('request.jwt.claim.sub', pg_temp.uid(1)::text, true);
  set local role authenticated;
  live := public.tournament_live_scores(t2);
  perform pg_temp.check((live->0->>'score_a')::int = 9 and (live->0->>'score_b')::int = 15,
    'puntos 2v2 mal asignados: ' || live::text);
  perform pg_temp.check(public.tournament_live_scores(draft) = '[]'::jsonb, 'un borrador mostró marcadores');
  perform pg_temp.check(public.tournament_live_scores(gen_random_uuid()) = '[]'::jsonb, 'torneo inexistente');
  reset role;
end $$;

rollback;
