-- ============================================================
-- TRUCAZO — Bonus anti-quiebra
-- Fecha: 2026-06-24
--
-- Si un jugador se queda sin monedas para jugar (por debajo de la apuesta
-- mínima de 10), puede reclamar un bonus que lo restablece a 100. Como solo
-- se puede reclamar estando por debajo del umbral, no se puede farmear.
-- Idempotente.
-- ============================================================

begin;

create or replace function public.claim_bonus()
 returns int language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_coins int;
  v_floor int := 100;   -- saldo al que se restablece
  v_threshold int := 10; -- apuesta mínima para jugar
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  select coins into v_coins from profiles where id = auth.uid() for update;
  if not found then raise exception 'perfil no encontrado'; end if;
  if v_coins >= v_threshold then
    raise exception 'todavia tenés monedas para jugar';
  end if;
  update profiles set coins = v_floor where id = auth.uid();
  return v_floor;
end;
$function$;

grant execute on function public.claim_bonus() to anon, authenticated;

commit;
