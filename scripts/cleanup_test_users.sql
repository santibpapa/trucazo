-- ============================================================
-- Limpieza de los usuarios de prueba del e2e (e2e_A_*, e2e_B_*)
-- Correr en Supabase → SQL Editor (corre como admin).
-- Borra en orden de dependencias y, por último, los usuarios de auth.
-- ============================================================
do $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.profiles where username like 'e2e\_%';
  if ids is null then
    raise notice 'No hay usuarios de prueba para borrar.';
    return;
  end if;

  delete from public.game_history where player_id = any(ids) or opponent_id = any(ids);
  -- game_hands y game_presence se borran en cascada al borrar games
  delete from public.games  where player1_id = any(ids) or player2_id = any(ids);
  delete from public.tables where creator_id = any(ids) or opponent_id = any(ids);
  delete from public.profiles where id = any(ids);
  delete from auth.users where id = any(ids);

  raise notice 'Borrados % usuarios de prueba.', array_length(ids, 1);
end $$;
