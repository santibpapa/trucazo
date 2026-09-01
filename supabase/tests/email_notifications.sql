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

rollback;

\echo 'Emails: las partidas sin game_history cuentan como actividad.'
