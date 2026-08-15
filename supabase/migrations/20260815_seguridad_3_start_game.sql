-- ============================================================
-- TRUCAZO — Seguridad (3 de 5): `start_game` autoriza antes de devolver nada
-- Fecha: 2026-08-15
--
-- EL AGUJERO (verificado): la función arrancaba con
--
--     select * into g from games where id = p_game_id;
--     if found then return g; end if;
--
-- o sea que si la partida YA existía, devolvía la fila y recién después (más
-- abajo, en la rama de creación) chequeaba que quien llamaba fuera jugador. Con
-- solo saber el ID, un tercero leía la partida de otras dos personas: nombres,
-- puntaje, pozo y cartas jugadas. En la prueba se leyó "Ana vs Juan, 0-0, pozo
-- 100".
--
-- Las manos NO se filtraban por acá (viven en game_hands, con su propia RLS, y
-- eso se verificó aparte: un tercero ve cero manos). Tampoco se filtraban por
-- consulta directa a `games`: la RLS de esa tabla estaba bien. El agujero era
-- solo esta función, que por ser "security definer" saltea la RLS.
--
-- EL ARREGLO: preguntar primero quién sos. La mesa (`tables`) dice quiénes son
-- los dos jugadores, así que se valida contra ella antes de tocar `games`, y esa
-- validación cubre los dos caminos (partida ya existente y partida recién
-- creada, incluido el empate de dos jugadores entrando a la vez).
--
-- Idempotente.
-- ============================================================

begin;

create or replace function public.start_game(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare t tables%rowtype; g games%rowtype; h1 jsonb; h2 jsonb;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  -- === Autorización PRIMERO, antes de devolver ningún dato ===
  -- La mesa es la que sabe quiénes juegan. Si no sos ninguno de los dos, acá se
  -- termina: no llegás ni a enterarte de si la partida existe.
  select * into t from tables where id = p_game_id;
  if not found then raise exception 'mesa no encontrada'; end if;
  if auth.uid() <> t.creator_id and auth.uid() is distinct from t.opponent_id then
    raise exception 'no sos jugador de esta mesa';
  end if;

  -- Ya autorizado: si la partida existe, se devuelve.
  select * into g from games where id = p_game_id;
  if found then return g; end if;

  -- Si no existe, se crea (bloqueando la mesa para que no se cree dos veces).
  select * into t from tables where id = p_game_id for update;
  if not found then raise exception 'mesa no encontrada'; end if;
  if t.opponent_id is null then raise exception 'la mesa todavia no tiene rival'; end if;

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

  -- Camino concurrente: la creó el otro jugador entre medio. Ya está autorizado
  -- arriba, así que devolver la fila es seguro.
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

commit;
