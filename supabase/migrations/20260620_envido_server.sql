-- ============================================================
-- TRUCAZO — Etapa 2: envido del lado del servidor
-- Fecha: 2026-06-20
--
-- sing_envido  : cantar/escalar envido (calcula el valor server-side)
-- respond_envido: "quiero" (lee las dos manos) y "no quiero", con el turno
--                 siguiente calculado en el servidor; termina la partida si
--                 alguien llega a 30.
--
-- No cierra todavía el UPDATE de games (etapa final). Idempotente.
-- ============================================================

begin;

-- ---- Helpers de valor de envido (espejo de GameClient) ----
create or replace function public._envido_quiero_value(chain jsonb, p1 int, p2 int)
returns int language sql immutable as $$
  select case
    when chain ? 'falta_envido' then 30 - greatest(p1, p2)
    else coalesce((
      select sum(case when e.value #>> '{}' = 'envido' then 2
                      when e.value #>> '{}' = 'real_envido' then 3
                      else 0 end)
      from jsonb_array_elements(chain) e), 0)
  end::int;
$$;

create or replace function public._envido_reject_value(chain jsonb, p1 int, p2 int)
returns int language sql immutable as $$
  select case
    when jsonb_array_length(coalesce(chain, '[]'::jsonb)) <= 1 then 1
    else greatest(public._envido_quiero_value(chain - (jsonb_array_length(chain) - 1), p1, p2), 1)
  end;
$$;

-- ---- Helpers de turno (espejo de roundLeader / whoPlaysNext / turnAfterEnvido) ----
create or replace function public._round_leader(g public.games, rnum int)
returns uuid language sql stable as $$
  select case when rnum = 1 then g.mano_player
    else coalesce(
      (select (e.value->>'winner_id')::uuid
       from jsonb_array_elements(g.round_results) e
       where (e.value->>'round')::int = rnum - 1 and e.value->>'winner_id' is not null
       limit 1),
      g.mano_player) end;
$$;

create or replace function public._who_plays_next(g public.games)
returns uuid language sql stable as $$
  select case
    when not exists (
      select 1 from jsonb_array_elements(g.played_cards) e
      where (e.value->>'round')::int = g.round_number)
    then public._round_leader(g, g.round_number)
    else case
      when (select e.value->>'player_id' from jsonb_array_elements(g.played_cards) e
            where (e.value->>'round')::int = g.round_number limit 1) = g.player1_id::text
      then g.player2_id else g.player1_id end
  end;
$$;

create or replace function public._turn_after_envido(g public.games)
returns uuid language sql stable as $$
  select case
    when g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
    then case when (g.truco_state->>'last_singer') = g.player1_id::text
              then g.player2_id else g.player1_id end
    else public._who_plays_next(g) end;
$$;

-- ---- Cantar / escalar envido ----
create or replace function public.sing_envido(p_game_id uuid, p_type text)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g    games%rowtype;
  uid  uuid := auth.uid();
  oppid uuid;
  is_escalation boolean;
  is_my_turn boolean;
  truco_pending_on_me boolean;
  new_chain jsonb;
  val int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_type not in ('envido','real_envido','falta_envido') then raise exception 'tipo invalido'; end if;

  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  oppid := case when uid = g.player1_id then g.player2_id else g.player1_id end;

  is_escalation := g.envido_state->>'status' in ('envido','real_envido','falta_envido')
                   and (g.envido_state->>'last_singer') is distinct from uid::text;

  if not is_escalation then
    -- canto fresco: 1ª ronda, sin haber jugado, sin truco aceptado
    if g.envido_state->>'status' <> 'none' then raise exception 'el envido ya fue cantado'; end if;
    if g.round_number <> 1 then raise exception 'el envido solo se canta en la primera ronda'; end if;
    if g.truco_state->>'status' = 'accepted' then raise exception 'el truco ya esta en juego'; end if;
    if exists (select 1 from jsonb_array_elements(g.played_cards) e where e.value->>'player_id' = uid::text)
      then raise exception 'ya jugaste una carta'; end if;
    is_my_turn := g.current_turn = uid;
    truco_pending_on_me := g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
                           and (g.truco_state->>'last_singer') is distinct from uid::text;
    if not (is_my_turn or truco_pending_on_me) then raise exception 'no podes cantar ahora'; end if;
  end if;

  new_chain := coalesce(g.envido_state->'chain', '[]'::jsonb) || to_jsonb(p_type);
  val := public._envido_quiero_value(new_chain, g.player1_score, g.player2_score);

  update games set
    envido_state = jsonb_build_object('status', p_type, 'last_singer', uid, 'value', val, 'chain', new_chain),
    current_turn = oppid,
    updated_at = now()
  where id = p_game_id returning * into g;
  return g;
end;
$function$;

-- ---- Responder envido (quiero / no quiero) ----
create or replace function public.respond_envido(p_game_id uuid, p_accept boolean)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g      games%rowtype;
  uid    uuid := auth.uid();
  h1 jsonb; h2 jsonb;
  pts1 int; pts2 int;
  winner uuid;
  val int;
  singer uuid;
  next_turn uuid;
  s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;

  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  -- tiene que haber un envido pendiente dirigido a vos
  if not (g.envido_state->>'status' in ('envido','real_envido','falta_envido')
          and (g.envido_state->>'last_singer') is distinct from uid::text) then
    raise exception 'no hay envido para responder';
  end if;

  next_turn := public._turn_after_envido(g);
  val := coalesce((g.envido_state->>'value')::int, 0);

  if p_accept then
    select cards into h1 from game_hands where game_id = p_game_id and player_id = g.player1_id;
    select cards into h2 from game_hands where game_id = p_game_id and player_id = g.player2_id;
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
    else                   winner := g.mano_player; end if;

    s1 := g.player1_score + case when winner = g.player1_id then val else 0 end;
    s2 := g.player2_score + case when winner = g.player2_id then val else 0 end;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object(
        'status','accepted','winner_id',winner,'player1_points',pts1,'player2_points',pts2,'awarded',val),
      current_turn = next_turn, updated_at = now()
    where id = p_game_id returning * into g;
  else
    singer := (g.envido_state->>'last_singer')::uuid;
    val := public._envido_reject_value(g.envido_state->'chain', g.player1_score, g.player2_score);
    s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
    s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object(
        'status','rejected','winner_id',singer,'awarded',val),
      current_turn = next_turn, updated_at = now()
    where id = p_game_id returning * into g;
  end if;

  if s1 >= 30 or s2 >= 30 then
    perform public.finish_game(p_game_id, case when s1 >= 30 then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
  end if;
  return g;
end;
$function$;

grant execute on function public.sing_envido(uuid, text)     to anon, authenticated;
grant execute on function public.respond_envido(uuid, boolean) to anon, authenticated;

commit;
