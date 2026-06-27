-- ============================================================
-- TRUCAZO — Fix: la revancha hereda el tiempo por jugada
-- Fecha: 2026-06-27
--
-- request_rematch ya copiaba target_score (puntos) pero NO time_limit (tiempo),
-- porque se escribió antes de que existiera el reloj. Por eso la revancha caía
-- siempre en el default (30s). Ahora copia también el tiempo, así la revancha es
-- idéntica a la partida anterior (mismos puntos y mismo tiempo). Idempotente.
-- ============================================================

begin;

create or replace function public.request_rematch(p_game_id uuid)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g          games%rowtype;
  uid        uuid := auth.uid();
  per_stake  int;
  new_id     uuid;
  h1 jsonb; h2 jsonb;
  c1 int; c2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'finished' then raise exception 'la partida todavia no terminó'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  -- la revancha ya está creada: devolvemos el estado (el cliente navega)
  if g.rematch_game_id is not null then return g; end if;

  -- registrar el voto del que llama
  if uid = g.player1_id then
    update games set rematch_p1 = true where id = p_game_id;
    g.rematch_p1 := true;
  else
    update games set rematch_p2 = true where id = p_game_id;
    g.rematch_p2 := true;
  end if;

  -- si ambos quieren, crear la nueva partida
  if g.rematch_p1 and g.rematch_p2 then
    per_stake := g.bet / 2;  -- g.bet es el pozo (apuesta * 2)

    select coins into c1 from profiles where id = g.player1_id for update;
    select coins into c2 from profiles where id = g.player2_id for update;
    if c1 < per_stake or c2 < per_stake then
      raise exception 'monedas insuficientes para la revancha';
    end if;

    update profiles set coins = coins - per_stake where id = g.player1_id;
    update profiles set coins = coins - per_stake where id = g.player2_id;

    new_id := gen_random_uuid();
    select d.h1, d.h2 into h1, h2 from public._deal_hands() d;

    -- tabla asociada (privada y ya 'playing', no aparece en el lobby).
    -- Hereda puntos (target_score) Y tiempo (time_limit) de la partida anterior.
    insert into tables (id, name, creator_id, creator_username, opponent_id, opponent_username,
                        bet, is_private, private_code, status, target_score, time_limit)
    values (new_id, 'Revancha', g.player1_id, g.player1_username, g.player2_id, g.player2_username,
            per_stake, true, null, 'playing', g.target_score, g.time_limit);

    -- la nueva partida: alterna la mano (ahora arranca player2)
    insert into games (id, player1_id, player2_id, player1_username, player2_username,
                       current_turn, mano_player, bet, target_score, time_limit)
    values (new_id, g.player1_id, g.player2_id, g.player1_username, g.player2_username,
            g.player2_id, g.player2_id, g.bet, g.target_score, g.time_limit);

    insert into game_hands (game_id, player_id, cards) values
      (new_id, g.player1_id, h1),
      (new_id, g.player2_id, h2);

    update games set rematch_game_id = new_id where id = p_game_id;
    select * into g from games where id = p_game_id;
  end if;

  return g;
end;
$function$;

grant execute on function public.request_rematch(uuid) to anon, authenticated;

commit;
