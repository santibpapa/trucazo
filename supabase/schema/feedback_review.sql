-- Seguimiento del agente de reseñas. Sólo el conector administrativo ejecuta SQL.
-- No hay endpoints públicos, credenciales nuevas ni cambios en el juego.
create schema if not exists feedback_internal;
revoke all on schema feedback_internal from public, anon, authenticated;
alter default privileges in schema feedback_internal revoke execute on functions from public;

create table if not exists feedback_internal.runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp(),
  lease_until timestamptz not null default clock_timestamp() + interval '2 hours',
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  summary text,
  error text
);
create unique index if not exists feedback_one_active_run on feedback_internal.runs(status) where status='running';

create table if not exists feedback_internal.reviews (
  feedback_id uuid primary key references public.feedback(id) on delete cascade,
  source_hash text not null,
  status text not null default 'pending' check (status in ('pending','processing','retry','reviewed')),
  run_id uuid references feedback_internal.runs(id),
  attempts integer not null default 0,
  retry_at timestamptz not null default clock_timestamp(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  classification text check (classification in ('positive','no_action','actionable','needs_info')),
  summary text,
  error text
);
create index if not exists feedback_pending_reviews on feedback_internal.reviews(retry_at,feedback_id) where status in ('pending','retry');

create table if not exists feedback_internal.issues (
  problem_key text primary key check (problem_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  issue_number bigint not null unique check (issue_number > 0),
  title text not null,
  updated_at timestamptz not null default clock_timestamp()
);
create table if not exists feedback_internal.findings (
  feedback_id uuid not null references feedback_internal.reviews(feedback_id) on delete cascade,
  problem_key text not null references feedback_internal.issues(problem_key),
  source_hash text not null,
  category text not null check (category in ('bug','usability','suggestion','dissatisfaction')),
  priority text not null check (priority in ('high','medium','low')),
  assessment text not null check (assessment in ('confirmed','suspected','needs_info','resolved','suggestion')),
  summary text not null check (length(btrim(summary)) > 0),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (feedback_id,problem_key)
);
create index if not exists feedback_findings_problem on feedback_internal.findings(problem_key);

alter table feedback_internal.runs enable row level security;
alter table feedback_internal.reviews enable row level security;
alter table feedback_internal.issues enable row level security;
alter table feedback_internal.findings enable row level security;
revoke all on all tables in schema feedback_internal from public, anon, authenticated;

create or replace function feedback_internal.fingerprint(p_feedback public.feedback)
returns text language sql immutable security invoker set search_path='' as $$
  select md5(jsonb_build_array(p_feedback.rating_general,p_feedback.rating_aesthetics,
    p_feedback.understood,p_feedback.had_problem,p_feedback.comment,p_feedback.image_paths)::text);
$$;

create or replace function feedback_internal.start_run()
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_run uuid;
begin
  -- Serializa la adquisición: también evita duplicar issues entre dos agentes.
  perform pg_advisory_xact_lock(hashtext('trucazo-feedback-review'));
  update feedback_internal.runs set status='failed',finished_at=clock_timestamp(),
    error='La ejecución perdió su concesión; las reseñas pendientes se recuperaron.'
    where status='running' and lease_until<=clock_timestamp();
  update feedback_internal.reviews r set status='pending',run_id=null,retry_at=clock_timestamp(),
    updated_at=clock_timestamp(),error='Recuperada tras ejecución interrumpida'
    where r.status='processing' and not exists (
      select 1 from feedback_internal.runs x where x.id=r.run_id and x.status='running');
  if exists(select 1 from feedback_internal.runs where status='running') then return null; end if;
  insert into feedback_internal.runs default values returning id into v_run;
  -- Todas las pendientes, sin corte por fecha. Los cambios de contenido se releen.
  insert into feedback_internal.reviews(feedback_id,source_hash)
    select f.id,feedback_internal.fingerprint(f) from public.feedback f
    on conflict(feedback_id) do update set source_hash=excluded.source_hash,status='pending',
      run_id=null,retry_at=clock_timestamp(),reviewed_at=null,classification=null,summary=null,
      error=null,updated_at=clock_timestamp()
    where feedback_internal.reviews.source_hash<>excluded.source_hash;
  return v_run;
end;
$$;

create or replace function feedback_internal.heartbeat(p_run uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  update feedback_internal.runs set heartbeat_at=clock_timestamp(),
    lease_until=clock_timestamp()+interval '2 hours'
    where id=p_run and status='running' and lease_until>clock_timestamp();
  if not found then raise exception 'La ejecución no está activa'; end if;
end;
$$;

create or replace function feedback_internal.claim_batch(p_run uuid,p_limit integer default 10)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_rows jsonb;
begin
  if p_limit is null or p_limit<1 or p_limit>25 then raise exception 'Lote entre 1 y 25'; end if;
  perform feedback_internal.heartbeat(p_run);
  with pending as (
    select r.feedback_id from feedback_internal.reviews r join public.feedback f on f.id=r.feedback_id
    where r.status in ('pending','retry') and r.retry_at<=clock_timestamp()
    order by f.created_at,f.id for update of r skip locked limit p_limit
  ), claimed as (
    update feedback_internal.reviews r set status='processing',run_id=p_run,
      attempts=r.attempts+1,error=null,updated_at=clock_timestamp()
    from pending p where r.feedback_id=p.feedback_id returning r.*
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'feedback_id',f.id,'source_hash',c.source_hash,'attempts',c.attempts,
    'created_at',f.created_at,'user_id',f.user_id,'rating_general',f.rating_general,
    'rating_aesthetics',f.rating_aesthetics,'understood',f.understood,
    'had_problem',f.had_problem,'comment',f.comment,'image_paths',f.image_paths)
    order by f.created_at,f.id),'[]'::jsonb) into v_rows
    from claimed c join public.feedback f on f.id=c.feedback_id;
  return v_rows;
end;
$$;

create or replace function feedback_internal.save_finding(
  p_run uuid,p_feedback uuid,p_key text,p_issue bigint,p_title text,
  p_category text,p_priority text,p_assessment text,p_summary text,p_evidence jsonb default '{}')
returns void language plpgsql security invoker set search_path='' as $$
declare v_hash text;
begin
  perform feedback_internal.heartbeat(p_run);
  select source_hash into v_hash from feedback_internal.reviews
    where feedback_id=p_feedback and run_id=p_run and status='processing' for update;
  if not found then raise exception 'La reseña no pertenece a esta ejecución'; end if;
  if exists(select 1 from feedback_internal.issues where problem_key=p_key and issue_number<>p_issue) then
    raise exception 'Este problema ya tiene otro issue';
  end if;
  insert into feedback_internal.issues(problem_key,issue_number,title) values(p_key,p_issue,p_title)
    on conflict(problem_key) do update set title=excluded.title,updated_at=clock_timestamp();
  insert into feedback_internal.findings(feedback_id,problem_key,source_hash,category,priority,assessment,summary,evidence)
    values(p_feedback,p_key,v_hash,p_category,p_priority,p_assessment,p_summary,p_evidence)
    on conflict(feedback_id,problem_key) do update set source_hash=excluded.source_hash,
      category=excluded.category,priority=excluded.priority,assessment=excluded.assessment,
      summary=excluded.summary,evidence=excluded.evidence,updated_at=clock_timestamp();
end;
$$;

create or replace function feedback_internal.finish_review(
  p_run uuid,p_feedback uuid,p_classification text,p_summary text,p_keys text[] default '{}')
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_hash text; v_current text; v_saved text[]; v_expected text[];
begin
  perform feedback_internal.heartbeat(p_run);
  select source_hash into v_hash from feedback_internal.reviews
    where feedback_id=p_feedback and run_id=p_run and status='processing' for update;
  if not found then raise exception 'La reseña no pertenece a esta ejecución'; end if;
  select feedback_internal.fingerprint(f) into v_current from public.feedback f where id=p_feedback;
  if v_hash<>v_current then
    update feedback_internal.reviews set status='pending',source_hash=v_current,run_id=null,
      retry_at=clock_timestamp(),updated_at=clock_timestamp() where feedback_id=p_feedback;
    return false;
  end if;
  if p_classification is null or p_classification not in ('positive','no_action','actionable','needs_info')
    or p_summary is null or length(btrim(p_summary))=0 or p_keys is null then
    raise exception 'Clasificación, resumen y lista de hallazgos obligatorios';
  end if;
  select coalesce(array_agg(problem_key order by problem_key),'{}'::text[]) into v_saved
    from feedback_internal.findings where feedback_id=p_feedback and source_hash=v_hash;
  select coalesce(array_agg(distinct k order by k),'{}'::text[]) into v_expected from unnest(p_keys) k;
  if v_saved<>v_expected or (p_classification in ('actionable','needs_info') and cardinality(v_saved)=0) then
    raise exception 'Faltan hallazgos guardados o la lista no coincide';
  end if;
  update feedback_internal.reviews set status='reviewed',reviewed_at=clock_timestamp(),
    classification=p_classification,summary=p_summary,error=null,updated_at=clock_timestamp()
    where feedback_id=p_feedback;
  return true;
end;
$$;

create or replace function feedback_internal.fail_review(p_run uuid,p_feedback uuid,p_error text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform feedback_internal.heartbeat(p_run);
  update feedback_internal.reviews set status='retry',run_id=null,error=left(p_error,2000),
    retry_at=clock_timestamp()+make_interval(hours=>least(attempts,24)),updated_at=clock_timestamp()
    where feedback_id=p_feedback and run_id=p_run and status='processing';
  if not found then raise exception 'La reseña no pertenece a esta ejecución'; end if;
end;
$$;

create or replace function feedback_internal.finish_run(p_run uuid,p_summary text,p_error text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_pending integer; v_reviewed integer; v_status text;
begin
  perform feedback_internal.heartbeat(p_run);
  update feedback_internal.reviews set status='pending',run_id=null,retry_at=clock_timestamp(),
    error='El lote terminó antes de guardar esta reseña',updated_at=clock_timestamp()
    where run_id=p_run and status='processing';
  select count(*) into v_pending from public.feedback f left join feedback_internal.reviews r on r.feedback_id=f.id
    where r.feedback_id is null or r.status<>'reviewed' or r.source_hash<>feedback_internal.fingerprint(f);
  select count(*) into v_reviewed from feedback_internal.reviews where run_id=p_run and status='reviewed';
  v_status := case when p_error is not null then 'failed' when v_pending>0 then 'partial' else 'completed' end;
  update feedback_internal.runs set status=v_status,finished_at=clock_timestamp(),
    summary=p_summary,error=left(p_error,2000),lease_until=clock_timestamp() where id=p_run;
  return jsonb_build_object('run_id',p_run,'status',v_status,'reviewed',v_reviewed,'pending',v_pending);
end;
$$;

-- El schema privado no se agrega a la Data API. Los usuarios del juego no acceden.
revoke all on all functions in schema feedback_internal from public, anon, authenticated;
