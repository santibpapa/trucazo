-- ============================================================
-- TRUCAZO — "El envido va primero": el truco espera al envido
-- ============================================================
-- Bug: si respondías un truco cantando envido, el truco quedaba
-- "respondible" mientras el envido seguía sin resolverse. El que
-- cantó el envido podía aceptar/rechazar el truco (o escalarlo)
-- con el envido colgado, rompiendo la regla.
--
-- Fix (servidor como única autoridad):
--  * respond_truco: no se puede responder el truco si hay un envido
--    sin resolver (cantado o en el diálogo de tantos).
--  * sing_truco: idem para cantar/escalar truco; antes solo bloqueaba
--    al que debía responder el envido, ahora bloquea a los dos y
--    también durante el diálogo de tantos ('declaring').
-- ============================================================

create or replace function public.respond_truco(p_game_id uuid, p_accept boolean)
returns games
language plpgsql
security definer
set search_path to 'public'
as $function$
declare g games%rowtype; uid uuid := auth.uid(); singer uuid; val int; s1 int; s2 int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  if not (g.truco_state->>'status' in ('truco','retruco','vale_cuatro')
          and (g.truco_state->>'last_singer') is distinct from uid::text) then
    raise exception 'no hay truco para responder';
  end if;

  -- El envido va primero: con un envido sin resolver, el truco espera.
  if g.envido_state->>'status' in ('envido','real_envido','falta_envido','declaring') then
    raise exception 'primero se resuelve el envido';
  end if;

  if p_accept then
    update games set truco_state = g.truco_state || jsonb_build_object('status','accepted'),
      current_turn = public._who_plays_next(g), updated_at = now()
    where id = p_game_id returning * into g;
    return g;
  end if;

  begin perform public._record_style(p_game_id, 'truco_folded'); exception when others then null; end;

  singer := (g.truco_state->>'last_singer')::uuid;
  val := (g.truco_state->>'value')::int - 1;
  s1 := g.player1_score + case when singer = g.player1_id then val else 0 end;
  s2 := g.player2_score + case when singer = g.player2_id then val else 0 end;

  if s1 >= g.target_score or s2 >= g.target_score then
    perform public.finish_game(p_game_id, case when s1 >= g.target_score then g.player1_id else g.player2_id end, s1, s2);
  else
    update games set
      player1_score = s1, player2_score = s2,
      truco_state = g.truco_state || jsonb_build_object('status','rejected'),
      awaiting_deal = true, updated_at = now()
    where id = p_game_id;
  end if;

  select * into g from games where id = p_game_id;
  return g;
end;
$function$;

create or replace function public.sing_truco(p_game_id uuid, p_type text)
returns games
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  g       games%rowtype;
  uid     uuid := auth.uid();
  oppid   uuid;
  st      text;
  last_s  text;
  pending boolean;
  cur_val int;
  req_val int;
begin
  if uid is null then raise exception 'no autenticado'; end if;
  if p_type not in ('truco','retruco','vale_cuatro') then raise exception 'tipo invalido'; end if;

  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'playing' then raise exception 'la partida no esta en juego'; end if;
  if uid <> g.player1_id and uid <> g.player2_id then raise exception 'not a player of this game'; end if;

  oppid  := case when uid = g.player1_id then g.player2_id else g.player1_id end;
  st     := g.truco_state->>'status';
  last_s := g.truco_state->>'last_singer';
  pending := st in ('truco','retruco','vale_cuatro');
  cur_val := case when st = 'none' then 1 else (g.truco_state->>'value')::int end;
  req_val := case p_type when 'truco' then 2 when 'retruco' then 3 else 4 end;

  -- El envido va primero: con un envido sin resolver no se canta ni escala truco.
  if g.envido_state->>'status' in ('envido','real_envido','falta_envido','declaring') then
    raise exception 'primero se resuelve el envido';
  end if;

  if pending and last_s is distinct from uid::text then
    -- respondés subiendo la apuesta
    if req_val <> cur_val + 1 then raise exception 'escalada de truco invalida'; end if;
  elsif st = 'none' then
    if p_type <> 'truco' then raise exception 'primero hay que cantar truco'; end if;
    if g.current_turn <> uid then raise exception 'no es tu turno'; end if;
  elsif st = 'accepted' and last_s is distinct from uid::text and cur_val < 4 then
    if req_val <> cur_val + 1 then raise exception 'escalada de truco invalida'; end if;
    if g.current_turn <> uid then raise exception 'no es tu turno'; end if;
  else
    raise exception 'no podes cantar truco ahora';
  end if;

  update games set
    truco_state = jsonb_build_object('status', p_type, 'last_singer', uid, 'value', req_val),
    current_turn = oppid,
    updated_at = now()
  where id = p_game_id returning * into g;

  begin perform public._record_style(p_game_id, 'truco_sung'); exception when others then null; end;
  return g;
end;
$function$;
