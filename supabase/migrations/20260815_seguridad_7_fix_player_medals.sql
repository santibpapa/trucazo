-- ============================================================
-- TRUCAZO — Arreglo: la lista de medallas se rompía para los mejores jugadores
-- Fecha: 2026-08-15
--
-- ESTO NO ES UN TEMA DE SEGURIDAD. Apareció mientras se probaban los permisos
-- del PR #10 (se llamó a `player_medals` con el rol del navegador y reventó).
-- Va en su propia migración para no mezclarlo con lo otro.
--
-- EL BUG: dentro de la función había
--
--     arr := arr || 'top10';
--
-- donde `arr` es un text[]. Postgres, ante `array || literal`, entiende que
-- querés pegar DOS ARRAYS e intenta leer 'top10' como si fuera un array. Falla
-- con "malformed array literal".
--
-- A QUIÉN LE PASABA: solo a los jugadores que entran en alguna de esas tres
-- ramas — el top 10 por partidas ganadas, el top 5 de la campaña, y el número
-- uno. O sea, a los MEJORES jugadores, justo los que más miran su perfil. Al
-- resto no, porque nunca entraban ahí. Por eso pasó desapercibido.
--
-- Verificado en Postgres antes y después:
--   jugador con 0 victorias  -> andaba bien (devolvía sus medallas)
--   jugador dentro del top 10 -> "malformed array literal: top10"
--
-- EL ARREGLO: usar array_append, que no tiene esa ambigüedad. La lógica de qué
-- medalla corresponde queda intacta.
--
-- Idempotente.
-- ============================================================

begin;

create or replace function public.player_medals(p_uid uuid)
 returns text[] language plpgsql security definer set search_path to 'public'
as $function$
declare
  arr    text[];
  v_won  integer;
  v_camp integer;
begin
  select coalesce(array_agg(medal_slug), '{}') into arr
    from profile_medals where profile_id = p_uid;

  select games_won, campaign_points into v_won, v_camp from profiles where id = p_uid;
  if not found then return arr; end if;

  if coalesce(v_won, 0) > 0
     and p_uid in (select id from profiles where not is_bot order by games_won desc limit 10) then
    arr := array_append(arr, 'top10');
  end if;
  if coalesce(v_camp, 0) > 0
     and p_uid in (select id from profiles where not is_bot order by campaign_points desc limit 5) then
    arr := array_append(arr, 'top5_campana');
  end if;
  if p_uid = (select id from profiles where not is_bot and campaign_points > 0
              order by campaign_points desc limit 1) then
    arr := array_append(arr, 'rey');
  end if;

  return arr;
end;
$function$;

commit;
