-- ============================================================
-- TRUCAZO — Arreglo urgente de bot_step
-- Fecha: 2026-10-30
--
-- 20261030223000 dejó en bot_step una consulta con el alias "g", que es
-- también el nombre de una variable de la función. Postgres no sabe a cuál se
-- refiere y corta con "column reference is ambiguous": los bots de Historia y
-- del lobby dejaban de jugar. Los bots de torneo no pasaban por esa línea.
-- Única diferencia con 20261030223000: el alias pasa a llamarse "gm".
-- ============================================================

begin;

create or replace function public.bot_step(p_game_id uuid)
returns games language plpgsql security definer set search_path = public as $function$
declare uid uuid := auth.uid(); g games%rowtype; v_bot uuid;
begin
  select b.bot_id into v_bot from games gm
    join tournament_internal.bot_players b on b.bot_id in (gm.player1_id, gm.player2_id)
   where gm.id = p_game_id limit 1;
  if v_bot is not null then
    if uid is null then raise exception 'no autenticado'; end if;
    select * into g from games where id = p_game_id;
    if uid not in (g.player1_id, g.player2_id) then raise exception 'not a player of this game'; end if;
    if uid = v_bot then raise exception 'el bot no juega solo'; end if;
    perform tournament_internal.bot_act(p_game_id, v_bot);
    select * into g from games where id = p_game_id;
    return g;
  end if;
  if exists (select 1 from games gm join campaign_rivals r on r.id = gm.campaign_rival_id
             where gm.id = p_game_id and r.strategy_profile is not null) then
    return public._northwest_bot_step(p_game_id);
  end if;
  return public._bot_step_pre_noroeste(p_game_id);
end;
$function$;

revoke execute on function public.bot_step(uuid) from public, anon;
grant execute on function public.bot_step(uuid) to authenticated;

commit;
