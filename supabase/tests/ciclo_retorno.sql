-- ============================================================
-- TRUCAZO — Pruebas del ciclo de retorno
--
-- Ejecutar sólo contra una base LOCAL reconstruida:
--   psql -f supabase/tests/ciclo_retorno.sql
--
-- Cubre progreso idempotente, reclamo doble, privacidad, clasificación de
-- modos, rotación diaria, fecha argentina y la única protección semanal de racha.
-- ============================================================

\set ON_ERROR_STOP on
\pset footer off

begin;

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000001','authenticated','authenticated','objetivos-ana@ejemplo.test',now(),now()),
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000002','authenticated','authenticated','objetivos-juan@ejemplo.test',now(),now()),
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000003','authenticated','authenticated','objetivos-mala@ejemplo.test',now(),now()),
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000004','authenticated','authenticated','objetivos-bot@ejemplo.test',now(),now()),
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000005','authenticated','authenticated','objetivos-racha@ejemplo.test',now(),now())
on conflict (id) do nothing;

insert into auth.users
  (instance_id, id, aud, role, email, is_anonymous, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','dd000000-0000-4000-a000-000000000006','authenticated','authenticated','objetivos-invitado@ejemplo.test',true,now(),now())
on conflict (id) do update set is_anonymous = true;

insert into public.profiles (id, username, coins, is_bot)
values
  ('dd000000-0000-4000-a000-000000000001','ObjetivosAna',1000,false),
  ('dd000000-0000-4000-a000-000000000002','ObjetivosJuan',1000,false),
  ('dd000000-0000-4000-a000-000000000003','ObjetivosMala',1000,false),
  ('dd000000-0000-4000-a000-000000000004','ObjetivosBot',1000,true),
  ('dd000000-0000-4000-a000-000000000005','ObjetivosRacha',1000,false),
  ('dd000000-0000-4000-a000-000000000006','ObjetivosInvitado',1000,false)
on conflict (id) do update set
  username = excluded.username, coins = excluded.coins, is_bot = excluded.is_bot;

insert into public.tables
  (id, name, creator_id, creator_username, opponent_id, opponent_username,
   bet, is_private, status, target_score, time_limit)
values
  ('dd100000-0000-4000-a000-000000000001','Pública objetivos','dd000000-0000-4000-a000-000000000001','ObjetivosAna','dd000000-0000-4000-a000-000000000002','ObjetivosJuan',20,false,'playing',15,30),
  ('dd100000-0000-4000-a000-000000000002','Bot objetivos','dd000000-0000-4000-a000-000000000001','ObjetivosAna','dd000000-0000-4000-a000-000000000004','ObjetivosBot',20,false,'playing',15,30),
  ('dd100000-0000-4000-a000-000000000003','Privada objetivos','dd000000-0000-4000-a000-000000000001','ObjetivosAna','dd000000-0000-4000-a000-000000000003','ObjetivosMala',20,true,'playing',15,30),
  ('dd100000-0000-4000-a000-000000000004','Revancha objetivos','dd000000-0000-4000-a000-000000000001','ObjetivosAna','dd000000-0000-4000-a000-000000000002','ObjetivosJuan',20,true,'playing',15,30),
  ('dd100000-0000-4000-a000-000000000005','Racha objetivos','dd000000-0000-4000-a000-000000000005','ObjetivosRacha','dd000000-0000-4000-a000-000000000004','ObjetivosBot',20,false,'playing',15,30),
  ('dd100000-0000-4000-a000-000000000006','Racha segunda','dd000000-0000-4000-a000-000000000005','ObjetivosRacha','dd000000-0000-4000-a000-000000000004','ObjetivosBot',20,false,'playing',15,30);

insert into public.games
  (id, player1_id, player2_id, player1_username, player2_username,
   current_turn, mano_player, bet, status, played_cards, target_score, time_limit)
select t.id, t.creator_id, t.opponent_id, t.creator_username, t.opponent_username,
       t.creator_id, t.creator_id, t.bet * 2, 'playing', '[{}]'::jsonb, t.target_score, t.time_limit
  from public.tables t where t.id::text like 'dd100000-%';

update public.games set rematch_game_id = 'dd100000-0000-4000-a000-000000000004'
 where id = 'dd100000-0000-4000-a000-000000000001';

select set_config('request.jwt.claim.sub','dd000000-0000-4000-a000-000000000001',false) \gset
select public.get_my_objectives(null);

update public.games set status='finished', winner_id='dd000000-0000-4000-a000-000000000001', player1_score=15
 where id in ('dd100000-0000-4000-a000-000000000001','dd100000-0000-4000-a000-000000000002','dd100000-0000-4000-a000-000000000003');

do $test$
declare
  ana uuid := 'dd000000-0000-4000-a000-000000000001';
  today_ar date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  before_progress integer;
  after_progress integer;
  mission_slug text;
  coins_before integer;
  coins_after_first integer;
  coins_after_second integer;
  modes text[];
begin
  if (select count(*) from public.daily_mission_templates where active) < 22 then
    raise exception 'el catálogo diario tiene menos de 22 misiones activas';
  end if;

  if (select count(*) from public.daily_mission_assignments where profile_id=ana and local_date=today_ar) <> 3 then
    raise exception 'no asignó exactamente tres misiones diarias';
  end if;

  if (select count(distinct t.category)
      from public.daily_mission_assignments a
      join public.daily_mission_templates t on t.slug=a.template_slug
      where a.profile_id=ana and a.local_date=today_ar) <> 3 then
    raise exception 'repitió categorías en las misiones del día';
  end if;

  if (select sum(reward_amount_snapshot) from public.daily_mission_assignments where profile_id=ana and local_date=today_ar) > 90 then
    raise exception 'las asignaciones superan el tope diario';
  end if;

  perform public._ensure_objectives(ana, today_ar + 1);
  if exists (
    select 1
      from public.daily_mission_assignments current_day
      join public.daily_mission_assignments next_day
        on next_day.profile_id = current_day.profile_id
       and next_day.template_slug = current_day.template_slug
     where current_day.profile_id = ana
       and current_day.local_date = today_ar
       and next_day.local_date = today_ar + 1
  ) then
    raise exception 'repitió una misión exacta en días consecutivos';
  end if;
  if (select sum(reward_amount_snapshot)
        from public.daily_mission_assignments
       where profile_id=ana and local_date=today_ar+1) > 90 then
    raise exception 'las asignaciones del día siguiente superan el tope diario';
  end if;
  delete from public.daily_mission_assignments
   where profile_id=ana and local_date=today_ar+1;

  perform public._ensure_objectives('dd000000-0000-4000-a000-000000000006', today_ar);
  if exists (
    select 1 from public.daily_mission_assignments
     where profile_id='dd000000-0000-4000-a000-000000000006'
  ) then
    raise exception 'asignó misiones a una sesión invitada';
  end if;

  select array_agg(mode order by mode) into modes
    from public.objective_game_events where profile_id=ana;
  if not (modes @> array['persona','bot','privada']) then
    raise exception 'clasificó mal humano/bot/privada: %', modes;
  end if;

  select sum(progress) into before_progress
    from public.daily_mission_assignments where profile_id=ana and local_date=today_ar;
  update public.games set status='playing' where id='dd100000-0000-4000-a000-000000000001';
  update public.games set status='finished' where id='dd100000-0000-4000-a000-000000000001';
  select sum(progress) into after_progress
    from public.daily_mission_assignments where profile_id=ana and local_date=today_ar;
  if after_progress <> before_progress then raise exception 'un reintento duplicó el progreso'; end if;
  if (select count(*) from public.objective_game_events where game_id='dd100000-0000-4000-a000-000000000001' and profile_id=ana) <> 1 then
    raise exception 'la partida fue procesada más de una vez';
  end if;

  select a.template_slug into mission_slug
    from public.daily_mission_assignments a
    where a.profile_id=ana and a.local_date=today_ar and a.completed_at is not null
    order by a.reward_amount_snapshot limit 1;
  if mission_slug is null then raise exception 'ninguna misión se completó tras tres partidas'; end if;

  select coins into coins_before from public.profiles where id=ana;
  perform public.claim_objective_reward('daily', mission_slug);
  select coins into coins_after_first from public.profiles where id=ana;
  perform public.claim_objective_reward('daily', mission_slug);
  select coins into coins_after_second from public.profiles where id=ana;
  if coins_after_first <= coins_before or coins_after_second <> coins_after_first then
    raise exception 'el reclamo doble acreditó mal: antes %, primero %, segundo %', coins_before, coins_after_first, coins_after_second;
  end if;
end;
$test$;

update public.games set status='finished', winner_id='dd000000-0000-4000-a000-000000000001', player1_score=15
 where id='dd100000-0000-4000-a000-000000000004';
do $$ begin
  if (select mode from public.objective_game_events
       where game_id='dd100000-0000-4000-a000-000000000004'
         and profile_id='dd000000-0000-4000-a000-000000000001') <> 'revancha' then
    raise exception 'no reconoció la revancha';
  end if;
end $$;

select set_config('request.jwt.claim.sub','dd000000-0000-4000-a000-000000000003',false) \gset
set local role authenticated;
do $$
declare n integer;
begin
  select count(*) into n from public.daily_mission_assignments
   where profile_id='dd000000-0000-4000-a000-000000000001';
  if n <> 0 then raise exception 'un usuario leyó misiones ajenas'; end if;
  begin
    update public.daily_mission_assignments set progress=999;
    raise exception 'un usuario pudo escribir progreso directo';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

insert into public.profile_activity_streaks
  (profile_id,current_streak_days,longest_streak_days,last_active_local_date)
values
  ('dd000000-0000-4000-a000-000000000005',4,8,(now() at time zone 'America/Argentina/Buenos_Aires')::date-2)
on conflict (profile_id) do update set
  current_streak_days=4,longest_streak_days=8,
  last_active_local_date=excluded.last_active_local_date,
  protection_week_start=null,protection_used_at=null;

update public.games set status='finished', winner_id='dd000000-0000-4000-a000-000000000005', player1_score=15
 where id='dd100000-0000-4000-a000-000000000005';

do $$ begin
  if not exists (
    select 1 from public.profile_activity_streaks
     where profile_id='dd000000-0000-4000-a000-000000000005'
       and current_streak_days=5 and longest_streak_days=8 and protection_used_at is not null
  ) then raise exception 'la protección semanal no conservó la racha'; end if;
end $$;

update public.profile_activity_streaks
   set last_active_local_date=(now() at time zone 'America/Argentina/Buenos_Aires')::date-2
 where profile_id='dd000000-0000-4000-a000-000000000005';
update public.games set status='finished', winner_id='dd000000-0000-4000-a000-000000000005', player1_score=15
 where id='dd100000-0000-4000-a000-000000000006';

do $$ begin
  if not exists (
    select 1 from public.profile_activity_streaks
     where profile_id='dd000000-0000-4000-a000-000000000005'
       and current_streak_days=1 and longest_streak_days=8
  ) then raise exception 'una segunda ausencia no reinició la racha'; end if;
  if exists (
    select 1 from public.daily_mission_assignments
     where local_date <> (now() at time zone 'America/Argentina/Buenos_Aires')::date
       and profile_id in ('dd000000-0000-4000-a000-000000000001','dd000000-0000-4000-a000-000000000005')
  ) then raise exception 'asignó objetivos con una fecha distinta a la argentina'; end if;
end $$;

rollback;

\echo ''
\echo '  ==================================================='
\echo '   CICLO DE RETORNO — SEGURIDAD E IDEMPOTENCIA OK'
\echo '  ==================================================='
