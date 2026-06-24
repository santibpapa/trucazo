-- ============================================================
-- TRUCAZO — Reglas de la cadena de envido en sing_envido
-- Fecha: 2026-06-22
--
-- Permite el "envido-envido" (cantar envido dos veces → 4 pts) y valida el
-- orden de la cadena al escalar:
--   * envido      : solo si el último canto fue envido y hay menos de 2 envidos
--   * real_envido : solo después de envido
--   * falta_envido: después de envido o real_envido
-- El valor ya se calculaba bien (_envido_quiero_value: cada envido = 2).
-- Idempotente.
-- ============================================================

begin;

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
  cur_status text;
  envido_count int;
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
  cur_status := g.envido_state->>'status';

  is_escalation := cur_status in ('envido','real_envido','falta_envido')
                   and (g.envido_state->>'last_singer') is distinct from uid::text;

  if is_escalation then
    -- validar el orden de la cadena
    envido_count := (select count(*) from jsonb_array_elements_text(coalesce(g.envido_state->'chain','[]'::jsonb)) c where c = 'envido');
    if p_type = 'envido' then
      if not (cur_status = 'envido' and envido_count < 2) then raise exception 'no podes cantar envido de nuevo'; end if;
    elsif p_type = 'real_envido' then
      if cur_status <> 'envido' then raise exception 'no podes cantar real envido aca'; end if;
    elsif p_type = 'falta_envido' then
      if cur_status not in ('envido','real_envido') then raise exception 'no podes cantar falta envido aca'; end if;
    end if;
  else
    -- canto fresco: 1ª ronda, sin haber jugado, sin truco aceptado
    if cur_status <> 'none' then raise exception 'el envido ya fue cantado'; end if;
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

commit;
