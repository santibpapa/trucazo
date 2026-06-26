-- ============================================================
-- TRUCAZO — Fix: reponer "son buenas" sobre la versión target_score
-- Fecha: 2026-06-26
--
-- Regresión: dos migraciones del 2026-06-22 redefinen respond_envido.
--   * 20260622_envido_son_buenas.sql  → oculta el tanto del pie (expose=null)
--                                        pero con el objetivo fijo en 30.
--   * 20260622_target_score.sql       → parametriza el objetivo (g.target_score)
--                                        pero SIN el ocultamiento de "son buenas".
-- Como Supabase aplica las migraciones por orden alfabético de archivo,
-- target_score corre DESPUÉS y pisa el ocultamiento: en una DB reconstruida
-- desde cero, el tanto del pie vuelve a publicarse en envido_state y viaja por
-- Realtime a ambos jugadores.
--
-- Esta migración fusiona ambas: objetivo parametrizado + ocultamiento del pie.
-- Es la versión canónica de respond_envido (la última en el tiempo). Idempotente.
-- ============================================================

begin;

create or replace function public.respond_envido(p_game_id uuid, p_accept boolean)
 returns games language plpgsql security definer set search_path to 'public'
as $function$
declare
  g games%rowtype; uid uuid := auth.uid();
  h1 jsonb; h2 jsonb; pts1 int; pts2 int; winner uuid; val int; singer uuid; next_turn uuid; s1 int; s2 int;
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
    val := public._envido_reject_value(g.envido_state->'chain', g.player1_score, g.player2_score, g.target_score);
    s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
    s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

    update games set
      player1_score = s1, player2_score = s2,
      envido_state = g.envido_state || jsonb_build_object('status','rejected','winner_id',singer,'awarded',val),
      current_turn = next_turn, updated_at = now()
    where id = p_game_id returning * into g;
  end if;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
    select * into g from games where id = p_game_id;
  end if;
  return g;
end;
$function$;

grant execute on function public.respond_envido(uuid, boolean) to anon, authenticated;

commit;
