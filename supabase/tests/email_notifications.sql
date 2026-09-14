-- Regresión: una partida terminada cuenta como actividad aunque no exista una
-- fila en game_history (así funciona el Modo Historia).
\set ON_ERROR_STOP on
\pset footer off

begin;

insert into auth.users (
  instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'fe000000-0000-4000-a000-000000000001',
    'authenticated', 'authenticated', 'email-campaign@test.invalid',
    '{"username":"EmailCampaign"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'fe000000-0000-4000-a000-000000000002',
    'authenticated', 'authenticated', 'email-opponent@test.invalid',
    '{"username":"EmailOpponent"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'fe000000-0000-4000-a000-000000000003',
    'authenticated', 'authenticated', 'email-only-team@test.invalid',
    '{"username":"EmailOnlyTeam"}'::jsonb, now(), now()
  );

insert into public.tables (
  id, name, creator_id, creator_username, opponent_id, opponent_username,
  bet, status, created_at
) values (
  'fe000000-0000-4000-a000-000000000010',
  'Mesa email Modo Historia',
  'fe000000-0000-4000-a000-000000000001',
  'EmailCampaign',
  'fe000000-0000-4000-a000-000000000002',
  'EmailOpponent',
  100,
  'finished',
  '2026-08-21 17:25:00+00'
);

insert into public.games (
  id, player1_id, player2_id, player1_username, player2_username,
  current_turn, mano_player, status, winner_id, bet, created_at, updated_at,
  campaign_rival_id
)
select
  'fe000000-0000-4000-a000-000000000010',
  'fe000000-0000-4000-a000-000000000001',
  'fe000000-0000-4000-a000-000000000002',
  'EmailCampaign', 'EmailOpponent',
  'fe000000-0000-4000-a000-000000000001',
  'fe000000-0000-4000-a000-000000000001',
  'finished',
  'fe000000-0000-4000-a000-000000000001',
  100,
  '2026-08-21 17:25:00+00',
  '2026-08-21 17:34:54.386081+00',
  rival.id
from public.campaign_rivals rival
order by rival.id
limit 1;

do $$
declare
  v_last_played_at timestamptz;
begin
  if exists (
    select 1 from public.game_history
    where player_id = 'fe000000-0000-4000-a000-000000000001'
  ) then
    raise exception 'la prueba necesita una partida sin game_history';
  end if;

  select last_played_at
  into v_last_played_at
  from public.email_recipient_activity(
    array['fe000000-0000-4000-a000-000000000001'::uuid]
  );

  if v_last_played_at is distinct from '2026-08-21 17:34:54.386081+00'::timestamptz then
    raise exception 'la actividad de Modo Historia no se detectó: %', v_last_played_at;
  end if;
end $$;

-- Parejas: ganadores y perdedores cuentan, sin escribir estadísticas 1vs1.
insert into public.team_tables(id,creator_id,name,bet,target_score,time_limit,status,updated_at) values
  ('fe000000-0000-4000-a000-000000000020','fe000000-0000-4000-a000-000000000001','Email parejas',100,15,30,'finished','2026-09-12 15:00:00+00'),
  ('fe000000-0000-4000-a000-000000000021','fe000000-0000-4000-a000-000000000001','Cancelada',100,15,30,'cancelled','2026-09-13 15:00:00+00'),
  ('fe000000-0000-4000-a000-000000000022','fe000000-0000-4000-a000-000000000001','Esperando',100,15,30,'waiting','2026-09-13 15:00:00+00'),
  ('fe000000-0000-4000-a000-000000000023','fe000000-0000-4000-a000-000000000001','Jugando',100,15,30,'playing','2026-09-13 15:00:00+00');
insert into public.team_seats(table_id,user_id,seat,username,paid)
select t.id,u.id,u.seat,'Email parejas',0 from public.team_tables t
cross join (values
  ('fe000000-0000-4000-a000-000000000001'::uuid,0),
  ('fe000000-0000-4000-a000-000000000002'::uuid,1),
  ('fe000000-0000-4000-a000-000000000003'::uuid,2), (null::uuid,3)
) u(id,seat) where t.id in (
  'fe000000-0000-4000-a000-000000000020','fe000000-0000-4000-a000-000000000021',
  'fe000000-0000-4000-a000-000000000022','fe000000-0000-4000-a000-000000000023');

set local role service_role;
do $$ declare n integer; begin
  select count(*) into n from public.email_recipient_activity(array[
    'fe000000-0000-4000-a000-000000000001'::uuid,'fe000000-0000-4000-a000-000000000002'::uuid,
    'fe000000-0000-4000-a000-000000000003'::uuid
  ]) where last_played_at='2026-09-12 15:00:00+00';
  if n<>3 then raise exception 'parejas: deben contar ambos equipos y quien solo juega 2vs2, solo partidas terminadas'; end if;
  select count(*) into n from public.email_recipient_activity(array['fe000000-0000-4000-a000-000000000001'::uuid]);
  if n<>1 then raise exception 'la consulta debe limitarse a los usuarios pedidos'; end if;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.game_history where player_id in (
    'fe000000-0000-4000-a000-000000000001','fe000000-0000-4000-a000-000000000002')) then
    raise exception 'parejas no debe crear historial 1vs1';
  end if;
  if has_function_privilege('authenticated','public.email_recipient_activity(uuid[])','execute')
    or has_function_privilege('anon','public.email_recipient_activity(uuid[])','execute') then
    raise exception 'actividad de emails solo accesible al servidor';
  end if;
end $$;

rollback;

\echo 'Emails: Historia y 2vs2 cuentan como actividad sin generar historial 1vs1.'
