-- ============================================================
-- TRUCAZO — "Son buenas": ocultar el tanto del pie
-- Fecha: 2026-06-22
--
-- Cuando el envido lo gana la MANO, el pie (no-mano) "dice son buenas"
-- y NO revela su tanto. Antes el server guardaba player1_points y
-- player2_points siempre, así que el número del pie viajaba a ambos
-- clientes y se podía leer. Ahora, si gana la mano, el tanto del pie
-- se guarda como NULL (no se expone). El cálculo del ganador y los
-- puntajes NO cambian: solo cambia lo que se publica en envido_state.
--
-- Si gana el PIE (tiene más que la mano), se revelan los dos (sin cambios).
-- Solo se reemplaza respond_envido; el resto de la etapa 2 queda igual.
-- ============================================================

begin;

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
  expose1 int;  -- tanto de player1 que se publica (NULL = oculto)
  expose2 int;  -- tanto de player2 que se publica (NULL = oculto)
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

    -- "Son buenas": si gana la mano, el pie (no-mano) no revela su tanto.
    -- (El empate lo gana la mano, así que también entra acá.)
    expose1 := pts1;
    expose2 := pts2;
    if winner = g.mano_player then
      if g.mano_player = g.player1_id then expose2 := null; else expose1 := null; end if;
    end if;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object(
        'status','accepted','winner_id',winner,'player1_points',expose1,'player2_points',expose2,'awarded',val),
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

grant execute on function public.respond_envido(uuid, boolean) to anon, authenticated;

commit;
