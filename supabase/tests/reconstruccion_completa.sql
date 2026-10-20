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
  n_torneos  int;
  n_rpc_torneos int;
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
  select count(*) into n_torneos
    from pg_tables
   where schemaname = 'public'
     and tablename = any(array[
       'tournaments', 'tournament_entries', 'tournament_entry_members',
       'tournament_checkins', 'tournament_groups', 'tournament_group_members',
       'tournament_matches', 'tournament_match_presence', 'tournament_awards',
       'tournament_notifications', 'tournament_email_jobs'
     ]);
  select count(*) into n_rpc_torneos
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname = any(array[
       'tournament_list', 'tournament_detail', 'tournament_my_entry',
       'tournament_admin_create', 'tournament_admin_update',
       'tournament_admin_publish', 'tournament_admin_reschedule',
       'tournament_admin_cancel', 'tournament_register_solo',
       'tournament_invite_partner', 'tournament_respond_invitation',
       'tournament_withdraw', 'tournament_check_in'
     ]);

  if n_tablas < 47 then
    faltan := array_append(faltan, format('tablas: %s (esperaba 47 o más)', n_tablas));
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
  if n_torneos <> 11 then
    faltan := array_append(faltan, format('tablas de torneos: %s de 11', n_torneos));
  end if;
  if n_rpc_torneos <> 13 then
    faltan := array_append(faltan, format('RPC de torneos: %s de 13', n_rpc_torneos));
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'tournament_internal') then
    faltan := array_append(faltan, 'falta el schema privado tournament_internal');
  end if;

  if array_length(faltan, 1) > 0 then
    raise exception E'La base quedó incompleta:\n  - %', array_to_string(faltan, E'\n  - ');
  end if;

  raise notice 'OK: % tablas, % triggers, % salones, % medallas, % rivales, % tablas y % RPC de torneos',
    n_tablas, n_triggers, n_salones, n_medallas, n_rivales, n_torneos, n_rpc_torneos;
end
$control$;
