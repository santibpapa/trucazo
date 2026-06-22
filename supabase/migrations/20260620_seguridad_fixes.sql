-- ============================================================
-- TRUCAZO — Correcciones de seguridad (seguras, no rompen el juego)
-- Fecha: 2026-06-20
--
-- Qué hace y por qué NO rompe nada:
--   El cliente solo escribe directo en: profiles.insert (registro),
--   games.insert (crear partida) y games.update (jugar). Todo lo demás
--   (mover monedas, crear/unir/cancelar mesas) pasa por funciones
--   SECURITY DEFINER que bypassean RLS (las tablas no tienen FORCE RLS
--   y el dueño de las funciones es el dueño de las tablas). Por eso
--   ajustar las policies de profiles/tables NO afecta a las RPCs.
--
-- Revisalo antes de correr. Idempotente: se puede correr más de una vez.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Forzar monedas/estadísticas iniciales en el registro.
--    Antes: el cliente mandaba coins:1000, pero un atacante podía
--    insertar su perfil con coins arbitrarias (la policy INSERT solo
--    chequeaba auth.uid() = id). Ahora el valor del cliente se ignora.
-- ------------------------------------------------------------
create or replace function public.force_profile_defaults()
returns trigger
language plpgsql
as $$
begin
  new.coins        := 1000;
  new.games_played := 0;
  new.games_won    := 0;
  new.games_lost   := 0;
  return new;
end;
$$;

drop trigger if exists trg_force_profile_defaults on public.profiles;
create trigger trg_force_profile_defaults
  before insert on public.profiles
  for each row execute function public.force_profile_defaults();

-- ------------------------------------------------------------
-- 2) Cerrar la auto-edición de monedas.
--    Antes: policy UPDATE "auth.uid() = id" permitía
--    update profiles set coins = 999999 where id = <yo>.
--    El cliente NUNCA hace update directo de profiles (las monedas
--    se mueven solo por RPCs definer), así que borrar la policy
--    bloquea el abuso sin afectar el juego.
-- ------------------------------------------------------------
drop policy if exists "Los usuarios pueden editar su propio perfil" on public.profiles;

-- ------------------------------------------------------------
-- 3) Cerrar la edición libre de mesas.
--    Antes: policy UPDATE "using true / check true" dejaba a
--    cualquiera modificar la mesa de cualquiera. El cliente no
--    actualiza tables directo (usa create_table/join_table/cancel_table),
--    así que se elimina la policy permisiva.
-- ------------------------------------------------------------
drop policy if exists "Los usuarios pueden actualizar mesas" on public.tables;

-- ------------------------------------------------------------
-- 4) Endurecer finish_game: validar que el ganador sea uno de los
--    dos jugadores (antes podía acreditar el pozo a un id cualquiera).
--    Resto de la lógica idéntico al original.
-- ------------------------------------------------------------
create or replace function public.finish_game(p_game_id uuid, p_winner_id uuid, p_p1_score integer, p_p2_score integer)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  g            games%rowtype;
  v_loser_id   uuid;
  v_winner_un  text;
  v_loser_un   text;
  v_net        numeric;
begin
  select * into g from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;

  -- Idempotente: si ya se liquidó, no hacer nada
  if g.status = 'finished' then return; end if;

  -- Validar que quien llama es uno de los jugadores
  if auth.uid() <> g.player1_id and auth.uid() <> g.player2_id then
    raise exception 'not a player of this game';
  end if;

  -- NUEVO: el ganador tiene que ser uno de los dos jugadores
  if p_winner_id <> g.player1_id and p_winner_id <> g.player2_id then
    raise exception 'winner is not a player of this game';
  end if;

  v_loser_id  := case when p_winner_id = g.player1_id then g.player2_id else g.player1_id end;
  v_winner_un := case when p_winner_id = g.player1_id then g.player1_username else g.player2_username end;
  v_loser_un  := case when p_winner_id = g.player1_id then g.player2_username else g.player1_username end;
  v_net       := g.bet / 2.0;

  update games
     set status = 'finished',
         winner_id = p_winner_id,
         player1_score = p_p1_score,
         player2_score = p_p2_score,
         updated_at = now()
   where id = p_game_id;

  -- Acreditar el pozo al ganador
  update profiles set coins = coins + g.bet where id = p_winner_id;

  -- Historial de ambos
  insert into game_history (player_id, opponent_id, opponent_username, result, coins_change)
  values
    (p_winner_id, v_loser_id,  v_loser_un,  'win',   v_net),
    (v_loser_id,  p_winner_id, v_winner_un, 'loss', -v_net);
end;
$function$;

-- ------------------------------------------------------------
-- 5) Crear cancel_table (no existía → el botón "Cancelar mesa"
--    fallaba y la apuesta quedaba descontada sin reembolso).
--    Solo el creador, solo si la mesa sigue 'waiting'. Reembolsa
--    la apuesta y borra la mesa.
-- ------------------------------------------------------------
create or replace function public.cancel_table(p_table_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  t tables%rowtype;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;

  select * into t from tables where id = p_table_id for update;
  if not found then return; end if;  -- idempotente: ya no existe

  if t.creator_id <> auth.uid() then
    raise exception 'solo el creador puede cancelar la mesa';
  end if;
  if t.status <> 'waiting' then
    raise exception 'la mesa ya no se puede cancelar';
  end if;

  -- Reembolsar la apuesta al creador
  update profiles set coins = coins + t.bet where id = t.creator_id;

  delete from tables where id = p_table_id;
end;
$function$;

grant execute on function public.cancel_table(uuid) to anon, authenticated;

commit;
