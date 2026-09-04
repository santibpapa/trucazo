-- ============================================================
-- ¿Quedó la base entera?
--
-- Se corre al final de scripts/rebuild-db.sh, pero sirve suelto para revisar
-- cualquier base de prueba:
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/reconstruccion_completa.sql
--
-- Termina en 0 si está todo, y en distinto de 0 si falta algo.
--
-- Está separado del script a propósito: así se puede comprobar que el control
-- DE VERDAD detecta lo que falta (borrar un trigger a mano y ver que se queja).
-- Un control que nunca viste fallar no controla nada.
-- ============================================================

do $control$
declare
  n_tablas   int;
  n_triggers int;
  n_salones  int;
  n_medallas int;
  n_rivales  int;
  faltan     text[] := '{}';
begin
  select count(*) into n_tablas
    from pg_tables where schemaname = 'public';

  -- Los 7 triggers del juego. Uno de ellos (el que crea el perfil al
  -- registrarse) cuelga de auth.users, que está en otro schema.
  select count(*) into n_triggers
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal
     and t.tgname in ('trg_award_medals', 'trg_award_barrida', 'trg_award_on_history',
                      'trg_force_profile_defaults', 'trg_touch_turn_start',
                      'trg_record_objectives', 'on_auth_user_created');

  select count(*) into n_salones  from public.salons;
  select count(*) into n_medallas from public.medals;
  select count(*) into n_rivales  from public.campaign_rivals;

  if n_tablas < 36 then
    faltan := array_append(faltan, format('tablas: %s (esperaba 36 o más)', n_tablas));
  end if;
  if n_triggers < 7 then
    faltan := array_append(faltan, format(
      'triggers: %s de 7. Faltan: %s',
      n_triggers,
      (select string_agg(esperado, ', ')
         from unnest(array['trg_award_medals', 'trg_award_barrida', 'trg_award_on_history',
                           'trg_force_profile_defaults', 'trg_touch_turn_start',
                           'trg_record_objectives',
                           'on_auth_user_created']) esperado
        where not exists (select 1 from pg_trigger t
                           where t.tgname = esperado and not t.tgisinternal))));
  end if;
  if n_salones  = 0 then faltan := array_append(faltan, 'no hay salones en el catálogo'); end if;
  if n_medallas = 0 then faltan := array_append(faltan, 'no hay medallas en el catálogo'); end if;
  if n_rivales  = 0 then faltan := array_append(faltan, 'no hay rivales de campaña'); end if;

  if array_length(faltan, 1) > 0 then
    raise exception E'La base quedó incompleta:\n  - %', array_to_string(faltan, E'\n  - ');
  end if;

  raise notice 'OK: % tablas, % triggers, % salones, % medallas, % rivales',
    n_tablas, n_triggers, n_salones, n_medallas, n_rivales;
end
$control$;
