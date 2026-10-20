-- Un cambio de podio se ejecuta al confirmar la victoria. safeupdate rechaza
-- DELETE sin WHERE y revierte toda la jugada, incluso con la campaña pausada.
-- rank tiene una restricción de 1 a 3: el filtro conserva la misma foto completa.

begin;

create or replace function email_internal.refresh_ranking_top3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_ids uuid[];
  new_ids uuid[];
  affected_user uuid;
  old_position integer;
  new_position integer;
  passed_by text;
  pending_job_id uuid;
  created_job_id uuid;
begin
  -- Serializa las comparaciones para que dos partidas simultáneas no lean la
  -- misma foto anterior ni dupliquen movimientos.
  perform pg_advisory_xact_lock(hashtextextended('trucazo:ranking-top3-email', 0));

  select coalesce(array_agg(s.user_id order by s.rank), array[]::uuid[])
  into old_ids
  from public.ranking_top3_state s;

  select coalesce(array_agg(r.id order by r.games_won desc, r.games_played asc, r.id asc), array[]::uuid[])
  into new_ids
  from (
    select p.id, p.games_won, p.games_played
    from public.profiles p
    where not p.is_bot and p.games_won > 0
    order by p.games_won desc, p.games_played asc, p.id asc
    limit 3
  ) r;

  if old_ids = new_ids then
    return null;
  end if;

  for affected_user in
    select distinct candidate.user_id
    from unnest(old_ids || new_ids) as candidate(user_id)
  loop
    old_position := array_position(old_ids, affected_user);
    new_position := array_position(new_ids, affected_user);
    if old_position is not distinct from new_position then
      continue;
    end if;

    passed_by := null;
    if old_position is not null
      and (new_position is null or new_position > old_position) then
      select p.username
      into passed_by
      from unnest(new_ids) with ordinality as candidate(user_id, new_rank)
      join public.profiles p on p.id = candidate.user_id
      where candidate.new_rank < coalesce(new_position, 4)
        and (
          array_position(old_ids, candidate.user_id) is null
          or array_position(old_ids, candidate.user_id) > old_position
        )
      order by candidate.new_rank
      limit 1;
    end if;

    if not exists (
      select 1 from public.ranking_email_campaign where id and is_active
    ) or not exists (
      select 1
      from public.email_preferences ep
      where ep.user_id = affected_user and ep.ranking_enabled
    ) then
      continue;
    end if;

    -- Un fallo pendiente conserva un solo trabajo y toma el movimiento más
    -- reciente. Si ya se está enviando, no se crea otro correo detrás suyo.
    select j.id
    into pending_job_id
    from public.ranking_email_jobs j
    where j.user_id = affected_user and j.completed_at is null
    order by j.triggered_at desc
    limit 1
    for update;

    if pending_job_id is not null then
      update public.ranking_email_jobs
      set
        old_rank = old_position,
        new_rank = new_position,
        passed_by_username = passed_by,
        token = gen_random_uuid(),
        status = 'pending',
        triggered_at = now(),
        next_attempt_at = now(),
        locked_until = '-infinity',
        last_error = null
      where id = pending_job_id and status in ('pending', 'failed');

      if found then
        begin
          perform email_internal.dispatch_ranking_emails(pending_job_id);
        exception when others then
          update public.ranking_email_jobs
          set last_error = 'Pendiente de reintento automático.'
          where id = pending_job_id;
        end;
      end if;
      continue;
    end if;

    -- El límite es por destinatario, no por puesto: ningún movimiento crea un
    -- segundo correo si ya tuvo otro aviso de ranking en las últimas 24 horas.
    if exists (
      select 1
      from public.ranking_email_jobs j
      where j.user_id = affected_user
        and coalesce(j.sent_at, j.completed_at, j.triggered_at) > now() - interval '24 hours'
    ) then
      continue;
    end if;

    insert into public.ranking_email_jobs (
      user_id, old_rank, new_rank, passed_by_username
    ) values (
      affected_user, old_position, new_position, passed_by
    )
    returning id into created_job_id;

    begin
      perform email_internal.dispatch_ranking_emails(created_job_id);
    exception when others then
      update public.ranking_email_jobs
      set last_error = 'Pendiente de reintento automático.'
      where id = created_job_id;
    end;
  end loop;

  delete from public.ranking_top3_state where rank between 1 and 3;
  insert into public.ranking_top3_state (rank, user_id)
  select candidate.rank::smallint, candidate.user_id
  from unnest(new_ids) with ordinality as candidate(user_id, rank);

  return null;
end;
$$;

revoke all on function email_internal.refresh_ranking_top3()
  from public, anon, authenticated;

commit;
