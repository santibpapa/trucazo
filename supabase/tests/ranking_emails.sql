-- Movimientos completos del top 3, cooldown, pausa y privacidad.
\set ON_ERROR_STOP on
\pset footer off

begin;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-a000-000000000001','authenticated','authenticated','ranking-a@test.invalid',now(),'{"username":"RankingA"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-a000-000000000002','authenticated','authenticated','ranking-b@test.invalid',now(),'{"username":"RankingB"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-a000-000000000003','authenticated','authenticated','ranking-c@test.invalid',now(),'{"username":"RankingC"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-a000-000000000004','authenticated','authenticated','ranking-d@test.invalid',now(),'{"username":"RankingD"}',now(),now());

-- Armar una foto conocida sin enviar correos por ese armado inicial.
update public.ranking_email_campaign set is_active = false;
update public.profiles
set
  games_won = case id
    when 'fa000000-0000-4000-a000-000000000001' then 4000
    when 'fa000000-0000-4000-a000-000000000002' then 3000
    when 'fa000000-0000-4000-a000-000000000003' then 2000
    when 'fa000000-0000-4000-a000-000000000004' then 1000
  end,
  games_played = case id
    when 'fa000000-0000-4000-a000-000000000001' then 4100
    when 'fa000000-0000-4000-a000-000000000002' then 3100
    when 'fa000000-0000-4000-a000-000000000003' then 2100
    when 'fa000000-0000-4000-a000-000000000004' then 1100
  end
where id in (
  'fa000000-0000-4000-a000-000000000001',
  'fa000000-0000-4000-a000-000000000002',
  'fa000000-0000-4000-a000-000000000003',
  'fa000000-0000-4000-a000-000000000004'
);
set constraints all immediate;

do $$
begin
  if exists (
    select 1 from public.ranking_email_jobs
    where user_id::text like 'fa000000-0000-4000-a000-00000000000%'
  ) then
    raise exception 'El armado inicial pausado creó correos';
  end if;
end
$$;

set constraints all deferred;
update public.ranking_email_campaign set is_active = true;

-- D pasa de cuarto a primero: A y B bajan, C sale y D entra.
update public.profiles
set games_won = 5000, games_played = 5100
where id = 'fa000000-0000-4000-a000-000000000004';
set constraints all immediate;

do $$
declare
  amount integer;
begin
  select count(*) into amount
  from public.ranking_email_jobs
  where user_id::text like 'fa000000-0000-4000-a000-00000000000%';
  if amount <> 4 then
    raise exception 'El movimiento completo debía crear 4 avisos y creó %', amount;
  end if;

  if not exists (
    select 1 from public.ranking_email_jobs
    where user_id = 'fa000000-0000-4000-a000-000000000004'
      and old_rank is null and new_rank = 1
  ) then raise exception 'No se avisó el nuevo puesto 1'; end if;

  if not exists (
    select 1 from public.ranking_email_jobs
    where user_id = 'fa000000-0000-4000-a000-000000000001'
      and old_rank = 1 and new_rank = 2 and passed_by_username = 'RankingD'
  ) then raise exception 'No se avisó el descenso de 1 a 2'; end if;

  if not exists (
    select 1 from public.ranking_email_jobs
    where user_id = 'fa000000-0000-4000-a000-000000000002'
      and old_rank = 2 and new_rank = 3 and passed_by_username = 'RankingD'
  ) then raise exception 'No se avisó el descenso de 2 a 3'; end if;

  if not exists (
    select 1 from public.ranking_email_jobs
    where user_id = 'fa000000-0000-4000-a000-000000000003'
      and old_rank = 3 and new_rank is null and passed_by_username = 'RankingD'
  ) then raise exception 'No se avisó la salida del top 3'; end if;

  if exists (
    select 1 from public.ranking_email_jobs
    where user_id::text like 'fa000000-0000-4000-a000-00000000000%'
      and last_request_id is null
  ) then raise exception 'Los avisos no se despacharon inmediatamente'; end if;
end
$$;

-- Simular que los cuatro avisos ya salieron. Otro cambio dentro de las 24 h no
-- puede crear un quinto correo para ninguno de esos jugadores.
update public.ranking_email_jobs
set status = 'sent', sent_at = now(), completed_at = now();
set constraints all deferred;
update public.profiles
set games_won = 6000, games_played = 6100
where id = 'fa000000-0000-4000-a000-000000000002';
set constraints all immediate;

do $$
declare amount integer;
begin
  select count(*) into amount
  from public.ranking_email_jobs
  where user_id::text like 'fa000000-0000-4000-a000-00000000000%';
  if amount <> 4 then
    raise exception 'El cooldown de 24 horas permitió otro aviso: %', amount;
  end if;

  if has_table_privilege('anon', 'public.ranking_email_jobs', 'select')
    or has_table_privilege('authenticated', 'public.ranking_email_jobs', 'select')
    or has_table_privilege('anon', 'public.ranking_top3_state', 'select')
    or has_function_privilege('anon', 'email_internal.dispatch_ranking_emails(uuid)', 'execute')
    or has_function_privilege('authenticated', 'email_internal.refresh_ranking_top3()', 'execute') then
    raise exception 'Las alertas privadas del ranking quedaron expuestas';
  end if;
end
$$;

rollback;

\echo 'Ranking email: movimientos, cooldown, despacho y privacidad correctos.'
